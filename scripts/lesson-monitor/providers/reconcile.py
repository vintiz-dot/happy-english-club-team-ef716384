"""Two transcripts of one lesson into one: where they agree the line stands, where they disagree the audio is
transcribed again on the server with faster-whisper beam 5 (the old --careful decoding), and a line the re-check
still cannot settle is marked unsure (report line "u"). Pure: no audio, no network, no model here; remote.py runs
the re-check and hands its segments back to `merge`.

How "agree" is decided, word by word:
  1. Each transcript becomes a list of (token, start, end): the provider's word times when it sent them, else the
     segment's time spread evenly over its words. Tokens are lower case letters, digits and apostrophes.
  2. The lesson is cut into blocks of about BLOCK_S seconds at a moment of silence in BOTH transcripts (so no word
     is cut in two), and each block's token lists are aligned with difflib (no "junk" heuristic: "the" counts).
  3. Every stretch the alignment does not match (a word changed, added or left out) is a difference. It matters
     when it spans at least MIN_TOKENS tokens on either side, or a single word of 4+ letters (so "a" / "the"
     alone does not send audio to the re-check; "cat" / "hat" alone does not either, "seven" / "eleven" does).
  4. Differences closer than JOIN_GAP_S are joined, padded by PAD_S, and widened to whole segments of the primary
     transcript, so a line is either kept whole or re-done whole.

What comes out of merge(): the primary transcript's segments outside the windows, and the re-check's segments
inside them. A re-checked segment is forced unsure ("force_unsure") when its words agree with NEITHER provider
over the same time (similarity below AGREE); when it agrees with one of them the transcriber's own confidence
decides, as for every other line.
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher

BLOCK_S = 300.0
CUT_SEARCH_S = 30.0
MIN_TOKENS = 2
LONG_WORD = 4
JOIN_GAP_S = 2.0
PAD_S = 0.5
AGREE = 0.8
TOKEN = re.compile(r"[a-z0-9]+(?:'[a-z]+)?")


def tokens(text: str) -> list[str]:
    return TOKEN.findall(str(text).lower().replace("’", "'"))


def words_of(seg: dict) -> list[tuple[str, float, float]]:
    """(token, start, end) for a segment: its own word times when every word has them, else spread evenly."""
    ws = seg.get("words") or []
    out = []
    if ws:
        for w in ws:
            for t in tokens(w.get("w", "")):
                out.append((t, float(w["start"]), float(w["end"])))
        if out:
            return out
    toks = tokens(seg.get("text", ""))
    a, b = float(seg["start"]), float(max(seg["end"], seg["start"]))
    if not toks:
        return []
    step = (b - a) / len(toks)
    return [(t, a + i * step, a + (i + 1) * step) for i, t in enumerate(toks)]


def word_list(segs: list[dict]) -> list[tuple[str, float, float]]:
    out = []
    for s in sorted(segs, key=lambda s: s["start"]):
        out.extend(words_of(s))
    return out


def block_cuts(a: list, b: list, duration: float, block_s: float = BLOCK_S) -> list[float]:
    """Cut times about every block_s seconds, each in the widest silence of BOTH word lists near the mark."""
    spans = sorted([(w[1], w[2]) for w in a] + [(w[1], w[2]) for w in b])
    out, mark = [], block_s
    while mark < duration - block_s / 3:
        lo, hi = mark - CUT_SEARCH_S, mark + CUT_SEARCH_S
        best, best_gap, end_so_far = mark, -1.0, None
        for s, e in spans:
            if end_so_far is not None and s > end_so_far:
                g0, g1 = max(end_so_far, lo), min(s, hi)
                if g1 > g0 and g1 - g0 > best_gap:
                    best_gap, best = g1 - g0, (g0 + g1) / 2
            end_so_far = e if end_so_far is None else max(end_so_far, e)
        out.append(best)
        mark = best + block_s
    return out


def _blocks(words: list, cuts: list[float]) -> list[list]:
    out = [[] for _ in range(len(cuts) + 1)]
    for w in words:
        m = (w[1] + w[2]) / 2
        k = 0
        while k < len(cuts) and m >= cuts[k]:
            k += 1
        out[k].append(w)
    return out


def _significant(ta: list[str], tb: list[str]) -> bool:
    return max(len(ta), len(tb)) >= MIN_TOKENS or any(len(t) >= LONG_WORD for t in ta + tb)


def differences(a_segs: list[dict], b_segs: list[dict], duration: float) -> list[tuple[float, float]]:
    """Raw (start, end) stretches where the two transcripts disagree, before joining and widening."""
    wa, wb = word_list(a_segs), word_list(b_segs)
    cuts = block_cuts(wa, wb, duration)
    out = []
    for ba, bb in zip(_blocks(wa, cuts), _blocks(wb, cuts)):
        ta, tb = [w[0] for w in ba], [w[0] for w in bb]
        for op, i1, i2, j1, j2 in SequenceMatcher(None, ta, tb, autojunk=False).get_opcodes():
            if op == "equal" or not _significant(ta[i1:i2], tb[j1:j2]):
                continue
            times = [(w[1], w[2]) for w in ba[i1:i2]] + [(w[1], w[2]) for w in bb[j1:j2]]
            out.append((min(t[0] for t in times), max(t[1] for t in times)))
    return sorted(out)


def join(spans: list[tuple[float, float]], gap: float = JOIN_GAP_S) -> list[tuple[float, float]]:
    out: list[list[float]] = []
    for s, e in sorted(spans):
        if out and s - out[-1][1] <= gap:
            out[-1][1] = max(out[-1][1], e)
        else:
            out.append([s, e])
    return [(s, e) for s, e in out]


def widen(spans: list[tuple[float, float]], primary: list[dict], duration: float, pad: float = PAD_S) -> list[tuple[float, float]]:
    """Pad, clip to the lesson, and grow each window to whole primary segments it touches; join the result."""
    out = []
    for s, e in spans:
        s, e = max(0.0, s - pad), min(duration, e + pad)
        changed = True
        while changed:
            changed = False
            for seg in primary:
                if seg["start"] < e and seg["end"] > s and (seg["start"] < s or seg["end"] > e):
                    s, e = min(s, seg["start"]), max(e, seg["end"])
                    changed = True
        out.append((max(0.0, s), min(duration, e)))
    return join(out, 0.0)


def windows(a_segs: list[dict], b_segs: list[dict], duration: float) -> list[tuple[float, float]]:
    """Where the audio is re-checked: the differences, joined, padded and widened to the primary (a) segments."""
    return widen(join(differences(a_segs, b_segs, duration)), a_segs, duration)


def similarity(x: str, y: str) -> float:
    tx, ty = tokens(x), tokens(y)
    if not tx and not ty:
        return 1.0
    return SequenceMatcher(None, tx, ty, autojunk=False).ratio()


def text_between(segs: list[dict], s: float, e: float) -> str:
    return " ".join(t for t, a, b in word_list(segs) if s <= (a + b) / 2 < e)


def inside(seg: dict, wins: list[tuple[float, float]]) -> bool:
    m = (seg["start"] + seg["end"]) / 2
    return any(s <= m < e for s, e in wins)


def merge(primary: list[dict], wins: list[tuple[float, float]], rechecked: list[dict],
          witnesses: list[list[dict]]) -> list[dict]:
    """The lesson's transcript: primary outside the windows, the re-check inside. A re-checked segment that agrees
    with none of the witnesses (the providers' transcripts) over its own time is forced unsure. With no witness
    (a piece no provider transcribed) the re-check's own confidence decides."""
    out = [dict(s) for s in primary if not inside(s, wins)]
    for seg in rechecked:
        if not inside(seg, wins):
            continue
        s = dict(seg, recheck=True)
        if witnesses:
            best = max(similarity(s["text"], text_between(w, s["start"], s["end"])) for w in witnesses)
            if best < AGREE:
                s["force_unsure"] = True
        out.append(s)
    return sorted(out, key=lambda s: (s["start"], s["end"]))


def agreement(a_segs: list[dict], b_segs: list[dict]) -> float:
    """Share of tokens the two transcripts align on (for the run's numbers; never the text)."""
    wa, wb = word_list(a_segs), word_list(b_segs)
    if not wa and not wb:
        return 1.0
    end = max([w[2] for w in wa + wb] + [0.0])
    cuts = block_cuts(wa, wb, end)
    matched = 0
    for ba, bb in zip(_blocks(wa, cuts), _blocks(wb, cuts)):
        sm = SequenceMatcher(None, [w[0] for w in ba], [w[0] for w in bb], autojunk=False)
        matched += sum(m.size for m in sm.get_matching_blocks())
    return round(2.0 * matched / (len(wa) + len(wb)), 3)
