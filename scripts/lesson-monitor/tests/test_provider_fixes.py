"""Fixes to the remote providers (27 Nov 2026): one bad piece never fails a lesson, a dropped line is status 0,
parsers refuse odd JSON with a code, reconcile keeps the primary when the re-check heard nothing, a used-up
allowance switches the provider off for the run (and back on when it returns), each Groq word sits in one segment.
No network, no audio, no key."""
from __future__ import annotations

import http.client
import json
import urllib.request

import numpy as np
import pytest

from providers import SR, AuthFailed, Base, ProviderError, QuotaExhausted, cloudflare, groq, net, quota, reconcile, remote


def seg(a, b, text, **kw):
    return dict({"start": a, "end": b, "text": text, "avg_logprob": -0.2, "no_speech_prob": 0.01,
                 "compression_ratio": 1.1, "words": []}, **kw)


class Boom:
    name, model = "boom", "m"

    def transcribe_piece(self, x, offset_s):
        raise KeyError("secret text")


class Fixed:
    name, model = "fixed", "m"

    def __init__(self, segs):
        self.segs = segs

    def transcribe_piece(self, x, offset_s):
        return [dict(s) for s in self.segs]


def test_unexpected_exception_in_one_provider_falls_back_and_is_coded():
    audio = np.zeros(10 * SR, dtype=np.float32)
    logs = []
    out, settings = remote.transcribe_lesson(audio, [Boom(), Fixed([seg(1, 3, "hello there")])], None,
                                             lambda: False, RuntimeError, logs.append)
    assert [s["text"] for s in out] == ["hello there"]
    assert settings["provider_codes"] == {"boom": {"error_keyerror": 1}}
    assert not any("secret" in line for line in logs)


def test_net_request_turns_http_client_errors_into_status_0(monkeypatch):
    for exc in (http.client.IncompleteRead(b"x"), http.client.BadStatusLine("x")):
        def fake(req, timeout=0, _e=exc):
            raise _e
        monkeypatch.setattr(urllib.request, "urlopen", fake)
        st, hdr, body = net.request("POST", "http://x", {}, b"")
        assert st == 0 and json.loads(body) == {"error": "network"}


@pytest.mark.parametrize("raw", [b"[]", b"3", b"null", b'{"segments": 5}', b'{"segments": [1]}', b'{"words": "x"}'])
def test_groq_parse_refuses_odd_json_with_a_code(raw):
    with pytest.raises(ProviderError) as e:
        groq.parse(raw, 0.0)
    assert e.value.code == "bad_answer"


@pytest.mark.parametrize("raw", [b"[]", b"3", b'{"result": 5}', b'{"result": {"segments": 5}}', b'{"result": {"segments": [1]}}'])
def test_cloudflare_parse_refuses_odd_json_with_a_code(raw):
    with pytest.raises(ProviderError) as e:
        cloudflare.parse(raw, 0.0)
    assert e.value.code == "bad_answer"


def test_null_word_times_do_not_crash_parsers():
    g = json.dumps({"segments": [{"start": 0, "end": 2, "text": "hi there"}],
                    "words": [{"word": "hi", "start": 0.1, "end": None}, {"word": "x", "start": None, "end": 1}]})
    out = groq.parse(g.encode(), 0.0)
    assert len(out) == 1 and out[0]["words"] == []
    c = json.dumps({"result": {"segments": [{"start": None, "end": 2, "text": "a"},
                                            {"start": 0, "end": 2, "text": "b",
                                             "words": [{"word": "b", "start": 0, "end": None}]}]}})
    out = cloudflare.parse(c.encode(), 0.0)
    assert [s["text"] for s in out] == ["b"] and out[0]["words"] == []


def test_cloudflare_both_daily_codes_end_the_run_part():
    assert cloudflare.DAILY_CODES == {3036, 4006}
    for code in (3036, 4006):
        raw = json.dumps({"success": False, "errors": [{"code": code}]}).encode()
        p = cloudflare.Cloudflare("a", "t", quota.Quota("cloudflare", quota.DEFAULTS["cloudflare"], clock=lambda: 0.0),
                                  transport=lambda *a: (400, {}, raw))
        with pytest.raises(QuotaExhausted) as e:
            p.transcribe_piece(np.zeros(SR, dtype=np.float32), 0.0)
        assert e.value.code == "daily_allowance"


def test_merge_keeps_primary_unsure_when_recheck_returned_nothing_in_a_window():
    primary = [seg(0, 2, "before"), seg(10, 12, "heard here"), seg(13, 14, "also here"), seg(30, 31, "after")]
    out = reconcile.merge(primary, [(9.5, 14.5)], [], [primary])
    assert [s["text"] for s in out] == ["before", "heard here", "also here", "after"]
    assert [bool(s.get("force_unsure")) for s in out] == [False, True, True, False]


def test_merge_with_a_recheck_in_the_window_does_not_also_keep_the_primary():
    primary = [seg(10, 12, "old text")]
    out = reconcile.merge(primary, [(9.5, 12.5)], [seg(10, 12, "old text")], [primary])
    assert len(out) == 1 and out[0].get("recheck")


class Q:
    def __init__(self, wait):
        self.wait, self.blocked = wait, []

    def wait_for(self, s):
        return self.wait

    def record(self, s):
        pass

    def block(self, s):
        self.blocked.append(s)


def make(answers, q):
    class T(Base):
        name, model = "t", "m"

        def __init__(self):
            super().__init__(q, sleep=lambda s: None)
            self.calls = 0

        def _call(self, x, offset_s):
            self.calls += 1
            r = answers.pop(0)
            if isinstance(r, Exception):
                raise r
            return r

    return T()


X = np.zeros(SR, dtype=np.float32)


def test_quota_exhaustion_disables_the_provider_then_it_comes_back():
    q = Q(0.0)
    t = make([QuotaExhausted("rate_limited", retry_after=9999.0), [seg(0, 1, "ok")]], q)
    with pytest.raises(QuotaExhausted):
        t.transcribe_piece(X, 0.0)
    assert t.disabled == "quota_exhausted" and t.calls == 1
    q.wait = 9999.0                                   # still used up: later pieces skip it at once
    with pytest.raises(QuotaExhausted):
        t.transcribe_piece(X, 0.0)
    assert t.calls == 1
    q.wait = 0.0                                      # the allowance came back (next lesson)
    assert t.transcribe_piece(X, 0.0)[0]["text"] == "ok" and t.disabled is None


def test_quota_wait_too_long_disables_and_auth_stays_permanent():
    t = make([], Q(99999.0))
    with pytest.raises(QuotaExhausted):
        t.transcribe_piece(X, 0.0)
    assert t.disabled == "quota_exhausted"
    a = make([AuthFailed("auth_401")], Q(0.0))
    with pytest.raises(AuthFailed):
        a.transcribe_piece(X, 0.0)
    with pytest.raises(ProviderError) as e:
        a.transcribe_piece(X, 0.0)
    assert e.value.code == "auth_401" and a.calls == 1


def test_retries_exhausted_on_429_disables():
    t = make([QuotaExhausted("rate_limited", retry_after=1.0)] * 4, Q(0.0))
    with pytest.raises(QuotaExhausted):
        t.transcribe_piece(X, 0.0)
    assert t.disabled == "quota_exhausted"


def test_groq_words_go_to_exactly_one_segment():
    d = {"segments": [{"start": 0.0, "end": 1.0, "text": "one two"}, {"start": 1.0, "end": 2.0, "text": "three"}],
         "words": [{"word": "one", "start": 0.1, "end": 0.4},
                   {"word": "edge", "start": 0.97, "end": 1.03},    # middle 1.0 fits both spans: first wins
                   {"word": "three", "start": 1.5, "end": 1.8},
                   {"word": "late", "start": 3.0, "end": 3.2}]}    # fits none: nearest segment (the second)
    out = groq.parse(json.dumps(d).encode(), 0.0)
    got = [[w["w"] for w in s["words"]] for s in out]
    assert got == [["one", "edge"], ["three", "late"]]
