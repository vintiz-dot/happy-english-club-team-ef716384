"""B2 step 2: embed every unit of work\\b2\\units.npz with one speaker-embedding model.

Writes work\\voiceprints\\b2\\<model>.embeddings.npz (children's voice embeddings =
biometric data: only under work\\voiceprints\\, removed by delete_voiceprints.py).
Each unit is embedded whole (no windowing), so the turn length is what the model sees.

Models (all ungated, CPU):
  ecapa        SpeechBrain spkrec-ecapa-voxceleb (192-d)
  wes_campp    WeSpeaker CAM++ VoxCeleb, ONNX via sherpa-onnx (512-d)
  wes_r34lm    WeSpeaker ResNet34-LM VoxCeleb, ONNX via sherpa-onnx (256-d)
  3ds_campp    3D-Speaker CAM++ VoxCeleb, ONNX via sherpa-onnx (512-d)
  3ds_eres2v2  3D-Speaker ERes2NetV2 zh-cn 16k-common, ONNX via sherpa-onnx (192-d)
  titanet_l    NVIDIA NeMo TitaNet-L, ONNX via sherpa-onnx (192-d)

    python b2_embed.py --model wes_campp --threads 2
"""
from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, SR, WORK, safe_out  # noqa: E402

MODELS = ROOT / "models"
SHERPA = {
    "wes_campp": "wespeaker_en_voxceleb_CAM++.onnx",
    "wes_r34lm": "wespeaker_en_voxceleb_resnet34_LM.onnx",
    "3ds_campp": "3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx",
    "3ds_eres2v2": "3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx",
    "titanet_l": "nemo_en_titanet_large.onnx",
}
ALL = ["ecapa", *SHERPA]
MIN_LEN = SR // 2  # pad anything shorter than 0.5 s


def make_embedder(name: str, threads: int):
    """Return f(list[np.ndarray float32]) -> (n, d) float32."""
    if name == "ecapa":
        os.environ.setdefault("HF_HOME", str(MODELS / "hf"))
        os.environ.setdefault("HF_HUB_DISABLE_TELEMETRY", "1")
        import torch
        torch.set_num_threads(threads)
        from speechbrain.inference.speaker import EncoderClassifier
        from speechbrain.utils.fetching import LocalStrategy
        enc = EncoderClassifier.from_hparams(source="speechbrain/spkrec-ecapa-voxceleb",
                                             savedir=str(MODELS / "speechbrain" / "spkrec-ecapa-voxceleb"),
                                             run_opts={"device": "cpu"}, local_strategy=LocalStrategy.COPY)

        def f(xs):
            out = []
            with torch.no_grad():
                for x in xs:
                    out.append(enc.encode_batch(torch.tensor(x[None, :])).squeeze().numpy())
            return np.stack(out).astype(np.float32)
        return f
    import sherpa_onnx
    cfg = sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(MODELS / "sherpa" / SHERPA[name]),
                                                      num_threads=threads)
    ex = sherpa_onnx.SpeakerEmbeddingExtractor(cfg)

    def f(xs):
        out = []
        for x in xs:
            s = ex.create_stream()
            s.accept_waveform(SR, x)
            s.input_finished()
            out.append(np.array(ex.compute(s), dtype=np.float32))
        return np.stack(out)
    return f


def unit_audio(U, i: int) -> np.ndarray:
    x = U["audio"][U["offs"][i]: U["offs"][i] + U["lens"][i]].astype(np.float32) / 32767.0
    return np.pad(x, (0, MIN_LEN - len(x))) if len(x) < MIN_LEN else x


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", required=True, choices=ALL)
    ap.add_argument("--units", type=Path, default=WORK / "b2" / "units.npz")
    ap.add_argument("--out-dir", type=Path, default=WORK / "voiceprints" / "b2")
    ap.add_argument("--threads", type=int, default=2)
    a = ap.parse_args()
    out = safe_out(a.out_dir / f"{a.model}.embeddings.npz")
    U = dict(np.load(a.units, allow_pickle=False))
    t0 = time.time()
    f = make_embedder(a.model, a.threads)
    t_load = time.time() - t0
    n = len(U["lens"])
    embs, t1 = [], time.time()
    for b in range(0, n, 64):
        embs.append(f([unit_audio(U, i) for i in range(b, min(n, b + 64))]))
        if b % 640 == 0:
            print(f"{a.model}: {b}/{n} ({time.time() - t1:.0f} s)", flush=True)
    E = np.concatenate(embs)
    secs = float(U["lens"].sum()) / SR
    el = time.time() - t1
    np.savez(out, emb=E, kind=U["kind"], code=U["code"], L=U["L"], cond=U["cond"], pos=U["pos"],
             idx=U["idx"], dur=U["dur"], model=a.model, load_s=t_load, embed_s=el, audio_s=secs)
    print(f"{a.model}: {n} units, dim {E.shape[1]}, {secs / 60:.1f} min audio, load {t_load:.1f} s, "
          f"embed {el:.0f} s (RTF {el / secs:.3f}, CONTAMINATED by other load) -> {out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
