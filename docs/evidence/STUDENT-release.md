# Student area design release - gate and assembly

Branch `release/student-1`, cut from `origin/main` 93ca410 (the tuition release, live). Source of the work: `claude/hec-conductor-setup-efbaa5` at 0f64f40 (not merged; files copied). Nothing pushed, nothing deployed, no database access.

**Where I am / next step:** part 1 written, release tree assembled, type-check green. Running the suites and the build (results in section 4). Next: bundle sizes against origin/main, leak check, hand back.

## RELEASE NOTE FOR THE OWNER

**What children and parents will see change.** Every screen a student uses now has the new calm look (ivory paper, dark-ink text, one brass accent): Home and its tabs (My Classes, Reports, Achievements), Homework (list, Done, Calendar, the homework sheet), Lessons and a lesson, Record, My Videos, My Work, Picture Reader, Journal, Resources, Defend My Level, Vocabulary, Tuition, the wallet and its history. The phone bottom bar and the top bar are the new quiet ones on all of them. The account button (top right) has a new menu with **System / Light / Dark**; it starts on Light, and each person's choice is remembered on that device. A parent who opens a child's screens (anything under "student", and **Tuition**) sees the same new look there.

Small things that come with it: the homework calendar keeps seven columns with finger-sized days; buttons and menu rows are at least 44 px tall; a long Vietnamese name wraps instead of being cut; the wallet history no longer cuts amounts on a phone; the bottom bar no longer sits on top of an open dialog; the Balance tile on Home is dark ink, not red (red now means overdue, and says so).

**What does not change.** Every number, every query, every action, every sentence a person reads. Tuition shows the same figures, taken from the same place as before (nothing is worked out in the browser that was not before). Admin and teacher screens, the parent dashboard, sign-in and the three display boards keep today's look. An admin on Tuition keeps today's admin list. Nothing about video homework approval, Picture Reader's ARASAAC credit line, or who can see what has been touched.

Two small things staff may notice, both deliberate: a dialog or menu now opens in place instead of jumping for a moment as it appears (a shared animation fix), and for a person whose device is set to "reduce motion" the staff screens animate less. Screen readers now hear names for the bell, the menu button and Sign out.

**Check on a real phone after it is live** (the test harness cannot show these):
1. Sign in as a student: Home, then each item of the bottom bar and the More menu. Nothing should look half old, half new.
2. Homework: open a homework with a marked result and teacher feedback; upload a file; **tap Download PDF, wait, then tap Open PDF** (the two-tap behaviour from 0f372a6 must still work on an iPhone).
3. Record: camera, countdown, record, review, send; then a video the teacher has approved (the report).
4. Picture Reader with a set open: the ARASAAC credit line is at the bottom.
5. Tuition as the student and as the parent, on a month with a payment and on one with a sibling discount: compare three figures with the admin screen.
6. The account menu: switch to Dark, look at Home and Tuition, switch back to Light.
7. As a parent: the parent dashboard still looks as it did; opening a child takes you into the new look.
8. As a teacher and as an admin: one screen each, to see that nothing changed (open one dialog).
9. The daily "Check-In Complete!" pop-up on Homework: it is still drawn by the old pop-up component (known leftover, below).

**How to roll back.** Revert the release commit(s) on main and push; Cloudflare deploys the previous build. There is **no database migration, no edge function and no configuration change** in this release (checked: `git diff --stat origin/main..release/student-1 -- supabase` is empty), so there is nothing to undo on the server. The only thing left behind on a device is three small localStorage entries holding the theme choice (`hec-theme:<user id>`, `hec-theme-active`, `hec-theme-boot`: the words system / light / dark and a true/false, no names); the old build ignores them.

## 1. Gate - verdict: PASS WITH CHANGES

The changes are what assembly needed (staff batches left out, recorder wiring removed) plus one line restored in `src/pages/Tuition.tsx` (finding 4).

### 1a. The true file list

`git diff --name-status origin/main..claude/hec-conductor-setup-efbaa5`: **1653 paths**. origin/main is an ancestor of the conductor branch (0 commits behind), so this diff is exactly "what is not live yet". Every path is classified (script: scratch `classify.mjs`, rules below); **0 unclassified**.

| Class | Paths | What |
|---|---|---|
| ship (design / student) | 125 | `index.html`, `tailwind.config.ts`, `src/index.css`, `src/lib/{ivoryScope,givenName,utils,homeworkStatus,tuitionStatus}`, `src/components/{Layout,MonthPicker,NotificationBell}.tsx`, `theme/**` (2), `ui/**` (14), `chat/AssistantLauncher`, `leaderboard/BoardFrame` (one attribute), `assignments/`, `cefr/`, `homework/`, `journal/`, `language-support/PictureStrip`, `quest/**` (5), `resources/ResourceCard`, `student/**` (52), `video-homework/**` (7), `vocabulary/**` (12), `pages/Student*.tsx` (12), `pages/Tuition.tsx`, `pages/Vocabulary.tsx` |
| ship, rebuilt here | 2 | `src/App.tsx` (origin/main + the `IvoryScope` import and wrapper only; the recorder import and route are not taken). `scripts/pgtest/run.mjs`: its only change on the conductor branch registers recorder / audit-eval suites, so it stays as origin/main |
| ship (docs, checks) | 13 | `docs/DESIGN_SYSTEM.md`, `docs/evidence/A4.6-rollout-plan.md`, `docs/evidence/A4.6/R01..R08.md`, `scripts/design-tokens-check.mjs`, `scripts/design-rollout-inventory.mjs`, `scripts/pgtest/ivory-scope.test.mjs` |
| staff batches, NOT inert, left out | 33 | R09 (12: `admin/tuition/**`, `AdminTuitionListEnhanced`, `StudentTuitionOverview`, `StudentTuitionReviewCard`, `TuitionReviewQueue`, `TuitionBulkDownload`, `GenerateTuition`, `CloseMonthDialog`, `BulkEnrollmentDateSetter`), R11 (13: `admin/class/**`, `PastAttendanceEditor`, `SessionGeneratorConfirm`, `ScheduleStatusCard`, `TeacherScheduleTransfer`, `schedule/**`, `lib/sessionStatus.ts`, `calendar/lib/calendarStatus.ts`), R12 (8: `FinanceSummary`, `RecurringExpendituresManager`, `payroll/PayrollMonthLock`, `teacher/TeacherProfilePayroll`, `staff/PayRateHistory`, `pages/TeacherPayroll`, `teacher/TeacherPayrollCalendar`, `teacher/TeacherBankingInfo`) |
| exclude | 104 | recorder (`src/lib/recorder/**` 23, `src/components/recorder/**` 8, `pages/TeacherRecorder.tsx`, `lib/recorderUi.ts`, `scripts/recorder/**`, `scripts/recorderUi.test.ts`, 5 pgtest suites), `components/CommandPalette.tsx` (its only change is the "Class recorder" entry), `scripts/lesson-eval/**` (41), everything under `supabase/` (config.toml, 3 migrations, `recorder-retention`, `audit-eval-proxy`, the edit to `transcribe-lesson-audio`), `docs/pc2/INBOX.md`, `.gitignore` (audio ignores for lesson-eval), `docs/MASTER_PLAN.md`, `docs/ENHANCEMENT_BASELINE.md`, `docs/LESSON_MONITOR_TEACHER_CHECK.md` |
| evidence left on the conductor branch | 1376 | screenshots and notes under `docs/evidence/**` (A0, A2.3, A3.1, A4, A4.6 PNGs, C3, D3, R09/R11/R12): kept off main to keep it light, as the D and tuition releases did |

**Staff batches do not ride along.** The task allowed it only if they render exactly as origin/main with `useIvory()` false. They do not: 19 of the 33 files have no `useIvory()` at all and use `hec-*` classes directly (e.g. `FinanceSummary`, `PayrollMonthLock`, `TeacherPayroll`, `ClassCalendarEnhanced`, `SessionDetailDrawer`, `PastAttendanceEditor`), and outside the scope those classes have no CSS variables behind them. The rollout plan says the same (section 1: "do not push a batch to main before its area's flip"). Leaving them out needed nothing else: no shipped file imports anything those 33 files add (`tsc` is clean without them).

Note on R08's "other areas are pixel-identical" proof: its baseline was the conductor branch (fccf777), which already contained R09/R11/R12, so it proves the flip changed nothing there, not that the tree equals origin/main. The comparison with origin/main is 1c below.

### 1b. Money and rules

1. **No new arithmetic, no data change.** Across the whole shipped `src` diff (21 968 lines) there is not one added or removed line touching `supabase`, `.from(`, `.rpc(`, `invoke(`, `useQuery`, `useMutation`, `queryKey`, `fetch(` or a table verb. In the ten tuition / wallet files every changed line that carries a figure wraps the SAME expression (`formatVND(tuitionData.baseAmount)`, `currentMonth.totalAmount.toLocaleString('vi-VN')`, ...) in a new class; `getPaymentStatus` is untouched and `getIvoryTuitionStatusBadge` prints the same six words as the old badge.
2. **`/tuition` figures.** R08's method: the harness's multiset of every number in `<main>` and open dialogs, 7 screens x 2 widths x 2 themes = 28 runs, compared with the pre-rollout commit c7c5f21 on the same fixtures. Sound for what it claims (displayed numbers); it cannot see real data, which is why the phone check above compares with the admin screen. My read of `Tuition.tsx`, `StudentTuitionTab`, `TuitionCard`, `PriorBalanceBreakdown`, `BillFreezePanel`, `StudentLedger`, `StudentWallet`, both modals and `lib/tuitionStatus.tsx` agrees.
3. **Teacher approval.** No video-homework query changed; families still read through `get_video_homework_for_student` (`VideoHomeworkSubmission.tsx:49`, `StudentRecord.tsx:56`); nothing reads `video_analyses` on a student screen.
4. **ARASAAC.** `StudentPictureReader` still prints `{ATTRIBUTION}` (class changed only); `TeacherLanguageSupport` is not in the diff.
5. **Boards.** `src/components/leaderboard/**`: one change, `data-hec-board=""` on `BoardFrame`'s root, which is what keeps a board on its old tokens under an ivory page. The three boards' own files are untouched.
6. **Stars Sync.** `src/components/admin/stars/**`, `src/lib/stars*`: not in the diff. The only new storage is the theme choice (no names).

### 1c. Scope safety (a route not in `IVORY_ROUTES` renders with the legacy classes)

How it works: `IvoryScope` (inside the router and `AuthProvider`) computes `isIvoryRoute(pathname, search, IVORY_ROUTES, ROLLOUT_COMPLETE, role)`, sets or removes `data-hec-theme="ivory"` on `<html>` in a layout effect, provides `useIvory()`, and forces the light theme off-scope. Every `[data-hec-theme]` rule in `index.css` is scoped to that attribute. `ROLLOUT_COMPLETE` is `false`.

Checks run on the release tree: `scripts/pgtest/ivory-scope.test.mjs` **45 passed, 0 failed**; `scripts/design-tokens-check.mjs` **PASS** (70 pairs x 2 themes).

**`ui/**` primitives (14 files), read line by line against origin/main:** every legacy class string is byte-identical and is the `: ` branch of an `ivory ?` ternary. **No primitive's legacy branch differs in markup or classes.** Three harmless code-shape differences: `AlertDialogCancel`, `PopoverContent` and `TooltipContent` wrap the old strings in an inner `cn(...)` (same result); `SelectContent`'s old string is split in two (same classes, same order); `Button` and `Badge` gain new variant names (`quiet`, `destructive-quiet`, `brass`, `success`, `warning`) whose legacy values are copies of existing old looks, used by no un-migrated screen.

**Every other shipped file reached from an un-migrated page** (import graph from `App.tsx`, scratch `reach.mjs`: 46 component / lib files are reachable from an admin, teacher, parent or public page): for each, every string literal removed relative to origin/main must still be in the file, and I read the diffs. Result: all 46 keep the old classes behind `useIvory()` (or an `ivory` prop that defaults to false); where a literal "disappeared" it was split into a shared part plus an old/new pair with the same classes (`PictureStrip`, `LearningJourneyCard`, `StudentAttendanceTab`, `HomeworkDetailDialog`, the analytics tabs, `video-homework/*`).

What DOES change on un-migrated screens (all deliberate, none a blocker):

| # | Change | Where | Visible? |
|---|---|---|---|
| 1 | `spring-in` / `spring-out` keyframes animate `scale` instead of `transform` (`tailwind.config.ts`) | every legacy dialog, popover, dropdown | yes, for 0.4 s: it opens centred instead of jumping. End state identical. A fix; documented in the plan s.2 |
| 2 | under "reduce motion" the spring animation is cut to 0.01 ms (`index.css`), and the staff layout sits in `MotionConfig reducedMotion="user"` | staff screens, only for people who asked the OS for less motion | only for them |
| 3 | `aria-label` / `aria-expanded` / `aria-current` on the bell, sidebar toggle, mobile menu, Sign out, `MonthPicker` trigger | shell, every area | no (names for screen readers) |
| 4 | `<html>` gets `class="light"` from next-themes off-scope | everywhere | no (no `.light` rule exists) |
| 5 | `tailwind-merge` learns the `hec-*` class groups (`lib/utils.ts`); `font-serif` / `font-display` families defined | global | no: neither class nor any `hec-*` class is used on an un-migrated screen (0 uses of `font-serif` / `font-display` on origin/main) |
| 6 | empty `class=""` where a legacy element had no class (`cn(ivory && ...)`) | a few cross-area elements | no |

Three edges, none a blocker:
- **A student who types `/schedule`** (no link leads there; "My Classes" goes to the dashboard tab) gets the old page with the new student bar, and that bar has no legacy branch any more, so it is unstyled there. R08 chose this; acceptable until the staff flip lists `/schedule`.
- **A cold load of `/tuition`** (reload, or opening the installed app on that page): `StartupGuard` waits for the session but not for the role, so for the moment the role query takes (one request) a student or parent sees the old header around the page, then the new look. This is the cost of rule 1d (never ivory while the role is unknown) and it is what keeps an admin from ever seeing a flash of the new look. Every other student route is listed for all roles and is ivory from the first paint.
- `IVORY_ROUTES` lists `/student`, which has no route: the Not Found page there is drawn with the ivory tokens. Harmless (A4.2, already approved).

### 1d. `/tuition` by role

`{ path: "/tuition", roles: ["student", "family"] }`; an entry with `roles` matches only when `role !== null` and is listed, so **it never matches while the role is loading** (tests: unknown role false, admin false, teacher false, student and family true; `/students/:id/tuition` false). `useAuth` resolves a person with several roles to admin first, then teacher. In `Tuition.tsx` the admin branch (`AdminTuitionList`, Smart Family Payment) is byte-identical to origin/main.

**Finding 4 (fixed on the release branch, commit d5fe40e):** the teacher's "Access denied" line had been re-classed to `text-hec-body text-hec-ink-soft` without a branch; a teacher is never in the scope, so the line lost its muted colour. Restored to origin/main's `text-muted-foreground`. One line; the only product edit made here besides the App.tsx rebuild.

### 1e. Homework PDF on phones

0f372a6 is an ancestor of origin/main. The release's `HomeworkPdfDownload.tsx` differs from origin/main only in the `useIvory` import, `const ivory = useIvory()`, and two `className` ternaries (the `chunky` and `pill` buttons) whose legacy branches are the old strings. `ready` / `readyRef`, `openReady`, `onPress = ready ? openReady : generate`, the toast "PDF ready ... tap Open PDF" and the labels are untouched. **Two-tap behaviour intact.**

### 1f. Known leftovers

| Leftover | Blocks a release to children? | Recommendation |
|---|---|---|
| Toast (`ui/toast.tsx`, the daily "Check-In Complete!"): old shape; close button has no name | No. Under the scope its token names are bridged to the ivory values, so it reads as part of the page; the unnamed close button is on main today | **Ship with.** Fix first in the next batch (name the close button; restyle) |
| Radio dots 16 px (`ui/radio-group.tsx`: Defend, Practice) | No. The label around each is the 44 px target | **Ship with** |
| Switch 44 x 24 (`ui/switch.tsx`: "Share with class") | No. Unchanged from today; 44 wide | **Ship with**; size it with the staff primitives |
| Calendar days 37 px at 320 px wide | No. Only on the narrowest phones (320 px); seven columns cannot be 44 px there; no overflow, the list view shows the same homework | **Ship with** |

## 2. Assembly

`release/student-1` = `origin/main` + the ship set above, taken with `git checkout claude/hec-conductor-setup-efbaa5 -- <path>` (138 paths), plus:
- `src/App.tsx` rebuilt: conductor version minus `const TeacherRecorder = lazy(...)` and the `/teacher/recorder` route. Diff against origin/main: 4 added lines (import, comment, `<IvoryScope>`, `</IvoryScope>`).
- `src/components/CommandPalette.tsx`: origin/main's (no "Class recorder" entry).
- `src/pages/Tuition.tsx`: finding 4.
- `scripts/pgtest/run.mjs`: origin/main's. `ivory-scope.test.mjs` is not registered in the runner on the conductor branch either; it is run on its own (`node scripts/pgtest/ivory-scope.test.mjs`). Worth registering later.

No shipped file imports recorder code: `grep -rn "ecorder" src` on the release tree finds only video homework (`VideoRecorder`, `@/lib/video/recorder`, both on origin/main).

## 3. Leak check

(filled in below after the suites)
