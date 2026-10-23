// The admin Payroll screen's whole data layer.
//
// The screen stopped computing pay and now reads calculate-payroll. What
// is left between the function and the table is this mapping, so this is
// the file that decides whether the table is right. Drives the real
// src/lib/payrollRows.ts.
//
// The case that matters most is the closed month: PayrollMonthLock
// compares what the screen shows against the stored payroll_lines and
// offers to carry the difference into the next month. Hand it the frozen
// figures and it compares them with themselves and never reports a
// correction again - a silent failure, in a panel whose only job is to
// catch one.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Load a real .ts module, inlining the one relative import it has. */
async function load(rel, name) {
  const src = readFileSync(resolve(repo, rel), "utf8");
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
  return out;
}

// payrollRows imports ./payRate, so put both side by side in tmp.
const payRateTmp = await load("src/lib/payRate.ts", "payRate");
const rate = await import(pathToFileURL(payRateTmp).href);
const rowsSrc = readFileSync(resolve(repo, "src/lib/payrollRows.ts"), "utf8")
  .replace('from "./payRate"', `from ${JSON.stringify(pathToFileURL(payRateTmp).href)}`);
const rowsTmp = resolve(tmpdir(), `payrollRows.${process.pid}.mjs`);
writeFileSync(rowsTmp, (await transform(rowsSrc, { loader: "ts", format: "esm" })).code);
const m = await import(pathToFileURL(rowsTmp).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

/** A response row as the current function builds one. */
const row = (over = {}) => ({
  teacherId: "t1",
  teacherName: "Mai Tran",
  staffName: "Mai Tran",
  staffType: "teacher",
  isActive: true,
  payBasisInMonth: "hourly",
  lengthCostsMoney: true,
  payRateType: "hourly",
  hourlyRate: 300000,
  perSessionRate: 0,
  sessionsCountActual: 8,
  sessionsCountProjected: 12,
  totalAmountActual: 3600000,
  totalAmountProjected: 5400000,
  totalAmountExpectedProjected: 5250000,
  varianceAmountProjected: 150000,
  varianceMinutesProjected: 30,
  discrepancies: [],
  ...over,
});

const one = (over = {}) => m.payrollRows([row(over)])[0];

console.log("=== what basis a month was paid on ===");
{
  // The rule the edge function fills payBasisInMonth with. It reads the
  // rate each session was PRICED at, because pay is effective-dated and
  // the staff row only knows today.
  const hourly = { pay_rate_type: "hourly", hourly_rate_vnd: 300000 };
  const perSession = { pay_rate_type: "per_session", per_session_rate_vnd: 250000 };

  eq("a month entirely on one basis is that basis",
     rate.payBasisOf([hourly, hourly, hourly]), "hourly");
  eq("  and the other one too",
     rate.payBasisOf([perSession, perSession]), "per_session");
  eq("a month where the basis moved is mixed",
     rate.payBasisOf([hourly, hourly, perSession]), "mixed");
  eq("a month with no sessions falls back to the staff row",
     rate.payBasisOf([], perSession), "per_session");
  eq("  and to hourly when there is no staff row either",
     rate.payBasisOf([]), "hourly");
  eq("an unrecognised basis counts as hourly, never as free",
     rate.payBasisOf([{ pay_rate_type: "weekly" }]), "hourly");

  ok("an hourly month costs money for a long lesson",
     rate.lengthCostsMoneyFor([hourly, hourly]) === true);
  ok("a per-session month does not",
     rate.lengthCostsMoneyFor([perSession, perSession]) === false);
  ok("one hourly session in the month is enough to make it cost money",
     rate.lengthCostsMoneyFor([perSession, hourly, perSession]) === true);
  ok("a month with no sessions has no overpayment to report",
     rate.lengthCostsMoneyFor([]) === false);

  // These two have to agree: "Mixed" exists precisely because part of the
  // month was hourly, and that part is what costs money.
  ok("mixed and costs-money cannot contradict each other",
     ["hourly", "mixed"].includes(rate.payBasisOf([perSession, hourly])) ===
     rate.lengthCostsMoneyFor([perSession, hourly]));

  eq("the label the screen prints", rate.payBasisLabel("mixed"), "Mixed");
  eq("  for hourly", rate.payBasisLabel("hourly"), "Per hour");
  eq("  for per-session", rate.payBasisLabel("per_session"), "Per session");
}

console.log("=== an ordinary open month ===");
{
  const r = one();
  eq("what is owed now is the held total", r.totalEarned, 3600000);
  eq("what is still to come is the rest of the projection", r.projectedEarnings, 1800000);
  eq("  and the two add up to the projection", r.totalEarned + r.projectedEarnings, r.totalProjected);
  eq("held lessons", r.heldSessions, 8);
  eq("lessons still to come", r.scheduledSessions, 4);
  eq("  which also add up", r.heldSessions + r.scheduledSessions, 12);
  eq("costed at the scheduled lengths", r.expectedProjected, 5250000);
  eq("the gap against them", r.varianceAmount, 150000);
  eq("and in minutes", r.varianceMinutes, 30);
  eq("the rate the month was paid at", r.staff.hourly_rate_vnd, 300000);
  eq("the basis, spelled for a column", r.payBasisInMonth, "Per hour");
  ok("a long lesson costs this one money", r.lengthCostsMoney === true);
  ok("they are not archived", r.staff.is_active === true);
}

console.log("=== per-session staff ===");
{
  const r = one({
    payBasisInMonth: "per_session", payRateType: "per_session",
    lengthCostsMoney: false, hourlyRate: 250000, perSessionRate: 250000,
  });
  eq("the basis reads as sessions", r.payBasisInMonth, "Per session");
  ok("a long lesson costs them nothing", r.lengthCostsMoney === false);
  eq("their rate is the per-session one", r.staff.per_session_rate_vnd, 250000);
  eq("  and no hourly rate is invented for them", r.staff.hourly_rate_vnd, 0);
}
{
  // A month that changed basis partway through is a real state, not a
  // failure to decide: pay is effective-dated.
  const r = one({ payBasisInMonth: "mixed", lengthCostsMoney: true });
  eq("a month on two bases says so", r.payBasisInMonth, "Mixed");
  ok("  and the hourly half still costs money for a long lesson", r.lengthCostsMoney === true);
}

console.log("=== a closed month ===");
{
  // The function reports the frozen figures and keeps the recomputed ones
  // beside them. This screen needs the recomputed ones - see the header.
  const r = one({
    totalAmountActual: 3600000,        // frozen: what the month was closed at
    sessionsCountActual: 8,
    liveTotalAmountActual: 3300000,
    live: {
      totalAmountActual: 3300000,      // live: attendance was corrected since
      sessionsCountActual: 7,
      totalMinutesActual: 630,
      totalHoursActual: 10.5,
      payRateType: "hourly",
      hourlyRate: 300000,
      perSessionRate: 0,
    },
  });
  eq("the screen shows what the month costs NOW", r.totalEarned, 3300000);
  eq("  so the lock panel can see the 300,000 ₫ difference", 3600000 - r.totalEarned, 300000);
  eq("the held count is the live one too", r.heldSessions, 7);
  eq("still to come stays coherent against it", r.projectedEarnings, 5400000 - 3300000);
  eq("  and so does the session count", r.scheduledSessions, 12 - 7);
}
{
  // Correcting attendance DOWN is the common case; correcting it up must
  // not break the arithmetic either.
  const r = one({
    totalAmountActual: 3000000,
    sessionsCountActual: 6,
    live: { totalAmountActual: 3600000, sessionsCountActual: 8 },
  });
  eq("a month that grew since closing reports the larger figure", r.totalEarned, 3600000);
  eq("  and still to come shrinks to match", r.projectedEarnings, 1800000);
}

console.log("=== against a function that has not been redeployed yet ===");
{
  // Deploys here are manual, so the client can be ahead of the function
  // for a while. Every new field has to degrade to something true.
  const old = {
    teacherId: "t9", teacherName: "Linh Pham (TA)", staffType: "teaching_assistant",
    payRateType: "per_session", hourlyRate: 200000, perSessionRate: 200000,
    sessionsCountActual: 4, sessionsCountProjected: 6,
    totalAmountActual: 800000, totalAmountProjected: 1200000,
    totalAmountExpectedProjected: 1200000,
    varianceAmountProjected: 0, varianceMinutesProjected: 0, discrepancies: [],
  };
  const r = m.payrollRows([old])[0];
  eq("the name falls back to the decorated one rather than going blank",
     r.staff.full_name, "Linh Pham (TA)");
  ok("nobody is shown as archived on a guess", r.staff.is_active === true);
  eq("the basis falls back to the headline rate's type", r.payBasisInMonth, "Per session");
  ok("  and so does whether length costs them anything", r.lengthCostsMoney === false);
  eq("the money is unaffected", r.totalEarned, 800000);
  eq("and they are still recognised as an assistant", r.staffType, "ta");
}
{
  const r = m.payrollRows([{ teacherId: "t9", payRateType: "hourly", totalAmountProjected: 10 }])[0];
  ok("an hourly fallback does cost money for a long lesson", r.lengthCostsMoney === true);
  eq("  and reads as hourly", r.payBasisInMonth, "Per hour");
}
{
  // The old deploy on a CLOSED month: liveTotalAmountActual was the only
  // live figure it published, so the amount is still right and only the
  // counts are stale. Drift detection keeps working, which is the point.
  const r = one({ totalAmountActual: 3600000, liveTotalAmountActual: 3300000, live: undefined });
  eq("the published live amount is used", r.totalEarned, 3300000);
  eq("  the count is the frozen one, stale but not wrong-signed", r.heldSessions, 8);
  ok("  and nothing goes negative", r.scheduledSessions >= 0 && r.projectedEarnings >= 0);
}

console.log("=== mismatched session lengths ===");
{
  const r = one({
    discrepancies: [{
      id: "s1", date: "2026-07-14", classes: { name: "Rockets" },
      minutes: 120, expectedMinutes: 90, varianceMinutes: 30, varianceAmount: 150000,
    }],
  });
  const [mm] = r.mismatchedSessions;
  eq("the session is named by its class", mm.className, "Rockets");
  eq("what it ran", mm.actualMinutes, 120);
  eq("what it was scheduled for", mm.expectedMinutes, 90);
  eq("the difference", mm.deltaMinutes, 30);
  eq("what the difference costs", mm.deltaAmount, 150000);
  eq("on its date", mm.date, "2026-07-14");
}
{
  const r = one({ discrepancies: [{ id: "s2", date: "2026-07-15" }] });
  eq("a session with no class still has something to print",
     r.mismatchedSessions[0].className, "Class");
  eq("  and no invented cost", r.mismatchedSessions[0].deltaAmount, 0);
}

console.log("=== the order the table is drawn in ===");
{
  const rows = m.payrollRows([
    row({ teacherId: "a", staffName: "Zoe", staffType: "teaching_assistant" }),
    row({ teacherId: "b", staffName: "Mai" }),
    row({ teacherId: "c", staffName: "An", staffType: "teaching_assistant" }),
    row({ teacherId: "d", staffName: "Anh" }),
  ]);
  eq("teachers first, then assistants, each by name",
     rows.map((r) => r.staff.full_name).join(","), "Anh,Mai,An,Zoe");
  eq("  and the types land where they should",
     rows.map((r) => r.staffType).join(","), "teacher,teacher,ta,ta");
}

console.log("=== nothing, and nonsense ===");
{
  eq("no payroll data is an empty table, not a crash", m.payrollRows(null).length, 0);
  eq("  and so is an empty list", m.payrollRows([]).length, 0);
  const r = m.payrollRows([{}])[0];
  ok("a row with nothing in it still renders", r.staff.full_name === "" && r.totalEarned === 0);
  ok("  with no NaN anywhere",
     [r.totalEarned, r.projectedEarnings, r.totalProjected, r.expectedProjected,
      r.varianceAmount, r.varianceMinutes, r.heldSessions, r.scheduledSessions]
       .every((n) => Number.isFinite(n)));
}
{
  const r = one({ totalAmountProjected: null, totalAmountActual: undefined });
  ok("nulls from the wire become zeros, not NaN",
     Number.isFinite(r.totalEarned) && Number.isFinite(r.projectedEarnings));
}

console.log("=== totals the screen prints under the table ===");
{
  const rows = m.payrollRows([
    row({ teacherId: "a", staffName: "Mai", totalAmountActual: 3600000, totalAmountProjected: 5400000 }),
    row({ teacherId: "b", staffName: "Linh", staffType: "teaching_assistant",
          totalAmountActual: 800000, totalAmountProjected: 1200000 }),
  ]);
  const earned = rows.reduce((n, r) => n + r.totalEarned, 0);
  const projected = rows.reduce((n, r) => n + r.totalProjected, 0);
  const toCome = rows.reduce((n, r) => n + r.projectedEarnings, 0);
  eq("earned adds up", earned, 4400000);
  eq("projected adds up", projected, 6600000);
  eq("  and the Total row's 'still to come' is the difference between them",
     projected - earned, toCome);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
