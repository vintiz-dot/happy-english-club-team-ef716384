"""Signing in for the pilot, and the few Supabase calls the job makes.

REMEMBERED SIGN-IN (owner, 24 Nov 2026: "store this one time and stop asking me"):
  After one sign-in with email and password, the scripts keep the app's SESSION,
  never the password: the refresh token the sign-in returns, sealed with Windows
  DPAPI for this Windows account (dpapi.py) in %USERPROFILE%/.hec-pilot/session.bin,
  outside the repo and the pilot folder. Another Windows account or computer
  cannot open it. Each run swaps it for a fresh one (Supabase refresh tokens are
  single-use), exactly as the website stays signed in. If it is refused (signed
  out everywhere, password changed, long unused) the script asks once more.
  `py -3 scripts/lesson-monitor/supa.py forget` deletes it; signing out of all
  devices in the app also ends it.

HOW THE OPERATOR SIGNS IN (the first time, or when the remembered session is refused):
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

WHERE A CHUNK LIVES (R2 move, Nov 2026): the recorder's audio is moving from Supabase Storage to the
private Cloudflare R2 bucket `hec-files`. A `public.file_objects` row means a file is in R2, none means
Supabase (AGENTS.md, "File storage"), so `Api.download` asks `file_objects` AS THE SIGNED-IN PERSON
(`locate`, one request per 50 chunks) and then takes each chunk from where it is:
  * R2: the hec-files Worker is asked for a 5-minute read link with the person's own token
    (POST /v1/sign, op read; never `x-hec-as`, never the service key), and the link is used at once,
    one link per chunk, never stored. HEC_FILES_URL overrides the Worker's address.
  * Supabase: the authenticated download, as before.
A chunk is fetched once per lesson. A file that is in neither place raises AudioGone, which the job
records as a final "audio_gone" outcome (the server deletes the audio after the report is saved).

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
FILES_WORKER = "https://hec-files.vintizfjes.workers.dev"  # same default as src/lib/files.ts
RETRIES = 3          # a dropped line or a 5xx is tried again; a refusal is not
LOCATE_BATCH = 50    # chunk paths per file_objects request (keeps the URL short)


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


# Cloudflare refuses urllib's default "Python-urllib/3.x" with a bare 403 ("error code: 1010") before the hec-files
# Worker sees the request: every R2 chunk download failed as error_apierror (28 Nov 2026, the first lesson in R2).
USER_AGENT = "hec-lesson-monitor/1"


def http(method: str, url: str, headers: dict, body: bytes | None, timeout: float = 120) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, method=method, headers={"User-Agent": USER_AGENT, **headers})
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


class AudioGone(ApiError):
    """The audio file is in neither R2 nor Supabase: the server's retention removed it (or it never arrived).
    Final for this recording: retrying cannot bring it back."""


def files_worker() -> str:
    return (os.environ.get("HEC_FILES_URL") or FILES_WORKER).rstrip("/")


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

    def __init__(self, url: str, key: str, transport=http, on_refresh=None):
        self.url, self.key, self._http = url, key, transport
        self._token = ""
        self._refresh = ""
        self._exp = 0.0
        self.on_refresh = on_refresh  # called with every new refresh token (the remembered sign-in keeps it)

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
        if self._refresh and self.on_refresh:
            self.on_refresh(self._refresh)

    def sign_in_refresh(self, refresh_token: str) -> bool:
        """A remembered session. False (nothing raised) when the app refuses it or cannot be reached."""
        try:
            st, raw = self._http("POST", f"{self.url}/auth/v1/token?grant_type=refresh_token",
                                 {"apikey": self.key, "Content-Type": "application/json"},
                                 json.dumps({"refresh_token": refresh_token}).encode())
            d = json.loads(raw) if raw else {}
        except (ValueError, OSError):
            return False
        if st != 200 or not d.get("access_token"):
            return False
        self._take(st, raw)
        return True

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
            # A refresh that fails (offline, refresh token dead) is an ApiError like any other
            # unreachable call, never sys.exit: the job must be able to stop and delete its audio copy.
            try:
                d = json.loads(raw)
            except ValueError:
                d = {}
            if st != 200 or not d.get("access_token"):
                raise ApiError(st if st in (0, 401) else 401, f"session refresh failed (HTTP {st})")
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

    def function(self, name: str, args: dict | None = None):
        """An edge function, as the signed-in person (their JWT)."""
        st, raw = self.s._http("POST", f"{self.s.url}/functions/v1/{name}",
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

    # ---- where a chunk lives
    def locate(self, paths: list[str]) -> dict[str, bool]:
        """{path: True if the file is in R2}. One file_objects read per LOCATE_BATCH paths, as the signed-in
        person (the table's read policy is the storage policy). A read that fails answers "not in R2" for
        those paths, which sends them to Supabase: the old behaviour, never a wrong file."""
        known = self.__dict__.setdefault("_in_r2", {})
        todo = [p for p in dict.fromkeys(paths) if p not in known]
        for i in range(0, len(todo), LOCATE_BATCH):
            batch = todo[i:i + LOCATE_BATCH]
            quoted = ",".join('"' + p.replace("\\", "\\\\").replace('"', '\\"') + '"' for p in batch)
            try:
                rows = self.select("file_objects", {"bucket_id": f"eq.{BUCKET}", "path": f"in.({quoted})", "select": "path"})
            except ApiError:
                rows = None
            if rows is None:
                continue  # unknown: decided per file at download time
            here = {r["path"] for r in rows}
            for p in batch:
                known[p] = p in here
        return {p: known[p] for p in paths if p in known}

    def _retry(self, call):
        """Run call() -> (status, raw); try again after a dropped line (0) or a 5xx, up to RETRIES times."""
        for attempt in range(RETRIES):
            st, raw = call()
            if st != 0 and st < 500:
                return st, raw
            if attempt + 1 < RETRIES:
                self.sleep(2.0 * (attempt + 1))
        return st, raw

    sleep = staticmethod(time.sleep)  # tests replace it so a retry costs no time

    def _download_r2(self, path: str) -> bytes:
        """A 5-minute read link for this one file, asked of the Worker with the person's own token, used at once."""
        for attempt in range(2):  # a link that expired between asking and using is asked for again, once
            st, raw = self._retry(lambda: self.s._http(
                "POST", f"{files_worker()}/v1/sign",
                self._h({"Content-Type": "application/json"}),
                json.dumps({"op": "read", "bucket": BUCKET, "paths": [path]}).encode()))
            if st // 100 != 2:
                raise ApiError(st, _message(raw))
            try:
                url = (json.loads(raw).get("urls") or {}).get(path)
            except ValueError:
                url = None
            if not url:
                raise ApiError(403, "no read link (not allowed, or not a recording you may listen to)")
            st, raw = self._retry(lambda: self.s._http("GET", url, {}, None, timeout=300))
            if st == 200:
                return raw
            if st == 404:
                raise AudioGone(404, "the file is no longer on the server")
            if st == 403 and attempt == 0:
                continue
            raise ApiError(st, _message(raw))
        raise ApiError(403, "link refused")

    def _download_supabase(self, path: str) -> bytes:
        """An authenticated download (never a signed URL, C1 s.6.4)."""
        quoted = urllib.parse.quote(path, safe="/")
        st, raw = self._retry(lambda: self.s._http(
            "GET", f"{self.s.url}/storage/v1/object/authenticated/{BUCKET}/{quoted}", self._h(), None, timeout=300))
        if st == 200:
            return raw
        msg = _message(raw)
        # Storage says a missing object with 404 (or 400 + "not found" on older versions).
        if st == 404 or (st == 400 and "not found" in msg.lower()):
            raise AudioGone(st, msg)
        raise ApiError(st, msg)

    def download(self, path: str) -> bytes:
        """One chunk's bytes, from R2 when the file is there and from Supabase otherwise. Raises AudioGone when
        the file is in neither. The caller checks size and SHA-256 against class_recording_chunks."""
        where = self.locate([path]).get(path)
        if where:
            return self._download_r2(path)
        return self._download_supabase(path)


# ------------------------------------------------------------------ the remembered session
CODEC = None  # tests put a stand-in here; on the laptop it is DPAPI, on the Linux server seal.KeySeal


def _codec():
    global CODEC
    if CODEC is None:
        import seal
        CODEC = seal.codec("hec-pilot-session")
    return CODEC


def session_file() -> Path:
    return Path(os.environ.get("HEC_SESSION_FILE") or (Path.home() / ".hec-pilot" / "session.bin"))


def remember(refresh_token: str) -> None:
    try:
        f = session_file()
        f.parent.mkdir(parents=True, exist_ok=True)
        tmp = f.with_suffix(".tmp")
        tmp.write_bytes(_codec().protect(refresh_token.encode()))
        os.replace(tmp, f)
    except (OSError, RuntimeError):
        pass  # not remembered: the next run asks again, nothing else changes


def remembered() -> str:
    try:
        return _codec().unprotect(session_file().read_bytes()).decode()
    except (OSError, RuntimeError, UnicodeDecodeError):
        return ""


def forget() -> bool:
    f = session_file()
    if f.exists():
        f.unlink()
        return True
    return False


def open_api(pasted_token: bool = False, transport=http) -> Api:
    url, key = supabase_conf()
    s = Session(url, key, transport)
    if pasted_token:
        if not sys.stdin.isatty():
            sys.exit("The pilot signs in interactively: run it in a terminal window")
        s.use_pasted_token()
        return Api(s)
    old = remembered()
    s.on_refresh = remember
    if old and s.sign_in_refresh(old):
        print(f"Signed in (remembered {_WHERE}; `supa.py forget` removes it).")
        return Api(s)
    if old:
        forget()
        print("The remembered sign-in was refused (signed out, password changed or unused too long): sign in again.")
    if not sys.stdin.isatty():
        sys.exit("The pilot signs in interactively: run it in a terminal window")
    s.sign_in_prompt()
    print(f"Signed in. You will not be asked again {_WHERE}.")
    return Api(s)


_WHERE = "on this Windows account" if sys.platform == "win32" else "on this server (sealed with its key)"

if __name__ == "__main__":
    if sys.argv[1:] == ["forget"]:
        print("remembered sign-in deleted" if forget() else f"no remembered sign-in {_WHERE}")
    elif sys.argv[1:] == ["signin"]:
        # The server's one-time sign-in (server/setup_oracle_vm.sh signin): the job account's email and password,
        # typed by a person at a hidden prompt; only the sealed refresh token is kept.
        open_api()
        if not remembered():
            print("The sealing key could not be used, so nothing was saved: the sign-in is NOT remembered on this machine.")
            sys.exit(1)
        print("ok: the job account is remembered on this machine")
    else:
        print("usage: supa.py forget | signin")
