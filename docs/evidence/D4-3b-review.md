# D4 step 3B (money inputs) - independent review

Where I am / next step: probes P1-P7 and O1-O5 run (two holes found, see below); full suite running; next: functions, screens, ai_action / stars interplay, rollback, mutants.

## Findings so far (draft)

- B-1 (blocker): `enrollments.created_at` is not a guarded column but decides which of two overlapping enrolments prices a lesson (`_lib/enrollment-discounts.ts:15`). Admin raw UPDATE allowed; oracle O1: 6 past bills moved, 2 signed off. Fix: refuse a change of `created_at` (HC121, like the child / class).
- B-2 (blocker): a frozen bill can be DELETED or re-keyed (`month` / `student_id`) by an admin without the unfreeze path; calculate-tuition then re-creates it unfrozen at the new price (oracle O3 / O4: 380000 -> 220000, frozen -> not).
- M-1 (major): `link-student-user/index.ts:365` (service key, not in b.5's list) links a lone child into a new family; now HC120 when the child has billed past months, and the function ignores the error (family created, child not linked, success).
