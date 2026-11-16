// BROWSER-PRICING: the tuition side of "screens show only the functions'
// figures" (docs/evidence/BROWSER-PRICING.md). The pay side - Saved Payroll
// and the class calendar's cost card - is in teacher-payroll.test.mjs.
//
// What runs here: the REAL calculate-tuition-bulk at HEAD and at BASE
// (38f9864a, before the new fields) and the real calculate-tuition, bundled
// with esbuild over an in-memory PostgREST stand-in (remote imports, auth,
// rate limit and the family-discount resolver stubbed). Their answers are fed
// to the real screen mappers (src/lib/lostLessonsView.ts, tuitionFigures.ts).
//
//   1. nothing else moved: every existing field of the bulk answer is
//      byte-identical to BASE, for every student; no writes.
//   2. each excused / cancelled lesson's figure IS what the function charges
//      for that lesson: mark it attended (or hold it) and the month's total
//      rises by exactly that much.
//   3. the screens' totals = the function's lessons summed; the old browser
//      figures beside them.
//   4. a missing field (BASE deploy, a read that failed, a student not
//      answered) -> null = "figure unavailable", never 0 or a browser price.
//   5. the Tuition tab's sibling line and Final Payable = calculate-tuition's.
//   6. the changed screens no longer price anything (source checks).
import { build, transform } from "esbuild";
import { z } from "zod";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASE = "38f9864a";
let pass = 0, fail = 0;
const quiet = { log: console.log, warn: console.warn, error: console.error };
const ok = (name, value, extra) => {
  quiet.log(`  ${value ? "PASS" : "FAIL"} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ""}`);
  value ? pass++ : fail++;
};
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const eq = (name, got, want) => ok(name, same(got, want), { got, want });
const section = (t) => quiet.log(`\n=== ${t} ===`);

// ------------------------------------------------------------ fixture
const MONTH = "2026-10";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FAM = "ffffffff-ffff-4fff-8fff-ffffffffffff";
const S1 = "11111111-1111-4111-8111-111111111111"; // family, sibling winner in A at 10%
const S2 = "22222222-2222-4222-8222-222222222222"; // override 80,000, Wednesdays only
const S3 = "33333333-3333-4333-8333-333333333333"; // enrolled in A from 15 Oct
const S4 = "44444444-4444-4444-8444-444444444444"; // override 120,000 (above the fee: billed at the fee)
const S5 = "55555555-5555-4555-8555-555555555555"; // class B only
const ALL = [S1, S2, S3, S4, S5];
const CA = "cccccccc-cccc-4ccc-8ccc-cccccccccc0a";
const CB = "cccccccc-cccc-4ccc-8ccc-cccccccccc0b";

let fixture;
function world() {
  const A = { id: CA, name: "Class A", session_rate_vnd: 100000 };
  const B = { id: CB, name: "Class B", session_rate_vnd: 150000 };
  const s = (id, date, status, cls) => ({ id, date, status, class_id: cls.id, classes: { session_rate_vnd: cls.session_rate_vnd, name: cls.name } });
  const enr = (id, student_id, class_id, extra = {}) => ({ id, created_at: `2026-08-0${id.slice(-1)}T00:00:00Z`, student_id, class_id,
    discount_type: null, discount_value: null, discount_cadence: null, rate_override_vnd: null,
    start_date: "2026-09-01", end_date: null, allowed_days: null, ...extra });
  fixture = {
    students: [
      { id: S1, family_id: FAM, families: { id: FAM, sibling_percent_override: null } },
      ...[S2, S3, S4, S5].map((id) => ({ id, family_id: null, families: null })),
    ],
    classes: [A, B],
    enrollments: [
      enr("e0000001", S1, CA),
      enr("e0000002", S2, CA, { rate_override_vnd: 80000, allowed_days: [3] }),
      enr("e0000003", S3, CA, { start_date: "2026-10-15" }),
      enr("e0000004", S4, CA, { rate_override_vnd: 120000 }),
      enr("e0000005", S5, CB),
    ],
    // October 2026: the 7th, 14th, 21st, 28th are Wednesdays; the 10th a Saturday.
    sessions: [
      s("a0", "2026-10-07", "Held", A), s("a1", "2026-10-14", "Held", A),
      s("a2", "2026-10-21", "Canceled", A), s("a3", "2026-10-28", "Scheduled", A),
      s("a4", "2026-10-10", "Canceled", A),
      s("b0", "2026-10-08", "Held", B), s("b1", "2026-10-15", "Canceled", B),
    ],
    attendance: [],
    discount_assignments: [], referral_bonuses: [], settlements: [], ledger_entries: [],
    invoices: [{ id: "i0000001", student_id: S1, month: "2026-09", total_amount: 200000, recorded_payment: 50000, class_breakdown: [] }],
  };
  for (const ses of fixture.sessions.filter((x) => x.status !== "Canceled")) {
    const students = ses.class_id === CA ? [S1, S2, S3, S4] : [S5];
    for (const st of students) fixture.attendance.push({ id: `att-${ses.id}-${st.slice(0, 2)}`, session_id: ses.id, student_id: st, status: "Present" });
  }
  mark("a1", S1, "Excused"); mark("a0", S2, "Excused"); mark("a1", S3, "Excused"); mark("a3", S4, "Excused");
  sibling = [{ family_id: FAM, status: "assigned", winner_student_id: S1, winner_class_id: CA, sibling_percent: 10, reason: null }];
}
const mark = (sid, st, status) => { fixture.attendance.find((a) => a.session_id === sid && a.student_id === st).status = status; };
let sibling = [];
let failCancelled = false;
let writes = [];

// ------------------------------------------------- PostgREST stand-in
function query(table) {
  let rows = [...(fixture[table] || [])];
  let orderKey = null, lim = Infinity, cancelledRead = false;
  const result = () => {
    if (failCancelled && cancelledRead) return { data: null, error: { message: "synthetic: cancelled lessons not read" } };
    let out = orderKey ? [...rows].sort((a, b) => (String(a[orderKey]) < String(b[orderKey]) ? -1 : String(a[orderKey]) > String(b[orderKey]) ? 1 : 0)) : rows;
    return { data: JSON.parse(JSON.stringify(out.slice(0, lim))), error: null };
  };
  const q = {
    select() { return q; }, or() { return q; },
    order(k) { orderKey = orderKey ?? k; return q; }, limit(n) { lim = n; return q; },
    eq(k, v) { if (table === "sessions" && k === "status" && v === "Canceled") cancelledRead = true; rows = rows.filter((r) => r[k] === v); return q; },
    neq(k, v) { rows = rows.filter((r) => r[k] !== v); return q; },
    in(k, vs) { rows = rows.filter((r) => vs.includes(r[k])); return q; },
    gt(k, v) { rows = rows.filter((r) => String(r[k]) > String(v)); return q; },
    gte(k, v) { rows = rows.filter((r) => r[k] >= v); return q; },
    lt(k, v) { rows = rows.filter((r) => r[k] < v); return q; },
    lte(k, v) { rows = rows.filter((r) => r[k] <= v); return q; },
    is(k, v) { rows = rows.filter((r) => (r[k] ?? null) === v); return q; },
    upsert(v) { writes.push({ table, op: "upsert", v }); return Promise.resolve({ error: null }); },
    insert(v) { writes.push({ table, op: "insert", v }); return Promise.resolve({ error: null }); },
    update(v) { writes.push({ table, op: "update", v }); return q; },
    single() { const r = result(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
    maybeSingle() { const r = result(); return Promise.resolve({ data: r.data?.[0] ?? null, error: r.error }); },
    then(a, b) { return Promise.resolve(result()).then(a, b); },
  };
  return q;
}
globalThis.__bpClient = () => ({ from: query, auth: { getUser: async () => ({ data: { user: { id: ADMIN } }, error: null }) } });
globalThis.__bpZod = z;
globalThis.__bpGate = { isServiceRole: false, roles: new Set(["admin"]), userId: ADMIN };
globalThis.__bpSibling = async (_s, ids) => sibling.filter((x) => ids.includes(x.family_id));

// ------------------------------------------------------------ bundles
const libDir = resolve(repo, "supabase", "functions", "_lib");
globalThis.Deno = { env: { get: () => "synthetic-test-only" }, serve: (h) => { globalThis.__bpHandler = h; } };
const out = mkdtempSync(join(tmpdir(), "browser-pricing-"));
async function load(entry, tag) {
  const bundle = await build({
    entryPoints: [entry], bundle: true, format: "esm", platform: "node", write: false,
    plugins: [{ name: "boundaries", setup(b) {
      b.onResolve({ filter: /(^https?:\/\/|\/auth\.ts$|\/sibling-state\.ts$|\/rate-limit\.ts$)/ }, (a) => ({ path: a.path, namespace: "stub" }));
      b.onResolve({ filter: /\/_lib\/[^/]+\.ts$/ }, (a) => ({ path: join(libDir, a.path.split("/").pop()) }));
      b.onLoad({ filter: /.*/, namespace: "stub" }, (a) => ({ loader: "js", contents:
        a.path.includes("supabase-js") ? "export const createClient = (...x) => globalThis.__bpClient(...x);" :
        a.path.includes("zod") ? "export const z = globalThis.__bpZod;" :
        a.path.endsWith("/auth.ts") ? "export const requireRole = async () => globalThis.__bpGate; export const callerOwnsStudent = async () => true;" :
        a.path.endsWith("/sibling-state.ts") ? "export const resolveSiblingStates = (...x) => globalThis.__bpSibling(...x);" :
        "export const checkRateLimit = () => ({ limited: false }); export const getClientIP = () => 'test'; export const rateLimitResponse = () => {};" }));
    } }],
  });
  const file = join(out, `${tag}.mjs`);
  writeFileSync(file, bundle.outputFiles[0].text);
  await import(pathToFileURL(file).href);
  return globalThis.__bpHandler;
}
const bulkNow = await load(resolve(repo, "supabase/functions/calculate-tuition-bulk/index.ts"), "bulk-now");
const single = await load(resolve(repo, "supabase/functions/calculate-tuition/index.ts"), "single");
const baseDir = join(out, "base", "calculate-tuition-bulk");
mkdirSync(baseDir, { recursive: true });
writeFileSync(join(baseDir, "index.ts"), execFileSync("git", ["show", `${BASE}:supabase/functions/calculate-tuition-bulk/index.ts`], { cwd: repo, encoding: "utf8" }));
const bulkBase = await load(join(baseDir, "index.ts"), "bulk-base");

async function loadTs(rel) {
  const p = join(out, rel.replace(/\W/g, "_") + ".mjs");
  writeFileSync(p, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(p).href);
}
const LL = await loadTs("src/lib/lostLessonsView.ts");
const TF = await loadTs("src/lib/tuitionFigures.ts");

const post = (body) => new Request("http://localhost/fn", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic" }, body: JSON.stringify(body) });
async function run(handler, body) {
  writes = [];
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(post(body));
    return { status: res.status, body: await res.json() };
  } finally { Object.assign(console, quiet); }
}
const bulk = (ids = ALL, h = bulkNow) => run(h, { studentIds: ids, month: MONTH });
const NEW = ["excusedLessons", "cancelledLessons"];
const strip = (results) => results.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !NEW.includes(k))));
const resultOf = (b, id) => b.body.results.find((r) => r.studentId === id);

// ===================================================================== 1
section(`nothing else moved since ${BASE}`);
world();
const now = await bulk();
const base = await bulk(ALL, bulkBase);
ok("both answer 200 for five students", now.status === 200 && base.status === 200 && now.body.results.length === 5, [now.status, base.status]);
eq("every existing field, every student: byte-identical to BASE", strip(now.body.results), base.body.results);
ok("the comparison is not empty (A charges something)", resultOf(now, S1).totalAmount > 0, resultOf(now, S1));
eq("the only new keys are excusedLessons and cancelledLessons, after the old ones",
  Object.keys(now.body.results[0]), [...Object.keys(base.body.results[0]), ...NEW]);
eq("no writes (bulk reads only)", writes, []);
for (const [label, ids] of [["one student", [S2]], ["class B only", [S5]], ["a student with no row", ["99999999-9999-4999-8999-999999999999", S1]]]) {
  const a = await bulk(ids), b = await bulk(ids, bulkBase);
  eq(`${label}: identical to BASE apart from the new fields`, strip(a.body.results), b.body.results);
}
failCancelled = true;
const noCancel = await bulk();
failCancelled = false;
ok("cancelled lessons not read: still 200", noCancel.status === 200, noCancel.status);
eq("  every charged figure identical to the run where they were read", strip(noCancel.body.results), strip(now.body.results));
ok("  cancelledLessons absent on every student; excusedLessons still there",
  noCancel.body.results.every((r) => !("cancelledLessons" in r) && Array.isArray(r.excusedLessons)));

// ===================================================================== 2
section("each lesson's figure is what the function charges for it");
const lessons = (b, id, kind) => (resultOf(b, id)[kind] ?? []).map((l) => [l.session_id, l.rate_vnd]);
eq("S1 excused: 14 Oct at the fee", lessons(now, S1, "excusedLessons"), [["a1", 100000]]);
eq("S2 excused: 7 Oct at the override 80,000", lessons(now, S2, "excusedLessons"), [["a0", 80000]]);
eq("S3 excused 14 Oct, before the 15 Oct enrollment: not a lost charge (not listed)", lessons(now, S3, "excusedLessons"), []);
eq("S4 excused 28 Oct: override 120,000 is above the fee, the month is billed at the fee", lessons(now, S4, "excusedLessons"), [["a3", 100000]]);
eq("S1 cancelled: 21 Oct and Sat 10 Oct", lessons(now, S1, "cancelledLessons").sort(), [["a2", 100000], ["a4", 100000]]);
eq("S2 cancelled: 21 Oct only (Wednesdays only), at 80,000", lessons(now, S2, "cancelledLessons"), [["a2", 80000]]);
eq("S3 cancelled: 21 Oct only (10 Oct is before the enrollment)", lessons(now, S3, "cancelledLessons"), [["a2", 100000]]);
eq("S5 cancelled: class B's 15 Oct at 150,000; none of class A's", lessons(now, S5, "cancelledLessons"), [["b1", 150000]]);

// Mark the lesson attended / hold it, with no family discount in play (it
// moves with the base), and the month's total rises by exactly the figure.
const totalOf = async (id) => resultOf(await bulk([id]), id).totalAmount;
let deltas = 0;
for (const id of ALL) {
  for (const kind of NEW) {
    for (const [sid, figure] of lessons(now, id, kind)) {
      world(); sibling = [];
      const before = await totalOf(id);
      if (kind === "excusedLessons") mark(sid, id, "Present");
      else {
        fixture.sessions.find((x) => x.id === sid).status = "Held";
        fixture.attendance.push({ id: `att-flip-${sid}-${id.slice(0, 2)}`, session_id: sid, student_id: id, status: "Present" });
      }
      const after = await totalOf(id);
      eq(`${id.slice(0, 2)} ${sid} (${kind === "excusedLessons" ? "excused -> present" : "cancelled -> held"}): total rises by the reported ${figure}`, after - before, figure);
      deltas++;
    }
  }
}
ok("every reported lesson was checked that way (10)", deltas === 10, deltas);
world();

// ===================================================================== 3
section("the screens' totals = the function's lessons");
const results = now.body.results;
const excused = LL.forgoneTuition(results, "excusedLessons", ALL);
const cancelled = LL.forgoneTuition(results, "cancelledLessons", ALL);
eq("Excused Loss (Finance) / Excused Absences total (Reports) = the listed lessons summed", excused.total, 100000 + 80000 + 100000);
eq("Lost Tuition (Reports) = the listed lessons summed", cancelled.total, 100000 * 2 + 80000 + 100000 + 100000 * 2 + 150000);
const byLesson = LL.forgoneByLesson(excused);
eq("Excused Absences rows: the function's figure per (lesson, student)", [byLesson.get(`a1:${S1}`), byLesson.get(`a0:${S2}`), byLesson.get(`a3:${S4}`)], [100000, 80000, 100000]);
ok("  S3's excused mark: answered but not listed -> the row reads 'not charged'", byLesson.get(`a1:${S3}`) === undefined && excused.answered.has(S3));
eq("Lost Profit = Lost Tuition - Saved Payroll (from calculate-payroll)", LL.difference(cancelled.total, 550000), cancelled.total - 550000);

// The old browser code over the same rows (OperationalReports at BASE l.97-111, l.144-153; useFinanceOverview l.257-271).
const rate = (cid) => fixture.classes.find((c) => c.id === cid).session_rate_vnd;
const oldLost = fixture.sessions.filter((x) => x.status === "Canceled").reduce((n, x) => n + rate(x.class_id) *
  fixture.enrollments.filter((e) => e.class_id === x.class_id && e.start_date <= x.date && (!e.end_date || e.end_date >= x.date)).length, 0);
const oldExcused = fixture.attendance.filter((a) => a.status === "Excused")
  .reduce((n, a) => n + rate(fixture.sessions.find((x) => x.id === a.session_id).class_id), 0);
const table = [
  ["Reports", "Lost Tuition (Oct)", oldLost, cancelled.total, "old: list fee x head count; ignores weekdays and overrides"],
  ["Reports / Finance", "Excused Absences total, Excused Loss (Oct)", oldExcused, excused.total, "old: every excused mark at the list fee, enrolled or not, override ignored"],
  ["Reports", "Excused row, S2 7 Oct", 100000, byLesson.get(`a0:${S2}`), "S2 pays 80,000 a lesson"],
  ["Reports", "Excused row, S3 14 Oct (before enrollment)", 100000, "not charged", "nothing would have been billed"],
];
for (const [, what, before, after] of table) ok(`${what}: old browser figure disagrees with the function`, !same(before, after), { before, after });
quiet.log("\n| Screen | Figure | Old browser | Function (now shown) | Why |\n|---|---|---|---|---|");
for (const [s, w, b, a, why] of table) quiet.log(`| ${s} | ${w} | ${typeof b === "number" ? b.toLocaleString("en-US") : b} | ${typeof a === "number" ? a.toLocaleString("en-US") : a} | ${why} |`);

// ===================================================================== 4
section("missing fields -> figure unavailable");
eq("BASE deploy (no new fields): Excused Loss null", LL.forgoneTuition(base.body.results, "excusedLessons", ALL).total, null);
eq("BASE deploy: Lost Tuition null", LL.forgoneTuition(base.body.results, "cancelledLessons", ALL).total, null);
eq("cancelled lessons not read: Lost Tuition null", LL.forgoneTuition(noCancel.body.results, "cancelledLessons", ALL).total, null);
eq("  ... while Excused Loss is still the function's", LL.forgoneTuition(noCancel.body.results, "excusedLessons", ALL).total, excused.total);
eq("a student on the roster the function did not answer for: null", LL.forgoneTuition(results.filter((r) => r.studentId !== S2), "excusedLessons", ALL).total, null);
eq("a student whose answer errored: null", LL.forgoneTuition([...results.slice(1), { studentId: S1, error: true }], "excusedLessons", ALL).total, null);
eq("the function did not answer at all: null", LL.forgoneTuition(null, "excusedLessons", ALL).total, null);
eq("a lesson without a figure: null", LL.forgoneTuition([{ studentId: S1, excusedLessons: [{ session_id: "a1" }] }], "excusedLessons", [S1]).total, null);
eq("nobody excused, everybody answered: 0 (a real answer)", LL.forgoneTuition(ALL.map((id) => ({ studentId: id, excusedLessons: [] })), "excusedLessons", ALL).total, 0);
eq("Saved Payroll unknown: Lost Profit null", LL.difference(cancelled.total, null), null);

// ===================================================================== 5
section("student Tuition tab = calculate-tuition's answer");
world();
const one = await run(single, { studentId: S1, month: MONTH });
ok("calculate-tuition answers 200 for S1", one.status === 200, one.body);
const sib = (one.body.discounts ?? []).find((d) => d.isSiblingWinner);
ok("it applied a sibling discount to class A (the comparison is not empty)", sib && sib.amount > 0 && sib.appliedToClass === CA, one.body.discounts);
eq("sibling line under class A = the function's Sibling Discount amount", TF.siblingDiscountFor(one.body.discounts, CA), sib.amount);
eq("  nothing under class B", TF.siblingDiscountFor(one.body.discounts, CB), 0);
eq("Final Payable = the function's carry.payable", TF.payableFrom(one.body.carry), one.body.carry.payable);
ok("  which includes the 150,000 carried in from September", one.body.carry.payable === one.body.totalAmount + 150000, one.body.carry);
const cA = one.body.breakdown.classes.find((c) => c.class_id === CA);
quiet.log(`\n| Tuition tab (S1, Oct) | sibling line | ${Math.round(cA.amount_vnd * 0.1).toLocaleString("en-US")} (amount x %) | ${TF.siblingDiscountFor(one.body.discounts, CA).toLocaleString("en-US")} | agrees here; now read, not re-priced |`);
quiet.log(`| Tuition tab (S1, Oct) | Final Payable | ${(one.body.totalAmount + one.body.carry.carryInDebt - one.body.carry.carryInCredit).toLocaleString("en-US")} (added up) | ${one.body.carry.payable.toLocaleString("en-US")} | agrees; now the function's figure |`);
eq("an older function without carry.payable: Final Payable null = figure unavailable", [TF.payableFrom({}), TF.payableFrom(null), TF.payableFrom({ payable: "1" })], [null, null, null]);
eq("no discount lines: no sibling line", TF.siblingDiscountFor(undefined, CA), 0);

// ===================================================================== 6
section("the changed screens no longer price anything");
const src = (rel) => readFileSync(resolve(repo, rel), "utf8").replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const ops = src("src/components/admin/reports/OperationalReports.tsx");
ok("OperationalReports: no session_rate_vnd, no teacher rate columns, no sessionPayVnd / durationMinutes",
  !/session_rate_vnd|hourly_rate_vnd|per_session_rate_vnd|sessionPayVnd|durationMinutes/.test(ops));
ok("OperationalReports: reads forgoneTuition (cancelled + excused) and cancelledPayTotal",
  /forgoneTuition\([^)]*"cancelledLessons"/.test(ops) && /forgoneTuition\([^)]*"excusedLessons"/.test(ops) && /cancelledPayTotal\(/.test(ops));
ok("OperationalReports: Class Finance pay is null (figure unavailable) without calculate-payroll, not a browser estimate",
  /paySplit \? \(paySplit\.byClass\.get\(cls\.id\) \?\? 0\) : null/.test(ops));
const fo = src("src/hooks/useFinanceOverview.ts");
ok("useFinanceOverview: no session_rate_vnd; Excused Loss from the bulk answer", !/session_rate_vnd/.test(fo) && /forgoneTuition\(liveRows, "excusedLessons", enrolledIds\)/.test(fo));
ok("useFinanceSummary: no session_rate_vnd, no excusedLoss", !/session_rate_vnd|excusedLoss/.test(src("src/hooks/useFinanceSummary.ts")));
ok("FinanceSummary: Excused Loss null shows Figure unavailable", /excusedLoss === null[\s\S]{0,200}Figure unavailable/.test(src("src/components/admin/FinanceSummary.tsx")));
const cal = src("src/components/admin/class/ClassCalendarEnhanced.tsx");
ok("ClassCalendarEnhanced: no sum of rate_override_vnd; the card is classPayFrom(calculate-payroll)",
  !/rate_override_vnd \|\| 0/.test(cal) && /classPayFrom\(data, classId\)/.test(cal) && /Figure unavailable/.test(cal));
const tab = src("src/components/student/StudentTuitionTab.tsx");
ok("StudentTuitionTab: no amount x percent, no payable added up", !/\/ 100\)/.test(tab) && !/carryInDebt - /.test(tab));
ok("StudentTuitionTab: sibling line and Final Payable are the function's", /siblingDiscountFor\(tuitionData\.discounts/.test(tab) && /tuitionData\.payable === null[\s\S]{0,200}Figure unavailable/.test(tab));
ok("useStudentMonthFinance passes carry.payable through", /payable: payableFrom\(data\.carry\)/.test(src("src/hooks/useStudentMonthFinance.ts")));
for (const rel of ["src/lib/lostLessonsView.ts", "src/lib/tuitionFigures.ts"]) {
  ok(`${rel}: imports nothing and multiplies nothing`, !/^\s*import /m.test(src(rel)) && !/[\w)\]]\s*\*\s*[\w(]/.test(src(rel)));
}

rmSync(out, { recursive: true, force: true }); // our own scratch copy in the OS temp dir
quiet.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
