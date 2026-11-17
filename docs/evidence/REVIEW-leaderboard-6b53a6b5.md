# Independent review: leaderboard overhaul 6b53a6b5 (migration 20261117120000)

VERDICT: SHIP WITH CHANGES. No blocker found. The migration is installed on live as the file says, the three functions live equal the commit, privacy rules hold for every role I could try. Findings below are should-fix, none urgent.

## Findings

M-1 Classmate rows carry more than "name, avatar, points" for a family.
  supabase/migrations/20261117120000_leaderboard_engine.sql:339-356 (leaderboard_json, p_full=false rows).
  Each classmate row still has `level` (from all-time points across ALL classes, line 350), `category_ranks`, `per_lesson`, `tied`, `is_new` (joined after the period began). total/per_lesson gives the lesson count (so roughly the join date); level gives a band of the child's all-time points in other classes. The author documented the lesson-count leak ("left as is") and chose to keep level. AGENTS "Who may see" says classmates = name, avatar, points. Proved by reading code and suite (it asserts level present). Fix: drop level/is_new/category_ranks/per_lesson from non-self rows when p_full=false, or get the owner's explicit ruling and record it in AGENTS.

M-2 Economy cash-out approval is not idempotent. src/components/shared/EconomyActions.tsx:32-100.
  The ledger row (type adjustment, -points) is inserted FIRST, then economy_transactions is set approved, then cash_on_hand is updated. If the status update or the cash update fails, or two teachers / a double click approve the same pending request, the request is still pending and a retry inserts a second ledger row: points deducted twice. The old code clamped at 0 (Math.max); a ledger row can drive the month negative and the level down, contradicting "a level never goes down". Suspected (read, not run). Live exposure today is nil (1 economy class, 0 economy transactions per the audit). Fix: one RPC/transaction keyed on the economy_transactions id, or claim the row (UPDATE ... WHERE status='pending' RETURNING) before writing the ledger.

M-3 A teacher gets other classes' totals. migration 464-485 (student_points_summary) and 352-356 (leaderboard_json staff rows).
  `all_time` and `level` are the SUM over every class even when the caller only teaches one (per-class list and month are filtered, the sum is not). The audit's review item 8 says a teacher sees only their classes. can_see_student_points also admits a teacher for a child with ANY past enrolment in a class they still teach. Points only, no notes: low harm. Proved by reading; not run with a real teacher token.

M-4 Everyone is rank 1 when nobody has points. migration 249-251 (rank() over total).
  At the start of each month (and in a class with no awards) every child is "T1"; boards show a tie badge for all. AvatarPicker premium check (src/components/student/AvatarPicker.tsx:66-86) unlocks on rank<=3, so a class where nobody scored last month unlocks premium avatars for every child (classes of 3 or fewer always did). SQL behaviour proved by reading; visuals suspected (boards not rendered). Fix: rank only total>0 and require total>0 for the avatar rule.

N-1 reset-monthly-leaderboard still defaults the month with now.setMonth(now.getMonth()-1) (supabase/functions/reset-monthly-leaderboard/index.ts:27-30). On the 29th-31st this lands in the current month. The UI always sends targetMonth, so only a direct call is hit; archive no longer zeroes anything.

N-2 leaderboard_tv_feed / leaderboard_centre_compute (lines 263-303, 409-443) do not filter inactive students or classes, and p_top is applied in SQL before reception-feed drops children not on today's register: an inactive child in the top 10 leaves the TV list short with a rank gap. Live today: 0 current enrolments of inactive students or classes.

N-3 school_terms has default grants to anon/authenticated including TRUNCATE/REFERENCES/TRIGGER (live ACL; default privileges, same on other tables, not specific to this change). RLS blocks anon; TRUNCATE is not reachable through PostgREST. Defence in depth only. The pure helpers (points_category, points_level, leaderboard_period, hanoi_today) are executable by anon; harmless.

N-4 Pre-existing: policy "Teachers can manage points for their classes" is FOR ALL on student_points. The engine takes period boards from the ledger but all_time/level/summary from student_points, so a direct write there makes them disagree. Closing it (ledger-only writes) would finish "one calculation".

N-5 Pre-existing: class-leaderboard authorises teachers from `teachers` only (not teaching assistants, not secondary guardians); staff screens use leaderboard_board (is_teacher_of_class incl. TAs), so the fallback is rarely hit.

## Rules check (all held)
- Family reads own children only: student_points_summary/history/can_see_student_points use admin / can_view_student / is_family_student. Role-less authenticated caller got {} from the summary and 42501 from leaderboard_board (run live in a rolled-back transaction). anon has no EXECUTE on leaderboard_json/compute/board/summary (ACL checked live).
- Classmates: see M-1 (the one deviation). Streak length, attendance, lessons, joined_on appear only on self/staff rows (code + 85-case suite). Wall mode (p_wall) trims the same way.
- No class-wide SELECT added on tables with notes/comments. New policies only on school_terms (names and dates; SELECT true for authenticated, admin ALL). student_points' existing class-wide SELECT (points only) unchanged.
- Scoping: leaderboard_board = admin or is_teacher_of_class; leaderboard_centre and points_manual_changes = admin; leaderboard_json/compute/centre_compute/tv_feed/archive = service_role only. All SECURITY DEFINER functions have search_path=public (live pg_proc).
- reception-feed returns only names, photos, class, points, centre figures, approved content; nothing added. Stars names: nothing stored.
- school_terms has SELECT/INSERT/UPDATE/DELETE to authenticated and ALL to service_role, RLS on (live).
- Nothing touches tuition, payroll or invoices (economy "cash" is classroom currency).

## Live checks (read-only)
- 20261117120000 is not in supabase_migrations (pasted by hand, as the repo says), but every function/table in the file exists with the ACLs the file sets.
- class-leaderboard v6, reception-feed v4, reset-monthly-leaderboard v5 read with get_edge_function; source matches the commit's files (compared by reading, not byte diff).
- "Board totals match student_points": for the 8 active classes the current-month sum of leaderboard_compute equals student_points for the same members, 0 mismatches. student_points vs ledger: 0 disagreements over 548 rows. 450 points sit on student_points rows of children who left (on no board, as designed).
- archived_leaderboards, monthly_leaders and school_terms have 0 rows (reset not run; Term tab hidden until an admin adds a term).

## What I ran
- leaderboard.test.mjs 85/85, leaderboard-board.test.mjs 23/23, reception-display.test.mjs 39/39 (run directly with the migration paths as arguments).
- tsc -p tsconfig.app.json: clean.
- node scripts/pgtest/run.mjs: green except `invoice status` (27 fail, settle-bill removed) and `stars sync core`, the known main-harness lag. Nothing leaderboard-related failed.
- npm run test:bun in the export: 3 fails + 2 import errors (SettleBillModal.tsx and rich-text fixtures absent from a git archive; settle-bill removal). Not leaderboard.

## Could not check
- Real family / student / other-class-teacher tokens against live endpoints; relied on role-simulated SQL (role-less, anon), ACLs, and the 85-case suite.
- Screens in a browser (podium at 0 points, tie badge, rank pop-ups, premium avatars); read code only.
- Byte-for-byte diff of the deployed functions.
- reception-feed output end to end (needs the display token).
Cleanup: junction removed with rmdir, no reparse points left, export deleted. Nothing written to live or to any worktree.
