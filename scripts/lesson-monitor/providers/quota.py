"""Free-tier allowances, tracked on this machine so the job never runs into a wall of 429s.

Numbers checked 27 Nov 2026 (change them in /etc/hec-monitor/limits.json, never by retrying harder):
  Groq, whisper-large-v3, free plan:  20 requests a minute, 2,000 a day, 7,200 audio seconds an hour,
    28,800 audio seconds a day, 25 MB a file (console.groq.com/docs/rate-limits; the console's own Limits page
    for the account is the authority).
  Cloudflare Workers AI, free plan: 10,000 neurons a day; @cf/openai/whisper-large-v3-turbo costs about 46.63
    neurons per audio minute (developers.cloudflare.com/workers-ai/platform/pricing), so about 214 minutes a day.

Windows are rolling (a minute, an hour, a day back from now): never looser than a provider's own reset, sometimes
stricter. Each call is recorded BEFORE it is sent, so a crash cannot forget a call; a 429 blocks the provider for
its Retry-After. The book is a small JSON file of timestamps and numbers (no lesson content).
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

DAY, HOUR, MINUTE = 86400.0, 3600.0, 60.0

DEFAULTS = {
    "groq": {"rpm": 20, "rpd": 2000, "ash": 7200, "asd": 28800, "margin": 0.9},
    "cloudflare": {"rpm": 60, "neurons_per_day": 10000, "neurons_per_audio_min": 46.63, "margin": 0.9},
}


def load_limits(path: str | Path | None = None) -> dict:
    """DEFAULTS, with any numbers from the limits file laid over them (unknown keys ignored)."""
    out = {k: dict(v) for k, v in DEFAULTS.items()}
    p = Path(path or os.environ.get("HEC_LIMITS_FILE") or "/etc/hec-monitor/limits.json")
    try:
        extra = json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return out
    for prov, vals in (extra or {}).items():
        if prov in out and isinstance(vals, dict):
            out[prov].update({k: float(v) for k, v in vals.items() if k in out[prov] and isinstance(v, (int, float))})
    return out


class Quota:
    def __init__(self, name: str, limits: dict, path: str | Path | None = None, clock=time.time):
        self.name, self.lim, self.clock = name, limits, clock
        self.path = Path(path) if path else None
        self.events: list[tuple[float, float]] = []   # (time, audio seconds)
        self.blocked_until = 0.0
        self._load()

    # ---- persistence
    def _load(self) -> None:
        if not self.path or not self.path.exists():
            return
        try:
            d = json.loads(self.path.read_text(encoding="utf-8"))
            self.events = [(float(t), float(s)) for t, s in d.get("events", [])]
            self.blocked_until = float(d.get("blocked_until", 0))
        except (OSError, ValueError, TypeError):
            self.events, self.blocked_until = [], 0.0

    def _save(self) -> None:
        if not self.path:
            return
        try:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            tmp = self.path.with_suffix(".tmp")
            tmp.write_text(json.dumps({"events": self.events, "blocked_until": self.blocked_until}), encoding="utf-8")
            os.replace(tmp, self.path)
        except OSError:
            pass

    def _prune(self, now: float) -> None:
        self.events = [(t, s) for t, s in self.events if now - t < DAY]

    # ---- the rule
    def _caps(self) -> list[tuple[float, str, float]]:
        """(window seconds, 'req' | 'audio' | 'neurons', cap after the safety margin)."""
        m, L, out = float(self.lim.get("margin", 1.0)), self.lim, []
        if L.get("rpm"):
            out.append((MINUTE, "req", max(1.0, L["rpm"] * m)))
        if L.get("rpd"):
            out.append((DAY, "req", L["rpd"] * m))
        if L.get("ash"):
            out.append((HOUR, "audio", L["ash"] * m))
        if L.get("asd"):
            out.append((DAY, "audio", L["asd"] * m))
        if L.get("neurons_per_day"):
            out.append((DAY, "neurons", L["neurons_per_day"] * m))
        return out

    def _cost(self, kind: str, audio_s: float) -> float:
        if kind == "req":
            return 1.0
        if kind == "audio":
            return audio_s
        return audio_s / 60.0 * float(self.lim.get("neurons_per_audio_min", 0))

    def wait_for(self, audio_s: float) -> float:
        """Seconds to wait before a call of audio_s fits every window; inf when it can never fit one."""
        now = self.clock()
        self._prune(now)
        wait = max(0.0, self.blocked_until - now)
        for window, kind, cap in self._caps():
            need = self._cost(kind, audio_s)
            if need > cap:
                return float("inf")
            used = [(t, self._cost(kind, s)) for t, s in self.events if now - t < window]
            total = sum(c for _, c in used)
            if total + need <= cap:
                continue
            # the oldest calls leave the window first; wait until enough have left
            for t, c in sorted(used):
                total -= c
                if total + need <= cap:
                    wait = max(wait, t + window - now)
                    break
        return wait

    def record(self, audio_s: float) -> None:
        now = self.clock()
        self._prune(now)
        self.events.append((now, float(audio_s)))
        self._save()

    def block(self, seconds: float) -> None:
        self.blocked_until = max(self.blocked_until, self.clock() + max(0.0, float(seconds)))
        self._save()

    def used_today(self) -> dict:
        now = self.clock()
        self._prune(now)
        audio = sum(s for _, s in self.events)
        return {"requests": len(self.events), "audio_s": round(audio),
                "neurons": round(audio / 60.0 * float(self.lim.get("neurons_per_audio_min", 0)))}
