# Brief: apply D4 step 1a (the two floors) on the LIVE project (exact steps; stop on anything unexpected)

Not authorised by this file. The conductor runs this only after the independent review of step 1a and the owner's go-ahead. Live project id: `aswgmbefikhsnhogtryv`. This is a school's production database with real children and real money. Do EXACTLY these steps, in this order, and nothing else. If any check differs from what is expected, STOP immediately, change nothing further, and report.

What step 1a is: ONE migration, `supabase/migrations/20261114090000_d4_floors.sql` (revised after the 1a review `D4-1a-review.md`: C-1 a lesson moved later the same day keeps its floor; C-2 a floor is written only on a real lowering; C-3 the file name; C-4 four more cases). No edge function changes (the deployed `manage-session` v4 and `bulk-cancel-sessions` v4 pass the new preview fields through unchanged; proven by `scripts/pgtest/d4-deployed-functions.test.mjs`, which drives exactly those sources from c43a82f). The `src` change (`src/lib/sessionGuard.ts`, `EvidenceCards.tsx`) ships with the next Cloudflare deploy and reads the new fields when present; it can ship before or after the paste.

## Rules

- First action: create `docs/evidence/D4-1a-live-apply.md` with a "Where I am / next step" line and commit; append each step's result and commit after each step.
- Every file you send comes from the reviewed commit, byte for byte, with LF line endings (normalise CRLF to LF when reading; never alter anything else). Record the LF blob md5 of the migration you send.
- Supabase MCP tools (load with ToolSearch): `execute_sql`, `apply_migration`. Never print or read a secret. Never run SQL that returns children's data (names, marks, bills): only catalog queries and counts.
- No push. No other table, function, trigger, bucket or setting is touched. Outside teaching hours (the attendance trigger is new; a teacher's register save goes through it).

## Step 0 - read

`docs/evidence/D4-build-1a.md` (what was built, the design questions, what is not verified), `docs/evidence/D4-release-fingerprint.sql` / `.expected.json`, `docs/evidence/D-release-fingerprint.sql` / `.expected.json`, `scripts/ROLLBACK-d4-1-floors.sql`.

Before the paste (repo, not live): after this branch is merged with the conductor branch, run `node scripts/pgtest/run.mjs` again. `d4-floors` pins who may write the five evidence tables from the real migration files; policies added on the conductor branch (`classmate_rows_private`, `creator_rows_need_class_staff`) may change that. A red policy pin is a question to answer before the paste, not noise.

## Step 1 - pre-checks (read-only)

1. The D release is as it was applied: run `docs/evidence/D-release-fingerprint.sql` and compare with `D-release-fingerprint.expected.json` exactly as `D-live-apply.md` step 6 did: **66 of 66** objects match (25 functions, 9 triggers, 4 relations, 28 relation parts). In particular `_session_change_assess` md5_prosrc `e0acbcc9a958a789aa437a6c8c4a84ec` and `_session_erased_recently` `32c7fac7d6336c6ac48ba15bfe891630` (the migration's preflight refuses anything else, but check first). Any difference: STOP.
2. No D4 object exists yet: `select to_regclass('public.session_evidence_floor'), to_regclass('public.invoice_state_floor')` -> both NULL; `select count(*) from pg_proc where proname in ('_session_evidence_keep','session_effective_level','invoice_floor_state','_caller_lane','_floor_mark_level')` -> 0; `select count(*) from pg_trigger where tgname in ('zz_attendance_evidence_guard','zz_point_evidence_keep','zz_transcript_evidence_keep','zz_homework_evidence_keep','zz0_session_evidence_keep','zz_invoice_state_floor','audit_point_transactions')` -> 0. If any exists, STOP (a partial or earlier paste).
3. Columns the file reads (its preflight checks them too; check now so a refusal is not a surprise): `students.family_id`, `audit_log.changed_fields`, `homework_submissions.graded_at`, `class_transcripts.audio_storage_path`, `point_transactions.created_by`, `invoices.tuition_frozen` - each exists (`information_schema.columns`).
4. Triggers already on the five evidence tables, `sessions` and `invoices`: `select c.relname, t.tgname, t.tgenabled from pg_trigger t join pg_class c on c.oid = t.tgrelid where not t.tgisinternal and c.relname in ('attendance','point_transactions','class_transcripts','homeworks','homework_submissions','sessions','invoices') order by 1,2`. Record. STOP if any BEFORE trigger on `invoices` sorts after `zz_invoice_state_floor` by name (design b.6.2(a): the floor must see the final row).
5. Counts (numbers only, for step 4): rows in `sessions`, `sessions` with status 'Canceled', `attendance`, `invoices`, `point_transactions`, `class_transcripts`, `homeworks`, `homework_submissions`, `audit_log`.
6. `select jobname, active from cron.job` (names and flags only): record.

## Step 2 - apply

Timing: the file begins with `SET LOCAL lock_timeout = '5s'` (review N-4): `CREATE TRIGGER` locks `attendance`, `sessions`, `invoices`, `point_transactions`, `homeworks`, `homework_submissions` and `class_transcripts`, and a paste that waited behind a busy register save or sync page would make every later write to that table queue behind it. With the timeout a busy table makes the paste fail within 5 seconds with `canceling statement due to lock timeout`, installing nothing (one transaction): wait a minute and apply again. Start it just after a `stars-sync` tick (not on the five-minute mark), outside teaching hours.

`apply_migration` name `d4_floors`, query = the exact LF content of `supabase/migrations/20261114090000_d4_floors.sql`. If it raises, STOP and report the message verbatim (its preflight installs nothing when it refuses; the database is as in step 1).

## Step 3 - fingerprint (the important one)

1. Run `docs/evidence/D4-release-fingerprint.sql` with `execute_sql`; compare with `docs/evidence/D4-release-fingerprint.expected.json` (whole JSON except `informational`), object by object, as `D-live-apply.md` did (md5 of each object's jsonb). Expected: **32 objects** - 18 functions (16 created, 2 replaced), 12 triggers, 2 relations (plus their parts). The values that must match exactly:

| kind | object | md5 (prosrc / triggerdef) | secdef | vol | EXECUTE anon/auth/service |
|---|---|---|---|---|---|
| function | _attendance_evidence_guard | 0348195c51404b1da3185e8626361946 | true | v | f/f/f |
| function | _caller_lane | 66001c3b6eb716a6380e4155fba75409 | false | s | f/f/f |
| function | _floor_causes_push | e2dc36c5617b4ae8d6a10d839c4d4139 | false | i | f/f/f |
| function | _floor_families_or | fa920fcd0ebd6f3dd4b2b281835e30e5 | false | i | f/f/f |
| function | _floor_mark_level | ed25e62b64c592f1ee6a026596eb11d0 | false | i | f/f/f |
| function | _floor_point_level | dad4fd7df357fb823b5fcfd9db0d5921 | false | i | f/f/f |
| function | _floor_table_guard | 79be4d195d4dbb559094061b90f7f5fd | false | v | f/f/f |
| function | _floor_transcript_level | 3c8c752f920eeab0611b6fe33cc66101 | false | s | f/f/f |
| function | _homework_evidence_keep | 2639cb97dfbad79959c8295ffef922fd | true | v | f/f/f |
| function | _invoice_state_floor | 3eb44221c7f4a9f81cef3451be5bf62f | true | v | f/f/f |
| function | _point_evidence_keep | 0003dc7cfe5783c02b3d7875deba5751 | true | v | f/f/f |
| function | _session_change_assess (REPLACED) | 6c1b8c86c47d3193d42f13adf56dcdc2 | true | s | f/f/f |
| function | _session_erased_recently (REPLACED) | 5f58916650251e14a89a45455746fd6f | true | s | f/f/f |
| function | _session_evidence_keep | e2f854c4b223039803fe2fccb39c842b | true | v | f/f/f |
| function | _session_evidence_keep_trg | 8c2cfa6ad9ef61853ffc8b07134dcc8b | true | v | f/f/f |
| function | _transcript_evidence_keep | 6874f3d1d42b899885b3589f1919bbcf | true | v | f/f/f |
| function | invoice_floor_state | 84301619d6d062bd3cd05e68d72b2fa5 | true | s | f/f/f |
| function | session_effective_level | b66e757e4a26fd7d0177c48e76b9e404 | true | s | f/f/f |
| trigger | attendance.zz_attendance_evidence_guard | c549c6cb9cc88724f8c713bead7711d8 | | | enabled O |
| trigger | class_transcripts.zz_transcript_evidence_keep | 93d9bd56bf5d06b094a1b0d1b5ef4ce2 | | | enabled O |
| trigger | homework_submissions.zz_homework_evidence_keep | 6d350cd10049b56fa962b37319dc437e | | | enabled O |
| trigger | homeworks.zz_homework_evidence_keep | 06cf1c8f068cb73b34546a80806ac9bf | | | enabled O |
| trigger | invoice_state_floor.invoice_state_floor_guard | fcebe4fe947f1bb4d23726f4f5835ebd | | | enabled O |
| trigger | invoice_state_floor.invoice_state_floor_no_truncate | a2840097fe5a129e4a62b56285ea3aa9 | | | enabled O |
| trigger | invoices.zz_invoice_state_floor | a7b36725c6d00981621d2642776f5e38 | | | enabled O |
| trigger | point_transactions.audit_point_transactions | 363bb3a1fdda8534cb5c569712c780ec | | | enabled O |
| trigger | point_transactions.zz_point_evidence_keep | 995e44005575c574c0ddf006f368660f | | | enabled O |
| trigger | session_evidence_floor.session_evidence_floor_guard | 4abb4fb178d587b038182404ca0e4ddc | | | enabled O |
| trigger | session_evidence_floor.session_evidence_floor_no_truncate | af78eb2a78387b3cdec0131779be49c6 | | | enabled O |
| trigger | sessions.zz0_session_evidence_keep | 0886607a6e0dc5e58ef6498e6771e540 | | | enabled O |
| relation | session_evidence_floor, invoice_state_floor | RLS on; authenticated SELECT only; anon none; service_role all 7; one admin-read policy each | | | |

   Trigger `md5_def` is md5(pg_get_triggerdef). If ONLY an `md5_def` differs while name, table, tgtype, function and enabled match, print that trigger's `pg_get_triggerdef` and compare it with the migration text by eye; report it (a server-version formatting difference), do not repair.
   If any `md5_prosrc` or privilege differs: do NOT repair by hand. Re-apply the migration once from a fresh, careful read (its preflight accepts its own bodies: idempotent), compare again; if it still differs, STOP and report.
2. Run `docs/evidence/D-release-fingerprint.sql` again. Expected: **64 of 66** identical to `D-release-fingerprint.expected.json`; exactly `_session_change_assess` and `_session_erased_recently` differ, and their live md5_prosrc are the D4 values above. Anything else differing: STOP (start the rollback below).

## Step 4 - read-only probes

- The seven trigger objects (step 1.2's list) exist, enabled `O`; the D2 triggers of step 1.4 are unchanged (same names, same enabled flags).
- `session_evidence_floor` and `invoice_state_floor`: 0 rows each (the file adds no fact; floors appear only when a later write lowers something).
- The counts of step 1.5 are the same numbers (no row rewritten). `audit_log` may only have grown by writes that happened meanwhile; say so if it did.
- Owner of both floor tables = owner of `_session_evidence_keep` (= owner of `session_cancel_overrides`, postgres).
- `has_function_privilege` for anon, authenticated and service_role on `_session_evidence_keep(uuid,jsonb,text,text)`, `session_effective_level(uuid,jsonb)`, `invoice_floor_state(uuid,text)`: all false.
- With the publishable key (do not print it): `GET /rest/v1/session_evidence_floor?select=session_id&limit=1` -> 401 / 42501 permission denied (not PGRST205 "not in the schema cache": `NOTIFY pgrst` reloaded it). `POST /rest/v1/rpc/session_change_preview` -> 401 / 42501 as in D-live-apply step 7.
- The morning after (numbers only): `select count(*), count(*) filter (where level = 'STRONG') from session_evidence_floor` and `select count(*) from invoice_state_floor`. Since review C-2 a floor is written only when a write really lowers what a lesson or bill shows (a deleted or downgraded mark, a removed point or transcript, an un-held or un-started lesson, a reset payment...): a handful a week is normal; tens on day one mean something ordinary is being recorded and should be looked at before it accumulates.
- Not runnable from here (need an admin session in the app; for the conductor or the owner on the day): open one lesson's "Cancel" dialog and check the preview shows as before (an untouched lesson: no "Recorded, and later removed" block).

## Step 5 - the first day

The symptom that means "roll back" (release note sentence): "If cancelling, moving or deleting a lesson fails with an error that mentions the floor or `guard_broken`, or a teacher's register or a bill save fails with an error that names one of the triggers above, paste the rollback. Nothing is lost by it; tell the conductor." Expected, NOT a reason to roll back: deleting a person's register mark on a lesson that has started now answers `attendance_requires_checked_path` (HC025: "A mark made by a person is changed, not removed"), and moving a mark to another lesson or child answers `attendance_identity` (HC024). No screen in the repo does either (`D4-build-1a.md`, G-10 writers).

## Rollback (if step 2-4 or the first day says so)

1. `execute_sql` (or the owner pastes): the exact LF content of `scripts/ROLLBACK-d4-1-floors.sql` - drops the seven floor / keep trigger objects and nothing else; tables, rows and functions stay. Its result set must print `d4_floor_triggers_left = 0`.
2. `apply_migration` name `session_cancel_guard_restore`: the exact LF content of `supabase/migrations/20261112091000_session_cancel_guard.sql`, unchanged. It is idempotent and puts back the two D2 bodies; it adds one more `guard_installed` event row (expected).
3. Run `docs/evidence/D-release-fingerprint.sql`: **66 of 66** again (proven in pglite by `scripts/pgtest/d4-rollback.test.mjs` and `guard-fingerprint.mjs --check-unchanged --after-rollback`).
What stays after both pastes, on purpose (listed in the rollback file's header and checked by `d4-rollback`): the two floor tables with their rows, RLS, admin-read policy and guard / no-truncate triggers (history; nothing reads them while D4 is rolled back; a re-paste of the migration reads them again); the 16 functions of the file (no API role can execute them; after step 2 nothing calls them except the tables' own guard; dropping them between the pastes would break the D4 `_session_change_assess`); and `audit_point_transactions` (an audit trigger that refuses nothing; drop it by hand only if point writes fail naming it - statement in the rollback file's header). The rollback script also sets a 5-second lock timeout.

## Report (under 250 words)

Each step's result; the two fingerprint verdicts with counts (32/32; 64/66 with exactly the two replaced functions different); the probes; the counts before and after; anything that differed; and one clear line: "LIVE AND VERIFIED" or "STOPPED AT STEP n: <why>" or "ROLLED BACK: <why>, D release 66/66".
