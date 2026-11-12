"""TEMPORARY - one command that runs every vendor/mode over the B1 inputs.
DELETE WITH THE TEARDOWN: scripts/lesson-eval/teardown_audit_eval.md.

  C:\\Users\\Dell\\hec-audio-eval\\.venv\\Scripts\\python.exe scripts\\lesson-eval\\vendor_batch.py --login

Signs in ONCE (vendor_run's hidden email/password prompt; the token stays in
memory and is refreshed), prints the plan (systems, minutes, estimated cost),
asks you to type YES, then runs each system over each input set through
vendor_run.main (so uploads, caps, resume and the code-only object names are
exactly vendor_run's). A system that errors (bad model id, rejected
parameter, 4xx/5xx, server cap) is recorded and SKIPPED; the next one runs.
At the end a table lists, per system: pieces ok, pieces failed, minutes sent,
first error. Run it again to resume: every piece whose answer is saved is
skipped, so only the failed or missing pieces are sent.

Systems (run id b1-<vendor>-<mode>, one per system, so the server's per-run
caps of 400 calls / 600 minutes apply to each system separately):
  azure fast-multilingual, azure fast-en-vi, openai gpt-4o-transcribe-diarize,
  openai gpt-4o-transcribe, openai gpt-transcribe, openai whisper-1,
  gemini transcribe-speakers.
Input sets:
  synth  every synthetic mix under work\\mix\\            (ground-truth speakers)
  clips  held-out speech of each coded child (--clips all)
  L1 L2 L3  the first 20 minutes of each lesson, cut locally to
         work\\vendor\\_inputs\\ first
  L4     the same 20 minutes of L1's compressed twin (16 kHz / 32 kbps),
         for the compression-cost comparison
Only codes (L1..L4, S01.., M01..) leave this PC; the original names stay in
local map files. Nothing is written inside a git repository.

Options: --systems a,b  --inputs synth,clips,L1  --dry-run (no network)
         --yes (skip the YES prompt)  --max-total-minutes 1200
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
import vendor_run  # noqa: E402

# (vendor, mode, USD per audio hour) - the B0 / B-proxy-build price table.
# Azure and the OpenAI figures other than gpt-transcribe are UNCONFIRMED
# (memory), Gemini is derived from token counts: estimates, not quotes.
SYSTEMS = [
    ("azure", "fast-multilingual", 1.00),
    ("azure", "fast-en-vi", 1.00),
    ("openai", "gpt-4o-transcribe-diarize", 0.36),
    ("openai", "gpt-4o-transcribe", 0.36),
    ("openai", "gpt-transcribe", 0.27),
    ("openai", "whisper-1", 0.36),
    ("gemini", "transcribe-speakers", 0.18),
]
LESSON_SETS = ["L1", "L2", "L3", "L4"]
ALL_INPUTS = ["synth", "clips"] + LESSON_SETS
LESSON_MINUTES = 20.0
PIECE_MIN, OVERLAP_S = 10.0, 20.0


def system_name(vendor: str, mode: str) -> str:
    return f"{vendor}-{mode}"


def run_id_of(vendor: str, mode: str) -> str:
    return f"b1-{system_name(vendor, mode)}"[:48]


# ----------------------------------------------------------- lesson codes

def derive_lesson_map(rows: list[dict]) -> dict[str, str]:
    """{code: wav path relative to wav16k} from manifest rows (set=lessons),
    by recorded properties only - no file names in this repo.
      L1 = the 139-min 48 kHz recording        L4 = its 16 kHz / 32 kbps twin
      L2 = the 84.5-min recording (16 kHz)     L3 = the recording whose
      source SHA-256 starts af000bb5 (B0-harness section 8).
    """
    out: dict[str, str] = {}
    for r in rows:
        if r.get("set") != "lessons" or not r.get("wav_file"):
            continue
        try:
            dur = float(r["source_duration_s"])
            sr = int(r["source_sample_rate"])
            br = int(r.get("source_bitrate") or 0)
        except (KeyError, ValueError):
            continue
        sha = r.get("source_sha256", "")
        if sha.startswith("af000bb5"):
            out["L3"] = r["wav_file"]
        elif abs(dur - 8337.2) < 1 and sr == 48000:
            out["L1"] = r["wav_file"]
        elif abs(dur - 8337.2) < 1 and sr == 16000 and br == 32000:
            out["L4"] = r["wav_file"]
        elif abs(dur - 5069.3) < 1 and sr == 16000:
            out["L2"] = r["wav_file"]
    return out


def lesson_paths() -> dict[str, Path]:
    """Code -> WAV. A local override file wins: work/vendor/_inputs/lesson_map.json
    ({"L1": "absolute\\\\path.wav", ...})."""
    override = common.WORK / "vendor" / "_inputs" / "lesson_map.json"
    if override.exists():
        return {k: Path(v) for k, v in json.loads(override.read_text(encoding="utf-8")).items()}
    return {k: common.WAV_DIR / v for k, v in derive_lesson_map(common.load_manifest()).items()}


def cut_lesson(wav: Path, code: str, minutes: float) -> Path:
    """First `minutes` of `wav` -> work/vendor/_inputs/<code>_<n>min.wav (cached)."""
    import soundfile as sf

    out = common.safe_out(common.WORK / "vendor" / "_inputs" / f"{code}_{int(minutes)}min.wav")
    if not out.exists():
        info = sf.info(str(wav))
        x, sr = common.read_wav(wav, 0.0, min(minutes * 60, info.duration))
        common.write_wav(out, x, sr)
    return out


# ------------------------------------------------------------ input sets

def build_inputs(names: list[str]) -> list[dict]:
    """[{name, argv (vendor_run args), srcs (vendor_run.sources())}]."""
    sets = []
    for n in names:
        if n == "synth":
            ns = SimpleNamespace(lesson=None, lesson_code=None, clips=None, synth="all", piece_minutes=PIECE_MIN)
            argv = ["--synth", "all"]
        elif n == "clips":
            ns = SimpleNamespace(lesson=None, lesson_code=None, clips="all", synth=None, piece_minutes=PIECE_MIN)
            argv = ["--clips", "all"]
        else:
            paths = lesson_paths()
            if n not in paths:
                sys.exit(f"no source recording found for {n} (see derive_lesson_map / work\\vendor\\_inputs\\lesson_map.json)")
            cut = cut_lesson(paths[n], n, LESSON_MINUTES)
            ns = SimpleNamespace(lesson=str(cut), lesson_code=n, clips=None, synth=None, piece_minutes=PIECE_MIN)
            argv = ["--lesson", str(cut), "--lesson-code", n]
        sets.append({"name": n, "argv": argv + ["--tag", n], "srcs": vendor_run.sources(ns)})
    return sets


def piece_seconds(src: dict) -> list[tuple[str, float]]:
    """[(object name, seconds)] each piece of one source would send."""
    if src["kind"] == "join":
        return [(vendor_run.piece_object(src, 0, "flac"), src["duration"])]
    spans = vendor_run.plan_pieces(src["duration"], PIECE_MIN * 60, OVERLAP_S)
    return [(vendor_run.piece_object(src, k, "flac"), e - s) for k, (s, e) in enumerate(spans)]


def system_dir(vendor: str, mode: str) -> Path:
    return common.WORK / "vendor" / vendor / mode


def plan(systems: list[tuple], inputs: list[dict]) -> list[dict]:
    """Per system: total minutes, minutes still to send (answers not saved), USD."""
    rows = []
    for vendor, mode, per_h in systems:
        tot = pend = 0.0
        for st in inputs:
            for src in st["srcs"]:
                for obj, secs in piece_seconds(src):
                    tot += secs / 60
                    if not vendor_run.piece_done(system_dir(vendor, mode), obj):
                        pend += secs / 60
        rows.append({"system": system_name(vendor, mode), "vendor": vendor, "mode": mode,
                     "minutes_total": round(tot, 1), "minutes_pending": round(pend, 1),
                     "usd_per_hour": per_h, "usd_estimate": round(pend / 60 * per_h, 2)})
    return rows


def format_plan(rows: list[dict], inputs: list[dict], ceiling: float) -> str:
    lines = ["PLAN (nothing is sent until you type YES)", "",
             "input sets: " + ", ".join(f"{s['name']} ({len(s['srcs'])} file(s))" for s in inputs), "",
             f"{'system':36} {'audio min':>10} {'to send':>9} {'USD/h':>6} {'est. USD':>9}"]
    for r in rows:
        lines.append(f"{r['system']:36} {r['minutes_total']:10.1f} {r['minutes_pending']:9.1f} {r['usd_per_hour']:6.2f} {r['usd_estimate']:9.2f}")
    pend = sum(r["minutes_pending"] for r in rows)
    lines += [f"{'TOTAL':36} {sum(r['minutes_total'] for r in rows):10.1f} {pend:9.1f} {'':6} {sum(r['usd_estimate'] for r in rows):9.2f}", "",
              f"local ceiling --max-total-minutes {ceiling:g}; server caps 400 calls / 600 min per run id, 2000 min overall.",
              "'to send' skips pieces whose answers are already saved. Prices are estimates from the B0 table (Azure and",
              "most OpenAI figures UNCONFIRMED); the bill is the vendors', not this table."]
    return "\n".join(lines)


# ------------------------------------------------------------------ run

def short_exit(code) -> str:
    return str(code)[:100] if isinstance(code, str) else f"exit {code}"


def run_system(vendor: str, mode: str, inputs: list[dict], sess, budget_min: float, run=None) -> dict:
    """Run one system over every input set; stop this system at its first error."""
    run = run or vendor_run.main
    res = {"system": system_name(vendor, mode), "ok": 0, "cached": 0, "failed": 0, "minutes": 0.0,
           "first_error": "", "status": "done", "fatal": False}
    for st in inputs:
        rep: dict = {}
        remaining = budget_min - res["minutes"]
        argv = ["--vendor", vendor, "--mode", mode, "--run-id", run_id_of(vendor, mode), *st["argv"],
                "--max-minutes", f"{max(remaining, 0):.3f}"]
        try:
            rc = run(argv, session=sess, report=rep)
        except SystemExit as e:
            if e.code == 3:
                raise
            rep.setdefault("errors", []).append({"obj": "-", "status": 0, "code": short_exit(e.code)})
            rc = 1
        except Exception as e:  # never let one system end the batch; class name only
            rep.setdefault("errors", []).append({"obj": "-", "status": 0, "code": f"error {type(e).__name__}"})
            rc = 1
        res["ok"] += rep.get("ok", 0)
        res["cached"] += rep.get("cached", 0)
        res["minutes"] += rep.get("minutes_ok", 0.0)
        errs = rep.get("errors", [])
        if errs:
            res["failed"] += len(errs)
            e = errs[0]
            res["first_error"] = f"{st['name']}: HTTP {e['status']} {e['code']}".strip()
            res["status"] = "skipped after error"
            res["fatal"] = any(x["status"] == 403 for x in errs)
            break
        if rc != 0:
            res["status"] = "stopped at --max-total-minutes"
            res["first_error"] = res["first_error"] or "ceiling reached"
            res["ceiling"] = True
            break
    return res


def format_summary(results: list[dict]) -> str:
    lines = [f"{'system':36} {'ok':>4} {'saved':>6} {'failed':>7} {'min sent':>9}  first error"]
    for r in results:
        lines.append(f"{r['system']:36} {r['ok']:4d} {r['cached']:6d} {r['failed']:7d} {r['minutes']:9.1f}  {r['first_error'] or '-'}")
    return "\n".join(lines)


def main(argv=None, run=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--login", action="store_true", help="prompt for the admin's email and password (hidden); token kept in memory")
    ap.add_argument("--systems", help="comma list of " + ", ".join(system_name(v, m) for v, m, _ in SYSTEMS))
    ap.add_argument("--inputs", help="comma list of " + ", ".join(ALL_INPUTS))
    ap.add_argument("--dry-run", action="store_true", help="no network: print the plan and stop")
    ap.add_argument("--yes", action="store_true", help="do not ask for YES")
    ap.add_argument("--max-total-minutes", type=float, default=1200.0, help="hard local ceiling (server's is 2000)")
    a = ap.parse_args(argv)

    common.safe_out(common.WORK / "b1")  # refuses (exit 3) if the work folder is inside a git repo
    names = [n.strip() for n in a.systems.split(",")] if a.systems else [system_name(v, m) for v, m, _ in SYSTEMS]
    bad = [n for n in names if n not in {system_name(v, m) for v, m, _ in SYSTEMS}]
    if bad:
        ap.error(f"unknown system(s): {bad}")
    systems = [s for s in SYSTEMS if system_name(s[0], s[1]) in names]
    in_names = [n.strip() for n in a.inputs.split(",")] if a.inputs else ALL_INPUTS
    bad = [n for n in in_names if n not in ALL_INPUTS]
    if bad:
        ap.error(f"unknown input set(s): {bad}")

    inputs = build_inputs(in_names)
    rows = plan(systems, inputs)
    print(format_plan(rows, inputs, a.max_total_minutes))
    pend = sum(r["minutes_pending"] for r in rows)
    if pend > a.max_total_minutes:
        print(f"\nREFUSED: {pend:.0f} minutes to send is over --max-total-minutes {a.max_total_minutes:g}. "
              "Narrow it with --systems / --inputs, or raise the ceiling (the server stops at 2000).")
        return 2
    if a.dry_run:
        print("\n[dry-run] no network used; nothing sent")
        return 0
    if pend == 0:
        print("\nNothing to send: every piece already has a saved answer.")
        return 0
    if not a.yes:
        if not sys.stdin.isatty():
            print("\nNot a terminal: pass --yes to run without the prompt.")
            return 2
        if input("\nType YES to send this audio to the vendors: ").strip() != "YES":
            print("Cancelled; nothing sent.")
            return 1

    url, key = vendor_run.supabase_conf()
    sess = vendor_run.open_session(url, key, a.login)
    sess.token()
    print("signed in (token kept in memory only)\n")

    results, sent = [], 0.0
    t0 = time.time()
    for vendor, mode, _ in systems:
        print(f"\n=== {system_name(vendor, mode)} ===")
        r = run_system(vendor, mode, inputs, sess, a.max_total_minutes - sent, run)
        sent += r["minutes"]
        results.append(r)
        if r["fatal"]:
            print(vendor_run.NOT_ADMIN)
            break
        if r.get("ceiling"):
            print("--max-total-minutes reached; stopping the batch")
            break
    print("\n" + format_summary(results))
    print(f"\n{sent:.1f} audio minutes sent this run, {time.time() - t0:.0f} s wall. Run the same command again to retry failed pieces.")
    out = common.safe_out(common.WORK / "b1" / f"batch_summary_{datetime.now():%Y%m%d_%H%M%S}.json")
    out.write_text(json.dumps({"results": results, "plan": rows}, indent=1), encoding="utf-8")
    return 0 if all(r["failed"] == 0 and r["status"] == "done" for r in results) else 1


if __name__ == "__main__":
    sys.exit(main())
