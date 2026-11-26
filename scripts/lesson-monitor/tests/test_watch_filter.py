"""--class / --date / --careful for one night's watch (26 Nov 2026): the pure parts. Made-up ids only."""
from __future__ import annotations

from datetime import date

import pytest

import nightly

JUP, VEN = "jjjjjjjj-0000-4000-8000-000000000001", "vvvvvvvv-0000-4000-8000-000000000002"


def rows():
    return [
        {"recording_id": "r1", "class_id": JUP, "session_date": "2026-11-26"},
        {"recording_id": "r2", "class_id": VEN, "session_date": "2026-11-26"},
        {"recording_id": "r3", "class_id": JUP, "session_date": "2026-11-25"},
    ]


def test_filter_by_class_and_day():
    got = nightly.filter_pending(rows(), {JUP}, "2026-11-26")
    assert [r["recording_id"] for r in got] == ["r1"]


def test_no_filter_keeps_everything():
    assert len(nightly.filter_pending(rows(), None, None)) == 3


def test_day_only_and_class_only():
    assert [r["recording_id"] for r in nightly.filter_pending(rows(), None, "2026-11-26")] == ["r1", "r2"]
    assert [r["recording_id"] for r in nightly.filter_pending(rows(), {JUP}, None)] == ["r1", "r3"]


def test_resolve_day():
    t = date(2026, 11, 26)
    assert nightly.resolve_day("today", t) == "2026-11-26"
    assert nightly.resolve_day("Yesterday", t) == "2026-11-25"
    assert nightly.resolve_day("2026-11-20", t) == "2026-11-20"
    assert nightly.resolve_day(None, t) is None
    with pytest.raises(ValueError):
        nightly.resolve_day("tomorrow-ish", t)


class FakeApi:
    def __init__(self, found):
        self.found, self.asked = found, None

    def select(self, table, query):
        self.asked = (table, query)
        return self.found


def test_resolve_classes_matches_by_name():
    api = FakeApi([{"id": JUP, "name": "Jupiter"}])
    assert nightly.resolve_classes(api, "Jupiter") == {JUP}
    assert api.asked[0] == "classes"


def test_a_typo_never_means_every_class():
    with pytest.raises(ValueError):
        nightly.resolve_classes(FakeApi([]), "Jupitr")
    assert nightly.resolve_classes(FakeApi([]), None) is None
