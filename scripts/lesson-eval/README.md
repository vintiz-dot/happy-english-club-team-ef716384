# lesson-eval: harness for speech-to-text, diarization and speaker identification

Evaluation tooling for workstream B (`docs/MASTER_PLAN.md`). Evidence: `docs/evidence/B0-harness.md`.

## Data rules (enforced by the code, not only by convention)

- The audio is children's voices. It lives only in `C:\Users\Dell\hec-audio-eval\` (override with `HEC_EVAL_ROOT`). Every output defaults to `<root>\work\`; `common.safe_out()` exits 3 if an output path is inside any git repository.
- `key.txt` and `consent.txt` are never opened: `common.iter_media()` drops them by name. Children are codes `S01..S30` only.
- Voiceprints/embeddings go under `work\voiceprints\` only. `delete_voiceprints.py --yes` deletes them all; `delete_all_derived.py --yes` deletes the whole `work\` folder.
- A voice match is a suggestion with a score. Below the threshold chosen by `score.py ident` it is shown as UNKNOWN; nothing links a child automatically, and nothing from a lesson reaches a family before a teacher approves.
- No vendor API is called by anything here. No secrets are read.

## Setup (once)

```powershell
cd C:\Users\Dell\hec-audio-eval
python -m venv .venv
.venv\Scripts\python -m pip install numpy scipy soundfile pytest faster-whisper
# optional local diarization/embedding stacks (see docs/evidence/B0-harness.md for what installed):
.venv\Scripts\python -m pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python -m pip install speechbrain sherpa-onnx
$env:HF_HOME = "C:\Users\Dell\hec-audio-eval\models\hf"   # model cache outside the repo
```

Below, `PY` = `C:\Users\Dell\hec-audio-eval\.venv\Scripts\python` and paths are relative to the repo root.

## Command sequence

```powershell
PY scripts\lesson-eval\hardware.py --out C:\Users\Dell\hec-audio-eval\work\hardware.json
PY scripts\lesson-eval\extract.py            # 16 kHz WAVs + manifest (skips existing; --force, --verify)
PY scripts\lesson-eval\confirm_pairs.py --windows 24   # which lesson files are the same recording
PY scripts\lesson-eval\split.py --seed 7     # speech seconds per child, ENROL / HELD-OUT
PY scripts\lesson-eval\mix.py --n 6 --overlap 0.00 --seed 7
PY scripts\lesson-eval\mix.py --n 6 --overlap 0.05 --degrade s500 --seed 7
PY scripts\lesson-eval\mix.py --n 6 --overlap 0.15 --degrade s500 --seed 7
PY -m pytest scripts\lesson-eval\tests -q -p no:cacheprovider
```

Outputs: `work\wav16k\{videos,lessons}\*.wav`, `work\wav16k\manifest.csv`, `work\pairs\confirm_pairs.json`,
`work\split\{segments,summary}.csv`, `work\mix\<tag>\*.{wav,rttm,turns.csv}` + `meta.json`.

## Scoring a system (B1/B2)

Every system, vendor or local, writes one result JSON per run in the schema `result_schema.json`
(`hec-lesson-eval/1`): per file, `words` with `start`/`end`/`conf`/`speaker`/`lang`, optional `turns`
with an `id_suggestion` {code, score}. Store results under `work\results\`.

```powershell
PY scripts\lesson-eval\score.py validate work\results\sysA.json
PY scripts\lesson-eval\score.py wer --ref refs.tsv --hyp work\results\sysA.json            # strict
PY scripts\lesson-eval\score.py wer --ref refs.tsv --hyp work\results\sysA.json --mode nofill
PY scripts\lesson-eval\score.py to-rttm work\results\sysA.json > work\results\sysA.rttm
PY scripts\lesson-eval\score.py der --ref work\mix\<tag>\all.rttm --hyp work\results\sysA.rttm --collar 0.25
PY scripts\lesson-eval\score.py der --ref ... --hyp ... --no-overlap
PY scripts\lesson-eval\score.py ident --table ident.csv --enrolled S01,S02,... --fa-target 0.01
PY scripts\lesson-eval\score.py preserve --ref annotated.tsv --hyp sysA=work\results\sysA.json --hyp sysB=...
```

- References are TSV `id<TAB>text`, one line per utterance/segment (alignment is O(n*m); do not put a whole lesson on one line). Tag Vietnamese words without diacritics as `word|vi`.
- `ident.csv`: `turn_id,true_code,pred_code,score[,enrolled]`; an empty `pred_code` means the system said UNKNOWN. Open-set: give `--enrolled` (or `enrolled=0` rows) for speakers that were not enrolled; their only correct answer is UNKNOWN.
- Learner-error slice: verbatim reference with `{spoken=>correct}` marks, e.g. `he {go=>goes} home`, `I like {=>the} dog`.

The normaliser, DER and threshold rules are documented in `score.py --help`.

## Speaker identification (B2, `docs/evidence/B2-identification.md`)

All outputs stay under `work\`; embeddings and lesson-cluster voiceprints under `work\voiceprints\b2\`
(`delete_voiceprints.py --yes` removes them); unit audio `work\b2\units.npz` and teacher samples
`work\teacher-check\` go with `delete_all_derived.py --yes`. Ungated models only; no token.

```powershell
PY scripts\lesson-eval\fetch_models.py                 # sherpa-onnx embedding + segmentation ONNX into models\sherpa
PY scripts\lesson-eval\b2_units.py --seed 11           # time re-split, windows inside utterances, 1/2/4/8 s x clean/s500/overlap
PY scripts\lesson-eval\b2_embed.py --model ecapa --threads 2       # also wes_campp, 3ds_campp, titanet_l (wes_r34lm, 3ds_eres2v2)
PY scripts\lesson-eval\b2_eval.py --models ecapa --json work\b2\results_ecapa.json   # closed + leave-one-out open set, thresholds
PY scripts\lesson-eval\b2_report.py --diag-model ecapa > work\b2\report.md          # Markdown tables, codes only
PY scripts\lesson-eval\b2_lessons.py tune --engine own --diar-model 3ds_campp --thresholds=-0.1,0.0,0.1,0.2,0.3
PY scripts\lesson-eval\b2_lessons.py run --lessons L1,L2,L3 --minutes 20 --diar-model 3ds_campp --diar-threshold 0.1 `
   --id-model ecapa --id-config vad-all-k3-asnorm --threshold 4.7264
PY -m pytest scripts\lesson-eval\tests -q -p no:cacheprovider
```

`b2_lessons.py run` writes `work\teacher-check\check_sheet.csv` (cluster, suggestion or UNKNOWN, score, blank
teacher answer) and one 10-20 s WAV per cluster, by code only. Every suggestion is a guess for a teacher to
confirm; nothing is linked.
