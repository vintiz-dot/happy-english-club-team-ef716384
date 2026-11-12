# D live apply log

Where I am / next step: step 2 (apply migration 1). Working detached at release/d1 = c43a82f.

## Step 0 - plan read
D-release.md, D-ship-fixes.md "Probes for the conductor", fingerprint .sql and expected .json read on release/d1.

## Step 1 - pre-checks: PASS
session_held_evidence fns = 0; session_cancel_overrides table = 0; zz_session% triggers on sessions = 0.
sessions total = 876; status 'Canceled' = 132.

## Step 2 - migration 1 applied
apply_migration `session_held_evidence` (20261112090000, LF blob md5 b5bf3eb1cd18cf99c7135f6f7a625b90) -> success, no error.

## Step 3 - fingerprint check 1: PASS (2 objects compared / 2 matched)
Ran the functions and triggers parts of D-release-fingerprint.sql verbatim (wrapped in a CTE that reports each function's fields and md5 of the function's whole jsonb object; expected per-object md5 computed locally from the expected JSON serialised as Postgres jsonb::text - scratchpad fpdigest.mjs). Only the two migration-1 functions exist, 0 of the 9 triggers: expected at this point.

| object | expected md5_prosrc | live md5_prosrc | secdef | vol | EXECUTE anon/auth/service | whole-object md5 exp = live | match |
|---|---|---|---|---|---|---|---|
| session_held_evidence | 71a58e2d403a6eb271172d27aef3b139 | 71a58e2d403a6eb271172d27aef3b139 | true=true | s=s | f/t/t = f/t/t | 84a1917db26a10392bb59f012345a249 | yes |
| session_recording_evidence | 8bb5ed8fff9c48f6f2ab068db95dba8f | 8bb5ed8fff9c48f6f2ab068db95dba8f | true=true | s=s | f/f/f = f/f/f | 0d10ca695676d362f7980fcd2e8fe624 | yes |

## Step 4 - functions deployed
Imports (recursive): manage-session -> _lib/rate-limit.ts, _lib/session-guard.ts; bulk-cancel-sessions -> _lib/session-guard.ts. Neither lib imports anything (no _lib/auth.ts needed). verify_jwt = true for both (supabase/config.toml), as before.
LF blob md5: manage-session/index.ts 42044d90e6f6ec755f81dd3fa569ceb3, bulk-cancel-sessions/index.ts 7c25bb2228b66f42eefd02e381431600, _lib/session-guard.ts 941b53d461e0b3a3148f0a6b81e630db, _lib/rate-limit.ts aad3d996bc38a83848e33bd1cb88415e.

| function | before | after | verify_jwt |
|---|---|---|---|
| manage-session | v3 | v4 (ezbr 3308cd3c...c515) | true |
| bulk-cancel-sessions | v3 | v4 (ezbr 8f105f57...863b) | true |

get_edge_function read-back:
- manage-session v4: index.ts, _lib/session-guard.ts, _lib/rate-limit.ts - each IDENTICAL to the repo blob (byte comparison by script of the saved response; 25516 / 20500 / 2448 chars).
- bulk-cancel-sessions v4: index.ts and _lib/session-guard.ts - identical by line-by-line reading (the response was returned inline, not saved to a file, so no byte script); no differing line seen.

Probes (publishable key from .env, not printed):
- POST /functions/v1/manage-session {"action":"preview"} with the publishable key as bearer -> 401 {"code":"unauthorized","message_key":"sessionGuard.error.unauthorized"} (new v4 code answering; key is not a user JWT).
- POST manage-session with no Authorization -> 401 UNAUTHORIZED_NO_AUTH_HEADER (gateway).
- POST bulk-cancel-sessions with no Authorization -> 401.
Next: step 5, straight away.
