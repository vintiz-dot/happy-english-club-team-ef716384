# D live apply log

Where I am / next step: step 2 (apply migration 1). Working detached at release/d1 = c43a82f.

## Step 0 - plan read
D-release.md, D-ship-fixes.md "Probes for the conductor", fingerprint .sql and expected .json read on release/d1.

## Step 1 - pre-checks: PASS
session_held_evidence fns = 0; session_cancel_overrides table = 0; zz_session% triggers on sessions = 0.
sessions total = 876; status 'Canceled' = 132.
