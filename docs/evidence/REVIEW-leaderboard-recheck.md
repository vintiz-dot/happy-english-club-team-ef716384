# Re-check: leaderboard follow-up 70cad9e0 (migration 20261117130000), after review of 6b53a6b5

VERDICT: SHIP (one residual M-1 leak below, low severity, can be fixed in the next pass; nothing blocks).

Migration md5: the committed file is CRLF; with CR stripped it is 46a0f69efebcbdfb4123c76d8d1501df, the LF md5 you gave (CRLF-as-committed hashes differently).

## Status of each finding

M-1 PARTLY (fixed in the main, one derived leak left).
  Fixed: supabase/migrations/20261117130000_leaderboard_review_fixes.sql leaderboard_json now builds a row as student_id, name, avatar_url, rank, points only. total + the six category figures are added on a 'total'-basis board (week/month) - points. per_lesson, is_new, tied, category_ranks, level, all_time, lessons, attended, streak_now, joined_on, overall_rank, gain_week are only on staff rows (p_full) and the viewer's own rows. The projector (p_wall) passes p_full=false, so it gets the family shape. Verified by reading the SQL, by the 108-case suite, and by the live function definition. class-leaderboard v7 (live = repo file) passes p_full = isStaff, p_viewers = the viewer's own current children, p_category validated against the six names.
  Residual (suspected from the SQL, not run end to end): on a term / all-time board a classmate's `total` is withheld, but a category board returns that category's points as `points`, so asking for the six category tabs and adding them gives the classmate's total; total divided by the `per_lesson` figure on the plain board is the classmate's lesson count (and so roughly when they joined, to the lesson). The author kept total off the per_lesson board precisely to stop this, so the guard is bypassed by the category parameter. Fix: on a per_lesson board return no category `points` for classmates either (or rank a category board only, returning rank without points), or accept it and record it. Low harm (no attendance, no level, no other-class points), but it is the thing the owner asked to hide.
  Also cosmetic: class-leaderboard's legacy `leaderboard[]` field fills total_points with `r.total ?? r.points`, so on a per_lesson board a classmate's "total_points" is really points per lesson. Only older clients read it.

M-2 FIXED. economy_process (migration, plpgsql SECURITY DEFINER, search_path=public, granted to authenticated/service_role, not anon).
  - Idempotent / two approvers: SELECT ... FOR UPDATE on the request row, refuses unless status = 'pending' (P0001 "already handled"), then updates status, writes the ledger row and the cash in the same transaction, so a retry or a second teacher is refused and a failure rolls everything back. EconomyActions.tsx now only calls the rpc.
  - Caller check: admin or is_teacher_of_class(auth.uid(), tx.class_id); null uid refused.
  - No month below zero: for convert_to_cash it reads the child's student_points total for that class and month and refuses if month_total + points_impact < 0. Residual (N-level, read only): two DIFFERENT pending requests for the same child approved at the same instant each lock only their own row, so both can pass the check; lock the student row or re-check after the insert. Live exposure nil: economy_transactions has 0 rows, 0 pending, 0 'Class cash:' ledger rows.
  - Level never goes down: level_points = sum of student_points.total_points minus the ledger rows whose note starts 'Class cash:', so cash moves do not change a level. Used for the board level, summary and the leaderboard_json level. Manual negative corrections still lower it, as before.
  - Pre-existing and unchanged: a child can insert their own pending request with any points_impact/cash_impact (WithdrawModal), and the teacher's approval trusts it; cash is applied whatever the type. The approval card shows the amounts, so it is a teacher check, not a new hole.

M-3 FIXED. student_points_summary and level_points take a class list: admin/family/own child = every class (NULL), a teacher = only the classes they teach, so all_time, level, month and per-class list are all scoped. leaderboard_json gets p_teacher (set by leaderboard_board and class-leaderboard for a non-admin teacher) and works the level over the teacher's classes. can_see_student_points now needs a CURRENT enrolment (end_date null or in the future) in a class the teacher teaches. Live: functions present with search_path=public; execute for authenticated only (service_role for compute/json/level_points).

M-4 FIXED. leaderboard_compute and centre_compute give rank NULL when the score is 0 (overall and each category); ordering puts unranked last; the screens show "-"; the avatar rule gets a null rank. Suite covers it. (AvatarPicker still unlocks on rank <= 3, so a class of 3 or fewer is unchanged, as before.)

N-1 FIXED. reset-monthly-leaderboard v6 (live = repo): last month worked out by Hanoi year/month arithmetic.

N-2 FIXED. leaderboard_compute drops inactive children on a board that reaches today; centre_compute also drops inactive classes; leaderboard_tv_feed filters inactive students/classes BEFORE the limit and for champions. reception-feed itself unchanged.

N-3 FIXED. Live ACL on school_terms: no anon; authenticated has INSERT/SELECT/UPDATE/DELETE (+ MAINTAIN, a PG17 default, not reachable through the API); service_role full. points_category, points_level, leaderboard_period, hanoi_today no longer executable by anon/PUBLIC (live grantees: postgres, authenticated, service_role).

N-4 FIXED, nothing broke. Live student_points policies now: "Admins can manage all points" (ALL), "Teachers can view points for their classes" (SELECT), "Students can view class leaderboard" (SELECT, points only, unchanged), "Students can view their own points", family_read_children_student_points. Writers of student_points (live pg_proc scan for INSERT/UPDATE/DELETE on the table, plus grep of src and supabase/functions):
  - recompute_student_points(student, class, month): SECURITY DEFINER; called by trigger_update_points_from_transaction (update_student_points_from_transaction, SECURITY DEFINER) on point_transactions. This is how every award lands: award_homework_points, mark-attendance streak effects, stars-sync, approve_video_feedback, save-word / record-practice / OCR vocab, teacher award dialogs and the reading-score entry (all write the ledger, not the table), and economy_process now. Runs as definer, not as the teacher.
  - recalculate_student_points_on_delete: SECURITY DEFINER.
  - modify_enrollment_transfer, ai_action_undo (and ai_action_apply): SECURITY DEFINER.
  - reset-points edge function: service role key (admin gate), unaffected.
  - archive_and_reset_monthly_leaderboard: writes archived/monthly tables only.
  - Browser code: no .insert/.update/.delete on student_points anywhere in src (only selects: ReadingTheoryScoreEntry, FamilyDashboard, ClassAdminActions count, chat, class-leaderboard, reception-feed); the old EconomyActions direct update is gone; WithdrawModal's "deduct from student_points" is only a comment (it inserts an economy_transactions request).
  - Realtime on student_points for teachers still works (SELECT policy kept).
  The only thing a teacher lost is a direct write to student_points through the API.

N-5 FIXED. class-leaderboard v7 asks the database's is_teacher_of_class (TAs and cover teachers count) and treats linked_user_id, secondary_user_id and the family's main login as a viewer's children. Live source = repo.

## (a) classmate rows, family and student, every shape
Rows for a viewer who is not staff: name, avatar_url, rank, points on every board; plus total and the six category points on week/month boards; nothing else except on the viewer's own rows. Checked for: all four periods (basis total vs per_lesson), all six category tabs (rank and points are that tab's), the projector (wall = family shape), the champions / climber panels (name + points), and the streak (own child only). Level, join date, lesson count, attendance and other-class points are not in any classmate field; the single path to a lesson count is the residual under M-1. A student login and a family login go through the same function and the same viewer rule (myKids), so they get the same shape.

## (c) the "Everyone" list and projector toggle
src/components/leaderboard/EveryoneList.tsx draws only rank, an initial in a coloured circle, name, points (and "(you)", and "=" when ranks are equal, worked out from the server's rank). The projector passes wall = true (family shape). Nothing about the reception TV: reception-feed was not changed and leaderboard_tv_feed returns only student_id, points, rank, class_id which the function turns into names, photos, class and points.

## (e) live checks (read-only)
- Migration installed as the file says: level_points and economy_process exist; leaderboard_json / leaderboard_board have the new signatures (the old ones are gone); policies on student_points as listed above; school_terms ACL as above; economy enum values pending/approved/rejected and economy_transactions has updated_at (what the function uses). Function ACLs checked per name (compute/json/tv_feed/level_points service_role only).
- class-leaderboard v7 and reset-monthly-leaderboard v6 read live; they match the files at 70cad9e0 (compared by reading). reception-feed: not re-fetched this time (you say unchanged).
- Board totals still equal student_points: for the 8 active classes the month's sum of leaderboard_compute equals student_points for the same members, 0 mismatches. school_terms has 2 rows now.

## What I ran
leaderboard.test.mjs with both migrations 108/108; leaderboard-board.test.mjs 36/36; reception-display.test.mjs 39/39; tsc -p tsconfig.app.json (result below in the hand-back). I did not re-run the full run.mjs.

## Could not check
Real family / student / teacher tokens against the live endpoints; the screens in a browser; a concurrent-approval test of economy_process (read the locking only); whether anyone has a second source of lesson counts that makes the M-1 residual moot.
