"""The progress bar: what the job writes, and what the watcher makes of it (and of an older job's log)."""
from __future__ import annotations

import json
import time
from datetime import datetime

import nightly
import pilot_common as pc
import progress
import test_nightly_fake as T

A = "cb0fd86c-de32-4698-9983-77f47274893a"
B = "e56a7725-cd86-47f1-9382-bfeb52c0e2cf"


def test_the_job_reports_each_step_and_holds_only_ids_and_numbers(pilot_root):
    prog = progress.Tracker([(T.REC, 90.0)])
    seen = []
    orig = prog._write

    def spy(force=False):
        seen.append(dict(prog.state["lessons"][0]))
        orig(True)
    prog._write = spy
    assert nightly.process_one(T.FakeApi(), T.ROW, T.FakeModel(), T.STEP0, keep_local=False, prog=prog) == "saved"
    prog.finish(T.REC, "saved")
    prog.end()
    steps = [s["step"] for s in seen]
    assert steps.index("downloading") < steps.index("transcribing") < steps.index("saving") < steps.index("done")
    assert any(s["step"] == "downloading" and s["total"] == 8 for s in seen)          # 4 room + 4 teacher pieces
    assert any(s["step"] == "transcribing" and s["done"] == 44 and s["total"] == 90 for s in seen)
    st = json.loads(progress.progress_file().read_text(encoding="utf-8"))
    assert st["finished"] and st["lessons"][0]["outcome"] == "saved"
    assert set(st["lessons"][0]) == {"id", "lesson_s", "step", "done", "total", "step_started", "outcome"}
    assert "apple" not in progress.progress_file().read_text(encoding="utf-8")       # no transcript words
    out = progress.render(progress.read_state(datetime.now()), time.time())
    assert "report saved for the teacher" in out and "Finished at" in out


def test_halfway_through_transcribing_the_time_left_follows_the_models_pace(pilot_root):
    now = time.time()
    s = {"job_started": now - 3000, "speed": 1.33, "updated": now, "finished": None, "lessons": [
        {"id": A, "lesson_s": 4800, "step": "transcribing", "done": 2400, "total": 4800, "step_started": now - 1800,
         "outcome": None},
        {"id": B, "lesson_s": 4000, "step": "waiting", "done": 0, "total": 0, "step_started": None, "outcome": None}]}
    f, left = progress.lesson_left(s["lessons"][0], 1.33, now)
    assert abs(left - (1800 + progress.AFTER_S)) < 1                   # half done in 30 min: 30 min to go
    out = progress.render(s, now)
    assert "transcribing, 40 min of 1 h 20 min done" in out and "Lesson 2 of 2" in out and "finished around" in out


def test_an_older_job_is_estimated_from_its_log(pilot_root):
    log = pc.out(pc.logs_dir() / f"nightly-{datetime.now():%Y%m%d}.log")
    d = f"{datetime.now():%Y-%m-%d}"
    log.write_text("\n".join([
        f"{d} 11:08:09 waiting 2: tonight 2, refused 0, later 0, at risk of deletion 0",
        f"{d} 11:14:08 {A} downloaded 318 chunks, 403 MB; lesson 4704 s",
        f"{d} 11:14:11 {A} failed: error_typeerror; audio copy deleted (0 files left)",
        f"{d} 11:19:03 {B} downloaded 310 chunks, 384 MB; lesson 4039 s",
        f"{d} 11:19:05 {B} failed: error_typeerror; audio copy deleted (0 files left)",
        f"{d} 11:19:05 done: failed, failed",
        f"{d} 12:01:14 waiting 2: tonight 2, refused 0, later 0, at risk of deletion 0",
        f"{d} 12:06:10 {A} downloaded 318 chunks, 403 MB; lesson 4704 s", ""]), encoding="utf-8")
    s = progress.read_state(datetime.now())
    assert s["estimated"] and [x["id"] for x in s["lessons"]] == [A, B]
    assert s["lessons"][0]["step"] == "transcribing" and s["lessons"][1]["step"] == "waiting"
    assert s["lessons"][1]["lesson_s"] == 4039                        # its length, from the morning's attempt
    out = progress.render(s, s["lessons"][0]["step_started"] + 3600)
    assert "ESTIMATES" in out and "about" in out
    with open(log, "a", encoding="utf-8") as fh:  # Venus finishes: Jupiter is estimated at Venus's pace
        fh.write(f"{d} 14:10:55 {A} report built (928 lines); audio copy deleted (0 files left)\n"
                 f"{d} 14:10:56 {A} report saved for the lesson's teacher\n")
    s = progress.read_state(datetime.now())
    assert abs(s["speed"] - (2 * 3600 + 4 * 60 + 45) / 4704) < 0.01
    assert s["lessons"][0]["outcome"] == "saved" and s["lessons"][1]["step"] == "downloading"
    assert "the lesson this run already finished" in progress.render(s, time.time())


def test_the_measured_speed_is_kept_for_the_next_estimate(pilot_root):
    progress.Tracker([(A, 4704)]).transcribed(A, 4704 * 0.9, 4704)
    assert abs(progress.measured_speed() - 0.9) < 0.01
