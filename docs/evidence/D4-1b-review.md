# D4 step 1b review (money guard core and register)

Independent reviewer. Reviewing branch `worktree-agent-a8fa73ee4063a7b1b` at 0617d940 (detached; the builder's final tip a80d45b1 is reviewed in the last section). Read-only: no product code changed, nothing pushed, nothing applied. Live probes are catalog-only (project `aswgmbefikhsnhogtryv`, 2026-11-13 ~09:30 Hanoi).

**Where I am / next step:** live catalog read (section 9 values recorded); full `run.mjs` running; next: my own probes (register cost, attacks) and mutants.

## 9. Live catalog today (read-only)

| Check | Value |
|---|---|
| 1b objects | `money_change_overrides`/`_events`/review view: NULL; `money_change_checked`, `tuition_month_state`, `_money_ack`, `change_approval_needed`, `_change_request_claim`: 0 of 5; `zz_attendance_money_guard`: 0 |
| Triggers on `attendance` | `audit_attendance` (AFTER I/U/D), `guard_attendance_enrollment` (BEFORE I/U), `guard_cancelled_session_attendance` (BEFORE I/U, takes `sessions ... FOR UPDATE`), `update_attendance_updated_at` (BEFORE U), `zz_attendance_evidence_guard` (BEFORE U/D) - all `O`. The new trigger sorts last among BEFORE triggers. |
| What the file reads | all 16 functions present; `invoice_state_floor` present with `ever_paid, ever_signed, ever_frozen, max_recorded_payment`; the 8 columns present |
| Counts | attendance 6289, invoices 708, sessions 876; session_evidence_floor 0, invoice_state_floor 0 |
| cron | `rebuild-upcoming-sessions` active, `stars-sync` active |
| `schema_migrations` | NO `d4_floors` row: 1a was pasted outside `apply_migration` |
| **1a bodies on live carry CR (CRLF)** | raw `md5(prosrc)` of every 1a function differs from the expected JSON; with `\r` removed they match exactly: `_session_change_assess` raw 7bec7ce2... / LF 6c1b8c86...; `_session_erased_recently` raw 895058d5... / LF 5f589166...; `_caller_lane` ad886610 / 66001c3b; `_floor_mark_level` a9861a37 / ed25e62b; `invoice_floor_state` 7d043d7f / 84301619; `session_effective_level` 94bb24a5 / b66e757e; `_attendance_evidence_guard` 252fa52b / 0348195c; `_invoice_state_floor` d44463b5 / 3eb44221. D2 bodies (`session_change_guard`, `_session_change_apply`, `session_held_evidence`, `session_change_kind`) have no CR. |

Consequence for the brief: step 3.1 ("the 18 functions of 1a must still match exactly") and 3.2 (the two replaced D2 functions "at the 1a md5 6c1b8c86 / 5f589166") FAIL on a raw md5 today, before 1b is even applied, and the brief says STOP. The comparison must be `md5(replace(prosrc, E'\r', ''))`, or the expected values for 1a must be the live raw ones.

Deployed functions: `repair-attendance` v3 and `mark-attendance` v3 (verify_jwt true) are, CR aside, the text of origin/main (f5987804); `_lib/auth.ts`, `_lib/rate-limit.ts`, `_lib/attendance-effects.ts` are identical between origin/main and the branch. Origin/main has 4 commits not in the branch base, none touching these files. Deploying the branch versions undoes nobody's change.
