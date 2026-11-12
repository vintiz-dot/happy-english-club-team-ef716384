# D4 design review (adversarial critic)

Reviewed: `docs/evidence/D4-design.md` at c21c415. Review only: no code, no push, no deploy, no database access.

**Where I am / next step:** started; reading the design and the D0-D3 documents. Next: section 1 (bypasses).

## Working notes (kept so a death mid-run leaves something; superseded by the sections below)

Read so far: root AGENTS.md, supabase/AGENTS.md, MASTER_PLAN sections 1, 2, 6, 8 and the D rulings, D4-design.md in full, D0 in full, D1-evidence-model in full, D2-guard-design sections 0-8.1.

Candidate findings to verify in code before they are written up:
- N1. The money guard's tier is read from invoice label columns (`confirmation_status`, `recorded_payment`, `status`, `tuition_frozen`). Only unfreeze is guarded (G-16). The other three are writable raw by an admin (D0 O21: InvoiceStatusManager, RecordedPaymentManager) and D4 puts them out of scope in (g). Lower the label first, then the change is T1 instead of T3: the F-11 pattern, moved from evidence to bills. No "floor" for bill state.
- N2. G-11 + current-month confirmed bill = T2, and teachers are refused at T1+. If bills are confirmed early in the month, a teacher cannot mark a child Excused for the rest of that month.
- N3. Service-lane refusal on enrollments at T1+: create-family (D0 O13), manage-demo-student (O14), auto_end_enrollments_on_deactivation (O20, a trigger with no depth exemption) are not in section (d).
- N4. repair-attendance (D0 S22): admin-chosen status over a date range, service key, marked_by NULL -> billable rows in billed past months. Not guarded by G-11 (service lane) and not in (d).
- N5. D0 paths not named in (a): O21/O24 direct invoice and ledger writes, O25 family links, S21 teacher moving own Scheduled lesson.
