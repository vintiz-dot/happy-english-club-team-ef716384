VERDICT-SQL: INCOMPLETE
VERDICT-FUNCTIONS: INCOMPLETE
SHIP: INCOMPLETE

Where I am / next step: probe run 1 done (auth, create, tier lowering, F-1 variants, PK). Mutation runs (27 function mutants, 18 SQL mutants) in the background. Next: probe run 2 (tokens, move, bulk, deviation 1 with a calculate-tuition that really saves, refresh, guard missing), then old-UI call sites, then final write-up.

## Interim confirmed results (executed, probe run 1; full text in the final version)

- B1 authorisation SOUND: teacher, family, student, no-role -> 403 on all 11 manage-session actions and both bulk steps; no header / garbage token -> 401; in every case 0 writes, 0 RPCs, 0 invokes logged. Admin token in body fields / other headers with a teacher Authorization header -> 403. "Bearer a, Bearer b", lower-case bearer, "Bearer Bearer x" -> 401.
- create: born `Held` on a past date -> 200 on the service key, no reason, no override row (pre-existing behaviour, kept by the brief; payroll-relevant, D4). Born `Canceled` -> 200. Occupied slot -> 500 `unexpected` (not `slot_taken`); existing lesson untouched; insert only, no upsert.
- F-1 (review 2) CLOSED as "reviewed": re-parent -> T2, `review_required:true`, `attendance_reparented` x2, in the queue. Delete marks, excuse by hand, marked_by -> NULL: all `review_required:true`, in the queue. Held -> Scheduled via `update` or `change-status` (no reason) then cancel: `erased: session_status`, reviewed.
- PK change: admin, service role, superuser -> HC020 `kind=id_change`.
- STILL OPEN (known, deferred to D4 by ruling on review-2 F-3): points re-dated + transcript unlinked on a seeded, paid lesson: T3 -> T1, `review_required:false`, not in the queue (V7).
- NEW MINOR: `UPDATE attendance SET student_id = <other child>`: T3 -> T2, no `erased` entry, no correction reason; the paid children leave `affected`/`refresh_pairs` (still reviewed because STRONG) (V5).
