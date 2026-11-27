"""Shared paths and rules for the lesson monitor pilot (Option A, D-28).

Data rules (binding, docs/LESSON_MONITOR_PILOT_RUNBOOK.md):
  * Audio, transcripts and every derived lesson text live ONLY under
    PILOT = <HEC_EVAL_ROOT>\\pilot (default C:\\Users\\Dell\\hec-audio-eval\\pilot).
    `out()` refuses (exit 3) to write anywhere inside a git repository, using
    the evaluation harness's own `safe_out()`.
  * key.txt / consent.txt are never opened (the harness's `is_forbidden`).
  * Logs hold ids, counts and short codes. Never transcript text, never a
    child's name, never a token.
  * The kill switch on this machine is the file PILOT\\STOP: while it exists
    nothing downloads, and a running job stops at its next check and deletes
    its audio copy.
"""
from __future__ import annotations

import os
import shutil
import sys
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "lesson-eval"))
import common  # noqa: E402  (the harness: safe_out, inside_git_repo, is_forbidden)

JOB_VERSION = "pilot-0.1"
SCHEMA = "hec-lesson-monitor/1"


def pilot_root() -> Path:
    return Path(os.environ.get("HEC_PILOT_ROOT", str(common.ROOT / "pilot")))


def models_dir() -> Path:
    return common.ROOT / "models"


def sub(name: str) -> Path:
    return pilot_root() / name


def audio_dir() -> Path:
    return sub("audio")


def drafts_dir() -> Path:
    return sub("drafts")


def step0_dir() -> Path:
    return sub("step0")


def logs_dir() -> Path:
    return sub("logs")


def stop_file() -> Path:
    return sub("STOP")


def step0_result_file() -> Path:
    return step0_dir() / "result.json"


def check_root() -> Path:
    """The pilot folder must be called 'pilot' and must not be inside a repo."""
    root = pilot_root().resolve()
    if root.name.lower() != "pilot":
        sys.exit(f"REFUSED: the pilot folder must be named 'pilot' (got {root})")
    common.safe_out(root)
    return root


def out(path: str | Path, mkdir: bool = True) -> Path:
    """An output path under the pilot folder (its parent is created); exits 3 if it
    is outside the pilot folder or inside a git repo."""
    p = Path(path).resolve()
    root = pilot_root().resolve()
    if root != p and root not in p.parents:
        sys.stderr.write(f"REFUSED: {p} is outside the pilot folder {root}\n")
        sys.exit(3)
    repo = common.inside_git_repo(p.parent)
    if repo is not None:
        sys.stderr.write(f"REFUSED: output path {p} is inside the git repository {repo}.\n")
        sys.exit(3)
    if mkdir:
        p.parent.mkdir(parents=True, exist_ok=True)
    return p


def stopped() -> bool:
    return stop_file().exists()


def log(line: str) -> None:
    """Print and append one line to today's log. Callers pass ids and counts only."""
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(line, flush=True)
    try:
        f = out(logs_dir() / f"nightly-{datetime.now():%Y%m%d}.log")
        with open(f, "a", encoding="utf-8") as fh:
            fh.write(f"{stamp} {line}\n")
    except SystemExit:
        raise
    except OSError:
        pass


def wipe_drafts() -> int:
    """Delete every local draft (reports kept on this laptop). Returns files removed."""
    d = drafts_dir()
    n = len(files_under(d))
    if d.exists():
        shutil.rmtree(d, ignore_errors=True)
    return n


def wipe_work() -> tuple[int, int]:
    """What a stop removes from this laptop: every audio copy and every local draft. Returns (audio files, draft files)."""
    a = len(files_under(audio_dir()))
    if audio_dir().exists():
        shutil.rmtree(audio_dir(), ignore_errors=True)
    return a, wipe_drafts()


class Guard:
    """May the work on ONE recording go on? Asks the local kill switch (the STOP file) and, at most
    every `every` seconds, the database (lesson_monitor_may_continue: class still on, every child of
    the lesson still consented). Answers 'ok', a reason ('class_off', 'consent_missing', 'gone',
    'stopped' for the local file), or 'unreachable' when the database cannot be asked (offline, token
    expired).

    An unreachable database is NOT a yes. A withdrawal or a switch-off made in the app cannot reach a
    laptop that cannot be asked, so silence must not mean "carry on" for hours. The job gets a short
    grace (`grace` seconds, default 900) and after that should_stop() is True: the caller stops and
    deletes its audio copy and any draft. A pasted token (--token) expires in about an hour and cannot
    be refreshed, so a job on one must finish inside that hour; after it the job stops and wipes rather
    than go on unchecked.

    The grace was 2 minutes until 27 Nov 2026: a 2-minute Wi-Fi drop at 04:12 that night cost Jupiter's
    whole report (built after five hours, dropped at the last look). 15 minutes rides out a router
    restart; a withdrawal made meanwhile still stops the job the moment the database answers, and
    nothing is kept until it answers "ok" (final_verdict)."""

    def __init__(self, api, recording_id: str, every: float = 15.0, grace: float = 900.0, clock=time.monotonic,
                 sleep=time.sleep, retry: float = 30.0):
        self.api, self.rid, self.every, self.grace, self.clock = api, recording_id, every, grace, clock
        self.sleep, self.retry = sleep, retry
        self._last_at = None
        self._last = "ok"
        self._down_since = None

    def verdict(self, force: bool = False) -> str:
        if stopped():
            return "stopped"
        now = self.clock()
        if not force and self._last_at is not None and now - self._last_at < self.every:
            return self._last
        from supa import ApiError
        try:
            r = self.api.rpc("lesson_monitor_may_continue", {"p_recording": self.rid})
            self._last = r if isinstance(r, str) and r else "gone"
            self._down_since = None
        except ApiError as e:
            if e.status in (0, 401):
                self._last = "unreachable"
                if self._down_since is None:
                    self._down_since = now
            else:
                self._last = "gone"
                self._down_since = None
        self._last_at = now
        return self._last

    def should_stop(self) -> bool:
        v = self.verdict()
        if v == "unreachable":
            return self.clock() - (self._down_since if self._down_since is not None else self.clock()) > self.grace
        return v != "ok"

    def final_verdict(self) -> str:
        """The last look before anything is kept: ask now, and while the database cannot be reached ask again
        every `retry` seconds until it answers or `grace` seconds have passed offline. Only "ok" lets a
        report be kept; any other answer, or still no answer at the end, drops it."""
        v = self.verdict(force=True)
        while v == "unreachable" and not stopped():
            down = self._down_since if self._down_since is not None else self.clock()
            if self.clock() - down > self.grace:
                break
            log(f"{self.rid}: database not reachable at the last look; asking again in {int(self.retry)} s")
            self.sleep(self.retry)
            v = self.verdict(force=True)
        return v

    def reason(self) -> str:
        """Why the last answer stopped the job, without asking again."""
        if stopped():
            return "stopped"
        if self._last == "unreachable":
            return "database_unreachable"
        return self._last


def files_under(folder: Path) -> list[Path]:
    """Every file under `folder` (a listing, used to prove a deletion)."""
    if not folder.exists():
        return []
    return [p for p in folder.rglob("*") if p.is_file()]
