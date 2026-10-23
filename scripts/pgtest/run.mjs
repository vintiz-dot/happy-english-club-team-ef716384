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
  // Not a database test: it asserts that the modules duplicated between
  // src/ and supabase/functions/_lib/ are still identical. Listed first
  // because a drifted mirror makes everything below it meaningless.
  { name: "shared-module mirrors", file: "mirrors.test.mjs", migrations: [] },
  // Nor is this one: it runs the repo's TypeScript over supabase/functions
  // with the remote imports stubbed. There is no Deno here and the
  // functions are deployed by hand, so without it a symbol used but not
  // imported reaches production before anything complains.
  { name: "edge functions typecheck", file: "edge-functions.test.mjs", migrations: [] },
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
    name: "homework grading",
    file: "homework-grading.test.mjs",
    migrations: ["20261023090000_homework_grading_integrity.sql"],
  },
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
