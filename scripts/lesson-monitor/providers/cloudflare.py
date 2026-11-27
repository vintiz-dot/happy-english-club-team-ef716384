"""Cloudflare Workers AI Whisper: @cf/openai/whisper-large-v3-turbo through the REST API.

POST https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/@cf/openai/whisper-large-v3-turbo with JSON
{"audio": base64 of the piece as 16-bit FLAC, "task": "transcribe", "language": "en"} (no VAD: Groq has none
either, and a quiet child should not be cut by one transcriber only). The answer's result.segments carry start,
end, text and, when sent, avg_logprob, no_speech_prob, compression_ratio and words.

The free plan's allowance is neurons a day (quota.py); a 429 or Cloudflare's "daily free allocation" error
(code 3036) ends Cloudflare's part of the run (QuotaExhausted) instead of retrying.

Credentials: $CREDENTIALS_DIRECTORY/cloudflare-ai (or HEC_CF_AI_FILE), two lines: the account id, then an API
token with only "Workers AI: Read" (it can run models and nothing else). Never in the repo, never logged.
Cloudflare states that Workers AI does not use customer inputs or outputs to train models.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path

from . import AuthFailed, Base, ProviderError, QuotaExhausted, encode_flac, safe_code, segment
from . import net

MODEL = "@cf/openai/whisper-large-v3-turbo"
URL = "https://api.cloudflare.com/client/v4/accounts/{account}/ai/run/" + MODEL
DAILY_CODES = {3036}


def read_credentials(name: str = "cloudflare-ai", env: str = "HEC_CF_AI_FILE") -> tuple[str, str]:
    p = os.environ.get(env) or (os.path.join(os.environ["CREDENTIALS_DIRECTORY"], name) if os.environ.get("CREDENTIALS_DIRECTORY") else "")
    if not p:
        return "", ""
    try:
        lines = [ln.strip() for ln in Path(p).read_text(encoding="utf-8").splitlines() if ln.strip()]
    except OSError:
        return "", ""
    return (lines[0], lines[1]) if len(lines) >= 2 else ("", "")


class Cloudflare(Base):
    name = "cloudflare"
    model = MODEL

    def __init__(self, account: str, token: str, quota, transport=None, **kw):
        super().__init__(quota, **kw)
        self.account, self.token = account, token
        self.transport = transport or net.request

    def _call(self, x, offset_s):
        body = json.dumps({"audio": base64.b64encode(encode_flac(x)).decode(), "task": "transcribe", "language": "en"}).encode()
        st, hdr, raw = self.transport("POST", URL.format(account=self.account),
                                      {"Authorization": f"Bearer {self.token}", "Content-Type": "application/json"}, body)
        codes = _error_codes(raw)
        if st == 200 and not codes:
            return parse(raw, offset_s)
        if st == 429 or codes & DAILY_CODES:
            # A daily allowance does not come back within the job's wait: say so with a long retry.
            raise QuotaExhausted("daily_allowance" if codes & DAILY_CODES else "rate_limited",
                                 retry_after=86400.0 if codes & DAILY_CODES else net.retry_after(hdr))
        if st in (401, 403):
            raise AuthFailed(f"auth_{st}")
        if st == 413:
            raise ProviderError("too_large")
        if st == 0:
            raise ProviderError("network")
        if st >= 500:
            raise ProviderError("unavailable")
        raise ProviderError(safe_code(f"http_{st}"))


def _error_codes(raw: bytes) -> set[int]:
    try:
        d = json.loads(raw)
    except ValueError:
        return set()
    if not isinstance(d, dict) or d.get("success", True):
        return set()
    out = set()
    for e in d.get("errors") or []:
        try:
            out.add(int(e.get("code")))
        except (TypeError, ValueError, AttributeError):
            out.add(-1)
    return out or {-1}


def parse(raw: bytes, offset_s: float) -> list[dict]:
    try:
        d = json.loads(raw)
    except ValueError as e:
        raise ProviderError("bad_answer") from e
    r = d.get("result") if isinstance(d, dict) and "result" in d else d
    out = []
    for s in (r or {}).get("segments") or []:
        seg = segment(s, offset_s)
        if seg:
            out.append(seg)
    return out
