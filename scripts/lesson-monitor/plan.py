"""What the overnight job does tonight, worked out without touching audio (pure).

  * choose_tonight(): which waiting lessons to process, oldest deletion date
    first, as many as fit before the laptop must be free again; the rest wait,
    and any that would be deleted (by the recorder's 30-day retention) within
    three days are listed so the owner sees them (design s.10: "never silently
    dropped").
  * lesson_window(): where the scheduled lesson sits in the recording's
    timeline (t = 0 is the first captured sample: started_at - pre_start_ms).
  * check_chunks(): the stored chunks of each track are complete and in order.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

HOURS_PER_LESSON = 2.0   # B2b: about 2 h per 90-minute lesson, large-v3-turbo greedy, 4 threads (projected quiet)
AT_RISK_DAYS = 3.0


def parse_ts(s: str | None) -> datetime | None:
    if not s:
        return None
    s = s.replace("Z", "+00:00")
    d = datetime.fromisoformat(s)
    return d if d.tzinfo else d.replace(tzinfo=timezone.utc)


@dataclass
class Tonight:
    process: list = field(default_factory=list)    # rows to process now, in order
    refuse: list = field(default_factory=list)     # (row, reason code): recorded as refused, never processed
    waiting: list = field(default_factory=list)    # rows left for another night
    at_risk: list = field(default_factory=list)    # waiting rows whose audio goes within AT_RISK_DAYS


def refusal_reason(row: dict) -> str | None:
    if not row.get("consent_ok"):
        return "consent_missing"
    if not row.get("pilot_teacher_taught"):
        return "other_teacher"
    return None


def lessons_that_fit(now: datetime, until: datetime, hours_per_lesson: float = HOURS_PER_LESSON) -> int:
    """How many lessons can start and finish before `until` (the laptop is needed again)."""
    hours = (until - now).total_seconds() / 3600.0
    return max(0, int(hours // hours_per_lesson))


def next_until(now: datetime, hhmm: str) -> datetime:
    """The next local time hh:mm after `now` (same tz as `now`)."""
    h, m = (int(x) for x in hhmm.split(":"))
    t = now.replace(hour=h, minute=m, second=0, microsecond=0)
    return t if t > now else t + timedelta(days=1)


def choose_tonight(rows: list[dict], now: datetime, max_lessons: int, until: datetime,
                   hours_per_lesson: float = HOURS_PER_LESSON) -> Tonight:
    t = Tonight()
    ok = []
    for r in rows:
        why = refusal_reason(r)
        if why:
            t.refuse.append((r, why))
        else:
            ok.append(r)
    far = datetime.max.replace(tzinfo=timezone.utc)
    ok.sort(key=lambda r: (parse_ts(r.get("delete_after")) or far, parse_ts(r.get("scheduled_start")) or far))
    n = min(max(0, max_lessons), lessons_that_fit(now, until, hours_per_lesson))
    t.process, t.waiting = ok[:n], ok[n:]
    for r in t.waiting:
        d = parse_ts(r.get("delete_after"))
        if d is not None and (d - now).total_seconds() < AT_RISK_DAYS * 86400:
            t.at_risk.append(r)
    return t


def lesson_window(row: dict) -> tuple[float, float]:
    """(start_s, end_s) of the scheduled lesson in the recording's own timeline."""
    t0 = parse_ts(row["started_at"]) - timedelta(milliseconds=int(row.get("pre_start_ms") or 0))
    a = (parse_ts(row["scheduled_start"]) - t0).total_seconds()
    b = (parse_ts(row["scheduled_end"]) - t0).total_seconds()
    if b <= 0 or b <= a:
        raise ValueError("the lesson does not fall inside the recording")
    return max(0.0, a), b


def check_chunks(chunks: list[dict]) -> tuple[dict[str, list[dict]], list[str]]:
    """Group chunks by track, in seq order. Problems are short codes:
    missing_track_<t>, seq_gap_<t>, unconfirmed_<t>."""
    by: dict[str, list[dict]] = {"teacher": [], "room": []}
    for c in chunks:
        by.setdefault(c["track"], []).append(c)
    problems = []
    for track in ("teacher", "room"):
        cs = sorted(by.get(track, []), key=lambda c: int(c["seq"]))
        by[track] = cs
        if not cs:
            problems.append(f"missing_track_{track}")
            continue
        if [int(c["seq"]) for c in cs] != list(range(len(cs))):
            problems.append(f"seq_gap_{track}")
        if any(not c.get("confirmed_at") for c in cs):
            problems.append(f"unconfirmed_{track}")
    return by, problems
