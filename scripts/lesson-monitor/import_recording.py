"""Import a lesson recorded outside the app (a phone or the laptop's Sound Recorder) as that lesson's
recording, so the lesson monitor transcribes it overnight and the teacher reviews it like any other.

  PY scripts\\lesson-monitor\\import_recording.py --file "Recording (8).m4a" --session-id <id> \\
       --note "laptop Sound Recorder, the app recorder crashed" [--consent-note "..."] [--dry-run]

What it does, as the signed-in ADMIN (the remembered sign-in; never a service key):
  1. reads the file's length (ffprobe) and when it started: the file's last write time minus its
     length (the recorder writes the file as it records, so the last write is the moment it stopped);
     --start overrides it (ISO time, Hanoi time if no offset);
  2. recorder_import_begin (20261125090000) checks the lesson, the class's recording switch and every
     child's recording consent exactly as recording in the app does, and makes an `uploading` lesson
     recording flagged as imported. A lesson from before the class's consent confirmation needs
     --consent-note: how the parents had agreed by then;
  3. turns the audio into 16 kHz mono FLAC chunks of 60 s (ffmpeg, streamed: never the whole lesson
     in memory, nothing written to disk), registers each (recorder_import_chunk), uploads it to the
     recorder's bucket under the recorder's own storage policy and confirms it (recorder_confirm_chunk);
  4. recorder_import_finish marks it complete. The nightly job then picks it up.
Run again after a break: the same file resumes (chunks already confirmed are skipped).
--dry-run converts and counts, and changes nothing. An imported recording is never evidence that the
lesson ran: the server saw none of it happen.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import subprocess
import sys
import urllib.parse
from datetime import datetime, timedelta, timezone

SR = 16000
CHUNK_S = 60
HANOI = timezone(timedelta(hours=7))


def probe_seconds(path: str) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def file_start(path: str, seconds: float, start: str | None) -> datetime:
    if start:
        t = datetime.fromisoformat(start)
        return t if t.tzinfo else t.replace(tzinfo=HANOI)
    end = datetime.fromtimestamp(os.path.getmtime(path), tz=timezone.utc)
    return end - timedelta(seconds=seconds)


def chunks(path: str):
    """(seq, t_start_ms, t_end_ms, flac bytes) for each 60 s of the file, 16 kHz mono."""
    import numpy as np
    import soundfile as sf
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"],
                         stdout=subprocess.PIPE)
    per = SR * CHUNK_S * 2
    seq, t = 0, 0
    try:
        while True:
            raw = p.stdout.read(per)
            if not raw:
                break
            x = np.frombuffer(raw[: len(raw) // 2 * 2], dtype="<i2")
            if len(x) < SR // 10:  # a tail under 0.1 s carries nothing
                break
            buf = io.BytesIO()
            sf.write(buf, x, SR, format="FLAC", subtype="PCM_16")
            ms = int(round(len(x) * 1000 / SR))
            yield seq, t, t + ms, buf.getvalue()
            seq, t = seq + 1, t + ms
    finally:
        p.stdout.close()
        if p.wait() != 0:
            raise RuntimeError("ffmpeg could not read the file")


def upload(api, storage_path: str, data: bytes) -> str:
    from supa import BUCKET, ApiError
    quoted = urllib.parse.quote(storage_path, safe="/")
    st, raw = api._retry(lambda: api.s._http(
        "POST", f"{api.s.url}/storage/v1/object/{BUCKET}/{quoted}",
        api._h({"Content-Type": "audio/flac", "x-upsert": "false", "cache-control": "no-store"}), data, timeout=300))
    if st // 100 == 2:
        return "stored"
    text = raw.decode("utf-8", "replace").lower()
    if st == 409 or "already exists" in text or "duplicate" in text:
        return "already"
    raise ApiError(st, text[:300])


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--file", required=True)
    ap.add_argument("--session-id", required=True)
    ap.add_argument("--note", required=True, help="where the file came from")
    ap.add_argument("--consent-note", default=None, help="for a lesson before the class's consent confirmation")
    ap.add_argument("--start", default=None, help="when the file started (ISO; Hanoi time if no offset)")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args(argv)

    seconds = probe_seconds(a.file)
    t0 = file_start(a.file, seconds, a.start)
    print(f"{os.path.basename(a.file)}: {seconds / 60:.1f} min, from {t0.astimezone(HANOI):%d %b %H:%M:%S} "
          f"to {(t0 + timedelta(seconds=seconds)).astimezone(HANOI):%H:%M:%S} (Hanoi)")
    if a.dry_run:
        n, total = 0, 0
        for _, _, _, data in chunks(a.file):
            n, total = n + 1, total + len(data)
        print(f"dry run: {n} chunks, {total / 1e6:.0f} MB to upload; nothing changed")
        return 0

    import supa
    api = supa.open_api()
    b = api.rpc("recorder_import_begin", {"p_session": a.session_id, "p_started_at": t0.isoformat(),
                                           "p_duration_ms": int(seconds * 1000), "p_note": a.note,
                                           "p_consent_note": a.consent_note})
    rid = b["recording_id"]
    print(f"{'resuming' if b.get('resumed') else 'began'} import {rid}")
    n, sent = 0, 0
    for seq, ts, te, data in chunks(a.file):
        sha = hashlib.sha256(data).hexdigest()
        r = api.rpc("recorder_import_chunk", {"p_recording": rid, "p_seq": seq, "p_byte_size": len(data), "p_sha256": sha,
                                              "p_t_start_ms": ts, "p_t_end_ms": te})
        n += 1
        if r.get("confirmed"):
            continue
        upload(api, r["storage_path"], data)
        if api.rpc("recorder_confirm_chunk", {"p_chunk": r["chunk_id"], "p_readback_sha256": sha}) is not True:
            raise SystemExit(f"chunk {seq} was not confirmed; run the same command again")
        sent += len(data)
        if n % 10 == 0:
            print(f"  {n} chunks ({ts // 60000} min)")
    f = api.rpc("recorder_import_finish", {"p_recording": rid})
    print(f"done: {f.get('chunks', n)} chunks, {sent / 1e6:.0f} MB sent; recording {rid} is complete")
    return 0


if __name__ == "__main__":
    sys.exit(main())
