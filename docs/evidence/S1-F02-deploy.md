# S1 F-02 - live deploy log (nine AI / speech functions behind `requireSpender`)

**Where I am / next step:** 13 Nov 2026, 09:36 Hanoi. DONE - F-02 LIVE AND VERIFIED: all nine at v4, verify_jwt true, every file byte-identical to `1c736fff`, probes 401/401, logs clean. Next step is the owner's: the signed-in hand checks at the end of this file.

Live project `aswgmbefikhsnhogtryv`. Source commit `1c736fff` (sheet: `docs/evidence/S1-phase2.md`, Part 3, step 3). Rollback copies: `C:\Users\Dell\hec-tools\f02-rollback\<function>\v3\` (outside the repo): every file `get_edge_function` returned, byte for byte, plus `_meta.json` (version, verify_jwt, entrypoint, ezbr_sha256). Written by `tools/extract.mjs`, which reads the tool result out of this session's own transcript - nothing re-typed on the saving or checking side. Compare: `tools/cmp.mjs`. Authorised by the owner (D-22, D-19). No git push, no SQL that writes, no migration.

## Before anything (read-only)

- `origin/main` = `f5987804` (the sheet expected `c502312e`; main moved by the browser release). None of the nine functions or `_lib/auth.ts` / `_lib/rate-limit.ts` changed between them: `git diff --ignore-cr-at-eol origin/main 1c736fff` over the nine + `_lib` is insertions only - the gate (+10 each; image-search +17) and the new `_lib/ai-gate.ts` (+82).
- Blobs exported from `1c736fff` (`tools/export.sh`, `git show`, no filters); the git blob hash of every exported file equals the sheet: word-enrichment `9f8669c2`, image-search `9c3f015b`, pronounce-syllables `1df87b26`, pronounce-viseme `b6db2e8e`, smart-dictation `93cbba8f`, smart-dictionary `099bd8e7`, sapling-grammar `a20eec92`, image-generate `274ffadd`, get-speech-token `1340712f`, ai-gate `baa9a043`, auth `bd20ef22`, rate-limit `84478ed6`. Line endings as stored in git: the word-enrichment (412 CR) and image-search (357 CR) blobs are mostly CRLF in the repository itself; the other entrypoints and the three `_lib` files have no CR. Each blob is sent as it is.
- `list_edge_functions`: all nine at v3, ACTIVE, `updated_at` 1794314839082 (the one bulk deploy); verify_jwt false for word-enrichment, image-search, pronounce-syllables, pronounce-viseme; true for the other five - as the sheet says.

## Per function

| # | function | live before | live vs origin/main | deployed | files vs blob | probe no header | probe publishable key as bearer |
|---|---|---|---|---|---|---|---|
| 1 | word-enrichment | v3, verify_jwt false | index.ts BYTE-IDENTICAL | v4, ACTIVE, verify_jwt true, entrypoint `word-enrichment/index.ts` (02:15 UTC) | 4 of 4 BYTE-IDENTICAL (index, ai-gate, auth, rate-limit - trailing spaces kept) | 401 | 401 `{"error":"Unauthorized"}` (the function: booted) |
| 2 | image-search | v3, verify_jwt false | index.ts BYTE-IDENTICAL | v4, ACTIVE, verify_jwt true, entrypoint `image-search/index.ts` (02:17 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 3 | pronounce-syllables | v3, verify_jwt false | index.ts identical except line endings (live CRLF, main LF) | v4, ACTIVE, verify_jwt true (02:19 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 4 | pronounce-viseme | v3, verify_jwt false | identical except line endings | v4, ACTIVE, verify_jwt true (02:21 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` (booted with the npm Speech SDK import) |
| 5 | smart-dictation | v3, verify_jwt true | identical except line endings | v4, ACTIVE, verify_jwt true (02:23 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 6 | smart-dictionary | v3, verify_jwt true | identical except line endings | v4, ACTIVE, verify_jwt true (02:26 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 7 | sapling-grammar | v3, verify_jwt true | identical except line endings | v4, ACTIVE, verify_jwt true (02:27 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 8 | image-generate | v3, verify_jwt true | identical except line endings | v4, ACTIVE, verify_jwt true (02:29 UTC) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |
| 9 | get-speech-token | v3, verify_jwt true | identical except line endings | v4, ACTIVE, verify_jwt true (02:31 UTC = 09:31 Hanoi, outside 16:30-21:00) | 4 of 4 BYTE-IDENTICAL | 401 | 401 `{"error":"Unauthorized"}` |

All nine probed once more together at 02:32 UTC: the same 401 / 401 from each. No redeploy was needed and nothing was restored. Each `get_edge_function` after the deploy returned the four files as sent, `verify_jwt` true, and `requireSpender(req, corsHeaders, GATE)` straight after the OPTIONS block.

## Logs, 02:14 UTC (before the first deploy) to the time of reading (~02:35 UTC), counts only

- `function_edge_logs` for the nine: 4 requests each, all my probes, every one answered 401 by version 4. No other request reached any of the nine in the window (no app traffic). No 5xx.
- `function_logs` for the nine (by function id): Boot (25-55 ms) and Shutdown only, plus sapling-grammar's two `Listening on ...` info lines from `std/http/server`. No boot error, no worker error, no error-level line. All at version 4.
- `edge_logs`: 0 responses >= 500 on any `/functions/v1/` path in the window.

## Rollback

Per function: redeploy the files under `C:\Users\Dell\hec-tools\f02-rollback\<function>\v3\files\` with the `verify_jwt` in that folder's `_meta.json` (false for word-enrichment, image-search, pronounce-syllables, pronounce-viseme; true for the other five), entrypoint `<function>/index.ts`. The deployed copies read back after the deploy are in `...\<function>\v4-after\`.

## Not verified by me

No signed-in call was made (no account created, nobody signed in): the code past the gate has booted but not run on live, and the 403 cases (image-generate and image-search's `provider` / `skip_cache` for a student or family login) are untested on live. Still to do by the owner or a test login: look one word up on the Vocabulary page (definition, pictures, syllable audio, grammar hint), use speaking practice, and start the video recorder once to see the live pronunciation line.

**Result: F-02 LIVE AND VERIFIED** (outside probes and file identity; signed-in use not checked).
