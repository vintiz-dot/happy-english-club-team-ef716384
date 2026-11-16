"""b1_score on synthetic fixtures (invented words, no children's data).

    python -m pytest scripts/lesson-eval/tests/test_b1_score.py -q
"""
import json
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import b1_score as b  # noqa: E402


def W(w, s, e=None, spk=None, lang=None):
    return {"w": w, "start": s, "end": e if e is not None else s + 0.3, "conf": None, "speaker": spk, "lang": lang}


def test_agreement_is_symmetric_and_bounded():
    a = "the cat sat on the mat".split()
    c = "the cat sit on a mat".split()
    m, la, lb = b.agreement(a, c)
    assert (m, la, lb) == (4, 6, 6)
    assert b.ratio(m, la, lb) == b.ratio(*b.agreement(c, a)) == pytest.approx(0.667, abs=1e-3)
    assert b.agreement(a, [])[0] == 0 and b.ratio(1, 1, 1) == 1.0


def test_classify_diff_kinds():
    assert b.classify_diff("a", "the") == "article"
    assert b.classify_diff("", "an") == "article"
    assert b.classify_diff("walk", "walked") == "ending (-s/-ed/-ing)"
    assert b.classify_diff("goes", "go") == "ending (-s/-ed/-ing)"
    assert b.classify_diff("is", "was") == "function word"
    assert b.classify_diff("table", "cable") == "other word"
    c = b.diff_counts("he go to the school".split(), "he goes to school".split())
    assert c["ending (-s/-ed/-ing)"] == 1 and c["article"] == 1 and c["compared_words"] == 5


def test_parse_mix_and_kind():
    assert b.parse_mix("mix_seed7_ov05_s500_002") == {"seed": 7, "overlap_pct": 5, "degrade": "s500", "tag": "seed7_ov05_s500", "n": 2}
    assert b.parse_mix("S01_held_01") is None
    assert (b.file_kind("mix_seed7_ov00_none_000"), b.file_kind("S12_held_02"), b.file_kind("L3")) == ("synth", "clips", "lesson")


def test_pick_stretch_prefers_many_speakers():
    quiet = [(0, 290, "a")]
    busy = [(600 + i * 20, 600 + i * 20 + 15, "abcd"[i % 4]) for i in range(15)]
    st = b.pick_stretch(quiet + busy, 1200)
    assert st["speakers"] == 4 and 300 <= st["start"] <= 600
    assert b.pick_stretch([], 100) is None


def test_printable_has_labels_and_times_but_no_extras():
    f = {"words": [W("one", 3, spk="spk3"), W("two", 4, spk="spk3"), W("three", 30, spk="spk9")]}
    out = b.printable(f, 0, 60)
    assert out.splitlines() == ["[00:03] A: one two", "[00:30] B: three"]


def test_tally_preserve_counts_silent_corrections():
    ann = {"w1": "he {go=>goes} to school", "w2": "I like {=>the} dog"}
    res = b.tally_preserve(ann, {"verbatim": "he go to school I like dog", "fluent": "he goes to school I like the dog"})
    assert res["verbatim"]["preserved"] == 2 and res["verbatim"]["silent_correction_rate"] == 0
    assert res["fluent"]["corrected"] == 2 and res["fluent"]["preservation_rate"] == 0


def test_window_vi_classification():
    vi = [W("tôi", 1), W("thích", 2), W("con", 3), W("mèo", 4)]
    sysA = {"meta": {"settings": {}}, "files": {"L1": {"duration_s": 20, "words": vi + [W("ok", 15)]}}}
    sysB = {"meta": {"settings": {}}, "files": {"L1": {"duration_s": 20, "words": [W("so", 1), W("this", 2), W("is", 3), W("fine", 4)]}}}
    sysC = {"meta": {"settings": {}}, "files": {"L1": {"duration_s": 20, "words": [W("a", 15)]}}}
    sysD = {"meta": {"settings": {"word_timing": "interpolated-over-piece"}}, "files": {"L1": {"duration_s": 20, "words": vi}}}
    rows, n = b.vi_window_rows({"A": sysA, "B": sysB, "C": sysC, "D": sysD})
    by = {r["system"]: r for r in rows}
    assert n == 1 and "D" not in by
    assert by["A"]["vietnamese_text"] == 1 and by["B"]["non_vietnamese_text"] == 1 and by["C"]["dropped"] == 1


def build_work(tmp: Path) -> Path:
    """Two fake systems over one fake mix (with RTTM) and L1/L4 lesson files."""
    work = tmp / "work"
    (work / "mix" / "seed7_ov05_s500").mkdir(parents=True)
    rttm = "SPEAKER mix_seed7_ov05_s500_000 1 0.000 5.000 <NA> <NA> S01 <NA> <NA>\nSPEAKER mix_seed7_ov05_s500_000 1 5.000 5.000 <NA> <NA> S02 <NA> <NA>\n"
    (work / "mix" / "seed7_ov05_s500" / "mix_seed7_ov05_s500_000.rttm").write_text(rttm)
    words1 = [W("alpha", 1, spk="x"), W("beta", 2, spk="x"), W("gamma", 6, spk="y"), W("delta", 7, spk="y")]
    words2 = [W("alpha", 1, spk="x"), W("beta", 2, spk="x"), W("gamma", 6, spk="y"), W("deltas", 7, spk="y")]
    lesson = [W(f"w{i}", i * 2.0, spk="s%d" % (i % 3)) for i in range(150)]
    for name, wd, lw in (("sys-one", words1, lesson), ("sys-two", words2, lesson[:-1])):
        d = work / "vendor" / "v" / name
        d.mkdir(parents=True)
        doc = {"schema": "hec-lesson-eval/1", "system": {"name": name, "kind": "vendor", "settings": {"price_usd_per_min": 0.01}},
               "run": {"wall_s": 10, "audio_s": 60},
               "files": [{"file_id": "mix_seed7_ov05_s500_000", "duration_s": 10, "words": wd, "turns": []},
                         {"file_id": "L1", "duration_s": 300, "words": lw, "turns": []},
                         {"file_id": "L4", "duration_s": 300, "words": lw[:-2], "turns": []}]}
        (d / f"result_{name}.json").write_text(json.dumps(doc), encoding="utf-8")
    return work


def test_full_report_on_fake_work(tmp_path):
    work = build_work(tmp_path)
    systems = b.load_systems(work / "vendor")
    assert sorted(systems) == ["sys-one", "sys-two"]
    block, csvs = b.build_report(systems, work)
    cond = csvs["synth_conditions"]
    assert {c["system"] for c in cond} == {"sys-one", "sys-two"} and cond[0]["speakers_exact"] == "1/1"
    assert cond[0]["overlap_pct"] == 5 and cond[0]["degrade"] == "s500"
    names, cell = b.agreement_matrix(systems, "synth")
    assert cell[("sys-one", "sys-two")][0] == pytest.approx(0.75)
    comp = {r["system"]: r for r in csvs["compression"]}
    assert comp["sys-one"]["self_agreement_L1_vs_L4"] == pytest.approx(0.993, abs=1e-3)
    assert "UNCHECKED" in block and "NOT ACCURACY" in block
    # the evidence block must not carry any transcript word
    for w in ("alpha", "beta", "gamma", "delta"):
        assert w not in block
    status = b.build_teacher_pack(systems, tmp_path / "tc", work)
    assert "L1" in status
    out = tmp_path / "tc" / "b1"
    assert (out / "sys-one.txt").exists() and (out / "stretch.json").exists()


def test_evidence_writer_replaces_between_markers(tmp_path):
    p = tmp_path / "e.md"
    p.write_text("# t\n", encoding="utf-8")
    b.write_evidence(p, "one")
    b.write_evidence(p, "two")
    t = p.read_text(encoding="utf-8")
    assert t.count(b.START) == 1 and "two" in t and "one" not in t
