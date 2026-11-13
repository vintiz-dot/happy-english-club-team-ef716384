# D4 step 1a - live apply log (project `aswgmbefikhsnhogtryv`)

**Where I am / next step:** step 1 (pre-checks) done and recorded below. Next: step 2, `apply_migration` name `d4_floors`.

Procedure: `docs/evidence/D4-1a-live-apply-brief.md` at 707a9b82. Authority as relayed by the conductor: owner decisions D-9 and D-19. The file sent is `git show 707a9b82:supabase/migrations/20261114090000_d4_floors.sql`: 58,374 bytes, 1,124 lines, LF only, ASCII only, blob md5 `32c757e79044bf91537653372a1413e0`.

## Step 1 - pre-checks (read-only), 2026-11-13 07:57 Hanoi

1. D release as applied: the D-release fingerprint query, flattened to one digest per object (function, trigger, relation part) and compared with digests computed in pglite from `D-release-fingerprint.expected.json`: **62 of 62 equal** (25 functions, 9 triggers, 4 relations x 7 parts = the brief's 66 objects). Digest of the 60 that D4 does not replace: `e7b9a711f7ddad6b28e3652a848dbc76` (re-computed after the apply).
2. No D4 object: both floor tables NULL; 0 of the five named functions; 0 of the seven trigger names.
3. The six columns exist (6 of 6).
4. Triggers on the seven tables: 23, digest of `table.name=enabled` `8c24295c833b4088b80629290229cc33`. BEFORE triggers on `invoices`: `keep_frozen_invoice_amounts`, `update_invoices_updated_at` - both sort before `zz_invoice_state_floor`.
5. Counts: sessions 876 (Canceled 132), attendance 6289, invoices 708, point_transactions 6930, class_transcripts 36, homeworks 271, homework_submissions 234, audit_log 3657.
6. cron: `stars-sync` active, `rebuild-upcoming-sessions` active.
