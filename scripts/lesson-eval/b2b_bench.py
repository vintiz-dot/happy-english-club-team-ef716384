"""B2b: CPU-only speed and quality of the local speech pieces (transcription, diarization, identification).

Local only: no vendor, no token, no network except a first-time model download
from the id faster-whisper itself maps the size to (Systran/faster-whisper-<size>;
large-v3-turbo -> mobiuslabsgmbh/faster-whisper-large-v3-turbo), cached under
<root>\\models\\faster-whisper\\. Prints and stores AGGREGATES only (timings,
counts, agreement figures) - never a transcript word. Result JSONs (which do hold
children's words) go only under <root>\\work\\b2b\\, outside the repo (safe_out).

Every run records the machine's load next to its timing: other processes' share
of the CPU and free RAM, sampled every second, so a timing taken on a busy laptop
is marked "under load" and can be compared with a quiet-time rerun.

  asr     faster-whisper on an input set -> result_<tag>.json (hec-lesson-eval/1)
          + metrics_<tag>.json (RTF, peak RAM, CPU %, load)
            --set select  : 2 synth mixes, 6 held-out clips, L2 first 180 s (config choice)
            --set quality : 4 synth mixes (one per condition), 17 clips, L1-L3 first 240 s
            --set timing  : L2 first 600 s only (the speed figure)
  diar    local diarizer on the six B2 tuning mixes (DER as B2) and on the timing piece
            --engine own (energy VAD + 1.5 s chunks + 3D-Speaker CAM++ + AHC, B2's best)
            --engine sherpa (pyannote segmentation-3.0 ONNX + embedding + fast clustering)
  ident   ECAPA embedding speed on cluster-like turns of the timing piece (B2's quality
          figures are on B2's units and are quoted, not recomputed); no embedding is saved
  e2e     transcription + diarization + cluster matching on the first --minutes of a lesson,
          one stage after another in this process; nothing per-child is written (no samples,
          no voiceprints), only stage timings and counts
  score   agreement of every b2b ASR result with the B1 vendor results on the same files

One heavy job per process; peak RAM is the process peak, so run one config per call.

    PY scripts\\lesson-eval\\b2b_bench.py asr --size small --threads 4 --lang en --vad off --set quality
    PY scripts\\lesson-eval\\b2b_bench.py asr --size small --threads 8 --lang en --vad off --set timing
    PY scripts\\lesson-eval\\b2b_bench.py diar --engine own --threads 4
    PY scripts\\lesson-eval\\b2b_bench.py ident --threads 4
    PY scripts\\lesson-eval\\b2b_bench.py e2e --lesson L2 --minutes 20 --size small --threads 4
    PY scripts\\lesson-eval\\b2b_bench.py score
"""
from __future__ import annotations

import argparse
import ctypes
import json
import os
import sys
import threading
import time
from ctypes import wintypes
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import common  # noqa: E402
from common import SR, WORK, read_wav, safe_out  # noqa: E402

MODELS = common.ROOT / "models"
os.environ.setdefault("HF_HOME", str(MODELS / "hf"))
os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
OUT = WORK / "b2b"

SELECT = {"synth": ["mix_seed7_ov05_s500_000", "mix_seed7_ov15_s500_000"],
          "clips": ["S01_held_01", "S02_held_01", "S03_held_01", "S04_held_01", "S05_held_01", "S06_held_01"],
          "lessons": {"L2": 180.0}}
QUALITY = {"synth": ["mix_seed7_ov00_s500_000", "mix_seed7_ov05_none_000", "mix_seed7_ov05_s500_000",
                     "mix_seed7_ov15_s500_000"],
           "clips": None,  # all 17
           "lessons": {"L1": 240.0, "L2": 240.0, "L3": 240.0}}
TIMING = {"synth": [], "clips": [], "lessons": {"L2": 600.0}}
SETS = {"select": SELECT, "quality": QUALITY, "timing": TIMING}


# ------------------------------------------------------------ load monitor (Windows, ctypes)

class _FT(ctypes.Structure):
    _fields_ = [("lo", wintypes.DWORD), ("hi", wintypes.DWORD)]


def _ft(f: _FT) -> float:
    return ((f.hi << 32) | f.lo) / 1e7


class _MEMSTAT(ctypes.Structure):
    _fields_ = [("dwLength", wintypes.DWORD), ("dwMemoryLoad", wintypes.DWORD),
                ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]


class _PMC(ctypes.Structure):
    _fields_ = [("cb", wintypes.DWORD), ("PageFaultCount", wintypes.DWORD),
                ("PeakWorkingSetSize", ctypes.c_size_t), ("WorkingSetSize", ctypes.c_size_t),
                ("QuotaPeakPagedPoolUsage", ctypes.c_size_t), ("QuotaPagedPoolUsage", ctypes.c_size_t),
                ("QuotaPeakNonPagedPoolUsage", ctypes.c_size_t), ("QuotaNonPagedPoolUsage", ctypes.c_size_t),
                ("PagefileUsage", ctypes.c_size_t), ("PeakPagefileUsage", ctypes.c_size_t),
                ("PrivateUsage", ctypes.c_size_t)]


def sys_times() -> tuple[float, float]:
    """(busy s, total s) summed over all logical CPUs since boot."""
    idle, kern, user = _FT(), _FT(), _FT()
    ctypes.windll.kernel32.GetSystemTimes(ctypes.byref(idle), ctypes.byref(kern), ctypes.byref(user))
    tot = _ft(kern) + _ft(user)  # kernel time includes idle
    return tot - _ft(idle), tot


def free_ram_gb() -> float:
    m = _MEMSTAT()
    m.dwLength = ctypes.sizeof(m)
    ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
    return m.ullAvailPhys / 2**30


def proc_mem() -> dict:
    c = _PMC()
    c.cb = ctypes.sizeof(c)
    k = ctypes.windll.kernel32
    k.GetCurrentProcess.restype = wintypes.HANDLE
    f = ctypes.windll.psapi.GetProcessMemoryInfo
    f.argtypes = [wintypes.HANDLE, ctypes.POINTER(_PMC), wintypes.DWORD]
    f(k.GetCurrentProcess(), ctypes.byref(c), c.cb)
    g = 2**30
    return {"working_set_gb": c.WorkingSetSize / g, "peak_working_set_gb": c.PeakWorkingSetSize / g,
            "private_gb": c.PrivateUsage / g, "peak_private_gb": c.PeakPagefileUsage / g}


def own_cpu_s() -> float:
    t = os.times()
    return t.user + t.system


class Monitor:
    """Samples every second: machine CPU %, this process's CPU %, others' CPU % (= machine - own),
    free RAM, own working set. CPU % are shares of the WHOLE machine (all logical CPUs = 100 %)."""

    def __init__(self, period: float = 1.0):
        self.period, self.samples, self._stop = period, [], threading.Event()
        self.ncpu = os.cpu_count() or 1

    def __enter__(self):
        self.t0, self.c0, (self.b0, self.T0) = time.perf_counter(), own_cpu_s(), sys_times()
        self.free0 = free_ram_gb()
        self.th = threading.Thread(target=self._run, daemon=True)
        self.th.start()
        return self

    def _run(self):
        pt, pc, (pb, pT) = time.perf_counter(), own_cpu_s(), sys_times()
        while not self._stop.wait(self.period):
            t, c, (b, T) = time.perf_counter(), own_cpu_s(), sys_times()
            if T > pT and t > pt:
                machine = 100 * (b - pb) / (T - pT)
                own = 100 * (c - pc) / ((t - pt) * self.ncpu)
                self.samples.append((machine, own, max(0.0, machine - own), free_ram_gb(), proc_mem()["working_set_gb"]))
            pt, pc, pb, pT = t, c, b, T

    def __exit__(self, *exc):
        self._stop.set()
        self.th.join()
        self.wall = time.perf_counter() - self.t0
        self.cpu = own_cpu_s() - self.c0

    def summary(self) -> dict:
        s = np.array(self.samples) if self.samples else np.zeros((1, 5))
        mem = proc_mem()
        return {"wall_s": round(self.wall, 2), "process_cpu_s": round(self.cpu, 1),
                "process_cpu_pct_of_machine": round(100 * self.cpu / (self.wall * self.ncpu), 1),
                "process_cores_busy": round(self.cpu / self.wall, 2),
                "machine_cpu_pct_mean": round(float(s[:, 0].mean()), 1),
                "others_cpu_pct_mean": round(float(s[:, 2].mean()), 1),
                "others_cpu_pct_p10_p90": [round(float(np.percentile(s[:, 2], q)), 1) for q in (10, 90)],
                "free_ram_gb_min": round(float(min(s[:, 3].min(), self.free0)), 2),
                "free_ram_gb_mean": round(float(s[:, 3].mean()), 2),
                "free_ram_gb_at_start": round(self.free0, 2),
                "peak_working_set_gb": round(mem["peak_working_set_gb"], 2),
                "peak_private_gb": round(mem["peak_private_gb"], 2),
                "samples": len(self.samples)}


def load_label(m: dict) -> str:
    """'quiet' only when other processes used under 10 % of the machine and >= 4 GB RAM stayed free."""
    return "quiet" if m["others_cpu_pct_mean"] < 10 and m["free_ram_gb_min"] >= 4 else "UNDER LOAD"


def write_json(p: Path, obj) -> None:
    safe_out(p).write_text(json.dumps(obj, indent=1, ensure_ascii=False), encoding="utf-8")


# ------------------------------------------------------------------------------ inputs

def inputs(set_name: str) -> list[dict]:
    """[{file_id, kind, audio(np.float32 16k), duration}] - file ids are B1's, so the vendors' answers line up."""
    import vendor_batch
    import vendor_run
    spec = SETS[set_name]
    out = []
    names = [n for n in ("synth", "clips") if spec[n] is None or spec[n]]
    if names:
        for st in vendor_batch.build_inputs(names):
            want = spec[st["name"]]
            for src in st["srcs"]:
                if want is not None and src["file_id"] not in want:
                    continue
                _, local, _ = vendor_run.write_piece(src, 0, (0.0, src["duration"]), OUT / "_inputs", "flac")
                import soundfile as sf
                x, sr = sf.read(str(local), dtype="float32", always_2d=True)
                out.append({"file_id": src["file_id"], "kind": st["name"], "audio": x.mean(1)})
    paths = vendor_batch.lesson_paths() if spec["lessons"] else {}
    for L, secs in spec["lessons"].items():
        x, _ = read_wav(paths[L], 0, secs)
        out.append({"file_id": L, "kind": "lesson", "audio": x})
    for r in out:
        r["duration"] = len(r["audio"]) / SR
    return out


def lesson_audio(L: str, minutes: float) -> np.ndarray:
    import vendor_batch
    x, _ = read_wav(vendor_batch.lesson_paths()[L], 0, minutes * 60 if minutes else None)
    return x


# --------------------------------------------------------------------------------- asr

def load_whisper(size: str, threads: int):
    from faster_whisper import WhisperModel
    return WhisperModel(size, device="cpu", compute_type="int8", cpu_threads=threads,
                        download_root=str(MODELS / "faster-whisper"))


def transcribe(m, x: np.ndarray, lang: str, vad: bool, beam: int, vad_thr: float = 0.5, cond_prev: bool = True):
    """vad_thr: silero speech threshold (faster-whisper default 0.5; B2 measured it missing 27-90 % of the
    children's speech in the room mixes). cond_prev False stops one window's text steering the next, the
    usual guard against Whisper's repetition loops on noisy audio."""
    kw = {"beam_size": beam, "word_timestamps": True, "vad_filter": vad, "condition_on_previous_text": cond_prev}
    if vad:
        kw["vad_parameters"] = {"threshold": vad_thr}
    if lang == "multi":
        kw.update(language=None, multilingual=True)
    else:
        kw["language"] = None if lang == "auto" else lang
    segs, info = m.transcribe(x, **kw)
    words, langs = [], {}
    for s in segs:
        for w in s.words or []:
            words.append({"w": w.word.strip(), "start": round(w.start, 3), "end": round(max(w.end, w.start), 3),
                          "conf": round(float(w.probability), 3), "speaker": None})
    return words, info.language


def tag_of(a) -> str:
    v = f"vad{a.vad}" + (f"{a.vad_thr:g}" if a.vad == "on" and a.vad_thr != 0.5 else "")
    return f"fw-{a.size}-{a.lang}-{v}{'' if a.cond_prev == 'on' else '-nocp'}-b{a.beam}-t{a.threads}-{a.set}"


def cmd_asr(a) -> int:
    tag = tag_of(a)
    d = safe_out(OUT / "asr" / tag)
    ins = inputs(a.set)
    audio_s = sum(r["duration"] for r in ins)
    with Monitor() as mon_load:
        m = load_whisper(a.size, a.threads)
    files, per = [], []
    with Monitor() as mon:
        for r in ins:
            t0 = time.perf_counter()
            words, lang = transcribe(m, r["audio"], a.lang, a.vad == "on", a.beam, a.vad_thr, a.cond_prev == "on")
            el = time.perf_counter() - t0
            files.append({"file_id": r["file_id"], "duration_s": round(r["duration"], 3), "words": words, "turns": [],
                          "language": lang})
            per.append({"file_id": r["file_id"], "kind": r["kind"], "audio_s": round(r["duration"], 1),
                        "wall_s": round(el, 1), "rtf": round(el / r["duration"], 3), "words": len(words)})
            print(f"{r['file_id']}: {r['duration']:.0f} s, {len(words)} words, RTF {el / r['duration']:.2f}", flush=True)
    s = mon.summary()
    metrics = {"tag": tag, "size": a.size, "threads": a.threads, "lang": a.lang, "vad": a.vad, "vad_thr": a.vad_thr,
               "cond_prev": a.cond_prev, "beam": a.beam,
               "set": a.set, "audio_s": round(audio_s, 1), "load_model_s": round(mon_load.wall, 1),
               "rtf": round(s["wall_s"] / audio_s, 3), "load": load_label(s), **s, "per_file": per,
               "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    write_json(d / f"metrics_{tag}.json", metrics)
    result = {"schema": "hec-lesson-eval/1",
              "system": {"name": tag, "kind": "local", "model": f"faster-whisper {a.size} int8 CPU",
                         "settings": {"language": a.lang, "beam": a.beam, "vad_filter": a.vad == "on",
                                      "vad_threshold": a.vad_thr, "condition_on_previous_text": a.cond_prev == "on",
                                      "word_timing": "vendor", "price_usd_per_min": 0.0}},
              "run": {"started_at": metrics["at"], "wall_s": s["wall_s"], "audio_s": round(audio_s, 1)},
              "files": files}
    write_json(d / f"result_{tag}.json", result)
    print(json.dumps({k: v for k, v in metrics.items() if k != "per_file"}, indent=1))
    return 0


# -------------------------------------------------------------------------------- diar

def cmd_diar(a) -> int:
    import b2_lessons as bl
    import idlib
    import score
    from b2_embed import make_embedder
    mixes = []
    for t in a.mix_sets.split(","):
        mixes += sorted((WORK / "mix" / t).glob("*.wav"))
    res = {"engine": a.engine, "model": a.model, "threshold": a.threshold, "threads": a.threads}
    with Monitor() as ml:
        if a.engine == "own":
            emb = make_embedder(a.model, a.threads)
        else:
            sd = bl.diarizer(a.threshold, a.model, a.threads)
    res["load_model_s"] = round(ml.wall, 1)

    def run(x):
        if a.engine == "own":
            ch = bl.vad_chunks(x)
            E = idlib.l2n(emb([x[int(s * SR): int(e * SR)] for s, e in ch]))
            return bl.own_diarize(x, ch, E, a.threshold)
        return bl.diarize(sd, x)

    if not a.timing_only:
        ders, cnt, secs = [], [], 0.0
        tot = {"ref_speech_s": 0.0, "miss_s": 0.0, "fa_s": 0.0, "conf_s": 0.0}
        with Monitor() as mon:
            for w in mixes:
                x, _ = read_wav(w)
                secs += len(x) / SR
                hyp = run(x)
                ref = score.read_rttm(w.with_suffix(".rttm"))[w.stem]
                dd = score.der_file(ref, hyp, collar=0.25)
                ders.append(dd["der"])
                for k in tot:
                    tot[k] += dd[k]
                cnt.append((dd["sys_speakers"], dd["ref_speakers"]))
        s = mon.summary()
        res["mixes"] = {"n": len(mixes), "audio_s": round(secs, 1), "der_mean": round(float(np.mean(ders)), 3),
                        "der_pooled": round((tot["miss_s"] + tot["fa_s"] + tot["conf_s"]) / tot["ref_speech_s"], 3),
                        "miss": round(tot["miss_s"] / tot["ref_speech_s"], 3), "fa": round(tot["fa_s"] / tot["ref_speech_s"], 3),
                        "conf": round(tot["conf_s"] / tot["ref_speech_s"], 3),
                        "speakers_found_vs_true": cnt, "rtf": round(s["wall_s"] / secs, 3), "load": load_label(s), **s}
        print(json.dumps(res["mixes"]), flush=True)
    x = lesson_audio("L2", a.timing_minutes)
    with Monitor() as mon:
        segs = run(x)
    s = mon.summary()
    spk = {}
    for st, en, c in segs:
        spk[c] = spk.get(c, 0) + en - st
    res["timing"] = {"input": f"L2 first {a.timing_minutes:g} min", "audio_s": round(len(x) / SR, 1),
                     "rtf": round(s["wall_s"] / (len(x) / SR), 3), "clusters": len(spk),
                     "clusters_ge10s": sum(v >= 10 for v in spk.values()), "load": load_label(s), **s}
    print(json.dumps(res["timing"]), flush=True)
    tag = f"diar-{a.engine}-{a.model}-thr{a.threshold:g}-t{a.threads}" + ("-timing" if a.timing_only else "")
    res["at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    write_json(OUT / "diar" / f"{tag}.json", res)
    return 0


# ------------------------------------------------------------------------------- ident

def cmd_ident(a) -> int:
    """ECAPA (or another B2 model) on turns >= 1 s of the timing piece, chunked like b2_lessons run
    (up to 6 s per turn). Measures embedding speed only; embeddings are discarded."""
    import b2_lessons as bl
    from b2_embed import make_embedder
    x = lesson_audio("L2", a.timing_minutes)
    regs = [(s, e) for s, e in bl.vad_chunks(x)]
    # rebuild turn-like spans: merge chunks separated by < 0.3 s, cap at 6 s
    turns = []
    for s, e in regs:
        if turns and s - turns[-1][1] < 0.3 and e - turns[-1][0] <= 6.0:
            turns[-1] = (turns[-1][0], e)
        else:
            turns.append((s, e))
    turns = [t for t in turns if t[1] - t[0] >= 1.0][: a.max_turns]
    secs = sum(e - s for s, e in turns)
    with Monitor() as ml:
        f = make_embedder(a.model, a.threads)
    with Monitor() as mon:
        E = f([x[int(s * SR): int(e * SR)] for s, e in turns])
    s = mon.summary()
    res = {"model": a.model, "threads": a.threads, "input": f"L2 first {a.timing_minutes:g} min, {len(turns)} turns >= 1 s",
           "turn_audio_s": round(secs, 1), "load_model_s": round(ml.wall, 1), "dim": int(E.shape[1]),
           "rtf_per_turn_second": round(s["wall_s"] / secs, 3), "load": load_label(s), **s,
           "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    del E
    write_json(OUT / "ident" / f"ident-{a.model}-t{a.threads}.json", res)
    print(json.dumps(res, indent=1))
    return 0


# --------------------------------------------------------------------------------- e2e

def cmd_e2e(a) -> int:
    """One lesson piece through all three stages, as the monitor would run it overnight."""
    import b2_lessons as bl
    import idlib
    from b2_embed import make_embedder
    from b2_eval import Data, parse_cfg, score_units
    x = lesson_audio(a.lesson, a.minutes)
    secs = len(x) / SR
    st = {}
    with Monitor() as mon:
        m = load_whisper(a.size, a.threads)
        words, _ = transcribe(m, x, a.lang, a.vad == "on", a.beam, a.vad_thr, a.cond_prev == "on")
    st["asr"] = {**mon.summary(), "words": len(words)}
    del m
    print("asr", st["asr"]["wall_s"], flush=True)
    with Monitor() as mon:
        demb = make_embedder(a.diar_model, a.threads)
        ch = bl.vad_chunks(x)
        CE = idlib.l2n(demb([x[int(s * SR): int(e * SR)] for s, e in ch]))
        segs = bl.own_diarize(x, ch, CE, a.diar_threshold)
    by = {}
    for s0, e0, c in segs:
        by.setdefault(c, []).append((s0, e0))
    st["diar"] = {**mon.summary(), "clusters": len(by)}
    print("diar", st["diar"]["wall_s"], flush=True)
    with Monitor() as mon:
        emb = make_embedder(a.id_model, a.threads)
        D = Data(a.id_model)
        cfg = parse_cfg(a.id_config)
        named = matched = 0
        for c, turns in by.items():
            if sum(e0 - s0 for s0, e0 in turns) < 10.0:
                continue
            use = sorted([t for t in turns if t[1] - t[0] >= 1.0], key=lambda t: t[0] - t[1])[:60]
            if not use:
                continue
            TE = idlib.l2n(emb([x[int(s0 * SR): int(e0 * SR)] for s0, e0 in use]))
            pred, sc, _, _ = score_units(D, idlib.centroid(TE)[None, :], D.codes, cfg, return_scores=True)
            matched += 1
            named += int(sc[0] >= a.threshold)
            del TE
    st["ident"] = {**mon.summary(), "clusters_matched": matched, "clusters_named_at_T": named}
    print("ident", st["ident"]["wall_s"], flush=True)
    total = sum(v["wall_s"] for v in st.values())
    res = {"lesson": a.lesson, "minutes": round(secs / 60, 1), "size": a.size, "threads": a.threads, "lang": a.lang,
           "vad": a.vad, "vad_thr": a.vad_thr, "cond_prev": a.cond_prev, "beam": a.beam, "diar": f"own {a.diar_model} thr {a.diar_threshold}",
           "ident": f"{a.id_model} {a.id_config} T {a.threshold}", "stages": st, "total_wall_s": round(total, 1),
           "rtf_total": round(total / secs, 3),
           "projected_90min_h": round(total / secs * 5400 / 3600, 2),
           "load": "quiet" if all(load_label(v) == "quiet" for v in st.values()) else "UNDER LOAD",
           "at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    write_json(OUT / "e2e" / f"e2e-{a.lesson}-{a.minutes:g}min-{a.size}-t{a.threads}.json", res)
    print(json.dumps({k: v for k, v in res.items() if k != "stages"}, indent=1))
    return 0


# ------------------------------------------------------------------------------- score

VENDORS = ["azure-fast-multilingual", "azure-fast-en-vi", "gemini-transcribe-speakers", "openai-gpt-4o-transcribe",
           "openai-gpt-transcribe", "openai-gpt-4o-transcribe-diarize"]


def cmd_score(a) -> int:
    import b1_score as b1
    vend = {k: v for k, v in b1.load_systems(WORK / "vendor").items() if k in VENDORS}
    loc = b1.load_systems(OUT / "asr")
    rows = []
    groups = ("synth", "clips", "lesson")

    def pooled(x, y, fids):
        tm = ta = tb = n = 0
        for fid in fids:
            if fid not in x["files"] or fid not in y["files"]:
                continue
            p, q = b1.common_tokens(x["files"][fid], y["files"][fid])
            mm, la, lb = b1.agreement(p, q)
            tm, ta, tb, n = tm + mm, ta + la, tb + lb, n + 1
        return (b1.ratio(tm, ta, tb), n, ta, tb) if n else (None, 0, 0, 0)

    for name, s in sorted(loc.items()):
        for g in groups:
            fids = sorted(f for f in s["files"] if b1.file_kind(f) == g and f != "L4")
            if not fids:
                continue
            ag, words_l, words_v = {}, 0, 0
            for vn, v in vend.items():
                r, n, la, lb = pooled(s, v, fids)
                if n:
                    ag[vn] = (r, n)
                    words_l, words_v = words_l + la, words_v + lb
            # the vendors among themselves on the same files: what "agreeing as well as a vendor does" looks like
            vv = []
            vn_list = sorted(ag)
            for i, x in enumerate(vn_list):
                for y in vn_list[i + 1:]:
                    r, n, _, _ = pooled(vend[x], vend[y], fids)
                    if n and r is not None:
                        vv.append(r)
            vi = sum(b1.is_vi(t) for f in fids for t in b1.tokens_of(s["files"][f]))
            nt = sum(len(b1.tokens_of(s["files"][f])) for f in fids)
            rows.append({"system": name, "group": g, "files": len(fids),
                         "agree_mean_vendors": round(float(np.mean([r for r, _ in ag.values() if r is not None])), 3) if ag else None,
                         "agree_azure_ml": ag.get("azure-fast-multilingual", (None,))[0],
                         "agree_openai_gpt_transcribe": ag.get("openai-gpt-transcribe", (None,))[0],
                         "agree_gemini": ag.get("gemini-transcribe-speakers", (None,))[0],
                         "vendor_vs_vendor_mean": round(float(np.mean(vv)), 3) if vv else None,
                         "vendor_vs_vendor_min_max": [min(vv), max(vv)] if vv else None,
                         "words_local_over_vendor_mean": round(words_l / words_v, 2) if words_v else None,
                         "vietnamese_diacritic_pct": round(100 * vi / nt, 2) if nt else None})
    write_json(OUT / "asr_scores.json", rows)
    hdr = ["system", "group", "files", "agree_mean_vendors", "agree_azure_ml", "agree_openai_gpt_transcribe", "agree_gemini",
           "vendor_vs_vendor_mean", "vendor_vs_vendor_min_max", "words_local_over_vendor_mean", "vietnamese_diacritic_pct"]
    print("| " + " | ".join(hdr) + " |")
    print("|" + "---|" * len(hdr))
    for r in rows:
        print("| " + " | ".join(str(r[h]) for h in hdr) + " |")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("asr")
    p.add_argument("--size", default="small")
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--lang", choices=["auto", "en", "multi"], default="en")
    p.add_argument("--vad", choices=["on", "off"], default="off")
    p.add_argument("--beam", type=int, default=5)
    p.add_argument("--vad-thr", type=float, default=0.5)
    p.add_argument("--cond-prev", choices=["on", "off"], default="on")
    p.add_argument("--set", choices=sorted(SETS), default="quality")
    p.set_defaults(fn=cmd_asr)
    p = sub.add_parser("diar")
    p.add_argument("--engine", choices=["own", "sherpa"], default="own")
    p.add_argument("--model", default="3ds_campp")
    p.add_argument("--threshold", type=float, default=0.1)
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--mix-sets", default="seed7_ov05_s500,seed7_ov15_s500")
    p.add_argument("--timing-minutes", type=float, default=10.0)
    p.add_argument("--timing-only", action="store_true")
    p.set_defaults(fn=cmd_diar)
    p = sub.add_parser("ident")
    p.add_argument("--model", default="ecapa")
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--timing-minutes", type=float, default=10.0)
    p.add_argument("--max-turns", type=int, default=240)
    p.set_defaults(fn=cmd_ident)
    p = sub.add_parser("e2e")
    p.add_argument("--lesson", default="L2")
    p.add_argument("--minutes", type=float, default=20.0, help="0 = whole lesson")
    p.add_argument("--size", default="small")
    p.add_argument("--threads", type=int, default=4)
    p.add_argument("--lang", choices=["auto", "en", "multi"], default="en")
    p.add_argument("--vad", choices=["on", "off"], default="off")
    p.add_argument("--beam", type=int, default=5)
    p.add_argument("--vad-thr", type=float, default=0.5)
    p.add_argument("--cond-prev", choices=["on", "off"], default="on")
    p.add_argument("--diar-model", default="3ds_campp")
    p.add_argument("--diar-threshold", type=float, default=0.1)
    p.add_argument("--id-model", default="ecapa")
    p.add_argument("--id-config", default="vad-all-k3-asnorm")
    p.add_argument("--threshold", type=float, default=6.0)
    p.set_defaults(fn=cmd_e2e)
    p = sub.add_parser("score")
    p.set_defaults(fn=cmd_score)
    a = ap.parse_args(argv)
    return a.fn(a)


if __name__ == "__main__":
    sys.exit(main())
