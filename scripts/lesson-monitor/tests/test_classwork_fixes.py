"""Class report follow-up: no inline sleeping, per-lesson backoff, dead builds, failed drafts given up."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import classwork
import nightly

LESSON = {"id": "s1", "class_id": "c1", "date": "2026-11-27", "start_time": "17:30:00", "end_time": "19:00:00"}
END = datetime(2026, 11, 27, 12, 0, tzinfo=timezone.utc)  # 19:00 in Hanoi
SINCE = END


def at(minutes):
    return END + timedelta(minutes=minutes)


class FollowApi:
    def __init__(self, works=(), draft=None, approved=False):
        self.works, self.draft, self.approved, self.asked = list(works), draft, approved, []

    def select(self, table, q):
        return {"sessions": [LESSON], "student_work": self.works, "lesson_report_drafts": [self.draft] if self.draft else [],
                "lesson_reports": [{"session_id": "s1"}] if self.approved else []}[table]

    def function(self, name, args):
        self.asked.append(args)


def test_a_building_draft_older_than_12_minutes_is_dead():
    d = classwork.decide
    assert d(LESSON, [], {"status": "building", "started_at": at(30).isoformat()}, False, at(41), SINCE) == "wait"
    assert d(LESSON, [], {"status": "building", "started_at": at(30).isoformat()}, False, at(43), SINCE) == "build"


def test_next_at_and_failed_tries_in_decide():
    d = classwork.decide
    failed = {"status": "failed"}
    assert d(LESSON, [], failed, False, at(40), SINCE, next_at=at(50), tries=1) == "wait"
    assert d(LESSON, [], failed, False, at(51), SINCE, next_at=at(50), tries=1) == "build"
    assert d(LESSON, [], failed, False, at(51), SINCE, next_at=at(50), tries=3) == "done"
    assert d(LESSON, [], None, False, at(51), SINCE, next_at=None, tries=5) == "build"  # only a failed draft is given up


def test_old_format_file_still_reads(pilot_root):
    classwork.save({"s1": SINCE.isoformat()})
    req = []
    c = classwork.follow_up(FollowApi(), lambda a, row: req.append(row) or "requested", now=at(40))
    assert c["build"] == 1 and len(req) == 1
    e = classwork.load()["s1"]
    assert e["tries"] == 0 and e["next_at"] == (at(40) + timedelta(minutes=12)).isoformat()


def test_requested_build_is_not_asked_again_while_it_builds(pilot_root):
    classwork.follow("s1", SINCE)
    req = []
    ask = lambda a, row: req.append(row) or "requested"  # noqa: E731
    api = FollowApi()
    assert classwork.follow_up(api, ask, now=at(40))["build"] == 1
    assert classwork.follow_up(api, ask, now=at(45))["wait"] == 1
    assert classwork.follow_up(api, ask, now=at(53))["build"] == 1
    assert len(req) == 2


def test_failed_request_backs_off_15_minutes_and_a_failed_draft_is_given_up_after_3(pilot_root):
    classwork.follow("s1", SINCE)
    req = []
    ask = lambda a, row: req.append(1) or "failed"  # noqa: E731
    api = FollowApi(draft={"status": "failed"})
    assert classwork.follow_up(api, ask, now=at(40))["build"] == 1
    assert classwork.load()["s1"]["tries"] == 1
    assert classwork.follow_up(api, ask, now=at(50))["wait"] == 1
    assert classwork.follow_up(api, ask, now=at(56))["build"] == 1
    assert classwork.follow_up(api, ask, now=at(72))["build"] == 1
    assert classwork.load()["s1"]["tries"] == 3
    assert classwork.follow_up(api, ask, now=at(90))["done"] == 1
    assert classwork.load() == {} and len(req) == 3


def test_refused_request_also_backs_off(pilot_root):
    classwork.follow("s1", SINCE)
    api = FollowApi()
    classwork.follow_up(api, lambda a, row: "refused_409", now=at(40))
    e = classwork.load()["s1"]
    assert e["tries"] == 1 and e["next_at"] == (at(40) + timedelta(minutes=15)).isoformat()


def test_follow_up_path_makes_one_try_and_never_sleeps(pilot_root, monkeypatch):
    slept = []
    monkeypatch.setattr(nightly.time, "sleep", slept.append)
    calls = []

    class Boom:
        status = 503

    def function(name, args):
        calls.append(args)
        raise type("E", (Exception,), {"status": 503})()

    api = FollowApi()
    api.function = function
    classwork.follow("s1", SINCE)
    c = classwork.follow_up(api, nightly._one_try, now=at(40))
    assert c["build"] == 1 and len(calls) == 1 and slept == []
    assert classwork.load()["s1"]["tries"] == 1


def test_request_lesson_report_default_still_retries_and_retry_false_does_not():
    slept = []

    class A:
        n = 0

        def function(self, name, args):
            A.n += 1
            raise type("E", (Exception,), {"status": 500})()

    assert nightly.request_lesson_report(A(), {"recording_id": "r", "session_id": "s"}, sleep=slept.append) == "failed"
    assert slept == [30, 120, 600] and A.n == 4
    slept.clear()
    A.n = 0
    assert nightly.request_lesson_report(A(), {"recording_id": "r", "session_id": "s"}, sleep=slept.append, retry=False) == "failed"
    assert slept == [] and A.n == 1
