"""Where the job takes a recorder chunk from (R2 move, Nov 2026): R2 through a 5-minute link the Worker gives the
signed-in person, Supabase Storage otherwise; each chunk once; audio that is gone is a clean, final outcome.
A FAKE transport stands in for Supabase and the hec-files Worker: no network."""
from __future__ import annotations

import io
import json
import urllib.parse

import numpy as np
import pytest

import audio
import nightly
import pilot_common as pc
from supa import Api, ApiError, AudioGone, Session

from test_nightly_fake import ROW, STEP0, FakeApi, FakeModel

URL = "https://proj.invalid"
WORKER = "https://files.invalid"
STORE = f"{URL}/storage/v1/object/authenticated/class-recorder-audio/"


class Net:
    """The three places a download can go. `r2` = paths in file_objects (and in the Worker's bucket);
    `supa` = objects in Storage. Every request is kept so a test can read what was asked of whom."""

    def __init__(self):
        self.r2, self.supa = {}, {}
        self.log, self.link_n, self.expire_first_link, self.flaky = [], 0, False, 0

    def __call__(self, method, url, headers, body, timeout=120):
        self.log.append((method, url, dict(headers), body))
        if url.startswith(f"{URL}/rest/v1/file_objects"):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)["path"][0]
            wanted = json.loads("[" + q[len("in.("):-1] + "]")
            return 200, json.dumps([{"path": p} for p in wanted if p in self.r2]).encode()
        if url == f"{WORKER}/v1/sign":
            p = json.loads(body)["paths"][0]
            self.link_n += 1
            return 200, json.dumps({"urls": {p: f"{WORKER}/f/class-recorder-audio/{p}?o=r&e=1&s=x&n={self.link_n}"}}).encode()
        if url.startswith(f"{WORKER}/f/"):
            if self.flaky:
                self.flaky -= 1
                return 0, b'{"message":"network: URLError"}'
            if self.expire_first_link and "n=1" in url:
                return 403, b'{"error":"link expired"}'
            p = urllib.parse.unquote(urllib.parse.urlparse(url).path[len("/f/class-recorder-audio/"):])
            return (200, self.r2[p]) if p in self.r2 else (404, b'{"error":"No such file"}')
        if url.startswith(STORE):
            p = urllib.parse.unquote(url[len(STORE):])
            return (200, self.supa[p]) if p in self.supa else (400, b'{"statusCode":"404","error":"not_found","message":"Object not found"}')
        raise AssertionError(url)

    def hosts(self):
        return [u.split("?")[0] for _, u, _, _ in self.log]


@pytest.fixture
def api(monkeypatch):
    monkeypatch.setenv("HEC_FILES_URL", WORKER)
    monkeypatch.setattr(Api, "sleep", staticmethod(lambda s: None))
    net = Net()
    s = Session(URL, "pk", net)
    s._token, s._refresh, s._exp = "person-token", "", float("inf")
    a = Api(s)
    a.net = net
    return a


def test_a_file_in_r2_comes_from_the_worker_link_and_never_from_storage(api):
    api.net.r2["c/r/room/000000.flac"] = b"R2 BYTES"
    assert api.download("c/r/room/000000.flac") == b"R2 BYTES"
    assert not any("/storage/v1/" in h for h in api.net.hosts())
    sign = [(u, h, b) for m, u, h, b in api.net.log if u == f"{WORKER}/v1/sign"][0]
    assert sign[1]["Authorization"] == "Bearer person-token"            # the signed-in person, as the website does
    names = {k.lower() for k in sign[1]}
    assert "x-hec-as" not in names and "x-hec-server-key" not in names  # never the service role
    assert json.loads(sign[2]) == {"op": "read", "bucket": "class-recorder-audio", "paths": ["c/r/room/000000.flac"]}
    link = [h for m, u, h, b in api.net.log if u.startswith(f"{WORKER}/f/")][0]
    assert "Authorization" not in link and "apikey" not in link        # the link is the credential; nothing else goes with it


def test_a_file_not_in_r2_comes_from_supabase_storage(api):
    api.net.supa["c/r/room/000001.flac"] = b"SUPA BYTES"
    assert api.download("c/r/room/000001.flac") == b"SUPA BYTES"
    assert not any(u.startswith(WORKER) for u in api.net.hosts())


def test_one_lesson_can_be_part_r2_part_supabase_and_locate_is_one_request_per_fifty(api):
    paths = [f"c/r/room/{i:06d}.flac" for i in range(120)]
    for i, p in enumerate(paths):
        (api.net.r2 if i % 2 else api.net.supa)[p] = f"b{i}".encode()
    where = api.locate(paths)
    assert [where[p] for p in paths] == [i % 2 == 1 for i in range(120)]
    assert sum(1 for h in api.net.hosts() if h.endswith("/rest/v1/file_objects")) == 3
    got = [api.download(p) for p in paths]
    assert got == [f"b{i}".encode() for i in range(120)]
    assert sum(1 for h in api.net.hosts() if h.endswith("/rest/v1/file_objects")) == 3   # cached: nothing asked again per chunk
    assert api.net.link_n == 60                                                         # one 5-minute link per R2 chunk
    assert len(set(u for u in api.net.hosts() if u.startswith(STORE))) == 60            # and each Supabase chunk once


def test_a_failed_location_read_falls_back_to_supabase(api, monkeypatch):
    api.net.supa["c/r/room/000000.flac"] = b"S"

    def down(self, table, query):
        raise ApiError(500, "down")
    monkeypatch.setattr(Api, "select", down)
    assert api.download("c/r/room/000000.flac") == b"S"


def test_audio_in_neither_place_raises_audio_gone(api):
    with pytest.raises(AudioGone):
        api.download("c/r/room/000009.flac")                                # Storage: not found
    api.net.r2["c/r/room/000008.flac"] = b"x"
    api.locate(["c/r/room/000008.flac"])
    del api.net.r2["c/r/room/000008.flac"]                                  # row seen, object gone from R2
    with pytest.raises(AudioGone):
        api.download("c/r/room/000008.flac")


def test_other_refusals_are_not_audio_gone():
    s = Session(URL, "pk", lambda m, u, h, b, timeout=120: (401, b'{"message":"JWT expired"}'))
    s._token, s._refresh, s._exp = "t", "", float("inf")
    with pytest.raises(ApiError) as e:
        Api(s).download("c/r/room/000000.flac")
    assert not isinstance(e.value, AudioGone) and e.value.status == 401


def test_a_dropped_line_is_retried_and_an_expired_link_is_asked_for_again_once(api):
    api.net.r2["c/r/room/000000.flac"] = b"R2"
    api.net.flaky = 2
    assert api.download("c/r/room/000000.flac") == b"R2"
    api.net.expire_first_link, api.net.link_n = True, 0
    assert api.download("c/r/room/000000.flac") == b"R2"
    assert api.net.link_n == 2


# ------------------------------------------------------------------ the job

class R2Api(FakeApi):
    """FakeApi plus the new surface: locate(), and a count of every download by path."""

    def __init__(self, gone_from=None, **kw):
        super().__init__(**kw)
        self.fetched, self.located = [], []
        self.gone_from = gone_from      # seq from which the server has nothing any more

    def locate(self, paths):
        self.located.append(list(paths))
        return {p: i % 2 == 0 for i, p in enumerate(paths)}

    def download(self, path):
        self.fetched.append(path)
        if self.gone_from is not None and int(path.rsplit("/", 1)[1].split(".")[0]) >= self.gone_from:
            raise AudioGone(404, "Object not found")
        return super().download(path)


def test_the_job_locates_once_and_fetches_every_chunk_exactly_once(pilot_root):
    api = R2Api()
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "saved"
    assert len(api.located) == 1 and len(api.located[0]) == 8                # both tracks, one look
    assert sorted(api.fetched) == sorted(c["storage_path"] for c in api.chunks)
    assert len(api.fetched) == len(set(api.fetched))                         # no chunk twice
    assert pc.files_under(pc.audio_dir()) == []


def test_audio_already_gone_is_a_final_recorded_outcome_not_a_crash(pilot_root):
    api = R2Api(gone_from=0)
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "audio_gone"
    assert api.runs == [("refused", "audio_gone")] and api.saved == []
    assert pc.files_under(pc.audio_dir()) == [] and pc.files_under(pc.drafts_dir()) == []
    assert len(api.fetched) == 1                                              # it stopped at the first missing chunk


def test_audio_that_goes_part_way_through_leaves_nothing_behind(pilot_root):
    api = R2Api(gone_from=2)
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "audio_gone"
    assert api.runs == [("refused", "audio_gone")]
    assert pc.files_under(pc.audio_dir()) == []


def test_a_recording_with_its_report_is_never_downloaded_again(pilot_root):
    api = R2Api(begin={"ok": False, "reason": "already_done"})
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "already_done"
    assert api.fetched == [] and api.located == [] and api.runs == []


def test_a_recording_whose_audio_the_server_deleted_is_not_downloaded(pilot_root):
    api = R2Api(begin={"ok": False, "reason": "not_complete"})
    assert nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False) == "not_complete"
    assert api.fetched == []


def test_after_the_report_is_saved_the_later_passes_read_no_server_audio(pilot_root):
    api = R2Api()
    nightly.process_one(api, ROW, FakeModel(), STEP0, keep_local=False)
    n = len(api.fetched)
    nightly.upload_drafts(api)                                                # reports kept locally
    nightly.purge_local_drafts(api)
    assert len(api.fetched) == n


# ------------------------------------------------------------------ the format may change

def _tone(sr=48000, seconds=2.0):
    t = np.arange(int(sr * seconds)) / sr
    return (0.3 * np.sin(2 * np.pi * 220 * t)).astype(np.float32), sr


def test_flac_still_decodes_through_libsndfile():
    import soundfile as sf
    x, sr = _tone()
    buf = io.BytesIO()
    sf.write(buf, x, sr, format="FLAC")
    y, sr2 = audio.decode(buf.getvalue())
    assert sr2 == sr and abs(len(y) - len(x)) <= 1 and np.allclose(y[:1000], x[:1000], atol=1e-3)


def test_a_format_libsndfile_cannot_read_falls_back_to_pyav():
    av = pytest.importorskip("av")
    x, sr = _tone()
    buf = io.BytesIO()
    with av.open(buf, "w", format="mp4") as c:                                # AAC in MP4: libsndfile cannot read it
        try:
            st = c.add_stream("aac", rate=sr)
        except Exception:
            pytest.skip("this PyAV has no AAC encoder")
        st.layout = "mono"
        pcm = (x * 32767).astype("<i2")[None, :]
        for i in range(0, pcm.shape[1] - 1023, 1024):
            f = av.AudioFrame.from_ndarray(pcm[:, i:i + 1024].copy(), format="s16p", layout="mono")
            f.sample_rate = sr
            for pkt in st.encode(f):
                c.mux(pkt)
        for pkt in st.encode(None):
            c.mux(pkt)
    y, sr2 = audio.decode(buf.getvalue())
    assert sr2 == sr and y.dtype == np.float32 and y.ndim == 1 and len(y) > 48000
    assert float(np.abs(y).max()) > 0.1
