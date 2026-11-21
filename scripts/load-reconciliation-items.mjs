#!/usr/bin/env node
// Tuition audit, phase 2: works out the reconciliation register's items
// (supabase/migrations/20261121100000_tuition_reconciliation_register.sql).
//
// It compares the fee spreadsheet's cash with the app's
// invoices.recorded_payment PER FAMILY PER MONTH (families pay once for all
// their children, and the sheet puts the amount on one child's row), keeps
// every family-month where the two differ, and labels each with the audit's
// pattern A-F. It never writes to the database.
//
//   node scripts/load-reconciliation-items.mjs \
//     --sheet "C:\Users\...\Tution fee 2025-2026.xlsx" \
//     --mapping "C:\Users\...\audit\mapping.json" \
//     [--bills bills.json] [--patterns categories.tsv] [--emit-sql "C:\Users\...\items.sql"]
//
//   Dry run by default: prints the month totals, the pattern totals and every
//   item it would insert. --emit-sql writes the INSERTs to a file for the
//   owner to paste into the Supabase SQL editor (ON CONFLICT DO NOTHING, so a
//   second paste adds only what is new).
//
// INPUTS, all kept OUTSIDE the repo (they name children); the script refuses
// a mapping or an output path inside it.
//   --sheet     the workbook. Month sheets are named T10, T11, T12, T01, T02,
//               T3, T 4, T5 (Oct = 10 .. Dec of the first year, Jan .. Sep of
//               the next; --year 2025 is the first year). A family row has a
//               number in column A, a name in B and the cash in C (the cached
//               value of a formula). Each month's rows must add up to the
//               sheet's own =SUM total, or the script stops.
//   --mapping   the owner's sheet name -> student id file, as JSON, either
//                 { "<sheet name>": "<student uuid>" | null, "T10|<name>": ... }
//               (a "<month>|<name>" key, month as T10 or 2025-10, wins over a
//               plain name: two children with one nickname are told apart per
//               month), or a list [{ "month"?: ..., "name": ..., "student_id": ... }].
//               null means "not in the app" - a pattern A child. Every name
//               on the sheet must be mapped; the script lists the ones that
//               are not and stops.
//   bills       read-only. Either --bills <file> (JSON { invoices: [...],
//               students: [...] }, from the query --print-bills-sql prints),
//               or SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in the environment,
//               read with GET requests only.
//   --patterns  optional: the audit's own classification (data/categories.tsv).
//               Tab-separated with a header holding "month", "pattern" and
//               one of "family_id" / "student_id" / "name"; a row there
//               overrides the rule below for that family-month.
//
// THE RULES (report section 2 and 4), in order, for a family-month whose
// sheet cash differs from the app's recorded payment:
//   A  cash on the sheet, no bill for the family in the app that month;
//   C  differs by at most 10,000 dong (round cash against an odd bill);
//   D  an opposite difference in another month within two months nets it to
//      within 10,000 (paid late, booked on the next month's bill);
//   B  the app records a payment and the sheet has no cash;
//   E  the app recorded exactly the bill, and the sheet's cash is different;
//   F  anything else.
// The sum of the differences over every family-month ties to the sheet total
// minus the app's recorded total for those months (-14,174,001 on 16 Nov
// 2026 for Oct 2025 - May 2026); the script prints both.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, isAbsolute } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const AUDIT_REF = "tuition-audit-2026-11-16";
export const ROUNDING = 10000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------- workbook

const unxml = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&");
const textOf = (xml) => unxml([...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(""));

/** Reads every sheet's cells: { sheetName: Map("C5" -> { v, f }) }. Cached values only. */
export async function readWorkbook(buffer) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const read = async (p) => { const f = zip.file(p); return f ? f.async("string") : null; };
  const wb = await read("xl/workbook.xml");
  const rels = await read("xl/_rels/workbook.xml.rels");
  if (!wb || !rels) throw new Error("Not an .xlsx workbook.");
  const shared = [];
  const ss = await read("xl/sharedStrings.xml");
  if (ss) for (const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)) shared.push(textOf(m[1]));
  const targets = new Map([...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1], t = /Target="([^"]+)"/.exec(m[0])?.[1];
    return [id, t?.replace(/^\/?xl\//, "").replace(/^\//, "")];
  }));
  const sheets = {};
  for (const m of wb.matchAll(/<sheet\b[^>]*>/g)) {
    const name = unxml(/name="([^"]*)"/.exec(m[0])[1]);
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1];
    const xml = await read(`xl/${targets.get(rid)}`);
    const cells = new Map();
    if (xml) for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /r="([A-Z]+\d+)"/.exec(c[1])?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(c[1])?.[1];
      const body = c[2] ?? "";
      const f = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
      const raw = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1];
      let v = null;
      if (type === "s") v = raw == null ? null : shared[Number(raw)];
      else if (type === "inlineStr") v = textOf(body);
      else if (type === "str" || type === "e") v = raw == null ? null : unxml(raw);
      else if (type === "b") v = raw === "1";
      else if (raw != null) v = Number(raw);
      cells.set(ref, { v, f: f == null ? null : unxml(f) });
    }
    sheets[name] = cells;
  }
  return sheets;
}

/** "T10" -> "2025-10", "T01 " -> "2026-01", "T 4" -> "2026-04"; null for other sheets. */
export function sheetMonth(name, firstYear = 2025) {
  const m = /^\s*T\s*0?(\d{1,2})\s*$/i.exec(name);
  if (!m) return null;
  const n = Number(m[1]);
  if (n < 1 || n > 12) return null;
  return `${n >= 9 ? firstYear : firstYear + 1}-${String(n).padStart(2, "0")}`;
}

/** The family rows of each month sheet, checked against the sheet's own =SUM total. */
export function sheetRows(sheets, firstYear = 2025) {
  const rows = [], totals = {};
  for (const [name, cells] of Object.entries(sheets)) {
    const month = sheetMonth(name, firstYear);
    if (!month) continue;
    let sum = 0, sheetTotal = null;
    const last = Math.max(0, ...[...cells.keys()].map((r) => Number(/\d+/.exec(r)[0])));
    for (let r = 1; r <= last; r++) {
      const a = cells.get(`A${r}`)?.v, b = cells.get(`B${r}`)?.v, c = cells.get(`C${r}`);
      if (c?.f && /^\s*SUM\s*\(/i.test(c.f) && typeof c.v === "number" && sheetTotal == null) sheetTotal = c.v;
      if (typeof a !== "number" || typeof b !== "string" || !b.trim()) continue;
      const amount = typeof c?.v === "number" ? Math.round(c.v) : 0;
      if (!amount) continue;
      rows.push({ month, sheet: name, row: r, name: b.trim(), amount });
      sum += amount;
    }
    totals[month] = { sheet: name, rows: sum, sheetTotal };
  }
  return { rows, totals };
}

// ----------------------------------------------------------------- mapping

export const normName = (s) => String(s).normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
const normMonth = (m, firstYear) => (/^\d{4}-\d{2}$/.test(String(m).trim()) ? String(m).trim() : sheetMonth(String(m), firstYear));

/** Returns lookup(month, name) -> uuid | null (not in the app) | undefined (unmapped). */
export function readMapping(json, firstYear = 2025) {
  const byName = new Map(), byMonth = new Map();
  const put = (month, name, id) => {
    if (id === undefined) return;
    if (id !== null && !(typeof id === "string" && UUID.test(id))) throw new Error(`Mapping for "${name}" is not a student id or null: ${JSON.stringify(id)}`);
    if (month) byMonth.set(`${month}|${normName(name)}`, id); else byName.set(normName(name), id);
  };
  if (Array.isArray(json)) {
    for (const e of json) put(e.month ? normMonth(e.month, firstYear) : null, e.name, e.student_id ?? null);
  } else {
    for (const [k, id] of Object.entries(json)) {
      const bar = k.indexOf("|");
      const month = bar > 0 ? normMonth(k.slice(0, bar), firstYear) : null;
      put(month, bar > 0 && month ? k.slice(bar + 1) : k, id);
    }
  }
  return (month, name) => {
    const k = `${month}|${normName(name)}`;
    if (byMonth.has(k)) return byMonth.get(k);
    if (byName.has(normName(name))) return byName.get(normName(name));
    return undefined;
  };
}

/** The audit's own pattern per family-month, from a TSV with month, pattern and family_id/student_id/name. */
export function readPatterns(tsv, firstYear = 2025) {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const head = lines[0].split("\t").map((h) => h.trim().toLowerCase());
  const col = (n) => head.indexOf(n);
  const im = col("month"), ip = col("pattern");
  const ik = ["family_id", "student_id", "name"].map((n) => [n, col(n)]).find(([, i]) => i >= 0);
  if (im < 0 || ip < 0 || !ik) throw new Error("The patterns file needs a header with month, pattern and one of family_id / student_id / name.");
  return lines.slice(1).map((l) => {
    const f = l.split("\t");
    const p = (f[ip] ?? "").trim().toUpperCase().slice(0, 1);
    return { month: normMonth(f[im], firstYear), by: ik[0], key: (f[ik[1]] ?? "").trim(), pattern: p };
  }).filter((r) => r.month && /^[A-F]$/.test(r.pattern) && r.key);
}

// ----------------------------------------------------------------- compare

const shortHash = (s) => createHash("sha256").update(normName(s)).digest("hex").slice(0, 12);
const addMonths = (ym, n) => { const d = new Date(`${ym}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 7); };

/**
 * Per family per month: sheet cash vs the app's recorded payment, with the pattern.
 * rows: sheetRows().rows; lookup: readMapping(); invoices: [{ student_id, month,
 * recorded_payment, total_amount }]; students: [{ id, family_id }].
 */
export function compare({ rows, lookup, invoices, students, months, patterns = [] }) {
  const monthSet = new Set(months);
  const familyOf = new Map(students.map((s) => [s.id, s.family_id ?? null]));
  const unmapped = [], unknownStudents = [];
  const groups = new Map(); // key -> { key, family_id, students:Set, month, sheet, recorded, billed, bills, rows:[] }
  const groupKey = (studentId) => (familyOf.get(studentId) ? `family:${familyOf.get(studentId)}` : `student:${studentId}`);
  const group = (gk, month, init) => {
    const k = `${gk}:${month}`;
    if (!groups.has(k)) groups.set(k, { key: k, family: gk, family_id: null, students: new Set(), month, sheet: 0, recorded: 0, billed: 0, bills: 0, rows: [], unmatched: null, ...init });
    return groups.get(k);
  };

  for (const r of rows) {
    if (!monthSet.has(r.month)) continue;
    const id = lookup(r.month, r.name);
    if (id === undefined) { unmapped.push(r); continue; }
    if (id === null) {
      const g = group(`sheet:${shortHash(r.name)}`, r.month, { unmatched: r.name });
      g.sheet += r.amount; g.rows.push(r);
      continue;
    }
    if (!familyOf.has(id)) { unknownStudents.push({ ...r, student_id: id }); continue; }
    const g = group(groupKey(id), r.month, { family_id: familyOf.get(id) });
    g.sheet += r.amount; g.rows.push(r); g.students.add(id);
  }
  for (const b of invoices) {
    if (!monthSet.has(b.month)) continue;
    const g = group(groupKey(b.student_id), b.month, { family_id: familyOf.get(b.student_id) ?? null });
    g.recorded += Number(b.recorded_payment ?? 0);
    g.billed += Number(b.total_amount ?? 0);
    g.bills += 1;
    g.students.add(b.student_id);
  }

  const all = [...groups.values()].map((g) => ({ ...g, diff: g.sheet - g.recorded, students: [...g.students].sort() }));
  const byFamily = new Map();
  for (const g of all) { if (!byFamily.has(g.family)) byFamily.set(g.family, new Map()); byFamily.get(g.family).set(g.month, g); }

  const override = (g) => patterns.find((p) => p.month === g.month && (
    (p.by === "family_id" && g.family_id === p.key) ||
    (p.by === "student_id" && g.students.includes(p.key)) ||
    (p.by === "name" && g.rows.some((r) => normName(r.name) === normName(p.key)))))?.pattern;

  const items = [];
  for (const g of all) {
    if (g.diff === 0) continue;
    let pattern = override(g), why = pattern ? "the audit's classification" : null;
    if (!pattern) {
      const near = [-2, -1, 1, 2].map((n) => byFamily.get(g.family).get(addMonths(g.month, n))).filter(Boolean);
      const pair = near.find((o) => Math.sign(o.diff) === -Math.sign(g.diff) && Math.abs(g.diff + o.diff) <= ROUNDING);
      if (g.sheet > 0 && g.bills === 0) { pattern = "A"; why = "cash on the sheet, no bill in the app"; }
      else if (Math.abs(g.diff) <= ROUNDING) { pattern = "C"; why = "rounding"; }
      else if (pair) { pattern = "D"; why = `offset by ${pair.month} (${pair.diff})`; }
      else if (g.sheet === 0 && g.recorded > 0) { pattern = "B"; why = "the app records a payment, the sheet has no cash"; }
      else if (g.bills > 0 && g.recorded === g.billed && g.sheet > 0) { pattern = "E"; why = "the app recorded the bill, not the cash"; }
      else { pattern = "F"; why = "other"; }
    }
    const where = g.rows.length ? `${g.rows[0].sheet.trim()} row${g.rows.length > 1 ? "s" : ""} ${g.rows.map((r) => r.row).join(", ")}` : "not on the sheet";
    const evidence = [
      g.unmatched ? `sheet name "${g.unmatched}", no student in the app` : null,
      `sheet: ${g.sheet} (${where})`,
      `app: recorded ${g.recorded} on ${g.bills} bill${g.bills === 1 ? "" : "s"}, billed ${g.bills ? g.billed : "none"}`,
      `rule: ${why}`,
    ].filter(Boolean).join("; ");
    items.push({
      item_key: g.key, family_id: g.family_id, student_ids: g.students, month: g.month,
      sheet_amount: g.sheet, app_recorded: g.recorded, app_billed: g.bills ? g.billed : null,
      pattern, evidence, difference: g.diff,
    });
  }
  items.sort((a, b) => a.month.localeCompare(b.month) || a.pattern.localeCompare(b.pattern) || a.item_key.localeCompare(b.item_key));
  const sheetTotal = all.reduce((s, g) => s + g.sheet, 0);
  const recordedTotal = invoices.filter((b) => monthSet.has(b.month)).reduce((s, b) => s + Number(b.recorded_payment ?? 0), 0);
  return { items, unmapped, unknownStudents, sheetTotal, recordedTotal, difference: sheetTotal - recordedTotal };
}

// --------------------------------------------------------------------- SQL

const lit = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

export function toSql(items, { auditRef = AUDIT_REF } = {}) {
  const values = items.map((i) => `  (${[
    lit(auditRef), lit(i.item_key), i.family_id ? `${lit(i.family_id)}::uuid` : "NULL",
    `ARRAY[${i.student_ids.map(lit).join(", ")}]::uuid[]`, lit(i.month), lit(i.sheet_amount), lit(i.app_recorded),
    lit(i.app_billed), lit(i.pattern), lit(i.evidence),
  ].join(", ")})`);
  const total = items.reduce((s, i) => s + i.difference, 0);
  return [
    "-- Tuition audit phase 2: reconciliation register items, written by",
    "-- scripts/load-reconciliation-items.mjs. Paste into the Supabase SQL editor",
    "-- after migration 20261121100000. Rows already loaded are skipped.",
    `-- ${items.length} items; sheet minus app recorded over them: ${total}.`,
    "BEGIN;",
    "INSERT INTO public.tuition_reconciliation_items",
    "  (audit_ref, item_key, family_id, student_ids, month, sheet_amount, app_recorded, app_billed, pattern, evidence)",
    "VALUES",
    values.join(",\n") || "  -- (none)",
    "ON CONFLICT (audit_ref, item_key) DO NOTHING;",
    "COMMIT;",
    `SELECT count(*) AS items, sum(difference) AS difference FROM public.tuition_reconciliation_items WHERE audit_ref = ${lit(auditRef)};`,
    "",
  ].join("\n");
}

export const billsSql = (months) => `SELECT json_build_object(
  'invoices', (SELECT coalesce(json_agg(json_build_object('student_id', student_id, 'month', month,
                 'recorded_payment', coalesce(recorded_payment, 0), 'total_amount', total_amount)), '[]')
               FROM public.invoices WHERE month IN (${months.map(lit).join(", ")})),
  'students', (SELECT coalesce(json_agg(json_build_object('id', id, 'family_id', family_id)), '[]') FROM public.students)
) AS bills;`;

// --------------------------------------------------------------------- CLI

async function fetchBills(months) {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Give --bills <file>, or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to read the bills (read-only).");
  const get = async (path) => {
    const out = [];
    for (let from = 0; ; from += 1000) {
      const r = await fetch(`${url}/rest/v1/${path}`, { method: "GET", headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` } });
      if (!r.ok) throw new Error(`GET ${path.split("?")[0]}: ${r.status} ${await r.text()}`);
      const page = await r.json();
      out.push(...page);
      if (page.length < 1000) return out;
    }
  };
  return {
    invoices: await get(`invoices?select=student_id,month,recorded_payment,total_amount&month=in.(${months.join(",")})&order=id`),
    students: await get("students?select=id,family_id&order=id"),
  };
}

const fmt = (n) => (n === null || n === undefined ? "-" : Number(n).toLocaleString("en-US"));

async function main(argv) {
  const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const insideRepo = (p) => { const r = relative(repo, resolve(p)); return !r.startsWith("..") && !isAbsolute(r); };
  const firstYear = Number(arg("--year") ?? 2025);
  const sheetPath = arg("--sheet"), mappingPath = arg("--mapping"), out = arg("--emit-sql");

  if (argv.includes("--print-bills-sql")) {
    // Oct of the first year to May of the next: the audit's months.
    console.log(billsSql(["T10", "T11", "T12", "T1", "T2", "T3", "T4", "T5"].map((t) => sheetMonth(t, firstYear))));
    return 0;
  }
  if (!sheetPath || !mappingPath) {
    console.error("Usage: node scripts/load-reconciliation-items.mjs --sheet <xlsx> --mapping <json> [--bills <json>] [--patterns <tsv>] [--emit-sql <file>] [--year 2025]\n       node scripts/load-reconciliation-items.mjs --print-bills-sql");
    return 2;
  }
  for (const [what, p] of [["mapping", mappingPath], ["output", out], ["bills", arg("--bills")], ["patterns", arg("--patterns")]]) {
    if (p && insideRepo(p)) { console.error(`The ${what} file names children; keep it outside the repo (${p}).`); return 2; }
  }

  const sheets = await readWorkbook(readFileSync(sheetPath));
  const { rows, totals } = sheetRows(sheets, firstYear);
  const months = Object.keys(totals).sort();
  let bad = false;
  console.log("Sheet totals (family rows vs the sheet's own =SUM):");
  for (const m of months) {
    const t = totals[m];
    const same = t.sheetTotal === null || t.sheetTotal === t.rows;
    if (!same) bad = true;
    console.log(`  ${m}  ${t.sheet.padEnd(4)}  rows ${fmt(t.rows).padStart(12)}  sheet ${fmt(t.sheetTotal).padStart(12)}  ${same ? "" : "MISMATCH"}`);
  }
  if (bad && !argv.includes("--force")) { console.error("A month's rows do not add up to its total; nothing was written (--force to go on)."); return 1; }

  const lookup = readMapping(JSON.parse(readFileSync(mappingPath, "utf8")), firstYear);
  const patterns = arg("--patterns") ? readPatterns(readFileSync(arg("--patterns"), "utf8"), firstYear) : [];
  const bills = arg("--bills") ? JSON.parse(readFileSync(arg("--bills"), "utf8")) : await fetchBills(months);
  const data = bills.bills ?? bills; // the SQL editor's export wraps it in { bills: ... }
  const r = compare({ rows, lookup, invoices: data.invoices, students: data.students, months, patterns });

  if (r.unmapped.length || r.unknownStudents.length) {
    for (const u of r.unmapped) console.error(`  unmapped: ${u.sheet.trim()} row ${u.row} "${u.name}" ${fmt(u.amount)}`);
    for (const u of r.unknownStudents) console.error(`  no such student: ${u.sheet.trim()} row ${u.row} "${u.name}" -> ${u.student_id}`);
    console.error(`${r.unmapped.length} sheet row(s) unmapped, ${r.unknownStudents.length} mapped to an unknown student. Add them to the mapping (null = not in the app). Nothing was written.`);
    return 1;
  }

  console.log(`\nSheet ${fmt(r.sheetTotal)}, app recorded ${fmt(r.recordedTotal)}, difference ${fmt(r.difference)} (the audit of 16 Nov 2026: -14,174,001)`);
  console.log("By pattern:");
  for (const p of ["A", "B", "C", "D", "E", "F"]) {
    const of = r.items.filter((i) => i.pattern === p);
    console.log(`  ${p}  ${String(of.length).padStart(3)} family-months  net ${fmt(of.reduce((s, i) => s + i.difference, 0)).padStart(12)}  gross ${fmt(of.reduce((s, i) => s + Math.abs(i.difference), 0)).padStart(12)}`);
  }
  const itemsTotal = r.items.reduce((s, i) => s + i.difference, 0);
  console.log(`  ${r.items.length} items, net ${fmt(itemsTotal)}${itemsTotal === r.difference ? " (ties)" : " DOES NOT TIE"}`);
  if (!out) {
    console.log("\nItems (dry run; --emit-sql <file> writes them as SQL):");
    for (const i of r.items) console.log(`  ${i.month} ${i.pattern} ${fmt(i.difference).padStart(11)}  ${i.item_key}  ${i.evidence}`);
    return 0;
  }
  writeFileSync(out, toSql(r.items), "utf8");
  console.log(`\nWrote ${r.items.length} items to ${out}. Paste it into the Supabase SQL editor after migration 20261121100000.`);
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).then((code) => process.exit(code), (e) => { console.error(e.message); process.exit(1); });
}
