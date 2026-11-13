# S1 F-02 - live deploy log (nine AI / speech functions behind `requireSpender`)

**Where I am / next step:** 13 Nov 2026, 09:16 Hanoi. 1 of 9 live and verified (word-enrichment v4). Next step: snapshot image-search (2 of 9).

Live project `aswgmbefikhsnhogtryv`. Source commit `1c736fff` (sheet: `docs/evidence/S1-phase2.md`, Part 3, step 3). Rollback copies: `C:\Users\Dell\hec-tools\f02-rollback\<function>\v3\` (outside the repo): every file `get_edge_function` returned, byte for byte, plus `_meta.json` (version, verify_jwt, entrypoint, ezbr_sha256). Written by `tools/extract.mjs`, which reads the tool result out of this session's own transcript - nothing re-typed on the saving or checking side. Compare: `tools/cmp.mjs`. Authorised by the owner (D-22, D-19). No git push, no SQL that writes, no migration.

## Before anything (read-only)

- `origin/main` = `f5987804` (the sheet expected `c502312e`; main moved by the browser release). None of the nine functions or `_lib/auth.ts` / `_lib/rate-limit.ts` changed between them: `git diff --ignore-cr-at-eol origin/main 1c736fff` over the nine + `_lib` is insertions only - the gate (+10 each; image-search +17) and the new `_lib/ai-gate.ts` (+82).
- Blobs exported from `1c736fff` (`tools/export.sh`, `git show`, no filters); the git blob hash of every exported file equals the sheet: word-enrichment `9f8669c2`, image-search `9c3f015b`, pronounce-syllables `1df87b26`, pronounce-viseme `b6db2e8e`, smart-dictation `93cbba8f`, smart-dictionary `099bd8e7`, sapling-grammar `a20eec92`, image-generate `274ffadd`, get-speech-token `1340712f`, ai-gate `baa9a043`, auth `bd20ef22`, rate-limit `84478ed6`. Line endings as stored in git: the word-enrichment (412 CR) and image-search (357 CR) blobs are mostly CRLF in the repository itself; the other entrypoints and the three `_lib` files have no CR. Each blob is sent as it is.
- `list_edge_functions`: all nine at v3, ACTIVE, `updated_at` 1794314839082 (the one bulk deploy); verify_jwt false for word-enrichment, image-search, pronounce-syllables, pronounce-viseme; true for the other five - as the sheet says.

## Per function

| # | function | live before | live vs origin/main | deployed | files vs blob | probe no header | probe publishable key as bearer |
|---|---|---|---|---|---|---|---|
| 1 | word-enrichment | v3, verify_jwt false | index.ts BYTE-IDENTICAL | v4, ACTIVE, verify_jwt true, entrypoint `word-enrichment/index.ts` (02:15 UTC) | 4 of 4 BYTE-IDENTICAL (index, ai-gate, auth, rate-limit - trailing spaces kept) | 401 | 401 `{"error":"Unauthorized"}` (the function: booted) |
