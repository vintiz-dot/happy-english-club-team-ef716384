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
session ids and times only: per lesson {since, next_at, tries} (an older file holding just the ISO `since` string
still reads). The follow-up never sleeps: the caller passes a one-try request (nightly.request_lesson_report with
retry=False), and the waiting is kept here. A request that was not "requested" (failed, or refused such as a 409
"being built" / "6 builds today") sets next_at = now + 15 min and tries + 1; a draft that is still 'failed' after
3 such tries is given up (done). A "requested" build sets next_at = now + 12 min. A 'building' draft started over
12 minutes ago is dead (the claim allows a new build after 10): build.
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
BUILD_DEAD_MIN = 12
ASKED_WAIT_MIN = 12
RETRY_WAIT_MIN = 15
MAX_FAILED_TRIES = 3
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
           followed_since: datetime, next_at: datetime | None = None, tries: int = 0) -> str:
    """'wait' | 'build' | 'rebuild' | 'done'. Pure. works: the class's student_work rows in the window.
    next_at / tries: the lesson's own bookkeeping (no new request before next_at; tries = failed requests so far)."""
    if approved or now - followed_since > timedelta(hours=FOLLOW_HOURS):
        return "done"
    if draft and draft.get("status") == "failed" and tries >= MAX_FAILED_TRIES:
        return "done"
    if next_at is not None and now < next_at:
        return "wait"
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
        b = _ts(draft.get("started_at"))
        return "build" if b is not None and now - b > timedelta(minutes=BUILD_DEAD_MIN) else "wait"
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


def _entry(v) -> dict:
    """One followed lesson as {since, next_at, tries}; the older format is just the ISO `since` string."""
    if isinstance(v, dict):
        return {"since": v.get("since"), "next_at": v.get("next_at"), "tries": int(v.get("tries") or 0)}
    return {"since": v if isinstance(v, str) else None, "next_at": None, "tries": 0}


def follow(session_id: str, now: datetime | None = None) -> None:
    d = load()
    if session_id not in d:
        d[session_id] = {"since": (now or datetime.now(timezone.utc)).isoformat(), "next_at": None, "tries": 0}
    save(d)


def follow_up(api, request, now: datetime | None = None) -> dict:
    """One look at every followed lesson. `request(api, row)` asks for the draft ONCE, without sleeping
    (nightly.request_lesson_report with retry=False); returns "requested" or another code.
    Returns counts. Reads as the job account (admin): sessions, student_work, lesson_report_drafts, lesson_reports."""
    from supa import ApiError
    now = now or datetime.now(timezone.utc)
    d = load()
    counts = {"wait": 0, "build": 0, "rebuild": 0, "done": 0, "unreadable": 0}
    for sid, raw in list(d.items()):
        e = _entry(raw)
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
        act = decide(s, works, draft, approved, now, _ts(e["since"]) or now, _ts(e["next_at"]), e["tries"])
        counts[act] += 1
        if act == "done":
            if not approved and draft and draft.get("status") == "failed" and e["tries"] >= MAX_FAILED_TRIES:
                pc.log(f"class report for lesson {sid} given up after {e['tries']} failed tries")
            d.pop(sid, None)
        elif act in ("build", "rebuild"):
            pc.log(f"class report {act} for lesson {sid} ({len(works)} piece(s) of class work)")
            res = request(api, {"recording_id": f"session {sid}", "session_id": sid})
            if res is None or res == "requested":
                e["next_at"] = (now + timedelta(minutes=ASKED_WAIT_MIN)).isoformat()
            else:
                e["tries"] += 1
                e["next_at"] = (now + timedelta(minutes=RETRY_WAIT_MIN)).isoformat()
                pc.log(f"class report request for lesson {sid} not made: {res} (try {e['tries']})")
            d[sid] = e
        else:
            d[sid] = e
    save(d)
    return counts
