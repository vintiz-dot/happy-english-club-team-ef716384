// The reconciliation register screen's logic (src/lib/reconciliation.ts):
// the totals that tie to the audit, the filters, which decisions an item is
// offered, and the legs a decision sends to decide_tuition_reconciliation_item.
// The RPC side of the same rules is reconciliation-register.test.mjs.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/reconciliation.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "reconciliation-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { AUDIT_DIFFERENCE, allowedDecisions, buildLegs, filterItems, legsProblem, totals } = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, `got ${g}, want ${w}`); };

const it = (o) => ({ status: "open", student_ids: ["k1"], sheet_amount: 0, app_recorded: 0, difference: 0, month: "2026-04", pattern: "F", ...o });
const B = it({ pattern: "B", sheet_amount: 0, app_recorded: 1050000, difference: -1050000 });
const A = it({ pattern: "A", student_ids: [], sheet_amount: 1200000, difference: 1200000, month: "2026-03" });
const C = it({ pattern: "C", sheet_amount: 1600000, app_recorded: 1596000, difference: 4000, status: "decided" });
const D = it({ pattern: "D", sheet_amount: 1500000, app_recorded: 0, difference: 1500000, month: "2026-02" });

console.log("=== totals ===");
{
  const t = totals([B, A, C, D]);
  eq("sums of the facts as loaded", [t.items, t.open, t.decided, t.sheet, t.recorded, t.difference], [4, 3, 1, 4300000, 2646000, 1654000]);
  eq("per pattern, net and gross", [t.byPattern.B, t.byPattern.C, t.byPattern.E], [{ items: 1, net: -1050000, gross: 1050000 }, { items: 1, net: 4000, gross: 4000 }, { items: 0, net: 0, gross: 0 }]);
  ok("does not tie to the audit", !t.ties);
  ok("ties when the register's difference is the audit's", totals([it({ difference: AUDIT_DIFFERENCE, app_recorded: 14174001 })]).ties);
  eq("the audit's figure", AUDIT_DIFFERENCE, -14174001);
  eq("numeric strings from PostgREST bigints still add", totals([it({ difference: "-5", sheet_amount: "1", app_recorded: "6" })]).difference, -5);
}

console.log("=== filters ===");
eq("by month", filterItems([B, A, C, D], { month: "2026-04" }).length, 2);
eq("by pattern and status", filterItems([B, A, C, D], { pattern: "C", status: "open" }).length, 0);
eq("no filter keeps all", filterItems([B, A, C, D], {}).length, 4);

console.log("=== what an item is offered ===");
eq("B: sheet missed, not received, wrong month", allowedDecisions(B), ["sheet_missed", "not_received", "wrong_month"]);
eq("A with no child: sheet missed or phase 4 only", allowedDecisions(A), ["sheet_missed", "refer_phase4"]);
eq("C (open): rounding too, and no \"not received\" when the sheet holds more", allowedDecisions({ ...C, status: "open" }), ["sheet_missed", "wrong_month", "rounding_accepted"]);
eq("D: the app holds less than the sheet, so not received is not offered", allowedDecisions(D), ["sheet_missed", "wrong_month"]);
eq("a decided item is offered nothing", allowedDecisions(C), []);

console.log("=== the legs ===");
const fam = it({ student_ids: ["k1", "k2"], app_recorded: 3000000, sheet_amount: 1800000, difference: -1200000 });
eq("not received: a correction per child with an amount", buildLegs(fam, "not_received", { k1: 200000, k2: 0 }),
  [{ student_id: "k1", month: "2026-04", kind: "correction", amount: 200000 }]);
eq("wrong month, the money belongs to the item's month", buildLegs(D, "wrong_month", { k1: 1500000 }, { otherMonth: "2026-03", itemMonthIs: "belongs" }),
  [{ student_id: "k1", month: "2026-03", kind: "correction", amount: 1500000 }, { student_id: "k1", month: "2026-02", kind: "payment", amount: 1500000 }]);
eq("wrong month, the money sits on the item's month", buildLegs(D, "wrong_month", { k1: 5 }, { otherMonth: "2026-03", itemMonthIs: "booked" }).map((l) => [l.month, l.kind]),
  [["2026-02", "correction"], ["2026-03", "payment"]]);
eq("no other month, no legs", buildLegs(D, "wrong_month", { k1: 5 }, { otherMonth: "2026-02", itemMonthIs: "booked" }), []);
eq("no money for the others", buildLegs(B, "sheet_missed", { k1: 5 }), []);

const holds = { "k1|2026-04": 2000000, "k2|2026-04": 1000000, "k1|2026-03": 3000000, "k1|2026-02": 10 };
ok("over what the bill holds", /more than the 1\.000\.000 ₫ that bill holds/.test(legsProblem(fam, "not_received", buildLegs(fam, "not_received", { k2: 1000001 }), holds) ?? ""));
ok("over the gap", /more than the 1\.200\.000 ₫ the app holds over the sheet/.test(legsProblem(fam, "not_received", buildLegs(fam, "not_received", { k1: 1300000 }), holds) ?? ""));
eq("within both", legsProblem(fam, "not_received", buildLegs(fam, "not_received", { k1: 200000, k2: 1000000 }), holds), null);
ok("a payment on a month with no bill", /no 2026-05 bill/.test(legsProblem(D, "wrong_month", buildLegs(D, "wrong_month", { k1: 1 }, { otherMonth: "2026-05", itemMonthIs: "booked" }), holds) ?? ""));
ok("nothing typed", /Type the amount/.test(legsProblem(fam, "not_received", [], holds) ?? ""));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
