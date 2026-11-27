"""Build the teacher's lesson report from a transcript and the two tracks' levels (pure).

Option A of docs/LESSON_MONITOR_DESIGN.md, features A (transcript), C (target
words and a few patterns), F (class-level flags), and B (talk-time) ONLY when
step 0 passed for it. Nothing here names a child or counts a child's errors:
  * the transcript is the lesson's, one line per stretch the transcriber wrote;
  * "who" on a line is only ever "T" (the teacher's microphone carried it), and
    only after step 0 passed for talk-time; never a child;
  * "not written" never means "not said".

Uncertainty is carried in the data so the screen can show it:
  u  the transcriber was unsure of the line (low confidence, a likely
     repetition, or probably not speech): "words may be wrong or missing";
  f  neither microphone's level shows speech there: shown faded, never hidden;
  unwritten  the room had speech that no line covers (an estimate).
"""
from __future__ import annotations

import html
import re

import numpy as np

import levels

SCHEMA = "hec-lesson-monitor/1"
FIXED_NOTES = [
    "Written by a computer on the school laptop. Words may be wrong or missing, most of all where several people talk at once.",
    "Vietnamese is not transcribed.",
    "The computer does not know who is speaking. It never names a child.",
    "\"Not written\" does not mean \"not said\".",
]
STEP0_PENDING_NOTE = "Learner mistakes are not counted: the transcriber has not yet been checked for keeping them as said."
TALK_NOT_SHOWN_NOTE = None  # design s.10: if talk-time fails step 0 it is not shown at all, not even with a warning

UNSURE_LOGPROB = -1.0
UNSURE_NO_SPEECH = 0.6
UNSURE_COMPRESSION = 2.4
UNSURE_WORD_P = 0.45
SILENCE_FLAG_S = 600
UNWRITTEN_MIN_S = 20
PAST_ED_STOP = {"need", "needed", "red", "bed", "feed", "seed", "speed", "weed", "bleed", "breed", "shed", "sled", "fed",
                "led", "wed", "bred", "fled", "hundred", "ted", "ed", "naked", "wicked", "sacred", "kindred"}
TOKEN_RE = re.compile(r"[a-z]+(?:'[a-z]+)?")


def tokens(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower().replace("’", "'"))


def mmss(s: float) -> str:
    s = max(0, int(round(s)))
    return f"{s // 3600}:{s % 3600 // 60:02d}:{s % 60:02d}" if s >= 3600 else f"{s // 60}:{s % 60:02d}"


def unsure(seg: dict) -> bool:
    if seg.get("force_unsure"):  # the reconciler: two transcribers and the beam-5 re-check did not agree
        return True
    if (seg.get("avg_logprob") is not None and seg["avg_logprob"] < UNSURE_LOGPROB) \
            or (seg.get("no_speech_prob") or 0) > UNSURE_NO_SPEECH \
            or (seg.get("compression_ratio") or 0) > UNSURE_COMPRESSION:
        return True
    ps = [w.get("p") for w in seg.get("words") or [] if w.get("p") is not None]
    return bool(ps) and float(np.median(ps)) < UNSURE_WORD_P


def _span(mask: np.ndarray | None, a: float, b: float) -> np.ndarray:
    if mask is None:
        return np.zeros(0, dtype=bool)
    return mask[max(0, int(a)): max(int(a) + 1, int(np.ceil(b)))]


def word_forms(word: str) -> set[str]:
    """Plain matching with the regular endings only (no AI, no stemming library)."""
    w = word.lower().strip()
    forms = {w, w + "s", w + "es"}
    if w.endswith("y") and len(w) > 2:
        forms.add(w[:-1] + "ies")
    return forms


def find_phrase(line_tokens: list[list[str]], phrase: str) -> list[int]:
    """Indexes of lines that contain the phrase (each word in its plain forms, in order)."""
    parts = tokens(phrase)
    if not parts:
        return []
    forms = [word_forms(p) for p in parts]
    hits = []
    for i, toks in enumerate(line_tokens):
        for j in range(0, len(toks) - len(parts) + 1):
            if all(toks[j + k] in forms[k] for k in range(len(parts))):
                hits.append(i)
                break
    return hits


def build_report(segments: list[dict], lv: dict, duration_s: float, targets: dict, markers: list[dict],
                 step0: dict, coverage: dict, settings: dict, offset_s: float = 0.0) -> dict:
    talk_ok = bool(step0.get("talk_pass"))
    t_db, t_cov, r_db, r_cov = lv.get("teacher_db"), lv.get("teacher_cov"), lv.get("room_db"), lv.get("room_cov")
    room_act = levels.active(r_db, r_cov) if r_db is not None else None
    teach_act = levels.active(t_db, t_cov) if t_db is not None else None
    labels = None
    if talk_ok and t_db is not None and r_db is not None:
        labels = levels.label_seconds(t_db, r_db, levels.MID_MARGIN_DB, t_cov, r_cov)

    # ---- A. lines
    lines, line_toks = [], []
    for s in sorted(segments, key=lambda s: s["start"]):
        text = " ".join((s.get("text") or "").split())
        if not text:
            continue
        a, b = float(s["start"]), float(max(s["end"], s["start"]))
        line = {"t": round(a, 2), "e": round(b, 2), "text": text, "u": unsure(s)}
        heard = _span(room_act, a, b).any() or _span(teach_act, a, b).any()
        line["f"] = not heard
        if labels is not None:
            lab = labels[max(0, int(a)): max(int(a) + 1, int(np.ceil(b)))]
            sp = int(np.sum(lab != "-"))
            line["who"] = "T" if sp and np.sum(lab == "T") / sp >= 0.6 else None
        lines.append(line)
        line_toks.append(tokens(text))

    # ---- unwritten room speech (an estimate)
    unwritten, unwritten_total = [], 0
    if room_act is not None:
        covered = np.zeros(len(room_act), dtype=bool)
        for ln in lines:
            covered[max(0, int(ln["t"] - 1)): int(np.ceil(ln["e"] + 1))] = True
        for a, b in levels.runs(room_act & ~covered, min_len=3, merge_gap=5):
            if b - a >= UNWRITTEN_MIN_S:
                unwritten.append({"t": a, "e": b, "seconds": b - a})
                unwritten_total += b - a

    # ---- C. target words and structures
    tw = []
    for w in targets.get("words") or []:
        idx = find_phrase(line_toks, w)
        item = {"word": w, "heard": bool(idx), "times": [lines[i]["t"] for i in idx][:20]}
        if talk_ok and idx:
            item["teacher_mic"] = sum(1 for i in idx if lines[i].get("who") == "T")
            item["room"] = len(idx) - item["teacher_mic"]
        tw.append(item)
    structs = []
    for st in targets.get("structures") or []:
        alts = [x.strip() for x in st.split("/") if x.strip()] or [st]
        idx = sorted({i for alt in alts for i in find_phrase(line_toks, alt)})
        structs.append({"name": st, "count": len(idx), "times": [lines[i]["t"] for i in idx][:20]})
    patterns = {
        "questions": sum(1 for ln in lines if ln["text"].rstrip().endswith("?")),
        "can_cant": sum(sum(1 for t in toks if t in ("can", "can't", "cannot")) for toks in line_toks),
        "past_ed": sum(sum(1 for t in toks if t.endswith("ed") and len(t) >= 4 and t not in PAST_ED_STOP) for toks in line_toks),
    }

    # ---- F. flags (class-level and factual; none is about one child or grades the teacher)
    flags = []
    if room_act is not None:
        for a, b in levels.runs(~room_act[: int(duration_s)], min_len=SILENCE_FLAG_S, merge_gap=0):
            flags.append({"kind": "room_quiet", "t": a, "e": b,
                          "text": f"No speech from the room for {round((b - a) / 60)} minutes ({mmss(a)}-{mmss(b)})."})
    missing = [x for x in tw if not x["heard"]]
    if tw and missing:
        flags.append({"kind": "targets_not_written", "text": f"{len(missing)} of {len(tw)} target words not written."})
    for track, label in (("room", "Room microphone"), ("teacher", "Teacher microphone")):
        until = coverage.get(f"{track}_until_s")
        if until is None:
            flags.append({"kind": f"{track}_missing", "text": f"{label} missing for this lesson."})
        elif until < duration_s - 60:
            flags.append({"kind": f"{track}_missing", "t": until,
                          "text": f"{label} missing after {mmss(until)} - figures cover 0:00-{mmss(until)} only."})
    if lv.get("teacher_peak") is not None:
        n = levels.clipped_minutes(lv["teacher_peak"])
        if n >= 1:
            flags.append({"kind": "teacher_mic_loud",
                          "text": f"Teacher microphone too loud for {n} minute{'s' if n != 1 else ''}"
                                  + (" - talk-time may be off." if talk_ok else ".")})
    for m in markers:
        if m.get("kind") == "gap" and 0 <= m.get("t_s", -1) <= duration_s:
            flags.append({"kind": "recorder_gap", "t": m["t_s"], "text": f"The recorder marked a gap at {mmss(m['t_s'])}."})

    # ---- B. talk-time, only after step 0 passed for it
    talk = None
    if labels is not None:
        split = levels.talk_split(t_db, r_db, t_cov, r_cov)
        if split:
            talk = dict(split, timeline=levels.timeline(labels, 10), step_s=10)

    notes = list(FIXED_NOTES)
    if not step0.get("grammar_pass"):
        notes.append(STEP0_PENDING_NOTE)
    body = {
        "schema": SCHEMA,
        # offset_s: where the lesson starts in the recording, so the screen can play any line's moment.
        "lesson": {"duration_s": round(duration_s, 1), "transcribed_track": "room", "offset_s": round(offset_s, 3)},
        "notes": notes,
        "lines": lines,
        "unwritten": unwritten,
        "targets": {"source": targets.get("source", "none"), "words": tw, "structures": structs},
        "patterns": patterns,
        "flags": flags,
        "coverage": {k: (round(v, 1) if v is not None else None) for k, v in coverage.items()},
        "settings": settings,
    }
    if talk is not None:
        body["talk_time"] = talk
    body["lesson"]["unwritten_seconds"] = unwritten_total
    return body


# ------------------------------------------------------------------ local copy
def render_html(body: dict, title: str = "Lesson report") -> str:
    """The same report as a plain page, for the design's local-only path
    (`nightly.py --no-upload`): read on the school laptop, never sent anywhere."""
    e = html.escape
    rows = []
    for ln in body.get("lines", []):
        cls = " ".join(c for c, on in (("u", ln.get("u")), ("f", ln.get("f"))) if on)
        who = "T " if ln.get("who") == "T" else ""
        rows.append(f'<tr class="{cls}"><td>{mmss(ln["t"])}</td><td>{e(who)}{e(ln["text"])}</td></tr>')
    flags = "".join(f"<li>{e(f['text'])}</li>" for f in body.get("flags", []))
    notes = "".join(f"<li>{e(n)}</li>" for n in body.get("notes", []))
    words = "".join(f"<li>{e(w['word'])}: {'heard at ' + ', '.join(mmss(t) for t in w['times']) if w['heard'] else 'not written'}</li>"
                    for w in body.get("targets", {}).get("words", []))
    talk = body.get("talk_time")
    talk_html = (f"<p>Teacher about {talk['teacher_pct'][0]}-{talk['teacher_pct'][1]} % / others about "
                 f"{talk['others_pct'][0]}-{talk['others_pct'][1]} % of speaking time.</p>") if talk else ""
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{e(title)}</title>
<style>body{{font:15px/1.5 system-ui;margin:2rem;max-width:60rem}}td{{vertical-align:top;padding:2px 8px}}
tr.u td{{color:#777}}tr.f td{{opacity:.5}}</style></head><body>
<h1>{e(title)}</h1><p>For the teacher only. Do not send by Zalo, Facebook, email or USB.</p>
<ul>{notes}</ul><h2>Flags</h2><ul>{flags or '<li>None.</li>'}</ul>{talk_html}
<h2>Target words</h2><ul>{words or '<li>None set for this lesson.</li>'}</ul>
<h2>Transcript</h2><p>Grey: words may be wrong or missing. Faded: no matching sound level.</p>
<table>{''.join(rows)}</table></body></html>"""
