# D4 step 1b - live apply log (project `aswgmbefikhsnhogtryv`)

Procedure: `docs/evidence/D4-1b-live-apply-brief.md` at 90a059c9, after the independent review's round 3 verdict APPLY (`docs/evidence/D4-1b-review.md`). Authority as relayed by the conductor: owner D-9, D-19, D-22. Window: outside 16:30-21:00 Hanoi.

**Where I am / next step:** step 1 passed; step 2 (apply).

## Step 1 - pre-checks (read-only), 2026-11-13 14:21 Hanoi

Files to send (LF, from 90a059c9; md5 of the LF text): migration `20261114091000_d4_core_register.sql` 69452d215216b3a5d88558efdd4c7352 (69,628 chars); `repair-attendance/index.ts` 0a5db73e2e0a1d8d3adfa15c8af493a8; `mark-attendance/index.ts` 3963244db9fe8839a2c1acb525e83132; `guarded-change-refresh/index.ts` b2b7b3a4b3e096e35432ef0bd0d18f88; `_lib/auth.ts` 879142b6783effc17089a3688b4e5ca7; `_lib/session-guard.ts` 9046deec2a7253a8287b3f64f1ee4659; `_lib/money-guard.ts` 5fab2eca6ac0e3de6080ea4a042071f6; `_lib/rate-limit.ts` aad3d996bc38a83848e33bd1cb88415e; `_lib/attendance-effects.ts` 597d06713b71eda1cbf48bc91e344c39.

Method for every fingerprint comparison: the fingerprint `.sql` wrapped to one md5 per object (function, trigger, relation, informational) of its jsonb text, compared server-side with the same digests computed in pglite from the expected JSON; the method self-checked in pglite (D4: 67/67 equal after 1a+1b; D release: 37 equal plus exactly the two replaced functions after 1a+1b).

1. 1a live: D4 fingerprint (CR-stripped) vs expected - 32 equal (the 18 functions, 12 triggers, 2 relations of 1a), 34 missing (all of 1b), `informational` different (the 1b views are absent) - identical to pglite at the 1a stage. `zz_attendance_evidence_guard` 1, enabled.
2. No 1b object: the 34 above missing; `change_approval_needed` / `_change_request_claim`: 0 (absent; the file creates its stubs).
3. What the file reads: all 13 functions present; `_caller_lane` LF md5 66001c3b6eb716a6380e4155fba75409, `_floor_mark_level` ed25e62b64c592f1ee6a026596eb11d0 (as the preflight requires); 10 of 10 columns.
4. Triggers on `attendance`: audit_attendance, guard_attendance_enrollment, guard_cancelled_session_attendance, update_attendance_updated_at, zz_attendance_evidence_guard - all O.
5. Counts: attendance 6289, invoices 708, sessions 876, point_transactions 6930.
6. authenticated / anon / service_role: CREATE on 0 schemas, no database CREATE. The six RPCs exist once each: ai_action_apply(uuid,text,jsonb), ai_action_undo(uuid), end_enrollment(uuid,uuid,date), modify_enrollment_transfer(uuid,uuid,uuid,date), pause_enrollment(uuid,uuid,date,date,text), stars_sync_resolve_conflict(uuid,text) - all public, plpgsql, SECURITY DEFINER.
7. cron: stars-sync active (last run 14:20:00), rebuild-upcoming-sessions active. No other active client query.

All as expected.
