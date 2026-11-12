"""Render work\\b2\\results.json (b2_eval.py) as Markdown tables: aggregates and codes only.

    python b2_report.py --diag-model ecapa > work\\b2\\report.md
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import WORK  # noqa: E402


def p(x, ci=None):
    if x is None:
        return "-"
    s = f"{100 * x:.1f}"
    if ci:
        s += f" [{100 * ci[0]:.1f}-{100 * ci[1]:.1f}]"
    return s


def t(x):
    return "none" if x is None else ("inf" if x == float("inf") else f"{x:.3f}")


def ev(e):
    return "ok" if e == "sufficient" else ("INSUFF" if e and e.startswith("insuff") else (e or "-"))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--json", type=Path, default=WORK / "b2" / "results.json")
    ap.add_argument("--diag-model", default="ecapa")
    ap.add_argument("--diag-config", default="vad-all-mean-cos")
    a = ap.parse_args()
    R = json.loads(a.json.read_text(encoding="utf-8"))
    out = []
    w = out.append

    w("### Model x configuration (realistic pool = every s500* condition, all lengths; closed + leave-one-out open set)\n")
    w("| model | config | EER % | top-1 closed % [CI] | T@1% FA | ev | named % [CI] | wrong child % [CI] | open-set accepted % [CI] | T@5% FA | named % | wrong % | open acc % |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for m, M in R.items():
        for c, C in M["configs"].items():
            r = C["all_real"]
            a1, a5 = C["at_T1"]["all_real"], C["at_T5"]["all_real"]
            w(f"| {m} | {c} | {p(r['eer'])} | {p(r['top1'], r['top1_ci'])} | {t(C['T1']['T'])} | {ev(C['T1']['evidence'])} | "
              f"{p(a1.get('named'), a1.get('named_ci'))} | {p(a1.get('misid'), a1.get('misid_ci'))} | "
              f"{p(a1.get('open_fa'), a1.get('open_fa_ci'))} | {t(C['T5']['T'])} | {p(a5.get('named'))} | "
              f"{p(a5.get('misid'))} | {p(a5.get('open_fa'))} |")
    w("")
    if a.diag_model in R:
        M = R[a.diag_model]
        C = M["configs"][a.diag_config]
        w(f"### Diagnosis, {a.diag_model} {a.diag_config}: by condition and turn length (no threshold)\n")
        w("| condition / window | closed n | top-1 % [CI] | EER % |")
        w("|---|---|---|---|")
        for g, r in sorted(C["by_group"].items(), key=lambda kv: (kv[0].split('/')[0], float(kv[0].split('L')[-1]))):
            w(f"| {g} | {r['n_closed']} | {p(r['top1'], r['top1_ci'])} | {p(r['eer'])} |")
        w("")
        w("### Score distributions, top-1 score, s500 all lengths (5/25/50/75/95th percentile)\n")
        w("| model | config | top-1 correct | top-1 wrong (enrolled child) | out-of-set (unenrolled child) |")
        w("|---|---|---|---|---|")
        for m, MM in R.items():
            for c in (a.diag_config, MM["best_config"]):
                q = MM["configs"][c]["score_quantiles_top1"]
                w(f"| {m} | {c} | {q['correct']} | {q['wrong_enrolled']} | {q['out_of_set']} |")
        w("")
        w(f"### Per child, {a.diag_model} {a.diag_config}, closed set, s500 2 s windows\n")
        w("| child | windows | top-1 correct % | most frequent wrong answers |")
        w("|---|---|---|---|")
        for k, d in sorted(C["per_child_s500_L2"].items()):
            wr = ", ".join(f"{c} x{n}" for c, n in sorted(d["wrong"].items(), key=lambda kv: -kv[1])[:3])
            w(f"| {k} | {d['n']} | {100 * d['ok'] / d['n']:.0f} | {wr} |")
        hubs = {}
        for d in C["per_child_s500_L2"].values():
            for c, n in d["wrong"].items():
                hubs[c] = hubs.get(c, 0) + n
        w("\nWrong answers received per enrolled child (\"hubs\"): " +
          ", ".join(f"{c} {n}" for c, n in sorted(hubs.items(), key=lambda kv: -kv[1])[:8]) + "\n")
        w(f"### Adult-pitch contamination of enrolment ({a.diag_model})\n")
        w("| child | adult-pitch windows | enrol windows | cos(adult centroid, enrol centroid) | enrol windows closer to the adult centroid than to their own (LOO) |")
        w("|---|---|---|---|---|")
        for r in M["contamination"]:
            w(f"| {r['code']} | {r['flag_windows']} | {r['enrol_windows']} | {r['cos_flag_vs_enrol_centroid']} | "
              f"{r['enrol_windows_closer_to_adult']} |")
        w("")
    w("### Best configuration per model: by turn length at the 1 % and 5 % thresholds (s500 room)\n")
    w("| model | config | T | window | named % [CI] | wrong child % | unknown (enrolled) % | open-set accepted % [CI] |")
    w("|---|---|---|---|---|---|---|---|")
    for m, M in R.items():
        c = M["best_config"]
        C = M["configs"][c]
        for key in ("T1", "T5"):
            for L in ("1", "2", "4", "8"):
                r = C[f"at_{key}"].get(f"s500/L{L}")
                if r and "named" in r:
                    w(f"| {m} | {c} | {key} {t(r['T'])} | {L} s | {p(r['named'], r['named_ci'])} | {p(r['misid'])} | "
                      f"{p(r['unknown_closed'])} | {p(r['open_fa'], r['open_fa_ci'])} |")
    w("")
    w("### Overlap (best configuration, at T@1 %)\n")
    w("| model | window | condition | named % | wrong % | open acc % | top-1 % (no T) |")
    w("|---|---|---|---|---|---|---|")
    for m, M in R.items():
        C = M["configs"][M["best_config"]]
        for L in ("2", "4"):
            for cond in ("clean", "s500", "s500_ov05", "s500_ov15"):
                r = C["at_T1"].get(f"{cond}/L{L}")
                if r and "named" in r:
                    w(f"| {m} | {L} s | {cond} | {p(r['named'])} | {p(r['misid'])} | {p(r['open_fa'])} | {p(r['top1'])} |")
    w("")
    w("### Aggregating a cluster's turns (same child, best configuration; T chosen per row)\n")
    w("| model | turns of | k turns | speech s | independent clusters | EER % | top-1 % [CI] | T@1% | ev | named % [CI] | wrong % | open acc % [CI] | T@5% | named % | open acc % |")
    w("|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|")
    for m, M in R.items():
        for k, r in M["clusters"].items():
            cond, L, kk = k.split("/")
            r1, r5 = r["T1"], r["T5"]
            w(f"| {m} | {cond} {L} | {kk[1:]} | {r['speech_s']:g} | {r['independent_closed']} | {p(r['eer'])} | "
              f"{p(r['top1'], r['top1_ci'])} | {t(r1['T'])} | {ev(r1['evidence'])} | {p(r1.get('named'), r1.get('named_ci'))} | "
              f"{p(r1.get('misid'))} | {p(r1.get('open_fa'), r1.get('open_fa_ci'))} | {t(r5['T'])} | {p(r5.get('named'))} | "
              f"{p(r5.get('open_fa'))} |")
    w("")
    w("### Threshold chosen on half the children, applied to the other half (1 % target, realistic pool)\n")
    w("| model | config | T from half A -> on B: named / wrong / open acc | T from half B -> on A |")
    w("|---|---|---|---|")
    for m, M in R.items():
        c = M["best_config"]
        cells = []
        for x in M["configs"][c]["cross_half_T1"]:
            ap_ = x["applied"] or {}
            cells.append(f"T {t(x['T_from_half'])}: {p(ap_.get('named'))} / {p(ap_.get('misid'))} / {p(ap_.get('open_fa'))}")
        w(f"| {m} | {c} | {cells[0]} | {cells[1]} |")
    w("")
    w("### Embedding cost (CONTAMINATED by other agents' load; not a benchmark)\n")
    w("| model | audio min | load s | embed s | RTF |")
    w("|---|---|---|---|---|")
    for m, M in R.items():
        c = M["cost"]
        w(f"| {m} | {c['audio_s'] / 60:.0f} | {c['load_s']:.0f} | {c['embed_s']:.0f} | {c['embed_s'] / c['audio_s']:.3f} |")
    sys.stdout.reconfigure(encoding="utf-8")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())
