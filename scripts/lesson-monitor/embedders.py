"""Speaker-embedding models side by side (owner, 24 Nov 2026): one interface, several models.

The overnight job names a speaker by comparing a voice embedding with each child's
voiceprint. To find out which model does that best on real lessons, every model that is
installed on this laptop can be run on the same audio and the results compared. Each
model turns 16 kHz mono audio into one vector; the vector is L2-normalised, so the dot
product of two vectors is their cosine.

  ecapa                   SpeechBrain ECAPA-TDNN, trained on VoxCeleb (the model voice.py uses).
  titanet                 NVIDIA NeMo TitaNet-Large (192 numbers).
  wespeaker_resnet34      WeSpeaker ResNet34, English VoxCeleb.
  wespeaker_campp         WeSpeaker CAM++, English VoxCeleb.
  3dspeaker_campp         3D-Speaker CAM++, English VoxCeleb.
  3dspeaker_eres2netv2    3D-Speaker ERes2NetV2, trained on Chinese speech (kept as an outsider).

Everything runs on this laptop from the model files already in the models folder:
nothing is downloaded and no audio is sent anywhere. A model that cannot load raises an
error from load(); the caller decides to skip it.
"""
from __future__ import annotations

import os

import numpy as np

import pilot_common as pc

MODELS = {
    "ecapa": {"path": "speechbrain/spkrec-ecapa-voxceleb", "kind": "speechbrain",
              "desc": "SpeechBrain ECAPA-TDNN, VoxCeleb"},
    # TitaNet's ONNX graph has a fixed 12288-frame mask (about 2 minutes at 10 ms a frame): a longer clip
    # fails inside onnxruntime ("broadcast ... 12288 by 46067", Jupiter 26 Nov 2026, a 7.7-minute line).
    # So clips longer than max_s are embedded in pieces and averaged.
    "titanet": {"path": "sherpa/nemo_en_titanet_large.onnx", "kind": "sherpa",
                "desc": "NVIDIA NeMo TitaNet-Large", "max_s": 60},
    "wespeaker_resnet34": {"path": "sherpa/wespeaker_en_voxceleb_resnet34_LM.onnx", "kind": "sherpa",
                           "desc": "WeSpeaker ResNet34, English VoxCeleb"},
    "wespeaker_campp": {"path": "sherpa/wespeaker_en_voxceleb_CAM++.onnx", "kind": "sherpa",
                        "desc": "WeSpeaker CAM++, English VoxCeleb"},
    "3dspeaker_campp": {"path": "sherpa/3dspeaker_speech_campplus_sv_en_voxceleb_16k.onnx", "kind": "sherpa",
                        "desc": "3D-Speaker CAM++, English VoxCeleb"},
    "3dspeaker_eres2netv2": {"path": "sherpa/3dspeaker_speech_eres2netv2_sv_zh-cn_16k-common.onnx",
                             "kind": "sherpa", "desc": "3D-Speaker ERes2NetV2, Chinese-trained"},
}
SR = 16000
THREADS = 2


def _file(name: str):
    return pc.models_dir() / MODELS[name]["path"]


def available() -> list[str]:
    """Names whose model files exist here, in MODELS order (ecapa first)."""
    return [n for n in MODELS if _file(n).exists()]


def _unit(v) -> np.ndarray:
    v = np.asarray(v, dtype=np.float64).reshape(-1)
    n = np.linalg.norm(v)
    return v / n if n else v


def pieces(n: int, max_n: int | None) -> list[tuple[int, int]]:
    """Cut n samples into spans of at most max_n, as even as possible (no tiny last piece). Pure."""
    if not max_n or n <= max_n:
        return [(0, n)]
    k = -(-n // max_n)
    step = -(-n // k)
    return [(a, min(n, a + step)) for a in range(0, n, step)]


class Embedder:
    """name, dims, and embed(16 kHz mono float32) -> unit-length float64 vector.

    max_s: a model that cannot take longer clips gets them in pieces of at most max_s seconds; each piece's
    unit vector is weighted by its length, and the mean is normalised again. None = the whole clip at once."""

    def __init__(self, name: str, fn, dims: int, max_s: float | None = None):
        self.name, self._fn, self.dims, self.max_s = name, fn, dims, max_s

    def embed(self, x: np.ndarray) -> np.ndarray:
        x = np.ascontiguousarray(x, dtype=np.float32)
        spans = pieces(len(x), int(self.max_s * SR) if self.max_s else None)
        if len(spans) == 1:
            return _unit(self._fn(x))
        total = sum((_unit(self._fn(np.ascontiguousarray(x[a:b]))) * (b - a) for a, b in spans))
        return _unit(total)


def _speechbrain(path):
    os.environ["HF_HUB_OFFLINE"] = "1"
    import torch
    from speechbrain.inference.speaker import EncoderClassifier
    d = str(path)
    model = EncoderClassifier.from_hparams(source=d, savedir=d, run_opts={"device": "cpu"})

    def fn(x):
        with torch.no_grad():
            return model.encode_batch(torch.from_numpy(x)[None, :]).squeeze().cpu().numpy()
    return fn


def _sherpa(path):
    import sherpa_onnx
    cfg = sherpa_onnx.SpeakerEmbeddingExtractorConfig(model=str(path), num_threads=THREADS)
    if not cfg.validate():
        raise RuntimeError(f"sherpa-onnx rejected the model config for {path.name}")
    ex = sherpa_onnx.SpeakerEmbeddingExtractor(cfg)

    def fn(x):
        s = ex.create_stream()
        s.accept_waveform(sample_rate=SR, waveform=x)
        s.input_finished()
        return np.array(ex.compute(s))
    return fn


def load(name: str) -> Embedder:
    """Load one model from disk. Raises (KeyError, FileNotFoundError, or the loader's own error)."""
    if name not in MODELS:
        raise KeyError(f"unknown embedder {name!r}; known: {', '.join(MODELS)}")
    path = _file(name)
    if not path.exists():
        raise FileNotFoundError(f"embedder {name!r}: model file missing: {path}")
    fn = (_speechbrain if MODELS[name]["kind"] == "speechbrain" else _sherpa)(path)
    dims = len(np.asarray(fn(np.random.default_rng(0).standard_normal(SR).astype(np.float32) * 0.1)).reshape(-1))
    return Embedder(name, fn, dims, MODELS[name].get("max_s"))
