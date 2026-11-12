"""vendor_batch against a local fake proxy (no vendor, no real network, synthetic tones only).

    python -m pytest scripts/lesson-eval/tests/test_vendor_batch.py -q
"""
import json
import os
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

import numpy as np
import pytest
import soundfile as sf

HERE = Path(__file__).resolve().parent
SCRIPTS = HERE.parent
sys.path.insert(0, str(SCRIPTS))
import vendor_batch  # noqa: E402
import vendor_run  # noqa: E402


def test_derive_lesson_map_by_properties_only():
    rows = [
        {"set": "lessons", "wav_file": "a.wav", "source_sha256": "af000bb5xx", "source_duration_s": "4604.2", "source_sample_rate": "48000", "source_bitrate": "68045"},
        {"set": "lessons", "wav_file": "b.wav", "source_sha256": "1", "source_duration_s": "8337.2", "source_sample_rate": "48000", "source_bitrate": "86832"},
        {"set": "lessons", "wav_file": "c.wav", "source_sha256": "2", "source_duration_s": "8337.2", "source_sample_rate": "16000", "source_bitrate": "32000"},
        {"set": "lessons", "wav_file": "d.wav", "source_sha256": "3", "source_duration_s": "5069.3", "source_sample_rate": "16000", "source_bitrate": "38146"},
        {"set": "lessons", "wav_file": "e.wav", "source_sha256": "4", "source_duration_s": "5213.36", "source_sample_rate": "48000", "source_bitrate": "88072"},
        {"set": "videos", "wav_file": "f.wav", "source_sha256": "5", "source_duration_s": "8337.2", "source_sample_rate": "48000"},
    ]
    assert vendor_batch.derive_lesson_map(rows) == {"L3": "a.wav", "L1": "b.wav", "L4": "c.wav", "L2": "d.wav"}


def test_run_id_fits_server_pattern():
    for v, m, _ in vendor_batch.SYSTEMS:
        assert vendor_run.RUN_RE.fullmatch(vendor_batch.run_id_of(v, m))
        assert m in vendor_run.MODES[v]


def test_piece_seconds_and_names():
    src = {"kind": "cut", "code_dir": "lessons/L1", "duration": 1200.0}
    ps = vendor_batch.piece_seconds(src, vendor_batch.LESSON_PIECE_MIN)
    assert [o for o, _ in ps] == ["lessons/L1/p0001.flac", "lessons/L1/p0002.flac"]
    assert sum(s for _, s in ps) == pytest.approx(1200 + 20)
    for o, _ in ps:
        assert vendor_run.PATH_RE.fullmatch(o)


def test_short_code_never_carries_a_body():
    assert vendor_run.short_code({"error": "vendor error", "vendor_status": 400}) == "vendor error (vendor 400)"
    assert "<" not in vendor_run.short_code({"error": "Bearer abc<script>{}"})


def test_run_system_skips_after_error_and_ceiling():
    def fake(argv, session=None, report=None):
        report.update({"ok": 1, "cached": 2, "errors": [{"obj": "x", "status": 502, "code": "vendor error"}], "sent_s": 60, "minutes_ok": 1.0})
        return 1
    r = vendor_batch.run_system("openai", "whisper-1", [{"name": "synth", "argv": []}, {"name": "clips", "argv": []}], None, 100, run=fake)
    assert r["failed"] == 1 and r["ok"] == 1 and r["status"] == "skipped after error"
    assert "synth: HTTP 502" in r["first_error"]  # stopped at the first input set

    def stop(argv, session=None, report=None):
        report.update({"ok": 0, "cached": 0, "errors": [], "sent_s": 0, "minutes_ok": 0.0})
        return 1
    r = vendor_batch.run_system("azure", "fast-en-vi", [{"name": "synth", "argv": []}], None, 0, run=stop)
    assert r.get("ceiling") and r["failed"] == 0


# ---------------------------------------------------------------- fake proxy
class Fake(BaseHTTPRequestHandler):
    calls: list = []

    def log_message(self, *a):
        pass

    def _send(self, st, obj):
        b = json.dumps(obj).encode()
        self.send_response(st)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n)
        if "/storage/v1/object/" in self.path:
            return self._send(200, {"Key": "ok"})
        req = json.loads(body)
        Fake.calls.append((req["mode"], req["object_path"], self.headers.get("Authorization")))
        if req["mode"] == "whisper-1":
            return self._send(502, {"error": "vendor error", "vendor_status": 400})
        d = req["audio_seconds"]
        words = [{"w": "hello", "start": 1.0, "end": 1.5, "conf": 0.9, "speaker": "spk0", "lang": "en"}]
        self._send(200, {"schema": "hec-lesson-eval/1", "system": {"name": f"{req['vendor']}-{req['mode']}", "kind": "vendor", "settings": {}},
                         "audio_seconds": d, "cost_estimate_usd": 0.0,
                         "file": {"duration_s": d, "words": words, "turns": [{"start": 1.0, "end": 1.5, "speaker": "spk0"}], "word_timing": "vendor"}})


def run_batch(tmp, port, *extra):
    env = dict(os.environ, HEC_EVAL_ROOT=str(tmp), HEC_SUPABASE_URL=f"http://127.0.0.1:{port}",
               HEC_SUPABASE_PUBLISHABLE_KEY="anon", HEC_ADMIN_JWT="not-a-real-token")
    return subprocess.run([sys.executable, str(SCRIPTS / "vendor_batch.py"), *extra], env=env, capture_output=True, text=True, encoding="utf-8")


@pytest.fixture()
def root(tmp_path):
    sr = 16000
    t = np.arange(int(30 * sr)) / sr
    tone = (0.1 * np.sin(2 * np.pi * 220 * t)).astype("float32")
    mix = tmp_path / "work" / "mix" / "tagA"
    mix.mkdir(parents=True)
    sf.write(str(mix / "mix_tagA_000.wav"), tone, sr, subtype="PCM_16")
    lw = tmp_path / "work" / "wav16k"
    lw.mkdir(parents=True)
    sf.write(str(lw / "lesson.wav"), np.tile(tone, 3), sr, subtype="PCM_16")
    inp = tmp_path / "work" / "vendor" / "_inputs"
    inp.mkdir(parents=True)
    (inp / "lesson_map.json").write_text(json.dumps({"L1": str(lw / "lesson.wav")}), encoding="utf-8")
    return tmp_path


def test_batch_end_to_end_with_failing_system_and_resume(root):
    Fake.calls = []
    srv = HTTPServer(("127.0.0.1", 0), Fake)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port = srv.server_address[1]
    try:
        args = ["--systems", "azure-fast-multilingual,openai-whisper-1,gemini-transcribe-speakers", "--inputs", "synth,L1", "--yes"]
        dry = run_batch(root, port, *args, "--dry-run")
        assert dry.returncode == 0 and "TOTAL" in dry.stdout and not Fake.calls
        p = run_batch(root, port, *args)
        assert p.returncode == 1, p.stdout + p.stderr
        out = p.stdout
        assert "openai-whisper-1" in out and "HTTP 502 vendor error (vendor 400)" in out
        assert "gemini-transcribe-speakers" in out  # ran after the failed system
        modes = {m for m, _, _ in Fake.calls}
        assert modes == {"fast-multilingual", "whisper-1", "transcribe-speakers"}
        assert all(a == "Bearer not-a-real-token" for _, _, a in Fake.calls)
        assert "not-a-real-token" not in out
        for v, m in (("azure", "fast-multilingual"), ("gemini", "transcribe-speakers")):
            d = root / "work" / "vendor" / v / m
            assert (d / f"result_b1-{v}-{m}.synth.json").exists() and (d / f"result_b1-{v}-{m}.L1.json").exists()
        n = len(Fake.calls)
        again = run_batch(root, port, "--systems", "azure-fast-multilingual,gemini-transcribe-speakers", "--inputs", "synth,L1", "--yes")
        assert len(Fake.calls) == n  # everything saved: nothing re-sent
        assert "Nothing to send" in again.stdout
    finally:
        srv.shutdown()


def test_refuses_over_ceiling(root):
    p = run_batch(root, 9, "--systems", "azure-fast-multilingual", "--inputs", "synth", "--max-total-minutes", "0.1", "--yes")
    assert p.returncode == 2 and "REFUSED" in p.stdout


def test_refuses_work_inside_a_git_repo(tmp_path):
    (tmp_path / ".git").mkdir()
    p = run_batch(tmp_path, 9, "--dry-run")
    assert p.returncode == 3 and "REFUSED" in p.stderr
