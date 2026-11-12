"""B2 step 3: identification experiments on the cached embeddings, scored with score.py.

Reads work\\voiceprints\\b2\\<model>.embeddings.npz (b2_embed.py). For every
configuration it builds a voiceprint per child, scores every held-out test unit
against the gallery, and writes work\\b2\\ident\\<model>__<config>.ident.csv
(turn_id,true_code,pred_code,score,enrolled,group) - codes only - then scores it
with score.py's identification-by-threshold.

Populations:
  closed  every child is enrolled (26 voiceprints: S23 excluded, see b2_units.py);
          the 12 enrol-only children are distractors; correct answer = the child.
  open    leave-one-out: for each of the 15 held-out children, its voiceprint (and,
          for AS-norm, its cohort windows) is removed; correct answer = UNKNOWN.
          Every test unit is therefore scored once closed and once open.
Configuration = <enrol source>-<enrol seconds>-<centroid>-<norm>:
  source vad (split.py's ENROL speech) | raw (first N s of the clip, no clean-up)
  seconds 10 | 20 | 40 | all;  centroid mean | k2 | k3 (max over sub-centroids)
  norm cos | asnorm (adaptive s-norm, cohort = the other enrolled children's
  enrolment windows, top 50)
Operating threshold: score.recommend_split over the REALISTIC pool (all s500*
conditions, every length) - one threshold for the whole system - at 1 % and 5 %
false-accept on closed and open SEPARATELY; then reported per turn length.
Cross-check: the held-out children are split in two halves; T is chosen on one
half and applied to the other (T chosen on the scored data is optimistic).

    python b2_eval.py --models ecapa,wes_campp --report work\\b2\\report.md
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import idlib  # noqa: E402
import score  # noqa: E402
from common import WORK, safe_out  # noqa: E402

VP = WORK / "voiceprints" / "b2"
OUT = WORK / "b2"
REAL = ("s500", "s500_ov05", "s500_ov15")
LEN = {1.0: "<1.5 s", 2.0: "1.5-3 s", 4.0: "3-6 s", 8.0: ">6 s"}


class Data:
    def __init__(self, model: str):
        d = np.load(VP / f"{model}.embeddings.npz", allow_pickle=False)
        self.model = model
        self.E = idlib.l2n(d["emb"])
        for k in ("kind", "code", "cond"):
            setattr(self, k, d[k].astype(str))
        self.L, self.pos, self.idx = d["L"], d["pos"], d["idx"]
        self.codes = sorted(set(self.code[self.kind == "enrol"]))
        self.held = sorted(set(self.code[self.kind == "test"]))
        self.cost = {k: float(d[k]) for k in ("load_s", "embed_s", "audio_s")}


def enrol_mean(D: Data, codes) -> np.ndarray:
    """Mean enrolment embedding of the GALLERY children only (an unenrolled child never contributes)."""
    return D.E[(D.kind == "enrol") & np.isin(D.code, list(codes))].mean(0)


def gallery(D: Data, codes, src="vad", secs=None, cent="mean", seed=0, mu=None):
    """Voiceprints for `codes`. With mu, embeddings are centred (x - mu, renormalised) first."""
    kind = "enrol" if src == "vad" else "raw"
    E = D.E if mu is None else idlib.l2n(D.E - mu)
    G, cx, co = [], [], []
    for c in codes:
        m = (D.kind == kind) & (D.code == c)
        if secs is not None:
            mm = m & (D.pos < secs)
            m = mm if mm.any() else m & (D.pos == D.pos[m].min())
        X = E[m]
        G.append(idlib.centroid(X)[None, :] if cent == "mean" else idlib.sub_centroids(X, int(cent[1]), seed))
        cx.append(E[(D.kind == "enrol") & (D.code == c)])
        co += [c] * int(((D.kind == "enrol") & (D.code == c)).sum())
    return G, np.concatenate(cx), co


def score_units(D, T, codes, cfg, return_scores=False):
    """norm: cos | asnorm | ccos / casnorm (= the same after centring on the gallery's enrolment mean)."""
    mu = enrol_mean(D, codes) if cfg["norm"].startswith("c") and cfg["norm"] != "cos" else None
    if mu is not None:
        T = idlib.l2n(np.atleast_2d(T) - mu)
    G, cx, co = gallery(D, codes, cfg["src"], cfg["secs"], cfg["cent"], mu=mu)
    S = idlib.gallery_scores(T, G)
    if cfg["norm"] in ("asnorm", "casnorm"):
        S = idlib.asnorm(S, T, G, cx, co, codes, topk=50)
    if return_scores:
        return (*idlib.top1(S, codes), S)
    return idlib.top1(S, codes)


def parse_cfg(name: str) -> dict:
    src, secs, cent, norm = name.split("-")
    return {"name": name, "src": src, "secs": None if secs == "all" else float(secs), "cent": cent, "norm": norm}


def rows_for(D: Data, cfg: dict, test_mask=None, emb=None, meta=None):
    """Closed + open rows. Default test set = every 'test' unit; or pass emb + meta
    (list of (turn_id, code, group)) for aggregated clusters."""
    if emb is None:
        sel = np.flatnonzero((D.kind == "test") if test_mask is None else test_mask)
        emb = D.E[sel]
        meta = [(f"{D.code[i]}_{D.cond[i]}_L{D.L[i]:g}_{D.idx[i]}", D.code[i], f"{D.cond[i]}/L{D.L[i]:g}")
                for i in sel]
    rows = []
    pred, sc, mg = score_units(D, emb, D.codes, cfg)
    for (tid, c, g), p, s, m in zip(meta, pred, sc, mg):
        rows.append({"turn_id": tid + "_closed", "true_code": c, "pred_code": p, "score": f"{s:.4f}",
                     "enrolled": 1, "group": g, "margin": f"{m:.4f}"})
    true = np.array([m[1] for m in meta])
    for c in sorted(set(true)):
        ii = np.flatnonzero(true == c)
        pred, sc, mg = score_units(D, emb[ii], [x for x in D.codes if x != c], cfg)
        for j, p, s, m in zip(ii, pred, sc, mg):
            tid, _, g = meta[j]
            rows.append({"turn_id": tid + "_open", "true_code": c, "pred_code": p, "score": f"{s:.4f}",
                         "enrolled": 0, "group": g, "margin": f"{m:.4f}"})
    return rows


def to_turns(rows):
    return [score.Turn(r["turn_id"], r["true_code"], r["pred_code"], float(r["score"]), bool(r["enrolled"]),
                       r["group"]) for r in rows]


def write_csv(path: Path, rows):
    with open(safe_out(path), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)


def summ(turns, T=None):
    """Compact metrics for a set of turns (closed + open rows), optionally at threshold T."""
    cl = [x for x in turns if x.enrolled]
    op = [x for x in turns if not x.enrolled]
    top1 = sum(x.pred == x.true for x in cl)
    out = {"n_closed": len(cl), "n_open": len(op),
           "top1": top1 / len(cl) if cl else None, "top1_ci": score.wilson_interval(top1, len(cl)),
           "eer": score.eer(turns)["eer"]}
    if T is not None:  # T may be inf: nothing is named, everything is UNKNOWN
        c, o = score.ident_at(cl, T), score.ident_at(op, T)
        named = sum(1 for x in cl if x.score >= T and x.pred == x.true)
        out.update({"T": T, "named": named / len(cl), "named_ci": score.wilson_interval(named, len(cl)),
                    "misid": c["false_accept"], "misid_ci": c["fa_ci95"], "unknown_closed": c["unknown_rate"],
                    "open_fa": o["false_accept"], "open_fa_ci": o["fa_ci95"]})
    return out


def operating(turns, fa):
    pool = [x for x in turns if x.group.split("/")[0] in REAL]
    r = score.recommend_split(pool, fa)
    return r["threshold"], r["evidence"]


def contamination(D: Data):
    """Per child with adult-pitch windows: how adult-like is the enrolment?"""
    out = []
    for c in D.codes:
        fl = D.E[(D.kind == "flag") & (D.code == c)]
        en = D.E[(D.kind == "enrol") & (D.code == c)]
        if len(fl) == 0 or len(en) < 2:
            continue
        fc = idlib.centroid(fl)
        closer = 0
        for i in range(len(en)):
            loo = idlib.centroid(np.delete(en, i, 0))
            closer += float(en[i] @ fc) > float(en[i] @ loo)
        out.append({"code": c, "flag_windows": len(fl), "enrol_windows": len(en),
                    "cos_flag_vs_enrol_centroid": round(float(fc @ idlib.centroid(en)), 3),
                    "enrol_windows_closer_to_adult": closer})
    return out


def clusters(D: Data, L: float, cond: str, k: int, shuffles: int, cfg: dict):
    emb, meta = [], []
    for s in range(shuffles):
        rng = np.random.default_rng(100 + s)
        for c in D.held:
            ii = np.flatnonzero((D.kind == "test") & (D.code == c) & (D.L == L) & (D.cond == cond))
            ii = rng.permutation(ii)
            for g in range(len(ii) // k):
                emb.append(idlib.centroid(D.E[ii[g * k:(g + 1) * k]]))
                meta.append((f"{c}_k{k}_s{s}_{g}", c, f"k{k}"))
    if not emb:
        return []
    return rows_for(D, cfg, emb=np.stack(emb), meta=meta)


def fmt(x, ci=None, pct=True):
    if x is None:
        return "-"
    s = f"{100 * x:.1f}" if pct else f"{x:.3f}"
    if ci:
        s += f" [{100 * ci[0]:.1f}-{100 * ci[1]:.1f}]" if pct else ""
    return s


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--models", required=True)
    ap.add_argument("--configs", default="vad-all-mean-cos,vad-10-mean-cos,vad-20-mean-cos,vad-40-mean-cos,"
                    "vad-all-mean-asnorm,vad-10-mean-asnorm,vad-20-mean-asnorm,vad-40-mean-asnorm,"
                    "vad-all-k2-asnorm,vad-all-k3-asnorm,vad-all-k2-cos,raw-all-mean-cos,raw-all-mean-asnorm,"
                    "vad-all-mean-ccos,vad-all-mean-casnorm,vad-all-k2-casnorm,vad-10-mean-casnorm,"
                    "vad-20-mean-casnorm,vad-40-mean-casnorm")
    ap.add_argument("--cluster-config", default="", help="config for the aggregation run (default: best by EER)")
    ap.add_argument("--shuffles", type=int, default=5)
    ap.add_argument("--json", type=Path, default=OUT / "results.json")
    a = ap.parse_args()
    res = {}
    for model in a.models.split(","):
        D = Data(model)
        R = {"cost": D.cost, "configs": {}, "contamination": contamination(D)}
        best = None
        for name in a.configs.split(","):
            cfg = parse_cfg(name)
            rows = rows_for(D, cfg)
            write_csv(OUT / "ident" / f"{model}__{name}.ident.csv", rows)
            turns = to_turns(rows)
            groups = sorted({x.group for x in turns})
            C = {"all_real": summ([x for x in turns if x.group.split("/")[0] in REAL])}
            for fa in (0.01, 0.05):
                T, ev = operating(turns, fa)
                C[f"T{int(fa * 100)}"] = {"T": T, "evidence": ev}
                C[f"at_T{int(fa * 100)}"] = {g: summ([x for x in turns if x.group == g], T) for g in groups}
                C[f"at_T{int(fa * 100)}"]["all_real"] = summ([x for x in turns if x.group.split("/")[0] in REAL], T)
            C["by_group"] = {g: summ([x for x in turns if x.group == g]) for g in groups}
            # per-child (closed, s500 L2) and hubs
            pc = {}
            for x in turns:
                if x.enrolled and x.group == "s500/L2":
                    d = pc.setdefault(x.true, {"n": 0, "ok": 0, "wrong": {}})
                    d["n"] += 1
                    d["ok"] += x.pred == x.true
                    if x.pred != x.true:
                        d["wrong"][x.pred] = d["wrong"].get(x.pred, 0) + 1
            C["per_child_s500_L2"] = pc
            # target / non-target / out-of-set score quantiles (s500, all lengths)
            tgt = [x.score for x in turns if x.enrolled and x.pred == x.true and x.group.startswith("s500/")]
            ntg = [x.score for x in turns if x.enrolled and x.pred != x.true and x.group.startswith("s500/")]
            oos = [x.score for x in turns if not x.enrolled and x.group.startswith("s500/")]
            q = lambda v: [round(float(np.percentile(v, p)), 3) for p in (5, 25, 50, 75, 95)] if v else None
            C["score_quantiles_top1"] = {"correct": q(tgt), "wrong_enrolled": q(ntg), "out_of_set": q(oos)}
            # cross-check: choose T on one half of the held-out children, apply to the other
            halves = [set(D.held[0::2]), set(D.held[1::2])]
            xc = []
            for i in (0, 1):
                A = [x for x in turns if x.true in halves[i]]
                B = [x for x in turns if x.true in halves[1 - i] and x.group.split("/")[0] in REAL]
                T, ev = operating(A, 0.01)
                xc.append({"T_from_half": T, "evidence": ev, "applied": summ(B, T) if T is not None else None})
            C["cross_half_T1"] = xc
            R["configs"][name] = C
            e = C["all_real"]["eer"]
            if e is not None and (best is None or e < best[1]):
                best = (name, e)
            print(f"{model} {name}: real EER {fmt(e, pct=False)} top1 {fmt(C['all_real']['top1'])} "
                  f"T1 {C['T1']['T']} ({C['T1']['evidence']})", flush=True)
        R["best_config"] = best[0]
        ccfg = parse_cfg(a.cluster_config or best[0])
        R["clusters"] = {}
        for L, cond in ((1.0, "s500"), (2.0, "s500"), (2.0, "s500_ov05")):
            for k in (1, 3, 5, 10, 20):
                rows = clusters(D, L, cond, k, a.shuffles, ccfg)
                if not rows:
                    continue
                write_csv(OUT / "ident" / f"{model}__clusters_{cond}_L{L:g}_k{k}.ident.csv", rows)
                turns = to_turns(rows)
                r = {"config": ccfg["name"], "speech_s": L * k, "independent_closed": sum(x.enrolled for x in turns) // a.shuffles}
                r.update(summ(turns))
                for fa in (0.01, 0.05):
                    T, ev = score.recommend_split(turns, fa)["threshold"], score.recommend_split(turns, fa)["evidence"]
                    r[f"T{int(fa * 100)}"] = {"T": T, "evidence": ev, **(summ(turns, T) if T is not None else {})}
                R["clusters"][f"{cond}/L{L:g}/k{k}"] = r
                print(f"{model} cluster {cond} L{L:g} k{k}: n {r['independent_closed']} EER {fmt(r['eer'], pct=False)} "
                      f"top1 {fmt(r['top1'])}", flush=True)
        res[model] = R
    prev = json.loads(a.json.read_text(encoding="utf-8")) if a.json.exists() else {}
    prev.update(res)
    safe_out(a.json).write_text(json.dumps(prev, indent=1, default=lambda v: None), encoding="utf-8")
    print(f"-> {a.json}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
