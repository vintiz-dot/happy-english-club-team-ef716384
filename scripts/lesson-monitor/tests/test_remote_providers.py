"""The remote transcription path (27 Nov 2026): Groq + Cloudflare pieces, quotas, reconciliation, fallbacks, the
consent check before every upload, the sealing on Linux, and the class report request's retries.
Fake transports and fake models only: no network, no real audio, no key."""
from __future__ import annotations

import json
import os
import sys
from types import SimpleNamespace

import numpy as np
import pytest

import nightly
import pilot_common as pc
from providers import SR, NotAllowed, ProviderError, QuotaExhausted, cloudflare, groq, join_pieces, plan_pieces, quota, reconcile, remote
from supa import ApiError
from test_nightly_fake import ROW, STEP0, FakeApi, FakeModel


def seg(a, b, text, **kw):
    return dict({"start": a, "end": b, "text": text, "avg_logprob": -0.2, "no_speech_prob": 0.01,
                 "compression_ratio": 1.1, "words": []}, **kw)


# ------------------------------------------------------------------ pieces
def test_pieces_cover_the_lesson_with_overlaps_and_join_takes_each_segment_once():
    n = int(1500 * SR)
    p = plan_pieces(n)
    assert p[0] == (0, 600 * SR) and p[-1][1] == n
    assert all(p[k + 1][0] == p[k][1] - 4 * SR for k in range(len(p) - 1))
    # the same sentence heard by both pieces in the overlap (596-600 s) is kept once
    a = [seg(590, 597, "first"), seg(597.5, 599.5, "both pieces heard this")]
    b = [seg(597.6, 599.4, "both pieces heard this"), seg(605, 610, "second")]
    out = join_pieces([a, b, None], p)
    assert [s["text"] for s in out] == ["first", "both pieces heard this", "second"]
    assert plan_pieces(100) == [(0, 100)] and plan_pieces(0) == []


# ------------------------------------------------------------------ quota
def test_quota_waits_inside_the_free_allowance_and_refuses_what_never_fits(tmp_path):
    t = [1000.0]
    q = quota.Quota("groq", {"rpm": 2, "ash": 2000, "margin": 1.0}, tmp_path / "q.json", clock=lambda: t[0])
    assert q.wait_for(600) == 0
    q.record(600)
    q.record(600)
    assert q.wait_for(10) == pytest.approx(60.0)       # 2 requests a minute: the first must leave the window
    t[0] += 61
    assert q.wait_for(900) == pytest.approx(3600 - 61)  # 1,200 of 2,000 audio seconds an hour are used
    assert q.wait_for(5000) == float("inf")
    q.block(900)
    assert quota.Quota("groq", {"rpm": 2, "ash": 2000, "margin": 1.0}, tmp_path / "q.json", clock=lambda: t[0]).blocked_until == t[0] + 900


def test_cloudflare_neurons_a_day():
    q = quota.Quota("cloudflare", {"neurons_per_day": 10000, "neurons_per_audio_min": 46.63, "margin": 1.0}, clock=lambda: 0.0)
    for _ in range(21):
        q.record(600)                                   # 21 x 10 minutes = 9,792 neurons
    assert q.wait_for(600) > 3600 and q.used_today()["neurons"] == 9792


def test_limits_file_overrides_only_known_numbers(tmp_path):
    f = tmp_path / "limits.json"
    f.write_text(json.dumps({"groq": {"ash": 3600, "evil": 1}, "other": {"x": 1}}))
    L = quota.load_limits(f)
    assert L["groq"]["ash"] == 3600 and "evil" not in L["groq"] and "other" not in L


# ------------------------------------------------------------------ Groq
class Transport:
    def __init__(self, *answers):
        self.answers, self.calls = list(answers), []

    def __call__(self, method, url, headers, body):
        self.calls.append((method, url, headers, body))
        a = self.answers.pop(0) if len(self.answers) > 1 else self.answers[0]
        return a


GROQ_OK = (200, {}, json.dumps({"segments": [
    {"start": 1.0, "end": 3.0, "text": " Open your books. ", "avg_logprob": -0.1, "no_speech_prob": 0.02, "compression_ratio": 1.3},
    {"start": 3.5, "end": 4.0, "text": " "}],
    "words": [{"word": "Open", "start": 1.0, "end": 1.4}, {"word": "your", "start": 1.4, "end": 1.7}, {"word": "books", "start": 1.8, "end": 2.6}]}).encode())


def free_quota():
    return quota.Quota("t", {})


def test_groq_sends_the_full_model_and_reads_segments_with_words_in_lesson_time():
    tr = Transport(GROQ_OK)
    g = groq.Groq("k", free_quota(), transport=tr, sleep=lambda s: None)
    out = g.transcribe_piece(np.zeros(SR * 5, dtype=np.float32), 600.0)
    body = tr.calls[0][3]
    assert b'name="model"\r\n\r\nwhisper-large-v3\r\n' in body and b"turbo" not in body
    assert b"verbose_json" in body and tr.calls[0][2]["Authorization"] == "Bearer k"
    assert out == [{"start": 601.0, "end": 603.0, "text": "Open your books.", "avg_logprob": -0.1, "no_speech_prob": 0.02,
                    "compression_ratio": 1.3, "words": [
                        {"w": "Open", "start": 601.0, "end": 601.4, "p": None}, {"w": "your", "start": 601.4, "end": 601.7, "p": None},
                        {"w": "books", "start": 601.8, "end": 602.6, "p": None}]}]


def test_missing_numbers_stay_unknown():
    out = groq.parse(json.dumps({"segments": [{"start": 0, "end": 1, "text": "hi"}]}).encode(), 0)
    assert out[0]["avg_logprob"] is None and out[0]["no_speech_prob"] is None and out[0]["words"] == []


def test_nothing_is_sent_when_the_database_does_not_say_ok():
    tr = Transport(GROQ_OK)
    g = groq.Groq("k", free_quota(), transport=tr, may_send=lambda: False)
    with pytest.raises(NotAllowed):
        g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)
    assert tr.calls == []


def test_a_429_waits_its_retry_after_then_succeeds_and_a_long_one_gives_up():
    slept = []
    tr = Transport((429, {"retry-after": "7"}, b"{}"), GROQ_OK)
    g = groq.Groq("k", free_quota(), transport=tr, sleep=slept.append)
    assert len(g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)) == 1 and slept == [pytest.approx(7.0, abs=0.5)]
    tr = Transport((429, {"x-ratelimit-reset-audio-seconds": "1h2m"}, b"{}"))
    g = groq.Groq("k", free_quota(), transport=tr, sleep=slept.append)
    with pytest.raises(QuotaExhausted):
        g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)
    assert len(tr.calls) == 1                           # no retry storm


def test_5xx_is_retried_twice_and_a_refused_key_turns_the_provider_off():
    slept = []
    tr = Transport((503, {}, b"{}"))
    g = groq.Groq("k", free_quota(), transport=tr, sleep=slept.append)
    with pytest.raises(ProviderError) as e:
        g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)
    assert e.value.code == "unavailable" and len(tr.calls) == 3
    tr = Transport((401, {}, b"{}"))
    g = groq.Groq("k", free_quota(), transport=tr, sleep=slept.append)
    with pytest.raises(ProviderError):
        g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)
    with pytest.raises(ProviderError):
        g.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)
    assert len(tr.calls) == 1


# ------------------------------------------------------------------ Cloudflare
def test_cloudflare_reads_result_segments_and_stops_on_the_daily_allowance():
    ok = (200, {}, json.dumps({"success": True, "result": {"segments": [
        {"start": 0.5, "end": 2, "text": "Good morning", "avg_logprob": -0.3, "words": [{"word": "Good", "start": 0.5, "end": 0.9}]}]}}).encode())
    tr = Transport(ok)
    c = cloudflare.Cloudflare("acct", "tok", free_quota(), transport=tr, sleep=lambda s: None)
    out = c.transcribe_piece(np.zeros(SR, dtype=np.float32), 10)
    assert "/accounts/acct/ai/run/@cf/openai/whisper-large-v3-turbo" in tr.calls[0][1]
    assert json.loads(tr.calls[0][3])["language"] == "en" and out[0]["start"] == 10.5 and out[0]["no_speech_prob"] is None
    daily = (400, {}, json.dumps({"success": False, "errors": [{"code": 3036, "message": "daily free allocation"}]}).encode())
    c = cloudflare.Cloudflare("acct", "tok", free_quota(), transport=Transport(daily), sleep=lambda s: None)
    with pytest.raises(QuotaExhausted):
        c.transcribe_piece(np.zeros(SR, dtype=np.float32), 0)


def test_credentials_come_only_from_the_credential_folder(tmp_path, monkeypatch):
    (tmp_path / "groq-key").write_text("gsk_x\n")
    (tmp_path / "cloudflare-ai").write_text("acct\ntok\n")
    monkeypatch.setenv("CREDENTIALS_DIRECTORY", str(tmp_path))
    monkeypatch.delenv("HEC_GROQ_KEY_FILE", raising=False)
    monkeypatch.delenv("HEC_CF_AI_FILE", raising=False)
    assert groq.read_key() == "gsk_x" and cloudflare.read_credentials() == ("acct", "tok")
    provs = remote.build_providers(tmp_path / "state", lambda: True, lambda s: None)
    assert [p.name for p in provs] == ["groq", "cloudflare"]
    monkeypatch.delenv("CREDENTIALS_DIRECTORY")
    assert remote.build_providers(tmp_path / "state", lambda: True, lambda s: None) == []


# ------------------------------------------------------------------ reconcile
def test_agreeing_transcripts_need_no_recheck():
    a = [seg(0, 4, "Open your books to page twelve"), seg(5, 8, "Who can read the title?")]
    b = [seg(0.1, 4.1, "open your books to page twelve."), seg(5.2, 8, "who can read the title")]
    assert reconcile.windows(a, b, 10) == [] and reconcile.agreement(a, b) == 1.0


def test_a_small_word_alone_is_not_a_disagreement_but_a_real_one_is_widened_to_whole_lines():
    a = [seg(0, 4, "I have a cat"), seg(10, 14, "She has seven brothers"), seg(14, 16, "OK")]
    b = [seg(0, 4, "I have the cat"), seg(10, 14, "She has eleven brothers"), seg(14, 16, "OK")]
    w = reconcile.windows(a, b, 20)
    assert w == [(10, 14)]


def test_speech_only_one_transcriber_heard_is_rechecked():
    a = [seg(0, 3, "Good morning class")]
    b = [seg(0, 3, "Good morning class"), seg(20, 23, "teacher can I go to the toilet")]
    assert reconcile.windows(a, b, 30) == [(19.5, 23.5)]


def test_merge_keeps_agreed_lines_and_marks_a_recheck_that_agrees_with_neither():
    a = [seg(0, 4, "I have a cat"), seg(10, 14, "She has seven brothers")]
    b = [seg(0, 4, "I have a cat"), seg(10, 14, "She has eleven brothers")]
    w = reconcile.windows(a, b, 20)
    agrees = reconcile.merge(a, w, [seg(10.1, 13.9, "She has seven brothers")], [a, b])
    assert [s["text"] for s in agrees] == ["I have a cat", "She has seven brothers"]
    assert "force_unsure" not in agrees[1] and agrees[1]["recheck"] is True
    neither = reconcile.merge(a, w, [seg(10.1, 13.9, "Shy hazel ten brothers")], [a, b])
    assert neither[1]["force_unsure"] is True
    import report
    assert report.unsure(neither[1]) and not report.unsure(agrees[1])


def test_block_cuts_fall_in_silence():
    words = [("w", t, t + 0.4) for t in np.arange(0, 600, 0.5)]
    words = [w for w in words if not 295 <= w[1] <= 305]   # a 10 s pause around the 5-minute mark
    cuts = reconcile.block_cuts(words, words, 600)
    assert len(cuts) == 1 and 295 < cuts[0] < 305


# ------------------------------------------------------------------ the lesson
class FakeProvider:
    def __init__(self, name, by_piece, fail=()):
        self.name, self.model, self.by_piece, self.fail, self.calls = name, name + "-model", by_piece, set(fail), []
        self.may_send = lambda: True

    def transcribe_piece(self, x, offset_s):
        k = int(round(offset_s / 596))
        self.calls.append(k)
        if k in self.fail:
            raise QuotaExhausted("quota_exhausted")
        return [dict(s, start=s["start"] + offset_s, end=s["end"] + offset_s) for s in self.by_piece(k)]


def test_fallback_order_both_then_one_then_local():
    audio = np.zeros(int(1500 * SR), dtype=np.float32)          # 3 pieces
    lines = lambda k: [seg(10, 14, f"piece {k} line one"), seg(20, 24, "the same words here")]
    g = FakeProvider("groq", lines, fail={2})
    c = FakeProvider("cloudflare", lines, fail={1, 2})
    asked = []

    def recheck(x, off):
        asked.append((round(off), round(len(x) / SR)))
        return [seg(off + 30, off + 33, "local words")]

    segs, st = remote.transcribe_lesson(audio, [g, c], recheck, lambda: False, RuntimeError, lambda s: None)
    assert st["pieces"] == {"both": 1, "groq": 1, "local": 1}
    assert st["providers"] == {"groq": "groq-model", "cloudflare": "cloudflare-model"}
    assert asked == [(1193, 307)]                                # only the piece nobody transcribed, whole
    texts = [s["text"] for s in segs]
    assert texts[:4] == ["piece 0 line one", "the same words here", "piece 1 line one", "the same words here"]
    assert texts[-1] == "local words"


def test_no_provider_at_all_is_the_laptop_path_and_no_transcriber_fails():
    audio = np.zeros(int(60 * SR), dtype=np.float32)
    segs, st = remote.transcribe_lesson(audio, [], lambda x, off: [seg(1, 2, "hello")], lambda: False, RuntimeError, lambda s: None)
    assert st["pieces"] == {"local": 1} and [s["text"] for s in segs] == ["hello"]
    with pytest.raises(ProviderError):
        remote.transcribe_lesson(audio, [], None, lambda: False, RuntimeError, lambda s: None)


def test_the_kill_switch_stops_between_pieces():
    audio = np.zeros(int(1300 * SR), dtype=np.float32)
    g = FakeProvider("groq", lambda k: [])
    calls = []

    class Stop(Exception):
        pass
    with pytest.raises(Stop):
        remote.transcribe_lesson(audio, [g], None, lambda: calls.append(1) or len(calls) > 1, Stop, lambda s: None)
    assert g.calls == [0]


# ------------------------------------------------------------------ through the overnight job
def test_one_lesson_through_remote_providers_saves_a_report_that_names_them(pilot_root, monkeypatch):
    api, model = FakeApi(), FakeModel()
    lines = lambda k: [seg(5, 9, "Who has an apple?"), seg(40, 44, "I have apple.")]
    g, c = FakeProvider("groq", lines), FakeProvider("cloudflare", lines)
    monkeypatch.setattr(nightly, "REMOTE", [g, c])
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert [ln["text"] for ln in body["lines"]] == ["Who has an apple?", "I have apple."]
    assert body["settings"]["engine"] == "remote-reconciled" and body["settings"]["pieces"] == {"both": 1}
    assert body["settings"]["recheck"]["model"] == "large-v3-turbo" and model.kw is None   # nothing to re-check
    assert set(body["lines"][0]) <= {"t", "e", "text", "u", "f", "who"}                    # the line format is unchanged
    assert pc.files_under(pc.audio_dir()) == []


def test_every_upload_asks_the_database_first(pilot_root, monkeypatch):
    api = FakeApi(may=["ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok",
                       "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok", "ok"])
    tr = Transport(GROQ_OK)
    g = groq.Groq("k", free_quota(), transport=tr, sleep=lambda s: None)
    monkeypatch.setattr(nightly, "REMOTE", [g])

    nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False)
    assert len(tr.calls) == 1 and api.may_calls >= 2


# ------------------------------------------------------------------ the class report request
class ReportApi:
    def __init__(self, statuses):
        self.statuses, self.calls = list(statuses), 0

    def function(self, name, args):
        self.calls += 1
        st = self.statuses.pop(0)
        if st is not None:
            raise ApiError(st, "x")
        return {"status": "building"}


def test_the_class_report_request_retries_blips_but_not_refusals():
    slept = []
    api = ReportApi([0, 503, None])
    assert nightly.request_lesson_report(api, {"recording_id": "r", "session_id": "s"}, sleep=slept.append) == "requested"
    assert api.calls == 3 and slept == [30, 120]
    api = ReportApi([409])
    assert nightly.request_lesson_report(api, {"recording_id": "r", "session_id": "s"}, sleep=slept.append) == "refused_409"
    assert api.calls == 1
    api = ReportApi([502, 502, 502, 502])
    assert nightly.request_lesson_report(api, {"recording_id": "r", "session_id": "s"}, sleep=lambda s: None) == "failed"


def test_uploading_a_draft_asks_for_its_class_report(pilot_root, monkeypatch):
    asked = []
    monkeypatch.setattr(nightly, "request_lesson_report", lambda api, row, **kw: asked.append(row["session_id"]))
    nightly.write_draft(ROW, {"schema": "x", "lines": []}, 90, 10, html_copy=False)
    assert nightly.upload_drafts(FakeApi()) == {"saved": 1, "kept": 0, "deleted": 0} and asked == ["s1"]


# ------------------------------------------------------------------ sealing on the server
def test_linux_seal_round_trip_and_refusals(tmp_path, monkeypatch):
    pytest.importorskip("cryptography")
    import seal
    k = tmp_path / "seal-key"
    k.write_bytes(os.urandom(32))
    if os.name == "posix":
        k.chmod(0o600)
    monkeypatch.setenv("HEC_SEAL_KEY_FILE", str(k))
    a, b = seal.KeySeal("hec-pilot-session"), seal.KeySeal("hec-voiceprint")
    sealed = a.protect(b"refresh-token")
    assert b"refresh-token" not in sealed and a.unprotect(sealed) == b"refresh-token"
    with pytest.raises(OSError):
        b.unprotect(sealed)                           # one use's file is not another's
    with pytest.raises(OSError):
        seal.KeySeal("hec-pilot-session", os.urandom(32)).unprotect(sealed)
    k.write_bytes(b"short")
    with pytest.raises(RuntimeError):
        seal.KeySeal("x")
    if os.name == "posix":
        k.write_bytes(os.urandom(32))
        k.chmod(0o644)
        with pytest.raises(RuntimeError):
            seal.KeySeal("x")
