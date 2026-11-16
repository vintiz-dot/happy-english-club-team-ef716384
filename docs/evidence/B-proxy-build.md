# B-proxy-build: temporary vendor evaluation proxy (audit-eval-proxy)

Where I am / next step: DONE. Everything built, tested (full run 2336/34, 0 failed) and committed; node_modules link removed. Next step belongs to the conductor: review, then the deploy checklist at the end of this file. NOT deployed, migration NOT applied (the conductor does both after review).

Builder: B-proxy implementer, 2026-11-12. Authority: owner decision D-10 (vendor rule lifted for the evaluation; codes only, most private settings each vendor offers, hard caps, teardown first). TEMPORARY: everything below is removed by `scripts/lesson-eval/teardown_audit_eval.md`.

## What was built

| File | What |
|---|---|
| `supabase/migrations/20261112110000_audit_eval_bucket.sql` | private bucket `audit-eval` (25 MB/object, audio MIME types only; admin-only insert/select/delete policies, insert also refuses any non-code name); `audit_eval_settings` (one row: `enabled` default true, `per_run_max_calls` 400, `per_run_max_minutes` 600, `global_max_minutes` 2000); `audit_eval_runs` (id, run_id, vendor, mode, object_path, audio_seconds, reserved_minutes, status, http_status, cost_estimate_usd, started_at, finished_at, created_by - no transcript or audio column); BEFORE INSERT trigger enforcing the kill switch and all three caps under a transaction advisory lock (SQLSTATE PT503 / PT429 -> PostgREST HTTP 503 / 429), whoever inserts (RPC, service role, SQL); BEFORE UPDATE trigger freezing everything but the outcome, once; RPCs `audit_eval_reserve` and `audit_eval_finish` (admin-checked SECURITY DEFINER). Grants: authenticated SELECT only (RLS admin-only), anon nothing, service_role ALL. Paste-twice safe; a second paste keeps the owner's settings. |
| `supabase/functions/audit-eval-proxy/index.ts` | the handler (banner: TEMPORARY). |
| `supabase/functions/audit-eval-proxy/vendors.ts` | modes, private settings, request builders, normalisers to `hec-lesson-eval/1`. Imports nothing. |
| `supabase/config.toml` | `[functions.audit-eval-proxy] verify_jwt = true` |
| `scripts/pgtest/audit-eval.test.mjs` + one line in `run.mjs` | SQL (real migration + real teardown in pglite) and whole-function tests (esbuild bundle, remote import stubbed, Deno.serve captured, scripted fetch, console spy). |
| `scripts/lesson-eval/vendor_run.py` | local driver: cut, upload, call, stitch, resume, `--dry-run`, `--max-minutes`, `--delete-remote [--all]`. |
| `scripts/lesson-eval/teardown_audit_eval.md` / `.sql` | ordered teardown with a check after each step; idempotent SQL. |

### Request flow (one request = one piece, one vendor, one mode)

1. `requireRole(req, sb, ["admin"], corsHeaders, { allowServiceRole: false })` - 401 no/invalid token, 403 non-admin or service role. Nothing is fetched before this passes (asserted).
2. Body must be `application/json`, at most 2 KB, and contain only `run_id, vendor, mode, object_path, audio_seconds, options{max_speakers, language}`. Any other field (`audio`, `audio_url`, `prompt`, ...) -> 400. No free text reaches a vendor, so no name can.
3. `object_path` must match `^(lessons/L\d{1,3}|clips/S\d{2,3}|synth/M\d{2,3})/[a-z0-9_]{1,32}\.(flac|wav|mp3|ogg)$` (same pattern in the storage insert policy and the runs table CHECK).
4. Google `chirp3` -> 501 not implemented. A vendor whose secret is unset -> 503.
5. The piece is read from `storage/v1/object/authenticated/audit-eval/<path>` AS THE CALLER (anon key + the admin's JWT): the admin-only storage policy is the boundary; the service-role client is used only inside `requireRole` to verify the token and read roles.
6. Seconds charged = max(claimed, the least the byte count can hold: WAV 16 kHz mono exact, FLAC bytes/(32000*1.05), MP3/OGG at 128 kbit/s) - so a too-small claim cannot slip audio past the caps. Pieces over 1200 s are refused.
7. `audit_eval_reserve` (as the caller) BEFORE the vendor call; 429 / 503 pass through.
8. Vendor call under one AbortController deadline (default 120 s, below the 150 s free wall clock; `AUDIT_EVAL_TIMEOUT_MS` overrides). Abort -> 504 `{retryable: true}`, row stamped `timeout`.
9. Vendor non-2xx -> 502 with `vendor_status` only (the vendor's body is cancelled, never read or echoed).
10. Success -> `audit_eval_finish(ok, http, cost)`; answer: `system` (name, model, settings incl. retention note, price and source, word-timing kind), `file` (words/turns), `raw` (vendor JSON), `audio_seconds`, `cost_estimate_usd`, `call_id`.
11. One log line per request: `{fn, event, call, vendor, mode, outcome, http, ms}`; on an unexpected error only the error's class name.

## Vendors and the settings applied

| Vendor / mode | Endpoint | Model id | Private / accuracy settings applied | Confirmed where (date) |
|---|---|---|---|---|
| azure `fast-multilingual` | `POST https://{AZURE_SPEECH_REGION}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2025-10-15`, header `Ocp-Apim-Subscription-Key: azure_key`, multipart `audio` + `definition` | fast transcription, multilingual model (`locales` omitted) | fast (synchronous) endpoint = nothing stored by Microsoft; `diarization: {enabled: true, maxSpeakers: 6}` (option 2-35); `profanityFilterMode: "None"` (verbatim); word timestamps are returned by default in `phrases[].words[]` (no flag exists) | https://learn.microsoft.com/en-us/azure/ai-services/speech-service/fast-transcription-create (ms.date 2026-10-02, re-read 2026-11-12); data-privacy-security (ms.date 2026-03-31, via B0) |
| azure `fast-en-vi` | same | fast transcription with `locales: ["en-US","vi-VN"]` (language identification) | as above | same |
| openai `gpt-transcribe` | `POST https://api.openai.com/v1/audio/transcriptions` (Bearer `OPENAI_API_KEY`) | `gpt-transcribe` | `response_format=json`, `languages[]=en`, `languages[]=vi` (never with singular `language`), fixed generic `prompt` (no names); no Files/Batch API; nothing like `store` exists for this endpoint | https://developers.openai.com/api/docs/guides/speech-to-text (no date shown, read 2026-11-12) |
| openai `gpt-4o-transcribe` | same | `gpt-4o-transcribe` (deprecated, shuts down 2027-02-26) | `json`, fixed prompt, optional `language` | same |
| openai `gpt-4o-transcribe-diarize` | same | `gpt-4o-transcribe-diarize` (deprecated, 2027-02-26) | `response_format=diarized_json`, `chunking_strategy=auto` (required over 30 s), no prompt (not supported); NO `known_speaker_references` (would be voiceprints) | same |
| openai `whisper-1` | same | `whisper-1` (deprecated, 2027-02-26) | `verbose_json`, `timestamp_granularities[]=word` and `segment`, fixed prompt, optional `language` | same |
| gemini `transcribe-speakers` | Files API resumable upload `POST https://generativelanguage.googleapis.com/upload/v1beta/files` (streamed), `POST /v1beta/models/{GEMINI_MODEL or gemini-3.8-flash}:generateContent`, `DELETE /v1beta/{file}` in `finally`; key in `x-goog-api-key` header, never in a URL | `gemini-3.8-flash` (as analyze-video-submission) | upload display name `audit-eval-piece`; JSON `responseSchema` of segments {speaker, start, end, language, text}; temperature 0; prompt forbids guessing names; file deleted right after the call. Retention note repeated in every result. | https://aistudio.google.com/docs/audio (no date; re-read 2026-11-12: model id, 32 tokens/s, 20 MB inline); terms effective 2026-03-23 via B0 |
| google `chirp3` | - | - | STUB, 501 "not implemented": Chirp 3 BatchRecognize needs the audio copied into a GCS bucket (us/eu) and sync Recognize is limited to 1 minute; more than a small amount of code. `GOOGLE_CREDENTIALS` is not read. | B0 section 3.2 |

Secret names match the existing functions: `azure_key` + `AZURE_SPEECH_REGION` (get-speech-token, default `southeastasia`), `OPENAI_API_KEY`, `GEMINI_API_KEY` + optional `GEMINI_MODEL` (analyze-video-submission). Azure speaker recognition is retired and was not attempted.

Retention notes returned with each result (from B0): Azure fast = nothing stored (no-training clause not contractually confirmed). OpenAI = no training unless opted in; abuse-monitoring logs up to 30 days unless the org/project has approved ZDR (unknown - owner must check Settings > Data controls). Gemini = paid tier logs "for a limited period" (days not stated), unpaid tier may train and human-review; terms bar API clients directed at under-18s; fails the original rule, included under D-10.

## Normalisation to `hec-lesson-eval/1`

- Azure: one word per `phrases[].words[]` with vendor timings; `conf` = the phrase confidence (Azure gives none per word); speaker `spk{n}`; `lang` from the phrase locale; one turn per phrase. `word_timing: vendor`.
- whisper-1: vendor word timings, no speakers, no confidences. `vendor`.
- gpt-4o-transcribe-diarize: turns from segments; words spread evenly inside each segment. `interpolated-from-segments`.
- gpt-transcribe / gpt-4o-transcribe: text only; words spread evenly over the piece so WER can be scored. `interpolated-over-piece` - NOT usable for DER.
- Gemini: turns from the model's segments; words spread inside each. `interpolated-from-segments`; the model's timestamps are themselves unverified.
- The driver stitches pieces: times shifted by the piece start; each overlap is cut at its midpoint (every instant from exactly one piece); speaker labels matched across pieces by >= 1 s of co-timed words in the overlap, else a new `spkN` (heuristic, recorded in `system.settings.stitch`). Verified locally on synthetic tones with a fake server: 25-minute file, 3 pieces with 20 s overlap, 750 words, 0 duplicates, 0 gaps; `score.py validate` OK; stop on 429 and resume without re-sending finished pieces; `--delete-remote` emptied the fake bucket.

## Driver defaults and containers

10-minute pieces, 20 s overlap, 16 kHz mono 16-bit **FLAC** (all three vendors accept FLAC; a 10-min piece is about 3-12 MB, under OpenAI's 25 MB, Gemini's 20 MB inline (unused - Files API), Azure's 500 MB, and the bucket's 25 MB). `--container wav` (about 19 MB per 10 min) is allowed. Lessons -> `lessons/L1/p0001.flac`; held-out clips (segments.csv `set=heldout`, unflagged) joined per child with 0.5 s silence -> `clips/S01/held_01.flac`, joins recorded in the local map; synthetic mixes -> `synth/M01/p000_0001.flac` with `file_id` = the original mix stem (matches the RTTM references). Output `C:\Users\Dell\hec-audio-eval\work\vendor\<vendor>\<mode>\result_<run_id>.json`; the code-to-file map stays local. Refuses to write inside a git repository (exit 3, tested).

## Edge limits assumed (B0 section 6, supabase.com/docs/guides/functions/limits, read 2026-11-11)

256 MB memory, 2 s CPU per request, 150 s wall clock (free; 400 s paid NOT assumed), 150 s idle timeout. Design: at most one piece in memory (Azure/OpenAI multipart need the bytes; Gemini is streamed storage -> Google); no decoding in the function; deadline 120 s. Request body limit unknown - irrelevant, since audio never travels in the request.

## Tests

- `scripts/pgtest/audit-eval.test.mjs`: 179 passed, 0 failed. SQL: bucket private + size; admin uploads a code-only name; 7 bad names refused (names, `..`, wrong folder, uppercase, space, wrong extension); teacher, parent, student and anon read, write and delete nothing in the bucket and see nothing in the tables and cannot reserve; grants (authenticated SELECT only, anon none, service_role all); exact column list of the runs table; admin cannot insert directly; per-run calls cap, per-run minutes cap, global ceiling, all PT429; service-role direct insert held by the same caps and its status/minutes overwritten; 10 reservations at once -> exactly the cap of 5 (pglite serialises, so the advisory lock is also asserted held inside the reserving transaction); finish once, frozen fields, failed minutes stay counted; kill switch PT503; paste twice keeps settings; teardown drops tables, leaves a non-empty bucket with a NOTICE, then after objects are gone leaves no bucket/function/policy/relation, re-pastes twice, and runs on a database without the migration. Function: no token / bad token 401, teacher / parent / service role 403, all with zero fetches; admin+teacher allowed; audio bytes, audio URL, prompt, unknown option, 6 bad paths, raw audio body (415), oversized body (413) refused with zero fetches; missing piece 404 with no reservation; chirp3 501; under-claimed seconds raised to the byte count; storage and reservation made as the caller; order storage -> reserve -> vendor -> finish; 429 and 503 from the reservation with no vendor call; per-vendor outgoing URL, headers and multipart/JSON fields; Gemini key only in a header, streamed upload, delete called; vendor 401 whose body quoted the key -> 502 without echo; timeout -> 504 retryable + `timeout` row; unset secret -> 503 before reserving; console spy: no secret value, no transcript word, no header name anywhere in console output.
- `node scripts/pgtest/edge-functions.test.mjs`: 5 passed, 0 failed (97 files loaded, including the two new ones).
- Full `node scripts/pgtest/run.mjs`: see "Final totals" below.

## NOT verified without a real call (everything about real responses)

1. That the REGIONAL host `{region}.api.cognitive.microsoft.com` serves fast transcription for this resource (the 2026-10 doc shows only the custom-subdomain host; the resource was created by `setup-azure-speech.ps1` without a custom domain). If it 404s, the resource needs a custom subdomain and the URL a one-line change.
2. Whether `vi-VN` with diarization, and `["en-US","vi-VN"]` language identification, are accepted by Azure fast transcription (B0: UNCONFIRMED).
3. OpenAI: that `languages[]` is the multipart spelling `gpt-transcribe` accepts; that `gpt-transcribe` accepts FLAC and the prompt; that `diarized_json` segment speakers look like the guide; real response shapes.
4. Gemini: that the Files API accepts a streamed body with `Content-Length` from Deno, that `responseSchema` is honoured by `gemini-3.8-flash`, and the quality of model-made timestamps; the DELETE succeeding.
5. Storage: that `GET /storage/v1/object/authenticated/...` returns `content-length` (if absent the function answers 413 - a real piece will show it); upload/list/delete REST shapes used by the driver (written from the storage API as supabase-js uses it).
6. The CPU cost of building a ~10 MB multipart body inside the 2 s CPU limit (expected small: no decoding, only copying).
7. Every price below except OpenAI gpt-transcribe.
8. That PostgREST maps `PT429`/`PT503` to HTTP 429/503 on this project's version (the function also checks the `code` field, so either way it answers 429/503).

## Cost estimate per audio hour (from B0 prices)

| Vendor / mode | USD per audio hour | Source |
|---|---|---|
| Azure fast (either mode) | about 1.00 (+ diarization add-on, unknown) | UNCONFIRMED - pricing page showed placeholders; memory |
| OpenAI gpt-transcribe | 0.27 | developers.openai.com model page ($0.0045/min) |
| OpenAI gpt-4o-transcribe / diarize / whisper-1 | about 0.36 each | UNCONFIRMED (memory, $0.006/min) |
| Gemini 3.8 flash | about 0.18 | UNCONFIRMED: 115,200 audio tokens/h at an assumed ~$1/M input plus output |

The function writes its estimate per call into `audit_eval_runs.cost_estimate_usd`. At the default caps (2000 minutes global) the worst case is about USD 33 if all of it went to Azure.

## Deploy checklist for the conductor

1. Review this branch; re-read each vendor's terms on the day of first use and note the date (owner rule).
2. Apply `supabase/migrations/20261112110000_audit_eval_bucket.sql` FIRST (the function fails closed without it: the reservation RPC 404s -> 502, nothing is sent). Probe: `SELECT enabled, per_run_max_calls, per_run_max_minutes, global_max_minutes FROM public.audit_eval_settings;` -> `true, 400, 600, 2000`; `SELECT public FROM storage.buckets WHERE id='audit-eval';` -> `false`.
3. Deploy the edge function `audit-eval-proxy` with `verify_jwt = true`. Files: `supabase/functions/audit-eval-proxy/index.ts`, `supabase/functions/audit-eval-proxy/vendors.ts`, and the shared `supabase/functions/_lib/auth.ts` (imported as `../_lib/auth.ts`; its only remote import is `https://esm.sh/@supabase/supabase-js@2.75.0`). Secrets already present: `azure_key`, `AZURE_SPEECH_REGION`, `OPENAI_API_KEY`, `GEMINI_API_KEY` (optional `GEMINI_MODEL`, optional `AUDIT_EVAL_TIMEOUT_MS`). Uses `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (auth only).
4. Gate check: `curl -X POST .../functions/v1/audit-eval-proxy` with no token -> 401; with a teacher's token -> 403.
5. One-piece smoke test (admin token in `HEC_ADMIN_JWT`, not saved): `vendor_run.py --vendor azure --mode fast-multilingual --synth seed7_ov00_s500 --run-id smoke1 --max-minutes 3` (or `--dry-run` first to see the pieces). Expected answer per piece: HTTP 200, JSON `{schema: "hec-lesson-eval/1", call_id, run_id: "smoke1", object_path: "synth/M01/p000_0001.flac", system: {name: "azure-fast-multilingual", kind: "vendor", model, settings: {vendor, mode, options, word_timing: "vendor", retention, price_usd_per_min, price_source}}, audio_seconds, cost_estimate_usd, file: {duration_s, words: [{w, start, end, conf, speaker: "spk1", lang}], turns: [{start, end, speaker}], word_timing}, raw: {durationMilliseconds, combinedPhrases, phrases}}`; then `score.py validate` on `work\vendor\azure\fast-multilingual\result_smoke1.json` -> OK; `SELECT status, http_status, audio_seconds, cost_estimate_usd FROM audit_eval_runs WHERE run_id='smoke1'` -> `ok, 200, ...`. Repeat one piece each for openai and gemini before any lesson audio.
6. After the evaluation: `scripts/lesson-eval/teardown_audit_eval.md`, in order.

## Final totals

Full `node scripts/pgtest/run.mjs` on this branch (merged with claude/hec-conductor-setup-efbaa5), 2026-11-12: **2336 assertions across 34 suites, 0 suite(s) failed** = baseline 2157 / 33 + the new "audit eval proxy (TEMP)" suite 179 / 0. Edge functions typecheck 5 / 0 (inside the run and alone).
