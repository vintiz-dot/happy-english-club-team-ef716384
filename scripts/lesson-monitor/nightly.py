"""The lesson monitor pilot's overnight job (Option A, D-28). Run by a person, in a terminal.

  PY = C:\\Users\\Dell\\hec-audio-eval\\.venv\\Scripts\\python.exe
  PY scripts\\lesson-monitor\\nightly.py                 # sign in, process tonight's lessons
  PY scripts\\lesson-monitor\\nightly.py --list          # sign in, show what is waiting, do nothing
  PY scripts\\lesson-monitor\\nightly.py --upload-drafts # save reports kept locally (token expired)
  PY scripts\\lesson-monitor\\nightly.py --no-upload     # the design's local-only path: report stays on this laptop
  PY scripts\\lesson-monitor\\nightly.py --watch --class Jupiter --date today --careful --stop-after-done --stop-at 07:00
      # one class, one day: wait for that recording to finish, transcribe it with a wider search, save the
      # report, ask for the class report (which grades each child's speaking near the end of the lesson), stop.
      # scripts\\lesson-monitor\\watch_jupiter_tonight.ps1 runs exactly this.

What one lesson goes through (nothing leaves this laptop except the finished
report, which goes to the database where only the lesson's teacher can read it):
  1. lesson_monitor_begin: the database checks again that the class is on, every
     child has the monitor consent, and the pilot's own teacher taught it.
  2. Download the recorder's chunks of both tracks with the signed-in person's
     own session to pilot\\audio\\<recording>\\, checking every chunk's size and SHA-256.
     A chunk comes from Cloudflare R2 when the file is there (a 5-minute link the Worker
     gives the signed-in person) and from Supabase Storage otherwise (supa.Api.download);
     each chunk is fetched ONCE. The server's copy is removed by the recorder-retention
     function after the report is saved; this job never deletes server files and never needs
     a recording's server audio again once its report is saved. If the audio is already gone
     the run is recorded as refused "audio_gone" (final, never retried).
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
15-minute grace the job stops and deletes the same way, and nothing is kept or saved unless the database
answers "ok" at the last look, which asks again every 30 s through that grace (a pasted --token lasts
about an hour: finish inside it).

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

import numpy as np
from datetime import date, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402
import plan  # noqa: E402
import report  # noqa: E402
import voiceprints  # noqa: E402

# The voice step (24 Nov 2026). None = off: the voiceprint migration (20261124120000) is not pasted,
# or this run could not reach its consent list. main() sets it; tests set it directly.
VOICE: dict | None = None

FINAL_REFUSALS = ("consent_missing", "other_teacher", "no_teacher")

# Careful transcription (--careful): a wider beam search than the B2b settings' greedy decoding. Slower (roughly
# twice), a little more accurate on quiet or accented speech. It is recorded in the report's own "settings", so the
# report says which decoding made it; nothing else about B2b changes.
CAREFUL_BEAM = 5


def filter_pending(rows: list[dict], class_ids: set[str] | None, day: str | None) -> list[dict]:
    """Keep only the waiting recordings of the chosen classes and day (None = no filter). Pure."""
    return [r for r in rows
            if (not class_ids or r.get("class_id") in class_ids) and (not day or str(r.get("session_date")) == day)]


def resolve_day(value: str | None, today: date | None = None) -> str | None:
    """"today" / "yesterday" / YYYY-MM-DD -> an ISO date; None stays None. Raises ValueError on anything else."""
    if not value:
        return None
    v = value.strip().lower()
    t = today or date.today()
    if v == "today":
        return t.isoformat()
    if v == "yesterday":
        return (t - timedelta(days=1)).isoformat()
    return date.fromisoformat(v).isoformat()


def resolve_classes(api, name: str | None) -> set[str] | None:
    """The class(es) whose name contains `name`, read with the signed-in person's permissions. Refuses (ValueError)
    when none match, so a typo never means "every class"."""
    if not name:
        return None
    found = api.select("classes", {"name": f"ilike.*{name}*", "select": "id,name"}) or []
    ids = {c["id"] for c in found}
    if not ids:
        raise ValueError(f"no class has a name containing '{name}'")
    return ids


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
    from supa import ApiError, AudioGone
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
        locate = getattr(api, "locate", None)
        if locate is not None:  # where each chunk lives (R2 or Supabase): a few requests now, none per chunk
            locate([c["storage_path"] for t in ("room", "teacher") if t == "room" or use_teacher for c in by[t]])
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
        vres = run_voice(api, row, folder / "room16k.wav", body, lv_teacher, lv_room, window, duration, guard)
    except transcribe.Stopped:
        left = delete_audio_copy(folder, room)
        remove_draft(rid)
        pc.log(f"{rid} STOPPED ({guard.reason()}); audio copy and any draft deleted ({left} files left)")
        return "stopped"
    except AudioGone:
        # The server no longer has the audio (retention ran, or it never arrived): nothing to retry. A final,
        # clean outcome, so the recording stops being offered; a lesson without a report has nothing to lose.
        left = delete_audio_copy(folder, room)
        remove_draft(rid)
        try:
            api.rpc("lesson_monitor_record_run", {"p_recording": rid, "p_outcome": "refused", "p_reason": "audio_gone"})
        except ApiError:
            pass  # e.g. the lesson already has its report: nothing else to record
        pc.log(f"{rid} audio no longer on the server; recorded as refused (audio_gone); audio copy deleted ({left} files left)")
        return "audio_gone"
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
    # Only a database that says "ok" lets anything be kept: an unreachable one is not a yes, so the last look
    # asks again for up to the guard's grace (a Wi-Fi drop at this moment cost Jupiter's report, 27 Nov 2026).
    final = guard.final_verdict()
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
        finish_voice(api, row, vres)
        request_lesson_report(api, row)
        return "saved"
    except ApiError as e:
        if e.status in (0, 401):
            write_draft(row, body, audio_s, proc_s, html_copy=False)
            pc.log(f"{rid} could not be saved now (HTTP {e.status}); kept as a local draft for --upload-drafts")
            return "draft"
        pc.log(f"{rid} refused by the database: {e.message}; nothing kept")
        return "refused"


# ------------------------------------------------------------------ voices
def prepare_voice(api) -> dict | None:
    """Once per run: which children may have a voiceprint, delete every other, learn from the
    teacher's answers since the last run. Off (None) when the database has no voiceprint step."""
    from supa import ApiError
    try:
        allowed = {r["student_id"] for r in (api.rpc("lesson_monitor_voiceprint_allowed") or [])}
    except ApiError as e:
        pc.log(f"voices: off (the voiceprint consent list could not be read, HTTP {e.status})")
        return None
    gone = voiceprints.sync_allowed(allowed)
    if gone:
        pc.log(f"voices: {gone} voiceprint file(s) deleted (consent withdrawn or not recorded)")
    old = voiceprints.expire_pending(date.today())
    if old:
        pc.log(f"voices: {old} unanswered lessons' voice groups past 30 days deleted")
    ctx = {"allowed": allowed, "embedders": None}
    learn_from_answers(api, ctx)
    publish_voice_stats(api)
    return ctx


def publish_voice_stats(api) -> None:
    """The numbers behind Admin > Voices: each model's accuracy and each child's seconds of voice. Never a voiceprint.
    Best effort: a database without the page's migration (20261126090000) or a failed call only logs a code."""
    try:
        import voice_admin
        voice_admin.publish(api)
    except Exception as e:  # noqa: BLE001 - the report never waits on a statistics page
        pc.log(f"voices: numbers not published: error_{type(e).__name__.lower()}"[:120])


def _calibration_rows(rid: str, a: dict, g: dict | None, shown_model: str) -> list[dict]:
    """One row per model for one answered group: numbers and ids only. Groups kept before several models ran
    (no hidden guesses) give one ECAPA row from the suggestion the teacher was shown, as before."""
    answered_child = a.get("answer") == "child"
    base = {"rid": rid, "g": a["group_key"], "answer": a.get("answer"), "student": a.get("student_id")}
    rows = []
    guesses = (g or {}).get("guess") or {}
    for model, gs in guesses.items():
        shown = bool(g.get("shown")) and model == shown_model
        rows.append(dict(base, model=model, shown=shown, blind=bool(g.get("blind")), best=gs["best"], score=gs["score"],
                         second=gs.get("second"), sec=g.get("s"),
                         agreed=bool(answered_child and a.get("student_id") == gs["best"])))
    if not rows and a.get("suggested_student"):
        rows.append(dict(base, model=voiceprints.DEFAULT_MODEL, shown=True, blind=False, best=a["suggested_student"],
                         score=a.get("suggested_score"), second=None, sec=(g or {}).get("s"),
                         agreed=bool(answered_child and a.get("student_id") == a["suggested_student"])))
    return rows


def learn_from_answers(api, ctx: dict) -> int:
    """The teacher's answers in the app become voice samples of the child they named, in every model's
    voiceprint (only a child whose voiceprint consent stands), and score every model's hidden guess.
    A changed answer first takes the old samples back out."""
    from supa import ApiError
    try:
        answers = api.rpc("lesson_monitor_voice_answers", {"p_limit": 500}) or []
    except ApiError as e:
        pc.log(f"voices: answers not read (HTTP {e.status})")
        return 0
    by_rec: dict[str, list] = {}
    for a in answers:
        by_rec.setdefault(a["recording_id"], []).append(a)
    learned = 0
    for rid, rows in by_rec.items():
        pending = voiceprints.load_pending(rid) or {}
        pend = pending.get("groups", {})
        shown_model = pending.get("shown_model") or voiceprints.DEFAULT_MODEL
        for a in rows:
            voiceprints.remove_tag(rid, a["group_key"])
            g = pend.get(a["group_key"])
            if a.get("may_learn") and g and a.get("student_id") in ctx["allowed"]:
                taught = 0
                for model, vec in voiceprints.group_vectors(g).items():
                    try:
                        taught += voiceprints.add(a["student_id"], [(np.array(vec), g["s"])], "answer", rid, a["group_key"], model)
                    except ValueError:
                        continue
                learned += 1 if taught else 0
            for row in _calibration_rows(rid, a, g, shown_model):
                voiceprints.note_calibration(row)
        try:
            api.rpc("lesson_monitor_voice_learned", {"p_recording": rid, "p_groups": [a["group_key"] for a in rows]})
        except ApiError:
            pass
    if answers:
        pc.log(f"voices: {len(answers)} answer(s) read, {learned} voice group(s) learned")
    return learned


def _voice_embedders(ctx: dict) -> dict:
    """{model: embedder}, loaded once per run. The shown model must load (else the voice step fails and the report goes
    without voices, as before); any other model that cannot load is skipped for the night with a log code."""
    import voice
    if ctx.get("embedders"):
        return ctx["embedders"]
    shown = voice.SETTINGS["shown_model"]
    if ctx.get("embedder") is not None:  # one ready embedder (tests, older callers): it is the shown model
        ctx["embedders"] = {shown: ctx["embedder"]}
        return ctx["embedders"]
    try:
        import embedders
    except ImportError:
        embedders = None
    out: dict = {}
    if embedders is None:
        if shown != "ecapa":
            raise RuntimeError("no embedders module")
        out[shown] = voice.Embedder()
    else:
        names = list(voice.SETTINGS["models"]) if voice.SETTINGS["models"] else list(embedders.available())
        if shown not in names:
            names.insert(0, shown)
        for name in [shown] + [n for n in names if n != shown]:
            try:
                out[name] = embedders.load(name)
            except Exception as e:  # noqa: BLE001
                if name == shown:
                    raise
                pc.log(f"voices: model {name} not loaded: error_{type(e).__name__.lower()}"[:120])
    ctx["embedders"] = out
    pc.log(f"voices: models ready: {', '.join(out)}; shown: {shown}")
    return out


def run_voice(api, row, wav: Path, body: dict, lv_teacher: dict, lv_room: dict, window, duration: float, guard):
    """Who said each line, while the lesson's audio is still on the laptop. Adds "m" (tapped child) and
    "g" (voice group) to lines and body["voice"]; returns what finish_voice keeps once the report is saved.
    Never fails the lesson: a problem leaves the report as it was and logs a code."""
    if VOICE is None:
        return None
    import levels
    import transcribe
    import voice
    rid = row["recording_id"]
    try:
        labels = None
        if lv_teacher.get("db") is not None and lv_room.get("db") is not None:
            labels = levels.label_seconds(lv_teacher["db"], lv_room["db"], levels.MID_MARGIN_DB,
                                          lv_teacher.get("cov"), lv_room.get("cov"))
        marks = api.select("lesson_speaker_marks", {"session_id": f"eq.{row.get('session_id')}", "recording_id": f"eq.{rid}",
                                                     "select": "kind,student_ids,offset_ms", "order": "at.asc"}) or []
        marks = [{"kind": m["kind"], "student_ids": m.get("student_ids") or [], "t_s": m["offset_ms"] / 1000.0 - window[0]}
                 for m in marks if m.get("offset_ms") is not None]
        turns = voice.tap_turns(marks, duration, labels)
        embs = _voice_embedders(VOICE)
        prints = {m: voiceprints.centroids(VOICE["allowed"], voice.SETTINGS["enrol_min_s"], m) for m in embs}
        if guard.should_stop():
            raise transcribe.Stopped()
        res = voice.analyse(transcribe.read_wav16k(str(wav)), body["lines"], turns, embs, prints, labels, rid=rid)
        res["samples"] = {sid: v for sid, v in res["samples"].items() if sid in VOICE["allowed"]}
        res["samples_by_model"] = {m: {sid: v for sid, v in sm.items() if sid in VOICE["allowed"]}
                                   for m, sm in res["samples_by_model"].items()}
        res["shown_model"] = voice.SETTINGS["shown_model"]
        for m in res["skipped"]:  # not tried again tonight: a model that broke once is left out of the run
            VOICE["embedders"].pop(m, None)
        for i, sid in res["tapped"].items():
            body["lines"][i]["m"] = sid
        for i, key in res["group_of"].items():
            body["lines"][i]["g"] = key
        body["voice"] = voice.body_part(res)
        n_sug = sum(1 for g in res["groups"] if g["suggested"])
        pc.log(f"{rid} voices: {len(turns)} tapped turns, {len(res['groups'])} voice groups, {n_sug} with a suggestion, "
               f"{len(prints.get(voice.SETTINGS['shown_model'], {}))} children known by voice, {len(res['samples_by_model'])} model(s)")
        return res
    except transcribe.Stopped:
        raise
    except Exception as e:  # noqa: BLE001 - the report goes without voices rather than not at all
        pc.log(f"{rid} voices skipped: error_{type(e).__name__.lower()}"[:120])
        body.pop("voice", None)
        for ln in body["lines"]:
            ln.pop("m", None)
            ln.pop("g", None)
        return None


def finish_voice(api, row: dict, res) -> None:
    """After the report is saved: its groups to the database (for the teacher to name; only the shown model's
    suggestion, never a hidden guess or a blind flag), the groups' embeddings and every model's hidden guess kept
    encrypted here until answered, tapped turns of children with consent into every model's voiceprints."""
    from supa import ApiError
    if not res:
        return
    rid = row["recording_id"]
    try:
        api.rpc("lesson_monitor_save_voice_groups", {"p_recording": rid, "p_groups": [
            {"key": g["key"], "seconds": g["seconds"], "lines": len(g["lines"]), "suggested": g["suggested"], "score": g["score"]}
            for g in res["groups"]]})
    except ApiError as e:
        pc.log(f"{rid} voice groups not saved (HTTP {e.status}); the report has none to name")
        return
    shown_model = res.get("shown_model") or voiceprints.DEFAULT_MODEL
    voiceprints.save_pending(rid, row["session_date"], {
        g["key"]: (g["vec"], g["seconds"], {"vecs": g.get("vecs"), "guess": g.get("guesses"), "blind": g.get("blind"),
                                           "shown": g["suggested"] is not None})
        for g in res["groups"]}, shown_model)
    n = 0
    for model, by_child in (res.get("samples_by_model") or {shown_model: res["samples"]}).items():
        for sid, items in by_child.items():
            k = voiceprints.add(sid, items, "tap", rid, None, model)
            if model == shown_model:
                n += k
    if n:
        pc.log(f"{rid} voices: {n} voice sample(s) of {len(res['samples'])} child(ren) learned from taps")


def request_lesson_report(api, row: dict) -> None:
    """Right after the transcript is saved, ask lesson-report-draft for this lesson's class report. The laptop is
    signed in as an admin, who cannot read the transcript through RLS, so the request says from_monitor: the
    function then reads this lesson's own monitor transcript itself (owner's ruling, 22 Nov 2026: no teacher needs
    to be present). Best effort: logs a status code only, never content; a refusal (already approved, a draft is
    being built, 6 builds today) or an outage changes nothing here, and the teacher's page builds it if missing."""
    call = getattr(api, "function", None)
    sid = row.get("session_id")
    if call is None or not sid:
        return
    rid = row.get("recording_id", "")
    try:
        call("lesson-report-draft", {"session_id": sid, "from_monitor": True})
        pc.log(f"{rid} lesson report draft requested")
    except Exception as e:  # noqa: BLE001 - never let the report request fail the run
        pc.log(f"{rid} lesson report draft not requested (HTTP {getattr(e, 'status', 0)})")


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
    ap.add_argument("--watch", action="store_true",
                    help="keep running: every few minutes take the next finished recording, transcribe it and save its "
                         "report at once (no 07:00 cut-off, no cap per night). Stops on the kill switch or Ctrl+C")
    ap.add_argument("--poll-minutes", type=int, default=5, help="with --watch: how often to look for new recordings")
    ap.add_argument("--class", dest="cls", default=None, help="only recordings of the class whose name contains this (e.g. Jupiter)")
    ap.add_argument("--date", default=None, help="only that lesson day: today, yesterday or YYYY-MM-DD")
    ap.add_argument("--careful", action="store_true", help=f"transcribe with a beam search of {CAREFUL_BEAM} instead of greedy (slower, more careful)")
    ap.add_argument("--stop-after-done", action="store_true", help="with --watch: stop once the first matching recording has been handled")
    ap.add_argument("--stop-at", default=None, help="with --watch: stop looking at this local time (hh:mm); the next one after now")
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
    global VOICE
    VOICE = prepare_voice(api)
    gone = purge_local_drafts(api)
    if gone:
        pc.log(f"start: {gone} local drafts deleted (class switched off, consent withdrawn or missing, or recording gone)")
    expired = api.rpc("lesson_monitor_expire")
    if expired:
        pc.log(f"start: {expired} reports past 30 days deleted in the database")
    if a.upload_drafts:
        pc.log(f"drafts: {upload_drafts(api)}")
        return 0

    import progress
    import transcribe
    try:
        a.class_ids = resolve_classes(api, a.cls)
        a.day = resolve_day(a.date)
    except ValueError as e:
        print(f"Not starting: {e}.")
        return 2
    if a.careful:
        transcribe.B2B["beam_size"] = CAREFUL_BEAM
        pc.log(f"careful transcription on: beam {CAREFUL_BEAM}")
    stop_at = plan.next_until(datetime.now().astimezone(), a.stop_at) if a.watch and a.stop_at else None
    if a.cls or a.date:
        pc.log(f"filter: class {a.cls or 'any'}, day {a.day or 'any'}, {len(a.class_ids or [])} matching class(es)")
    model = None
    while True:
        _BATCH_WORK[0] = 0
        model = _run_batch(api, a, step0, model, progress, transcribe)
        if not a.watch or a.list or pc.stopped():
            return 0
        if a.stop_after_done and _BATCH_WORK[0]:
            pc.log("watch: the matching recording has been handled; stopping")
            return 0
        if stop_at is not None and datetime.now().astimezone() >= stop_at:
            pc.log(f"watch: {a.stop_at} has passed with nothing more to do; stopping")
            return 0
        try:
            time.sleep(max(1, a.poll_minutes) * 60)
        except KeyboardInterrupt:
            pc.log("watch: stopped by the person at the keyboard")
            return 0
        if pc.stopped():
            return 0
        api.rpc("lesson_monitor_expire")  # also keeps the sign-in warm; the session renews itself


_SEEN: set[str] = set()  # --watch only: recordings this run has already taken up
_BATCH_WORK = [0]  # lessons handled (processed or refused) by the batch just run; main() reads it for --stop-after-done


def _run_batch(api, a, step0, model, progress, transcribe):
    """One look at what is waiting and the work it allows. Returns the loaded model (loaded once, kept)."""
    pending = filter_pending(api.rpc("lesson_monitor_pending", {"p_limit": 50}) or [],
                             getattr(a, "class_ids", None), getattr(a, "day", None))
    now = datetime.now().astimezone()
    until = plan.next_until(now, a.until) if not a.watch else now + timedelta(days=3650)
    tonight = plan.choose_tonight(pending, now, a.max_lessons if not a.watch else 1000, until)
    if a.watch:
        # --watch looks every few minutes: a lesson already handled (or refused) in this run is not tried or logged again.
        tonight.refuse = [(r, why) for r, why in tonight.refuse if r["recording_id"] not in _SEEN]
        tonight.process = [r for r in tonight.process if r["recording_id"] not in _SEEN]
        _SEEN.update(r["recording_id"] for r, _ in tonight.refuse)
        _SEEN.update(r["recording_id"] for r in tonight.process)
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
        return model
    for r, why in tonight.refuse:
        api.rpc("lesson_monitor_record_run", {"p_recording": r["recording_id"], "p_outcome": "refused", "p_reason": why})
        pc.log(f"{r['recording_id']} refused: {why}")
        _BATCH_WORK[0] += 1
    if not tonight.process:
        return model
    if model is None:
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
        if not a.watch and plan.lessons_that_fit(datetime.now().astimezone(), until) < 1:
            pc.log(f"stopping: another lesson would not finish before {a.until}")
            break
        outcomes.append(process_one(api, r, model, step0, a.no_upload, prog))
        _BATCH_WORK[0] += 1
        prog.finish(r["recording_id"], outcomes[-1])
    prog.end()
    pc.log(f"done: {', '.join(outcomes) or 'nothing processed'}")
    if VOICE is not None:
        publish_voice_stats(api)
    return model


if __name__ == "__main__":
    sys.exit(main())
