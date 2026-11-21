// Tuition audit phase 2: scripts/load-reconciliation-items.mjs, the loader.
//
// Builds a small workbook shaped like the fee spreadsheet (numbered family
// rows, formulas with cached values, a =SUM total, a "Real" row, a Summaries
// sheet), a mapping and the app's bills, and checks:
//   - only the numbered family rows count, and each month adds up to its =SUM;
//   - the comparison is per FAMILY (one sibling's row pays for both);
//   - each pattern A-F comes out of its rule, and the audit's own
//     classification overrides the rule;
//   - the items' differences tie to sheet total minus app recorded total;
//   - an unmapped sheet name stops it; a "month|name" key tells two children
//     with one nickname apart;
//   - the CLI refuses a mapping or output inside the repo, and a dry run
//     writes nothing.
// The SQL it emits is pasted into the real migration in
// reconciliation-register.test.mjs.
import JSZip from "jszip";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compare, readMapping, readPatterns, readWorkbook, sheetMonth, sheetRows, toSql } from "../load-reconciliation-items.mjs";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${!c && x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, `got ${g}, want ${w}`); };

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");

// --- a workbook ------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
async function workbook(sheets) {
  const zip = new JSZip();
  const strings = [];
  const si = (s) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1; } return i; };
  const names = Object.keys(sheets);
  names.forEach((name, n) => {
    const rows = sheets[name].map((cells, r) => `<row r="${r + 1}">${cells.map((c, k) => {
      if (c === null || c === undefined) return "";
      const ref = `${"ABCDEF"[k]}${r + 1}`;
      if (typeof c === "number") return `<c r="${ref}"><v>${c}</v></c>`;
      if (typeof c === "object") return `<c r="${ref}"><f>${esc(c.f)}</f>${c.v === undefined ? "" : `<v>${c.v}</v>`}</c>`;
      return `<c r="${ref}" t="s"><v>${si(c)}</v></c>`;
    }).join("")}</row>`).join("");
    zip.file(`xl/worksheets/sheet${n + 1}.xml`, `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`);
  });
  zip.file("xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
    names.map((nm, n) => `<sheet name="${esc(nm)}" sheetId="${n + 1}" r:id="rId${n + 1}"/>`).join("")}</sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${
    names.map((_, n) => `<Relationship Id="rId${n + 1}" Type="worksheet" Target="worksheets/sheet${n + 1}.xml"/>`).join("")}</Relationships>`);
  zip.file("xl/sharedStrings.xml", `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${esc(s)}</t></si>`).join("")}</sst>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const FAM_OAK = U(901), FAM_ELM = U(902);
const OAK1 = U(1), OAK2 = U(2), ELM = U(3), KAKA_A = U(4), KAKA_B = U(5), PINE = U(6), FIR = U(7), ASH = U(8), YEW = U(9);
const students = [
  { id: OAK1, family_id: FAM_OAK }, { id: OAK2, family_id: FAM_OAK }, { id: ELM, family_id: FAM_ELM },
  { id: KAKA_A, family_id: null }, { id: KAKA_B, family_id: null }, { id: PINE, family_id: null },
  { id: FIR, family_id: null }, { id: ASH, family_id: null }, { id: YEW, family_id: null },
];
const head = ["STT", "Name", "Amount"];
const buf = await workbook({
  T02: [head,
    [1, "Oak big", 2850000],                         // pays for both Oak children
    [2, "Elm", { f: "1500000-0", v: 1500000 }],      // paid in Feb (a formula, its cached value)
    [3, "Kaka", 1596000],                            // KAKA_A in Feb
    [4, "Pine", 1600000],                            // C: 1,596,000 bill
    [5, "Fir", 0],                                   // a zero row is skipped
    [null, null, { f: "SUM(C2:C6)", v: 7546000 }],
    [null, "Real", null], [null, "App", "1.000"]],
  T3: [head,
    [1, "Elm", 1500000],                             // D with Feb (app booked Feb+Mar here)
    [2, "Kaka", 1890000],                            // KAKA_B in March
    [3, "  Ash ", 1680000],                          // E: app recorded 1,260,000 = the re-priced bill
    [4, "Rồng", 1200000],                            // A: not in the app
    [5, "Kaka", 1000],                               // A month|name key overrides plain "Kaka"
    [6, "Yew", 756000],                              // F: recorded 2,650,000 on a 1,500,000 bill
    [null, null, { f: "SUM(C2:C7)", v: 7027000 }],
    [null, "Real", 7027000]],
  Summaries: [["Month", "Real", "App"], ["T3", 1, 2]],
});

const sheets = await readWorkbook(buf);
const { rows, totals } = sheetRows(sheets);
console.log("=== reading the sheet ===");
eq("months from sheet names", ["T10", "T01 ", "T 4", "T5", "Summaries"].map((n) => sheetMonth(n)), ["2025-10", "2026-01", "2026-04", "2026-05", null]);
eq("only numbered rows with cash", rows.map((r) => [r.month, r.name, r.amount]), [
  ["2026-02", "Oak big", 2850000], ["2026-02", "Elm", 1500000], ["2026-02", "Kaka", 1596000], ["2026-02", "Pine", 1600000],
  ["2026-03", "Elm", 1500000], ["2026-03", "Kaka", 1890000], ["2026-03", "Ash", 1680000], ["2026-03", "Rồng", 1200000], ["2026-03", "Kaka", 1000], ["2026-03", "Yew", 756000]]);
eq("each month adds up to its own =SUM", Object.values(totals).map((t) => t.rows === t.sheetTotal), [true, true]);

const mapping = {
  "Oak big": OAK1, Elm: ELM, Kaka: KAKA_A, "T3|Kaka": KAKA_B, Pine: PINE, Ash: ASH, Yew: YEW, "rồng": null,
};
// The second March "Kaka" row (1,000) is KAKA_B too: a month key covers every row of that name that month.
const lookup = readMapping(mapping);
eq("a month|name key wins over the plain name", [lookup("2026-02", "kaka"), lookup("2026-03", "KAKA"), lookup("2026-03", "Rồng"), lookup("2026-03", "Nobody")], [KAKA_A, KAKA_B, null, undefined]);
eq("the list form reads the same", readMapping([{ name: "Kaka", student_id: KAKA_A }, { month: "T3", name: "Kaka", student_id: KAKA_B }])("2026-03", "kaka"), KAKA_B);
// Two rows of one name in one month, two children: a month#row key wins over month|name and the name.
{
  const byRow = readMapping({ Kaka: KAKA_A, "T3|Kaka": KAKA_B, "2026-03#9": KAKA_A, "T 4#3": null });
  eq("a month#row key wins over month|name for that row only",
     [byRow("2026-03", "Kaka", 9), byRow("2026-03", "Kaka", 7), byRow("2026-03", "Kaka"), byRow("2026-04", "Kaka", 3), byRow("2026-04", "Kaka", 4)],
     [KAKA_A, KAKA_B, KAKA_B, null, KAKA_A]);
  eq("the list form takes a row too", readMapping([{ name: "Kaka", student_id: KAKA_A }, { month: "T3", row: 9, student_id: KAKA_B }])("2026-03", "Kaka", 9), KAKA_B);
  let bad = null;
  try { readMapping({ "#9": KAKA_A }); } catch (e) { bad = e.message; }
  ok("a row key without a month is refused", bad !== null, bad);
}
let threw = null;
try { readMapping({ Kaka: "not-an-id" }); } catch (e) { threw = e.message; }
ok("a mapping value that is not an id is refused", /not a student id/.test(threw ?? ""), threw);

const invoices = [
  { student_id: OAK1, month: "2026-02", recorded_payment: 2000000, total_amount: 2000000 },
  { student_id: OAK2, month: "2026-02", recorded_payment: 850000, total_amount: 900000 },   // family total 2,850,000 = sheet
  { student_id: ELM, month: "2026-02", recorded_payment: 0, total_amount: 1500000 },
  { student_id: ELM, month: "2026-03", recorded_payment: 3000000, total_amount: 1500000 },
  { student_id: KAKA_A, month: "2026-02", recorded_payment: 1596000, total_amount: 1596000 },
  { student_id: KAKA_B, month: "2026-03", recorded_payment: 1891000, total_amount: 1890000 },
  { student_id: PINE, month: "2026-02", recorded_payment: 1596000, total_amount: 1596000 },
  { student_id: FIR, month: "2026-02", recorded_payment: 1050000, total_amount: 1050000 },  // B
  { student_id: ASH, month: "2026-03", recorded_payment: 1260000, total_amount: 1260000 },  // E
  { student_id: YEW, month: "2026-03", recorded_payment: 2650000, total_amount: 1500000 },  // F
  { student_id: ASH, month: "2026-07", recorded_payment: 9, total_amount: 9 },              // outside the months
];
const months = Object.keys(totals);

console.log("=== per family, with a pattern ===");
const r = compare({ rows, lookup, invoices, students, months });
const got = Object.fromEntries(r.items.map((i) => [`${i.item_key}`, [i.pattern, i.difference]]));
eq("no unmapped rows", [r.unmapped.length, r.unknownStudents.length], [0, 0]);
ok("one sibling's row pays for the family: no Oak item", !Object.keys(got).some((k) => k.includes(FAM_OAK)));
eq("D: Elm's February booked on March", [got[`family:${FAM_ELM}:2026-02`], got[`family:${FAM_ELM}:2026-03`]], [["D", 1500000], ["D", -1500000]]);
eq("C: round cash against an odd bill", got[`student:${PINE}:2026-02`], ["C", 4000]);
eq("B: recorded with no cash on the sheet", got[`student:${FIR}:2026-02`], ["B", -1050000]);
eq("E: recorded the bill, not the cash", got[`student:${ASH}:2026-03`], ["E", 420000]);
const rong = r.items.find((i) => i.pattern === "A");
eq("A: paid, no student in the app", [rong.month, rong.difference, rong.student_ids, rong.family_id, /^sheet:[0-9a-f]{12}:2026-03$/.test(rong.item_key)], ["2026-03", 1200000, [], null, true]);
ok("the unmatched sheet name is the evidence, a matched one is not named", /"Rồng"/.test(rong.evidence) && !r.items.some((i) => i.pattern !== "A" && /Ash|Elm|Pine|Fir|Yew/.test(i.evidence)));
eq("F: anything else", got[`student:${YEW}:2026-03`], ["F", -1894000]);
eq("two rows of one child in a month add up (1,890,000 + 1,000 = what the app holds)", got[`student:${KAKA_B}:2026-03`], undefined);
eq("an item with no difference is not an item; Kaka in Feb is exact", got[`student:${KAKA_A}:2026-02`], undefined);
const itemsTotal = r.items.reduce((s, i) => s + i.difference, 0);
eq("the items tie to sheet minus app recorded", [itemsTotal, r.difference, r.sheetTotal, r.recordedTotal],
  [r.difference, 7546000 + 7027000 - (2000000 + 850000 + 0 + 3000000 + 1596000 + 1891000 + 1596000 + 1050000 + 1260000 + 2650000), 14573000, 15893000]);

const patterns = readPatterns("Name\tMonth\tPattern\tAmount\nAsh\tT3\tF - other\t420000\nnobody\t2026-03\tB\t1\n");
const r2 = compare({ rows, lookup, invoices, students, months, patterns });
eq("the audit's own classification overrides the rule", r2.items.find((i) => i.item_key === `student:${ASH}:2026-03`).pattern, "F");
ok("and says so", /the audit's classification/.test(r2.items.find((i) => i.item_key === `student:${ASH}:2026-03`).evidence));

const r3 = compare({ rows, lookup: readMapping({ ...mapping, "rồng": undefined, Pine: undefined }), invoices, students, months });
eq("unmapped names are listed", r3.unmapped.map((u) => u.name).sort(), ["Pine", "Rồng"]);
const r4 = compare({ rows, lookup: readMapping({ ...mapping, Pine: U(77) }), invoices, students, months });
eq("a mapping to a student the app does not have is listed", r4.unknownStudents.map((u) => u.name), ["Pine"]);

console.log("=== the SQL ===");
const sql = toSql(r.items);
ok("one INSERT, skipping rows already loaded", (sql.match(/INSERT INTO public\.tuition_reconciliation_items/g) ?? []).length === 1 && /ON CONFLICT \(audit_ref, item_key\) DO NOTHING/.test(sql));
ok("quotes are escaped", toSql([{ ...rong, evidence: "it's" }]).includes("'it''s'"));

console.log("=== the command ===");
const dir = mkdtempSync(join(tmpdir(), "recon-cli-"));
const sheetFile = join(dir, "fees.xlsx"), mapFile = join(dir, "mapping.json"), billsFile = join(dir, "bills.json"), outFile = join(dir, "items.sql");
writeFileSync(sheetFile, buf);
writeFileSync(mapFile, JSON.stringify(mapping));
writeFileSync(billsFile, JSON.stringify({ bills: { invoices, students } }));
const cli = (...args) => spawnSync(process.execPath, [join(repo, "scripts", "load-reconciliation-items.mjs"), ...args], { encoding: "utf8" });
const dry = cli("--sheet", sheetFile, "--mapping", mapFile, "--bills", billsFile);
ok("a dry run prints the items and ties", dry.status === 0 && /\(ties\)/.test(dry.stdout) && /Items \(dry run/.test(dry.stdout), dry.stderr + dry.stdout.slice(0, 400));
ok("and writes nothing", !existsSync(outFile));
const emit = cli("--sheet", sheetFile, "--mapping", mapFile, "--bills", billsFile, "--emit-sql", outFile);
ok("--emit-sql writes the SQL", emit.status === 0 && readFileSync(outFile, "utf8") === sql, emit.stderr);
const inRepo = cli("--sheet", sheetFile, "--mapping", join(repo, "mapping.json"), "--bills", billsFile);
ok("a mapping inside the repo is refused", inRepo.status === 2 && /outside the repo/.test(inRepo.stderr), inRepo.stderr);
const outRepo = cli("--sheet", sheetFile, "--mapping", mapFile, "--bills", billsFile, "--emit-sql", join(repo, "items.sql"));
ok("so is an output inside it", outRepo.status === 2 && !existsSync(join(repo, "items.sql")));
writeFileSync(mapFile, JSON.stringify({ ...mapping, Pine: undefined }));
const missing = cli("--sheet", sheetFile, "--mapping", mapFile, "--bills", billsFile, "--emit-sql", outFile + ".2");
ok("an unmapped name stops it before anything is written", missing.status === 1 && /unmapped: T02 row 5 "Pine"/.test(missing.stderr) && !existsSync(outFile + ".2"), missing.stderr);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
