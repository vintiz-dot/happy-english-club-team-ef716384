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

## Step 5 - migration 2 applied
apply_migration `session_cancel_guard` (20261112091000, LF blob md5 7a8c9b3a61600a9c26153d900d4f5a27, 1180 lines) -> success, no error.

## Step 6 - fingerprint check 2: PASS (66 objects compared / 66 matched; 25 functions, 9 triggers, 4 relations + 28 relation parts)
Ran D-release-fingerprint.sql verbatim inside a CTE that returns md5(jsonb::text) per function, trigger, relation and relation part (columns, constraints, policies, privileges, RLS flags, kind), plus the informational block. Expected digests computed from the expected JSON serialised as Postgres jsonb::text (script fpdigest.mjs; validated in step 3, where it reproduced the live md5 of two objects). Whole-object md5 equality covers md5_prosrc, security definer, volatility, config, EXECUTE for anon/authenticated/service_role, trigger tgtype/function/enabled, columns incl. defaults, constraints md5_def, policies md5_qual/with_check, table privileges. Nothing version-dependent differed.

| kind | object | expected md5 (function: + md5_prosrc) | live | match |
|---|---|---|---|---|
| function | _session_change_apply | b4885bb36f57af885a1608dc425d2c13 (prosrc c4de046f974934d555ac7e827b185b7a) | b4885bb36f57af885a1608dc425d2c13 | yes |
| function | _session_change_assess | 7c32305d600b6c3620899c57ebf271d2 (prosrc e0acbcc9a958a789aa437a6c8c4a84ec) | 7c32305d600b6c3620899c57ebf271d2 | yes |
| function | _session_erased_recently | e90cd165a5549df0c44e3ac2bb5f8622 (prosrc 32c7fac7d6336c6ac48ba15bfe891630) | e90cd165a5549df0c44e3ac2bb5f8622 | yes |
| function | _session_require_admin | 1e1a07f98981047457afceb63bf24c79 (prosrc a2fbfe6ba15ca47d240940c2eb77cc50) | 1e1a07f98981047457afceb63bf24c79 | yes |
| function | _session_review_required | 10f2e49a40da2bc079b28c0d3bf5f783 (prosrc f49ecbf1247d9ed23402c42a6cffc2d3) | 10f2e49a40da2bc079b28c0d3bf5f783 | yes |
| function | cancel_session_checked | 08f1e44f30b4f86d624bb4a68475f03a (prosrc 79be46ef623216409422d99a17f64fce) | 08f1e44f30b4f86d624bb4a68475f03a | yes |
| function | cancel_sessions_checked_bulk | e430bb1ae01043b056b9ef396982d5b7 (prosrc 9ddc8f4fca50a4e4f312235d28c1fb9d) | e430bb1ae01043b056b9ef396982d5b7 | yes |
| function | log_session_automation_refused | 02204b9a8cdf42d480e796dc9a694858 (prosrc 5bcb42687066f39ba13094ce9c49c713) | 02204b9a8cdf42d480e796dc9a694858 | yes |
| function | move_session_checked | c27057217d79e52d3f6fb9e092a5b246 (prosrc 5b4713755bca4d5c56996b456b45a9f9) | c27057217d79e52d3f6fb9e092a5b246 | yes |
| function | record_session_override_event | c0c541f7791cad93be681325ba78b08d (prosrc f95f2671914138e8e0e82b64ee97be30) | c0c541f7791cad93be681325ba78b08d | yes |
| function | session_cancel_audit_append_only | ac39a2136bee7f79047668ec6589aadc (prosrc 863a2f0da9cf0a6235fb63ceae39b26a) | ac39a2136bee7f79047668ec6589aadc | yes |
| function | session_cancel_audit_insert_guard | 9f4c1393cb7db91397e004ee1047755d (prosrc a9975e21bda621f8aca242afbb8929d1) | 9f4c1393cb7db91397e004ee1047755d | yes |
| function | session_cancel_guard_status | e11fef39160263f6e2a54c6d2d50273e (prosrc 7d6d73ff2d565b2d28accb7970af694f) | e11fef39160263f6e2a54c6d2d50273e | yes |
| function | session_change_guard | 0cc94d15eb66c385170441f759f0c3e0 (prosrc e01907e6ad723b28a04a76874905e6a8) | 0cc94d15eb66c385170441f759f0c3e0 | yes |
| function | session_change_kind | 44083c714b45755576a1c490f097ae5b (prosrc 007d4347b5c16f247df665a644e30559) | 44083c714b45755576a1c490f097ae5b | yes |
| function | session_change_preview | 396ba2d326f379aecac38296fc20dac3 (prosrc 81f6e99dc907c3e8c16ef0e8709363b4) | 396ba2d326f379aecac38296fc20dac3 | yes |
| function | session_change_reason_ok | dd64063919aa9f46347d78b782d41ec7 (prosrc fe7fce7a133605f45d93559c8ebbc10d) | dd64063919aa9f46347d78b782d41ec7 | yes |
| function | session_change_tier | 9c97e6379277ec30ad8590327eecb3c0 (prosrc 77b7dbd4e271a2a4923b3a9c06591c7c) | 9c97e6379277ec30ad8590327eecb3c0 | yes |
| function | session_day_evidence | 7c7640624d095b61ccb832769e69e9f1 (prosrc 63b0d7a9be540e6393f0934c4e87e497) | 7c7640624d095b61ccb832769e69e9f1 | yes |
| function | session_has_started | 9882852904c47dcd19dc24a226207a2e (prosrc 5231c81f30607c28bc04afbdc99e92a3) | 9882852904c47dcd19dc24a226207a2e | yes |
| function | session_held_evidence | 84a1917db26a10392bb59f012345a249 (prosrc 71a58e2d403a6eb271172d27aef3b139) | 84a1917db26a10392bb59f012345a249 | yes |
| function | session_month_tuition_settled | f9702a530acf8e437d325836ab29a325 (prosrc 8cb885588972176a77b6a35f961a069b) | f9702a530acf8e437d325836ab29a325 | yes |
| function | session_recording_evidence | 0d10ca695676d362f7980fcd2e8fe624 (prosrc 8bb5ed8fff9c48f6f2ab068db95dba8f) | 0d10ca695676d362f7980fcd2e8fe624 | yes |
| function | session_refuse_truncate | 4dbd6afd0f9992bf870a081c6af50a31 (prosrc 3538c7a77929f141437aa2741421f2c6) | 4dbd6afd0f9992bf870a081c6af50a31 | yes |
| function | uncancel_session_checked | 1939890d1e0eda50ffa2fe88ca145d7b (prosrc 4bd1dcab7a2f2064651faa0b1f8181bf) | 1939890d1e0eda50ffa2fe88ca145d7b | yes |
| relation | session_cancel_override_events | 6c352612540bf606a96aa86b0609be56 | 6c352612540bf606a96aa86b0609be56 | yes |
| relation | session_cancel_overrides | 6796497a706c72882fad398e21aef01c | 6796497a706c72882fad398e21aef01c | yes |
| relation | session_cancel_review_queue | 1d3cf11758a61720b04f970250c80edd | 1d3cf11758a61720b04f970250c80edd | yes |
| relation | session_cancel_tuition_pending | 421099138e22d9f6ca1365b46a5b810f | 421099138e22d9f6ca1365b46a5b810f | yes |
| relation-part | session_cancel_override_events.columns | 054433fba96d6b276226a1af0be6e865 | 054433fba96d6b276226a1af0be6e865 | yes |
| relation-part | session_cancel_override_events.constraints | 7b419cca994f549ced38f969c931c185 | 7b419cca994f549ced38f969c931c185 | yes |
| relation-part | session_cancel_override_events.force_row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| relation-part | session_cancel_override_events.kind | 59e6c6fecfabc14c575c7bc8ba3371eb | 59e6c6fecfabc14c575c7bc8ba3371eb | yes |
| relation-part | session_cancel_override_events.policies | ed74bfea3519ba98e69ccdad44499d08 | ed74bfea3519ba98e69ccdad44499d08 | yes |
| relation-part | session_cancel_override_events.privileges | 4a162a6ad93cffbad28c36a05360ff98 | 4a162a6ad93cffbad28c36a05360ff98 | yes |
| relation-part | session_cancel_override_events.row_level_security | b326b5062b2f0e69046810717534cb09 | b326b5062b2f0e69046810717534cb09 | yes |
| relation-part | session_cancel_overrides.columns | b51775824ec304f97c46a66350c1a1e9 | b51775824ec304f97c46a66350c1a1e9 | yes |
| relation-part | session_cancel_overrides.constraints | 92cec419f584882c18e9fa787b9dfaf3 | 92cec419f584882c18e9fa787b9dfaf3 | yes |
| relation-part | session_cancel_overrides.force_row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| relation-part | session_cancel_overrides.kind | 59e6c6fecfabc14c575c7bc8ba3371eb | 59e6c6fecfabc14c575c7bc8ba3371eb | yes |
| relation-part | session_cancel_overrides.policies | 0459cca1751191112cc723e1a7ce6700 | 0459cca1751191112cc723e1a7ce6700 | yes |
| relation-part | session_cancel_overrides.privileges | 4a162a6ad93cffbad28c36a05360ff98 | 4a162a6ad93cffbad28c36a05360ff98 | yes |
| relation-part | session_cancel_overrides.row_level_security | b326b5062b2f0e69046810717534cb09 | b326b5062b2f0e69046810717534cb09 | yes |
| relation-part | session_cancel_review_queue.columns | da7e4d09eb6db353a060642774a16b65 | da7e4d09eb6db353a060642774a16b65 | yes |
| relation-part | session_cancel_review_queue.constraints | d751713988987e9331980363e24189ce | d751713988987e9331980363e24189ce | yes |
| relation-part | session_cancel_review_queue.force_row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| relation-part | session_cancel_review_queue.kind | 59b943d2fe6aede1820f470ac1e94e1a | 59b943d2fe6aede1820f470ac1e94e1a | yes |
| relation-part | session_cancel_review_queue.policies | d751713988987e9331980363e24189ce | d751713988987e9331980363e24189ce | yes |
| relation-part | session_cancel_review_queue.privileges | 361a59a23033d3a003658880e109b598 | 361a59a23033d3a003658880e109b598 | yes |
| relation-part | session_cancel_review_queue.row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| relation-part | session_cancel_tuition_pending.columns | 34daa2140e8738a46270f15d2518d449 | 34daa2140e8738a46270f15d2518d449 | yes |
| relation-part | session_cancel_tuition_pending.constraints | d751713988987e9331980363e24189ce | d751713988987e9331980363e24189ce | yes |
| relation-part | session_cancel_tuition_pending.force_row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| relation-part | session_cancel_tuition_pending.kind | 59b943d2fe6aede1820f470ac1e94e1a | 59b943d2fe6aede1820f470ac1e94e1a | yes |
| relation-part | session_cancel_tuition_pending.policies | d751713988987e9331980363e24189ce | d751713988987e9331980363e24189ce | yes |
| relation-part | session_cancel_tuition_pending.privileges | 361a59a23033d3a003658880e109b598 | 361a59a23033d3a003658880e109b598 | yes |
| relation-part | session_cancel_tuition_pending.row_level_security | 68934a3e9455fa72420237eb05902327 | 68934a3e9455fa72420237eb05902327 | yes |
| trigger | session_cancel_override_events.session_cancel_override_events_append_only | 4b16825bdd0c008c4b259c7a5ad720e2 | 4b16825bdd0c008c4b259c7a5ad720e2 | yes |
| trigger | session_cancel_override_events.session_cancel_override_events_insert_guard | b08e7b9bb2fa240e1608813d8857f146 | b08e7b9bb2fa240e1608813d8857f146 | yes |
| trigger | session_cancel_override_events.session_cancel_override_events_no_truncate | d16abb9db10cef2246070344db3d70d5 | d16abb9db10cef2246070344db3d70d5 | yes |
| trigger | session_cancel_overrides.session_cancel_overrides_append_only | 8d251f0400462fec9485e1214ce769d6 | 8d251f0400462fec9485e1214ce769d6 | yes |
| trigger | session_cancel_overrides.session_cancel_overrides_insert_guard | 2485f3a9e16d84f84de0f738dd52593c | 2485f3a9e16d84f84de0f738dd52593c | yes |
| trigger | session_cancel_overrides.session_cancel_overrides_no_truncate | bd456f16c956df420e372aba786b0d52 | bd456f16c956df420e372aba786b0d52 | yes |
| trigger | sessions.zz_session_change_guard_del | 209b9776fa871ff7978311cbd73322c6 | 209b9776fa871ff7978311cbd73322c6 | yes |
| trigger | sessions.zz_session_change_guard_upd | 916ee42e79046e66aff6b6f52ed4f127 | 916ee42e79046e66aff6b6f52ed4f127 | yes |
| trigger | sessions.zz_session_no_truncate | 60dfda3b19dc5f373a7dd107302f6ee4 | 60dfda3b19dc5f373a7dd107302f6ee4 | yes |
| informational | view defs md5 + view_options | review_queue 6bc572ee..., tuition_pending 3f9f0800..., security_invoker=true x2 | identical | yes |

## Step 7 - post-apply probes: PASS
- Triggers, all enabled `O`: sessions.zz_session_change_guard_upd / _del / zz_session_no_truncate; session_cancel_overrides _append_only / _insert_guard / _no_truncate; session_cancel_override_events _append_only / _insert_guard / _no_truncate (9/9).
- Owner of session_cancel_overrides = postgres = owner of _session_change_apply.
- has_function_privilege on cancel_session_checked: authenticated true, service_role false, anon false.
- session_cancel_override_events: guard_installed = 1 (no other kind); session_cancel_overrides: 0 rows.
- public.sessions: 876 total, 132 Canceled - same as step 1 (876 / 132).
- Publishable key: POST /rest/v1/rpc/session_change_preview -> HTTP 401, code 42501 "permission denied for function session_change_preview" (not PGRST202: the function is in the schema cache). POST /functions/v1/manage-session -> HTTP 401 unauthorized.
- cron.job (names and flags): rebuild-upcoming-sessions = active, stars-sync = active.
- Not run (need an admin session in the app, outside this brief): session_cancel_guard_status(), the F-1 bill re-read, EXPLAIN on audit_log.

Where I am / next step: all steps done. LIVE AND VERIFIED. Nothing pushed.
