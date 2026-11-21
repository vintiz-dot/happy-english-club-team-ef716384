"""Where the overnight job is, and how long it has left.

    python scripts\\lesson-monitor\\progress.py          (a live bar; Ctrl+C closes it, the job carries on)
    python scripts\\lesson-monitor\\progress.py --once   (one look)

The job (nightly.py) writes pilot\\progress.json as it goes: which lesson, which step, how
far through. It holds recording ids, steps and numbers - never a name, a word or a sound.
This only reads it, so it can be opened and closed at any time without touching the job.

A job started before this file existed writes no progress.json; then the watcher reads the
day's log and ESTIMATES the transcription from the measured speed (pilot\\speed.json, or
the B2b figure until a lesson has been measured), and says so.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402

# B2b: about 2 h per 90-minute lesson (plan.HOURS_PER_LESSON); transcription is most of it.
DEFAULT_SPEED = 2.0 * 3600 / 5400   # wall seconds per second of lesson
DOWNLOAD_S = 300                     # a lesson's download, about 5 minutes on the school's line
AFTER_S = 30                         # building, deleting the audio, saving
STEPS = {"waiting": "waiting", "downloading": "downloading", "transcribing": "transcribing",
         "saving": "building and saving the report", "done": "done"}


def progress_file() -> Path:
    return pc.sub("progress.json")


def speed_file() -> Path:
    return pc.sub("speed.json")


def measured_speed() -> float:
    try:
        v = float(json.loads(speed_file().read_text(encoding="utf-8"))["speed"])
        return v if 0.05 < v < 20 else DEFAULT_SPEED
    except (OSError, ValueError, KeyError, TypeError):
        return DEFAULT_SPEED


# ----------------------------------------------------------------------------- the job's side

class Tracker:
    """nightly.py's half: one per run. Every method is best effort - progress never stops a lesson."""

    def __init__(self, lessons: list[tuple[str, float]]):
        self.state = {"job_started": time.time(), "pid": os.getpid(), "speed": measured_speed(),
                      "lessons": [{"id": rid, "lesson_s": round(s), "step": "waiting", "done": 0, "total": 0,
                                   "step_started": None, "outcome": None} for rid, s in lessons],
                      "finished": None}
        self._last = 0.0
        self._write(force=True)

    def _lesson(self, rid: str) -> dict | None:
        return next((x for x in self.state["lessons"] if x["id"] == rid), None)

    def step(self, rid: str, step: str, done: float = 0, total: float = 0) -> None:
        x = self._lesson(rid)
        if x is None:
            return
        if x["step"] != step:
            x["step"], x["step_started"] = step, time.time()
            force = True
        else:
            force = False
        x["done"], x["total"] = round(done, 1), round(total, 1)
        self._write(force)

    def transcribed(self, rid: str, wall_s: float, audio_s: float) -> None:
        """Remember the real speed, so the next estimate (and the next night's) uses it."""
        if audio_s > 600 and wall_s > 0:
            try:
                p = pc.out(speed_file())
                tmp = p.with_suffix(".tmp")
                tmp.write_text(json.dumps({"speed": round(wall_s / audio_s, 3), "measured": time.time()}), encoding="utf-8")
                os.replace(tmp, p)
            except (OSError, SystemExit):
                pass

    def finish(self, rid: str, outcome: str) -> None:
        x = self._lesson(rid)
        if x is not None:
            x["step"], x["outcome"], x["step_started"] = "done", outcome, time.time()
        self._write(force=True)

    def end(self) -> None:
        self.state["finished"] = time.time()
        self._write(force=True)

    def _write(self, force: bool = False) -> None:
        now = time.time()
        if not force and now - self._last < 2:
            return
        self._last = now
        self.state["updated"] = now
        try:
            p = pc.out(progress_file())
            tmp = p.with_suffix(".tmp")
            tmp.write_text(json.dumps(self.state), encoding="utf-8")
            os.replace(tmp, p)
        except (OSError, SystemExit):
            pass


# ----------------------------------------------------------------------------- the watcher's side

def lesson_left(x: dict, speed: float, now: float) -> tuple[float, float]:
    """(fraction of this lesson done, seconds it has left)."""
    work = DOWNLOAD_S + x["lesson_s"] * speed + AFTER_S
    step, started = x["step"], x.get("step_started") or now
    if step == "done":
        return 1.0, 0.0
    if step == "waiting":
        return 0.0, work
    if step == "downloading":
        f = (x["done"] / x["total"]) if x["total"] else 0.0
        el = now - started
        dl_left = el / f * (1 - f) if f > 0.05 else DOWNLOAD_S * (1 - f)
        return f * DOWNLOAD_S / work, dl_left + x["lesson_s"] * speed + AFTER_S
    if step == "transcribing":
        total = x["total"] or x["lesson_s"]
        f = min(1.0, x["done"] / total) if total else 0.0
        el = now - started
        # The model's own pace once it has done a few minutes of audio; the measured speed before that.
        t_left = el / f * (1 - f) if x.get("measured", True) and f > 0.05 else max(0.0, total * speed - el)
        if not x.get("measured", True):
            f = min(0.99, el / (total * speed)) if total else 0.0
        done_s = DOWNLOAD_S + f * total * speed
        return done_s / (done_s + t_left + AFTER_S), t_left + AFTER_S
    return 0.95, AFTER_S  # saving


def from_log(today: datetime) -> dict | None:
    """A job that writes no progress.json: rebuild its state from the day's log (ids and counts only)."""
    p = pc.logs_dir() / f"nightly-{today:%Y%m%d}.log"
    try:
        lines = p.read_text(encoding="utf-8").splitlines()
    except OSError:
        return None
    starts = [i for i, ln in enumerate(lines) if re.search(r" waiting \d+: tonight \d+", ln)]
    if not starts:
        return None
    lengths = {}  # any earlier attempt today tells a lesson's length
    for ln in lines:
        m = re.match(r"\S+ \S+ ([0-9a-f-]{36}) downloaded .* lesson (\d+) s", ln)
        if m:
            lengths[m.group(1)] = int(m.group(2))
    run = lines[starts[-1]:]
    stamp = lambda ln: datetime.strptime(ln[:19], "%Y-%m-%d %H:%M:%S").timestamp()  # noqa: E731
    n = int(re.search(r"tonight (\d+)", run[0]).group(1))
    seen: list[str] = []
    for ln in lines[: starts[-1]]:  # the lessons this run will do are the ones today's earlier runs tried
        m = re.match(r"\S+ \S+ ([0-9a-f-]{36}) downloaded", ln)
        if m and m.group(1) not in seen:
            seen.append(m.group(1))
    lessons, cur = [], None
    for ln in run[1:]:
        m = re.match(r"\S+ \S+ ([0-9a-f-]{36}) (\w+)", ln)
        if not m:
            continue
        rid, word = m.group(1), m.group(2)
        if cur is None or cur["id"] != rid:
            cur = {"id": rid, "lesson_s": lengths.get(rid, 5400), "step": "downloading", "done": 0, "total": 0,
                   "step_started": stamp(ln) - DOWNLOAD_S, "outcome": None, "measured": False}
            lessons.append(cur)
        if word == "downloaded":
            cur.update(step="transcribing", step_started=stamp(ln), total=cur["lesson_s"])
        elif word in ("report", "kept", "could", "failed", "STOPPED", "NOT", "refused", "not"):
            if word == "report":
                cur.update(step="saving", step_started=stamp(ln))
            else:
                cur.update(step="done", outcome=word.lower(), step_started=stamp(ln))
        if "report saved" in ln:
            cur.update(step="done", outcome="saved")
    started = {x["id"] for x in lessons}
    for rid in seen:
        if len(lessons) >= n:
            break
        if rid not in started:
            lessons.append({"id": rid, "lesson_s": lengths.get(rid, 5400), "step": "waiting", "done": 0, "total": 0,
                            "step_started": None, "outcome": None, "measured": False})
    while len(lessons) < n:
        lessons.append({"id": "next lesson", "lesson_s": 5400, "step": "waiting", "done": 0, "total": 0,
                        "step_started": None, "outcome": None, "measured": False})
    finished = any(" done: " in ln for ln in run)
    if not finished:
        # Every lesson so far has ended and the log says nothing of the next: it is downloading.
        last_done = [x for x in lessons if x["step"] == "done"]
        nxt = next((x for x in lessons if x["step"] == "waiting"), None)
        if nxt is not None and all(x["step"] in ("done", "waiting") for x in lessons) and last_done:
            nxt.update(step="downloading", step_started=last_done[-1]["step_started"], measured=False)
    return {"job_started": stamp(run[0]), "speed": measured_speed(), "lessons": lessons,
            "finished": stamp(run[-1]) if finished else None, "estimated": True}


def read_state(now: datetime) -> dict | None:
    try:
        s = json.loads(progress_file().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        s = None
    log = from_log(now)
    if s is None:
        return log
    if log is not None and log["job_started"] > s["job_started"] + 60:
        return log  # a newer run than the one that wrote progress.json (an older job version)
    return s


def bar(f: float, width: int = 32) -> str:
    n = int(round(max(0.0, min(1.0, f)) * width))
    return "[" + "#" * n + "-" * (width - n) + f"] {int(f * 100):3d}%"


def clock(seconds: float) -> str:
    m = int(seconds // 60)
    return f"{m // 60} h {m % 60:02d} min" if m >= 60 else f"{m} min"


def render(s: dict | None, now: float) -> str:
    if s is None:
        return "No lesson job has run today (no progress file, nothing in today's log)."
    speed = s.get("speed") or DEFAULT_SPEED
    out = []
    if s.get("estimated"):
        src = "this laptop's last measured speed" if speed_file().exists() else "the B2b benchmark (about 2 h per 90-min lesson)"
        out.append("This job started before progress reporting existed, so these times are ESTIMATES")
        out.append(f"from {src}. The next run reports its real progress.")
        out.append("")
    total_left, parts = 0.0, []
    for i, x in enumerate(s["lessons"], 1):
        f, left = lesson_left(x, speed, now)
        total_left += left
        name = x["id"][:8] if len(x["id"]) == 36 else x["id"]
        lesson = f"{x['lesson_s'] // 60} min lesson"
        if x["step"] == "done":
            what = {"saved": "report saved for the teacher", "failed": "FAILED - see the log", "draft": "kept as a draft",
                    "kept": "kept on this laptop", "kept_local": "kept on this laptop"}.get(x["outcome"] or "", x["outcome"] or "done")
        elif x["step"] == "transcribing":
            what = (f"transcribing, {clock(x['done'])} of {clock(x['total'] or x['lesson_s'])} done"
                    if x.get("measured", True) else "transcribing")
        elif x["step"] == "downloading" and x.get("total"):
            what = f"downloading, piece {int(x['done'])} of {int(x['total'])}"
        else:
            what = STEPS.get(x["step"], x["step"])
        out.append(f"Lesson {i} of {len(s['lessons'])}  ({name}, {lesson})")
        out.append(f"  {bar(f)}  {what}" + (f", about {clock(left)} left" if 0 < left and x["step"] != "waiting" else ""))
        parts.append(left)
    out.append("")
    if s.get("finished"):
        out.append(f"Finished at {datetime.fromtimestamp(s['finished']):%H:%M}.")
    else:
        done_w = sum(DOWNLOAD_S + x["lesson_s"] * speed + AFTER_S for x in s["lessons"])
        f_all = 1 - total_left / done_w if done_w else 0
        eta = datetime.fromtimestamp(now) + timedelta(seconds=total_left)
        out.append(f"All lessons  {bar(f_all)}")
        out.append(f"About {clock(total_left)} left - finished around {eta:%H:%M}.")
        upd = s.get("updated")
        if upd and now - upd > 600:
            out.append(f"(No word from the job for {clock(now - upd)}: is its window still open and the laptop awake?)")
    return "\n".join(out)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--once", action="store_true", help="print once and stop")
    a = ap.parse_args(argv)
    if a.once:
        print(render(read_state(datetime.now()), time.time()))
        return 0
    os.system("")  # lets the Windows console take the clear-screen code below
    try:
        while True:
            text = render(read_state(datetime.now()), time.time())
            sys.stdout.write("\x1b[H\x1b[J" + f"Lesson reports - {datetime.now():%H:%M:%S}\n\n" + text +
                             "\n\nCtrl+C closes this view; the job carries on.\n")
            sys.stdout.flush()
            time.sleep(5)
    except KeyboardInterrupt:
        return 0


if __name__ == "__main__":
    raise SystemExit(main())
