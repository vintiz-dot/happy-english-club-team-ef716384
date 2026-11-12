# B1 transcripts: runs and scoring

**Where I am / next step:** vendor_batch.py written and dry-run verified; next: fake-server test, then b1_score.py.

## Part 1 status (vendor_batch.py written)

- `scripts/lesson-eval/vendor_batch.py` committed; `--dry-run` plan (7 systems x 6 input sets: 12 synthetic mixes, 17 held-out clip files, L1/L2/L3 first 20 min, L4 = the same 20 min of L1's compressed twin): 149.4 audio min per system (140.4 still to send for azure-fast-multilingual, two synthetic pieces already saved), total 1036.8 min to send, estimated USD 8.65 (B0 price table; Azure and most OpenAI prices UNCONFIRMED).
