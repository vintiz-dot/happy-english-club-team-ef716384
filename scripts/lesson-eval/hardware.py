"""Print the hardware/software record for B2b (CPU-only performance runs).

CPU model, cores/threads, clock, RAM, OS, Python, library versions, and
whether a GPU / CUDA is visible to torch, onnxruntime and CTranslate2.
Prints JSON; with --out also writes it (outside any git repo).

    python hardware.py
    python hardware.py --out C:\\Users\\Dell\\hec-audio-eval\\work\\hardware.json
"""
from __future__ import annotations

import argparse
import importlib
import json
import os
import platform
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import safe_out  # noqa: E402

LIBS = ["numpy", "scipy", "soundfile", "faster_whisper", "ctranslate2", "onnxruntime", "av",
        "torch", "torchaudio", "speechbrain", "sherpa_onnx", "huggingface_hub", "pyannote.audio", "pytest"]


def ps(cmd: str) -> str:
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", cmd], capture_output=True, text=True, timeout=60)
        return r.stdout.strip()
    except Exception as e:  # noqa: BLE001
        return f"unavailable: {e}"


def version(mod: str):
    try:
        m = importlib.import_module(mod)
        return getattr(m, "__version__", "installed")
    except Exception as e:  # noqa: BLE001
        return f"not available ({type(e).__name__})"


def gpu_info() -> dict:
    g = {}
    try:
        import torch
        g["torch_cuda"] = torch.cuda.is_available()
        g["torch_threads"] = torch.get_num_threads()
    except Exception:  # noqa: BLE001
        g["torch_cuda"] = "torch not available"
    try:
        import onnxruntime as ort
        g["onnxruntime_providers"] = ort.get_available_providers()
    except Exception:  # noqa: BLE001
        g["onnxruntime_providers"] = "not available"
    try:
        import ctranslate2
        g["ctranslate2_cuda_devices"] = ctranslate2.get_cuda_device_count()
        g["ctranslate2_cpu_compute_types"] = sorted(ctranslate2.get_supported_compute_types("cpu"))
    except Exception:  # noqa: BLE001
        g["ctranslate2_cuda_devices"] = "not available"
    return g


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path)
    a = ap.parse_args()
    rec = {
        "cpu": ps("(Get-CimInstance Win32_Processor | Select-Object -First 1 Name,NumberOfCores,"
                  "NumberOfLogicalProcessors,MaxClockSpeed | ConvertTo-Json -Compress)") if os.name == "nt"
        else platform.processor(),
        "ram_gb": ps("[math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory/1GB,1)")
        if os.name == "nt" else None,
        "gpus": ps("(Get-CimInstance Win32_VideoController).Name -join '; '") if os.name == "nt" else None,
        "os": platform.platform(),
        "python": sys.version.split()[0],
        "logical_cpus": os.cpu_count(),
        "libraries": {m: version(m) for m in LIBS},
        "accelerators": gpu_info(),
    }
    try:
        ff = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True).stdout.splitlines()[0]
    except Exception:  # noqa: BLE001
        ff = "not found"
    rec["ffmpeg"] = ff
    s = json.dumps(rec, indent=1)
    print(s)
    if a.out:
        safe_out(a.out).write_text(s, encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
