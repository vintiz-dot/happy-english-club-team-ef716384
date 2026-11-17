# Leaderboard audit (17 Nov 2026)

Base: `origin/main` at `c3e3f2a2` (R24 design rollout). Live figures were read
READ-ONLY with `execute_sql` on 17 Nov 2026 around 11:00 Hanoi: counts and sums
only, no names.

## 1. How points are made and stored

One ledger, one total, kept in step by a trigger:

| Piece | What it does |
|---|---|
| `point_transactions` | The ledger: one row per award (student, class, type, points, date, notes, author). |
| `trigger_update_points_from_transaction` -> `recompute_student_points(student, class, month)` | After every insert/update/delete, re-sums the ledger for that student, class and month into `student_points`. |
| `student_points` | One row per student, class and month. `total_points` is a GENERATED column = homework + participation + reading_theory + vocabulary_quiz. |
| `award_homework_points` | The one path for homework grades (teacher grading, Stars Sync, video homework approval). Replaces rather than pays twice; dated by the homework's due date. |
| `_lib/attendance-effects.ts` | Streak rule (owner's ruling 16 Nov): +50 every 5 lessons in a row attended in one class. Written as a `participation` row with notes `Attendance streak bonus...`. `student_attendance_streaks.consecutive_days` is now re-read from the register on every mark, so it is the real streak. |
| `awardPoints` (`src/lib/pointsHelper.ts`) | What teacher screens call for skills, behaviour, corrections, reading scores. |

How the ledger's types land in the four buckets (`recompute_student_points`):

| Ledger type | Bucket on the board | Includes |
|---|---|---|
| `homework` | Homework | graded homework, Stars Sync homework, **video homework** |
| `participation`, `adjustment`, `correction`, `early_submission` | Participation | in-class skills and behaviour, **attendance streak bonuses**, manual awards and deductions |
| `reading_theory` | Reading | the reading score typed into "Reading theory scores" |
| `vocabulary_quiz` | Vocabulary | vocabulary practice, OCR scans |

There is no separate attendance, video, speaking or streak category: they are
inside Homework and Participation.

### Live check of the store itself - CLEAN

- 546 `student_points` rows, 542 ledger groups (student x class x month).
- Every bucket of every row equals the ledger sum. Points difference: **0**.
- The 4 extra `student_points` rows are all zero. No ledger row lacks a class;
  every ledger row's `month` matches its date.

So the numbers in the database are right. The problems are in what the screens
do with them.

## 2. Where each screen gets its numbers

| Screen | Who | Data path | Ranking |
|---|---|---|---|
| Class board (`ClassLeaderboardShared`): Teacher class page, Admin class page, Teacher Leaderboards, Teacher dashboard, Admin student profile, classroom-tools Leaderboard | staff | browser reads `enrollments` (ends today or later) + `student_points` | browser, ties share a rank (1, 1, 3) |
| Student board (`StudentClassLeaderboard`): Student dashboard, student overview tab | child / family | `class-leaderboard` edge function | server, ties broken by name (1, 2, 3) |
| Display boards (Star Board, High Scores, Night League, `useBoardData.ts`) | everyone, inside the two above | re-ranks the rows again in the browser; "climber" and "streak" read `point_transactions` | browser, ties share a rank |
| Projector / New window (`ProjectedBoard`, `ClassBoardWindow`) | staff | its own copy of the staff query | browser, ties broken by order (1, 2, 3) |
| Student dashboard XP / level | child | sum of all `student_points` rows, every class, every month | `calculateLevel` (11 fixed steps) |
| Family home "pts" | family | `student_points` with `.maybeSingle()` | - |
| Analytics pop-up | anyone who opens a child | header from the board row; history from `point_transactions` (own children only, by RLS) | `calculateLevel` on the month |
| Reception TV (`reception-feed`) | TV | `student_points` this month (service role) + `monthly_leaders` last month | server, ties by name |
| Premium avatars (`AvatarPicker`) | child | `archived_leaderboards` last month | - |

Four different pieces of code each decide who is on the board and in what order.

## 3. Mis-wirings found

Severity: **A** = a child or family sees a wrong number now. **B** = wrong in
some cases, or a feature that never works. **C** = cosmetic or latent.

| # | Sev | What is wrong | Evidence |
|---|---|---|---|
| M1 | **A** | **Family home shows "0 pts" for almost every child.** It asks for "the" `student_points` row with `.maybeSingle()`, but there is one row per class per month. With two or more rows the answer is empty, so it shows 0. | `src/pages/FamilyDashboard.tsx:58` and `:158` (`single()` gives null for >1 row). Live: **51 of 57** current children have more than one row, so 51 see 0. 354,535 points are not shown. The other 6 see one month only. |
| M2 | **A** | **The same child has a different rank on different screens.** On a tie the staff board and display boards give a shared rank (1, 1, 3). The student board (server) and the projector give 1, 2, 3, split by alphabetical name. | `class-leaderboard/index.ts` ranks by `index + 1`; `ProjectedBoard.tsx:86` the same; `ClassLeaderboardShared.tsx:226` and `useBoardData.ts:63` share ranks. |
| M3 | **A** | **Three different "levels" for one child.** The dashboard uses every point ever earned with 11 fixed steps (`levelUtils.ts`). The display boards use **this month's** points on a different curve (`levelOf` in `leaderboard/types.ts`). The analytics pop-up uses this month's points on the dashboard's curve. So a level drops back to 1 on the board every month, and three screens disagree. | `StudentDashboard.tsx:159,307`; `useBoardData.ts:84`; `StudentAnalyticsModal.tsx:119`. |
| M4 | **B** | **Teacher and child see different children on the board.** Staff screens list enrolments that end today or later. The student board lists only enrolments with no end date. A child whose enrolment has an end date in the future is on the teacher's board but not the class's. A child who left mid-month disappears from both, with their points. | `ClassLeaderboardShared.tsx:202` vs `class-leaderboard/index.ts:74`. Live today: 0 future end dates, so no one is affected right now. 4 children with points this month are on no board because they left. |
| M5 | **B** | **The display boards' period does not filter.** The header says the chosen month (e.g. "October 2026"). The champions come from that month, but "Biggest climber" is always the last 7 days and "Streak" the last 28, whatever month is picked. | `useBoardData.ts:111` (`since` = today - 27), `:150` (week before today). |
| M6 | **B** | **The board's "streak" is not the streak that pays.** It counts calendar days in a row on which a child earned anything. The rule that pays the +50 bonus is lessons in a row attended (`student_attendance_streaks.consecutive_days`). With 2 lessons a week the board's number is almost always 1 or 2, so the panel rarely shows, and when it does it means something else. The comment that `consecutive_days` "never resets" was true before 16 Nov and is not now. | `useBoardData.ts:15-21,166`; `_lib/attendance-effects.ts:22-32`. Live: 90 streak rows. |
| M7 | **B** | **"Reset monthly leaderboard" half-resets, and the reset undoes itself.** It sets homework and participation to 0 but leaves reading and vocabulary, and does not touch the ledger, so the next award to that child recalculates the month from the ledger and puts it all back. Each month is already separate, so the button is not needed. | `archive_and_reset_monthly_leaderboard` (live definition). Live: `archived_leaderboards` has **0 rows**, so it has never been used. |
| M8 | **B** | **"Last month's champions" on the TV never appears.** It reads `monthly_leaders`, which nothing writes. | `reception-feed/index.ts:88`. Live: `monthly_leaders` has **0 rows**; no writer in `src/`, `supabase/functions` or migrations. |
| M9 | **B** | **Premium avatars can never unlock.** They need last month's rank from `archived_leaderboards`, which is empty (see M7). | `AvatarPicker.tsx:63`. Live: 0 rows. |
| M10 | **B** | **Economy mode writes points around the ledger.** Approving a cash-out edits `student_points.participation_points` directly. The next award to that child recalculates from the ledger and gives the points back. Teachers' RLS allows direct writes to `student_points` too (`Teachers can manage points for their classes`, ALL). | `EconomyActions.tsx:83-111`. Live: 1 class in economy mode, **0** economy transactions, so it has not happened yet. |
| M11 | **B** | **The point-history button on the class board is dead.** `PointHistoryDialog` is mounted, but nothing ever sets the student it opens for. The only way to delete or inspect one award from the board is gone. | `ClassLeaderboardShared.tsx:65` (`setSelectedStudent` is only called with null), `:511`. |
| M12 | **B** | **Reading scores are on a different scale from every other point.** The reading screen books the change in a running score (e.g. 0 -> 9,905) as points. One entry is worth up to ~450 lessons of participation. | Live: `reading_theory` = **90.5%** of October points and **69.1%** of November so far, from 5 of 8 classes. Median reading entry 200; median participation 10; largest single reading entry 9,905. |
| M13 | **C** | **Rank-change pop-ups fire wrongly.** They compare positions in the list, not ranks, so ties produce false "moved" pop-ups, and switching month announces every child as moved. | `ClassLeaderboardShared.tsx:238-271`. |
| M14 | **C** | **The month list repeats or skips a month on the 29th-31st**, and early on the 1st (00:00-07:00 Hanoi) the board opens on last month. It steps back with `setMonth` on today's date and reads the month in UTC. | `ClassLeaderboardShared.tsx:65,398`; `StudentClassLeaderboard.tsx:67,143`; `ProjectedBoard.tsx:41`. |
| M15 | **C** | **The child's board does not update live.** Staff boards subscribe to changes; the student board does not, and every "refresh the board" call after an award targets the staff board's cache name. A child sees a new award only after up to a minute and a page change. | `StudentClassLeaderboard.tsx:86` key `student-class-leaderboard`; invalidations use `class-leaderboard`. |
| M16 | **C** | **Who gave a point is unknown for 750 manual-looking awards.** `created_by` is empty on 1,476 ledger rows; 750 are participation, correction, adjustment or reading rows that are not streak bonuses. There is no screen listing manual changes. | Live counts. |
| M17 | **C** | **The economy wallet shows the wrong total.** It shows every point from every class and month as the cash balance for one class. | `StudentDashboard.tsx:659`. Economy unused today (M10). |
| M18 | **C** | The display boards' ledger query asks for 4,000 rows, but the server sends at most 1,000, so a busy class would lose its oldest days. | `useBoardData.ts:127`. Live: busiest class had 412 rows in 28 days, so nothing is lost today. |

| M19 | **B** | **Homework points don't tally** (owner, 17 Nov). Four separate causes. (a) 62 graded homeworks paid no points: the grading screens take points separately from the grade and they were left blank (60 before the 23 Oct integrity fix, 2 since). (b) 121 homework payments have no graded submission behind them: teachers awarded "homework" points from the award dialogs with a homework attached, Nov 2025 - Jul 2026; they are real awards and stay. (c) 68 Pixel Pal homework payments (2,150 points, 27 Oct - 13 Nov) are tied to no homework; none duplicates a synced homework on the same day. (d) 2 payments (183 points) sit on a class the homework does not belong to, so they show on the wrong board. Also by design: homework counts in the month it was DUE, not marked. | Live counts, 17 Nov. |
| M20 | **C** | **A fourth level formula.** The classic board (`PodiumBoard`) worked out its own level from the month's points with the display boards' curve. | `PodiumBoard.tsx` `levelFromPoints`. |

Checked and **not** wrong:

- Points of one class never show on another: every board filters `student_points` by `class_id`. 0 ledger rows belong to a class the child was never enrolled in. 27 rows fall on a date outside the child's enrolment dates (before start or after end). They count in that class's month, which is right.
- Homework, Stars Sync and video homework all pay through `award_homework_points`. It is dated by the due date and never pays twice.
- Streak bonuses: 515 rows of exactly +50 each (25,750 points), including the 16-17 Nov repair.
- Privacy: families read `point_transactions` and `student_points` for their own children only (`can_view_student` / `is_family_student`); classmates appear only as name, avatar and points through `class-leaderboard` and `student_points` numbers; the analytics pop-up shows a classmate only the header the board already showed.
- The vocabulary bucket is now carried on every board (the old "pills don't add up" bug is fixed).

## 4. What is needed to fix it (summary)

The fix is one ranking on the server that every screen renders:

1. A database function (e.g. `class_board(class, period)`) returns rows,
   categories, ranks (ties share a rank), level, streak (from
   `student_attendance_streaks`) and climber, all from the ledger, for the
   period asked. `class-leaderboard` calls it for families; staff screens call
   it directly; the TV uses it too. The browser stops ranking.
2. One level rule, chosen by the owner (all-time or per month), used everywhere.
3. Family home: sum the child's rows (or read the same function).
4. Remove or rebuild the monthly reset; write last month's results so the TV
   champions and premium avatars work.
5. Economy: book cash-outs as ledger rows instead of editing totals.
6. Reading scores: the owner's decision (see questions).

Every new table gets GRANTs and RLS; migrations go under `supabase/migrations/`
for the owner to paste; a pgtest suite holds the ranking and the rules.

## 5. Owner's decisions (17 Nov 2026)

- Wrongly wired, seen by the owner: parents see 0 points; ranks don't match; levels don't match; homework points don't tally; the three special board styles are not wired right (panels say "not ready", wrong period, children can't be tapped).
- Reading score: stays in the total, but teachers add points instead of typing a new total.
- Level: every point ever earned (all classes), never resets.
- Build: week / month / term / all-time periods; category tabs; a family points history plus an admin list of manual changes; fairness for children who join part-way; the TV's last-month champions.
- Terms: an admin types each term's dates.
- Homework: fix every case and show before and after.

## 6. What was done (branch claude/leaderboard-system-f00e60)

| # | Fix | Test |
|---|---|---|
| M1 | Family home reads `student_points_summary` (all time, every class) | leaderboard.test "family home: all-time across every month and class" |
| M2 | One ranking, on the server, ties share a rank; every screen sorts by it. Podium seats by position so a tie does not put 1st on the right | leaderboard.test "ties share a rank", "same ranks as the staff board", projector; leaderboard-board.test "order and rank are the server's" |
| M3, M20 | One level rule, `points_level` (the dashboard's old steps, then +1 level per 1,000, no cap), on every screen | leaderboard.test level cases and "server level = the dashboard's old calculateLevel" |
| M4 | One membership rule in `leaderboard_compute`: anyone enrolled during the period; a period reaching today shows current children only | "members: current children only", "last month's board has Dung" |
| M5 | Climber = last 7 days of the chosen period; every panel follows the period | "last month's climber looks at last month's final week" |
| M6 | Streak panel = `student_attendance_streaks.consecutive_days` (the run that pays) | "the streak panel is the streak that pays" |
| M7 | The monthly "reset" only saves standings; zeroes nothing | "the reset zeroes nothing any more" |
| M8 | TV champions worked out from the ledger (`leaderboard_tv_feed`) | "TV champions: last month's winner" |
| M9 | Premium avatars read last month's real rank from `class-leaderboard` | via the board tests |
| M10 | Economy cash-outs are ledger rows (`adjustment`) | code review |
| M11 | Staff "Manage points" button in the analytics card opens the award list | preview |
| M12 | Reading stays in the total (owner); "Add points" mode | preview |
| M13 | Rank pop-ups compare ranks within one period | code review |
| M14 | Month and week lists by year/month arithmetic in Hanoi time | leaderboard-board.test "on the 31st every month appears once", Hanoi today |
| M15 | Every board subscribes to its class's points and refreshes | preview |
| M16 | Admin > Overview > Points and leaderboards > Points audit lists awards made and removed, with who | "awards made by a person are listed, with who", "a removed award is listed" |
| M17 | Wallet shows that class's points | code review |
| M18 | The display boards no longer read the ledger in the browser | n/a |
| M19 | (a) listed in the Points audit for a teacher to finish; (d) `scripts/REPAIR-homework-points-class.sql` moves the 2 rows; (b), (c) are real awards and stay; due-date month is the existing rule | "graded homework that paid no points is listed" |

New: periods (week / month / term / all time), terms set by an admin, six category tabs (homework, video, class points, streak, reading, vocabulary), "points per lesson" ranking for term and all-time boards with a 3-lesson minimum before a child can lead, a "New" tag, the child's place in the whole school on their own board, a family points history, a whole-centre board for admins.

Privacy: families reach classmates only through `class-leaderboard` (`leaderboard_json` is service-role only): name, avatar and points; lessons, attendance and streak length only for their own child. The projector uses the same trimmed view. The whole-centre list is admin-only (a teacher's scope is their classes); a family sees only their own child's place in it.

## 7. Independent review (17 Nov 2026)

A separate agent reviewed `origin/main...HEAD`: no blockers; all suites it ran passed. Its should-fix items, all done with tests where the database is involved:

1. A family could open boards from before their child joined: `class-leaderboard` now answers 403 `before_joined`.
2. The classroom-tools board (often on the projector) showed a child's attendance streak: it now uses the class-safe view (`wall`).
3. "Term" between terms errored: the picker opens the latest started term.
4. The history total was summed in the browser and capped silently: `student_points_history` returns `total`, `count`, `truncated`.
5. Two siblings in one class: each page picks its own child's row first (place in school, "you", premium avatars).
6. Reading "Add points": asks before adding an amount as large as the current score (likely a total typed by habit).
7. Economy: the points ledger row is written before the status and cash change.
8. `student_points_summary`: a teacher sees only their own classes in the per-class list.

Also done: classmates no longer receive each other's all-time points (only the level); an enrolment that has not started is not on today's board; impossible dates get a 400; a 404 is "no term" only when the function says so; an old server shows Month only on staff screens too; the repair is split into CHECK and REPAIR files.

Left as is (owner may decide later): on the projector and for families the "Hot streak" panel shows only the family's own child, or "No run going yet" on the projector, because a classmate's attendance run is not shared; a classmate's lesson count can be estimated from total / points per lesson.

## 8. Second review, of the release 6b53a6b5 (conductor, 17 Nov 2026)

Verdict "ship with changes", no blocker; the full review is `docs/evidence/REVIEW-leaderboard-6b53a6b5.md`. Done in migration `20261117130000_leaderboard_review_fixes.sql` plus the screens and functions, each with a test:

| Finding | Fix | Test |
|---|---|---|
| M-1 classmates carried level, per-lesson, new/tied flags, category ranks | A family (and the projector) gets a classmate as name, avatar, this board's `points` and `rank` (plus the category split on a points board). Tabs are ranked on the server (`p_category`). Boards hide a level they were not given. | leaderboard.test "a classmate is a name, an avatar, this board's points and rank", "on a per-lesson board a classmate has no total", "a category tab is ranked on the server" |
| M-2 class-cash approval not idempotent | `economy_process(tx, status)`: one transaction, claimed by id, refuses a handled request and a month going below zero; class-cash rows (`Class cash:`) never change a level (`level_points`) | "approving takes the points once", "a second approval is refused", "spending points on class cash does not lower the level", "a request bigger than the month's points is refused" |
| M-3 a teacher saw other classes' totals | Teacher's level / all-time over their own classes, in boards and the summary; a teacher sees a child's points only while the child is in their class | "for the class teacher only their own class counts", "a teacher's summary ... only over the teacher's classes", "a teacher of a class the child has left is refused" |
| M-4 everyone 1st at zero | No points, no rank; podium only for ranked children; "–" in the list; premium avatars need a ranked place with points | "nobody has points: nobody is ranked", "premium avatars: a child with no points is not top 3", leaderboard-board "nobody with points: nobody ranked" |
| N-1 reset default month on the 29th-31st | Hanoi year/month arithmetic | leaderboard-board "on 31 Oct it is September" |
| N-2 TV list short after an inactive child | Inactive children / classes are on no board that reaches today; TV filters before the limit | "an inactive child is not on this month's board", "the TV's top 2 are two children on the register" |
| N-3 school_terms default privileges | No TRUNCATE/REFERENCES/TRIGGER for app roles, nothing for anon; helpers not for anon | "school_terms privileges" |
| N-4 teachers could write student_points directly | Teachers keep SELECT only; the ledger trigger and the service role write it | "a teacher can no longer write student_points directly" |
| N-5 class-leaderboard missed teaching assistants | Staff = admin or `is_teacher_of_class`; second guardians' children count | leaderboard-board "class-leaderboard lets staff in by is_teacher_of_class" |

## 9. "Show all the students" (owner, 17 Nov 2026)

The three display styles show three on the podium and the rest two at a time. Every styled board now has an "Everyone" list of all its children and their points (the server's rows, rank and points; nobody ranked in the browser): under the board on class pages, and behind an "Everyone" button on the projector / class window. The classic board already listed everyone.

## 10. Every student on the reception TV (owner, 17 Nov 2026)

`reception-feed` now also sends `everyone` (every child on today's register, ranked children first, then children with no points with no rank) and each class's `everyone`; `leaderboard` (top ten) and each class's `top` (top five) keep their old meaning, so the TV app installed before this change keeps working until it is reinstalled. The new TV app adds "Every Student" pages (30 to a page, three columns, with class and points) after the top-ten podium, and lists every child on each class board, carrying a long class on to a second board ("Movers 2 (2/2)"). ES5 checked with acorn; the demo feed gained made-up children to preview it.

## 11. Re-check of 70cad9e0 (conductor): SHIP, two residuals, fixed

Review: `docs/evidence/REVIEW-leaderboard-recheck.md`. Migration `20261117140000_leaderboard_recheck_fixes.sql`:

- M-1 residual: on a per-lesson board (term, all time) every figure a family sees is per lesson, category tabs and category leaders included, and categories are ranked per lesson there; a classmate's six tabs now add up to their per-lesson figure, not a total. class-leaderboard's old-shape `total_points` is only ever a real total. Tests: "per-lesson board: a classmate's category tabs add up to their per-lesson figure", "category leaders on a per-lesson board are per lesson too", leaderboard-board "old-shape total_points is never a per-lesson figure".
- M-2 residual: `economy_process` takes `pg_advisory_xact_lock` per child, class and month before the month check, so two different requests approved at once take turns. Tests: "the second of two requests that together overdraw the month is refused", "approvals ... take turns (advisory lock)".
