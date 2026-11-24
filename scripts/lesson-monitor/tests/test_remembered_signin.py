"""The remembered sign-in (24 Nov 2026): one sign-in, then the app's session is kept sealed for this
Windows account, never the password. A FAKE auth server and a stand-in for DPAPI; no network."""
from __future__ import annotations

import json
import sys

import pytest

import supa


class Xor:
    def protect(self, d):
        return bytes(x ^ 0x33 for x in d)

    def unprotect(self, d):
        return bytes(x ^ 0x33 for x in d)


class Auth:
    """Refresh tokens are single-use, as Supabase's are."""

    def __init__(self):
        self.valid, self.n, self.calls = set(), 0, []

    def __call__(self, method, url, headers, body, timeout=120):
        self.calls.append(url.split("grant_type=")[-1])
        d = json.loads(body)
        if "password" in d and d["password"] != "right":
            return 400, b"{}"
        if "refresh_token" in d:
            if d["refresh_token"] not in self.valid:
                return 400, b'{"error":"invalid refresh token"}'
            self.valid.discard(d["refresh_token"])
        self.n += 1
        tok = f"r{self.n}"
        self.valid.add(tok)
        return 200, json.dumps({"access_token": f"a{self.n}", "refresh_token": tok, "expires_in": 3600}).encode()


@pytest.fixture
def env(tmp_path, monkeypatch):
    monkeypatch.setenv("HEC_SESSION_FILE", str(tmp_path / "s" / "session.bin"))
    monkeypatch.setenv("HEC_SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("HEC_SUPABASE_PUBLISHABLE_KEY", "pk")
    monkeypatch.setattr(supa, "CODEC", Xor())
    monkeypatch.setattr(sys.stdin, "isatty", lambda: True, raising=False)
    return tmp_path


def test_asks_once_then_never_again(env, monkeypatch):
    auth, asked = Auth(), []
    monkeypatch.setattr("builtins.input", lambda *_: asked.append("email") or "owner@example.invalid")
    monkeypatch.setattr("getpass.getpass", lambda *_: "right")
    supa.open_api(transport=auth)
    assert asked == ["email"]
    raw = supa.session_file().read_bytes()
    assert b"right" not in raw and b"owner" not in raw and b"r1" not in raw      # sealed; no password, no email
    api = supa.open_api(transport=auth)                                          # second run: no question
    assert asked == ["email"] and api.s.token() == "a2"
    assert supa.remembered() == "r2"                                             # the used token was swapped
    supa.open_api(transport=auth)
    assert asked == ["email"] and auth.calls == ["password", "refresh_token", "refresh_token"]


def test_a_refused_session_is_forgotten_and_asks_again(env, monkeypatch):
    auth = Auth()
    supa.remember("dead-token")
    monkeypatch.setattr("builtins.input", lambda *_: "owner@example.invalid")
    monkeypatch.setattr("getpass.getpass", lambda *_: "right")
    api = supa.open_api(transport=auth)
    assert api.s.token() == "a1" and supa.remembered() == "r1"


def test_forget(env):
    supa.remember("r9")
    assert supa.forget() is True and supa.remembered() == "" and supa.forget() is False


def test_a_long_run_keeps_the_newest_token(env):
    auth = Auth()
    s = supa.Session("https://example.invalid", "pk", auth, on_refresh=supa.remember)
    s.sign_in_password("owner@example.invalid", "right")
    s._exp = 0  # the access token ran out mid-night
    assert s.token() == "a2" and supa.remembered() == "r2"


@pytest.mark.skipif(sys.platform != "win32", reason="DPAPI is Windows only")
def test_real_dpapi_round_trip(tmp_path, monkeypatch):
    monkeypatch.setenv("HEC_SESSION_FILE", str(tmp_path / "session.bin"))
    monkeypatch.setattr(supa, "CODEC", None)
    supa.remember("token-xyz")
    assert b"token-xyz" not in (tmp_path / "session.bin").read_bytes() and supa.remembered() == "token-xyz"
