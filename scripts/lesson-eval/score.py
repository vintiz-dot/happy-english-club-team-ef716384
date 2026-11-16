"""Scorer for lesson-eval: WER/CER, DER, identification-by-threshold, learner-error tally.

Subcommands (each has --help):
  wer       WER/CER with a strict normaliser; per-language WER for code-switching
  der       diarization error rate from RTTM (miss / false alarm / confusion)
  ident     identification accuracy by confidence threshold, EER, "unknown below T"
  preserve  learner-error preservation tally from a hand-annotated slice
  validate  check a result JSON against the common schema (result_schema.json)
  to-rttm   result JSON -> RTTM (speaker turns)      to-text  result JSON -> TSV

TEXT NORMALISATION (documented contract; it must not hide learner errors)
  strict (default): Unicode NFC, lower-case, curly apostrophe -> ', every
     punctuation/symbol character -> space EXCEPT an apostrophe inside a word
     (don't, it's), whitespace collapsed. Diacritics are KEPT (Vietnamese tone
     marks are part of the word). NOTHING else: no contraction expansion, no
     number words <-> digits, no spelling or grammar canonicalisation, fillers
     and repetitions stay. "he go" vs "he goes" is a substitution, always.
  nofill: strict, then filler tokens (um uh er ah eh hmm mm ừ ờ ừm) dropped.
     Use only to measure how much of a gap is fillers; report strict as primary.
  CER is computed on the normalised text with spaces removed.

CODE-SWITCHING: a reference token may carry a tag, `word|vi` or `word|en`.
  Untagged tokens are auto-tagged: vi if they contain a Vietnamese-specific
  letter (ă â đ ê ô ơ ư or a tone-marked vowel), else en. Toneless Vietnamese
  (ba, con, anh) is mis-tagged en by the auto rule - tag those explicitly.
  Substitutions and deletions count against the reference word's language;
  insertions against the inserted hypothesis word's auto-detected language.

DER: frame-based (10 ms) with an optimal one-to-one speaker mapping
  (Hungarian on overlap time); --collar s excludes +-collar around every
  reference boundary; --no-overlap excludes frames with >1 reference speaker.
  DER = (miss + false alarm + confusion) / reference speech time.

IDENT: input CSV turn_id,true_code,pred_code,score[,enrolled]. A true speaker
  that is not enrolled (enrolled=0, or not in --enrolled) must come out
  UNKNOWN. At threshold T a prediction with score < T becomes UNKNOWN. Per T:
  accuracy, false-accept (a wrong child shown: misidentified enrolled child or
  any child for a non-enrolled speaker) / all turns, false-reject (correct
  child but score < T) / enrolled turns, unknown rate. Recommendation (fails
  closed): the smallest T whose 95% Wilson UPPER bound of false-accept is
  <= --fa-target (default 1%); if no T achieves that, the smallest T whose
  observed rate does, flagged "insufficient evidence" (with few turns 1%
  cannot be shown: zero false accepts in ~300 turns are needed).
  EER is the top-1 verification EER: genuine = pred is the true child,
  impostor = pred is any wrong answer. Every rate carries a 95% Wilson
  interval. recommendation_split meets the target on the closed-set and the
  open-set rows SEPARATELY (T = the larger of the two), so easy closed-set
  turns cannot dilute open-set false accepts. Optional column `group` (e.g. a
  turn-length bin) with --by-group repeats the report per group.

PRESERVE: annotated reference = the verbatim words the child said, with each
  learner error marked {spoken=>correct}: "he {go=>goes} to school",
  omission "I like {=>the} dog", extra word "I {am=>} like". For each
  system the hypothesis is aligned to the verbatim reference; each mark is
  preserved (hyp has the spoken form), corrected (hyp has the correct form:
  silently fixed), or other (misrecognised).
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

# ----------------------------------------------------------------- normaliser
FILLERS = {"um", "uh", "er", "ah", "eh", "hmm", "mm", "erm", "ừ", "ờ", "ừm", "ờm"}
VI_LETTERS = set("ăâđêôơư"
                 "àáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ")


def _is_punct(ch: str) -> bool:
    return unicodedata.category(ch)[0] in "PS"


def normalise(text: str, mode: str = "strict") -> list[str]:
    """Tokens of `text` under the documented normaliser (see module docstring)."""
    t = unicodedata.normalize("NFC", text).lower().replace("’", "'").replace("‘", "'")
    out = []
    for i, ch in enumerate(t):
        if ch == "'":
            prev = t[i - 1] if i > 0 else " "
            nxt = t[i + 1] if i + 1 < len(t) else " "
            out.append(ch if (prev.isalnum() and nxt.isalnum()) else " ")
        elif _is_punct(ch):
            out.append(" ")
        else:
            out.append(ch)
    toks = "".join(out).split()
    if mode == "nofill":
        toks = [w for w in toks if w not in FILLERS]
    elif mode != "strict":
        raise ValueError(f"unknown normaliser mode {mode}")
    return toks


def detect_lang(tok: str) -> str:
    return "vi" if any(c in VI_LETTERS for c in tok.lower()) else "en"


def split_tags(text: str) -> tuple[str, list[str | None]]:
    """Strip `word|xx` tags; return (plain text, per-whitespace-token tag or None)."""
    words, tags = [], []
    for raw in text.split():
        m = re.match(r"^(.*)\|(en|vi)$", raw)
        words.append(m.group(1) if m else raw)
        tags.append(m.group(2) if m else None)
    return " ".join(words), tags


def tagged_tokens(text: str, mode: str = "strict") -> list[tuple[str, str]]:
    """Normalised (token, lang) pairs; a tag applies to every token its word yields."""
    out = []
    for raw in text.split():
        m = re.match(r"^(.*)\|(en|vi)$", raw)
        word, tag = (m.group(1), m.group(2)) if m else (raw, None)
        for tok in normalise(word, mode):
            out.append((tok, tag or detect_lang(tok)))
    return out


# ------------------------------------------------------------------ alignment
def align(ref: list[str], hyp: list[str]) -> list[tuple[str, int | None, int | None]]:
    """Levenshtein alignment -> ops (op, ref_idx, hyp_idx), op in eq/sub/del/ins.

    The error count (S+D+I) is always the minimum. Among alignments with that
    minimum the one with most exact matches wins, then the one whose
    substitutions are closest in spelling (mèo->mẹo rather than very->mẹo), so
    errors are attributed to the right word and language. Cost is O(n*m) in
    pure Python: score at utterance/segment level, not whole lessons as one id.
    """
    E, H = 10 ** 12, 10 ** 6  # lexicographic weights: errors >> matches >> spelling distance
    n, m = len(ref), len(hyp)

    def sub_cost(a: str, b: str) -> int:
        if a == b:
            return -H
        return E + min(99, _chardist(a, b))

    d = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        d[i][0] = i * E
    for j in range(m + 1):
        d[0][j] = j * E
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            d[i][j] = min(d[i - 1][j - 1] + sub_cost(ref[i - 1], hyp[j - 1]), d[i - 1][j] + E, d[i][j - 1] + E)
    ops = []
    i, j = n, m
    while i > 0 or j > 0:
        if i > 0 and j > 0 and d[i][j] == d[i - 1][j - 1] + sub_cost(ref[i - 1], hyp[j - 1]):
            ops.append(("eq" if ref[i - 1] == hyp[j - 1] else "sub", i - 1, j - 1))
            i, j = i - 1, j - 1
        elif i > 0 and d[i][j] == d[i - 1][j] + E:
            ops.append(("del", i - 1, None))
            i -= 1
        else:
            ops.append(("ins", None, j - 1))
            j -= 1
    return ops[::-1]


def _chardist(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j - 1] + (ca != cb), prev[j] + 1, cur[j - 1] + 1))
        prev = cur
    return prev[-1]


@dataclass
class ErrCounts:
    n: int = 0
    sub: int = 0
    dele: int = 0
    ins: int = 0
    hits: int = 0

    def add(self, o: "ErrCounts"):
        self.n += o.n; self.sub += o.sub; self.dele += o.dele; self.ins += o.ins; self.hits += o.hits

    @property
    def errors(self) -> int:
        return self.sub + self.dele + self.ins

    @property
    def rate(self) -> float | None:
        return self.errors / self.n if self.n else None

    def as_dict(self, prefix=""):
        return {f"{prefix}n": self.n, f"{prefix}sub": self.sub, f"{prefix}del": self.dele,
                f"{prefix}ins": self.ins, f"{prefix}rate": None if self.rate is None else round(self.rate, 4)}


def count(ref: list[str], hyp: list[str]) -> ErrCounts:
    c = ErrCounts(n=len(ref))
    for op, _, _ in align(ref, hyp):
        if op == "eq":
            c.hits += 1
        elif op == "sub":
            c.sub += 1
        elif op == "del":
            c.dele += 1
        else:
            c.ins += 1
    return c


def wer_pair(ref_text: str, hyp_text: str, mode: str = "strict") -> dict:
    """WER, CER and per-language WER for one reference/hypothesis pair."""
    rt = tagged_tokens(ref_text, mode)
    ref = [t for t, _ in rt]
    hyp = normalise(split_tags(hyp_text)[0], mode)
    w = count(ref, hyp)
    c = count(list("".join(ref)), list("".join(hyp)))
    per = {}
    for op, ri, hj in align(ref, hyp):
        lang = rt[ri][1] if ri is not None else detect_lang(hyp[hj])
        e = per.setdefault(lang, ErrCounts())
        if op == "ins":
            e.ins += 1
            continue
        e.n += 1
        if op == "eq":
            e.hits += 1
        elif op == "sub":
            e.sub += 1
        else:
            e.dele += 1
    return {"wer": w, "cer": c, "per_lang": per}


def read_tsv(path: Path) -> dict[str, str]:
    out = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n\r")
            if not line.strip() or line.startswith("#"):
                continue
            k, _, v = line.partition("\t")
            out[k] = v
    return out


def texts_from(path: Path) -> dict[str, str]:
    """TSV (id<TAB>text) or a result JSON (text joined from its words)."""
    if path.suffix.lower() == ".json":
        doc = json.loads(path.read_text(encoding="utf-8"))
        return {f["file_id"]: " ".join(w["w"] for w in f.get("words", [])) for f in doc["files"]}
    return read_tsv(path)


def cmd_wer(a) -> int:
    refs, hyps = read_tsv(a.ref), texts_from(a.hyp)
    tw, tc, tl = ErrCounts(), ErrCounts(), {}
    rows = []
    for k, r in refs.items():
        h = hyps.get(k, "")
        res = wer_pair(r, h, a.mode)
        tw.add(res["wer"]); tc.add(res["cer"])
        for lg, e in res["per_lang"].items():
            tl.setdefault(lg, ErrCounts()).add(e)
        rows.append({"id": k, "missing_hyp": k not in hyps, **res["wer"].as_dict("w_"), "cer": res["cer"].rate})
    out = {"mode": a.mode, "files": len(refs), "wer": tw.as_dict(), "cer": tc.as_dict(),
           "per_lang": {k: v.as_dict() for k, v in sorted(tl.items())}, "per_file": rows}
    print(json.dumps(out, indent=1, ensure_ascii=False))
    return 0


# ------------------------------------------------------------------------ DER
def read_rttm(path: Path) -> dict[str, list[tuple[float, float, str]]]:
    by: dict[str, list] = {}
    with open(path, encoding="utf-8") as f:
        for line in f:
            p = line.split()
            if not p or p[0] != "SPEAKER":
                continue
            s, d = float(p[3]), float(p[4])
            by.setdefault(p[1], []).append((s, s + d, p[7]))
    return by


def der_file(ref, hyp, collar: float = 0.0, skip_overlap: bool = False, step: float = 0.01) -> dict:
    """Frame-based DER for one file. ref/hyp: [(start, end, speaker)]."""
    import numpy as np
    from scipy.optimize import linear_sum_assignment

    end = max([e for _, e, _ in ref] + [e for _, e, _ in hyp] + [0.0])
    nf = int(math.ceil(end / step)) + 1
    rs = sorted({s for _, _, s in ref})
    hs = sorted({s for _, _, s in hyp})
    R = np.zeros((len(rs), nf), bool)
    H = np.zeros((len(hs), nf), bool)
    for s, e, k in ref:
        R[rs.index(k), int(round(s / step)): int(round(e / step))] = True
    for s, e, k in hyp:
        H[hs.index(k), int(round(s / step)): int(round(e / step))] = True
    score = np.ones(nf, bool)
    if collar > 0:
        c = int(round(collar / step))
        for s, e, _ in ref:
            for b in (int(round(s / step)), int(round(e / step))):
                score[max(0, b - c): b + c] = False
    nref = R.sum(0)
    if skip_overlap:
        score &= nref <= 1
    nsys = H.sum(0)
    mapping = {}
    if rs and hs:
        ov = (R[:, None, :] & H[None, :, :] & score).sum(-1)
        ri, hi = linear_sum_assignment(-ov)
        mapping = {hs[j]: rs[i] for i, j in zip(ri, hi) if ov[i, j] > 0}
    correct = np.zeros(nf, int)
    for h, r in mapping.items():
        correct += R[rs.index(r)] & H[hs.index(h)]
    nr, ns, nc = nref[score], nsys[score], correct[score]
    miss = np.maximum(nr - ns, 0).sum() * step
    fa = np.maximum(ns - nr, 0).sum() * step
    conf = (np.minimum(nr, ns) - nc).sum() * step
    total = nr.sum() * step
    return {"ref_speech_s": round(total, 3), "miss_s": round(miss, 3), "fa_s": round(fa, 3),
            "conf_s": round(conf, 3), "der": round((miss + fa + conf) / total, 4) if total else None,
            "ref_speakers": len(rs), "sys_speakers": len(hs), "mapping": mapping}


def cmd_der(a) -> int:
    ref, hyp = read_rttm(a.ref), read_rttm(a.hyp)
    per, tot = {}, {"ref_speech_s": 0.0, "miss_s": 0.0, "fa_s": 0.0, "conf_s": 0.0}
    for f in sorted(ref):
        r = der_file(ref[f], hyp.get(f, []), a.collar, a.no_overlap)
        per[f] = r
        for k in tot:
            tot[k] += r[k]
    t = tot["ref_speech_s"]
    out = {"collar": a.collar, "overlap_scored": not a.no_overlap, "files": len(per),
           "der": round((tot["miss_s"] + tot["fa_s"] + tot["conf_s"]) / t, 4) if t else None,
           "miss": round(tot["miss_s"] / t, 4) if t else None, "false_alarm": round(tot["fa_s"] / t, 4) if t else None,
           "confusion": round(tot["conf_s"] / t, 4) if t else None,
           "speaker_count_exact": sum(1 for r in per.values() if r["ref_speakers"] == r["sys_speakers"]),
           "per_file": per}
    print(json.dumps(out, indent=1))
    return 0


# ---------------------------------------------------------- identification
UNKNOWN = "UNKNOWN"


@dataclass
class Turn:
    tid: str
    true: str
    pred: str
    score: float
    enrolled: bool
    group: str = ""

    @property
    def answer(self) -> str:
        return self.true if self.enrolled else UNKNOWN


def wilson_upper(k: int, n: int, z: float = 1.96) -> float | None:
    if n == 0:
        return None
    p = k / n
    den = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (c + r) / den


def wilson_interval(k: int, n: int, z: float = 1.96) -> tuple[float, float] | None:
    """Two-sided 95% Wilson score interval for k successes in n trials."""
    if n == 0:
        return None
    p = k / n
    den = 1 + z * z / n
    c = p + z * z / (2 * n)
    r = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
    return (max(0.0, (c - r) / den), min(1.0, (c + r) / den))


def ident_at(turns: list[Turn], t: float) -> dict:
    n = len(turns)
    enr = [x for x in turns if x.enrolled]
    acc = fa = fr = unk = mis = open_fa = 0
    for x in turns:
        dec = x.pred if (x.pred != UNKNOWN and x.score >= t) else UNKNOWN
        if dec == x.answer:
            acc += 1
        if dec == UNKNOWN:
            unk += 1
            if x.enrolled and x.pred == x.true:
                fr += 1
        else:
            if dec != x.answer:
                fa += 1
                if x.enrolled:
                    mis += 1
                else:
                    open_fa += 1
    return {"threshold": t, "turns": n, "accuracy": acc / n if n else None,
            "false_accept": fa / n if n else None, "false_accept_n": fa,
            "fa_upper95": wilson_upper(fa, n), "fa_ci95": wilson_interval(fa, n),
            "accuracy_ci95": wilson_interval(acc, n), "misid_enrolled": mis, "open_set_accepts": open_fa,
            "false_reject": fr / len(enr) if enr else None, "unknown_rate": unk / n if n else None}


def eer(turns: list[Turn]) -> dict:
    gen = sorted(x.score for x in turns if x.pred != UNKNOWN and x.enrolled and x.pred == x.true)
    imp = sorted(x.score for x in turns if x.pred != UNKNOWN and x.pred != x.answer)
    if not gen or not imp:
        return {"eer": None, "eer_threshold": None, "genuine": len(gen), "impostor": len(imp)}
    best = None
    for t in sorted(set(gen + imp)):
        frr = sum(1 for s in gen if s < t) / len(gen)
        far = sum(1 for s in imp if s >= t) / len(imp)
        if best is None or abs(far - frr) < best[0]:
            best = (abs(far - frr), (far + frr) / 2, t)
    return {"eer": round(best[1], 4), "eer_threshold": best[2], "genuine": len(gen), "impostor": len(imp)}


def recommend(turns: list[Turn], fa_target: float = 0.01) -> dict:
    """Fail-closed: prefer the smallest T whose 95% UPPER bound meets the target;
    only if none does, the smallest T whose observed rate does, flagged insufficient."""
    cands = sorted({x.score for x in turns} | {math.inf})
    rs = [ident_at(turns, t) for t in cands]
    for r in rs:
        if r["fa_upper95"] is not None and r["fa_upper95"] <= fa_target:
            return {"rule": f"UNKNOWN below T={r['threshold']}", "threshold": r["threshold"],
                    "fa_target": fa_target, "observed": r, "evidence": "sufficient"}
    for r in rs:
        if r["false_accept"] is not None and r["false_accept"] <= fa_target:
            return {"rule": f"UNKNOWN below T={r['threshold']}", "threshold": r["threshold"],
                    "fa_target": fa_target, "observed": r,
                    "evidence": f"insufficient: 95% upper bound of false-accept {r['fa_upper95']:.3f} > target; "
                                f"needs about {math.ceil(3 / fa_target)} turns with no false accept"}
    return {"rule": "no threshold meets the target", "threshold": None, "fa_target": fa_target}


def recommend_split(turns: list[Turn], fa_target: float = 0.01) -> dict:
    """Operating threshold that meets the target on BOTH populations separately:
    closed-set (enrolled speakers: a wrong child shown) and open-set (unenrolled
    speakers: any child shown). Pooling them would let many easy closed-set turns
    dilute the open-set false accepts. T = max of the two per-population T's; if
    either population has no threshold, there is none. Fails closed like
    recommend(): "sufficient" only when both 95% upper bounds meet the target."""
    parts = {"closed": [x for x in turns if x.enrolled], "open": [x for x in turns if not x.enrolled]}
    out, ts, ev = {"fa_target": fa_target}, [], "sufficient"
    for k, sub in parts.items():
        if not sub:
            out[k] = None
            continue
        r = recommend(sub, fa_target)
        out[k] = {"threshold": r["threshold"], "evidence": r.get("evidence"), "turns": len(sub)}
        if r["threshold"] is None:
            out["threshold"] = None
            out["evidence"] = f"no threshold meets the target on the {k} set"
            return out
        ts.append(r["threshold"])
        if r.get("evidence") != "sufficient":
            ev = "insufficient"
    out["threshold"] = max(ts) if ts else None
    out["evidence"] = ev
    if out["threshold"] is not None:
        out["observed"] = ident_at(turns, out["threshold"])
        out["observed_closed"] = ident_at(parts["closed"], out["threshold"]) if parts["closed"] else None
        out["observed_open"] = ident_at(parts["open"], out["threshold"]) if parts["open"] else None
    return out


def ident_report(turns: list[Turn], ts: list[float], fa_target: float) -> dict:
    return {"turns": len(turns), "enrolled_turns": sum(x.enrolled for x in turns),
            "open_set_turns": sum(not x.enrolled for x in turns),
            "by_threshold": [ident_at(turns, t) for t in ts], "eer": eer(turns),
            "recommendation": recommend(turns, fa_target),
            "recommendation_split": recommend_split(turns, fa_target)}


def read_ident(path: Path, enrolled: set[str] | None) -> list[Turn]:
    turns = []
    with open(path, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pred = (r.get("pred_code") or "").strip() or UNKNOWN
            true = r["true_code"].strip()
            if "enrolled" in r and r["enrolled"] != "":
                en = r["enrolled"].strip() in ("1", "true", "yes")
            else:
                en = enrolled is None or true in enrolled
            sc = r.get("score", "")
            turns.append(Turn(r["turn_id"], true, pred.upper() if pred.upper() == UNKNOWN else pred,
                              float(sc) if sc not in ("", None) else -math.inf, en,
                              (r.get("group") or "").strip()))
    return turns


def cmd_ident(a) -> int:
    enrolled = None
    if a.enrolled:
        enrolled = set(re.split(r"[,\s]+", Path(a.enrolled).read_text(encoding="utf-8").strip())) \
            if Path(a.enrolled).exists() else set(a.enrolled.split(","))
    turns = read_ident(a.table, enrolled)
    ts = [float(t) for t in a.thresholds.split(",")] if a.thresholds else \
        sorted({round(x.score, 3) for x in turns if math.isfinite(x.score)})
    out = ident_report(turns, ts, a.fa_target)
    if a.by_group:
        out["by_group"] = {g: ident_report([x for x in turns if x.group == g], ts, a.fa_target)
                           for g in sorted({x.group for x in turns})}
    print(json.dumps(out, indent=1, default=lambda v: None if v in (math.inf, -math.inf) else v))
    return 0


# ------------------------------------------------- learner-error preservation
MARK = re.compile(r"\{([^{}]*?)=>([^{}]*?)\}")


def parse_annotated(text: str, mode: str = "strict"):
    """-> (verbatim ref tokens, [(start, end, spoken_tokens, correct_tokens)])."""
    toks, spans, pos = [], [], 0
    for m in MARK.finditer(text):
        toks += normalise(text[pos: m.start()], mode)
        spoken, correct = normalise(m.group(1), mode), normalise(m.group(2), mode)
        spans.append((len(toks), len(toks) + len(spoken), spoken, correct))
        toks += spoken
        pos = m.end()
    toks += normalise(text[pos:], mode)
    return toks, spans


def classify_marks(annotated: str, hyp_text: str, mode: str = "strict") -> list[str]:
    ref, spans = parse_annotated(annotated, mode)
    hyp = normalise(hyp_text, mode)
    ops = align(ref, hyp)
    at: dict[int, list[str]] = {}      # hyp tokens aligned to ref position i
    gap: dict[int, list[str]] = {}     # hyp tokens inserted before ref position i
    i_next = 0
    for op, ri, hj in ops:
        if op == "ins":
            gap.setdefault(i_next, []).append(hyp[hj])
        elif op == "del":
            at[ri] = []
            i_next = ri + 1
        else:
            at[ri] = [hyp[hj]]
            i_next = ri + 1
    res = []
    for s, e, spoken, correct in spans:
        inner = []
        for i in range(s, e):
            if i > s:
                inner += gap.get(i, [])
            inner += at.get(i, [])
        wide = gap.get(s, []) + inner + (gap.get(e, []) if e > s else [])
        if s == e:  # omission: spoken nothing
            ins = gap.get(s, [])
            res.append("preserved" if not ins else "corrected" if ins == correct else "other")
        elif inner == spoken:
            res.append("preserved")
        elif inner == correct or wide == correct:
            res.append("corrected")
        else:
            res.append("other")
    return res


def cmd_preserve(a) -> int:
    refs = read_tsv(a.ref)
    out = {}
    for spec in a.hyp:
        name, _, path = spec.partition("=")
        hyps = texts_from(Path(path))
        t = {"preserved": 0, "corrected": 0, "other": 0, "missing_hyp": 0}
        for k, r in refs.items():
            if k not in hyps:
                t["missing_hyp"] += 1
            for c in classify_marks(r, hyps.get(k, ""), a.mode):
                t[c] += 1
        marks = t["preserved"] + t["corrected"] + t["other"]
        t["marks"] = marks
        t["preservation_rate"] = round(t["preserved"] / marks, 4) if marks else None
        t["silent_correction_rate"] = round(t["corrected"] / marks, 4) if marks else None
        out[name] = t
    print(json.dumps(out, indent=1))
    return 0


# ------------------------------------------------------------ result schema
SCHEMA_ID = "hec-lesson-eval/1"


def validate_result(doc: dict) -> list[str]:
    """Hand-rolled check of the common result schema (see result_schema.json)."""
    errs = []
    if doc.get("schema") != SCHEMA_ID:
        errs.append(f"schema must be {SCHEMA_ID!r}")
    sysd = doc.get("system")
    if not isinstance(sysd, dict) or not sysd.get("name") or sysd.get("kind") not in ("local", "vendor"):
        errs.append("system.name required; system.kind must be 'local' or 'vendor'")
    files = doc.get("files")
    if not isinstance(files, list):
        return errs + ["files must be a list"]
    for fi, f in enumerate(files):
        where = f"files[{fi}]"
        if not f.get("file_id"):
            errs.append(f"{where}.file_id required")
        for wi, w in enumerate(f.get("words", [])):
            if not isinstance(w.get("w"), str):
                errs.append(f"{where}.words[{wi}].w must be a string")
            for k in ("start", "end"):
                if not isinstance(w.get(k), (int, float)):
                    errs.append(f"{where}.words[{wi}].{k} must be a number")
            if isinstance(w.get("start"), (int, float)) and isinstance(w.get("end"), (int, float)) and w["end"] < w["start"]:
                errs.append(f"{where}.words[{wi}] end < start")
            c = w.get("conf")
            if c is not None and not (isinstance(c, (int, float)) and 0 <= c <= 1):
                errs.append(f"{where}.words[{wi}].conf must be in [0,1] or null")
        for ti, t in enumerate(f.get("turns", [])):
            for k in ("start", "end"):
                if not isinstance(t.get(k), (int, float)):
                    errs.append(f"{where}.turns[{ti}].{k} must be a number")
            if not t.get("speaker"):
                errs.append(f"{where}.turns[{ti}].speaker required")
            sug = t.get("id_suggestion")
            if sug is not None and (not isinstance(sug, dict) or "code" not in sug or "score" not in sug):
                errs.append(f"{where}.turns[{ti}].id_suggestion needs code and score (or null)")
    return errs


def turns_of(f: dict, gap: float = 0.5) -> list[tuple[float, float, str]]:
    if f.get("turns"):
        return [(t["start"], t["end"], t["speaker"]) for t in f["turns"]]
    out = []
    for w in f.get("words", []):
        spk = w.get("speaker")
        if spk is None:
            continue
        if out and out[-1][2] == spk and w["start"] - out[-1][1] <= gap:
            out[-1] = (out[-1][0], max(out[-1][1], w["end"]), spk)
        else:
            out.append((w["start"], w["end"], spk))
    return out


def cmd_validate(a) -> int:
    errs = validate_result(json.loads(Path(a.result).read_text(encoding="utf-8")))
    for e in errs:
        print("ERROR", e)
    print("OK" if not errs else f"{len(errs)} error(s)")
    return 1 if errs else 0


def cmd_to_rttm(a) -> int:
    doc = json.loads(Path(a.result).read_text(encoding="utf-8"))
    for f in doc["files"]:
        for s, e, spk in turns_of(f):
            print(f"SPEAKER {f['file_id']} 1 {s:.3f} {e - s:.3f} <NA> <NA> {spk} <NA> <NA>")
    return 0


def cmd_to_text(a) -> int:
    for k, v in texts_from(Path(a.result)).items():
        print(f"{k}\t{v}")
    return 0


def main(argv=None) -> int:
    try:  # Windows consoles default to cp1252, which cannot print Vietnamese
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("wer", help="WER/CER; ref TSV id<TAB>text, hyp TSV or result JSON")
    p.add_argument("--ref", type=Path, required=True); p.add_argument("--hyp", type=Path, required=True)
    p.add_argument("--mode", choices=["strict", "nofill"], default="strict"); p.set_defaults(fn=cmd_wer)
    p = sub.add_parser("der", help="DER from reference and system RTTM")
    p.add_argument("--ref", type=Path, required=True); p.add_argument("--hyp", type=Path, required=True)
    p.add_argument("--collar", type=float, default=0.0)
    p.add_argument("--no-overlap", action="store_true", help="exclude overlapped reference frames")
    p.set_defaults(fn=cmd_der)
    p = sub.add_parser("ident", help="identification by threshold")
    p.add_argument("--table", type=Path, required=True)
    p.add_argument("--enrolled", help="comma list or file of enrolled codes (else column 'enrolled', else all)")
    p.add_argument("--thresholds", help="comma list (default: every observed score)")
    p.add_argument("--fa-target", type=float, default=0.01)
    p.add_argument("--by-group", action="store_true", help="also report per value of the optional 'group' column")
    p.set_defaults(fn=cmd_ident)
    p = sub.add_parser("preserve", help="learner-error preservation tally")
    p.add_argument("--ref", type=Path, required=True, help="TSV id<TAB>annotated verbatim reference")
    p.add_argument("--hyp", action="append", required=True, help="name=path (TSV or result JSON), repeatable")
    p.add_argument("--mode", choices=["strict", "nofill"], default="strict"); p.set_defaults(fn=cmd_preserve)
    for name, fn in (("validate", cmd_validate), ("to-rttm", cmd_to_rttm), ("to-text", cmd_to_text)):
        p = sub.add_parser(name); p.add_argument("result", type=Path); p.set_defaults(fn=fn)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
