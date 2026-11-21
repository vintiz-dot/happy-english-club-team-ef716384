"""The lesson monitor pilot's overnight job (Option A, D-28). Run by a person, in a terminal.

  PY = C:\\Users\\Dell\\hec-audio-eval\\.venv\\Scripts\\python.exe
  PY scripts\\lesson-monitor\\nightly.py                 # sign in, process tonight's lessons
  PY scripts\\lesson-monitor\\nightly.py --list          # sign in, show what is waiting, do nothing
  PY scripts\\lesson-monitor\\nightly.py --upload-drafts # save reports kept locally (token expired)
  PY scripts\\lesson-monitor\\nightly.py --no-upload     # the design's local-only path: report stays on this laptop

What one lesson goes through (nothing leaves this laptop except the finished
report, which goes to the database where only the lesson's teacher can read it):
  1. lesson_monitor_begin: the database checks again that the class is on, every
     child has the monitor consent, and the pilot's own teacher taught it.
  2. Download the recorder's chunks of both tracks with the signed-in person's
     own session (authenticated download, never a signed URL) to
     pilot\\audio\\<recording>\\, checking every chunk's SHA-256.
  3. Join each track, measure per-second levels, cut the scheduled lesson out,
     transcribe the room track locally with the B2b settings.
  4. Build the report (report.py).
  5. DELETE the audio copy, and prove it by listing the folder (0 files).
  6. Save the report (lesson_monitor_save_report), or keep it as a local draft.

While it works it asks the database between chunks, while transcribing, and again
before it keeps or saves anything (lesson_monitor_may_continue): if the class was
switched off or a child's consent was withdrawn, it stops and deletes its audio copy
and any draft of that lesson. At the start it also deletes every local draft the
database no longer allows (lesson_monitor_keep_check), and a STOP file makes it delete
all local audio and drafts before it exits. A database that cannot be reached is not a yes: after a
2-minute grace the job stops and deletes the same way, and nothing is kept or saved unless the database
answers "ok" at that moment (a pasted --token lasts about an hour: finish inside it).

progress.py, in a second window, shows a bar for each lesson and the time left. It reads
pilot\\progress.json, which this writes as it goes: recording ids, steps and numbers only.

Refuses to start: while pilot\\STOP exists (the kill switch); before step 0 has
passed for words (step0.py score); if the pilot folder is inside a git repo.
Logs (pilot\\logs) carry recording ids, counts and short codes only.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
import time
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402
import plan  # noqa: E402
import report  # noqa: E402

FINAL_REFUSALS = ("consent_missing", "other_teacher", "no_teacher")


# ------------------------------------------------------------------ step 0
def read_step0(path: Path | None = None) -> dict:
    p = path or pc.step0_result_file()
    if not p.exists():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except ValueError:
        return {}


def step0_allows_running(s: dict) -> tuple[bool, str]:
    if not s:
        return False, "step 0 has not been scored yet (step0.py make, the teacher marks it, step0.py score)"
    if not s.get("words_pass"):
        return False, "step 0 did not pass for words: the pilot does not start (design: consider Option C)"
    if not s.get("grammar_pass"):
        return False, "step 0 did not pass for keeping children's grammar as said: the pilot does not start"
    return True, ""


# ------------------------------------------------------------------ local files
def wipe_audio() -> int:
    """Delete every audio copy left in pilot\\audio (a crash, a power cut). Returns files removed."""
    d = pc.audio_dir()
    n = len(pc.files_under(d))
    if d.exists():
        shutil.rmtree(d)
    return n


def delete_audio_copy(folder: Path, writer=None) -> int:
    """Delete one lesson's audio copy and return how many files a fresh listing still finds (must be 0)."""
    if writer is not None:
        writer.close()  # Windows will not delete a file that is still open
    if folder.exists():
        shutil.rmtree(folder, ignore_errors=True)
    return len(pc.files_under(folder))


def expire_drafts(today: date, keep_days: int = 30) -> int:
    n = 0
    for f in sorted(pc.drafts_dir().glob("*.json")) if pc.drafts_dir().exists() else []:
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
            lesson = date.fromisoformat(d.get("session_date", "1970-01-01"))
        except (ValueError, OSError):
            lesson = date(1970, 1, 1)
        if lesson < today - timedelta(days=keep_days):
            f.unlink(missing_ok=True)
            f.with_suffix(".html").unlink(missing_ok=True)
            n += 1
    return n


def remove_draft(rid: str) -> None:
    f = pc.drafts_dir() / f"{rid}.json"
    f.unlink(missing_ok=True)
    f.with_suffix(".html").unlink(missing_ok=True)


def purge_local_drafts(api) -> int:
    """Delete every local draft the database no longer allows: class switched off, a child's consent
    withdrawn or missing, recording gone. Withdrawals and kill switches pressed in the app reach the
    laptop here. A draft that cannot be checked (offline) is kept and says so. Returns drafts deleted."""
    from supa import ApiError
    files = sorted(pc.drafts_dir().glob("*.json")) if pc.drafts_dir().exists() else []
    if not files:
        return 0
    ids = [f.stem for f in files]
    try:
        answers = api.rpc("lesson_monitor_keep_check", {"p_recordings": ids}) or []
    except ApiError as e:
        pc.log(f"start: could not check {len(ids)} local drafts against the database (HTTP {e.status}); they stay for now")
        return 0
    keep = {a["recording_id"]: bool(a.get("keep")) for a in answers}
    n = 0
    for rid in ids:
        if not keep.get(rid, False):
            remove_draft(rid)
            n += 1
    return n


def write_draft(rec: dict, body: dict, audio_s: int, proc_s: int, html_copy: bool) -> Path:
    f = pc.out(pc.drafts_dir() / f"{rec['recording_id']}.json")
    f.write_text(json.dumps({"recording_id": rec["recording_id"], "session_date": rec["session_date"],
                             "audio_seconds": audio_s, "processing_seconds": proc_s, "body": body}), encoding="utf-8")
    if html_copy:
        f.with_suffix(".html").write_text(report.render_html(body, f"Lesson report {rec['session_date']}"), encoding="utf-8")
    return f


# ------------------------------------------------------------------ database reads
def fetch_targets(api, row: dict) -> dict:
    """The teacher's typed words for that lesson, else the class's video-homework word list due
    within a week of it, else none. Read with the signed-in person's own permissions."""
    from supa import ApiError
    try:
        t = api.select("lesson_monitor_targets", {"session_id": f"eq.{row['session_id']}", "select": "words,structures"})
        if t and (t[0].get("words") or t[0].get("structures")):
            return {"source": "teacher", "words": t[0].get("words") or [], "structures": t[0].get("structures") or []}
        d0 = date.fromisoformat(row["session_date"])
        hw = api.select("homeworks", {"class_id": f"eq.{row['class_id']}", "due_date": f"gte.{d0}",
                                      "and": f"(due_date.lte.{d0 + timedelta(days=8)})", "select": "id"})
        ids = [h["id"] for h in hw][:20]
        if ids:
            rub = api.select("video_homework_rubrics", {"homework_id": f"in.({','.join(ids)})",
                                                         "select": "target_vocabulary,target_grammar"})
            words = sorted({w.strip().lower() for r in rub for w in (r.get("target_vocabulary") or []) if w and w.strip()})[:40]
            structs = sorted({s.strip() for r in rub for s in (r.get("target_grammar") or []) if s and s.strip()})[:10]
            if words or structs:
                return {"source": "homework", "words": words, "structures": structs}
    except (ApiError, ValueError, KeyError):
        pass
    return {"source": "none", "words": [], "structures": []}


# ------------------------------------------------------------------ one lesson
def process_one(api, row: dict, model, step0: dict, keep_local: bool, prog=None) -> str:
    """Returns a short outcome code. Never raises for a lesson-level problem."""
    from supa import ApiError
    import audio
    import transcribe

    rid = row["recording_id"]
    t_start = time.time()
    guard = pc.Guard(api, rid)
    b = api.rpc("lesson_monitor_begin", {"p_recording": rid})
    if not b or not b.get("ok"):
        why = (b or {}).get("reason", "refused")
        if why in FINAL_REFUSALS:
            api.rpc("lesson_monitor_record_run", {"p_recording": rid, "p_outcome": "refused", "p_reason": why})
        pc.log(f"{rid} not processed: {why}")
        return why

    folder = pc.out(pc.audio_dir() / rid)
    room = None
    try:
        chunks = api.select("class_recording_chunks", {
            "recording_id": f"eq.{rid}", "select": "track,seq,storage_path,byte_size,sha256,t_start_ms,t_end_ms,confirmed_at",
            "order": "track.asc,seq.asc"})
        by, problems = plan.check_chunks(chunks)
        if any(p.endswith("_room") for p in problems):
            code = "room_track_incomplete"
            api.rpc("lesson_monitor_record_run", {"p_recording": rid, "p_outcome": "refused", "p_reason": code})
            pc.log(f"{rid} refused: {code} ({','.join(problems)})")
            return code
        use_teacher = not any(p.endswith("_teacher") for p in problems)
        window = plan.lesson_window(row)
        room = audio.TrackJoiner(window, pc.out(folder / "room16k.wav"))
        teacher = audio.TrackJoiner(window, None)
        n_bytes, n_done = 0, 0
        n_all = len(by["room"]) + (len(by["teacher"]) if use_teacher else 0)
        for track, joiner in (("room", room), ("teacher", teacher)):
            if track == "teacher" and not use_teacher:
                continue
            for c in by[track]:
                if prog:
                    prog.step(rid, "downloading", n_done, n_all)
                n_done += 1
                if guard.should_stop():
                    raise transcribe.Stopped()
                data = api.download(c["storage_path"])
                if len(data) != int(c["byte_size"]) or hashlib.sha256(data).hexdigest() != c["sha256"]:
                    raise ValueError("chunk_hash_mismatch")
                n_bytes += len(data)
                joiner.add(data, int(c["t_start_ms"]))
        room.close()
        pc.log(f"{rid} downloaded {sum(len(by[t]) for t in ('room', 'teacher') if t == 'room' or use_teacher)} chunks, "
               f"{n_bytes // 1_000_000} MB; lesson {int(window[1] - window[0])} s")
        lv_room = room.levels_in_window()
        lv_teacher = teacher.levels_in_window() if use_teacher else {"db": None, "peak": None, "cov": None, "until_s": None}

        markers = api.select("class_recording_markers", {"recording_id": f"eq.{rid}", "kind": "in.(gap,device_change)",
                                                          "select": "kind,t_ms"})
        markers = [{"kind": m["kind"], "t_s": m["t_ms"] / 1000.0 - window[0]} for m in markers]
        targets = fetch_targets(api, row)

        if guard.should_stop():
            raise transcribe.Stopped()
        duration = window[1] - window[0]
        t_tr = time.time()
        if prog:
            prog.step(rid, "transcribing", 0, duration)
        segs = transcribe.transcribe(model, str(folder / "room16k.wav"), should_stop=guard.should_stop,
                                     on_progress=(lambda t: prog.step(rid, "transcribing", t, duration)) if prog else None)
        if prog:
            prog.transcribed(rid, time.time() - t_tr, duration)
            prog.step(rid, "saving")
        body = report.build_report(
            segs, {"teacher_db": lv_teacher["db"], "teacher_cov": lv_teacher["cov"], "teacher_peak": lv_teacher["peak"],
                   "room_db": lv_room["db"], "room_cov": lv_room["cov"]},
            duration, targets, markers, step0,
            {"room_until_s": lv_room["until_s"], "teacher_until_s": lv_teacher["until_s"]},
            dict(transcribe.settings(), job=pc.JOB_VERSION, step0_talk=bool(step0.get("talk_pass"))),
            offset_s=window[0])
    except transcribe.Stopped:
        left = delete_audio_copy(folder, room)
        remove_draft(rid)
        pc.log(f"{rid} STOPPED ({guard.reason()}); audio copy and any draft deleted ({left} files left)")
        return "stopped"
    except (Exception, SystemExit) as e:  # one lesson's failure never ends the night; a code, never content, is kept
        # SystemExit too: whatever ends the job, the children's audio copy goes first.
        left = delete_audio_copy(folder, room)
        remove_draft(rid)  # a lesson that failed leaves nothing unverified behind
        code = str(e) if str(e) == "chunk_hash_mismatch" else f"error_{type(e).__name__.lower()}"[:40]
        code = "".join(ch for ch in code if ch.isalnum() or ch == "_").lower() or "error"
        try:
            api.rpc("lesson_monitor_record_run", {"p_recording": rid, "p_outcome": "failed", "p_reason": code})
        except ApiError:
            pass
        pc.log(f"{rid} failed: {code}; audio copy deleted ({left} files left)")
        return "failed"
    finally:
        if room is not None:
            room.close()

    left = delete_audio_copy(folder)
    if left:
        pc.log(f"{rid} WARNING: {left} audio files could not be deleted from the pilot folder - delete them by hand")
    else:
        pc.log(f"{rid} report built ({len(body['lines'])} lines); audio copy deleted (0 files left)")
    audio_s, proc_s = int(duration), int(time.time() - t_start)
    # The last look before anything is kept or saved: the class may have been stopped, or a child's
    # consent withdrawn, while the laptop worked.
    # Only a database that says "ok" right now lets anything be kept: an unreachable one is not a yes.
    final = guard.verdict(force=True)
    if final != "ok":
        remove_draft(rid)
        pc.log(f"{rid} NOT kept: {guard.reason()}; report dropped, nothing saved")
        return "stopped"
    if keep_local:
        write_draft(row, body, audio_s, proc_s, html_copy=True)
        pc.log(f"{rid} kept on this laptop only (--no-upload)")
        return "kept_local"
    try:
        api.rpc("lesson_monitor_save_report", {"p_recording": rid, "p_job_version": pc.JOB_VERSION, "p_body": body,
                                               "p_audio_seconds": audio_s, "p_processing_seconds": proc_s})
        pc.log(f"{rid} report saved for the lesson's teacher")
        return "saved"
    except ApiError as e:
        if e.status in (0, 401):
            write_draft(row, body, audio_s, proc_s, html_copy=False)
            pc.log(f"{rid} could not be saved now (HTTP {e.status}); kept as a local draft for --upload-drafts")
            return "draft"
        pc.log(f"{rid} refused by the database: {e.message}; nothing kept")
        return "refused"


def upload_drafts(api) -> dict:
    from supa import ApiError
    counts = {"saved": 0, "kept": 0, "deleted": 0}
    for f in sorted(pc.drafts_dir().glob("*.json")) if pc.drafts_dir().exists() else []:
        d = json.loads(f.read_text(encoding="utf-8"))
        try:
            api.rpc("lesson_monitor_save_report", {"p_recording": d["recording_id"], "p_job_version": pc.JOB_VERSION,
                                                   "p_body": d["body"], "p_audio_seconds": d.get("audio_seconds"),
                                                   "p_processing_seconds": d.get("processing_seconds")})
            counts["saved"] += 1
        except ApiError as e:
            if e.status in (0, 401):
                counts["kept"] += 1
                continue
            counts["deleted"] += 1  # refused for good (consent, switched off, already handled): the draft goes
        f.unlink(missing_ok=True)
        f.with_suffix(".html").unlink(missing_ok=True)
    return counts


# ------------------------------------------------------------------ main
def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--max-lessons", type=int, default=3)
    ap.add_argument("--until", default="07:00", help="the laptop must be free by this local time (hh:mm)")
    ap.add_argument("--list", action="store_true", help="show what is waiting and stop")
    ap.add_argument("--no-upload", action="store_true", help="keep reports on this laptop only (pilot\\drafts)")
    ap.add_argument("--upload-drafts", action="store_true", help="save the local drafts and stop")
    ap.add_argument("--token", action="store_true", help="paste an access token instead of signing in")
    a = ap.parse_args(argv)

    pc.check_root()
    if pc.stopped():
        audio_n, drafts_n = pc.wipe_work()
        print(f"The kill switch is on ({pc.stop_file()}): nothing runs. stop.py off removes it.")
        print(f"Deleted from this laptop: {audio_n} audio files, {drafts_n} local draft files.")
        return 0
    step0 = read_step0()
    allowed, why = step0_allows_running(step0)
    if not allowed and not a.upload_drafts:
        print(f"Not starting: {why}.")
        return 2
    wiped = wipe_audio()
    if wiped:
        pc.log(f"start: removed {wiped} audio files left from an earlier run")
    old = expire_drafts(date.today())
    if old:
        pc.log(f"start: {old} local drafts older than 30 days deleted")

    import supa
    api = supa.open_api(a.token)
    if a.token:
        print("Pasted token: it cannot be refreshed. Reports that cannot be saved in time stay as local drafts.")
    gone = purge_local_drafts(api)
    if gone:
        pc.log(f"start: {gone} local drafts deleted (class switched off, consent withdrawn or missing, or recording gone)")
    expired = api.rpc("lesson_monitor_expire")
    if expired:
        pc.log(f"start: {expired} reports past 30 days deleted in the database")
    if a.upload_drafts:
        pc.log(f"drafts: {upload_drafts(api)}")
        return 0

    pending = api.rpc("lesson_monitor_pending", {"p_limit": 50}) or []
    now = datetime.now().astimezone()
    until = plan.next_until(now, a.until)
    tonight = plan.choose_tonight(pending, now, a.max_lessons, until)
    if a.no_upload:
        local = {f.stem for f in pc.drafts_dir().glob("*.json")} if pc.drafts_dir().exists() else set()
        tonight.process = [r for r in tonight.process if r["recording_id"] not in local]
    pc.log(f"waiting {len(pending)}: tonight {len(tonight.process)}, refused {len(tonight.refuse)}, "
           f"later {len(tonight.waiting)}, at risk of deletion {len(tonight.at_risk)}")
    for r in tonight.at_risk:
        pc.log(f"AT RISK: {r['recording_id']} (lesson {r['session_date']}) is deleted by the recorder on {r['delete_after'][:10]}")
    if a.list:
        for r in tonight.process:
            print(f"  tonight: {r['recording_id']} lesson {r['session_date']}")
        for r, why in tonight.refuse:
            print(f"  refused: {r['recording_id']} lesson {r['session_date']} ({why})")
        return 0
    for r, why in tonight.refuse:
        api.rpc("lesson_monitor_record_run", {"p_recording": r["recording_id"], "p_outcome": "refused", "p_reason": why})
        pc.log(f"{r['recording_id']} refused: {why}")
    if not tonight.process:
        return 0

    import progress
    import transcribe
    model = transcribe.load_model()

    def length(r):
        try:
            w = plan.lesson_window(r)
            return w[1] - w[0]
        except (ValueError, KeyError, TypeError):
            return 5400.0
    prog = progress.Tracker([(r["recording_id"], length(r)) for r in tonight.process])
    outcomes = []
    for r in tonight.process:
        if pc.stopped():
            pc.log("kill switch on: stopping before the next lesson")
            break
        if plan.lessons_that_fit(datetime.now().astimezone(), until) < 1:
            pc.log(f"stopping: another lesson would not finish before {a.until}")
            break
        outcomes.append(process_one(api, r, model, step0, a.no_upload, prog))
        prog.finish(r["recording_id"], outcomes[-1])
    prog.end()
    pc.log(f"done: {', '.join(outcomes) or 'nothing processed'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
