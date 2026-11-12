"""Unit tests for score.py on small synthetic fixtures (no audio, no children's data).

    python -m pytest scripts/lesson-eval/tests -q
"""
import json
import math
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
import common  # noqa: E402
import score  # noqa: E402
from score import Turn  # noqa: E402

FIX = HERE / "fixtures"


# ---------------------------------------------------------------- normaliser
def test_strict_keeps_learner_errors_and_diacritics():
    assert score.normalise("He go to school!") == ["he", "go", "to", "school"]
    assert score.normalise("I don’t like, \"apple\".") == ["i", "don't", "like", "apple"]
    assert score.normalise("Tôi thích con mèo.") == ["tôi", "thích", "con", "mèo"]
    # no number or contraction canonicalisation
    assert score.normalise("I have 3 cats") != score.normalise("I have three cats")
    assert score.normalise("do not") != score.normalise("don't")


def test_strict_keeps_fillers_nofill_drops_them():
    assert score.normalise("um I uh like it") == ["um", "i", "uh", "like", "it"]
    assert score.normalise("um I uh like it", "nofill") == ["i", "like", "it"]


def test_nfc_composition():
    decomposed = "mèo"  # m e + combining grave + o
    assert score.normalise(decomposed) == score.normalise("mèo")


# ----------------------------------------------------------------------- WER
def test_wer_counts():
    r = score.wer_pair("he goes to the school", "he go to school")
    w = r["wer"]
    assert (w.n, w.sub, w.dele, w.ins) == (5, 1, 1, 0)
    assert w.rate == pytest.approx(0.4)


def test_wer_insertion_and_perfect():
    assert score.wer_pair("a b c", "a b c").get("wer").rate == 0
    w = score.wer_pair("a b", "a x b")["wer"]
    assert (w.ins, w.sub, w.dele) == (1, 0, 0)


def test_cer():
    c = score.wer_pair("cat", "cut")["cer"]
    assert c.n == 3 and c.sub == 1


def test_code_switch_per_language():
    r = score.wer_pair("I like con|vi mèo very much", "I like con mẹo much")
    per = r["per_lang"]
    assert per["vi"].n == 2 and per["vi"].sub == 1       # mèo -> mẹo
    assert per["en"].n == 4 and per["en"].dele == 1      # 'very' deleted
    assert r["wer"].errors == 2


def test_auto_lang_detection():
    assert score.detect_lang("thích") == "vi"
    assert score.detect_lang("đi") == "vi"
    assert score.detect_lang("school") == "en"


def test_wer_cli_on_fixture(capsys):
    score.main(["wer", "--ref", str(FIX / "ref.tsv"), "--hyp", str(FIX / "hyp.tsv")])
    out = json.loads(capsys.readouterr().out)
    assert out["wer"]["n"] == 10
    assert out["wer"]["sub"] == 2 and out["wer"]["del"] == 1 and out["wer"]["ins"] == 1
    assert out["per_lang"]["vi"]["n"] == 4


# ----------------------------------------------------------------------- DER
def test_der_perfect_with_relabelled_speakers():
    ref = [(0, 2, "A"), (2, 4, "B")]
    hyp = [(0, 2, "x"), (2, 4, "y")]
    r = score.der_file(ref, hyp)
    assert r["der"] == 0 and r["mapping"] == {"x": "A", "y": "B"}


def test_der_miss_fa_confusion():
    ref = [(0, 4, "A"), (4, 8, "B")]
    hyp = [(0, 3, "x"), (4, 6, "x"), (6, 9, "y")]
    r = score.der_file(ref, hyp)
    # miss 3-4 = 1 s; FA 8-9 = 1 s; x->A, y->B, so 4-6 (x on B) is 2 s confusion
    assert r["miss_s"] == pytest.approx(1.0)
    assert r["fa_s"] == pytest.approx(1.0)
    assert r["conf_s"] == pytest.approx(2.0)
    assert r["der"] == pytest.approx(0.5)


def test_der_collar_and_overlap():
    ref = [(0, 4, "A"), (3, 6, "B")]
    hyp = [(0, 4, "x"), (4, 6, "y")]  # misses B in the 3-4 overlap
    assert score.der_file(ref, hyp)["miss_s"] == pytest.approx(1.0)
    assert score.der_file(ref, hyp, skip_overlap=True)["der"] == 0
    shifted = [(0, 4.2, "x"), (4.2, 6, "y")]
    assert score.der_file([(0, 4, "A"), (4, 6, "B")], shifted, collar=0.25)["der"] == 0
    assert score.der_file([(0, 4, "A"), (4, 6, "B")], shifted)["der"] > 0


def test_der_cli_fixture(capsys):
    score.main(["der", "--ref", str(FIX / "ref.rttm"), "--hyp", str(FIX / "hyp.rttm")])
    out = json.loads(capsys.readouterr().out)
    assert out["files"] == 2
    assert out["per_file"]["f1"]["der"] == 0
    assert out["per_file"]["f2"]["ref_speakers"] == 3 and out["per_file"]["f2"]["sys_speakers"] == 2
    assert out["speaker_count_exact"] == 1


# --------------------------------------------------------------- identification
def _turns():
    T = []
    for i in range(10):  # enrolled, correct, high score
        T.append(Turn(f"g{i}", "S01", "S01", 0.9 - i * 0.01, True))
    T.append(Turn("m1", "S01", "S02", 0.55, True))   # misidentified, mid score
    T.append(Turn("o1", "S99", "S03", 0.60, False))  # not enrolled, got a child
    T.append(Turn("o2", "S98", "S03", 0.30, False))  # not enrolled, low score
    T.append(Turn("u1", "S02", "UNKNOWN", 0.0, True))  # system already said unknown
    return T


def test_ident_at_threshold():
    T = _turns()
    r = score.ident_at(T, 0.0)
    assert r["false_accept_n"] == 3 and r["open_set_accepts"] == 2 and r["misid_enrolled"] == 1
    r = score.ident_at(T, 0.7)
    assert r["false_accept_n"] == 0
    assert r["accuracy"] == pytest.approx(12 / 14)    # 10 genuine + 2 open-set UNKNOWN
    assert r["unknown_rate"] == pytest.approx(4 / 14)
    r = score.ident_at(T, 0.855)
    assert r["false_reject"] == pytest.approx(5 / 12)  # g5..g9 below 0.855 among 12 enrolled turns


def test_open_set_correct_answer_is_unknown():
    t = Turn("x", "S50", "S01", 0.99, False)
    assert t.answer == "UNKNOWN"
    assert score.ident_at([t], 0.5)["false_accept_n"] == 1
    assert score.ident_at([t], 1.0)["accuracy"] == 1


def test_recommendation_and_evidence():
    rec = score.recommend(_turns(), 0.01)
    assert rec["threshold"] == pytest.approx(0.81)  # smallest observed score above every wrong accept
    assert rec["evidence"].startswith("insufficient")  # 14 turns cannot show 1 %
    many = [Turn(f"g{i}", "S01", "S01", 0.9, True) for i in range(400)]
    many.append(Turn("bad", "S01", "S02", 0.5, True))
    rec = score.recommend(many, 0.01)
    # T=0.5 has 1/401 observed (<1 %) but its upper bound is 1.4 %: fail closed to T=0.9
    assert rec["evidence"] == "sufficient" and rec["threshold"] == pytest.approx(0.9)


def test_eer():
    e = score.eer(_turns())
    assert e["genuine"] == 10 and e["impostor"] == 3
    assert 0 <= e["eer"] <= 0.5


def test_ident_cli_fixture(capsys):
    score.main(["ident", "--table", str(FIX / "ident.csv"), "--enrolled", "S01,S02"])
    out = json.loads(capsys.readouterr().out)
    assert out["turns"] == 6 and out["open_set_turns"] == 1
    assert out["recommendation"]["threshold"] == pytest.approx(0.8)


# ------------------------------------------------------- learner-error tally
def test_preserve_classification():
    ann = "he {go=>goes} to school and {=>the} dog {am=>} like it"
    # verbatim: he go to school and dog am like it
    assert score.classify_marks(ann, "he go to school and dog am like it") == ["preserved"] * 3
    assert score.classify_marks(ann, "he goes to school and the dog like it") == ["corrected"] * 3
    assert score.classify_marks(ann, "he no to school and dog am like it")[0] == "other"


def test_preserve_cli_fixture(capsys):
    score.main(["preserve", "--ref", str(FIX / "annotated.tsv"),
                "--hyp", f"verbatim={FIX / 'hyp_verbatim.tsv'}", "--hyp", f"fixer={FIX / 'hyp_fixer.tsv'}"])
    out = json.loads(capsys.readouterr().out)
    assert out["verbatim"]["preserved"] == 3 and out["verbatim"]["preservation_rate"] == 1
    assert out["fixer"]["corrected"] == 3 and out["fixer"]["silent_correction_rate"] == 1


# ------------------------------------------------------------ result schema
def test_schema_example_validates_and_converts(capsys):
    doc = json.loads((FIX / "result_example.json").read_text(encoding="utf-8"))
    assert score.validate_result(doc) == []
    assert score.main(["to-rttm", str(FIX / "result_example.json")]) == 0
    lines = capsys.readouterr().out.strip().splitlines()
    assert lines[0].startswith("SPEAKER f1 1 0.000")
    assert len(lines) == 2


def test_schema_rejects_bad_doc():
    bad = {"schema": "x", "system": {"name": "a", "kind": "cloud"},
           "files": [{"file_id": "f", "words": [{"w": "a", "start": 2, "end": 1, "conf": 3}]}]}
    errs = score.validate_result(bad)
    assert len(errs) >= 4


def test_schema_file_is_valid_json():
    j = json.loads((HERE.parent / "result_schema.json").read_text(encoding="utf-8"))
    assert j["properties"]["schema"]["const"] == score.SCHEMA_ID


# ---------------------------------------------------------- data-rule guards
def test_safe_out_refuses_inside_git_repo():
    with pytest.raises(SystemExit) as e:
        common.safe_out(HERE / "should_not_exist.wav", mkdir=False)
    assert e.value.code == 3


def test_forbidden_names_never_listed(tmp_path):
    (tmp_path / "videos").mkdir()
    for n in ("key.txt", "KEY.TXT", "consent.txt", "S01_clip1.mp4"):
        (tmp_path / "videos" / n).write_bytes(b"")
    names = [p.name for p in common.iter_media(tmp_path / "videos")]
    assert names == ["S01_clip1.mp4"]


def test_code_of():
    assert common.code_of("S07_clip2") == ("S07", "2")
    assert common.code_of("Recording") == ("", "")
