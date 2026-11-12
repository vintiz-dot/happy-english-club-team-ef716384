"""Pure numeric helpers for speaker identification (B2). No audio I/O, no files.

Everything here works on embedding matrices (rows = L2-normalisable vectors), so
it is unit-tested on synthetic vectors (tests/test_idlib.py).

  l2n(X)                       row-wise L2 normalisation
  centroid(X)                  normalised mean of normalised rows
  sub_centroids(X, k, seed)    spherical k-means: k sub-centroids of one speaker
  gallery_scores(T, G)         cosine of each test row with each gallery entry
                               (an entry = 1..k centroids; score = max)
  asnorm(raw, T, G, cohort, owner, codes, topk)
                               adaptive symmetric score normalisation; the cohort
                               of model m is every cohort row NOT owned by m
  top1(S, codes)               best code and its score per row (+ margin)
  ahc(X, threshold)            average-linkage cosine clustering (diarization)
"""
from __future__ import annotations

import numpy as np


def l2n(X: np.ndarray) -> np.ndarray:
    X = np.asarray(X, dtype=np.float64)
    if X.ndim == 1:
        return X / (np.linalg.norm(X) + 1e-12)
    return X / (np.linalg.norm(X, axis=1, keepdims=True) + 1e-12)


def centroid(X: np.ndarray) -> np.ndarray:
    return l2n(l2n(X).mean(0))


def sub_centroids(X: np.ndarray, k: int, seed: int = 0, iters: int = 20) -> np.ndarray:
    """Spherical k-means. Returns (k', d) with k' = min(k, rows); deterministic for a seed."""
    X = l2n(X)
    k = max(1, min(k, len(X)))
    if k == 1:
        return centroid(X)[None, :]
    rng = np.random.default_rng(seed)
    C = X[rng.choice(len(X), size=k, replace=False)]
    for _ in range(iters):
        lab = np.argmax(X @ C.T, axis=1)
        newC = np.stack([centroid(X[lab == j]) if np.any(lab == j) else C[j] for j in range(k)])
        if np.allclose(newC, C):
            break
        C = newC
    return C


def gallery_scores(T: np.ndarray, G: list[np.ndarray]) -> np.ndarray:
    """(n, len(G)) cosine; each gallery entry is (k_i, d) or (d,), score = max over its rows."""
    T = l2n(np.atleast_2d(T))
    out = np.empty((len(T), len(G)))
    for j, g in enumerate(G):
        out[:, j] = (T @ l2n(np.atleast_2d(g)).T).max(1)
    return out


def asnorm(raw: np.ndarray, T: np.ndarray, G: list[np.ndarray], cohort: np.ndarray,
           owner: list[str], codes: list[str], topk: int = 50) -> np.ndarray:
    """Adaptive s-norm. raw (n, c) cosine scores of test rows T against gallery G
    (codes[j] owns G[j]); cohort (W, d) impostor embeddings, owner[w] = whose they are.
    For the pair (test e, model m) both sides are normalised with the top-k cohort
    rows not owned by m: s' = ((s - mu_e)/sd_e + (s - mu_m)/sd_m) / 2."""
    T = l2n(np.atleast_2d(T))
    Cw = l2n(cohort)
    owner = np.asarray(owner)
    te = T @ Cw.T                                   # (n, W)
    out = np.empty_like(raw, dtype=np.float64)
    for j, (code, g) in enumerate(zip(codes, G)):
        mask = owner != code
        if mask.sum() < 2:
            raise ValueError("cohort too small for model " + code)
        k = min(topk, int(mask.sum()))
        gm = l2n(np.atleast_2d(g))
        mc = (gm @ Cw[mask].T).max(0)               # model vs cohort (max over sub-centroids)
        mtop = np.sort(mc)[-k:]
        mu_m, sd_m = mtop.mean(), mtop.std() + 1e-6
        tc = np.sort(te[:, mask], axis=1)[:, -k:]
        mu_e, sd_e = tc.mean(1), tc.std(1) + 1e-6
        s = raw[:, j]
        out[:, j] = 0.5 * ((s - mu_e) / sd_e + (s - mu_m) / sd_m)
    return out


def top1(S: np.ndarray, codes: list[str]) -> tuple[list[str], np.ndarray, np.ndarray]:
    """Best code, its score and the margin to the second best, per row."""
    S = np.atleast_2d(S)
    order = np.argsort(-S, axis=1)
    best = S[np.arange(len(S)), order[:, 0]]
    second = S[np.arange(len(S)), order[:, 1]] if S.shape[1] > 1 else np.full(len(S), -np.inf)
    return [codes[i] for i in order[:, 0]], best, best - second


def ahc(X: np.ndarray, threshold: float, min_clusters: int = 1) -> np.ndarray:
    """Average-linkage agglomerative clustering on cosine distance; merges stop when the
    average cosine SIMILARITY between the closest two clusters falls below `threshold`.
    Returns labels 0..K-1 ordered by first appearance."""
    from scipy.cluster.hierarchy import fcluster, linkage
    X = l2n(np.atleast_2d(X))
    if len(X) == 1:
        return np.zeros(1, int)
    Z = linkage(X, method="average", metric="cosine")
    lab = fcluster(Z, t=1.0 - threshold, criterion="distance")
    if len(set(lab)) < min_clusters:
        lab = fcluster(Z, t=min_clusters, criterion="maxclust")
    remap, out = {}, np.empty(len(lab), int)
    for i, v in enumerate(lab):
        remap.setdefault(v, len(remap))
        out[i] = remap[v]
    return out
