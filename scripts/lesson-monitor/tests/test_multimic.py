"""multimic.py and the nightly hooks: one synthetic lesson with the teacher's lapel, the room mic and four Lark mics on
their own clocks, through process_one end to end against a FAKE database and transcriber. Each "child" has a voice in
its own frequency band so a FAKE embedder (band energies) can tell them apart. No real audio, no model, no network."""
from __future__ import annotations

import hashlib
import io
from datetime import datetime, timezone
from types import SimpleNamespace

import numpy as np
import pytest

import align
import attribute
import multimic
import nightly
import pilot_common as pc
import voiceprints
from lark_room import SR, classroom
from lark_synth import on_mic_clock, place, three_claps, voice
from test_nightly_fake import CLASS, REC, STEP0, FakeApi
from test_voice import XorCodec

KA, KB, KC = ("aaaaaaaa-0000-4000-8000-00000000000a", "bbbbbbbb-0000-4000-8000-00000000000b",
              "cccccccc-0000-4000-8000-00000000000c")
BANDS = {KA: (300.0, 900.0), KB: (1500.0, 2400.0), KC: (2600.0, 3500.0)}
REC_S = 400                       # the recorder's timeline; the lesson is 20..380
TEACH = [(22, 40), (100, 140), (250, 300)]
KIDS = {KA: ("mic1", [(45, 60), (160, 175)], 11), KB: ("mic3", [(65, 80), (180, 200), (310, 330)], 12),
        KC: ("mic4", [(118, 134)], 13)}            # KC talks over the teacher
CLOCKS = {"mic1": (7.5, 40.0), "mic2": (31.0, -25.0), "mic3": (3.25, 80.0), "mic4": (12.0, 0.0)}
ROW = {"recording_id": REC, "class_id": CLASS, "session_id": "s1", "session_date": "2026-11-28",
       "started_at": "2026-11-28T10:29:40Z", "pre_start_ms": 0,
       "scheduled_start": "2026-11-28T10:30:00Z", "scheduled_end": "2026-11-28T10:36:00Z",
       "delete_after": "2026-12-28T10:00:00Z", "consent_ok": True, "pilot_teacher_taught": True}


@pytest.fixture(autouse=True)
def codec(monkeypatch):
    monkeypatch.setattr(voiceprints, "CODEC", XorCodec())


class BandEmbedder:
    """Fake speaker model: energy in 8 bands of 300-3500 Hz, unit length."""
    edges = np.linspace(300, 3500, 9)

    def embed(self, x):
        x = np.asarray(x, dtype=np.float64)
        f = np.fft.rfftfreq(len(x), 1 / SR)
        p = np.abs(np.fft.rfft(x)) ** 2
        v = np.array([p[(f >= a) & (f < b)].sum() for a, b in zip(self.edges, self.edges[1:])])
        v = np.sqrt(v)
        return v / (np.linalg.norm(v) or 1)


def flac_chunks(x: np.ndarray, track: str, chunk_s: int = 120):
    import soundfile as sf
    out = []
    for seq, a in enumerate(range(0, len(x), chunk_s * SR)):
        buf = io.BytesIO()
        sf.write(buf, np.clip(x[a: a + chunk_s * SR], -1, 1), SR, format="FLAC", subtype="PCM_16")
        out.append((track, seq, a * 1000 // SR, buf.getvalue()))
    return out


def lesson_audio():
    tracks, _ = classroom(REC_S, TEACH, KIDS, bands=BANDS)
    for t in tracks.values():
        for at in (25.0, 372.0):
            three_claps(t, at, SR, gain=1.0)
    files = {"teacher": tracks["teacher"], "room": tracks["room"]}
    for m, (off, ppm) in CLOCKS.items():
        files[m] = on_mic_clock(tracks[m], SR, off, ppm, REC_S + off + 5)
    return files


class LarkApi(FakeApi):
    def __init__(self, in_progress=False, mic_tracks=True, board=True, **kw):
        super().__init__(**kw)
        self.in_progress, self.voice_groups = in_progress, None
        self.objects, self.chunks = {}, []
        files = lesson_audio()
        for track, x in files.items():
            if not mic_tracks and track.startswith("mic"):
                continue
            for tr, seq, t_ms, data in flac_chunks(x, track):
                path = f"{CLASS}/{REC}/{tr}/{seq:06d}.flac"
                self.objects[path] = data
                self.chunks.append({"track": tr, "seq": seq, "storage_path": path, "byte_size": len(data),
                                    "sha256": hashlib.sha256(data).hexdigest(), "t_start_ms": t_ms,
                                    "t_end_ms": t_ms + 120000, "confirmed_at": "2026-11-28T12:00:00Z"})
        self.mic_tracks = mic_tracks
        self.board = [{"student_id": KA, "mic": "mic1", "at": "2026-11-28T10:25:00Z"},
                      {"student_id": KB, "mic": "mic2", "at": "2026-11-28T10:25:00Z"},  # wrong: KB sits at mic 3
                      {"student_id": KC, "mic": "mic4", "at": "2026-11-28T10:25:00Z"}] if board else []

    def rpc(self, fn, args=None):
        if fn == "recorder_mic_import_in_progress":
            self.calls.append(fn)
            return self.in_progress
        if fn == "lesson_monitor_mic_map":
            self.calls.append(fn)
            return self.board
        if fn == "lesson_monitor_save_voice_groups":
            self.calls.append(fn)
            self.voice_groups = args["p_groups"]
            return None
        return super().rpc(fn, args)

    def select(self, table, query):
        if table == "class_recording_tracks":
            self.calls.append(table)
            return [{"track": m, "import_state": "complete", "source": {"recorded_start": None}}
                    for m in multimic.MICS] if self.mic_tracks else []
        if table == "enrollments":
            return [{"student_id": k} for k in (KA, KB, KC)]
        if table == "lesson_speaker_marks":  # the teacher taps KB at 179 s: 20 s of talk, too little to offer
            return [{"kind": "student", "student_ids": [KB], "offset_ms": 179000}]
        return super().select(table, query)


class LineModel:
    """Stands in for faster-whisper: lines at known lesson times (the composite starts at lesson second 0)."""
    LINES = [(5, 15, "Good morning, open your books."), (26, 38, "I like apples very much."),
             (46, 58, "My brother has a red bike."), (100, 112, "Can I go to the toilet?"),
             (291, 308, "We went to the zoo yesterday.")]

    def transcribe(self, audio, **kw):
        self.seconds = len(audio) / SR

        def gen():
            for a, b, text in self.LINES:
                yield SimpleNamespace(start=a, end=b, text=text, avg_logprob=-0.3, no_speech_prob=0.05,
                                      compression_ratio=1.2, words=[])
        return gen(), SimpleNamespace(language="en")


def teach_voiceprints():
    emb = BandEmbedder()
    for i, k in enumerate((KA, KB, KC)):
        for j in range(3):
            v = emb.embed(voice(12, SR, 50 + 3 * i + j, band=BANDS[k]))
            voiceprints.add(k, [(v, 12.0)], "answer", f"old-{j}", f"G{j}", "ecapa")


@pytest.fixture
def lark_on(monkeypatch):
    import segments
    monkeypatch.setattr(segments, "silero_path", lambda: None)  # Silero rightly hears no speech in synthetic noise
    monkeypatch.setitem(align.SETTINGS, "hop_s", 30.0)
    import voice
    monkeypatch.setitem(attribute.SETTINGS, "blind_fraction", 0.0)  # no group held back on purpose in this test
    monkeypatch.setattr(nightly, "VOICE", {"allowed": {KA, KB, KC}, "embedder": BandEmbedder()})
    monkeypatch.setattr(nightly, "REMOTE", None)
    teach_voiceprints()


def test_one_lark_lesson_end_to_end(pilot_root, lark_on):
    api, model = LarkApi(), LineModel()
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "saved"
    assert abs(model.seconds - 360.0) < 0.1                        # the composite is the lesson's length
    body = api.saved[0]["p_body"]
    mics = body["mics"]
    assert mics["teacher_worn"] is True and mics["tracks"] == ["mic1", "mic2", "mic3", "mic4"], mics["alignment"]
    for m, (off, ppm) in CLOCKS.items():
        t = mics["alignment"]["tracks"][m]
        assert t["ok"] and abs(t["drift_ppm"] - ppm) < 5, (m, t)
        assert abs(t["offset_s"] - (off + (1 + ppm * 1e-6) * 20.0)) < 0.003, (m, t)  # lesson second 0 = recording 20 s
    lines = body["lines"]
    assert lines[0]["who"] == "T" and lines[0]["src"] == "teacher", (lines[0], body["mics"]["settings"]["bleed_db"], body["mics"]["speaking"])
    assert lines[1]["src"] == "mic1" and lines[1]["who"] is None
    assert lines[2]["src"] == "mic3"
    assert lines[3]["src"] == "mic4"                               # a child over the teacher is heard on its own mic
    groups = {g["key"]: g for g in body["voice"]["groups"]}
    assert groups[lines[1]["g"]]["suggested"] == KA, (groups, sp_dbg(api))
    assert groups[lines[2]["g"]]["suggested"] == KB
    sp = mics["speaking"]
    assert sp["children_s"][KA] > 12 and sp["children_s"][KB] > 20 and sp["teacher_s"] > 40
    assert [(x["suggested"], x["mic"], x["board_mic"]) for x in mics["map_suggestions"]] == [(KB, "mic3", "mic2")]
    assert body["talk_time"]["source"] == "segments"
    assert mics["enrol"]["turns"] == 1 and mics["enrol"]["groups"] == []
    assert [(x["child"], x["reason"]) for x in mics["enrol"]["refused"]] == [(KB, "too_little_speech")]
    assert body["lesson"]["transcribed_track"] == "composite"
    assert api.voice_groups and {g["suggested"] for g in api.voice_groups} >= {KA, KB}
    assert pc.files_under(pc.audio_dir()) == []                    # every copy, aligned and composite too, is gone
    import json
    assert "student_id" not in json.dumps(body)                    # the database's "names nobody" rule


def sp_dbg(api):
    return api.saved[0]["p_body"]["mics"]["speaking"]


def test_no_mic_tracks_runs_the_old_way(pilot_root, lark_on):
    api = LarkApi(mic_tracks=False)
    assert nightly.process_one(api, ROW, LineModel(), STEP0, keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert "mics" not in body and "lark" not in body["settings"]
    assert "class_recording_tracks" not in api.calls and "lesson_monitor_mic_map" not in api.calls


def test_database_without_the_mics_part_saves_without_it(pilot_root, lark_on):
    class Old(LarkApi):
        def rpc(self, fn, args=None):
            if fn == "lesson_monitor_save_report" and "mics" in args["p_body"]:
                from supa import ApiError
                raise ApiError(400, "The report carries an unknown part: mics")
            return super().rpc(fn, args)
    api = Old()
    assert nightly.process_one(api, ROW, LineModel(), STEP0, keep_local=False) == "saved"
    body = api.saved[0]["p_body"]
    assert "mics" not in body and all("src" not in ln for ln in body["lines"])


def test_stop_during_alignment_deletes_everything(pilot_root, lark_on, monkeypatch):
    api = LarkApi()
    n = {"k": 0}

    def stop_after():
        n["k"] += 1
        return n["k"] > 40
    monkeypatch.setattr(pc.Guard, "should_stop", lambda self: stop_after())
    assert nightly.process_one(api, ROW, LineModel(), STEP0, keep_local=False) == "stopped"
    assert pc.files_under(pc.audio_dir()) == [] and not api.saved


# ------------------------------------------------------------------ waiting for the import
class WaitApi:
    def __init__(self, in_progress=False, board=(), tracks=()):
        self.ip, self.board, self.tracks, self.calls = in_progress, list(board), list(tracks), []

    def rpc(self, fn, args=None):
        self.calls.append(fn)
        return {"recorder_mic_import_in_progress": self.ip, "lesson_monitor_mic_map": self.board}[fn]

    def select(self, table, q):
        self.calls.append(table)
        return [{"track": t, "import_state": "complete"} for t in self.tracks]


NOW = datetime(2026, 11, 28, 11, 0, tzinfo=timezone.utc)


def test_wait_while_the_import_runs():
    assert multimic.should_wait(WaitApi(in_progress=True), ROW, NOW) == "lark_import_in_progress"


def test_wait_for_an_import_the_board_says_is_coming():
    seat = [{"student_id": KA, "mic": "mic1", "at": "2026-11-28T10:25:00Z"}]
    assert multimic.should_wait(WaitApi(board=seat), ROW, NOW) == "lark_import_expected"
    assert multimic.should_wait(WaitApi(board=seat), ROW, datetime(2026, 11, 28, 17, 0, tzinfo=timezone.utc)) is None
    assert multimic.should_wait(WaitApi(board=seat, tracks=["mic1"]), ROW, NOW) is None


def test_no_board_no_import_no_wait():
    assert multimic.should_wait(WaitApi(), ROW, NOW) is None


def test_waiting_lesson_is_not_downloaded_or_recorded(pilot_root, monkeypatch):
    api = LarkApi(in_progress=True)
    monkeypatch.setattr(nightly, "_SEEN", set())
    a = SimpleNamespace(watch=True, list=False, no_upload=False, max_lessons=3, until="07:00", class_ids=None, day=None)
    api_rpc = api.rpc

    def rpc(fn, args=None):
        if fn == "lesson_monitor_pending":
            return [ROW]
        return api_rpc(fn, args)
    api.rpc = rpc
    import progress
    import transcribe
    nightly._run_batch(api, a, STEP0, object(), progress, transcribe)
    assert "lesson_monitor_begin" not in api.calls and "download" not in api.calls and not api.runs
    assert REC not in nightly._SEEN                                # looked at again at the next poll


def test_waiting_check_never_breaks_on_an_old_database():
    class Old:
        def rpc(self, fn, args=None):
            raise AssertionError(fn)
    assert nightly.lark_waiting(Old(), ROW) is None


# ------------------------------------------------------------------ pieces
def test_mic_chunk_lists_problems():
    by = {"mic1": [{"seq": 0, "confirmed_at": "x"}, {"seq": 1, "confirmed_at": "x"}],
          "mic2": [{"seq": 0, "confirmed_at": "x"}, {"seq": 2, "confirmed_at": "x"}],
          "mic3": [{"seq": 0, "confirmed_at": None}]}
    lists, problems = multimic.mic_chunk_lists(by, ["mic1", "mic2", "mic3", "mic4"])
    assert list(lists) == ["mic1"] and problems == ["seq_gap_mic2", "unconfirmed_mic3", "missing_track_mic4"]


def test_meta_offsets_from_recorded_start():
    class Api:
        def select(self, table, q):
            return [{"track": "mic1", "source": {"recorded_start": "2026-11-28T17:29:50.000"}},  # Hanoi = 10:29:50Z
                    {"track": "mic2", "source": {"recorded_start": "17:30:30.500"}}, {"track": "mic3", "source": None}]
    off = multimic.meta_offsets(Api(), REC, ROW, (20.0, 380.0))
    # lesson second 0 is 10:30:00Z; mic1 started 10 s before, mic2 30.5 s after
    assert off == {"mic1": pytest.approx(10.0), "mic2": pytest.approx(-30.5)}


def test_composite_switches_with_crossfades():
    n = 10 * SR
    tracks = {"room": np.full(n, 0.1, np.float32), "teacher": np.full(n, 0.2, np.float32), "mic2": np.full(n, 0.5, np.float32)}
    src = np.zeros(n // 512, dtype=np.int8)
    src[: len(src) // 2] = multimic.SOURCES.index("teacher")
    src[len(src) // 2:] = multimic.SOURCES.index("mic2")
    y = multimic.composite(tracks, src)
    assert y[SR] == pytest.approx(0.2) and y[9 * SR] == pytest.approx(0.5)
    mid = (len(src) // 2) * 512
    assert 0.2 < y[mid] < 0.5                                    # a crossfade, not a jump
    assert np.all(np.abs(np.diff(y[mid - 400: mid + 400])) < 0.01)


def test_seats_in_lesson_seconds():
    s = multimic.seats_in_lesson([{"student_id": KA, "mic": 2, "at": "2026-11-28T10:31:00Z"}], ROW, (20.0, 380.0))
    assert s.mic_of(KA, 59) is None and s.mic_of(KA, 61) == "mic2"   # 10:31:00 is lesson second 60
