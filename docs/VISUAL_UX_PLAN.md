# Visual UX plan — what we build from the 20 Nov 2026 design report

Source: `HEC-Visual-UX-Design-Report-Restored.pdf` (design review of main at 250a2ec6).
This file is the improved, executable version of that report's plan.

## What changed from the report's plan

1. **Checked every finding against the code first.** All four priority-1 findings are real:
   - `StudentAssignments.tsx` and `StudentDashboard.tsx` both turn a `get_student_homeworks`
     error into `[]`, so a failed read shows "All done! 🎉" / "No homework yet".
   - Student Home filters "pending" by its own rule (`!submission || status === "pending"`) and
     slices to 5; Homework groups by `getHomeworkStatus` with a 30-day old-miss cutoff. The two
     screens can disagree on count and order.
   - Family: a failed lookup falls through to "No students are linked… contact the school".
   - Teacher: Agenda navigates to `/teacher/attendance?session=<id>`, but `TeacherAttendance`
     never reads the parameter. **The register does not open** — the report only suspected this.
2. **Compressed five human-paced phases (4+ weeks) into four parallel, independently
   reversible commits**, one per journey, on disjoint files. Each can be reverted alone.
3. **Deferred what needs people, not code:** baseline captures with seeded roles, five-person
   usability tests, bilingual copy review, real-device camera checks. Listed below as open.
4. **Deferred the admin/finance surfaces (report §08).** They touch money screens whose
   figures the owner and finance must review; the report itself puts them last. No calculation,
   migration or edge function changes anywhere in this pass.
5. **"Remember me" is removed, not wired.** The Supabase client always persists the session in
   localStorage; the checkbox did nothing. A truthful single policy beats a false promise.

## Work packages (built in parallel)

| # | Journey | Files | Done when |
|---|---------|-------|-----------|
| A | Student Home + Homework | new `src/lib/studentHomework.ts` (pure grouping + fetch that throws), `StudentAssignments.tsx`, `StudentDashboard.tsx`, new `scripts/pgtest/student-homework.test.mjs` | Both screens share one query + grouping; error shows "We couldn't load your homework" + Try again, never an all-clear; Home shows a "What do I need to do next?" card right under the hero (first late, else earliest upcoming; title, class, due, one "Open homework" button opening the exact item); older-misses-only and empty states as in report p.5; test covers the p.5 fixture (6 open, 31-day miss, equal deadlines, undated, just-submitted, failure). |
| B | Family | `FamilyDashboard.tsx` | Failed lookup shows Retry, never "not linked"; each child card leads with name + latest lesson; "Practice at home" only when the lesson's homework text exists; summary expands in place. |
| C | Teacher register | `TeacherAttendance.tsx`, `GlobalCalendar.tsx`, `TeacherDashboard.tsx` | `?session=` opens that session's attendance drawer (fetched through the caller's own client, so RLS decides; unknown/forbidden id → explained message, calendar still usable); Teacher home leads with a "Today's class" card (ongoing, else next eligible; cancelled → no action) with "Mark attendance". |
| D | Public sign-in | `Auth.tsx` | School-wide welcome ("Your school day starts here."), XP/ranks copy removed from entry; helper text follows the selected role; "Forgot password?" spelled out; demo behind a quiet "Explore the student demo" disclosure; Remember-me removed. |

Visual rules for all: existing Ivory tokens/classes only (`hec-*`, `nova/ivory.ts`), one primary
ink button per task block, ≥44 px targets, text beside every status colour, long Vietnamese
names wrap, honour reduced motion.

## Second round (all remaining phases), 21 Nov 2026

| # | Section | What was built |
|---|---------|----------------|
| E | §08 operations | Admin alerts: loading / failed / empty kept apart, failed counts say "unavailable" never 0; "Review N" rows for bills needing review, open audit items, unread reception feedback, pending enrolment requests, each linking with its filters. Tuition keeps `?month` / `?filter` / `?confirmation` in the URL (Back returns). Finance keeps `?sub=`. Credits labelled in words. Payroll shows month + Open/Closed above the rows. Close-month, record-payment and reverse-payment dialogs: focus on Cancel, verb labels, what/whom/period/amount, "Working…" while pending. No figure is read or computed differently. |
| F | §09-10 secondary + visual | Calendar opens on the linked session's week. Reward overlay: visible Close, focus returns. Homework list revalidates whenever the detail closes. Recorder: "Saved on this device … still uploading" vs "Uploaded", "Interrupted - NOT RECORDING". Kid video recorder: "Recording" label. Reduced motion was already global (index.css + MotionConfig). |
| G | Handoff | `preview/visual-ux/`: the real student, homework, family and teacher pages on a fake client with made-up data (`?screen=…&state=ok|error|empty&theme=light|dark`, launch entry `visual-ux-preview`). Never reads production. |
| — | Found by the harness | Student Home hero said "All homework done!" / 0 open quests when the read failed: now a dash and no homework message. On a phone the hero is one compact line so the next homework follows the greeting. Family lesson dates read "Fri 20 Nov". |

Suite note: 4 suites (invoice status, AI admin actions, stars sync core, student work gallery) fail identically on clean main at the time of this work; nothing here touches them.

## Checks before push
- `npx tsc --noEmit -p tsconfig.app.json`
- `node scripts/pgtest/run.mjs`
- `npm run build`
- Preview the student/family/teacher screens with a fake client (no real data).

## Still open (needs people or owner sign-off)
- Baseline ("before") captures from the old build; "after" can be taken any time with `preview/visual-ux`.
- Five-participant task tests per journey (report p.12).
- Bilingual (Vietnamese) copy for the new strings, reviewed by a teacher.
- Finance owner review of the §08 presentation (figures unchanged, wording and layout new).
- Recorder wording change: the recorder owner should glance at it on the classroom device.
- Verified office contact route for the family "not linked" state.
