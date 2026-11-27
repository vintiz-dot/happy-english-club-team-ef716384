"""One lesson's transcript from Groq + Cloudflare, reconciled, with local beam-5 re-checks (the new careful mode).

For every ~10-minute piece both providers are asked at once. What a piece gets, in this order of preference:
    both answered     -> Groq's segments stand where the two agree; where they differ the audio is re-checked
                         locally (faster-whisper beam 5) and a line still unsettled is marked unsure;
    only Groq         -> Groq's segments; its own unsure lines are re-checked locally;
    only Cloudflare   -> the same with Cloudflare's;
    neither           -> the whole piece is transcribed locally with beam 5, as the laptop always did.
So a used-up allowance, an outage or a refused upload costs time, never the report.

`recheck(x, offset_s)` is the local transcriber (nightly.py passes faster-whisper at beam 5); None means there is
none, and then a disagreement is kept from the primary transcript and marked unsure, and a piece nobody
transcribed fails the lesson ("no_transcriber"). Every upload is preceded by the provider's may_send() check;
nothing here writes audio to disk (pieces are encoded in memory). The settings returned go into the report's
own "settings": which providers and models made it, how many pieces each mode had, how much was re-checked.
Logs: codes and numbers only.
"""
from __future__ import annotations

import os
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from . import SR, PIECE_S, OVERLAP_S, ProviderError, core_span, join_pieces, plan_pieces
from . import reconcile

RECHECK_PAD_S = 1.0


def build_providers(state_dir: Path, may_send, log, sleep=None) -> list:
    """The providers this machine has credentials for, Groq first. HEC_PROVIDERS ("groq,cloudflare", "none")
    narrows it. Missing credentials = that provider is simply absent."""
    from . import cloudflare, groq, quota
    import time
    want = [p.strip() for p in (os.environ.get("HEC_PROVIDERS") or "groq,cloudflare").split(",") if p.strip()]
    limits = quota.load_limits()
    kw = {"may_send": may_send, "log": log, "sleep": sleep or time.sleep}
    out = []
    if "groq" in want:
        key = groq.read_key()
        if key:
            out.append(groq.Groq(key, quota.Quota("groq", limits["groq"], Path(state_dir) / "quota-groq.json"), **kw))
    if "cloudflare" in want:
        acct, tok = cloudflare.read_credentials()
        if acct and tok:
            out.append(cloudflare.Cloudflare(acct, tok, quota.Quota("cloudflare", limits["cloudflare"],
                                                                    Path(state_dir) / "quota-cloudflare.json"), **kw))
    return out


def _within(segs: list[dict], a: float, b: float, last: bool) -> list[dict]:
    return [s for s in segs if a <= reconcile_mid(s) < b or (last and reconcile_mid(s) >= a)]


def reconcile_mid(s: dict) -> float:
    return (float(s["start"]) + float(s["end"])) / 2


def _unsure_spans(segs: list[dict]) -> list[tuple[float, float]]:
    import report
    return [(s["start"], s["end"]) for s in segs if report.unsure(s)]


def transcribe_lesson(audio, providers: list, recheck, should_stop, stopped_exc, log, on_progress=None) -> tuple[list[dict], dict]:
    n = len(audio)
    duration = n / SR
    pieces = plan_pieces(n)
    names = [p.name for p in providers]
    per = {p.name: [None] * len(pieces) for p in providers}
    codes: dict[str, dict[str, int]] = {p.name: {} for p in providers}

    def ask(p, k, a, b):
        try:
            return p.transcribe_piece(audio[a:b], a / SR)
        except ProviderError as e:
            codes[p.name][e.code] = codes[p.name].get(e.code, 0) + 1
            return None

    with ThreadPoolExecutor(max_workers=max(1, len(providers))) as pool:
        for k, (a, b) in enumerate(pieces):
            if should_stop():
                raise stopped_exc()
            futs = {p.name: pool.submit(ask, p, k, a, b) for p in providers}
            for name, f in futs.items():
                per[name][k] = f.result()
            if on_progress:
                on_progress(b / SR * 0.7)
    for name in names:
        bad = sum(1 for x in per[name] if x is None)
        if bad:
            log(f"{name}: {bad} of {len(pieces)} pieces not transcribed ({', '.join(f'{c} x{v}' for c, v in codes[name].items())})")

    joined = {name: join_pieces(per[name], pieces) for name in names}
    plan = []           # (k, mode, primary, witnesses, windows)
    all_windows = []
    agreements = []
    for k in range(len(pieces)):
        cs, ce = core_span(k, pieces)
        last = k == len(pieces) - 1
        have = [nm for nm in names if per[nm][k] is not None]
        if len(have) >= 2:
            A, B = _within(joined[have[0]], cs, ce, last), _within(joined[have[1]], cs, ce, last)
            wins = reconcile.windows(A, B, duration)
            plan.append((k, "both", A, [A, B], wins))
            agreements.append(reconcile.agreement(A, B))
        elif len(have) == 1:
            P = _within(joined[have[0]], cs, ce, last)
            wins = reconcile.widen(reconcile.join(_unsure_spans(P)), P, duration)
            plan.append((k, have[0], P, [P], wins))
        else:
            wins = [(cs, ce)]
            plan.append((k, "local", [], [], wins))
        all_windows.extend(wins)
    windows = reconcile.join(all_windows, 0.0)

    rechecked: list[dict] = []
    rechecked_s = 0.0
    if windows and recheck is None and any(m == "local" for _, m, *_ in plan):
        raise ProviderError("no_transcriber")
    if recheck is not None:
        for i, (s, e) in enumerate(windows):
            if should_stop():
                raise stopped_exc()
            a = max(0.0, s - RECHECK_PAD_S)
            b = min(duration, e + RECHECK_PAD_S)
            rechecked.extend(recheck(audio[int(a * SR):int(b * SR)], a))
            rechecked_s += e - s
            if on_progress:
                on_progress(duration * (0.7 + 0.3 * (i + 1) / len(windows)))

    out: list[dict] = []
    modes: dict[str, int] = {}
    for k, mode, primary, witnesses, wins in plan:
        modes[mode] = modes.get(mode, 0) + 1
        cs, ce = core_span(k, pieces)
        last = k == len(pieces) - 1
        if recheck is None:
            out.extend(dict(s, force_unsure=True) if reconcile.inside(s, wins) else dict(s) for s in primary)
            continue
        out.extend(reconcile.merge(primary, wins, _within(rechecked, cs, ce, last), witnesses))
    out.sort(key=lambda s: (s["start"], s["end"]))
    settings = {
        "engine": "remote-reconciled",
        "providers": {p.name: p.model for p in providers},
        "pieces": modes, "piece_s": PIECE_S, "overlap_s": OVERLAP_S,
        "recheck_windows": len(windows), "rechecked_s": round(rechecked_s),
        "agreement": round(sum(agreements) / len(agreements), 3) if agreements else None,
        "provider_codes": {k: v for k, v in codes.items() if v},
    }
    log(f"transcript: pieces {modes}, {len(windows)} re-check windows, {round(rechecked_s)} s re-checked, "
        f"agreement {settings['agreement']}")
    return out, settings
