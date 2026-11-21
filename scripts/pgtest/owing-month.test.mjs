// Which month a payment is FOR (src/lib/owingMonth.ts): the oldest month a
// child, or a family, still owes. Nov 2026 tuition audit, pattern D: a
// February debt paid in March was booked on March because the screen showed
// March. The screens now SUGGEST the owing month; the admin still confirms.
//
// The bills here carry carry_out_debt worked out the way the trigger does it
// (refresh_invoice_carry, 20261117110000): the running sum of
// recorded_payment - total_amount before the month is the carry in, and the
// balance after the month is charge - carry in - recorded, floored at 0.
// Also holds every payment screen to the helper, and the confirmation field
// to never confirming on its own.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/owingMonth.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "owing-month-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { owingMonths, oldestOwingMonth, familyOldestOwingMonth, earlierOwing, owingMonthLine, owingRowNote, balanceAfter } =
  await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`); };

/** Bills as the trigger leaves them. rows: [month, total_amount, recorded_payment] */
function bills(rows) {
  let running = 0; // sum of recorded - total before this month
  return rows.map(([month, total, recorded]) => {
    const carryIn = running;
    running += recorded - total;
    // paid_amount is deliberately nonsense: it must never be read.
    return { month, recorded_payment: recorded, carry_out_debt: Math.max(0, total - carryIn - recorded), paid_amount: 99_000_000 };
  });
}

console.log("one child");
eq("nothing owed", oldestOwingMonth(bills([["2026-01", 1_000_000, 1_000_000], ["2026-02", 1_000_000, 1_000_000]])), null);
eq("no bills", oldestOwingMonth([]), null);
eq("null bills", oldestOwingMonth(null), null);
eq("pattern D: Feb unpaid, March shown - Feb is suggested",
  oldestOwingMonth(bills([["2026-01", 1_000_000, 1_000_000], ["2026-02", 1_260_000, 0], ["2026-03", 1_100_000, 0]])),
  { month: "2026-02", amount: 1_260_000 });
eq("the oldest month wins over a later one",
  owingMonths(bills([["2026-01", 500_000, 0], ["2026-02", 700_000, 700_000], ["2026-03", 900_000, 0]])),
  [{ month: "2026-01", amount: 500_000 }, { month: "2026-03", amount: 900_000 }]);
eq("a part-paid month owes the rest",
  oldestOwingMonth(bills([["2026-01", 1_000_000, 400_000], ["2026-02", 1_000_000, 0]])),
  { month: "2026-01", amount: 600_000 });
eq("a later month's payment beyond its own charge pays the older debt first",
  owingMonths(bills([["2026-01", 1_000_000, 0], ["2026-02", 1_000_000, 1_600_000], ["2026-03", 1_000_000, 0]])),
  [{ month: "2026-01", amount: 400_000 }, { month: "2026-03", amount: 1_000_000 }]);
eq("an old debt cleared later is no longer suggested",
  oldestOwingMonth(bills([["2026-01", 1_000_000, 0], ["2026-02", 1_000_000, 2_000_000], ["2026-03", 1_000_000, 0]])),
  { month: "2026-03", amount: 1_000_000 });
eq("pattern D already booked on March (year adds up): nothing is owed",
  oldestOwingMonth(bills([["2026-02", 1_260_000, 0], ["2026-03", 1_100_000, 2_360_000]])), null);
eq("credit-covered month owes nothing",
  oldestOwingMonth(bills([["2026-01", 1_000_000, 3_000_000], ["2026-02", 1_000_000, 0], ["2026-03", 1_000_000, 0]])), null);
eq("credit runs out: the month it runs out in owes the rest",
  oldestOwingMonth(bills([["2026-01", 1_000_000, 2_500_000], ["2026-02", 1_000_000, 0], ["2026-03", 1_000_000, 0]])),
  { month: "2026-03", amount: 500_000 });
eq("bills in any order, bad months ignored",
  oldestOwingMonth([...bills([["2026-01", 1_000_000, 0], ["2026-02", 1_000_000, 0]])].reverse().concat([{ month: "2026-13", carry_out_debt: 5 }])),
  { month: "2026-01", amount: 1_000_000 });
eq("the calculator's payable wins over carry_out_debt",
  balanceAfter({ month: "2026-02", payable: 1_500_000, recorded_payment: 500_000, carry_out_debt: 0 }), 1_000_000);
eq("payable below the payment is credit, not debt",
  balanceAfter({ month: "2026-02", payable: 500_000, recorded_payment: 900_000, carry_out_debt: 7 }), 0);
eq("paid_amount alone never makes a month owe or paid",
  oldestOwingMonth([{ month: "2026-02", paid_amount: 0, total_amount: 1_000_000 }]), null);

console.log("family");
const ann = bills([["2026-01", 800_000, 800_000], ["2026-02", 800_000, 0], ["2026-03", 800_000, 0]]);
const ben = bills([["2026-01", 600_000, 0], ["2026-02", 600_000, 600_000], ["2026-03", 600_000, 0]]);
const cat = bills([["2026-01", 500_000, 500_000], ["2026-02", 500_000, 200_000]]);
eq("the oldest month across siblings, only the children who owe it",
  familyOldestOwingMonth({ ann, ben, cat }),
  { month: "2026-01", amount: 600_000, children: [{ studentId: "ben", amount: 600_000 }] });
eq("siblings owing the same month are summed",
  familyOldestOwingMonth({ ann, cat }),
  { month: "2026-02", amount: 1_100_000, children: [{ studentId: "ann", amount: 800_000 }, { studentId: "cat", amount: 300_000 }] });
eq("a family that owes nothing",
  familyOldestOwingMonth({ a: bills([["2026-01", 1, 1]]), b: [] }), null);
eq("no children", familyOldestOwingMonth({}), null);

console.log("suggestion");
const feb = { month: "2026-02", amount: 1_260_000 };
eq("an earlier month is suggested", earlierOwing(feb, "2026-03"), feb);
eq("the month on screen is not suggested", earlierOwing(feb, "2026-02"), null);
eq("a later month is not suggested", earlierOwing(feb, "2026-01"), null);
eq("no month on screen, no suggestion", earlierOwing(feb, ""), null);
eq("the line", owingMonthLine(feb), "Still owes 1.260.000 ₫ for 2026-02. Is this payment for that month?");
ok("the row note says how to record it", /switch the tuition month to 2026-02/.test(owingRowNote(feb)));

console.log("screens");
const src = (p) => readFileSync(resolve(repo, p), "utf8");
const helper = src("src/lib/owingMonth.ts");
const loader = src("src/hooks/useOwingMonths.ts");
ok("the helper reads no paid_amount", !/\.paid_amount|paid_amount\s*[:?]/.test(helper));
ok("the loader selects no paid_amount", !/select\([^)]*paid_amount/.test(loader) && /carry_out_debt/.test(loader));
ok("the helper imports nothing (pure)", !/^import /m.test(helper));
const conf = src("src/components/admin/TuitionMonthConfirmation.tsx");
ok("the confirmation hook reads the owing bills", /useOwingBills\(/.test(conf) && /familyOldestOwingMonth\(/.test(conf) && /earlierOwing\(/.test(conf));
const sets = [...conf.matchAll(/setConfirmedMonth\(([^)]*)\)/g)].map((m) => m[1]);
ok("nothing auto-confirms: confirmedMonth is only ever cleared", sets.length > 0 && sets.every((a) => a === '""'), JSON.stringify(sets));
ok("the confirmation is still the admin's own pick", /onChange=\{setConfirmedMonth\}/.test(conf));
ok("the suggestion button only switches the month", /onClick=\{\(\) => onUseMonth\(owing\.month\)\}/.test(conf) && !/onUseMonth[^\n]*setConfirmedMonth/.test(conf));
ok("a month change still resets the confirmation", /useEffect\(\(\) => \{ setConfirmedMonth\(""\); \}, \[month, open\]\)/.test(conf));

const dialogs = {
  RecordPaymentDialog: /useTuitionMonthConfirmation\(month, open, \{[\s\S]*?studentIds: item\?\.student_id/,
  FamilyPaymentModal: /useTuitionMonthConfirmation\(formData\.month, open, \{[\s\S]*?studentIds:[\s\S]*?onUseMonth/,
  SmartFamilyPaymentModal: /useTuitionMonthConfirmation\(formData\.month, open, \{[\s\S]*?studentIds: siblings\.map[\s\S]*?onUseMonth/,
  RecordedPaymentManager: /useTuitionMonthConfirmation\(selectedMonth, !!editingInvoice, \{[\s\S]*?studentIds[\s\S]*?useTuitionMonthConfirmation\(selectedMonth, !!reversingInvoice, \{[\s\S]*?studentIds/,
};
for (const [name, re] of Object.entries(dialogs)) ok(`${name} passes the child/family to the suggestion`, re.test(src(`src/components/admin/${name}.tsx`)));
for (const name of ["FamilyPaymentModal", "SmartFamilyPaymentModal", "RecordedPaymentManager"]) {
  const s = src(`src/components/admin/${name}.tsx`);
  const handlers = [...s.matchAll(/onUseMonth: \(m\) => ([^\n]*)/g)].map((m) => m[1]);
  ok(`${name}: "Use month" changes the month and confirms nothing`, handlers.length > 0 && handlers.every((h) => /setFormData|setSelectedMonth/.test(h) && !/confirm/i.test(h)), JSON.stringify(handlers));
}
for (const name of ["QuickPayPanel", "BatchPaymentDialog", "BatchFamilyPaymentModal"]) {
  const s = src(`src/components/admin/${name}.tsx`);
  ok(`${name} marks rows owing an earlier month`, /earlierOwing\(/.test(s) && /owingRowNote\(earlier\)/.test(s));
  ok(`${name} moves no money for it (no amount set from the owing figure)`, !/earlier\.amount/.test(s));
}
// Every screen that confirms a month is covered above; a new one must be added here.
const users = ["BatchFamilyPaymentModal", "BatchPaymentDialog", "FamilyPaymentModal", "QuickPayPanel", "RecordedPaymentManager", "RecordPaymentDialog", "SmartFamilyPaymentModal"];
for (const name of users) ok(`${name} still confirms the month`, /useTuitionMonthConfirmation\(/.test(src(`src/components/admin/${name}.tsx`)) && /\.confirmed\)/.test(src(`src/components/admin/${name}.tsx`)));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
