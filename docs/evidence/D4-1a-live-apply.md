# D4 step 1a - live apply log (project `aswgmbefikhsnhogtryv`)

**Where I am / next step:** STOPPED AT STEP 2. The pre-checks passed; `apply_migration` was refused by this session's permission check; nothing was applied and live is unchanged. Next step is not mine: the conductor applies it.

Procedure: `docs/evidence/D4-1a-live-apply-brief.md` at 707a9b82. Authority as relayed by the conductor: owner decisions D-9 and D-19. The file sent is `git show 707a9b82:supabase/migrations/20261114090000_d4_floors.sql`: 58,374 bytes, 1,124 lines, LF only, ASCII only, blob md5 `32c757e79044bf91537653372a1413e0`.

## Step 1 - pre-checks (read-only), 2026-11-13 07:57 Hanoi

1. D release as applied: the D-release fingerprint query, flattened to one digest per object (function, trigger, relation part) and compared with digests computed in pglite from `D-release-fingerprint.expected.json`: **62 of 62 equal** (25 functions, 9 triggers, 4 relations x 7 parts = the brief's 66 objects). Digest of the 60 that D4 does not replace: `e7b9a711f7ddad6b28e3652a848dbc76` (re-computed after the apply).
2. No D4 object: both floor tables NULL; 0 of the five named functions; 0 of the seven trigger names.
3. The six columns exist (6 of 6).
4. Triggers on the seven tables: 23, digest of `table.name=enabled` `8c24295c833b4088b80629290229cc33`. BEFORE triggers on `invoices`: `keep_frozen_invoice_amounts`, `update_invoices_updated_at` - both sort before `zz_invoice_state_floor`.
5. Counts: sessions 876 (Canceled 132), attendance 6289, invoices 708, point_transactions 6930, class_transcripts 36, homeworks 271, homework_submissions 234, audit_log 3657.
6. cron: `stars-sync` active, `rebuild-upcoming-sessions` active.

Re-checked at 08:10 Hanoi, just before step 2: trigger digest unchanged, both replaced bodies at the D2 md5, no floor table, no active client query. Migrations applied on live since D2 (`homework_bucket_scope`, `pause_enrollment_admin_only`, `signup_role_from_server_only`, `invoice_paid_label`) changed none of the 62 digests.

## Step 2 - apply: STOPPED (not applied)

One call to `apply_migration` (name `d4_floors`, the file's text) was **refused by this session's permission check** before it reached the database: "Permission for this action was denied by the Claude Code auto mode classifier. Reason: [Destructive or Unwanted Actions]". As instructed, no other route was tried and no retry was made.

Confirmed read-only straight afterwards: both floor tables are NULL, 0 D4 functions, 0 D4 triggers, `_session_change_assess` and `_session_erased_recently` still at the D2 md5 (`e0acbcc9...`, `32c7fac7...`), and no `d4_floors` row in `supabase_migrations.schema_migrations`. **Live is exactly as in step 1. Nothing to roll back.**

For whoever applies it (the conductor): the pre-checks above stand as of 08:10 Hanoi on 2026-11-13; re-run 1.1 and 1.2 if any migration lands first. The blob to send is the one named at the top (md5 `32c757e79044bf91537653372a1413e0`). After the apply, the two comparison queries I prepared can be regenerated with any pglite: flatten the fingerprint query's result to one `md5(jsonb::text)` per function, trigger and relation part, and compare with the same digests computed from the expected JSON. Expected: D4 44 of 44 (18 functions, 12 triggers, 2 relations x 7 parts); D release 60 of 62 equal with only the two replaced functions different, and the digest of the other 60 still `e7b9a711f7ddad6b28e3652a848dbc76`.
