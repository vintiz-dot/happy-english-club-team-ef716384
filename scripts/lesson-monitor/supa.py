"""Signing in for the pilot, and the few Supabase calls the job makes.

HOW THE OPERATOR SIGNS IN (once per night, nothing stored):
  The job is started by a person at the end of the day (the owner as admin, or
  the class's teacher). It asks for that person's app email and password with
  a hidden prompt, signs in through the app's normal sign-in (the publishable
  key, exactly like the website), keeps the access token and the refresh token
  in memory only and refreshes the access token itself while it works. The
  password is dropped as soon as the sign-in answers. Nothing is written to
  disk, printed or logged: no password, no token. Closing the window ends the
  session's use here (the refresh token dies with the process).

  Alternative (--token): paste an access token copied from a signed-in browser
  (hidden prompt). It cannot be refreshed and expires in about an hour, so the
  job downloads first, transcribes offline, and keeps any report it could not
  save as a local draft; `nightly.py --upload-drafts` saves those the next day.

  There is NO service-role key anywhere in this job: every read and write goes
  through the signed-in person's own permissions (RLS), so the recorder's and
  the monitor's checks apply to the job exactly as to that person in the app.

The URL and the publishable key are public: HEC_SUPABASE_URL /
HEC_SUPABASE_PUBLISHABLE_KEY, or else ONLY the VITE_SUPABASE_URL and
VITE_SUPABASE_PUBLISHABLE_KEY lines of the repo's .env (nothing else in it is read).
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BUCKET = "class-recorder-audio"


def supabase_conf() -> tuple[str, str]:
    url = os.environ.get("HEC_SUPABASE_URL")
    key = os.environ.get("HEC_SUPABASE_PUBLISHABLE_KEY")
    if not (url and key):
        env = Path(__file__).resolve().parents[2] / ".env"
        if env.exists():
            for line in env.read_text(encoding="utf-8").splitlines():
                k, _, v = line.partition("=")
                if k.strip() == "VITE_SUPABASE_URL" and not url:
                    url = v.strip().strip('"')
                elif k.strip() == "VITE_SUPABASE_PUBLISHABLE_KEY" and not key:
                    key = v.strip().strip('"')
    if not (url and key):
        sys.exit("Set HEC_SUPABASE_URL and HEC_SUPABASE_PUBLISHABLE_KEY (both public)")
    return url.rstrip("/"), key


def http(method: str, url: str, headers: dict, body: bytes | None, timeout: float = 120) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()
    except (urllib.error.URLError, TimeoutError) as e:
        return 0, json.dumps({"message": f"network: {type(e).__name__}"}).encode()


class ApiError(Exception):
    """A refusal from the database or storage. The message is the server's own
    wording of the refusal (our SQL's text), never a token or request body."""

    def __init__(self, status: int, message: str):
        super().__init__(f"HTTP {status}: {message}")
        self.status = status
        self.message = message


def _message(raw: bytes) -> str:
    try:
        d = json.loads(raw)
    except ValueError:
        return "(no message)"
    if isinstance(d, dict):
        return str(d.get("message") or d.get("error") or d.get("msg") or "(no message)")[:300]
    return "(no message)"


class Session:
    """The signed-in person's tokens, in memory only."""

    def __init__(self, url: str, key: str, transport=http):
        self.url, self.key, self._http = url, key, transport
        self._token = ""
        self._refresh = ""
        self._exp = 0.0

    def _take(self, st: int, raw: bytes) -> None:
        try:
            d = json.loads(raw)
        except ValueError:
            d = {}
        if st != 200 or not d.get("access_token"):
            sys.exit(f"sign-in failed (HTTP {st}): check the email and password")
        self._token = d["access_token"]
        self._refresh = d.get("refresh_token") or ""
        self._exp = float(d.get("expires_at") or (time.time() + float(d.get("expires_in") or 3600)))

    def sign_in_password(self, email: str, password: str) -> None:
        st, raw = self._http("POST", f"{self.url}/auth/v1/token?grant_type=password",
                             {"apikey": self.key, "Content-Type": "application/json"},
                             json.dumps({"email": email, "password": password}).encode())
        self._take(st, raw)

    def sign_in_prompt(self) -> None:
        import getpass
        email = input("App email (admin, or the class's teacher): ").strip()
        password = getpass.getpass("Password (hidden, not stored): ")
        try:
            self.sign_in_password(email, password)
        finally:
            del password

    def use_pasted_token(self) -> None:
        import getpass
        t = getpass.getpass("Paste the access token (hidden, not stored; expires in about an hour): ").strip()
        if not t:
            sys.exit("no token pasted")
        self._token, self._refresh, self._exp = t, "", float("inf")

    @property
    def can_refresh(self) -> bool:
        return bool(self._refresh)

    def token(self) -> str:
        if self._refresh and time.time() > self._exp - 120:
            st, raw = self._http("POST", f"{self.url}/auth/v1/token?grant_type=refresh_token",
                                 {"apikey": self.key, "Content-Type": "application/json"},
                                 json.dumps({"refresh_token": self._refresh}).encode())
            self._take(st, raw)
        return self._token


class Api:
    """PostgREST + Storage as the signed-in person."""

    def __init__(self, session: Session):
        self.s = session

    def _h(self, extra: dict | None = None) -> dict:
        h = {"apikey": self.s.key, "Authorization": f"Bearer {self.s.token()}"}
        h.update(extra or {})
        return h

    def rpc(self, fn: str, args: dict | None = None):
        st, raw = self.s._http("POST", f"{self.s.url}/rest/v1/rpc/{fn}",
                               self._h({"Content-Type": "application/json"}), json.dumps(args or {}).encode())
        if st // 100 != 2:
            raise ApiError(st, _message(raw))
        return json.loads(raw) if raw else None

    def select(self, table: str, query: dict) -> list:
        qs = urllib.parse.urlencode(query, safe="(),.*:")
        st, raw = self.s._http("GET", f"{self.s.url}/rest/v1/{table}?{qs}", self._h(), None)
        if st // 100 != 2:
            raise ApiError(st, _message(raw))
        return json.loads(raw)

    def download(self, path: str) -> bytes:
        """An authenticated download (never a signed URL, C1 s.6.4)."""
        quoted = urllib.parse.quote(path, safe="/")
        st, raw = self.s._http("GET", f"{self.s.url}/storage/v1/object/authenticated/{BUCKET}/{quoted}", self._h(), None, timeout=300)
        if st != 200:
            raise ApiError(st, _message(raw))
        return raw


def open_api(pasted_token: bool = False) -> Api:
    url, key = supabase_conf()
    s = Session(url, key)
    if not sys.stdin.isatty():
        sys.exit("The pilot signs in interactively: run it in a terminal window")
    if pasted_token:
        s.use_pasted_token()
    else:
        s.sign_in_prompt()
    return Api(s)
