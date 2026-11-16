"""Step 0 of the pilot (design s.12, condition 3): a teacher checks 5 minutes of the
LOCAL transcript and of the teacher/others split before anything is shown.

  PY scripts\\lesson-monitor\\step0.py make --teacher <lapel file> --room <room file> [--start 600]
  PY scripts\\lesson-monitor\\step0.py make --recording <recording id> [--start 600]   (signs in, downloads)
  PY scripts\\lesson-monitor\\step0.py score [--folder <pilot\\step0\\...>]

`make` writes, under pilot\\step0\\<date-time>\\ (never in the repo):
  sample_listen.wav     the 5 minutes, teacher microphone left, room right (to listen to)
  sample_room.wav, sample_teacher.wav
  marking_words.csv     one row per transcript line; the teacher fills three columns
  marking_talk.csv      one row per 10 seconds; the teacher writes who was speaking
  machine_talk.json     the computer's own split - NOT for the teacher (it would steer her marks)
  INSTRUCTIONS.txt      how to mark, in plain words
`score` reads the two filled sheets and writes pilot\\step0\\result.json:
  words    at most 5 % of the written words wrong or missed            (bar from the design)
  grammar  children's grammar mistakes kept as said in at least 9 of 10 (needs at least 10 cases)
  talk     teacher's share of speaking time within 10 points of the teacher's own marks
The overnight job starts only when words and grammar pass; it shows talk-time only when talk passes.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pilot_common as pc  # noqa: E402
import levels  # noqa: E402

WORDS_BAR = 0.05
GRAMMAR_BAR = 0.90
GRAMMAR_MIN_CASES = 10
TALK_BAR_PP = 10.0
SLOT_S = 10
WORD_COLS = ["line", "start", "end", "words", "text", "wrong_or_missed", "grammar_mistakes_heard", "grammar_kept_as_said", "note"]
TALK_COLS = ["slot", "start", "end", "who"]

INSTRUCTIONS = """STEP 0 - checking the computer's transcript (about 45 minutes)

Listen to sample_listen.wav (teacher microphone on the left, room on the right).
Do not open machine_talk.json: it is the computer's answer and would steer you.

1. marking_words.csv (open in Excel). One row per line the computer wrote.
   wrong_or_missed         how many words in that line are wrong, plus words that
                           were said in that stretch but are missing (0 if all right)
   grammar_mistakes_heard  how many grammar mistakes a CHILD made in that stretch
                           (e.g. "he go", "I am go yesterday")
   grammar_kept_as_said    of those, how many the computer wrote AS SAID
                           (not "corrected" into good English)
   Leave a cell empty only if you could not tell; empty counts as 0.

2. marking_talk.csv. One row per 10 seconds. In "who" write:
   T  mostly the teacher was speaking
   O  mostly others (children) were speaking
   B  both about equally
   -  nobody was speaking
   Mark what you hear, not what you think the computer wrote.

3. Save both files (keep them as CSV) and tell the owner. He runs: step0.py score
Codes only: do not type a child's name anywhere in these files.
"""


def _num(v) -> float:
    try:
        return float(str(v).strip() or 0)
    except ValueError:
        return 0.0


def score_marks(word_rows: list[dict], talk_rows: list[dict], machine: dict) -> dict:
    """Pure: the step 0 result from the teacher's filled sheets and the machine's sealed split."""
    words = sum(_num(r.get("words")) for r in word_rows)
    wrong = sum(_num(r.get("wrong_or_missed")) for r in word_rows)
    heard = sum(_num(r.get("grammar_mistakes_heard")) for r in word_rows)
    kept = sum(min(_num(r.get("grammar_kept_as_said")), _num(r.get("grammar_mistakes_heard"))) for r in word_rows)
    res: dict = {"bars": {"words_max": WORDS_BAR, "grammar_min": GRAMMAR_BAR, "grammar_min_cases": GRAMMAR_MIN_CASES,
                          "talk_max_pp": TALK_BAR_PP}}
    res["words_rate"] = round(wrong / words, 4) if words else None
    res["words_pass"] = bool(words) and wrong / words <= WORDS_BAR
    res["grammar_cases"] = int(heard)
    res["grammar_kept_rate"] = round(kept / heard, 4) if heard else None
    res["grammar_pass"] = heard >= GRAMMAR_MIN_CASES and kept / heard >= GRAMMAR_BAR
    if heard < GRAMMAR_MIN_CASES:
        res["grammar_note"] = f"only {int(heard)} grammar mistakes heard: mark a second 5-minute sample (needs {GRAMMAR_MIN_CASES})"

    # talk-time: the teacher's marks against the machine's seconds in the same slots
    per_slot = {int(s["slot"]): s for s in machine.get("slots", [])}
    t_score = n = 0.0
    m_t = m_sp = 0
    unmarked = 0
    for r in talk_rows:
        who = str(r.get("who") or "").strip().upper()
        if who not in ("T", "O", "B", "-"):
            unmarked += 1
            continue
        if who == "-":
            continue
        t_score += {"T": 1.0, "O": 0.0, "B": 0.5}[who]
        n += 1
        s = per_slot.get(int(_num(r.get("slot"))))
        if s:
            m_t += int(s["teacher_s"])
            m_sp += int(s["speech_s"])
    res["talk_unmarked_slots"] = unmarked
    if n and m_sp and unmarked == 0:
        teacher_pct = 100.0 * t_score / n
        machine_pct = 100.0 * m_t / m_sp
        res["talk_teacher_marks_pct"] = round(teacher_pct, 1)
        res["talk_machine_pct"] = round(machine_pct, 1)
        res["talk_diff_pp"] = round(abs(teacher_pct - machine_pct), 1)
        res["talk_pass"] = abs(teacher_pct - machine_pct) <= TALK_BAR_PP
    else:
        res["talk_pass"] = False
        res["talk_note"] = "not every 10-second slot is marked" if unmarked else "no speech marked or measured"
    return res


def machine_slots(t_db, r_db, t_cov=None, r_cov=None, slot_s: int = SLOT_S) -> dict:
    lab = levels.label_seconds(t_db, r_db, levels.MID_MARGIN_DB, t_cov, r_cov)
    slots = []
    for k, i in enumerate(range(0, len(lab), slot_s)):
        w = lab[i:i + slot_s]
        slots.append({"slot": k, "teacher_s": int(np.sum(w == "T")), "speech_s": int(np.sum(w != "-"))})
    return {"margin_db": levels.MID_MARGIN_DB, "slots": slots, "range": levels.talk_split(t_db, r_db, t_cov, r_cov)}


def per_second(x: np.ndarray, sr: int) -> tuple[np.ndarray, np.ndarray]:
    m = levels.LevelMeter(sr)
    m.add(x, 0.0)
    db, _peak, cov = m.result()
    return db, cov


def write_sheets(folder: Path, segs: list[dict], seconds: int) -> None:
    with open(pc.out(folder / "marking_words.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, WORD_COLS)
        w.writeheader()
        for i, s in enumerate(segs, 1):
            text = " ".join(s["text"].split())
            w.writerow({"line": i, "start": f"{s['start']:.1f}", "end": f"{s['end']:.1f}", "words": len(text.split()),
                        "text": text, "wrong_or_missed": "", "grammar_mistakes_heard": "", "grammar_kept_as_said": "", "note": ""})
    with open(pc.out(folder / "marking_talk.csv"), "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, TALK_COLS)
        w.writeheader()
        for k, i in enumerate(range(0, seconds, SLOT_S)):
            w.writerow({"slot": k, "start": i, "end": min(seconds, i + SLOT_S), "who": ""})


def make(teacher: np.ndarray, room: np.ndarray, sr: int, folder: Path, model=None) -> Path:
    import soundfile as sf
    import transcribe
    n = min(len(teacher), len(room))
    teacher, room = teacher[:n], room[:n]
    sf.write(str(pc.out(folder / "sample_room.wav")), room, sr, subtype="PCM_16")
    sf.write(str(pc.out(folder / "sample_teacher.wav")), teacher, sr, subtype="PCM_16")
    sf.write(str(pc.out(folder / "sample_listen.wav")), np.stack([teacher, room], axis=1), sr, subtype="PCM_16")
    model = model or transcribe.load_model()
    segs = transcribe.transcribe(model, str(folder / "sample_room.wav"), should_stop=lambda: False)
    write_sheets(folder, segs, int(n / sr))
    t_db, t_cov = per_second(teacher, sr)
    r_db, r_cov = per_second(room, sr)
    pc.out(folder / "machine_talk.json").write_text(json.dumps(machine_slots(t_db, r_db, t_cov, r_cov)), encoding="utf-8")
    (folder / "INSTRUCTIONS.txt").write_text(INSTRUCTIONS, encoding="utf-8")
    return folder


def load_local(path: Path, start: float, seconds: float) -> np.ndarray:
    if pc.common.is_forbidden(path):
        sys.exit("REFUSED: that file is never opened")
    from faster_whisper.audio import decode_audio
    x = decode_audio(str(path), sampling_rate=16000)
    a = int(start * 16000)
    return x[a:a + int(seconds * 16000)].astype(np.float32)


def load_recording(rid: str, start: float, seconds: float) -> tuple[np.ndarray, np.ndarray]:
    """Download one recorder recording with the operator's own session, cut [start, start+seconds) of the lesson."""
    import hashlib
    import audio
    import plan
    import supa
    api = supa.open_api()
    rows = api.select("class_recordings", {"id": f"eq.{rid}", "select": "id,class_id,session_date,started_at,pre_start_ms,scheduled_start,scheduled_end"})
    if not rows:
        sys.exit("no such recording, or you may not listen to it")
    # A recorder lesson goes through the transcriber only with the monitor's own consent lines.
    missing = api.rpc("lesson_monitor_class_missing_consent", {"p_class": rows[0]["class_id"], "p_on": rows[0]["session_date"]})
    if missing is None or missing > 0:
        sys.exit(f"REFUSED: {missing} child(ren) of that lesson have no monitor consent on record")
    a, _b = plan.lesson_window(rows[0])
    win = (a + start, a + start + seconds)
    chunks = api.select("class_recording_chunks", {"recording_id": f"eq.{rid}", "select": "track,seq,storage_path,byte_size,sha256,t_start_ms,t_end_ms,confirmed_at"})
    by, problems = plan.check_chunks(chunks)
    if problems:
        sys.exit(f"the recording is not complete: {','.join(problems)}")
    out = {}
    tmp = pc.out(pc.step0_dir() / "_download")
    try:
        for track in ("teacher", "room"):
            j = audio.TrackJoiner(win, pc.out(tmp / f"{track}.wav"))
            for c in by[track]:
                if c["t_end_ms"] / 1000 < win[0] or c["t_start_ms"] / 1000 > win[1]:
                    continue
                data = api.download(c["storage_path"])
                if hashlib.sha256(data).hexdigest() != c["sha256"]:
                    sys.exit("a chunk did not match its recorded hash")
                j.add(data, int(c["t_start_ms"]))
            j.close()
            import soundfile as sf
            out[track], _ = sf.read(str(tmp / f"{track}.wav"), dtype="float32")
    finally:
        import shutil
        shutil.rmtree(tmp, ignore_errors=True)
    return out["teacher"], out["room"]


def latest_folder() -> Path | None:
    d = pc.step0_dir()
    cands = sorted([p for p in d.iterdir() if p.is_dir() and (p / "marking_words.csv").exists()]) if d.exists() else []
    return cands[-1] if cands else None


def read_csv(path: Path) -> list[dict]:
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    mk = sp.add_parser("make")
    mk.add_argument("--teacher", type=Path)
    mk.add_argument("--room", type=Path)
    mk.add_argument("--teacher-offset", type=float, default=0.0, help="seconds to add to the teacher file's start (alignment)")
    mk.add_argument("--recording")
    mk.add_argument("--start", type=float, default=600.0, help="seconds into the lesson (default 10:00)")
    mk.add_argument("--minutes", type=float, default=5.0)
    sc = sp.add_parser("score")
    sc.add_argument("--folder", type=Path)
    a = ap.parse_args(argv)
    pc.check_root()

    if a.cmd == "make":
        secs = a.minutes * 60
        if a.recording:
            teacher, room = load_recording(a.recording, a.start, secs)
        elif a.teacher and a.room:
            teacher = load_local(a.teacher, a.start + a.teacher_offset, secs)
            room = load_local(a.room, a.start, secs)
        else:
            ap.error("give --recording, or both --teacher and --room")
        folder = pc.out(pc.step0_dir() / datetime.now().strftime("%Y%m%d-%H%M"))
        make(teacher, room, 16000, folder)
        print(f"Step 0 sample ready in {folder}. Give the teacher INSTRUCTIONS.txt, sample_listen.wav and the two CSV files.")
        return 0

    folder = a.folder or latest_folder()
    if not folder or not (folder / "marking_words.csv").exists():
        sys.exit("no marked step 0 folder found")
    res = score_marks(read_csv(folder / "marking_words.csv"), read_csv(folder / "marking_talk.csv"),
                      json.loads((folder / "machine_talk.json").read_text(encoding="utf-8")))
    res["scored_at"] = datetime.now().isoformat(timespec="seconds")
    res["folder"] = folder.name
    pc.out(pc.step0_result_file()).write_text(json.dumps(res, indent=1), encoding="utf-8")
    print(json.dumps({k: v for k, v in res.items() if k != "bars"}, indent=1))
    print("PILOT MAY START" if res["words_pass"] and res["grammar_pass"] else "PILOT DOES NOT START (see the design: words failing -> consider Option C)")
    print("talk-time WILL be shown" if res["talk_pass"] else "talk-time will NOT be shown (feature B dropped)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
