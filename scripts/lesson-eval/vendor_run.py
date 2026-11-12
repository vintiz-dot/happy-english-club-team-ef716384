"""TEMPORARY - local driver for the vendor evaluation proxy (audit-eval-proxy).
DELETE WITH THE TEARDOWN: scripts/lesson-eval/teardown_audit_eval.md.

Cuts audio into pieces, uploads them to the private `audit-eval` bucket under
code-only names, asks the edge function to send each piece to one vendor in
one mode, and stitches the normalised answers back into one result per file
in the common schema (result_schema.json, "hec-lesson-eval/1") for score.py.

Inputs (choose one):
  --lesson PATH --lesson-code L1     one lesson WAV -> lessons/L1/p0001.flac ...
  --clips S01,S02 | --clips all      held-out speech of coded children
                                     (work/split/segments.csv, set=heldout),
                                     joined per child -> clips/S01/held_01.flac
  --synth TAG | --synth all          synthetic mixes under work/mix/<TAG>/
                                     -> synth/M01/p0001.flac ...

Rules this script keeps:
  * The admin's access token is read from the environment variable
    HEC_ADMIN_JWT, or (--login, or no HEC_ADMIN_JWT on a terminal) obtained by
    signing in with a hidden email/password prompt and refreshed in memory.
    It is never written to disk and never printed. --whoami only signs in.
  * Nothing is written inside a git repository (common.safe_out exits 3).
    Output: <HEC_EVAL_ROOT>/work/vendor/<vendor>/<mode>/.
  * Only codes leave this machine. Original file names stay in a local
    map file under the output folder. key.txt / consent.txt are never opened.
  * --dry-run cuts and plans with no network at all.
  * Resumable: a piece whose answer is saved is never sent again.
  * --max-minutes stops this invocation before it sends more audio than that
    (the server also enforces its own caps and answers 429).
  * --delete-remote removes the uploaded pieces (this run's, or with --all
    every object in the bucket - teardown step 2).

Supabase URL and publishable (anon) key: HEC_SUPABASE_URL and
HEC_SUPABASE_PUBLISHABLE_KEY, or else only the VITE_SUPABASE_URL and
VITE_SUPABASE_PUBLISHABLE_KEY lines of the repo's .env (both public).

Usage (PY = C:\\Users\\Dell\\hec-audio-eval\\.venv\\Scripts\\python):
  PY scripts\\lesson-eval\\vendor_run.py --vendor azure --mode fast-multilingual --synth all --dry-run
  $env:HEC_ADMIN_JWT = "<admin access token>"   # supplied at run time; never saved
  PY scripts\\lesson-eval\\vendor_run.py --vendor azure --mode fast-multilingual --synth seed7_ov05_s500 --max-minutes 30
  PY scripts\\lesson-eval\\vendor_run.py --delete-remote --all
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402

SR = 16000
BUCKET = "audit-eval"
FUNCTION = "audit-eval-proxy"
PATH_RE = re.compile(r"^(lessons/L[0-9]{1,3}|clips/S[0-9]{2,3}|synth/M[0-9]{2,3})/[a-z0-9_]{1,32}\.(flac|wav|mp3|ogg)$")
RUN_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{0,47}$")
MODES = {
    "azure": ["fast-multilingual", "fast-en-vi"],
    "openai": ["gpt-transcribe", "gpt-4o-transcribe", "gpt-4o-transcribe-diarize", "whisper-1"],
    "gemini": ["transcribe-speakers"],
    "google": ["chirp3"],
}
MAX_PIECE_S = 1200
MIME = {"flac": "audio/flac", "wav": "audio/wav"}


# ------------------------------------------------------------------ pieces

def plan_pieces(duration: float, piece_s: float, overlap_s: float) -> list[tuple[float, float]]:
    """(start, end) of each piece; consecutive pieces share `overlap_s`."""
    if duration <= piece_s:
        return [(0.0, duration)]
    step = piece_s - overlap_s
    out, s = [], 0.0
    while True:
        e = min(duration, s + piece_s)
        out.append((round(s, 3), round(e, 3)))
        if e >= duration:
            break
        s += step
    return out


def owned_region(k: int, pieces: list[tuple[float, float]]) -> tuple[float, float]:
    """The absolute time span whose words come from piece k: the middle of
    each overlap is the cut, so every instant belongs to exactly one piece."""
    s, e = pieces[k]
    lo = s if k == 0 else (s + pieces[k - 1][1]) / 2
    hi = e if k == len(pieces) - 1 else (pieces[k + 1][0] + e) / 2
    return lo, hi


def stitch(pieces: list[tuple[float, float]], answers: list[dict]) -> dict:
    """Join per-piece answers ({words, turns}) into one file's words/turns.

    Times are shifted by each piece's start. Speaker labels are per call, so
    each piece's labels are matched to the previous piece's by how much they
    talk at the same time inside the overlap (>= 1 s together = same
    speaker); unmatched labels get a new global label spkN. This is a
    heuristic, reported as such in the result's settings.
    """
    words_out, turns_out = [], []
    global_of_prev: dict[str, str] = {}
    prev_overlap_words: list[dict] = []
    n_global = 0
    for k, ((ps, pe), ans) in enumerate(zip(pieces, answers)):
        lo, hi = owned_region(k, pieces)
        shifted = [dict(w, start=round(w["start"] + ps, 3), end=round(w["end"] + ps, 3)) for w in ans.get("words", [])]
        shifted_turns = [dict(t, start=round(t["start"] + ps, 3), end=round(t["end"] + ps, 3)) for t in ans.get("turns", []) or []]

        # map this piece's labels onto global ones via the overlap with piece k-1
        mapping: dict[str, str] = {}
        if k > 0:
            ov_lo, ov_hi = ps, pieces[k - 1][1]
            together: dict[tuple[str, str], float] = {}
            mine = [w for w in shifted if w.get("speaker") and ov_lo <= (w["start"] + w["end"]) / 2 <= ov_hi]
            for a in mine:
                for b in prev_overlap_words:
                    inter = min(a["end"], b["end"]) - max(a["start"], b["start"])
                    if inter > 0:
                        key = (a["speaker"], b["global"])
                        together[key] = together.get(key, 0.0) + inter
            used = set()
            for (local, glob), secs in sorted(together.items(), key=lambda kv: -kv[1]):
                if secs >= 1.0 and local not in mapping and glob not in used:
                    mapping[local] = glob
                    used.add(glob)
        for lab in sorted({w.get("speaker") for w in shifted if w.get("speaker")} | {t["speaker"] for t in shifted_turns}):
            if lab not in mapping:
                mapping[lab] = f"spk{n_global}"
                n_global += 1

        for w in shifted:
            mid = (w["start"] + w["end"]) / 2
            if lo <= mid < hi or (k == len(pieces) - 1 and mid == hi):
                words_out.append(dict(w, speaker=mapping.get(w.get("speaker")) if w.get("speaker") else None))
        for t in shifted_turns:
            s, e = max(t["start"], lo), min(t["end"], hi)
            if e > s:
                turns_out.append({"start": round(s, 3), "end": round(e, 3), "speaker": mapping[t["speaker"]]})
        if k + 1 < len(pieces):
            nxt = pieces[k + 1][0]
            prev_overlap_words = [dict(w, **{"global": mapping[w["speaker"]]}) for w in shifted
                                  if w.get("speaker") and (w["start"] + w["end"]) / 2 >= nxt]
        global_of_prev = mapping
    words_out.sort(key=lambda w: (w["start"], w["end"]))
    turns_out.sort(key=lambda t: (t["start"], t["end"]))
    return {"words": words_out, "turns": turns_out}


# ------------------------------------------------------------------ inputs

def sources(args) -> list[dict]:
    """[{file_id, code_dir, kind, path|segments, duration}] - file_id is what
    score.py and the RTTM references use; code_dir is what leaves the PC."""
    import soundfile as sf

    out = []
    if args.lesson:
        p = Path(args.lesson)
        if common.is_forbidden(p):
            sys.exit("REFUSED: that file is never opened")
        if not re.fullmatch(r"L[0-9]{1,3}", args.lesson_code or ""):
            sys.exit("--lesson-code must be L1..L999")
        out.append({"file_id": args.lesson_code, "code_dir": f"lessons/{args.lesson_code}", "kind": "cut",
                    "path": str(p), "duration": sf.info(str(p)).duration, "source_name": p.name})
    elif args.clips:
        segs = common.WORK / "split" / "segments.csv"
        with open(segs, newline="", encoding="utf-8") as f:
            rows = [r for r in csv.DictReader(f) if r["set"] == "heldout" and not r.get("flag")]
        want = None if args.clips == "all" else {c.strip().upper() for c in args.clips.split(",")}
        by: dict[str, list[dict]] = {}
        for r in rows:
            if want is None or r["code"].upper() in want:
                by.setdefault(r["code"].upper(), []).append(r)
        for code, rs in sorted(by.items()):
            if not re.fullmatch(r"S[0-9]{2,3}", code):
                continue
            # held-out speech joined with 0.5 s of silence; each join is
            # recorded so a reference can be lined up with it.
            groups, cur, t = [], [], 0.0
            for r in sorted(rs, key=lambda r: (int(r["clip"]), float(r["start"]))):
                d = float(r["end"]) - float(r["start"])
                if cur and t + d > args.piece_minutes * 60:
                    groups.append(cur)
                    cur, t = [], 0.0
                cur.append({"clip": int(r["clip"]), "start": float(r["start"]), "end": float(r["end"]), "at": round(t, 3)})
                t += d + 0.5
            if cur:
                groups.append(cur)
            for i, g in enumerate(groups, 1):
                out.append({"file_id": f"{code}_held_{i:02d}", "code_dir": f"clips/{code}", "kind": "join",
                            "piece_name": f"held_{i:02d}", "segments": g, "code": code,
                            "duration": g[-1]["at"] + g[-1]["end"] - g[-1]["start"]})
    elif args.synth:
        mixroot = common.WORK / "mix"
        tags = sorted(d.name for d in mixroot.iterdir() if d.is_dir())
        chosen = tags if args.synth == "all" else [t.strip() for t in args.synth.split(",")]
        for t in chosen:
            if t not in tags:
                sys.exit(f"no mix folder {t}")
            m = f"M{tags.index(t) + 1:02d}"
            for wav in sorted((mixroot / t).glob("*.wav")):
                out.append({"file_id": wav.stem, "code_dir": f"synth/{m}", "kind": "cut", "path": str(wav),
                            "duration": sf.info(str(wav)).duration, "source_name": f"{t}/{wav.name}",
                            "piece_prefix": f"p{wav.stem.rsplit('_', 1)[-1]}_"})
    else:
        sys.exit("choose --lesson, --clips or --synth")
    return out


def write_piece(src: dict, k: int, span: tuple[float, float], out_dir: Path, container: str) -> tuple[str, Path, float]:
    """Cut piece k to a local 16 kHz mono file; return (object path, local file, seconds)."""
    import numpy as np
    import soundfile as sf

    if src["kind"] == "join":
        name = f"{src['piece_name']}.{container}"
        parts = []
        for s in src["segments"]:
            wav = common.WAV_DIR / "videos" / f"{src['code']}_clip{s['clip']}.wav"
            x, sr = common.read_wav(wav, s["start"], s["end"] - s["start"])
            assert sr == SR, f"expected {SR} Hz"
            parts += [x, np.zeros(int(0.5 * SR), dtype=np.float32)]
        x = np.concatenate(parts[:-1]) if parts else np.zeros(0, dtype=np.float32)
    else:
        name = f"{src.get('piece_prefix', 'p')}{k + 1:04d}.{container}"
        x, sr = common.read_wav(Path(src["path"]), span[0], span[1] - span[0])
        if sr != SR:
            sys.exit(f"{src['file_id']}: expected {SR} Hz audio (run extract.py first)")
    obj = f"{src['code_dir']}/{name}"
    if not PATH_RE.fullmatch(obj):
        sys.exit(f"internal: {obj} is not a code-only object name")
    local = common.safe_out(out_dir / "_pieces" / obj)
    if not local.exists():
        sf.write(str(local), x, SR, subtype="PCM_16", format=container.upper())
    return obj, local, round(len(x) / SR, 3)


# ------------------------------------------------------------------ network

def supabase_conf() -> tuple[str, str]:
    url = os.environ.get("HEC_SUPABASE_URL")
    key = os.environ.get("HEC_SUPABASE_PUBLISHABLE_KEY")
    if not (url and key):
        env = Path(__file__).resolve().parents[2] / ".env"
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                k, _, v = line.partition("=")
                if k.strip() == "VITE_SUPABASE_URL" and not url:
                    url = v.strip().strip('"')
                elif k.strip() == "VITE_SUPABASE_PUBLISHABLE_KEY" and not key:
                    key = v.strip().strip('"')
    if not (url and key):
        sys.exit("Set HEC_SUPABASE_URL and HEC_SUPABASE_PUBLISHABLE_KEY")
    return url.rstrip("/"), key


class Session:
    """The admin's access token, kept in memory only.

    Either HEC_ADMIN_JWT (as before; no refresh) or a hidden email/password
    prompt (--login). The password and tokens are never printed or written;
    the password is dropped as soon as the first sign-in has answered.
    """

    def __init__(self, url: str, key: str):
        self.url, self.key = url, key
        self._token = ""
        self._refresh = ""
        self._exp = 0.0

    def _take(self, st: int, raw: bytes) -> None:
        try:
            d = json.loads(raw)
        except ValueError:
            d = {}
        if st != 200 or not d.get("access_token"):
            # Our own words; the auth server's body is not echoed.
            sys.exit(f"sign-in failed (HTTP {st}): check the email and password")
        self._token = d["access_token"]
        self._refresh = d.get("refresh_token") or ""
        self._exp = float(d.get("expires_at") or (time.time() + float(d.get("expires_in") or 3600)))

    def sign_in(self) -> None:
        import getpass
        email = input("Admin email: ").strip()
        password = getpass.getpass("Password (hidden): ")
        st, raw = http("POST", f"{self.url}/auth/v1/token?grant_type=password",
                       {"apikey": self.key, "Content-Type": "application/json"},
                       json.dumps({"email": email, "password": password}).encode())
        del password
        self._take(st, raw)

    def from_env(self) -> bool:
        t = os.environ.get("HEC_ADMIN_JWT", "").strip()
        if t:
            self._token = t
            self._exp = float("inf")
        return bool(t)

    def token(self) -> str:
        if self._refresh and time.time() > self._exp - 90:
            st, raw = http("POST", f"{self.url}/auth/v1/token?grant_type=refresh_token",
                           {"apikey": self.key, "Content-Type": "application/json"},
                           json.dumps({"refresh_token": self._refresh}).encode())
            self._take(st, raw)
        return self._token

    def expires_at(self) -> str:
        return datetime.fromtimestamp(self._exp, timezone.utc).isoformat(timespec="seconds")


def open_session(url: str, key: str, login: bool) -> Session:
    s = Session(url, key)
    if login:
        s.sign_in()
    elif not s.from_env():
        if sys.stdin.isatty():
            s.sign_in()
        else:
            sys.exit("Set HEC_ADMIN_JWT to the admin's access token for this session (it is not saved), or use --login")
    return s


NOT_ADMIN = "This login is not an admin account: the proxy answered 403. Sign in with the admin's own email."


def http(method: str, url: str, headers: dict, body: bytes | None, timeout: float = 170) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except (urllib.error.URLError, TimeoutError) as e:
        return 0, json.dumps({"error": f"network: {type(e).__name__}"}).encode()


def auth_headers(key: str, token: str) -> dict:
    return {"apikey": key, "Authorization": f"Bearer {token}"}


def upload(url, key, token, obj, local: Path) -> None:
    ext = local.suffix.lstrip(".")
    st, body = http("POST", f"{url}/storage/v1/object/{BUCKET}/{obj}",
                    {**auth_headers(key, token), "Content-Type": MIME[ext], "x-upsert": "false"}, local.read_bytes())
    if st in (200, 201):
        return
    if st in (400, 409) and (b"exists" in body.lower() or b"duplicate" in body.lower()):
        return  # already uploaded by an earlier, interrupted run
    sys.exit(f"upload of {obj} failed: HTTP {st}")


def list_all(url, key, token, prefix="") -> list[str]:
    st, body = http("POST", f"{url}/storage/v1/object/list/{BUCKET}",
                    {**auth_headers(key, token), "Content-Type": "application/json"},
                    json.dumps({"prefix": prefix, "limit": 1000, "offset": 0}).encode())
    if st != 200:
        sys.exit(f"listing {BUCKET}/{prefix} failed: HTTP {st}")
    out = []
    for it in json.loads(body):
        full = f"{prefix}{it['name']}"
        if it.get("id") is None:
            out += list_all(url, key, token, full + "/")
        else:
            out.append(full)
    return out


def delete_remote(url, key, token, objs: list[str]) -> None:
    for i in range(0, len(objs), 100):
        chunk = objs[i:i + 100]
        st, _ = http("DELETE", f"{url}/storage/v1/object/{BUCKET}",
                     {**auth_headers(key, token), "Content-Type": "application/json"},
                     json.dumps({"prefixes": chunk}).encode())
        if st != 200:
            sys.exit(f"delete failed: HTTP {st}")
    print(f"deleted {len(objs)} object(s) from {BUCKET}")


# ------------------------------------------------------------------ main

def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--vendor", choices=sorted(MODES))
    ap.add_argument("--mode")
    ap.add_argument("--run-id", help="code for the server-side caps (default <vendor>-<mode>-<yyyymmdd>)")
    ap.add_argument("--lesson")
    ap.add_argument("--lesson-code")
    ap.add_argument("--clips")
    ap.add_argument("--synth")
    ap.add_argument("--piece-minutes", type=float, default=10.0)
    ap.add_argument("--overlap-seconds", type=float, default=20.0)
    ap.add_argument("--container", choices=["flac", "wav"], default="flac",
                    help="flac (default) fits every vendor's limits for a 10-min piece; wav is ~19 MB per 10 min")
    ap.add_argument("--max-minutes", type=float, default=None, help="stop before sending more audio than this")
    ap.add_argument("--max-speakers", type=int, default=None)
    ap.add_argument("--language", choices=["en", "vi"], default=None)
    ap.add_argument("--dry-run", action="store_true", help="cut and plan only; no network")
    ap.add_argument("--delete-remote", action="store_true")
    ap.add_argument("--all", action="store_true", help="with --delete-remote: every object in the bucket")
    ap.add_argument("--out", default=None, help="default <root>/work/vendor/<vendor>/<mode>")
    ap.add_argument("--login", action="store_true",
                    help="prompt for the admin's email and password (hidden) and sign in; the token stays in memory")
    ap.add_argument("--whoami", action="store_true",
                    help="sign in, print only 'signed in' and the token expiry, call nothing else")
    a = ap.parse_args(argv)

    if a.whoami:
        url, key = supabase_conf()
        sess = open_session(url, key, a.login)
        sess.token()
        print("signed in")
        print(f"token expires at {sess.expires_at()}")
        return 0

    if a.delete_remote and a.all:
        url, key = supabase_conf()
        sess = open_session(url, key, a.login)
        objs = list_all(url, key, sess.token())
        if a.dry_run:
            print(f"would delete {len(objs)} object(s)")
            return 0
        delete_remote(url, key, sess.token(), objs)
        return 0

    if not a.vendor or a.mode not in MODES.get(a.vendor, []):
        ap.error(f"--vendor/--mode must be one of {MODES}")
    if a.piece_minutes * 60 + a.overlap_seconds > MAX_PIECE_S or a.overlap_seconds * 2 >= a.piece_minutes * 60:
        ap.error("pieces must be under 20 minutes and the overlap less than half a piece")
    run_id = a.run_id or f"{a.vendor}-{a.mode}-{datetime.now():%Y%m%d}".replace(".", "")
    if not RUN_RE.fullmatch(run_id):
        ap.error("--run-id must be letters, digits, - and _ (48 at most)")

    out_dir = common.safe_out(Path(a.out) if a.out else common.WORK / "vendor" / a.vendor / a.mode)
    state_path = common.safe_out(out_dir / f"{run_id}.state.json")
    state = json.loads(state_path.read_text(encoding="utf-8")) if state_path.exists() else {"pieces": {}}
    srcs = sources(a)

    # Local map of codes to source files: it never leaves this machine.
    (out_dir / f"{run_id}.map.json").write_text(json.dumps(
        [{k: s.get(k) for k in ("file_id", "code_dir", "source_name", "segments")} for s in srcs], indent=1), encoding="utf-8")

    url = key = sess = None
    if not a.dry_run:
        url, key = supabase_conf()
        sess = open_session(url, key, a.login)

    t_start = time.time()
    sent_s = 0.0
    files_out = []
    stopped = False
    for src in srcs:
        spans = [(0.0, src["duration"])] if src["kind"] == "join" else plan_pieces(src["duration"], a.piece_minutes * 60, a.overlap_seconds)
        answers = []
        for k, span in enumerate(spans):
            obj, local, secs = write_piece(src, k, span, out_dir, a.container)
            piece_json = out_dir / "pieces" / f"{obj.replace('/', '_')}.json"
            if piece_json.exists():
                answers.append(json.loads(piece_json.read_text(encoding="utf-8"))["file"])
                continue
            if a.dry_run:
                print(f"[dry-run] {obj}  {secs:7.1f} s  ({local.stat().st_size / 1e6:.1f} MB)")
                answers.append(None)
                continue
            if a.max_minutes is not None and (sent_s + secs) / 60 > a.max_minutes:
                print(f"--max-minutes {a.max_minutes} reached; stopping before {obj}")
                stopped = True
                break
            if not state["pieces"].get(obj, {}).get("uploaded"):
                upload(url, key, sess.token(), obj, local)
                state["pieces"].setdefault(obj, {})["uploaded"] = True
                state_path.write_text(json.dumps(state, indent=1), encoding="utf-8")
            body = {"run_id": run_id, "vendor": a.vendor, "mode": a.mode, "object_path": obj, "audio_seconds": secs}
            opts = {k: v for k, v in (("max_speakers", a.max_speakers), ("language", a.language)) if v is not None}
            if opts:
                body["options"] = opts
            for attempt in range(4):
                st, raw = http("POST", f"{url}/functions/v1/{FUNCTION}",
                               {**auth_headers(key, sess.token()), "Content-Type": "application/json"}, json.dumps(body).encode())
                try:
                    res = json.loads(raw)
                except ValueError:
                    res = {"error": "non-JSON answer"}
                retry = st in (0, 500, 502, 503, 504) and res.get("retryable", st in (0, 504))
                if st == 200 or not retry or attempt == 3:
                    break
                time.sleep(5 * 2 ** attempt)
            sent_s += secs
            if st != 200:
                # Our function's own words only; it never forwards vendor bodies.
                print(f"{obj}: HTTP {st} {str(res.get('error', ''))[:160]}")
                if st == 429:
                    print("server cap reached; stopping")
                if st == 403:
                    print(NOT_ADMIN)
                stopped = True
                break
            piece_json.parent.mkdir(parents=True, exist_ok=True)
            piece_json.write_text(json.dumps(res, ensure_ascii=False), encoding="utf-8")
            state["pieces"][obj]["done"] = True
            state["system"] = res.get("system")
            state_path.write_text(json.dumps(state, indent=1), encoding="utf-8")
            print(f"{obj}: ok ({secs:.0f} s, est. USD {res.get('cost_estimate_usd')})")
            answers.append(res["file"])
        if stopped:
            break
        if a.dry_run or any(x is None for x in answers):
            continue
        st = stitch(spans, answers)
        files_out.append({"file_id": src["file_id"], "duration_s": round(src["duration"], 3), **st})

    if a.dry_run:
        print(f"[dry-run] {len(srcs)} file(s) planned; nothing sent")
        return 0
    system = dict(state.get("system") or {"name": f"{a.vendor}-{a.mode}", "kind": "vendor"})
    system.setdefault("settings", {})
    system["settings"] = {**system["settings"], "piece_minutes": a.piece_minutes, "overlap_seconds": a.overlap_seconds,
                          "container": a.container, "run_id": run_id,
                          "stitch": "midpoint-of-overlap cut; speaker labels matched across pieces by >=1 s co-timed words (heuristic)"}
    result = {"schema": "hec-lesson-eval/1", "system": system,
              "run": {"started_at": datetime.fromtimestamp(t_start, timezone.utc).isoformat(), "wall_s": round(time.time() - t_start, 1),
                      "audio_s": round(sum(f["duration_s"] for f in files_out), 1)},
              "files": files_out}
    res_path = common.safe_out(out_dir / f"result_{run_id}.json")
    res_path.write_text(json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {res_path} ({len(files_out)} file(s)){' - INCOMPLETE, run again to resume' if stopped else ''}")

    if a.delete_remote:
        delete_remote(url, key, sess.token(), [o for o, s in state["pieces"].items() if s.get("uploaded")])
    return 1 if stopped else 0


if __name__ == "__main__":
    sys.exit(main())
