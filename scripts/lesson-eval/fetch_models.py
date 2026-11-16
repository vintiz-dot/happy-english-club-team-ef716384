"""Download the UNGATED public models used by B2 into <root>\\models\\ (outside the repo).

Speaker-embedding ONNX models and the pyannote-3.0 segmentation ONNX export are
the k2-fsa/sherpa-onnx release mirrors (no account, no token). Nothing gated,
no Hugging Face token is read or needed. Prints name, size and SHA-256 of each.

    python fetch_models.py --list          # sizes only, downloads nothing
    python fetch_models.py                 # download missing files
"""
from __future__ import annotations

import argparse
import hashlib
import sys
import tarfile
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, safe_out  # noqa: E402

BASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/"
EMB = BASE + "speaker-recongition-models/"   # sic: the release tag is spelled this way upstream
MODELS = {
    # name: (url, licence as stated by the upstream project)
    "wespeaker_en_voxceleb_CAM++.onnx": (EMB + "wespeaker_en_voxceleb_CAM++.onnx",
                                         "WeSpeaker pretrained (VoxCeleb): CC-BY-4.0 per WeSpeaker docs"),
    "wespeaker_en_voxceleb_resnet34_LM.onnx": (EMB + "wespeaker_en_voxceleb_resnet34_LM.onnx",
                                               "WeSpeaker pretrained (VoxCeleb): CC-BY-4.0 per WeSpeaker docs"),
    "3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx": (
        EMB + "3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx", "3D-Speaker (ModelScope): Apache-2.0"),
    "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx": (
        EMB + "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx", "3D-Speaker (ModelScope): Apache-2.0"),
    "nemo_en_titanet_large.onnx": (EMB + "nemo_en_titanet_large.onnx",
                                   "NVIDIA NeMo TitaNet-L: CC-BY-4.0 per model card"),
    "sherpa-onnx-pyannote-segmentation-3-0.tar.bz2": (
        BASE + "speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2",
        "pyannote/segmentation-3.0: MIT (ONNX export by k2-fsa; the upstream HF repo is gated, this mirror is not)"),
}


def sha256(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dest", type=Path, default=ROOT / "models" / "sherpa")
    ap.add_argument("--list", action="store_true")
    ap.add_argument("--only", default="", help="comma list of names")
    a = ap.parse_args()
    dest = safe_out(a.dest)
    for name, (url, lic) in MODELS.items():
        if a.only and name not in a.only.split(","):
            continue
        p = dest / name
        if a.list:
            req = urllib.request.Request(url, method="HEAD")
            with urllib.request.urlopen(req, timeout=60) as r:
                print(f"{name}\t{int(r.headers.get('Content-Length', 0)) / 1e6:.1f} MB\t{lic}\t{url}")
            continue
        if not p.exists():
            print(f"downloading {name} ...", flush=True)
            tmp = p.with_suffix(p.suffix + ".part")
            urllib.request.urlretrieve(url, tmp)
            tmp.replace(p)
        if name.endswith(".tar.bz2"):
            with tarfile.open(p) as t:
                for m in t.getmembers():
                    if m.name.startswith("/") or ".." in Path(m.name).parts:
                        sys.exit(f"refusing unsafe member {m.name}")
                t.extractall(dest, filter="data")
        print(f"{name}\t{p.stat().st_size / 1e6:.1f} MB\tsha256 {sha256(p)[:16]}\t{lic}\t{url}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
