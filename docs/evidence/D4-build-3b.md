# D4 build - step 3B (money inputs)

**Where I am / next step:** IN PROGRESS. Migration + rollback 5 written; d4-money-inputs suite green standalone (253 assertions). Next: the four edge functions and d4-functions-inputs, then moneyInputs.ts and the screens, then the oracle and the mutants.

Builder on PC2, branch `pc2/d4-3b` from origin/conductor/work 02b571e6. Nothing applied to any database, nothing deployed; tests run only against the in-process Postgres of `scripts/pgtest`.

## Progress log

- (start) evidence file created.
- migration 20261114094000, scripts/ROLLBACK-d4-5-money-inputs.sql, d4-inputs-prelude.mjs, d4-money-inputs.test.mjs (253 pass standalone).
