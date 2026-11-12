// The teacher payroll screens' whole data layer (T5).
//
//   node scripts/pgtest/teacher-payroll-view.test.mjs
//
// /teacher/payroll (with its calendar) and the admin's /teachers/:id Payroll
// tab used to price lessons in the browser at the teacher row's rate of
// today. They now read calculate-payroll and src/lib/teacherPayrollView.ts
// reshapes the answer. This drives the real module: an open month, a closed
// month with and without corrections since, a function not yet redeployed,
// and the payrollData[0] trap. It also checks, from the source, that none of
// the three screens can price a lesson any more.
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

async function loadTs(rel, name, replace = {}) {
  let src = readFileSync(resolve(repo, rel), "utf8");
  for (const [from, to] of Object.entries(replace)) src = src.replace(from, to);
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
  const mod = await import(pathToFileURL(out).href);
  try { unlinkSync(out); } catch { /* ignore */ }
  return mod;
}

// teacherPayrollView imports ./payrollSessions (which imports nothing).
const sessionsTmp = resolve(tmpdir(), `payrollSessions.tpv.${process.pid}.mjs`);
writeFileSync(sessionsTmp, (await transform(readFileSync(resolve(repo, "src/lib/payrollSessions.ts"), "utf8"), { loader: "ts", format: "esm" })).code);
const m = await loadTs("src/lib/teacherPayrollView.ts", "teacherPayrollView", {
  'from "./payrollSessions"': `from ${JSON.stringify(pathToFileURL(sessionsTmp).href)}`,
});

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  ok(n, g === w, `got ${g}, want ${w}`);
};

const T = "t-0001";
const s = (id, date, status, amount, over = {}) => ({
  id, date, start_time: "18:00:00", end_time: "19:30:00", status, class_id: over.class_id ?? "c1",
  classes: { name: over.className ?? "Starters 1" }, minutes: 90, amount,
  payRateType: "hourly", rateVnd: 200000, ...over,
});

/** A response row as the T5 function builds one, for an OPEN month. */
const held = [s("s1", "2026-10-06", "Held", 300000), s("s2", "2026-10-06", "Held", 300000, { class_id: "c2", className: "Movers 2" }), s("s3", "2026-10-20", "Held", 450000, { rateVnd: 300000 })];
const scheduled = [s("s4", "2026-10-29", "Scheduled", 450000, { rateVnd: 300000 })];
const row = (over = {}) => ({
  teacherId: T, staffType: "teacher",
  sessionsCountActual: 3, sessionsCountProjected: 4,
  totalHoursActual: 4.5, totalMinutesActual: 270,
  totalAmountActual: 1050000, totalAmountProjected: 1500000,
  discrepancyCount: 1, varianceAmountProjected: 50000,
  sessionDetailsActual: held, sessionDetailsProjected: [...held, ...scheduled],
  lostIncome: { sessionsCount: 1, totalMinutes: 90, totalAmount: 300000, quantityLabel: "1.5 h" },
  ...over,
});
const view = (resp, id = T) => m.teacherPayrollView(resp, id);

console.log("=== an open month ===");
{
  const v = view({ locked: false, payrollData: [row()] });
  eq("found", v.found, true);
  eq("not closed", v.closed, false);
  eq("earned is the function's totalAmountActual", v.earned, 1050000);
  eq("projected total is the function's totalAmountProjected", v.projectedTotal, 1500000);
  eq("still to come = projected - actual", v.stillToCome, 450000);
  eq("held / scheduled counts", [v.heldSessions, v.scheduledSessions], [3, 1]);
  eq("hours", v.totalHours, 4.5);
  eq("variance passed through", [v.discrepancyCount, v.varianceAmount], [1, 50000]);
  eq("every lesson's amount is the function's", v.sessions.map((x) => x.amount), [300000, 300000, 450000, 450000]);
  eq("each lesson's own rate, not today's", v.sessions.map((x) => x.rateVnd), [200000, 200000, 300000, 300000]);
  eq("counted = the function's actual set", v.sessions.map((x) => x.counted), [true, true, true, false]);
  eq("day totals sum only paid lessons", [...v.earnedByDate.entries()], [["2026-10-06", 600000], ["2026-10-20", 450000]]);
  const dayTotal = [...v.earnedByDate.values()].reduce((n, x) => n + x, 0);
  eq("the calendar's days add up to Amount Earned", dayTotal, v.earned);
  eq("lost income is the function's", v.lostIncome, { amount: 300000, sessions: 1, quantityLabel: "1.5 h" });
  eq("classes grouped from the same lessons, largest first",
    v.classes.map((c) => [c.name, c.held, c.scheduled, c.total]),
    [["Starters 1", 2, 1, 3], ["Movers 2", 1, 0, 1]]);
}

console.log("=== a closed month, nothing corrected since ===");
{
  const v = view({ locked: true, payrollData: [row({ live: { totalAmountActual: 1050000, sessionsCountActual: 3 }, liveTotalAmountActual: 1050000 })] });
  eq("closed", v.closed, true);
  eq("frozen = live, so per-lesson figures are shown", v.perSessionAvailable, true);
  eq("rates shown too", v.sessions.map((x) => x.rateVnd), [200000, 200000, 300000, 300000]);
  eq("earned is the frozen figure", v.earned, 1050000);
  eq("amounts shown", v.sessions.map((x) => x.amount), [300000, 300000, 450000, 450000]);
}

console.log("=== a closed month, a lesson corrected after the close ===");
{
  // Closed at 750,000 for 2 lessons; recomputed now it is 1,050,000 for 3.
  const v = view({ locked: true, payrollData: [row({
    totalAmountActual: 750000, sessionsCountActual: 2, totalHoursActual: 3,
    live: { totalAmountActual: 1050000, sessionsCountActual: 3 }, liveTotalAmountActual: 1050000,
  })] });
  eq("closed", v.closed, true);
  eq("the teacher sees what the month was PAID at", v.earned, 750000);
  eq("held count is the frozen one", v.heldSessions, 2);
  eq("hours are the frozen ones", v.totalHours, 3);
  eq("per-lesson figures withheld: recomputed ones would not add up to what was paid", v.perSessionAvailable, false);
  eq("every amount is 'figure unavailable'", v.sessions.map((x) => x.amount), [null, null, null, null]);
  eq("and so is every rate (the CSV prints neither)", v.sessions.map((x) => [x.rateVnd, x.payRateType]), [[null, null], [null, null], [null, null], [null, null]]);
  eq("every day total is 'figure unavailable', never a recomputed sum", [...v.earnedByDate.values()], [null, null]);
  eq("still to come is set against the LIVE actuals (1,500,000 - 1,050,000)", v.stillToCome, 450000);
  eq("scheduled count against the live count (4 - 3)", v.scheduledSessions, 1);
  eq("projected total = paid + still to come", v.projectedTotal, 1200000);
  // What the old screen printed: projected - frozen = 750,000 'still to come'.
  ok("the old '+X from N scheduled' would have said +750,000 from 2", 1500000 - 750000 === 750000 && 4 - 2 === 2);
}

console.log("=== a closed month, older deploy (liveTotalAmountActual only) ===");
{
  const v = view({ locked: true, payrollData: [row({ totalAmountActual: 750000, sessionsCountActual: 2, liveTotalAmountActual: 1050000 })] });
  eq("closed", v.closed, true);
  eq("earned frozen", v.earned, 750000);
  eq("live count read off the actual detail; drift withholds amounts", v.perSessionAvailable, false);
}

console.log("=== a locked month in which this person has no frozen line ===");
{
  const v = view({ locked: true, payrollData: [row()] });
  eq("not treated as closed: the figures are live ones", v.closed, false);
  eq("but the month is known to be closed (the screen says so beside the live figure)", v.monthLocked, true);
  eq("an open month is not monthLocked", view({ locked: false, payrollData: [row()] }).monthLocked, false);
  eq("a closed month with a frozen line is monthLocked", view({ locked: true, payrollData: [row({ liveTotalAmountActual: 1050000 })] }).monthLocked, true);
  eq("amounts shown", v.sessions.every((x) => x.amount !== null), true);
}

console.log("=== the function not yet redeployed (no T5 fields) ===");
{
  const old = row({
    lostIncome: undefined,
    sessionDetailsActual: held.map(({ payRateType, rateVnd, ...rest }) => rest),
    sessionDetailsProjected: [...held, ...scheduled].map(({ payRateType, rateVnd, ...rest }) => rest),
  });
  const v = view({ locked: false, payrollData: [old] });
  eq("lost income: figure unavailable, not priced in the browser", v.lostIncome, null);
  eq("per-lesson rate: unavailable", v.sessions.map((x) => x.rateVnd), [null, null, null, null]);
  eq("per-lesson amounts still the function's (it has always sent them)", v.sessions.map((x) => x.amount), [300000, 300000, 450000, 450000]);
  eq("headline unchanged", [v.earned, v.projectedTotal], [1050000, 1500000]);
}

console.log("=== a very old deploy: no sessionDetailsActual ===");
{
  const v = view({ locked: false, payrollData: [row({ sessionDetailsActual: undefined })] });
  eq("which lessons are paid falls back to payrollSessions' rule (Held)", v.sessions.map((x) => x.counted), [true, true, true, false]);
}

console.log("=== a lesson without an amount ===");
{
  const v = view({ locked: false, payrollData: [row({ sessionDetailsActual: [held[0], { ...held[1], amount: null }, held[2]], sessionDetailsProjected: [held[0], { ...held[1], amount: null }, held[2]] })] });
  eq("that lesson is 'figure unavailable'", v.sessions.map((x) => x.amount), [300000, null, 450000]);
  eq("and so is its day, rather than a partial sum", v.earnedByDate.get("2026-10-06"), null);
  eq("other days unaffected", v.earnedByDate.get("2026-10-20"), 450000);
}

console.log("=== whose row (the payrollData[0] trap) ===");
{
  const ta = { ...row(), teacherId: "ta-1", staffType: "teaching_assistant", totalAmountActual: 99 };
  // An older deploy answering an admin about an archived teacher with no
  // lessons: the teacher is dropped and every TA is appended.
  const v = view({ locked: false, payrollData: [ta] });
  eq("a TA's row is never shown as the teacher's", v.found, false);
  eq("and nothing of it leaks into the figures", v.earned, 0);
  const v2 = view({ locked: false, payrollData: [ta, row()] });
  eq("the teacher's row is found by id wherever it is", v2.earned, 1050000);
  eq("no response at all", view(null).found, false);
  eq("an empty payrollData", view({ payrollData: [] }).found, false);
  const anon = row(); delete anon.teacherId;
  eq("a lone row with no id at all (very old deploy) is used", view({ payrollData: [anon] }).found, true);
}

console.log("=== nothing on these screens can price a lesson ===");
{
  const files = [
    "src/lib/teacherPayrollView.ts",
    "src/components/teacher/TeacherPayrollCalendar.tsx",
    "src/pages/TeacherPayroll.tsx",
    "src/components/admin/teacher/TeacherProfilePayroll.tsx",
  ];
  for (const f of files) {
    const src = readFileSync(resolve(repo, f), "utf8");
    const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    ok(`${f}: imports neither payRate nor sessionDuration`, !/from\s+["']@\/lib\/(payRate|sessionDuration)["']|from\s+["']\.\/(payRate|sessionDuration)["']/.test(code));
    ok(`${f}: no sessionPayVnd / totalPayVnd / rate columns`, !/sessionPayVnd|totalPayVnd|hourly_rate_vnd|per_session_rate_vnd|rate_override_vnd/.test(code));
  }
  const page = readFileSync(resolve(repo, "src/pages/TeacherPayroll.tsx"), "utf8");
  ok("TeacherPayroll no longer queries cancelled sessions itself", !/\.eq\("status",\s*"Canceled"\)/.test(page));
  ok("TeacherPayroll notes a closed month with no frozen line beside the live figure", /monthLocked && !view\.closed/.test(page));
  const profile = readFileSync(resolve(repo, "src/components/admin/teacher/TeacherProfilePayroll.tsx"), "utf8");
  ok("TeacherProfilePayroll does the same", /monthLocked && !payrollData\.closed/.test(profile));
  ok("TeacherProfilePayroll no longer queries sessions itself", !/\.from\("sessions"\)/.test(profile));
}

try { unlinkSync(sessionsTmp); } catch { /* ignore */ }
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
