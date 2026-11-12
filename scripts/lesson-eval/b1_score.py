"""B1 scoring: every result under work\\vendor\\ -> comparison tables.

    python scripts\\lesson-eval\\b1_score.py [--evidence docs\\evidence\\B1-transcripts.md]
    python scripts\\lesson-eval\\b1_score.py preserve      # once the teacher's annotated slice exists

Reads every result_*.json (schema hec-lesson-eval/1) under work\\vendor\\ -
vendors and local systems alike - and writes markdown + CSV tables to
work\\b1\\. With --evidence, the AGGREGATE tables (numbers, system names and
codes only; never a transcript word, name or source file name) are written
between the B1-TABLES markers of that evidence file.

WHAT IS AND IS NOT MEASURED (no human reference exists for any audio):
  (a) synthetic mixes: speakers found vs true, DER against the mix RTTMs
      (collar 0.25 s, with and without overlapped speech). The mixes carry NO
      reference transcript, so there is no word accuracy here either.
  (b) pairwise word AGREEMENT between systems (difflib matching blocks over
      normalised words, 2*matched/(len A + len B)). Agreement is not accuracy:
      two systems can agree and both be wrong.
  (c) learner-error preservation needs the teacher's annotation; until then a
      PROXY: how often systems differ on articles / function words / endings.
  (d) code-switching: share of words that are Vietnamese by the system's own
      language tag and by a diacritics heuristic (toneless Vietnamese counts
      as English, so shares are lower bounds), and what each system did in
      10-second windows where ANY system produced Vietnamese text.
  (e) compression cost: L1 (original) vs L4 (its 16 kHz / 32 kbps twin).
All tables carry UNCHECKED where no reference exists.
"""
from __future__ import annotations

import argparse
import csv
import difflib
import json
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
import score  # noqa: E402

START, END = "<!-- B1-TABLES-START -->", "<!-- B1-TABLES-END -->"
MIX_RE = re.compile(r"^mix_seed(\d+)_ov(\d+)_([a-z0-9]+)_(\d+)$")
SKIP_DIRS = {"_pieces", "pieces", "_inputs"}
INTERP_ALL = "interpolated-over-piece"      # word times spread over the whole piece: useless for windows
PRICE = {}                                  # filled lazily from vendor_batch.SYSTEMS


# ------------------------------------------------------------------ loading

def load_systems(vendor_root: Path) -> dict[str, dict]:
    """{system name: {meta, files{file_id: file}, runs[], dir}} from every result_*.json."""
    systems: dict[str, dict] = {}
    for p in sorted(vendor_root.rglob("result_*.json")):
        if SKIP_DIRS & set(p.relative_to(vendor_root).parts):
            continue
        try:
            doc = json.loads(p.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if score.validate_result(doc):
            continue
        name = doc["system"]["name"]
        s = systems.setdefault(name, {"meta": doc["system"], "files": {}, "runs": [], "dir": p.parent})
        s["meta"] = {**s["meta"], **doc["system"]}
        s["runs"].append(doc.get("run") or {})
        for f in doc["files"]:
            s["files"][f["file_id"]] = f
    return systems


def file_kind(fid: str) -> str:
    if fid.startswith("mix_"):
        return "synth"
    if re.match(r"^S\d+_held", fid):
        return "clips"
    if re.match(r"^L\d+$", fid):
        return "lesson"
    return "other"


def tokens_of(f: dict, t_max: float | None = None) -> list[str]:
    ws = [w["w"] for w in f.get("words", []) if t_max is None or w["start"] < t_max]
    return score.normalise(" ".join(ws))


def word_timing(meta: dict) -> str:
    return str((meta.get("settings") or {}).get("word_timing") or "vendor")


# ---------------------------------------------------------------- (a) synth

def parse_mix(fid: str) -> dict | None:
    m = MIX_RE.match(fid)
    if not m:
        return None
    return {"seed": int(m.group(1)), "overlap_pct": int(m.group(2)), "degrade": m.group(3), "tag": f"seed{m.group(1)}_ov{m.group(2)}_{m.group(3)}", "n": int(m.group(4))}


def has_speakers(f: dict) -> bool:
    return bool(f.get("turns")) or any(w.get("speaker") for w in f.get("words", []))


def speaker_seconds(f: dict) -> dict[str, float]:
    out: dict[str, float] = defaultdict(float)
    for s, e, spk in score.turns_of(f):
        out[spk] += e - s
    return dict(out)


def synth_rows(systems: dict, mix_root: Path) -> tuple[list[dict], list[dict]]:
    """(per-file rows, per-condition rows)."""
    per_file, agg = [], defaultdict(lambda: Counter())
    refs: dict[str, dict] = {}
    for name, s in sorted(systems.items()):
        for fid, f in sorted(s["files"].items()):
            info = parse_mix(fid)
            if not info:
                continue
            rp = mix_root / info["tag"] / f"{fid}.rttm"
            if not rp.exists():
                continue
            ref = refs.setdefault(fid, score.read_rttm(rp)).get(fid, [])
            n_true = len({k for _, _, k in ref})
            row = {"system": name, "file": fid, "overlap_pct": info["overlap_pct"], "degrade": info["degrade"],
                   "true_speakers": n_true, "found": "n/a", "found_ge5s": "n/a", "der_collar": None, "der_collar_no_overlap": None}
            if has_speakers(f):
                secs = speaker_seconds(f)
                row["found"] = len(secs)
                row["found_ge5s"] = sum(1 for v in secs.values() if v >= 5.0)
                hyp = score.turns_of(f)
                a = score.der_file(ref, hyp, 0.25, False)
                b = score.der_file(ref, hyp, 0.25, True)
                row["der_collar"], row["der_collar_no_overlap"] = a, b
                k = (name, info["overlap_pct"], info["degrade"])
                c = agg[k]
                c["files"] += 1
                c["exact"] += int(len(secs) == n_true)
                c["found"] += len(secs)
                c["true"] += n_true
                for pre, r in (("", a), ("no_", b)):
                    for m in ("ref_speech_s", "miss_s", "fa_s", "conf_s"):
                        c[pre + m] += r[m]
            per_file.append(row)
    cond = []
    for (name, ov, deg), c in sorted(agg.items()):
        def rate(pre, key):
            t = c[pre + "ref_speech_s"]
            return round(c[pre + key] / t, 3) if t else None
        cond.append({"system": name, "overlap_pct": ov, "degrade": deg, "files": c["files"], "speakers_exact": f"{c['exact']}/{c['files']}",
                     "found_total": c["found"], "true_total": c["true"],
                     "der": rate("", "miss_s") is not None and round(sum(rate("", k) for k in ("miss_s", "fa_s", "conf_s")), 3),
                     "miss": rate("", "miss_s"), "false_alarm": rate("", "fa_s"), "confusion": rate("", "conf_s"),
                     "der_no_overlap": round(sum(rate("no_", k) for k in ("miss_s", "fa_s", "conf_s")), 3) if c["no_ref_speech_s"] else None})
    return per_file, cond


# ------------------------------------------------------------ (b) agreement

def agreement(a: list[str], b: list[str]) -> tuple[int, int, int]:
    """(matched words, len a, len b) by difflib matching blocks; not accuracy."""
    if not a or not b:
        return 0, len(a), len(b)
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    return sum(bl.size for bl in sm.get_matching_blocks()), len(a), len(b)


def ratio(m: int, la: int, lb: int) -> float | None:
    return round(2 * m / (la + lb), 3) if la + lb else None


def common_tokens(fa: dict, fb: dict) -> tuple[list[str], list[str]]:
    """Both files' words over the SHORTER duration (a 5-minute local slice
    is compared with the same first 5 minutes of the vendor's answer)."""
    da, db = fa.get("duration_s"), fb.get("duration_s")
    t = min(x for x in (da, db) if x) if da and db and da != db else None
    return tokens_of(fa, t), tokens_of(fb, t)


def agreement_matrix(systems: dict, group: str) -> tuple[list[str], dict]:
    """Pooled pairwise agreement over the files of `group` ('synth'|'clips'|'lesson')."""
    names = sorted(systems)
    cell: dict = {}
    for i, x in enumerate(names):
        for y in names[i + 1:]:
            tm = ta = tb = 0
            n = 0
            for fid, fx in systems[x]["files"].items():
                if file_kind(fid) != group or fid not in systems[y]["files"]:
                    continue
                if group == "lesson" and fid == "L4":
                    continue  # the compressed twin is its own table (e)
                a, b = common_tokens(fx, systems[y]["files"][fid])
                m, la, lb = agreement(a, b)
                tm, ta, tb, n = tm + m, ta + la, tb + lb, n + 1
            if n:
                cell[(x, y)] = (ratio(tm, ta, tb), n)
    return names, cell


def per_file_spread(systems: dict, group: str) -> list[dict]:
    """For each file: the least and most agreeing system pair (where systems disagree most)."""
    rows = []
    ids = sorted({fid for s in systems.values() for fid in s["files"] if file_kind(fid) == group and fid != "L4"})
    for fid in ids:
        have = sorted(n for n, s in systems.items() if fid in s["files"])
        pairs = []
        for i, x in enumerate(have):
            for y in have[i + 1:]:
                a, b = common_tokens(systems[x]["files"][fid], systems[y]["files"][fid])
                pairs.append((ratio(*agreement(a, b)), x, y))
        pairs = [p for p in pairs if p[0] is not None]
        if pairs:
            lo, hi = min(pairs), max(pairs)
            rows.append({"file": fid, "systems": len(have), "lowest": f"{lo[0]} ({lo[1]} vs {lo[2]})", "highest": f"{hi[0]} ({hi[1]} vs {hi[2]})"})
    return rows


# ---------------------------------------------------- (c) proxy: error kinds

ARTICLES = {"a", "an", "the"}
FUNCTION = set("i you he she it we they me him her us them my your his its our their is am are was were be been being do does did have has had "
               "will would can could shall should may might to of in on at for with from by and or but so if that this these those there not no".split())


def _stem(t: str) -> str:
    for suf in ("ing", "ed", "es", "s", "d"):
        if t.endswith(suf) and len(t) - len(suf) >= 2:
            return t[: -len(suf)]
    return t


def classify_diff(x: str, y: str) -> str:
    """Kind of a one-word difference between two systems ('' = a missing word)."""
    present = [t for t in (x, y) if t]
    if any(t in ARTICLES for t in present):
        return "article"
    if x and y and x != y and (_stem(x) == _stem(y) or _stem(x) == y or _stem(y) == x):
        return "ending (-s/-ed/-ing)"
    if any(t in FUNCTION for t in present):
        return "function word"
    return "other word"


def diff_counts(a: list[str], b: list[str]) -> Counter:
    c: Counter = Counter()
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            c["compared_words"] += i2 - i1
            continue
        xs, ys = a[i1:i2], b[j1:j2]
        for k in range(max(len(xs), len(ys))):
            c[classify_diff(xs[k] if k < len(xs) else "", ys[k] if k < len(ys) else "")] += 1
            c["compared_words"] += 1
    return c


def proxy_rows(systems: dict) -> list[dict]:
    names, rows = sorted(systems), []
    for i, x in enumerate(names):
        for y in names[i + 1:]:
            tot: Counter = Counter()
            for fid, fx in systems[x]["files"].items():
                if file_kind(fid) == "clips" and fid in systems[y]["files"]:
                    tot.update(diff_counts(*common_tokens(fx, systems[y]["files"][fid])))
            if tot["compared_words"]:
                n = tot["compared_words"]
                rows.append({"pair": f"{x} vs {y}", "compared_words": n,
                             **{k: tot[k] for k in ("article", "function word", "ending (-s/-ed/-ing)", "other word")},
                             "article_per_100": round(100 * tot["article"] / n, 2),
                             "function_per_100": round(100 * tot["function word"] / n, 2),
                             "ending_per_100": round(100 * tot["ending (-s/-ed/-ing)"] / n, 2)})
    return rows


def tally_preserve(annotated: dict[str, str], hyps: dict[str, str], mode: str = "strict") -> dict:
    """Learner-error preservation per system from the teacher's annotated slice.
    annotated: {id: verbatim text with {spoken=>correct} marks}; hyps: {system: text of the same stretch}.
    The ids are joined in sorted order into one reference."""
    ref = " ".join(annotated[k] for k in sorted(annotated))
    out = {}
    for name, text in sorted(hyps.items()):
        c = Counter(score.classify_marks(ref, text, mode))
        marks = sum(c.values())
        out[name] = {"marks": marks, "preserved": c["preserved"], "corrected": c["corrected"], "other": c["other"],
                     "preservation_rate": round(c["preserved"] / marks, 3) if marks else None,
                     "silent_correction_rate": round(c["corrected"] / marks, 3) if marks else None}
    return out


# --------------------------------------------------------- (d) code-switching

def is_vi(tok: str) -> bool:
    return score.detect_lang(tok) == "vi"


def codeswitch_rows(systems: dict) -> list[dict]:
    rows = []
    for name, s in sorted(systems.items()):
        n = tagged = tagged_vi = diac = 0
        for fid, f in s["files"].items():
            if file_kind(fid) != "lesson":
                continue
            for w in f.get("words", []):
                for tok in score.normalise(w["w"]):
                    n += 1
                    diac += is_vi(tok)
                    if w.get("lang") in ("en", "vi"):
                        tagged += 1
                        tagged_vi += w["lang"] == "vi"
        if n:
            rows.append({"system": name, "lesson_words": n, "tagged_by_system": tagged,
                         "vi_by_tag_pct": round(100 * tagged_vi / tagged, 2) if tagged else "n/a (no language tag)",
                         "vi_by_diacritics_pct": round(100 * diac / n, 2)})
    return rows


def window_words(f: dict, w0: float, w1: float) -> list[str]:
    ws = [w["w"] for w in f.get("words", []) if w0 <= (w["start"] + w["end"]) / 2 < w1]
    return score.normalise(" ".join(ws))


def vi_window_rows(systems: dict, win: float = 10.0) -> tuple[list[dict], int]:
    """Reference-free: windows where ANY usable system wrote >= 3 Vietnamese-diacritic words;
    what each system did there. Returns (rows, number of such windows)."""
    usable = {n: s for n, s in systems.items() if word_timing(s["meta"]) != INTERP_ALL}
    counts = {n: Counter() for n in usable}
    n_windows = 0
    ids = sorted({fid for s in usable.values() for fid in s["files"] if file_kind(fid) == "lesson" and fid != "L4"})
    for fid in ids:
        have = {n: s["files"][fid] for n, s in usable.items() if fid in s["files"]}
        dur = min(f.get("duration_s") or 0 for f in have.values()) if have else 0
        for k in range(int(dur // win)):
            w0, w1 = k * win, (k + 1) * win
            texts = {n: window_words(f, w0, w1) for n, f in have.items()}
            if not any(sum(is_vi(t) for t in toks) >= 3 for toks in texts.values()):
                continue
            n_windows += 1
            top = max(len(t) for t in texts.values())
            for n, toks in texts.items():
                nvi = sum(is_vi(t) for t in toks)
                if nvi >= 2 or (toks and nvi / len(toks) >= 0.3):
                    counts[n]["vietnamese text"] += 1
                elif len(toks) < 0.3 * top:
                    counts[n]["dropped"] += 1
                else:
                    counts[n]["non-Vietnamese text (English/other)"] += 1
    rows = [{"system": n, "windows_seen": sum(c.values()), "vietnamese_text": c["vietnamese text"], "dropped": c["dropped"],
             "non_vietnamese_text": c["non-Vietnamese text (English/other)"]} for n, c in sorted(counts.items()) if c]
    return rows, n_windows


# -------------------------------------------------------- (e) compression

def compression_rows(systems: dict) -> list[dict]:
    rows = []
    for name, s in sorted(systems.items()):
        f1, f4 = s["files"].get("L1"), s["files"].get("L4")
        if not (f1 and f4):
            continue
        a, b = common_tokens(f1, f4)
        own = ratio(*agreement(a, b))
        vs_o, vs_c = [], []
        for other, so in systems.items():
            if other == name or "L1" not in so["files"]:
                continue
            x, y = common_tokens(f1, so["files"]["L1"])
            vs_o.append(ratio(*agreement(x, y)))
            x, y = common_tokens(f4, so["files"]["L1"])
            vs_c.append(ratio(*agreement(x, y)))
        vs_o, vs_c = [v for v in vs_o if v is not None], [v for v in vs_c if v is not None]
        rows.append({"system": name, "self_agreement_L1_vs_L4": own,
                     "mean_vs_others_original": round(sum(vs_o) / len(vs_o), 3) if vs_o else None,
                     "mean_vs_others_compressed": round(sum(vs_c) / len(vs_c), 3) if vs_c else None})
    return rows


# ------------------------------------------------------------ per system

def piece_stats(sdir: Path) -> dict:
    audio = ms = cost = 0.0
    n = n_ms = 0
    for p in (sdir / "pieces").glob("*.json") if (sdir / "pieces").is_dir() else []:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except ValueError:
            continue
        n += 1
        audio += float(d.get("audio_seconds") or 0)
        cost += float(d.get("cost_estimate_usd") or 0)
        if d.get("client_ms"):
            ms += d["client_ms"]
            n_ms += 1
    return {"pieces": n, "audio_s": audio, "cost_usd": cost, "pieces_timed": n_ms, "client_ms": ms}


def timed_audio_s(sdir: Path) -> float:
    t = 0.0
    for p in (sdir / "pieces").glob("*.json") if (sdir / "pieces").is_dir() else []:
        try:
            d = json.loads(p.read_text(encoding="utf-8"))
        except ValueError:
            continue
        if d.get("client_ms"):
            t += float(d.get("audio_seconds") or 0)
    return t


def failed_by_system(work: Path) -> dict[str, int] | None:
    files = sorted((work / "b1").glob("batch_summary_*.json")) if (work / "b1").is_dir() else []
    if not files:
        return None
    out: dict[str, int] = {}
    for p in files:  # latest summary wins per system
        for r in json.loads(p.read_text(encoding="utf-8")).get("results", []):
            out[r["system"]] = r["failed"]
    return out


def system_rows(systems: dict, work: Path) -> list[dict]:
    import vendor_batch
    price = {f"{v}-{m}": per_h for v, m, per_h in vendor_batch.SYSTEMS}
    failed = failed_by_system(work)
    rows = []
    for name, s in sorted(systems.items()):
        minutes = sum(f.get("duration_s") or 0 for f in s["files"].values()) / 60
        st = piece_stats(s["dir"])
        ta = timed_audio_s(s["dir"])
        if st["pieces_timed"] and ta:
            wall = f"{st['client_ms'] / 1000 / (ta / 60):.2f} (per call, proxy+vendor, {st['pieces_timed']} calls)"
        else:
            ra = sum(r.get("audio_s") or 0 for r in s["runs"])
            rw = sum(r.get("wall_s") or 0 for r in s["runs"])
            wall = f"{rw / (ra / 60):.2f} (run level incl. upload)" if ra else "n/a"
        per_min = (s["meta"].get("settings") or {}).get("price_usd_per_min")
        usd_h = round(per_min * 60, 2) if isinstance(per_min, (int, float)) else price.get(name)
        rows.append({"system": name, "kind": s["meta"].get("kind"), "files": len(s["files"]), "minutes_processed": round(minutes, 1),
                     "pieces_failed": (failed or {}).get(name, "n/a (no batch summary)") if failed is not None else "n/a (no batch summary)",
                     "wall_s_per_audio_min": wall, "usd_per_audio_hour": usd_h,
                     "usd_recorded": round(st["cost_usd"], 3)})
    return rows


# ------------------------------------------------------- teacher-check pack

def pick_stretch(turns: list[tuple[float, float, str]], dur: float, win: float = 300.0, step: float = 30.0, min_s: float = 8.0) -> dict | None:
    """The `win`-second stretch with the most speakers who talk >= min_s in it
    (ties: more speaker changes). Diarization cannot tell a child from the
    teacher, so this finds a busy, multi-speaker stretch; the teacher judges."""
    best, t = None, 0.0
    while t + win <= dur + 1e-6:
        sec: dict[str, float] = defaultdict(float)
        seq = []
        for s, e, k in sorted(turns):
            lo, hi = max(s, t), min(e, t + win)
            if hi > lo:
                sec[k] += hi - lo
                seq.append(k)
        n_spk = sum(1 for v in sec.values() if v >= min_s)
        changes = sum(1 for a, b in zip(seq, seq[1:]) if a != b)
        key = (n_spk, changes)
        if best is None or key > best[0]:
            best = (key, t)
        t += step
    if best is None:
        return None
    return {"start": best[1], "end": best[1] + win, "speakers": best[0][0], "changes": best[0][1]}


def printable(f: dict, t0: float, t1: float, block: float = 20.0) -> str:
    """Plain printable text of the words in [t0, t1): '[mm:ss] A: words' per speaker run."""
    labels: dict[str, str] = {}
    lines, cur, cur_spk, cur_t = [], [], None, None

    def flush():
        if cur:
            lines.append(f"[{int(cur_t // 60):02d}:{int(cur_t % 60):02d}] {labels.get(cur_spk, '-') if cur_spk else '-'}: {' '.join(cur)}")
    for w in sorted((w for w in f.get("words", []) if t0 <= w["start"] < t1), key=lambda w: w["start"]):
        spk = w.get("speaker")
        if spk and spk not in labels:
            labels[spk] = chr(ord("A") + len(labels) % 26)
        new_block = cur_t is None or (w["start"] - cur_t) >= block
        if cur_t is None or spk != cur_spk or new_block:
            flush()
            cur, cur_spk, cur_t = [], spk, w["start"]
        cur.append(w["w"])
    flush()
    return "\n".join(lines)


def build_teacher_pack(systems: dict, out_root: Path, work: Path) -> str:
    """Pick the stretch and write each system's transcript of it. Returns a status line (codes only)."""
    cands = []
    for name in sorted(systems, key=lambda n: (n != "azure-fast-multilingual", n)):
        for fid, f in systems[name]["files"].items():
            if re.match(r"^L[123]$", fid) and has_speakers(f):
                cands.append((name, fid, f))
        if cands:
            break
    if not cands:
        return "teacher-check pack: pending owner run (no lesson result with speaker labels yet)"
    best = None
    for name, fid, f in cands:
        st = pick_stretch(score.turns_of(f), f.get("duration_s") or 0)
        if st and (best is None or (st["speakers"], st["changes"]) > (best[2]["speakers"], best[2]["changes"])):
            best = (name, fid, st)
    if best is None:
        return "teacher-check pack: no 5-minute stretch found"
    base, code, st = best
    out = common.safe_out(out_root / "b1")
    for p in out.glob("*.txt"):
        p.unlink()
    head = f"Lesson {code}, minutes {st['start'] / 60:.0f}-{st['end'] / 60:.0f} of the first 20. Letters A, B, C... are the system's own speaker labels.\n\n"
    for name, s in sorted(systems.items()):
        if code in s["files"]:
            body = printable(s["files"][code], st["start"], st["end"])
            (out / f"{name}.txt").write_text(f"System: {name}\n{head}{body}\n", encoding="utf-8")
    (out / "stretch.json").write_text(json.dumps({"lesson": code, "start": st["start"], "end": st["end"], "chosen_with": base}), encoding="utf-8")
    src = work / "vendor" / "_inputs" / f"{code}_20min.wav"
    if src.exists():
        x, sr = common.read_wav(src, st["start"], st["end"] - st["start"])
        common.write_wav(out / f"stretch_{code}_{int(st['start'])}s.wav", x, sr)
    return (f"teacher-check pack: {code} {st['start']:.0f}-{st['end']:.0f} s, {st['speakers']} speakers with >= 8 s, "
            f"{st['changes']} speaker changes (chosen on {base}); {sum(1 for s in systems.values() if code in s['files'])} system transcript(s) written")


def preserve_command(systems: dict, work: Path) -> str:
    out = work / "teacher-check" / "b1"
    ann = out / "annotated.tsv"
    meta = out / "stretch.json"
    if not (ann.exists() and meta.exists()):
        return "pending teacher annotation (work\\teacher-check\\b1\\annotated.tsv not present)"
    st = json.loads(meta.read_text(encoding="utf-8"))
    hyps = {n: " ".join(w["w"] for w in s["files"][st["lesson"]].get("words", []) if st["start"] <= w["start"] < st["end"])
            for n, s in systems.items() if st["lesson"] in s["files"]}
    res = tally_preserve(score.read_tsv(ann), hyps)
    return md_table(["system", "marks", "preserved", "corrected (fixed-up)", "other", "preservation rate", "silent-correction rate"],
                    [[n, r["marks"], r["preserved"], r["corrected"], r["other"], r["preservation_rate"], r["silent_correction_rate"]] for n, r in res.items()])


# ------------------------------------------------------------------ output

def md_table(headers: list[str], rows: list[list]) -> str:
    def c(v):
        return "-" if v is None else str(v)
    return "\n".join(["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)] + ["| " + " | ".join(c(v) for v in r) + " |" for r in rows])


def matrix_md(names: list[str], cell: dict) -> str:
    rows = []
    for x in names:
        r = [x]
        for y in names:
            if x == y:
                r.append("1")
            else:
                v = cell.get((x, y)) or cell.get((y, x))
                r.append(f"{v[0]} (n={v[1]})" if v else "-")
        rows.append(r)
    return md_table([""] + names, rows)


def write_csv(path: Path, rows: list[dict]) -> None:
    if not rows:
        return
    path = common.safe_out(path)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def build_report(systems: dict, work: Path) -> tuple[str, dict]:
    parts, csvs = [], {}
    sysr = system_rows(systems, work)
    csvs["systems"] = sysr
    parts += ["### Per system (UNCHECKED: no reference transcript exists)", "",
              md_table(["system", "kind", "files", "minutes processed", "pieces failed", "wall s per audio min (includes upload/proxy overhead; NOT a benchmark, shared CPU)", "USD per audio hour (estimate)", "USD recorded by proxy"],
                       [[r["system"], r["kind"], r["files"], r["minutes_processed"], r["pieces_failed"], r["wall_s_per_audio_min"], r["usd_per_audio_hour"], r["usd_recorded"]] for r in sysr]), ""]

    per_file, cond = synth_rows(systems, work / "mix")
    csvs["synth_files"] = [{k: (v if not isinstance(v, dict) else v["der"]) for k, v in r.items()} for r in per_file]
    csvs["synth_conditions"] = cond
    parts += ["### (a) Synthetic mixes: speakers found vs true (ground truth: speakers only; NO text reference, so no word accuracy)", ""]
    if per_file:
        parts += [md_table(["system", "mix file", "overlap %", "room degradation", "true speakers", "found", "found (>= 5 s of speech)", "DER collar 0.25 s", "DER collar 0.25 s, overlap excluded"],
                           [[r["system"], r["file"], r["overlap_pct"], r["degrade"], r["true_speakers"], r["found"], r["found_ge5s"],
                             r["der_collar"]["der"] if r["der_collar"] else "n/a (no speaker labels)",
                             r["der_collar_no_overlap"]["der"] if r["der_collar_no_overlap"] else "n/a"] for r in per_file]), ""]
    else:
        parts += ["pending owner run", ""]
    parts += ["### (a) DER by condition (pooled over files; miss / false alarm / confusion as shares of reference speech)", ""]
    parts += [md_table(["system", "overlap %", "room degradation", "files", "speaker count exact", "found / true (total)", "DER", "miss", "false alarm", "confusion", "DER overlap excluded"],
                       [[r["system"], r["overlap_pct"], r["degrade"], r["files"], r["speakers_exact"], f"{r['found_total']}/{r['true_total']}",
                         r["der"], r["miss"], r["false_alarm"], r["confusion"], r["der_no_overlap"]] for r in cond]) if cond else "pending owner run", ""]

    for group, title in (("synth", "synthetic mixes"), ("clips", "held-out clips"), ("lesson", "lessons (first 20 min of L1, L2, L3)")):
        names, cell = agreement_matrix(systems, group)
        parts += [f"### (b) Word AGREEMENT between systems, {title} - AGREEMENT, NOT ACCURACY, UNCHECKED (cell = pooled agreement, n = files)", ""]
        parts += [matrix_md(names, cell) if cell else "pending owner run (needs two systems on the same files)", ""]
        spread = per_file_spread(systems, group)
        csvs[f"spread_{group}"] = spread
        if spread:
            parts += [f"Where systems disagree most, {title} (per file: lowest and highest agreeing pair), UNCHECKED:", "",
                      md_table(["file", "systems", "lowest agreement", "highest agreement"], [[r["file"], r["systems"], r["lowest"], r["highest"]] for r in spread]), ""]

    pr = proxy_rows(systems)
    csvs["proxy_error_kinds"] = pr
    parts += ["### (c) Learner-error preservation: PROXY ONLY (the real measure needs the teacher's annotated slice) - counts of differences between system pairs on held-out clips, UNCHECKED", ""]
    parts += [md_table(["pair", "compared words", "article", "function word", "ending", "other word", "article /100", "function /100", "ending /100"],
                       [[r["pair"], r["compared_words"], r["article"], r["function word"], r["ending (-s/-ed/-ing)"], r["other word"], r["article_per_100"], r["function_per_100"], r["ending_per_100"]] for r in pr])
              if pr else "pending owner run", ""]
    parts += ["Preservation tally on the teacher's slice: " + ("see below." if (work / "teacher-check" / "b1" / "annotated.tsv").exists() else "pending teacher annotation (run `b1_score.py preserve` once work\\teacher-check\\b1\\annotated.tsv exists)."), ""]

    cs = codeswitch_rows(systems)
    vw, nwin = vi_window_rows(systems)
    csvs["codeswitch"], csvs["vi_windows"] = cs, vw
    parts += ["### (d) Code-switching on the lessons, UNCHECKED (heuristic: toneless Vietnamese counts as English, so Vietnamese shares are lower bounds)", ""]
    parts += [md_table(["system", "lesson words", "words with a language tag", "Vietnamese % by system tag", "Vietnamese % by diacritics"],
                       [[r["system"], r["lesson_words"], r["tagged_by_system"], r["vi_by_tag_pct"], r["vi_by_diacritics_pct"]] for r in cs]) if cs else "pending owner run", ""]
    parts += [f"Windows of 10 s where ANY usable system wrote >= 3 Vietnamese-diacritic words: {nwin}. What each system did in them (systems whose word times are spread over the whole piece are excluded), UNCHECKED:", "",
              md_table(["system", "windows", "Vietnamese text", "dropped (< 30% of the busiest system's words)", "non-Vietnamese text (English/other)"],
                       [[r["system"], r["windows_seen"], r["vietnamese_text"], r["dropped"], r["non_vietnamese_text"]] for r in vw]) if vw else "pending owner run", ""]

    cr = compression_rows(systems)
    csvs["compression"] = cr
    parts += ["### (e) Compression cost: L1 original vs its 16 kHz / 32 kbps twin (L4), same 20 minutes - agreement, UNCHECKED", ""]
    parts += [md_table(["system", "agreement: own L1 vs own L4", "mean agreement with other systems' L1: own L1", "mean agreement with other systems' L1: own L4"],
                       [[r["system"], r["self_agreement_L1_vs_L4"], r["mean_vs_others_original"], r["mean_vs_others_compressed"]] for r in cr]) if cr else "pending owner run", ""]
    return "\n".join(parts), csvs


def write_evidence(path: Path, block: str) -> None:
    text = path.read_text(encoding="utf-8") if path.exists() else ""
    body = f"{START}\n{block}\n{END}"
    if START in text and END in text:
        text = text[: text.index(START)] + body + text[text.index(END) + len(END):]
    else:
        text = text.rstrip("\n") + "\n\n## Scored tables (generated by b1_score.py; aggregates and codes only)\n\n" + body + "\n"
    path.write_text(text, encoding="utf-8")


def main(argv=None) -> int:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", nargs="?", choices=["score", "preserve"], default="score")
    ap.add_argument("--evidence", type=Path, help="evidence markdown file to update between the B1-TABLES markers")
    ap.add_argument("--work", type=Path, default=common.WORK)
    a = ap.parse_args(argv)
    work = a.work
    systems = load_systems(work / "vendor")
    if not systems:
        print("no result files under", work / "vendor")
        return 1
    if a.cmd == "preserve":
        print(preserve_command(systems, work))
        return 0
    out = common.safe_out(work / "b1")
    block, csvs = build_report(systems, work)
    status = build_teacher_pack(systems, work / "teacher-check", work)
    block += "\n### Teacher-check package\n\n" + status + "\n"
    (out / "tables.md").write_text(block, encoding="utf-8")
    for k, rows in csvs.items():
        write_csv(out / f"{k}.csv", rows)
    print(block)
    if a.evidence:
        write_evidence(a.evidence, block)
        print(f"\nupdated {a.evidence}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
