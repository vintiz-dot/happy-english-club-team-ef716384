# Independent review of R24 (rollout complete)

Reviewed: branch `worktree-agent-ad33732825888c2da` at 63a183ab (base efcb3a64), review branch `review-r24`.

## Verdict: SHIP WITH CHANGES

One major finding (M-1) breaks the owner's rule and must be fixed before this ships. It is a one-token fix. Everything else is clean or minor.

## Findings

### M-1  Audit clips is NOT byte-identical: the destructive Button lost `glass-sm`  (PROVED)
`src/components/ui/button.tsx:18` (old `buttonVariants.destructive`). The builder removed `glass-sm` from the old string "so the button is red". Only the outside routes still read that string, and the one place that uses it there is `AuditClipsTab.tsx:604` ("Delete N expired clip(s)"). The owner said not to touch that page. That button now paints differently (red fill instead of glass-sm's own background).
- Probe: `C:\Users\Dell\hec-tools\r24-review\h2` (copy of the builder's harness; fake client with one subject and one expired clip added so the button renders). base (efcb3a64) vs final, `/admin?tab=audit-clips`, 375 and 1280, light and dark: `<main>` and whole-page hash differ in 4/4 runs; the diff is exactly ONE element of 149 (the button): base class `... premium-click hover:scale-[1.02] active:transition-transform active:duration-100 glass-sm bg-destructive/90 ...`, final the same without `glass-sm`. Nothing else differs.
- The builder's "8/8 byte-identical" did not render this button because its fake has no expired clip.
- Fix: put `glass-sm ` back in the old `destructive` string (the old string is read only by the outside routes and print copies; ivory routes use `ivoryButtonVariants`). Then re-run the probe: expect 4/4 identical. The `ConfirmDestructiveDialog` change is not reachable from the two outside pages (users: AnnouncementManager, StarsTools, FamilyDetail only; closure script `r24-review\closure.mjs`), so it can stay.
- The recorder IS identical: `/teacher/recorder` hash equal base vs final in 4/4 runs (375/1280 x light/dark), `data-hec-theme` absent.

### N-1  `/feedback` (public QR page) in dark mode gets dark form fields on its fixed white card  (PROVED by screenshot)
`src/pages/ReceptionFeedback.tsx` has no `useIvory` branch and uses hard-coded colours (white card, `text-slate-900`). Before R24 an unlisted route was forced light. Now it is in the system and the theme default is System, so a parent on a dark phone gets the shared Input/Textarea in their dark look inside the white card (`out2/fb2-x-feedback-375-dark.png` vs `-light.png`). Everything is legible (labels dark on white, inputs light text on dark), only inconsistent. Cheap fix: add `/feedback` to `OUTSIDE_ROUTES`, or give the page `className="light"`/forced light. Not signed out in the fake (it shows the student profile picker only for a family role; I used the student role).
- `/.lovable/oauth/consent` also takes the system now; I could not get a clean render (the fake has no OAuth API). Code reads sane (tokens only, no hard-coded colours); NOT verified visually.

### N-2  Leftovers of the fold (cosmetic code, no behaviour)
`className={undefined}` (AssignmentsList), `className=""` (BatchPaymentDialog `Input`/`SelectTrigger`), `cn("text-center py-8", "text-hec-ink-soft")`, `("success")`, `{(` / `)}` wrappers (StudentActionPopover) and `variant={...("secondary")}`. Harmless; tidy up when the recorder files are done.

## Checked and fine

- **No logic change hidden in step 3.** I diffed all 91 `src/` files, then filtered the diff to every changed line that is not a class string, comment, import or `ivory`/`iv()` use, and read what was left (735 lines) plus the large files in full (Layout, StudentActionPopover, AssignmentsList, AttendanceMarking, RecordPaymentDialog, OAuthConsent, NotFound, FamilyDetail-adjacent): what is gone is old-branch markup, `switch`es over status colours, `tone`/`SKILL_TONES`, unused props (`accent`, `color`, `delay`, `ivory`), the old student/family header, the old `getCardStatusClass` branch. Conditions, handlers (`onClick`, `onChange`, mutations), queries, `disabled`, and every amount/balance expression are unchanged. The one behaviour-adjacent items: `StudentActionPopover.attendanceChip` kept (new branch), `BulkEnrollmentDateSetter` button label is now the ivory label only ("Set start dates"/"Updating..." ternary collapsed), CloseMonthDialog/FinanceCell/Row helpers only restructured. No money figure, read or write path touched.
- **Outside routes reach only what the builder said.** Import closure of `AuditClipsTab`: of the changed files only `ui/button.tsx` and `hooks/useIvory.ts`. Closure of `TeacherRecorder`: `Layout.tsx`, `AssistantLauncher.tsx`, `ui/button.tsx`, `useIvory.ts`, `ivoryScope.ts`. `Layout` lost only the student/family old header (the teacher on the recorder takes the staff branch, unchanged, proven identical above); `AssistantLauncher` renders only in the student/family branch.
- **Every route in App.tsx** is in IVORY_ROUTES except `*`, `/.lovable/oauth/consent`, `/feedback` (see N-1).
- **Trial merges (git merge-tree --write-tree): all clean, no conflicts**: with browser-pricing fe709de3, pilot c5b82585, conductor dc2d1a34.
- **d4 money inputs suite alone** with the clock-back preload and the exact migration list/args from run.mjs: **308 passed, 0 failed** (including N-2). The builder's single failure was the Hanoi clock-edge flake (the run was before 08:00), not R24; R24 touches nothing under `supabase/`.
- The remaining serious axe finding (calendar chip contrast from `statusTreatment` in `src/lib/classColors.ts`) is pre-existing on the staff calendar in base (builder's base axe runs), not introduced.
- `StudentTuitionTab` deferral is right (browser-pricing edits it; its `useIvory` branch is untouched).

## What I ran
- `tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npm run test:bun`: 250 tests, 0 fail (18 files).
- `node scripts/pgtest/run.mjs` (clock-back preload): started, passed every suite up to "session guard functions" (incl. invoice status 317/0, tuition prior balance 267/0, session cancel guard 266/0), then I stopped it: the shared machine made the later suites take 10+ minutes each. NOT a full green run. Run directly instead: ivory-scope 113/0, mirrors 19/0, d4 money inputs 308/0. R24 changes nothing under supabase/ or any SQL.
- d4 money inputs alone: 308/0.
- Harness probes above under `C:\Users\Dell\hec-tools\r24-review\` (`h2`, `out`, `out2`, `closure.mjs`).


## Could not check
- The builder's money screens (123/124): I did not re-run the 124 money runs (machine heavily loaded by other sessions). The one differing run is `/students/s-0001` Discounts 375 light where the BASE crashed on the fake's `reading 'name'`. Static check: the Discounts files' diff has no data-read change, so the crash cannot come from R24; I did not reproduce the crash.
- Record Payment / Batch Pay / Settle Bill dialogs, the 375 table view and teacher-payroll scroll targets with the fake: the fake's fixtures lack the long-name family and a payable bill. Static diff of those files (RecordPaymentDialog, BatchPaymentDialog, BatchFamilyPaymentModal, payroll pages): class strings only; no scroll target (`id`, `htmlFor`, `scrollIntoView`) was changed or removed in the 102 files (ids that appear in the diff are the ExamReportEditor ones, which were `ivOnly("...")` and are now always set).
- OAuth consent and `/feedback` truly signed out (the fake needs a role); real phones.
