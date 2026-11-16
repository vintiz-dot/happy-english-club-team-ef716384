# Follow-ups: write-off reader removal, TA payroll fail-closed

Where I am / next step: piece 1 (write-off reader removed) built and its two suites green; next: piece 2, calculate-payroll's TA loop fails closed.

Branch `worktree-agent-aaf2a2487b506103a`, started from `claude/hec-conductor-setup-efbaa5` @ efcb3a64. Nothing deployed, pushed or applied; no database touched.

## 1. Settle Bill write-off reader removed

Precondition (conductor, before deploying): `scripts/CHECK-writeoff-reader-removal.sql` on live reads 0 and 0.
