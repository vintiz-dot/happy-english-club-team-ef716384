"""Voice enrolment in class on the Lark mics (owner, 28 Nov 2026): 2-3 minutes per child, the teacher taps who.

THE ACTIVITY ("My voice card", about 2.5 minutes a child; 3-4 children per lesson keeps it under 10 minutes)
  The child sits at their numbered mic (the mic board says which). The teacher taps the child on "Who's speaking"
  just before they start and taps "stop" (or the next child) when they finish; nobody else talks meanwhile.
    1. Read aloud (about 40 s): the three sentences on the card, at their level (ACTIVITY_CARDS).
    2. Answer (about 60 s): the teacher asks three of the card's questions; the child answers in full sentences.
    3. Tell (about 40 s): the child describes the picture on the card, or their weekend, without stopping.
  Reading gives a steady voice; answering and telling give the voice the child uses in class. All three are needed:
  a child sounds different reading and talking.

WHAT THE JOB DOES WITH IT (enrol_groups)
  Each tapped turn is matched to the mic where that child is loudest (segments.py's excess over the floor and the
  teacher's bleed); only frames where that mic hears child speech and the teacher is silent are used, cut into
  3-second windows and embedded by every speaker model. A turn is refused, with a reason, when it has under
  `min_speech_s` of clean speech, when no mic clearly carries it, or when its windows are not one voice (another
  child talked too). What is left becomes ONE voice group per child, suggested as the tapped child.

NOTHING IS LEARNED UNTIL THE TEACHER CONFIRMS: the group goes to the report like any other, and only the teacher's
answer "this is <child>" on the review page makes it voiceprint samples (nightly.learn_from_answers, unchanged).
A tap alone never teaches: a child can be tapped by mistake, or two children can swap seats.
"""
from __future__ import annotations

import numpy as np

import segments
import voice

SR = 16000
SETTINGS = {
    "window_s": 3.0,
    "min_window_s": 1.5,
    "min_speech_s": 20.0,     # clean speech a turn needs before it can be offered (voice.SETTINGS enrol_min_s)
    "mic_lead_db": 6.0,       # the child's mic must be this much louder (raw level) than every other mic
    "one_voice_min": 0.55,    # median cosine of the windows to their own mean (one voice, shown model)
    "trim_s": 0.5,
    "max_turn_s": 240.0,      # one child's activity is at most 4 minutes
}

ACTIVITY_CARDS = {
    "starter": {  # grades 1-3 / Pre-A1-A1
        "read": ["I have a red bag.", "My cat is small and soft.", "We play in the park after school."],
        "ask": ["What is your name?", "How old are you?", "What is your favourite food?", "What colour do you like?",
                "Who is in your family?"],
        "tell": "Look at the picture: what can you see?",
    },
    "middle": {  # grades 4-6 / A1-A2
        "read": ["Every morning I walk to school with my brother.", "Yesterday it rained, so we stayed inside.",
                 "My best friend can swim faster than me."],
        "ask": ["What did you do last weekend?", "What do you want to be when you grow up? Why?",
                "Which subject do you like best, and why?", "Tell me about your best friend.",
                "What is your favourite place in Hanoi?"],
        "tell": "Tell me about a day you will never forget.",
    },
    "upper": {  # grades 7-8 / A2-B1
        "read": ["Although the test was difficult, most of the class finished on time.",
                 "If I had more free time, I would learn to play the guitar.",
                 "The museum, which opened last year, is already very popular."],
        "ask": ["Should students wear uniforms? Give two reasons.", "What would you change about your school?",
                "Describe a problem you solved recently.", "Which is better, living in a city or the countryside?",
                "What makes a good teacher?"],
        "tell": "Talk for one minute: a book, film or game you would recommend, and why.",
    },
}


def turn_mic(act: dict, a: float, b: float, s: dict = SETTINGS) -> tuple[str | None, float]:
    """The mic carrying a tapped turn and its lead over the next loudest mic (dB). (None, 0) when no mic heard child
    speech in it."""
    F = segments.FRAME_S
    i, j = int(a / F), int(b / F)
    on = np.zeros(max(0, j - i), dtype=bool)
    for m in act["child"]:
        on |= act["child"][m][i:j]
    if on.sum() < 10:
        return None, 0.0
    # every mic over the SAME frames (those where some mic hears child speech): the top one by excess over its own
    # floor and the teacher's bleed; its lead in raw level (four identical transmitters, never normalised), which is
    # what distance does, while a neighbour with a quieter floor can come close in excess
    best = sorted(((float(np.percentile(ex[i:j][on], 90)), m) for m, ex in act["excess"].items()), reverse=True)
    top = best[0][1]
    raw = {m: float(np.percentile(act["db"][m][i:j][on], 90)) for m in act["excess"]}  # the voice's peaks, not the
    # gaps between syllables, which sit at each mic's floor
    others = [raw[top] - v for m, v in raw.items() if m != top]
    lead = min(others) if others else best[0][0]
    return top, lead


def clean_windows(act: dict, mic: str, a: float, b: float, s: dict = SETTINGS) -> list[tuple[float, float]]:
    """3-second stretches inside [a, b) where the mic hears child speech and the teacher is silent."""
    F = segments.FRAME_S
    i, j = int(a / F), int(b / F)
    ok = act["child"][mic][i:j] & ~act["teacher"][i:j]
    out = []
    for x, y in segments.runs(ok, merge_gap=3, min_len=int(s["min_window_s"] / F)):
        t, e = (i + x) * F, (i + y) * F
        while e - t >= s["min_window_s"]:
            w = min(e, t + s["window_s"])
            if w - t >= s["min_window_s"]:
                out.append((t, w))
            t = w
    return out


def enrol_groups(act: dict, audio: dict[str, np.ndarray], turns: list[tuple[str, float, float]], embedders: dict,
                 s: dict = SETTINGS, shown: str | None = None) -> tuple[list[dict], list[dict]]:
    """(groups, refused). groups: one per child, in the shape attribute.make_groups gives ("segments": [] and
    "enrol": {...}); refused: [{"child", "reason", "seconds"}] - ids and numbers only."""
    shown = shown or voice.SETTINGS["shown_model"]
    per: dict[str, dict] = {}
    refused = []
    for sid, a, b in turns:
        b = min(b, a + s["max_turn_s"])
        mic, lead = turn_mic(act, a, b, s)
        if mic is None or lead < s["mic_lead_db"] or mic not in audio:
            refused.append({"child": sid, "reason": "mic_unclear", "seconds": round(b - a, 1)})
            continue
        wins = clean_windows(act, mic, a + s["trim_s"], b, s)
        if not wins:
            refused.append({"child": sid, "reason": "too_little_speech", "seconds": 0.0})
            continue
        d = per.setdefault(sid, {"wins": [], "mics": set(), "first": a})
        d["mics"].add(mic)
        d["wins"] += [(mic, t, e) for t, e in wins]
    groups = []
    for sid, d in sorted(per.items(), key=lambda kv: kv[1]["first"]):
        secs = sum(e - t for _, t, e in d["wins"])
        if secs < s["min_speech_s"]:
            refused.append({"child": sid, "reason": "too_little_speech", "seconds": round(secs, 1)})
            continue
        vecs_by: dict[str, list] = {}
        w = np.array([e - t for _, t, e in d["wins"]])
        for model, emb in embedders.items():
            try:
                vecs_by[model] = [voice.unit(np.asarray(emb.embed(audio[m][int(t * SR): int(e * SR)]), dtype=np.float64))
                                  for m, t, e in d["wins"]]
            except Exception:  # noqa: BLE001 - an extra model failing leaves only its vector out
                if model == shown:
                    raise
        if shown not in vecs_by:
            continue
        V = np.array(vecs_by[shown])
        mean = voice.unit((V * w[:, None]).sum(axis=0))
        one = float(np.median(V @ mean))
        if one < s["one_voice_min"]:
            refused.append({"child": sid, "reason": "not_one_voice", "seconds": round(secs, 1)})
            continue
        vecs = {m: voice.unit((np.array(vs) * w[:, None]).sum(axis=0)) for m, vs in vecs_by.items()}
        groups.append({"key": None, "segments": [], "lines": [], "seconds": round(secs, 1), "vec": vecs[shown],
                       "vecs": vecs, "suggested": sid, "score": round(one, 3), "blind": False, "guesses": {},
                       "enrol": {"mics": sorted(d["mics"]), "windows": len(d["wins"]), "one_voice": round(one, 3)},
                       "spans": [(t, e) for _, t, e in d["wins"]]})
    return groups, refused


def tap_turns_from_marks(marks: list[dict], duration_s: float, act: dict) -> list[tuple[str, float, float]]:
    """The speaking board's one-child taps as turns, ended by the next tap or by the teacher's own speech on the lapel
    (voice.tap_turns, fed the lapel's per-second teacher labels)."""
    F = segments.FRAME_S
    per = int(round(1 / F))
    t = act["teacher"]
    labels = np.array(["T" if t[i: i + per].mean() >= 0.5 else "-" for i in range(0, len(t), per)])
    s = dict(voice.SETTINGS, mark_max_s=SETTINGS["max_turn_s"])
    return voice.tap_turns(marks, duration_s, labels, s)
