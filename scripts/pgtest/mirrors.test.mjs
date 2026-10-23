// Deno cannot import from src/, so the modules the browser and the edge
// functions both work from exist twice. That duplication is deliberate
// and it is also how things drift: payroll has disagreed with itself
// three times, each because one copy changed and the other did not.
//
// This fails the moment a pair stops matching. It is the only thing that
// makes "shared" mean shared.
//
// One pair has no src-side importer today - payrollSessions, since the
// admin Payroll screen stopped recomputing the month and started reading
// calculate-payroll. It stays mirrored on purpose: an orphaned copy that
// is still checked is cheap, and the alternative is the next browser
// caller writing the rule out again, which is how all three drifts
// began.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

/**
 * Pairs that must be identical below their opening block comment. The
 * headers differ on purpose - each says which copy it is and where the
 * other lives.
 */
const MIRRORED = [
  ["src/lib/payRate.ts", "supabase/functions/_lib/pay-rate.ts"],
  ["src/lib/payHistory.ts", "supabase/functions/_lib/pay-history.ts"],
  ["src/lib/payrollSessions.ts", "supabase/functions/_lib/payroll-sessions.ts"],
];

/**
 * Pairs that are NOT mirrors, recorded so nobody "fixes" them. The src
 * copy of the schedule history imports @/lib/classSchedule, which Deno
 * cannot resolve, so the edge copy is a narrower reimplementation and
 * says so in its own header.
 */
const DELIBERATELY_DIFFERENT = [
  ["src/lib/scheduleHistory.ts", "supabase/functions/_lib/schedule-history.ts"],
];

const read = (rel) => readFileSync(resolve(repo, rel), "utf8").replace(/\r\n/g, "\n");

/** Everything after the first block comment: the part that must match. */
const body = (text) => {
  const end = text.indexOf("*/");
  return end === -1 ? text : text.slice(end + 2);
};

console.log("=== copies that must stay identical ===");
for (const [a, b] of MIRRORED) {
  const left = body(read(a));
  const right = body(read(b));
  if (left === right) {
    ok(`${a}  ==  ${b}`, true);
    continue;
  }
  // Name the first difference, so the failure is actionable rather than
  // just red.
  const l = left.split("\n");
  const r = right.split("\n");
  let i = 0;
  while (i < l.length && i < r.length && l[i] === r[i]) i += 1;
  ok(`${a}  ==  ${b}`, false,
     `first difference at body line ${i + 1}:\n          src:  ${JSON.stringify(l[i] ?? "<end of file>")}\n          deno: ${JSON.stringify(r[i] ?? "<end of file>")}`);
}

console.log("=== and the shared ones import nothing, which is what lets them be copied ===");
for (const [a, b] of MIRRORED) {
  for (const f of [a, b]) {
    const imports = read(f).split("\n").filter((line) => /^\s*import\s/.test(line));
    ok(`${f} has no imports`, imports.length === 0, imports.join(" | "));
  }
}

console.log("=== pairs that are deliberately not mirrors ===");
for (const [a, b] of DELIBERATELY_DIFFERENT) {
  ok(`${a} and ${b} differ on purpose`, body(read(a)) !== body(read(b)),
     "if these are now identical, move the pair into MIRRORED above");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
