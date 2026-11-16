# D4 build - step 3B (money inputs)

**Where I am / next step:** IN PROGRESS. Migration, rollback 5, the four functions and two suites done (d4 money inputs 253, d4 functions inputs 61, standalone). Next: src/lib/moneyInputs.ts and the screens, then d4-reach-oracle and the mutants.

Builder on PC2, branch `pc2/d4-3b` from origin/conductor/work 02b571e6. Nothing applied to any database, nothing deployed; tests run only against the in-process Postgres of `scripts/pgtest`.

## Progress log

- (start) evidence file created.
- migration 20261114094000, scripts/ROLLBACK-d4-5-money-inputs.sql, d4-inputs-prelude.mjs, d4-money-inputs.test.mjs (253 pass standalone).
- update-enrollment-rate, create-family (caller's JWT, checked path), manage-demo-student (demo_reset_needs_owner), admin-data-import (five tables out, session_rate_vnd stripped); d4-functions-inputs.test.mjs 61 pass; both suites registered in run.mjs.
