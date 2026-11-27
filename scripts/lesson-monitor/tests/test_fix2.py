"""Fix round 1 (REVIEW-pilot M-2b, M-3, N-4): a withdrawal or a switch-off reaches a job that is already
running, local drafts follow the database, the kill switch wipes the laptop, delete_pilot cleans the
laptop even when the app call fails, and step 0 obeys the same rules. Fake database, fake clock, fake
model, synthetic tones: no real lesson, no network."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

import delete_pilot
import nightly
import pilot_common as pc
import step0
import stop
import supa
from supa import ApiError
from test_nightly_fake import CLASS, REC, ROW, STEP0, FakeApi, FakeModel

OTHER = "99999999-2222-4333-8444-555555555555"


class Clock:
    """A clock that moves `step` seconds every time it is read."""

    def __init__(self, step: float):
        self.t, self.step = 0.0, step

    def __call__(self) -> float:
        self.t += self.step
        return self.t


@pytest.fixture
def ask_every_time(monkeypatch):
    """The Guard asks the database at every check (the real one waits 15 s) and uses a clock that jumps 60 s a read."""
    real = pc.Guard
    monkeypatch.setattr(pc, "Guard", lambda api, rid: real(api, rid, every=0, grace=120.0, clock=Clock(60.0)))


def touch(p: Path, data: bytes = b"x") -> Path:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return p


# ------------------------------------------------------------------ withdrawal reaches a running job
def test_a_withdrawal_in_the_middle_stops_the_job_and_deletes_audio_and_draft(pilot_root, ask_every_time):
    touch(pilot_root / "drafts" / f"{REC}.json", b"{}")
    api = FakeApi(may=["ok", "ok", "consent_missing"])
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "stopped"
    assert api.saved == [] and "lesson_monitor_save_report" not in api.calls
    assert api.calls.count("download") == 2                        # it did not carry on downloading
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []


def test_a_switch_off_while_transcribing_stops_before_anything_is_kept(pilot_root, ask_every_time):
    api = FakeApi()
    model = FakeModel(on_segment=lambda i: setattr(api, "may", ["class_off"]) if i == 0 else None)
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=True) == "stopped"
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []


def test_a_withdrawal_after_transcribing_drops_the_report_in_both_modes(pilot_root):
    # Real Guard (15 s throttle): only the forced last look can see this one.
    for keep_local in (False, True):
        api = FakeApi()
        model = FakeModel(on_segment=lambda i, api=api: setattr(api, "may", ["consent_missing"]) if i == 1 else None)
        out = nightly.process_one(api, ROW, model, STEP0, keep_local=keep_local)
        assert out == "stopped" and api.saved == []
        assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []


# ------------------------------------------------------------------ an unreachable database is not a yes
def test_an_unreachable_database_stops_and_wipes_after_the_grace(pilot_root, ask_every_time):
    api = FakeApi(may=[0])                                         # offline from the first question
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "stopped"
    assert api.saved == [] and pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []
    assert api.calls.count("download") <= 2                        # 60 s of silence is inside the grace, 180 s is not


def test_a_short_blip_inside_the_grace_does_not_stop_the_job(pilot_root, ask_every_time):
    api = FakeApi(may=[0, "ok"])
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "saved"


def test_an_expired_token_counts_as_unreachable(pilot_root, ask_every_time):
    api = FakeApi(may=[401])
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "stopped"


class SleepClock:
    """A clock that only moves when the code sleeps: the last look's retries, without waiting."""

    def __init__(self):
        self.t, self.slept = 0.0, []

    def __call__(self) -> float:
        return self.t

    def sleep(self, s: float) -> None:
        self.slept.append(s)
        self.t += s


def answer(api, seq):
    api.may, api.may_calls = list(seq), 0             # from now on, these answers in order


@pytest.fixture
def last_look_clock(monkeypatch):
    real, c = pc.Guard, SleepClock()
    monkeypatch.setattr(pc, "Guard", lambda api, rid: real(api, rid, clock=c, sleep=c.sleep))
    return c


@pytest.mark.parametrize("keep_local", [False, True])
def test_nothing_is_kept_or_saved_when_the_last_look_cannot_reach_the_database(pilot_root, keep_local, last_look_clock):
    api = FakeApi()
    model = FakeModel(on_segment=lambda i: setattr(api, "may", [0]) if i == 1 else None)
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=keep_local) == "stopped"
    assert api.saved == [] and pc.files_under(pc.drafts_dir()) == [] and pc.files_under(pc.audio_dir()) == []
    assert sum(last_look_clock.slept) >= 900                      # it asked again for the whole grace first


def test_a_wifi_drop_at_the_last_look_waits_and_then_saves(pilot_root, last_look_clock):
    # 27 Nov 2026: Jupiter's report was built, then dropped because Wi-Fi was down for 2 minutes at the last look.
    api = FakeApi()
    model = FakeModel(on_segment=lambda i: answer(api, [0, 0, 0, 0, "ok"]) if i == 1 else None)
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "saved"
    assert len(api.saved) == 1 and 0 < sum(last_look_clock.slept) < 900


def test_a_withdrawal_answered_after_a_drop_still_drops_the_report(pilot_root, last_look_clock):
    api = FakeApi()
    model = FakeModel(on_segment=lambda i: answer(api, [0, 0, "consent_missing"]) if i == 1 else None)
    assert nightly.process_one(api, ROW, model, STEP0, keep_local=False) == "stopped"
    assert api.saved == [] and pc.files_under(pc.drafts_dir()) == []


def test_no_upload_keeps_a_report_only_when_the_database_says_ok(pilot_root):
    api = FakeApi(may=["ok"])
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=True) == "kept_local"
    assert "lesson_monitor_may_continue" in api.calls


def test_guard_unit_throttles_and_reports_the_reason(pilot_root):
    api = FakeApi(may=["ok", "class_off"])
    clock = Clock(1.0)
    g = pc.Guard(api, REC, every=15.0, grace=120.0, clock=clock)
    assert not g.should_stop() and not g.should_stop() and api.may_calls == 1     # asked once inside 15 s
    assert g.verdict(force=True) == "class_off" and g.should_stop() and g.reason() == "class_off"
    stop.switch_on_local("t")
    assert g.verdict() == "stopped" and g.reason() == "stopped"


# ------------------------------------------------------------------ local drafts follow the database
def test_drafts_the_database_no_longer_allows_are_deleted_at_start(pilot_root):
    for rid in (REC, OTHER):
        touch(pilot_root / "drafts" / f"{rid}.json", b"{}")
        touch(pilot_root / "drafts" / f"{rid}.html")
    api = FakeApi(keep={REC: True, OTHER: False})
    assert nightly.purge_local_drafts(api) == 1
    assert sorted(p.name for p in pc.files_under(pc.drafts_dir())) == [f"{REC}.html", f"{REC}.json"]


def test_a_draft_that_cannot_be_checked_stays_and_is_said_so(pilot_root):
    touch(pilot_root / "drafts" / f"{REC}.json", b"{}")
    assert nightly.purge_local_drafts(FakeApi(keep_status=0)) == 0
    assert (pilot_root / "drafts" / f"{REC}.json").exists()


def test_a_draft_the_database_does_not_know_is_deleted(pilot_root):
    touch(pilot_root / "drafts" / f"{REC}.json", b"{}")
    assert nightly.purge_local_drafts(FakeApi(keep={})) == 1


# ------------------------------------------------------------------ the kill switch wipes this laptop
def test_stop_on_wipes_audio_and_drafts_and_leaves_the_switch_on(pilot_root, capsys):
    touch(pilot_root / "audio" / REC / "room16k.wav")
    touch(pilot_root / "drafts" / f"{REC}.json")
    touch(pilot_root / "drafts" / f"{REC}.html")
    touch(pilot_root / "step0" / "result.json")
    assert stop.main(["on", "--reason", "test"]) == 0
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []
    assert pc.stopped() and (pilot_root / "step0" / "result.json").exists()
    assert "deleted 1 audio files and 2 local draft files" in capsys.readouterr().out


def test_nightly_with_the_switch_on_wipes_instead_of_running(pilot_root, capsys):
    touch(pilot_root / "audio" / REC / "room16k.wav")
    touch(pilot_root / "drafts" / f"{REC}.json")
    stop.switch_on_local("t")
    assert nightly.main([]) == 0
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []


# ------------------------------------------------------------------ delete_pilot (N-4)
def _fill(pilot_root):
    for f in ["audio/r/room/000000.flac", "drafts/r.json", "drafts/r.html", "step0/20261120-1900/sample_listen.wav", "logs/x.log"]:
        touch(pilot_root / f)


def test_delete_pilot_cleans_the_laptop_when_sign_in_fails(pilot_root, monkeypatch, capsys):
    _fill(pilot_root)

    def bad(_tok=False):
        sys.exit("sign-in failed (HTTP 400): check the email and password")
    monkeypatch.setattr(supa, "open_api", bad)
    assert delete_pilot.main(["--yes"]) == 2
    out = capsys.readouterr().out
    assert "app: NOT DONE" in out and "sign-in failed" in out
    assert [p.name for p in pc.files_under(pilot_root)] == ["STOP"]


def test_delete_pilot_cleans_the_laptop_when_the_app_call_is_refused(pilot_root, monkeypatch, capsys):
    _fill(pilot_root)

    class Refusing:
        def rpc(self, fn, args=None):
            raise ApiError(403, "Only an admin may do this")
    monkeypatch.setattr(supa, "open_api", lambda tok=False: Refusing())
    assert delete_pilot.main(["--yes"]) == 2
    assert "app: NOT DONE" in capsys.readouterr().out
    assert [p.name for p in pc.files_under(pilot_root)] == ["STOP"]


def test_delete_pilot_reports_success_normally(pilot_root, monkeypatch, capsys):
    _fill(pilot_root)

    class Fine:
        def rpc(self, fn, args=None):
            return {"reports": 1, "left": 0}
    monkeypatch.setattr(supa, "open_api", lambda tok=False: Fine())
    assert delete_pilot.main(["--yes"]) == 0
    assert "app: NOT DONE" not in capsys.readouterr().out


# ------------------------------------------------------------------ step 0 (M-3)
class Boom:
    def transcribe(self, audio, **kw):
        raise RuntimeError("the transcriber broke")


def test_step0_make_deletes_its_audio_and_outputs_on_any_error(pilot_root):
    folder = pilot_root / "step0" / "20261120-1900"
    x = np.zeros(16000 * 3, dtype=np.float32)
    with pytest.raises(RuntimeError):
        step0.make(x, x, 16000, folder, model=Boom())
    assert not folder.exists()


def test_step0_make_does_not_start_while_the_kill_switch_is_on(pilot_root):
    stop.switch_on_local("t")
    with pytest.raises(SystemExit) as e:
        step0.main(["make", "--teacher", "a.wav", "--room", "b.wav"])
    assert "kill switch" in str(e.value)
    assert not (pilot_root / "step0").exists() or pc.files_under(pilot_root / "step0") == []


class Step0Api(FakeApi):
    def select(self, table, query):
        if table == "class_recordings":
            return [ROW]
        return super().select(table, query)


def test_step0_recording_goes_through_begin_before_any_download(pilot_root, monkeypatch):
    api = Step0Api()
    monkeypatch.setattr(supa, "open_api", lambda *a, **k: api)
    teacher, room = step0.load_recording(REC, 10, 20)
    assert api.calls.index("lesson_monitor_begin") < api.calls.index("download")
    assert len(teacher) == len(room) and len(teacher) > 0


def test_step0_recording_refused_by_the_database_downloads_nothing(pilot_root, monkeypatch):
    api = Step0Api(begin={"ok": False, "reason": "consent_missing"})
    monkeypatch.setattr(supa, "open_api", lambda *a, **k: api)
    with pytest.raises(SystemExit) as e:
        step0.load_recording(REC, 10, 20)
    assert "consent_missing" in str(e.value) and "download" not in api.calls


def test_step0_make_stops_between_chunks_when_the_kill_switch_appears(pilot_root, monkeypatch):
    api = Step0Api()
    real = api.download

    def download(path):
        stop.switch_on_local("t")
        return real(path)
    api.download = download
    monkeypatch.setattr(supa, "open_api", lambda *a, **k: api)
    with pytest.raises(SystemExit) as e:
        step0.load_recording(REC, 10, 20)
    assert "kill switch" in str(e.value)
    assert pc.files_under(pc.step0_dir()) == []


def test_step0_score_deletes_the_sample_and_keeps_only_result_json(pilot_root):
    folder = pilot_root / "step0" / "20261120-1900"
    touch(folder / "sample_listen.wav")
    touch(folder / "sample_room.wav")
    touch(folder / "machine_talk.json", json.dumps({"slots": [{"slot": 0, "teacher_s": 5, "speech_s": 10}]}).encode())
    touch(folder / "marking_words.csv",
          ("line,start,end,words,text,wrong_or_missed,grammar_mistakes_heard,grammar_kept_as_said,note\n"
           "1,0,5,100,hello there,1,10,10,\n").encode())
    touch(folder / "marking_talk.csv", b"slot,start,end,who\n0,0,10,B\n")
    assert step0.main(["score", "--folder", str(folder)]) == 0
    assert not folder.exists()
    assert [p.name for p in pc.files_under(pilot_root / "step0")] == ["result.json"]
    assert json.loads((pilot_root / "step0" / "result.json").read_text())["words_pass"] is True


# ------------------------------------------------------------------ R-1: offline while the token refreshes
def _offline_session():
    s = supa.Session("https://x.invalid", "pub", transport=lambda *a, **k: (0, b'{"message": "network: URLError"}'))
    s._token, s._refresh, s._exp = "t", "r", 0.0            # an expired token with a refresh token
    return s


def test_a_failed_refresh_is_an_api_error_not_a_sys_exit():
    with pytest.raises(ApiError) as e:
        _offline_session().token()
    assert e.value.status == 0
    s = _offline_session()
    s._http = lambda *a, **k: (400, b'{"error": "invalid_grant"}')
    with pytest.raises(ApiError) as e:
        s.token()
    assert e.value.status == 401                            # a dead refresh token counts as unreachable too


class RefreshingApi(FakeApi):
    """Like the real Api: every call asks the session for a token first. The token expires, offline, after the first chunk."""

    def __init__(self):
        super().__init__()
        self.s, self.downloads = _offline_session(), 0
        self.s._exp = float("inf")

    def rpc(self, fn, args=None):
        self.s.token()
        return super().rpc(fn, args)

    def download(self, path):
        self.s.token()
        self.downloads += 1
        data = super().download(path)
        self.s._exp = 0.0
        return data


def test_offline_during_a_token_refresh_deletes_the_audio_copy_and_saves_nothing(pilot_root):
    touch(pilot_root / "drafts" / f"{REC}.json", b"{}")
    api = RefreshingApi()
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) in ("stopped", "failed")
    assert api.saved == [] and api.downloads == 1
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []


def test_a_system_exit_inside_a_lesson_still_deletes_the_audio_and_the_draft(pilot_root):
    touch(pilot_root / "drafts" / f"{REC}.json", b"{}")
    api = FakeApi()
    real = api.download
    n = []

    def download(path):
        if n:
            raise SystemExit("anything that ends the process")
        n.append(1)
        return real(path)
    api.download = download
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "failed"
    assert api.saved == [] and pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []
