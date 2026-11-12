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
    migrations: ["20261107090000_ai_assisted_admin_actions.sql"],
  },
  { name: "payroll session rules", file: "payroll-sessions.test.mjs", migrations: [] },
  // Also not a database test: the admin Payroll screen reads
  // calculate-payroll instead of recomputing the month, and this is the
  // mapping that stands between the two.
  { name: "payroll screen rows", file: "payroll-rows.test.mjs", migrations: [] },
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
  { name: "recorder retention", file: "recorder-retention.test.mjs", migrations: [] },
  // 20260717090000 first: the existing class-recordings bucket and its policy,
  // so the suite proves the recorder leaves them alone (C1 critic 2, N1).
  { name: "class recorder", file: "recorder.test.mjs", migrations: ["20260717090000_audio_transcript_pipeline.sql", "20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261112100000_class_recorder.sql"] },
  // Teacher Transcripts' audio scoped to the class's own staff (D-14), with
  // the recorder pasted after it to prove its preflight still accepts.
  { name: "transcribe gate", file: "transcribe-gate.test.mjs", migrations: [] },
  { name: "class recordings scope", file: "class-recordings-scope.test.mjs", migrations: ["20260717090000_audio_transcript_pipeline.sql", "20261111110000_ta_standing_assignments_and_homework_upload.sql", "20261112120000_class_recordings_scope.sql", "20261112100000_class_recorder.sql"] },
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

const run = (suite) =>
  new Promise((done) => {
    const child = spawn(
      process.execPath,
      [join(here, suite.file), ...suite.migrations.map(m)],
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
  if (r.code === 0) {
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
