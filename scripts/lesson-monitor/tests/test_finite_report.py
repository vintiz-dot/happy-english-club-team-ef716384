"""A NaN anywhere in a report used to make the database refuse the whole body (28 Nov 2026 pilot)."""
import json
import math

import numpy as np

import nightly


def test_nan_and_inf_become_none_and_are_named_without_child_ids():
    kid = "3d02c1d3-a592-4f41-b431-4b67cdb4b6fb"
    body = {"lines": [{"t": 1.0, "e": float("nan")}], "mics": {"children_s": {kid: float("inf")}, "ok": 2.5,
            "levels": [1.0, np.float64("nan"), -math.inf]}}
    bad = nightly.finite_numbers(body)
    assert body["lines"][0]["e"] is None and body["mics"]["children_s"][kid] is None
    assert body["mics"]["levels"] == [1.0, None, None] and body["mics"]["ok"] == 2.5
    assert "lines[].e" in bad and "mics.children_s.*" in bad and "mics.levels[]" in bad
    assert kid not in " ".join(bad)
    json.dumps(body, allow_nan=False)  # what the database accepts


def test_a_clean_body_is_untouched():
    body = {"a": [1, 2.0, {"b": None}], "c": "x"}
    assert nightly.finite_numbers(body) == [] and body == {"a": [1, 2.0, {"b": None}], "c": "x"}
