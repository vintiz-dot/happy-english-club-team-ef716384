#!/usr/bin/env node
/**
 * Runs the migration harnesses in this folder.
 *
 *   node scripts/pgtest/run.mjs
 *
 * WHAT THESE ARE. Each harness starts an in-process PostgreSQL (pglite),
 * creates the handful of base tables and the anon / authenticated /
 * service_role roles that Supabase provides, then executes the REAL
 * migration files listed below, in order. What is tested is the SQL that
 * actually gets pasted into the Supabase editor - its grants, its row
 * policies, its triggers and its arithmetic - rather than a description
 * of it.
 *
 * WHAT THEY ARE NOT. The prelude is a dozen tables, not the ninety this
 * database has. A passing run says the migration does what it intends;
 * it does not say it fits production. Applying it is still the proof.
 *
 * WHY THEY EXIST. Every assertion here was added because something went
 * wrong, and three of them were expensive:
 *
 *   - a PARTIAL unique index cannot serve as an ON CONFLICT target, so
 *     every upsert against one fails with 42P10 at plan time - while a
 *     plain INSERT against the same index works perfectly, which is how
 *     it got through twice;
 *   - SUM() over bigint returns NUMERIC, which silently turns integer
 *     division into decimal division and drops every rounding remainder,
 *     so allocated shares stop adding up to the bill;
 *   - a freeze that upserts rather than deletes leaves a class's old
 *     share standing when it drops out of a re-closed month, and the
 *     month then reports more overhead than the ledger holds.
 *
 * Add a migration that touches payroll, expenditures or the class
 * overhead, and add it to the list below.
 */
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const migrations = resolve(here, "..", "..", "supabase", "migrations");
const m = (name) => join(migrations, name);

const SUITES = [
  { name: "family payment month", file: "family-payment-month.test.mjs", migrations: [] },
  { name: "dated enrollment discounts", file: "enrollment-discounts.test.mjs", migrations: [] },
  // Two overlapping enrollments of one class: the one created first prices
  // the lesson, in both calculators, whatever order the rows are fetched in.
  { name: "enrollment row order", file: "enrollment-order.test.mjs", migrations: [] },
  // A recalculation must not un-confirm or un-pay a bill. The real
  // calculate-tuition, -bulk and confirm-tuition handlers over an invoices
  // table carrying the real CHECK, carry, audit and freeze migrations; and
  // every figure compared with the function as it was before the change.
  {
    name: "invoice status",
    file: "invoice-status.test.mjs",
    migrations: [
      "20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql",
      "20261009120000_keep_invoice_carry_balances_correct.sql",
      "20261009130000_audit_every_admin_action.sql",
      "20261106120000_invoice_tuition_freeze.sql",
    ],
  },
  // Voluntary contributions and Settle Bill are removed (D-23): settle-bill
  // is a 410 stub that touches nothing, nothing can create either any more,
  // and the preflight for dropping the write-off reader counts zero.
  { name: "removed money features", file: "removed-money-features.test.mjs", expect: 37, migrations: [] },
  // scripts/CREDIT-past-unapplied-cash.sql (owner: credit the past leftovers) run for real,
  // with the real smart-family-payment and delete-payment over the same pglite.
  { name: "past leftover credit", file: "past-leftover-credit.test.mjs", expect: 29, migrations: [] },
  // The admin tuition list reads the calculator instead of summing invoice
  // rows itself: both real handlers beside the old browser sum, case by case.
  { name: "tuition prior balance", file: "tuition-prior-balance.test.mjs", migrations: [] },
  {
    name: "cancelled lessons",
    file: "cancelled-lessons.test.mjs",
    migrations: ["20261027090000_cancelled_lesson_attendance_guard.sql"],
  },
  { name: "session held evidence", file: "session-evidence.test.mjs", migrations: ["20261027090000_cancelled_lesson_attendance_guard.sql", "20261112090000_session_held_evidence.sql"] },
  // The cancellation guard on top of the real audit trigger, the real
  // cancelled-lesson guard and the evidence function, in paste order.
  {
    name: "session cancel guard",
    file: "session-cancel-guard.test.mjs",
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
    ],
  },
  // manage-session and bulk-cancel-sessions bundled and driven with
  // requests, their Supabase clients a stand-in for PostgREST over the same
  // real migrations: the checked RPCs run, and every sessions write is
  // checked to be on the admin's own JWT.
  {
    name: "session guard functions",
    file: "session-guard-functions.test.mjs",
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
    ],
  },
  // D4 step 1a (docs/evidence/D4-design.md f.2): the two floors, D2's own
  // suite re-run with them, the functions as deployed today against them,
  // and the rollback back to the D release. Each pins its assertion count.
  {
    name: "d4 floors",
    file: "d4-floors.test.mjs",
    expect: 213,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261114090000_d4_floors.sql",
      "20261106120000_invoice_tuition_freeze.sql",
    ],
  },
  {
    name: "d4 D2 carry-over",
    file: "d4-d2-carryover.test.mjs",
    expect: 275,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261114090000_d4_floors.sql",
    ],
  },
  {
    name: "d4 deployed functions",
    file: "d4-deployed-functions.test.mjs",
    expect: 37,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261114090000_d4_floors.sql",
    ],
  },
  {
    name: "d4 rollback",
    file: "d4-rollback.test.mjs",
    expect: 26,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261114090000_d4_floors.sql",
    ],
    args: ["scripts/ROLLBACK-d4-1-floors.sql"],
  },
  // D4 step 1b: the money guard's core and the register (G-11, G-12, DQ-1),
  // the three functions driven per role, and the pure helpers.
  {
    name: "d4 register",
    file: "d4-register.test.mjs",
    expect: 140,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
    ],
    args: ["scripts/ROLLBACK-d4-2-register.sql"],
  },
  {
    name: "d4 functions register",
    file: "d4-functions-register.test.mjs",
    expect: 34,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
    ],
  },
  { name: "money guard lib", file: "money-guard-lib.test.mjs", expect: 45, migrations: [] },
  // D4 step 2: dated class fees (G-16): the guards, the three calculators
  // bundled, and invoice-status's golden figures re-run with no history
  // table, with baseline rows and with a future row (all byte-identical).
  {
    name: "d4 class fee",
    file: "d4-class-fee.test.mjs",
    expect: 174,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261114092000_d4_class_fee_history.sql",
    ],
    args: ["scripts/ROLLBACK-d4-3-class-fee.sql"],
  },
  // D4 step 3A: who is paid for a lesson (G-1 to G-7), the two functions
  // driven per role, and the Stars engine's lesson statements on the guard.
  {
    name: "d4 lesson pay",
    file: "d4-lesson-pay.test.mjs",
    expect: 143,   // 130 at the build; fix round 1: S-1 (P1b, P1c), S-2 (P8), d4_guard_status
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261114093000_d4_lesson_pay_guard.sql",
    ],
    args: ["scripts/ROLLBACK-d4-4-lesson-pay.sql"],
  },
  {
    name: "d4 functions lessons",
    file: "d4-functions-lessons.test.mjs",
    expect: 74,    // 57 at the build; fix round 1: S-1 move, N-1..N-7, the hand-offs
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261114093000_d4_lesson_pay_guard.sql",
    ],
  },
  {
    name: "d4 stars interplay",
    file: "d4-stars-interplay.test.mjs",
    expect: 19,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261114093000_d4_lesson_pay_guard.sql",
    ],
  },
  // D4 step 3B: the money inputs (G-13 to G-21) - enrolments, discounts, pay
  // rates, unfreezing, family links, hard deletes - over the real enrolment
  // RPC migrations; the four functions driven per role; and the oracle that
  // does not trust the reach rules (the real calculators re-run after each
  // edit made behind the guard's back).
  {
    name: "d4 money inputs",
    file: "d4-money-inputs.test.mjs",
    expect: 308,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261106100000_attendance_guard_no_auto_changes.sql",
      "20261106100001_date_aware_enrollment_changes.sql",
      "20261113120000_pause_enrollment_admin_only.sql",
      "20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql",
      "20261114094000_d4_money_inputs_guard.sql",
    ],
    args: ["scripts/ROLLBACK-d4-5-money-inputs.sql"],
  },
  {
    name: "d4 functions inputs",
    file: "d4-functions-inputs.test.mjs",
    expect: 62,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261106100000_attendance_guard_no_auto_changes.sql",
      "20261106100001_date_aware_enrollment_changes.sql",
      "20261113120000_pause_enrollment_admin_only.sql",
      "20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql",
      "20261114094000_d4_money_inputs_guard.sql",
    ],
  },
  {
    name: "d4 reach oracle",
    file: "d4-reach-oracle.test.mjs",
    expect: 200,
    migrations: [
      "20261009130000_audit_every_admin_action.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261106090000_attendance_enrollment_guard.sql",
      "20261112090000_session_held_evidence.sql",
      "20261112091000_session_cancel_guard.sql",
      "20261106120000_invoice_tuition_freeze.sql",
      "20261114090000_d4_floors.sql",
      "20261114091000_d4_core_register.sql",
      "20261106100000_attendance_guard_no_auto_changes.sql",
      "20261106100001_date_aware_enrollment_changes.sql",
      "20261113120000_pause_enrollment_admin_only.sql",
      "20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql",
      "20261114094000_d4_money_inputs_guard.sql",
    ],
  },
  // The wording of the money-input dialogs, and the static scans (no raw
  // writer of a money input left in src, no service-key writer off the
  // allow-list, nothing in the MCP tools).
  { name: "money inputs lib", file: "money-inputs-lib.test.mjs", expect: 43, migrations: [] },
  // D4 integration: steps 2, 3A, 3B pasted on 1a + 1b in the planned order,
  // each alone and in every order; every later file's preflight pins still
  // match; the fingerprint after each; the rollback chain back to 1b and to
  // the D release. Builds its own databases (one child process per scenario).
  // Step 4 (approvals) extends it: 2 -> 3A -> 3B -> 4 in every order of the
  // first three, step 4 refused when early, rollback 6 alone (238 before step 4).
  { name: "d4 apply chain", file: "d4-apply-chain.test.mjs", expect: 344, migrations: [] },
  // D4 step 4: two-administrator approval, built OFF. Builds its databases
  // from guard-fingerprint.mjs D4_BUILD (D1, D2, every D4 file 1a..3B and
  // file 6, real files); OFF is proved by running one scenario with and
  // without file 6 and comparing; then ON; rollback 6 is the argument.
  { name: "d4 approvals", file: "d4-approvals.test.mjs", expect: 141, migrations: [], args: ["scripts/ROLLBACK-d4-6-approvals.sql"] },
  // The wording and the requests of src/lib/approvals.ts, and the step 4 screens (static).
  { name: "approvals lib", file: "approvals-lib.test.mjs", expect: 35, migrations: [] },
  // Not a database test: it asserts that the modules duplicated between
  // src/ and supabase/functions/_lib/ are still identical. Listed first
  // because a drifted mirror makes everything below it meaningless.
  { name: "shared-module mirrors", file: "mirrors.test.mjs", migrations: [] },
  // Nor is this one: it runs the repo's TypeScript over supabase/functions
  // with the remote imports stubbed. There is no Deno here and the
  // functions are deployed by hand, so without it a symbol used but not
  // imported reaches production before anything complains.
  { name: "edge functions typecheck", file: "edge-functions.test.mjs", migrations: [] },
  // The app's own types. `tsc --noEmit` at the root checks nothing - see
  // the file - so this is the type check, not that.
  { name: "app typecheck", file: "app-typecheck.test.mjs", migrations: [] },
  // The public sign-up form offers no staff role (audit F-01).
  { name: "signup form (F-01)", file: "signup-form.test.mjs", migrations: [] },
  // Nor this: the assistant's chat function, run against a stand-in for
  // PostgREST that knows the real schema, and a scripted model. It checks
  // what the model is told about who is asking, and that every tool's
  // query names columns and relationships that exist.
  { name: "chat assistant", file: "chat-assistant.test.mjs", migrations: [] },
  // What the assistant may set up for an admin, and undo: only through
  // these functions, all of it or none, refused once people depend on it.
  {
    name: "AI admin actions",
    file: "ai-actions.test.mjs",
    // 20261113090000 (T4) swaps their label CASE for invoice_paid_label, in
    // whatever definition is installed; run after it, as production will.
    migrations: ["20261107090000_ai_assisted_admin_actions.sql", "20261113090000_invoice_paid_label.sql"],
  },
  { name: "payroll session rules", file: "payroll-sessions.test.mjs", migrations: [] },
  // Also not a database test: the admin Payroll screen reads
  // calculate-payroll instead of recomputing the month, and this is the
  // mapping that stands between the two.
  { name: "payroll screen rows", file: "payroll-rows.test.mjs", migrations: [] },
  // The teacher's own payroll page and the admin's view of one teacher read
  // calculate-payroll too (T5): the mapping, and the function itself as a
  // teacher, an admin, a TA, a parent and nobody call it.
  { name: "teacher payroll view", file: "teacher-payroll-view.test.mjs", migrations: [] },
  { name: "teacher payroll function", file: "teacher-payroll.test.mjs", migrations: [] },
  // TA-PAY: a teaching assistant reads their own row (JWT-scoped), and the
  // TA screens show calculate-payroll's figures, open and closed month.
  { name: "TA payroll function", file: "ta-payroll.test.mjs", migrations: [] },
  {
    name: "pay-rate history",
    file: "payhist.mjs",
    migrations: [
      "20261021090000_staff_pay_rate_history.sql",
      "20261021094000_fix_staff_pay_rate_upsert_target.sql",
    ],
  },
  {
    name: "payroll month locking",
    file: "paylock.mjs",
    migrations: [
      "20261021092000_expenditure_source_key.sql",
      "20261021093000_payroll_month_locking.sql",
      "20261021096000_fix_payroll_lines_upsert_target.sql",
      "20261022091000_protect_closed_payroll_expenditures.sql",
    ],
  },
  {
    name: "stars sync",
    file: "stars-sync.test.mjs",
    migrations: ["20261023100000_stars_sync_foundation.sql"],
  },
  {
    name: "stars sync engine",
    file: "stars-sync-engine.test.mjs",
    migrations: [
      "20261023090000_homework_grading_integrity.sql",
      "20261023100000_stars_sync_foundation.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261027100000_stars_sync_engine.sql",
      "20261028090000_stars_sync_review_fixes.sql",
    ],
  },
  // The same migrations, but the old engine runs first and the fix is
  // pasted over what it decided - as it will be in production.
  {
    name: "stars sync upgrade",
    file: "stars-sync-upgrade.test.mjs",
    migrations: [
      "20261023090000_homework_grading_integrity.sql",
      "20261023100000_stars_sync_foundation.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261027100000_stars_sync_engine.sql",
      "20261028090000_stars_sync_review_fixes.sql",
    ],
  },
  // Homework and grades. The engine as production has it runs first, then
  // this is pasted over what it decided.
  {
    name: "stars sync homework",
    file: "stars-sync-homework.test.mjs",
    migrations: [
      "20261023090000_homework_grading_integrity.sql",
      "20261023100000_stars_sync_foundation.sql",
      "20261027090000_cancelled_lesson_attendance_guard.sql",
      "20261027100000_stars_sync_engine.sql",
      "20261028090000_stars_sync_review_fixes.sql",
      "20261104090000_stars_sync_homework.sql",
    ],
  },
  // Not a database test: the edge function's own decisions, and the
  // after-effects of a mark that mark-attendance and the sync share.
  { name: "stars sync core", file: "stars-sync-core.test.mjs", migrations: [] },
  // Attendance streaks read from the register, the bonus once per child per
  // lesson (docs/evidence/FIX-streaks-bank-uploads.md, item 1): the real
  // attendance-effects.ts over pglite, the migration, and the repair script
  // (dry run, back-pay of missed bonuses, rebuilt counters) on a
  // hand-computed fixture and against the TS rule.
  {
    name: "attendance streaks",
    file: "attendance-streaks.test.mjs",
    migrations: ["20261116091000_attendance_streak_rule.sql"],
    args: ["scripts/REPAIR-attendance-streaks.sql"],
    expect: 102,
  },
  // Nor these: the admin screens' reasoning, without the screens. Who a
  // Pixel Pal child probably is, and how the record log is read and sliced.
  { name: "stars link tool", file: "stars-link.test.mjs", migrations: [] },
  { name: "stars records", file: "stars-records.test.mjs", migrations: [] },
  {
    name: "homework grading",
    file: "homework-grading.test.mjs",
    migrations: ["20261023090000_homework_grading_integrity.sql"],
  },
  // Video homework: families never see the AI draft, classmates never see
  // a score, a child cannot approve their own, and re-approving replaces.
  { name: "video homework rules", file: "video-homework-rules.test.mjs", migrations: [] },
  // Language Support: the picture strip, set import and the easy video
  // recorder's helpers (no database), then the class-activation policies.
  { name: "language support lib", file: "language-support-lib.test.mjs", migrations: [] },
  // Reception display: the public feedback form sends pending rows only;
  // content, settings and approval are admin-only.
  {
    name: "reception display",
    file: "reception-display.test.mjs",
    migrations: ["20261116090000_reception_display.sql", "20261116100000_reception_media.sql"],
  },
  {
    name: "language support",
    file: "language-support.test.mjs",
    migrations: ["20261110090000_language_support.sql"],
  },
  {
    name: "video homework",
    file: "video-homework.test.mjs",
    migrations: [
      "20261023090000_homework_grading_integrity.sql",
      "20261109090000_video_homework.sql",
    ],
  },
  // Audit clips: admin-only store of children's clips, consent before upload.
  { name: "audit clips lib", file: "audit-clips-lib.test.mjs", migrations: [] },
  {
    name: "audit clips",
    file: "audit-clips.test.mjs",
    migrations: ["20261111090000_audit_voice_clips.sql", "20261111100000_audit_clips_youtube_links.sql"],
  },
  { name: "audit eval proxy (TEMP)", file: "audit-eval.test.mjs", migrations: ["20261112110000_audit_eval_bucket.sql"] },
  {
    name: "ta standing assignments",
    file: "ta-standing.test.mjs",
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql"],
  },
  // The class recorder (C1-C5).
  { name: "recorder retention", file: "recorder-retention.test.mjs", migrations: [] },
  // The recorder engine (src/lib/recorder) against the contract-enforcing fake
  // server: synthetic audio, no browser. Slow (minutes): it encodes real FLAC.
  { name: "recorder engine", file: "../recorder/unit.test.mjs", migrations: [] },
  { name: "recorder screens logic", file: "../recorder/ui.test.mjs", migrations: [] },
  { name: "recorder screens render", file: "../recorder/screens.test.mjs", migrations: [] },
  // The retention schedule (pg_cron / pg_net stand-ins: pglite has neither).
  { name: "recorder cron", file: "recorder-cron.test.mjs", migrations: ["20261112101000_recorder_retention_cron.sql"] },
  // 20260717090000 first: the existing class-recordings bucket and its policy,
  // so the suite proves the recorder leaves them alone (C1 critic 2, N1).
  { name: "class recorder", file: "recorder.test.mjs", migrations: ["20260717090000_audio_transcript_pipeline.sql", "20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261112100000_class_recorder.sql"] },
  // Teacher Transcripts' audio scoped to the class's own staff (D-14), with
  // the recorder pasted after it to prove its preflight still accepts.
  { name: "transcribe gate", file: "transcribe-gate.test.mjs", migrations: [] },
  { name: "class recordings scope", file: "class-recordings-scope.test.mjs", migrations: ["20260717090000_audio_transcript_pipeline.sql", "20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261112120000_class_recordings_scope.sql", "20261112100000_class_recorder.sql"] },
  // S1 security fixes (docs/evidence/S1-security-fixes.md). One migration
  // per finding, each pasted on top of the state production is in.
  // F-01: a sign-up never gets a role because the browser asked for it.
  {
    name: "signup role (F-01)",
    file: "signup-role.test.mjs",
    migrations: ["20260312152157_350b3a18-08dd-4115-afc0-a78b318339eb.sql", "20261113100000_signup_role_from_server_only.sql"],
  },
  // F-14: the homework bucket. The 36 production policies come from
  // docs/evidence/S1-F14-rollback.sql, which is both the "before" and the
  // rollback under test.
  {
    name: "homework bucket (F-14)",
    file: "homework-bucket-scope.test.mjs",
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261113110000_homework_bucket_scope.sql"],
  },
  // F-15: pause_enrollment asks for an admin. The "before" is the live
  // function, kept as the rollback block in the evidence file.
  { name: "pause enrollment (F-15)", file: "pause-enrollment.test.mjs", migrations: ["20261113120000_pause_enrollment_admin_only.sql"] },
  // F-16: classmates' rows. The four production policies come from
  // docs/evidence/S1-F16-rollback.sql ("before" and rollback under test).
  {
    name: "classmate rows (F-16)",
    file: "classmate-rows.test.mjs",
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261113130000_classmate_rows_private.sql"],
  },
  // The same suite with 20261113150000 pasted on top: class skill figures
  // for a family as a summary that names no child.
  {
    name: "class skill summary",
    file: "classmate-rows.test.mjs",
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261113130000_classmate_rows_private.sql", "20261113150000_class_skill_summary_without_names.sql"],
  },
  // F-21: creator-owned write policies, and what a stored link may be.
  {
    name: "creator rows (F-21)",
    file: "creator-rows.test.mjs",
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261113140000_creator_rows_need_class_staff.sql"],
  },
  // bank_info: a family's primary login reads the school's bank details
  // (docs/evidence/FIX-streaks-bank-uploads.md, item 2). The live policy is
  // the rollback block in that file, "before" and rollback under test.
  {
    name: "bank info family logins",
    file: "bank-info-family.test.mjs",
    migrations: ["20261116090000_bank_info_family_logins.sql"],
    expect: 27,
  },
  // F-02: the nine AI / speech / image-search functions, handler by handler:
  // no session, wrong role, right role, the per-account limit.
  { name: "ai spend gate (F-02)", file: "ai-gate.test.mjs", migrations: [] },
  // S2 (docs/evidence/S2-audit-medium-low.md): the medium and low findings.
  // Each migration suite installs the rollback block from the evidence file
  // as production's "before", pastes the fix twice, runs the rollback, pastes
  // again. Each pins its assertion count.
  {
    name: "teacher reads (F-06)",
    file: "s2-f06-teacher-reads.test.mjs",
    expect: 42,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261116092000_teacher_reads_own_classes_profiles.sql"],
  },
  {
    name: "staff pay reads (F-17)",
    file: "s2-f17-staff-pay.test.mjs",
    expect: 60,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261021090000_staff_pay_rate_history.sql", "20261116093000_staff_pay_not_for_every_account.sql"],
  },
  {
    name: "teacher storage (F-18)",
    file: "s2-f18-teacher-storage.test.mjs",
    expect: 48,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261116094000_teacher_storage_by_class.sql"],
  },
  {
    name: "homework grade (F-05)",
    file: "s2-f05-homework-grade.test.mjs",
    expect: 35,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261116095000_homework_grade_staff_only.sql"],
  },
  {
    name: "child writes (F-19)",
    file: "s2-f19-child-writes.test.mjs",
    expect: 32,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261116096000_child_writes_own_rows_only.sql"],
  },
  {
    name: "hardening (F-20)",
    file: "s2-f20-hardening.test.mjs",
    expect: 30,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261116097000_hardening_anon_and_null_uid.sql"],
  },
  // The S2 edge-function and browser fixes (F-03, F-04, F-07..F-13, F-17's
  // and F-23's browser half): each real function before (5594ca32) and after.
  { name: "S2 edge functions", file: "s2-edge-functions.test.mjs", expect: 107, migrations: [] },
  // The independent review's probes (docs/evidence/S2-review.md), flipped by
  // the fix round: R-1 refused, R-2 rows identical and timing near before-S2,
  // R-3 avatars by their bytes, R-4 the sentence cache key.
  {
    name: "S2 review probes",
    file: "s2-review-probes.test.mjs",
    expect: 20,
    migrations: ["20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261021090000_staff_pay_rate_history.sql",
      "20261116093000_staff_pay_not_for_every_account.sql", "20261116094000_teacher_storage_by_class.sql", "20261113140000_creator_rows_need_class_staff.sql"],
  },
  // F-23: public/_headers (the inline-script hash, the hosts the code fetches from, the service
  // worker's exemption) and the /csp-report Pages Function. docs/evidence/CSP.md.
  { name: "content security policy (F-23)", file: "csp-headers.test.mjs", migrations: [], expect: 30 },
  {
    name: "assistant absence",
    file: "assistant-absence.test.mjs",
    migrations: ["20261022090000_assistant_absence_on_a_session.sql"],
  },
  {
    name: "recurring expenditures",
    file: "recurring-expenditures.test.mjs",
    migrations: ["20261021095000_recurring_expenditures_in_production.sql"],
  },
  {
    name: "class overhead",
    file: "class-overhead.test.mjs",
    migrations: [
      "20261021092000_expenditure_source_key.sql",
      "20261021093000_payroll_month_locking.sql",
      "20261021095000_recurring_expenditures_in_production.sql",
      "20261021096000_fix_payroll_lines_upsert_target.sql",
      "20261021097000_class_overhead_allocation.sql",
      "20261021098000_targeted_expenditure_allocation.sql",
      "20261021099000_class_overhead_breakdown.sql",
      "20261022091000_protect_closed_payroll_expenditures.sql",
    ],
  },
];

// D4 (docs/evidence/D4-design.md f.1): a suite may pin `expect`, the number
// of assertions it must report; FEWER is a failure, because a suite that
// silently loaded nothing passes with nothing. `args` are extra files,
// relative to the repo root, passed after the migrations.
const repoRoot = resolve(here, "..", "..");

const run = (suite) =>
  new Promise((done) => {
    const child = spawn(
      process.execPath,
      [join(here, suite.file), ...suite.migrations.map(m), ...(suite.args ?? []).map((a) => join(repoRoot, a))],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => done({ ...suite, code, out }));
  });

let failed = 0;
let total = 0;

for (const suite of SUITES) {
  const r = await run(suite);
  const summary = r.out.trim().split("\n").pop() ?? "";
  const counted = /^(\d+) passed, (\d+) failed$/.exec(summary);
  if (counted) total += Number(counted[1]);
  const short = suite.expect !== undefined && (!counted || Number(counted[1]) < suite.expect);
  if (short && r.code === 0) {
    failed += 1;
    console.log(`  FAIL  ${suite.name.padEnd(24)} ${summary} (expected at least ${suite.expect} passing assertions)`);
  } else if (r.code === 0) {
    console.log(`  ok    ${suite.name.padEnd(24)} ${summary}`);
  } else {
    failed += 1;
    console.log(`  FAIL  ${suite.name.padEnd(24)} ${summary}`);
    // Only the failures, so a green run stays one screen.
    for (const line of r.out.split("\n")) {
      if (line.includes("FAIL") || /^\s*(error|Error)/.test(line)) console.log(`        ${line.trim()}`);
    }
  }
}

console.log(`\n${total} assertions across ${SUITES.length} suites, ${failed} suite(s) failed`);
process.exit(failed ? 1 : 0);
