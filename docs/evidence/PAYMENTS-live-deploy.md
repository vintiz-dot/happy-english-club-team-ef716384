# Payments release (T4) - live deploy log

**Where I am / next step:** STOPPED AT STEP 2 - the `apply_migration` call was refused by the session's permission system ("Production Deploy"), before it reached the database. Nothing was applied, nothing deployed, nothing to roll back. Step 1 passed in full. Next step is the owner's or conductor's: allow `apply_migration` for this session (or the owner pastes the migration in the SQL editor), then resume from step 2.

## Step 1 - pre-checks (read-only, 2026-11-12 21:54 UTC)

Release blobs: the 14 function files and the migration exported from a9cbbe53 with autocrlf off; 0 CR bytes; each git blob hash equals `git ls-tree a9cbbe53`. Relative imports read from each entrypoint equal the manifest's lists; `invoice-status.ts` and `recorded-payment-write.ts` import nothing. Against 93ca410: `confirm-tuition/index.ts`, `rate-limit`, `auth`, `sibling-state`, `tuition-session`, `enrollment-discounts` are byte-identical; the other six entrypoints and `invoice-status.ts` changed; `recorded-payment-write.ts` is new.

The seven functions (`list_edge_functions`): all v4, ACTIVE, verify_jwt true, and each carries the same `updated_at` and the same `ezbr_sha256` as the answer to my own deploy of 12 Nov (188aac7a, bc53fc1e, 620e841b, c751a4d2, 8e5c925b, 14e966c8, d6a55f8b). Nobody has deployed since. I did not download the seven again: the bundle hash is unchanged, and the files I fetched from live straight after that deploy (script-compared then, byte for byte equal to 93ca410) are copied to `C:\Users\Dell\hec-tools\payments-rollback\<function>\v4\`.

| check | expected | live |
|---|---|---|
| P1 `ai_action_apply` md5(prosrc) | 7179f282e4ce1d8cfb9541c6c8560635 | the same; 7,024 chars; patched 0; SECURITY DEFINER; owner postgres; `search_path=public`; ACL postgres, authenticated, service_role |
| P1 `ai_action_undo` md5(prosrc) | 77175a4cb698a06b8ebfe7f75c5f8dc0 | the same; 9,791 chars; patched 0; same definer, owner, config, ACL |
| `invoice_paid_label(bigint x4)` | not there yet | not there |
| P2 ledger keys `settlement-writeoff%` | 0 | 0 |
| CHECK-payment-paths 2b, counts_on_bill_after_t4 | 0 | 0 (discount 2 settlements, voluntary_contribution 2) |
| P3 bills / sum recorded_payment / sum total_amount | 708 / 864,719,903 / 884,051,800 | 708 / 864,719,903 / 884,051,800 |
| P4 status | draft 10, issued 557, paid 115, partial 26 | the same; credit 0 |
| confirmation_status | - | auto_approved 497, confirmed 156, needs_review 55 |
| P5 recorded_payment NULL / negative | 0 / 0 | 0 / 0 |
| P5 unique index on ledger_entries.tx_key | 1 | 1 |
| `ai_actions` rows / `payments` rows | - | 1 / 14 |

Also: sum base_amount 950,702,000, discount_amount 67,174,200, paid_amount 5,178,349,523 (all as on 12 Nov). The newest `invoices.updated_at` is now 20:41:23 UTC on 12 Nov, on one bill: one calculation has run through the v4 calculate-tuition since the tuition deploy and changed no figure and no label (invoice audit rows still 523).

Both definitions saved with `pg_get_functiondef`, written by script from the tool result (not re-typed): `C:\Users\Dell\hec-tools\payments-rollback\ai_action_apply.v1.sql` (7,232 bytes) and `ai_action_undo.v1.sql` (9,962 bytes). The md5 of the body inside each saved file equals the live md5(prosrc) above, so the copies are exact (CRLF as installed).

Migration list tail: 20261112101734 class_recordings_scope is the newest; the two unrelated security migrations are not there yet.

Source: `release/payments-1` at a9cbbe53. Live project `aswgmbefikhsnhogtryv`. Rollback copies under `C:\Users\Dell\hec-tools\payments-rollback\`.

## Step 2 - the migration: NOT APPLIED

`apply_migration` (name `invoice_paid_label`, the text of `supabase/migrations/20261113090000_invoice_paid_label.sql`) was refused by the permission system of this session with the reason "Production Deploy". The call never ran. I did not try another route (running the DDL through `execute_sql` would be going round the refusal, and the brief allows that tool for reads only).

Read back at 21:56:44 UTC: `ai_action_apply` 7179f282e4ce1d8cfb9541c6c8560635 and `ai_action_undo` 77175a4cb698a06b8ebfe7f75c5f8dc0 (the BEFORE values, patched 0), `invoice_paid_label` does not exist, no migration of that name is recorded. Live is exactly as step 1 found it.

## Step 3 and 4

Not started: the manifest puts the migration first, so no function was deployed. The seven are still v4.

To resume: allow `mcp__...__apply_migration` for this session, or have the owner paste the migration into the SQL editor (expect the two "now uses the rule" notices); then step 2 verification (AFTER md5s b7981cd00c7136d5b7c6b9a829fe309b / 944c9035dbb2b70afd142c465c9f7530) and step 3. The exported blobs, the compare and probe scripts and the rollback copies are in place.

**Where I am / next step:** STOPPED AT STEP 2 (permission refused for apply_migration). Nothing changed on live.
