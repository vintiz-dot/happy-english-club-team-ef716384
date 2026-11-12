"""Extract 16 kHz mono 16-bit PCM WAVs from every media file in the eval root.

Layout (identical to work\\make_wav16k.sh, so either can be re-run):
    <root>\\work\\wav16k\\<set>\\<stem>.wav        set = videos | lessons
    <root>\\work\\wav16k\\manifest.csv
    <root>\\work\\wav16k\\duplicates.csv          exact SHA-256 duplicates skipped

Manifest columns: the ten written by make_wav16k.sh
    set,source_file,wav_file,source_sha256,source_duration_s,source_sample_rate,
    source_channels,source_bitrate,wav_duration_s,duplicate_of
followed by code,clip,source_codec (code = S01.. parsed from the file name).

Idempotent: an existing WAV is kept (and re-verified) unless --force.
key.txt / consent.txt are never opened. Refuses to write inside a git repo.

    python extract.py              # convert what is missing, rewrite manifest
    python extract.py --verify     # convert nothing; check WAVs + manifest only
"""
from __future__ import annotations

import argparse
import csv
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, WAV_DIR, code_of, ffprobe, iter_media, safe_out, sha256_file  # noqa: E402

COLS = ["set", "source_file", "wav_file", "source_sha256", "source_duration_s",
        "source_sample_rate", "source_channels", "source_bitrate", "wav_duration_s",
        "duplicate_of", "code", "clip", "source_codec"]


def convert(src: Path, dst: Path) -> None:
    tmp = dst.with_name(dst.stem + ".part.wav")
    subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                    "-i", str(src), "-vn", "-ac", "1", "-ar", "16000",
                    "-c:a", "pcm_s16le", str(tmp)], check=True)
    tmp.replace(dst)


def check_wav(wav: Path, src_dur: float) -> list[str]:
    p = ffprobe(wav)
    problems = []
    if p["codec"] != "pcm_s16le" or p["sample_rate"] != 16000 or p["channels"] != 1:
        problems.append(f"format {p['codec']} {p['sample_rate']} {p['channels']}")
    if abs(p["duration_s"] - src_dur) > 0.5:
        problems.append(f"duration wav={p['duration_s']:.2f} src={src_dur:.2f}")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--root", type=Path, default=ROOT, help="evaluation root (default %(default)s)")
    ap.add_argument("--out", type=Path, default=WAV_DIR, help="output folder (default %(default)s)")
    ap.add_argument("--force", action="store_true", help="re-convert even if the WAV exists")
    ap.add_argument("--verify", action="store_true", help="convert nothing, only check")
    a = ap.parse_args()

    out = safe_out(a.out)
    first: dict[str, str] = {}
    rows, dups, failures = [], [], []
    for set_name in ("lessons", "videos"):
        folder = a.root / set_name
        if not folder.is_dir():
            continue
        for src in iter_media(folder):
            rel = src.relative_to(a.root).as_posix()
            h = sha256_file(src)
            info = ffprobe(src)
            code, clip = code_of(src.stem)
            row = {"set": set_name, "source_file": rel, "wav_file": "", "source_sha256": h,
                   "source_duration_s": f"{info['duration_s']:.6f}",
                   "source_sample_rate": info["sample_rate"], "source_channels": info["channels"],
                   "source_bitrate": info["bit_rate"], "wav_duration_s": "", "duplicate_of": "",
                   "code": code, "clip": clip, "source_codec": info["codec"]}
            if h in first:
                row["duplicate_of"] = first[h]
                dups.append((rel, first[h], h))
                rows.append(row)
                continue
            first[h] = rel
            wav = safe_out(out / set_name / f"{src.stem}.wav")
            if not a.verify and (a.force or not wav.exists()):
                print(f"convert {rel}", flush=True)
                convert(src, wav)
            if wav.exists():
                probs = check_wav(wav, info["duration_s"])
                if probs:
                    failures.append(f"{rel}: {'; '.join(probs)}")
                row["wav_file"] = f"{set_name}/{wav.name}"
                row["wav_duration_s"] = f"{ffprobe(wav)['duration_s']:.6f}"
            else:
                failures.append(f"{rel}: no wav")
            rows.append(row)

    with open(out / "manifest.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS, quoting=csv.QUOTE_ALL)
        w.writeheader()
        w.writerows(rows)
    with open(out / "duplicates.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["duplicate", "kept", "sha256"])
        w.writerows(dups)

    uniq = [r for r in rows if not r["duplicate_of"]]
    for s in ("lessons", "videos"):
        sel = [r for r in uniq if r["set"] == s and r["wav_file"]]
        mins = sum(float(r["wav_duration_s"]) for r in sel) / 60
        print(f"{s}: {len(sel)} unique wavs, {mins:.1f} min")
    codes = sorted({r["code"] for r in uniq if r["code"]})
    print(f"children (codes): {len(codes)} -> {' '.join(codes)}")
    print(f"sources={len(rows)} duplicates={len(dups)}")
    for d, k, _ in dups:
        print(f"  duplicate {d} == {k}")
    if failures:
        print("CHECK FAILURES:")
        for x in failures:
            print("  " + x)
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
