"""Deleting: audio copies, drafts, the one-command deletion, the kill switch; and the step 0 / stop-rule arithmetic.
Every file here is a synthetic placeholder in a temporary pilot folder."""
from __future__ import annotations

import io
import json
import subprocess
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import pytest

import audio
import delete_pilot
import nightly
import pilot_admin
import pilot_common as pc
import step0
import stop


def touch(p: Path, data: bytes = b"x") -> Path:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return p


def test_audio_copy_is_deleted_and_proved_by_listing(pilot_root):
    rec = pilot_root / "audio" / "rec-1"
    touch(rec / "room" / "000000.flac")
    touch(rec / "room16k.wav")
    assert nightly.delete_audio_copy(rec) == 0
    assert not rec.exists()


def test_leftover_audio_from_a_crash_is_wiped_at_start(pilot_root):
    touch(pilot_root / "audio" / "a" / "x.flac")
    touch(pilot_root / "audio" / "b" / "y.wav")
    keep = touch(pilot_root / "drafts" / "keep.json", b"{}")
    assert nightly.wipe_audio() == 2
    assert pc.files_under(pilot_root / "audio") == [] and keep.exists()


def test_drafts_older_than_30_days_go(pilot_root):
    today = date(2026, 12, 20)
    old = touch(pilot_root / "drafts" / "old.json", json.dumps({"session_date": str(today - timedelta(days=31))}).encode())
    touch(old.with_suffix(".html"))
    new = touch(pilot_root / "drafts" / "new.json", json.dumps({"session_date": str(today - timedelta(days=3))}).encode())
    assert nightly.expire_drafts(today) == 1
    assert not old.exists() and not old.with_suffix(".html").exists() and new.exists()


def test_one_command_deletion_removes_everything_local_and_leaves_the_kill_switch_on(pilot_root, monkeypatch):
    for f in ["audio/r/room/000000.flac", "drafts/r.json", "drafts/r.html", "step0/20261120-1900/marking_words.csv",
              "step0/result.json", "logs/nightly-20261120.log"]:
        touch(pilot_root / f)
    outside = touch(pilot_root.parent / "work" / "b2b" / "keep.json")       # the evaluation's data: not the pilot's
    assert delete_pilot.main(["--local-only", "--yes"]) == 0
    assert [p.name for p in pc.files_under(pilot_root)] == ["STOP"]
    assert pc.stopped() and outside.exists()


def test_deletion_refuses_a_folder_not_named_pilot(tmp_path):
    with pytest.raises(SystemExit):
        delete_pilot.delete_local(tmp_path / "work")


def test_pilot_folder_inside_a_repo_is_refused(tmp_path, monkeypatch):
    repo = tmp_path / "repo"
    (repo / ".git").mkdir(parents=True)
    monkeypatch.setenv("HEC_PILOT_ROOT", str(repo / "pilot"))
    with pytest.raises(SystemExit) as e:
        pc.check_root()
    assert e.value.code == 3


def test_writing_outside_the_pilot_folder_is_refused(tmp_path):
    with pytest.raises(SystemExit):
        pc.out(tmp_path / "elsewhere" / "x.json")


def test_kill_switch_stops_the_job_before_it_signs_in(pilot_root, monkeypatch, capsys):
    stop.main(["on", "--reason", "test"])
    assert pc.stopped()
    called = []
    monkeypatch.setattr("supa.open_api", lambda *a, **k: called.append(1))
    assert nightly.main([]) == 0
    assert called == [] and "kill switch is on" in capsys.readouterr().out
    stop.main(["off"])
    assert not pc.stopped()


def test_job_does_not_start_before_step0_passes(pilot_root, monkeypatch):
    called = []
    monkeypatch.setattr("supa.open_api", lambda *a, **k: called.append(1))
    assert nightly.main([]) == 2
    touch(pc.step0_result_file(), json.dumps({"words_pass": True, "grammar_pass": False}).encode())
    assert nightly.main([]) == 2
    assert called == []
    assert nightly.step0_allows_running({"words_pass": True, "grammar_pass": True}) == (True, "")


def test_step0_scoring_against_the_design_bars():
    words = [{"words": 100, "wrong_or_missed": 3, "grammar_mistakes_heard": 6, "grammar_kept_as_said": 6},
             {"words": 100, "wrong_or_missed": 4, "grammar_mistakes_heard": 5, "grammar_kept_as_said": 4}]
    machine = {"slots": [{"slot": 0, "teacher_s": 8, "speech_s": 10}, {"slot": 1, "teacher_s": 2, "speech_s": 10},
                         {"slot": 2, "teacher_s": 0, "speech_s": 0}]}
    talk = [{"slot": 0, "who": "T"}, {"slot": 1, "who": "O"}, {"slot": 2, "who": "-"}]
    r = step0.score_marks(words, talk, machine)
    assert r["words_rate"] == 0.035 and r["words_pass"]
    assert r["grammar_cases"] == 11 and r["grammar_pass"]          # 10 of 11 kept = 0.909
    assert r["talk_teacher_marks_pct"] == 50.0 and r["talk_machine_pct"] == 50.0 and r["talk_pass"]
    bad = step0.score_marks([{"words": 100, "wrong_or_missed": 6, "grammar_mistakes_heard": 4, "grammar_kept_as_said": 4}], talk,
                            {"slots": [{"slot": 0, "teacher_s": 10, "speech_s": 10}, {"slot": 1, "teacher_s": 9, "speech_s": 10}]})
    assert not bad["words_pass"]
    assert not bad["grammar_pass"] and "second 5-minute sample" in bad["grammar_note"]
    assert bad["talk_diff_pp"] == 45.0 and not bad["talk_pass"]
    half = step0.score_marks(words, [{"slot": 0, "who": "T"}, {"slot": 1, "who": ""}], machine)
    assert not half["talk_pass"] and half["talk_unmarked_slots"] == 1


def test_stop_rules():
    start = date(2026, 11, 23)
    rows = [{"session_date": "2026-11-24", "reading_minutes": 10, "used_something": "yes", "first_opened_at": "x"},
            {"session_date": "2026-12-01", "reading_minutes": 20, "used_something": "no", "first_opened_at": "x"},
            {"session_date": "2026-12-03", "reading_minutes": 25, "used_something": "not_sure", "first_opened_at": "x"},
            {"session_date": "2026-12-08", "reading_minutes": None, "used_something": None, "first_opened_at": None}]
    r = pilot_admin.stop_rules(rows, start)
    assert r["median_minutes"] == 20 and r["weeks_used_nothing"] == [2] and r["stop"]
    assert r["reasons"] == ["median reading time 20 min is over 15"]
    calm = pilot_admin.stop_rules(rows[:1], start)
    assert not calm["stop"]


def test_track_joiner_cuts_the_lesson_and_keeps_gaps_silent(pilot_root):
    import soundfile as sf

    def chunk(seconds, value, sr=48000):
        buf = io.BytesIO()
        sf.write(buf, np.full(int(seconds * sr), value, dtype=np.float32), sr, format="FLAC")
        return buf.getvalue()

    out = pc.out(pilot_root / "audio" / "t" / "room16k.wav")
    j = audio.TrackJoiner((5.0, 25.0), out)
    j.add(chunk(10, 0.25), 0)
    j.add(chunk(10, 0.5), 20000)      # 10-20 s is missing
    j.close()
    x, sr = sf.read(str(out), dtype="float32")
    assert sr == 16000 and abs(len(x) / sr - 20.0) < 0.01
    assert abs(float(np.median(x[: 4 * sr])) - 0.25) < 0.01        # 5-10 s
    assert abs(float(np.max(np.abs(x[6 * sr: 14 * sr])))) < 1e-3   # the gap is silence
    assert abs(float(np.median(x[16 * sr:])) - 0.5) < 0.01          # 20-25 s
    lv = j.levels_in_window()
    assert len(lv["db"]) == 20 and lv["until_s"] == 20.0
    assert not lv["cov"][7] and lv["cov"][0] and lv["cov"][16]


def test_no_audio_or_transcript_file_is_tracked_in_the_repo():
    here = Path(__file__).resolve().parents[1]
    tracked = subprocess.run(["git", "ls-files", str(here)], capture_output=True, text=True, cwd=here).stdout.split()
    assert not [t for t in tracked if t.endswith((".wav", ".flac", ".mp3", ".csv", ".json", ".log", ".html"))]
