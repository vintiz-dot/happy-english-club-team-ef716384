"""Unit tests for idlib.py on synthetic vectors (no audio, no children's data)."""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import idlib  # noqa: E402


def _speakers(n=4, per=30, d=16, noise=0.3, seed=0):
    rng = np.random.default_rng(seed)
    means = idlib.l2n(rng.standard_normal((n, d)))
    X, y = [], []
    for i in range(n):
        X.append(means[i] + noise * rng.standard_normal((per, d)) / np.sqrt(d))
        y += [f"S{i:02d}"] * per
    return idlib.l2n(np.concatenate(X)), np.array(y), means


def test_l2n_and_centroid():
    X = np.array([[3.0, 4.0], [0.0, 2.0]])
    assert np.allclose(np.linalg.norm(idlib.l2n(X), axis=1), 1)
    c = idlib.centroid(X)
    assert np.isclose(np.linalg.norm(c), 1) and c[1] > c[0]


def test_sub_centroids_deterministic_and_bounded():
    X, _, _ = _speakers(n=2, per=10)
    a = idlib.sub_centroids(X, 2, seed=3)
    b = idlib.sub_centroids(X, 2, seed=3)
    assert a.shape == (2, X.shape[1]) and np.allclose(a, b)
    assert idlib.sub_centroids(X[:1], 3).shape == (1, X.shape[1])
    # two well-separated groups: each sub-centroid lies near one group mean
    sims = a @ idlib.l2n(np.stack([X[:10].mean(0), X[10:].mean(0)])).T
    assert sorted(np.argmax(sims, axis=1).tolist()) == [0, 1]


def test_gallery_scores_takes_max_over_subcentroids():
    T = np.array([[1.0, 0.0]])
    G = [np.array([[0.0, 1.0], [1.0, 0.0]]), np.array([0.0, 1.0])]
    s = idlib.gallery_scores(T, G)
    assert s.shape == (1, 2) and np.isclose(s[0, 0], 1) and np.isclose(s[0, 1], 0)


def test_top1_margin():
    codes, best, margin = idlib.top1(np.array([[0.2, 0.9, 0.5], [0.4, 0.1, 0.3]]), ["A", "B", "C"])
    assert codes == ["B", "A"] and np.allclose(best, [0.9, 0.4]) and np.allclose(margin, [0.4, 0.1])


def test_asnorm_excludes_model_owner_and_keeps_ranking_sane():
    X, y, _ = _speakers(n=5, per=40, noise=0.6, seed=1)
    codes = sorted(set(y))
    enrol = {c: X[y == c][:20] for c in codes}
    test = np.concatenate([X[y == c][20:] for c in codes])
    ty = np.concatenate([y[y == c][20:] for c in codes])
    G = [idlib.centroid(enrol[c]) for c in codes]
    cohort = np.concatenate([enrol[c] for c in codes])
    owner = sum(([c] * 20 for c in codes), [])
    raw = idlib.gallery_scores(test, G)
    norm = idlib.asnorm(raw, test, G, cohort, owner, codes, topk=10)
    acc = lambda S: np.mean(np.array(codes)[np.argmax(S, 1)] == ty)
    assert acc(norm) >= acc(raw) - 0.05 and acc(norm) > 0.8
    # genuine normalised scores sit well above impostor ones
    gen = norm[np.arange(len(ty)), [codes.index(c) for c in ty]]
    imp = norm[np.array([[codes[j] != t for j in range(len(codes))] for t in ty])]
    assert gen.mean() > imp.mean() + 2
    with pytest.raises(ValueError):
        idlib.asnorm(raw[:, :1], test, G[:1], cohort[:1], owner[:1], codes[:1])


def test_ahc_recovers_speakers():
    X, y, _ = _speakers(n=3, per=15, noise=0.4, seed=2)
    lab = idlib.ahc(X, threshold=0.5)
    assert len(set(lab)) == 3
    # each cluster is pure
    for k in set(lab):
        assert len(set(y[lab == k])) == 1
    assert idlib.ahc(X[:1], 0.5).tolist() == [0]
    assert len(set(idlib.ahc(X, threshold=0.9999, min_clusters=1))) >= 3
