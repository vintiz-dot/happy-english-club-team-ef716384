# Payments release (T4) - live deploy log

**Where I am / next step:** RESUMED (second agent). Migration applied by the conductor. Step A (start state) passed; next is step B, deploy 1 of 7 (calculate-tuition). See "RESUMED" below. (The first run, below, stopped at step 2: `apply_migration` refused by the permission system; nothing was changed by it.)

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

(End of the first run: stopped at step 2, nothing changed on live.)

# RESUMED - the functions (second agent, 12 Nov 2026 23:43 UTC onwards)

The conductor applied the migration `invoice_paid_label` and verified it. This run deploys the seven functions only: no SQL that writes, no migration, no push.

## Step A - start state (read-only, 23:43 UTC)

| check | expected | live |
|---|---|---|
| seven functions (`list_edge_functions`) | v4, ACTIVE, verify_jwt true | all seven v4, ACTIVE, verify_jwt true; `ezbr_sha256` 188aac7a (calculate-tuition), bc53fc1e (bulk), 620e841b (settle-bill), c751a4d2 (delete-payment), 8e5c925b (smart-family-payment), 14e966c8 (family-payment), d6a55f8b (confirm-tuition) - the same seven as step 1, nobody deployed since |
| `ai_action_apply` md5(prosrc) | b7981cd00c7136d5b7c6b9a829fe309b | the same (patched) |
| `ai_action_undo` md5(prosrc) | 944c9035dbb2b70afd142c465c9f7530 | the same (patched) |
| `invoice_paid_label(bigint x4)` | exists | exists |
| bills / sum recorded_payment / sum total_amount | 708 / 864,719,903 / 884,051,800 | 708 / 864,719,903 / 884,051,800 |
| status | - | draft 10, issued 557, paid 115, partial 26 (credit 0) |
| confirmation_status | - | auto_approved 497, confirmed 156, needs_review 55 |
| ledger keys `settlement-writeoff%` | 0 | 0 |
| recorded_payment NULL / negative | 0 / 0 | 0 / 0 |

Also: sum base_amount 950,702,000, discount_amount 67,174,200, paid_amount 5,178,349,523; newest `invoices.updated_at` 20:41:23 UTC on 12 Nov (as in step 1: no bill written since); payments 14.

Rollback copies: `C:\Users\Dell\hec-tools\payments-rollback\<function>\v4\` holds all seven (26 files: each entrypoint plus the `_lib` files v4 imports), none empty. The compare script was tried on one before trusting it: `get_edge_function` settle-bill (v4) against its saved copy - 2 of 2 identical, byte for byte.

Release files: the 14 files (7 entrypoints + rate-limit, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status, recorded-payment-write) exported from a9cbbe53. `git archive` wrote them CRLF (autocrlf), so a script turned them back to LF and kept each file only when its git blob hash equals `git ls-tree a9cbbe53`: 14 of 14, 0 CR bytes. Relative imports read from each entrypoint equal the manifest's lists; none of the seven `_lib` files imports another file. `supabase/config.toml` at a9cbbe53 has `verify_jwt = true` for all seven.

Boot probe of the seven as they are (v4), 23:48 UTC, for comparison: no header 401 from the gateway for all; public key as bearer 401 `{"error":"Unauthorized"}` (calculate-tuition, bulk, settle-bill, confirm-tuition) and 400 `{"error":"Unauthorized"}` (delete-payment, smart-family-payment, family-payment).

## Step B / C - deploys

Uploaded as `<function>/index.ts` + `_lib/<file>.ts`, entrypoint `<function>/index.ts`, verify_jwt true. After each: `get_edge_function`, then `verify.mjs` reads the returned files out of this agent's transcript (tool results only, never my own input) and compares them with the LF blobs. Probe A: POST `{}` with no Authorization header. Probe B: the public client key as apikey + Bearer.

| # | function | version | files against a9cbbe53 | probe A | probe B |
|---|---|---|---|---|---|
| 1 | calculate-tuition | 4 -> 5, ACTIVE, verify_jwt true (ezbr 94f8e79d) | 7 of 7 identical, byte for byte (index, rate-limit, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status); file set exactly the manifest's | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (23:53:17 UTC) |
| 2 | calculate-tuition-bulk | 4 -> 5, ACTIVE, verify_jwt true (ezbr a36f32eb) | 6 of 6 identical, byte for byte (index, auth, sibling-state, tuition-session, enrollment-discounts, invoice-status); file set exactly the manifest's | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (23:56:42 UTC) |
| 3 | settle-bill | 4 -> 5, ACTIVE, verify_jwt true (ezbr dcf087e6) | 2 of 2 identical, byte for byte (index, invoice-status); file set exactly the manifest's | 401 gateway | 401 `{"error":"Unauthorized"}` from the function (23:58:52 UTC) |
| 4 | delete-payment | 4 -> 5, ACTIVE, verify_jwt true (ezbr bffba619) | 3 of 3 identical, byte for byte (index, invoice-status, recorded-payment-write); file set exactly the manifest's | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (00:02:22 UTC, 13 Nov) |
| 5 | smart-family-payment | 4 -> 5, ACTIVE, verify_jwt true (ezbr 1bae1e97) | 4 of 4 identical, byte for byte (index, rate-limit, invoice-status, recorded-payment-write) - trailing spaces kept; file set exactly the manifest's | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (00:05:04 UTC) |
| 6 | family-payment | 4 -> 5, ACTIVE, verify_jwt true (ezbr 64fa5447) | 4 of 4 identical, byte for byte (index, rate-limit, invoice-status, recorded-payment-write) - trailing spaces kept; file set exactly the manifest's | 401 gateway | 400 `{"error":"Unauthorized"}` from the function (00:08:30 UTC) |

**Where I am / next step:** 6 of 7 live at v5. Next: deploy 7 of 7 (confirm-tuition), which is still v4.
