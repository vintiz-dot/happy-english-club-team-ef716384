"""The class report waits for the children's work, and follows it (owner, 27 Nov 2026: "the teacher should only have
to approve the ready report, nothing else").

lesson-report-draft reads the student work uploaded in Smart Upload from the lesson's start to 30 minutes after its
end (student_work.created_at inside lessonWindow), with the text the OCR wrote (ocr_text). The OCR runs right
after the upload (ocr-student-work / ocr-vocab-scan): while it runs the row is status 'processing' and has no text.
So a report built too early would leave that work out. This module decides, per lesson whose transcript the server
saved, what to do now (pure: `decide`), and `follow_up` does it as the signed-in job account:

  wait     the upload window is still open (lesson end + 30 min), or a page in it is still being read
           (status 'processing', for at most OCR_STUCK_MIN: a page stuck longer is not waited for);
  build    no draft yet, or the last build failed: ask lesson-report-draft (from_monitor) for one;
  rebuild  the draft is ready, NOT approved, and work of that lesson was read after the draft was started
           (a page uploaded late, or whose OCR finished after the build): ask again, so the draft holds it;
  done     the report is approved (it is never touched again: an approved report changes only by a new
           approval on the teacher's screen), or the follow-up is older than FOLLOW_HOURS.

A lesson is followed from the moment its transcript report is saved; the list (state/report-followups.json) holds
session ids and times only. Requests go through nightly.request_lesson_report (its retries; a 409 "being built" or
"6 builds today" is final for that try and the next look decides again).
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pilot_common as pc

AFTER_LESSON_MIN = 30   # = lessonWindow's afterMinutes in supabase/functions/_lib/lesson-report-draft.ts
OCR_STUCK_MIN = 20
FOLLOW_HOURS = 36
HANOI = timezone(timedelta(hours=7))


def window(date: str, start: str, end: str) -> tuple[datetime, datetime]:
    """The same window lesson-report-draft reads student work in."""
    at = lambda t: datetime.fromisoformat(f"{date}T{t[:8] if len(t) > 5 else t + ':00'}").replace(tzinfo=HANOI)
    return at(start), at(end) + timedelta(minutes=AFTER_LESSON_MIN)


def _ts(v) -> datetime | None:
    if not v:
        return None
    try:
        return datetime.fromisoformat(str(v).replace("Z", "+00:00"))
    except ValueError:
        return None


def decide(session: dict, works: list[dict], draft: dict | None, approved: bool, now: datetime,
           followed_since: datetime) -> str:
    """'wait' | 'build' | 'rebuild' | 'done'. Pure. works: the class's student_work rows in the window."""
    if approved or now - followed_since > timedelta(hours=FOLLOW_HOURS):
        return "done"
    _, w_end = window(str(session["date"]), str(session["start_time"]), str(session["end_time"]))
    if now < w_end:
        return "wait"
    reading = [w for w in works if w.get("status") == "processing"
               and (_ts(w.get("created_at")) or now) > now - timedelta(minutes=OCR_STUCK_MIN)]
    if reading:
        return "wait"
    if not draft or draft.get("status") == "failed":
        return "build"
    if draft.get("status") == "building":
        return "wait"
    started = _ts(draft.get("started_at"))
    if started is None:
        return "build"
    # Read after the draft started: a late page, or one whose OCR finished after the build. Only the OCR's own
    # result state counts ('needs_review'): a teacher approving the page later does not rebuild the draft.
    late = [w for w in works if w.get("status") == "needs_review" and (_ts(w.get("updated_at")) or started) > started]
    return "rebuild" if late else "wait"


# ------------------------------------------------------------------ the list of lessons followed
def _file() -> Path:
    return pc.sub("state") / "report-followups.json"


def load() -> dict:
    try:
        return json.loads(_file().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save(d: dict) -> None:
    f = pc.out(_file())
    tmp = f.with_suffix(".tmp")
    tmp.write_text(json.dumps(d), encoding="utf-8")
    os.replace(tmp, f)


def follow(session_id: str, now: datetime | None = None) -> None:
    d = load()
    d.setdefault(session_id, (now or datetime.now(timezone.utc)).isoformat())
    save(d)


def follow_up(api, request, now: datetime | None = None) -> dict:
    """One look at every followed lesson. `request(api, row)` asks for the draft (nightly.request_lesson_report).
    Returns counts. Reads as the job account (admin): sessions, student_work, lesson_report_drafts, lesson_reports."""
    from supa import ApiError
    now = now or datetime.now(timezone.utc)
    d = load()
    counts = {"wait": 0, "build": 0, "rebuild": 0, "done": 0, "unreadable": 0}
    for sid, since in list(d.items()):
        try:
            s = (api.select("sessions", {"id": f"eq.{sid}", "select": "id,class_id,date,start_time,end_time"}) or [None])[0]
            if not s:
                d.pop(sid, None)
                counts["done"] += 1
                continue
            a, b = window(str(s["date"]), str(s["start_time"]), str(s["end_time"]))
            works = api.select("student_work", {
                "class_id": f"eq.{s['class_id']}", "created_at": f"gte.{a.isoformat()}",
                "and": f"(created_at.lte.{b.isoformat()})", "select": "id,status,created_at,updated_at"}) or []
            draft = (api.select("lesson_report_drafts", {"session_id": f"eq.{sid}", "select": "status,started_at,run"}) or [None])[0]
            approved = bool(api.select("lesson_reports", {"session_id": f"eq.{sid}", "select": "session_id"}))
        except ApiError:
            counts["unreadable"] += 1
            continue
        act = decide(s, works, draft, approved, now, _ts(since) or now)
        counts[act] += 1
        if act == "done":
            d.pop(sid, None)
        elif act in ("build", "rebuild"):
            pc.log(f"class report {act} for lesson {sid} ({len(works)} piece(s) of class work)")
            request(api, {"recording_id": f"session {sid}", "session_id": sid})
    save(d)
    return counts
