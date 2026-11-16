# D4 step 4 build: change approvals (built switched OFF)

Branch `claude/d4-step4-approvals`, from `claude/hec-conductor-setup-efbaa5` at efcb3a64.

**Where I am / next step:** design read; writing `20261114095000_d4_change_approvals.sql`. Next: try it in pglite, then the suite.

## Decisions taken while building (for the reviewer)

1. `change_approval_needed(p_impact, p_actor)` is the only rule. 1b passes it the plan's `impact`, which for
   step 2 and some 3B entities carries no `tier`; the `tier3` reason needs it. File 6 therefore replaces
   1b's `_money_change_full_plan` with the same body except that the impact handed to the hook gains
   `tier` (the plan's own, clamped). Token and fingerprint are unchanged. Pinned (1b's md5 or file 6's).
2. Families / paid lines fire only when the change itself is T2+ (touches a paid, signed or frozen bill);
   T0 / T1 never wait on those two lines. The 24-hour window adds the same person's applied T2+ changes
   from both override tables, excluding changes applied under an approval (identified by the approval
   event's txid, never by caller-supplied context). Items earlier in the same batch are in the window.
3. Who is named: the change runs as the approver (as the design says for D2), so `actor_user_id` of the
   override row is the approver in BOTH tables; the requester is in the request, its events and in the
   override's `attached.requested_by` / `attached.approval_request_id`. Design (e) said money rows store the
   requester; that would need 1b's apply replaced, so not done.
4. Rollback 6 drops the three triggers only. Approvals then read as off: `_change_approval_on()` is false
   when `session_cancel_overrides.zz_session_override_approval` is gone. Present but disabled while
   enabled = HC050.
5. A missing settings row is HC050 `guard_broken` with the repair INSERT (A-15), even while off.
