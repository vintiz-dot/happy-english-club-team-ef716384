# T2b: transcribe-lesson-audio caller gate (T2 finding F2)

Where I am / next step: full run.mjs in progress; then record its total. Nothing deployed or pushed.

## Facts (base `dedd193`)
- Callers: the browser only, two places, both `supabase.functions.invoke("transcribe-lesson-audio", { body: { transcript_id } })` under the signed-in user's JWT:
  - `src/pages/TeacherTranscripts.tsx:347-349` (audioUploadMutation, after the upload and the row insert);
  - `src/pages/TeacherTranscripts.tsx:404-406` (retryTranscriptionMutation).
  Both read only `tRes.success === false` / `tRes.error`, and on a non-2xx `describeFnError` (`:46-56`) shows `body.error`. Neither sends a storage path or class id.
- No other edge function invokes it (grep `supabase/functions`: only comments in `analyze-transcript/index.ts:990` and `_lib/text.ts:3`). No cron / pg_net migration names it (grep `supabase/migrations`: comments only). No script calls it.
- No self-invocation: the only outgoing service-key call is `index.ts:386-392` (base) to `analyze-transcript` with `{ transcript_id, background: true }`; analyze-transcript gates itself (`requireRole` + `callerHoldsClass`, `analyze-transcript/index.ts:992-996`) and passes the service role.
- Service-role client: `index.ts:415-418`. Reads: `class_transcripts` row (`:425-429`), `class-recordings` download of `tr.audio_storage_path` (`:286-288`), `enrollments`, `sessions`, `lesson_resources`, `lesson_overviews` (`:303-334`). Writes (all `class_transcripts` by id): failed-no-audio (`:432-435`), processing stamp (`:443-451`), stage updates (`:271`), fail (`:274-281`), `raw_text` (`:374-377`). Vendor: OpenAI Whisper (`:93`), gpt-4o labeler (`:148`).
- Responses: OPTIONS 200; `{success:false,error:"transcript_id is required"}` 400; `"transcript not found"` 404 (also on any lookup error); no audio 400 (row marked failed); missing OpenAI key 500; `{success:true,queued:true,transcript_id}` 200; handler exception 500.
- `supabase/config.toml:96-97`: `verify_jwt = true` (the anon key passes it).

## The change (`supabase/functions/transcribe-lesson-audio/index.ts`)
1. `requireRole(req, sb, ["admin","teacher"], corsHeaders)` first, before the body or any row is read: no/invalid token or anon key -> 401 `{error:"Unauthorized"}`; family/student -> 403. The service role passes (helper default).
2. Row loaded by `transcript_id` exactly as before (any error or no row -> 404, unchanged).
3. `callerHoldsClass(sb, gate, tr.class_id)` - the class from the ROW, never the body; admin/service pass; rpc error fails closed -> 403 `{success:false,error:"That transcript belongs to a class you do not hold."}` (analyze-transcript's wording). Nothing is written, downloaded or fetched.
4. If the body carries `audio_storage_path` it must equal the row's -> else 400. The row's path must start with `<class_id>/` (the only format the app writes; the F1 CHECK of 20261112120000, enforced here too whether or not that migration is applied) -> else 403, for everyone.
5. Everything after is byte-for-byte the old code. Logs: caller id, transcript id, class id only.

## Before / after
| caller | before | after |
|---|---|---|
| no Authorization / anon key / forged | runs (anon key) or gateway 401 | 401, row not read |
| parent, student | runs the pipeline | 403, row not read |
| teacher of another class | runs the pipeline | 403, nothing downloaded/sent/written |
| TA not on the class | runs | 403, same |
| teacher of the class | 200 queued | identical (compared call-for-call with `dedd193`) |
| TA on the class (is_teacher_of_class true) | 200 | identical |
| admin | 200 | identical |
| service role | 200 | identical |
| row path under another class | runs (reads other class's audio) | 403 |
| body path != row path | ignored | 400 |
| unknown id / lookup error | 404 | 404 (after auth) |

Browser change needed: none (same body, same success shape; a refusal shows `error` via describeFnError).

## Tests
`scripts/pgtest/transcribe-gate.test.mjs` (registered in `run.mjs` as "transcribe gate"): the real function bundled with esbuild, https imports stubbed, Deno.serve captured, `EdgeRuntime.waitUntil` awaited, `fetch` scripted, Supabase client an in-memory recorder. It also bundles the function at `dedd193` (`git show`) and asserts the class teacher, TA on the class, admin and service role produce the same status, response, Supabase calls and outgoing fetches (full run, no-audio row, unknown id, no id).
- On the fix: 107 passed, 0 failed. On the base function: 45 passed, 62 failed.
- `node scripts/pgtest/edge-functions.test.mjs`: 5 passed, 0 failed.

### Mutants (`.probe/`, throwaway copies)
| # | mutant | result |
|---|---|---|
| 1 | gate removed | CAUGHT (42 fail) |
| 2 | class check removed | CAUGHT (18 fail) |
| 3 | class taken from the body | CAUGHT (4 fail) |
| 4 | path checks removed | CAUGHT (16 fail) |
| 5 | gate after the storage read | CAUGHT (32 fail) |
| 6 | service role refused | CAUGHT (6 fail) |

## Deploy
Files (index + every `_lib` import, recursively): `supabase/functions/transcribe-lesson-audio/index.ts`, `supabase/functions/_lib/text.ts` (imports nothing), `supabase/functions/_lib/auth.ts` (imports only esm.sh supabase-js). verify_jwt: true (keep).

Read-only post-deploy probes (no body that names a real transcript is needed):
- `curl -s -o /dev/null -w "%{http_code}" -X POST <SUPABASE_URL>/functions/v1/transcribe-lesson-audio -H "Authorization: Bearer <publishable anon key>" -H "apikey: <same>" -H "Content-Type: application/json" -d '{"transcript_id":"00000000-0000-0000-0000-000000000000"}'` -> 401 (before the fix: 404).
- Behavioural: retry transcription on Teacher Transcripts as the class's teacher -> queued and processes as before.

## Runs
- Full `node scripts/pgtest/run.mjs`: PENDING
