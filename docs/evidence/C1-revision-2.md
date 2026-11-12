# C1 Revision 2 - class recorder fixes for critic 2 (N1-N6)

**Where I am / next step:** migration + suite done, recorder suite 365 passed / 0 failed (was 284). Next: full `run.mjs`, mutation run, architecture changelog, contracts.

Written and tested only. NOT applied to any database.

## Assertions renamed or changed because the rule changed (none dropped)

| Old name | Now | Why |
|---|---|---|
| a completed 30-second recording ... does NOT count as a held lesson | ... does NOT count as evidence that a recording ran | column renamed |
| 90 seconds of a 95-minute lesson: complete, but not evidence the lesson was held | ... not evidence that a recording ran | column renamed |
| and counts as evidence the lesson was held: verified 58 min >= half of 90 | and counts as evidence that a recording ran: verified live 58 min ... | renamed; chunks now registered minute by minute (live), as the rule now requires |
| a deletion request written by the recorder is stamped with the recorder ... | "a deletion request cannot be written into the row by the recorder" (permission denied) + "a deletion request made through the function is stamped with the recorder and the server's time" | N3: deletion columns are server-only |
| and it cannot be re-attributed afterwards | and it cannot be re-attributed afterwards, not even by an admin | same, now a privilege refusal |
| a Stop after the window is recorded at the window's end | a Stop long after the window is not clamped into it: the recording is abandoned, at the real moment | N2: the clamp was the hole |
