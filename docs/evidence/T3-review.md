VERDICT: INCOMPLETE

Where I am / next step: items 1-7, 9, 10 read and probed; findings below are confirmed. Waiting on the full `run.mjs` total, then the mutation run (`.probe/mutate.mjs`), tsc and bun; then the verdict.

## Confirmed so far (short form; the final file rewrites this)

- F1 MAJOR (inherited from the calculator, new exposure for `/tuition`): `calculate-tuition-bulk` reads history and attendance unpaged (`index.ts:39-58`, `143-150`, `199-204`). Probe `.probe/cap-probe.test.mjs` with the real handler under a 1,000-row cap: 10 of 60 students lose their 2,000,000 arrears (same 10 the old browser sum lost), and with 150 students x 8 marked lessons 25 students are charged 0. The evidence table's row-cap line compares the browser with the PER-STUDENT calculator, not with the bulk one the fix reads.
- F2 MAJOR (shipping): the file imports `@/hooks/useIvory`, which is not on origin/main (0f372a6). Shipping the three source files alone breaks the build.
- F3 MINOR: unresolved family discount unflagged in the bulk answer; new on `/tuition`.
- F4 MINOR: error state says "Reload the page"; the Finance tab has a Retry button.
- F5 MINOR: after Record Pay the "everyone" cache is refetched, not patched; a second payment for the same student inside the refetch window still starts from the old paid figure.
- Payable: `totalAmount + carryInDebt - carryInCredit` is identically `totalAmount - carryInBalance` (bulk `index.ts:348-352`), so Payable - Paid == carryOutDebt - carryOutCredit by construction. Cannot disagree with the server.
