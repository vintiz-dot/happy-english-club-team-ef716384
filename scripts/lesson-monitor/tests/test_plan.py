"""Scheduling: which lessons tonight, refusals, the lesson window, chunk checks."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

import plan

NOW = datetime(2026, 11, 20, 21, 0, tzinfo=timezone(timedelta(hours=7)))


def row(i, days_left, consent=True, teacher=True, start_h=17):
    return {"recording_id": f"r{i}", "session_date": "2026-11-19", "consent_ok": consent, "pilot_teacher_taught": teacher,
            "delete_after": (NOW + timedelta(days=days_left)).isoformat(),
            "scheduled_start": (NOW - timedelta(days=1, hours=21 - start_h)).isoformat()}


def test_refusals_are_separated_and_never_processed():
    t = plan.choose_tonight([row(1, 20), row(2, 20, consent=False), row(3, 20, teacher=False)], NOW, 3, plan.next_until(NOW, "07:00"))
    assert [r["recording_id"] for r in t.process] == ["r1"]
    assert [(r["recording_id"], why) for r, why in t.refuse] == [("r2", "consent_missing"), ("r3", "other_teacher")]


def test_oldest_deletion_date_first_and_capped_by_time_and_count():
    rows = [row(1, 25), row(2, 2), row(3, 10), row(4, 1)]
    until = plan.next_until(NOW, "07:00")          # 10 h -> 5 lessons fit at 2 h each
    t = plan.choose_tonight(rows, NOW, 2, until)
    assert [r["recording_id"] for r in t.process] == ["r4", "r2"]
    assert [r["recording_id"] for r in t.waiting] == ["r3", "r1"]
    assert t.at_risk == []
    late = NOW.replace(hour=4)                     # 3 h left -> one lesson fits
    t = plan.choose_tonight(rows, late, 3, plan.next_until(late, "07:00"))
    assert [r["recording_id"] for r in t.process] == ["r4"]
    assert [r["recording_id"] for r in t.at_risk] == ["r2"]   # deleted within 3 days and not processed: listed


def test_nothing_fits_after_the_deadline():
    assert plan.lessons_that_fit(NOW.replace(hour=6, minute=30), NOW.replace(hour=7)) == 0
    assert plan.next_until(NOW, "07:00") == (NOW + timedelta(days=1)).replace(hour=7, minute=0)
    assert plan.next_until(NOW.replace(hour=5), "07:00") == NOW.replace(hour=7, minute=0)


def test_lesson_window_counts_from_the_first_captured_sample():
    r = {"started_at": "2026-11-19T10:26:00Z", "pre_start_ms": 60000,
         "scheduled_start": "2026-11-19T10:30:00Z", "scheduled_end": "2026-11-19T12:00:00Z"}
    assert plan.lesson_window(r) == (300.0, 5700.0)
    r2 = dict(r, started_at="2026-11-19T10:40:00Z", pre_start_ms=0)   # started late: the lesson starts at 0
    assert plan.lesson_window(r2) == (0.0, 4800.0)
    with pytest.raises(ValueError):
        plan.lesson_window(dict(r, started_at="2026-11-19T13:00:00Z"))


def test_chunk_checks():
    ok = [{"track": t, "seq": s, "confirmed_at": "x"} for t in ("teacher", "room") for s in (1, 0, 2)]
    by, problems = plan.check_chunks(ok)
    assert problems == [] and [c["seq"] for c in by["room"]] == [0, 1, 2]
    _, problems = plan.check_chunks([c for c in ok if not (c["track"] == "room" and c["seq"] == 1)])
    assert problems == ["seq_gap_room"]
    _, problems = plan.check_chunks([c for c in ok if c["track"] == "room"] + [{"track": "teacher", "seq": 0, "confirmed_at": None}])
    assert problems == ["unconfirmed_teacher"]
    _, problems = plan.check_chunks([c for c in ok if c["track"] == "teacher"])
    assert problems == ["missing_track_room"]
