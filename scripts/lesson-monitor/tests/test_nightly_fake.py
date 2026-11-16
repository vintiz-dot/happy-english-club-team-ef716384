"""One lesson through the overnight job end to end, against a FAKE database/storage and a
FAKE transcriber: synthetic tones as the two tracks, made-up lines as the transcript.
No real lesson, no network, no model."""
from __future__ import annotations

import hashlib
import io
from types import SimpleNamespace

import numpy as np
import pytest

import nightly
import pilot_common as pc
from supa import ApiError

REC = "11111111-2222-4333-8444-555555555555"
CLASS = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"


def flac(seconds: float, amp: float, odd: bool, sr: int = 48000) -> bytes:
    """A tone that is loud in alternate 10-second blocks (teacher on even blocks, room on odd), quiet otherwise."""
    import soundfile as sf
    t = np.arange(int(seconds * sr)) / sr
    env = np.where(((t // 10).astype(int) % 2 == 1) == odd, 1.0, 0.01)
    buf = io.BytesIO()
    sf.write(buf, (amp * env * np.sin(2 * np.pi * 220 * t)).astype(np.float32), sr, format="FLAC")
    return buf.getvalue()


class FakeApi:
    def __init__(self, begin=None, corrupt=False, save_status=None):
        self.calls, self.saved, self.runs = [], [], []
        self.objects, self.chunks = {}, []
        for track, amp in (("teacher", 0.3), ("room", 0.1)):
            for seq in range(4):           # 4 x 30 s = 2 minutes
                data = flac(30, amp, odd=(track == "room"))
                path = f"{CLASS}/{REC}/{track}/{seq:06d}.flac"
                self.objects[path] = data
                self.chunks.append({"track": track, "seq": seq, "storage_path": path, "byte_size": len(data),
                                    "sha256": hashlib.sha256(data).hexdigest(), "t_start_ms": seq * 30000,
                                    "t_end_ms": (seq + 1) * 30000, "confirmed_at": "2026-11-19T12:00:00Z"})
        if corrupt:
            self.objects[self.chunks[5]["storage_path"]] = b"not the bytes that were registered"
        self.begin = begin or {"ok": True}
        self.save_status = save_status

    def rpc(self, fn, args=None):
        self.calls.append(fn)
        if fn == "lesson_monitor_begin":
            return self.begin
        if fn == "lesson_monitor_record_run":
            self.runs.append((args["p_outcome"], args["p_reason"]))
            return None
        if fn == "lesson_monitor_save_report":
            if self.save_status:
                raise ApiError(self.save_status, "refused")
            self.saved.append(args)
            return "report-id"
        raise AssertionError(fn)

    def select(self, table, query):
        self.calls.append(table)
        if table == "class_recording_chunks":
            return list(self.chunks)
        if table == "class_recording_markers":
            return [{"kind": "gap", "t_ms": 70000}]
        if table == "lesson_monitor_targets":
            return [{"words": ["apple", "banana"], "structures": []}]
        return []

    def download(self, path):
        self.calls.append("download")
        return self.objects[path]


class FakeModel:
    """Stands in for faster-whisper: checks it got the B2b settings, returns two made-up lines."""

    def __init__(self, on_segment=None):
        self.kw, self.on_segment = None, on_segment

    def transcribe(self, audio, **kw):
        self.kw = kw
        import soundfile as sf
        info = sf.info(audio)
        assert info.samplerate == 16000
        self.seconds = info.duration

        def gen():
            for i, (a, b, text) in enumerate([(5, 9, "Who has an apple?"), (40, 44, "I have apple.")]):
                if self.on_segment:
                    self.on_segment(i)
                yield SimpleNamespace(start=a, end=b, text=text, avg_logprob=-0.3, no_speech_prob=0.05, compression_ratio=1.2,
                                      words=[SimpleNamespace(word=w, start=a, end=b, probability=0.9) for w in text.split()])
        return gen(), SimpleNamespace(language="en")


ROW = {"recording_id": REC, "class_id": CLASS, "session_id": "s1", "session_date": "2026-11-19",
       "started_at": "2026-11-19T10:29:40Z", "pre_start_ms": 0,
       "scheduled_start": "2026-11-19T10:30:00Z", "scheduled_end": "2026-11-19T10:31:30Z",
       "delete_after": "2026-12-19T10:00:00Z", "consent_ok": True, "pilot_teacher_taught": True}
STEP0 = {"words_pass": True, "grammar_pass": True, "talk_pass": True}


def test_one_lesson_end_to_end(pilot_root):
    api, model = FakeApi(), FakeModel()
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "saved"
    assert model.kw["beam_size"] == 1 and model.kw["language"] == "en" and model.kw["vad_parameters"] == {"threshold": 0.25}
    assert model.kw["condition_on_previous_text"] is False and model.kw["vad_filter"] is True
    assert abs(model.seconds - 90.0) < 0.1                         # the scheduled 90 s, cut out of 120 s
    assert api.calls.index("lesson_monitor_begin") < api.calls.index("download")
    body = api.saved[0]["p_body"]
    assert [ln["text"] for ln in body["lines"]] == ["Who has an apple?", "I have apple."]
    assert body["lesson"]["offset_s"] == 20.0
    assert body["targets"]["source"] == "teacher"
    assert {w["word"]: w["heard"] for w in body["targets"]["words"]} == {"apple": True, "banana": False}
    assert any(f["kind"] == "recorder_gap" for f in body["flags"])
    assert "talk_time" in body
    assert pc.files_under(pc.audio_dir()) == []                    # the audio copy is gone


def test_consent_refusal_is_recorded_and_nothing_downloads(pilot_root):
    api = FakeApi(begin={"ok": False, "reason": "consent_missing"})
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "consent_missing"
    assert api.runs == [("refused", "consent_missing")] and "download" not in api.calls


def test_a_chunk_that_does_not_match_its_hash_fails_the_lesson_and_deletes_the_audio(pilot_root):
    api = FakeApi(corrupt=True)
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "failed"
    assert api.runs == [("failed", "chunk_hash_mismatch")] and api.saved == []
    assert pc.files_under(pc.audio_dir()) == []


def test_the_kill_switch_mid_transcript_stops_and_deletes_the_audio(pilot_root):
    import stop
    api = FakeApi()
    model = FakeModel(on_segment=lambda i: stop.switch_on_local("test") if i == 0 else None)
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "stopped"
    assert api.saved == [] and pc.files_under(pc.audio_dir()) == []


def test_an_expired_session_keeps_a_local_draft_and_upload_later_sends_it(pilot_root):
    api = FakeApi(save_status=401)
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "draft"
    assert [p.name for p in pc.files_under(pc.drafts_dir())] == [f"{REC}.json"]
    ok = FakeApi()
    assert nightly.upload_drafts(ok) == {"saved": 1, "kept": 0, "deleted": 0}
    assert pc.files_under(pc.drafts_dir()) == [] and ok.saved[0]["p_recording"] == REC


def test_a_draft_the_database_refuses_for_good_is_deleted(pilot_root):
    nightly.process_one(FakeApi(save_status=401), ROW, FakeModel(), STEP0, keep_local=False)
    assert nightly.upload_drafts(FakeApi(save_status=400)) == {"saved": 0, "kept": 0, "deleted": 1}
    assert pc.files_under(pc.drafts_dir()) == []


def test_no_upload_keeps_the_report_on_this_laptop_only(pilot_root):
    api = FakeApi()
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=True) == "kept_local"
    assert api.saved == [] and sorted(p.suffix for p in pc.files_under(pc.drafts_dir())) == [".html", ".json"]


@pytest.mark.parametrize("talk", [False])
def test_without_step0_talk_pass_no_talk_time_leaves_the_laptop(pilot_root, talk):
    api = FakeApi()
    nightly.process_one(api, ROW, FakeModel(), dict(STEP0, talk_pass=talk), keep_local=False)
    body = api.saved[0]["p_body"]
    assert "talk_time" not in body and all("who" not in ln for ln in body["lines"])
