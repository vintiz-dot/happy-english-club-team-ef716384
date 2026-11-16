# D4 step 1b - live apply, functions half (Step 4 and Step 5 of D4-1b-live-apply-brief.md)

Where I am / next step: pre-checks done; next step is deploying guarded-change-refresh.

Live project `aswgmbefikhsnhogtryv` (confirmed with get_project_url). Steps 1-3 (migration) were done earlier by the conductor; no migration is applied here. All times Hanoi (UTC+7).

## Pre-checks - 2026-11-16 09:01

Files sent come from HEAD b27bbf06; each is identical (LF md5) to the reviewed commit 90a059c9. LF md5 (CR removed):

| file | LF md5 | bytes |
|---|---|---|
| repair-attendance/index.ts | 0a5db73e2e0a1d8d3adfa15c8af493a8 | 5556 |
| mark-attendance/index.ts | 3963244db9fe8839a2c1acb525e83132 | 12020 |
| guarded-change-refresh/index.ts | b2b7b3a4b3e096e35432ef0bd0d18f88 | 3033 |
| _lib/auth.ts | 879142b6783effc17089a3688b4e5ca7 | 7351 |
| _lib/session-guard.ts | 9046deec2a7253a8287b3f64f1ee4659 | 22190 |
| _lib/money-guard.ts | 5fab2eca6ac0e3de6080ea4a042071f6 | 6570 |
| _lib/rate-limit.ts | aad3d996bc38a83848e33bd1cb88415e | 2448 |
| _lib/attendance-effects.ts | 597d06713b71eda1cbf48bc91e344c39 | 7645 |

Relative imports, re-derived recursively: repair-attendance -> _lib/auth, _lib/session-guard, _lib/money-guard (-> ./session-guard); mark-attendance -> _lib/rate-limit, _lib/attendance-effects, _lib/session-guard, _lib/money-guard; guarded-change-refresh -> _lib/auth, _lib/session-guard, _lib/money-guard. _lib/auth, _lib/attendance-effects import only esm.sh; session-guard and rate-limit import nothing. No other file. No deno.json / import map in the repo.

config.toml: verify_jwt = true for all three (guarded-change-refresh block at line 201).

Versions before (list_edge_functions): repair-attendance v3 (verify_jwt true), mark-attendance v3 (verify_jwt true), guarded-change-refresh absent.

Counts before (09:01): money_change_events guard_installed = 1 (no other kind); money_change_overrides = 0; attendance = 6289; invoices = 711; sessions = 876.

Note: 09:01 Hanoi on a Monday; the brief prefers outside teaching hours. Proceeding on the conductor's instruction.
