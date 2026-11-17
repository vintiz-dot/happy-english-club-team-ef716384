// payments-followups item 1 (review R-N1): the Account Statement's source,
// supabase/functions/student-audit, must never print a deleted payment as
// money received - and must print every other case exactly as before.
//
// What runs: the function as it was before this change (kept byte for byte
// in fixtures/student-audit.before-followups.ts, LF md5 fa04a801...: the
// copy deployed as student-audit v5) and the function in the working tree,
// both bundled with esbuild, each answering the same request over the same
// fixture rows through a stand-in for supabase-js. The two answers are
// compared field by field: the ONLY difference allowed is that audit rows
// written by public.record_admin_payment (`diff.via = "record-payment"`)
// are gone from `events`. Then "Payments received" is worked out from each
// answer with the statement's own rule (StudentStatementPrint.tsx: events of
// kind payment or correction, by absolute amount).
//
// The fixture covers: the old screens' audit-only payment and correction
// (no `via`), a family payment (row + its own audit row), the old assistant
// (`via: "assistant"`), a record-payment payment and correction that stand,
// a record-payment payment and correction that were deleted (delete-payment:
// row gone, audit row and both ledger legs + reversal legs stay), an
// assistant payment recorded through record_admin_payment and then undone
// (the same shape as a deleted one), ledger legs, another child's rows, a
// confirmation and a closed month.
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "..", "..");
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? "PASS" : "FAIL"} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 900)}` : ""}`);
  value ? pass++ : fail++;
};
const md5 = (s) => createHash("md5").update(s.replace(/\r/g, "")).digest("hex");

// ------------------------------------------------------------------ rows
const KID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const ADMIN = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INV_SEP = "c0000000-0000-4000-8000-000000000009";
const INV_OCT = "c0000000-0000-4000-8000-000000000010";
const INV_NOV = "c0000000-0000-4000-8000-000000000011";
const P_STANDS = "d0000000-0000-4000-8000-000000000001";      // record-payment payment, stands
const P_DELETED = "d0000000-0000-4000-8000-000000000002";     // record-payment payment, deleted since
const P_CORR = "d0000000-0000-4000-8000-000000000003";        // record-payment correction, stands
const P_CORR_DEL = "d0000000-0000-4000-8000-000000000004";    // record-payment correction, deleted since
const P_AI_UNDONE = "d0000000-0000-4000-8000-000000000005";   // assistant payment (record_admin_payment), undone
const P_FAMILY = "d0000000-0000-4000-8000-000000000006";      // family payment child row
const ACC_AR = "e0000000-0000-4000-8000-000000000001", ACC_CASH = "e0000000-0000-4000-8000-000000000002", ACC_BANK = "e0000000-0000-4000-8000-000000000003";

const audit = (id, action, diff, at, entity = "invoice", entity_id = INV_NOV) =>
  ({ id, action, entity, entity_id, actor_user_id: ADMIN, occurred_at: at, diff });
const rp = (pid, kind, amount, month, before, at) => audit(`aud-${pid}`, kind === "correction" ? "payment_correction" : "record_payment", {
  student_id: KID, month, payment_id: pid, ledger_tx_id: `tx-${pid}`, method: "Cash", ledger_account: "CASH",
  previous_recorded_payment: before, payment_amount: kind === "correction" ? -amount : amount,
  new_recorded_payment: before + (kind === "correction" ? -amount : amount), payment_date: at, memo: null, type: kind, via: "record-payment",
}, at);

const TABLES = {
  user_roles: [{ user_id: ADMIN, role: "admin" }],
  students: [{ id: KID, full_name: "Fixture Child", family_id: "f0000000-0000-4000-8000-000000000001" }],
  invoices: [
    { id: INV_SEP, student_id: KID, month: "2026-09", base_amount: 1000000, discount_amount: 0, total_amount: 1000000, recorded_payment: 1000000, paid_amount: 1000000,
      carry_in_credit: 0, carry_in_debt: 0, carry_out_credit: 0, carry_out_debt: 0, status: "paid", confirmation_status: "confirmed",
      confirmed_at: "2026-09-02T00:00:00Z", confirmed_by: ADMIN, created_by: ADMIN, updated_by: ADMIN, created_at: "2026-09-01T00:00:00Z", updated_at: "2026-09-20T00:00:00Z", class_breakdown: [], number: "HEC-0009" },
    { id: INV_OCT, student_id: KID, month: "2026-10", base_amount: 1200000, discount_amount: 200000, total_amount: 1000000, recorded_payment: 800000, paid_amount: 800000,
      carry_in_credit: 0, carry_in_debt: 0, carry_out_credit: 0, carry_out_debt: 200000, status: "partial", confirmation_status: "confirmed",
      confirmed_at: null, confirmed_by: null, created_by: ADMIN, updated_by: ADMIN, created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-20T00:00:00Z",
      class_breakdown: [{ class_id: "k1", class_name: "Stars 2", sessions_count: 8, amount_vnd: 1200000 }], number: "HEC-0010" },
    { id: INV_NOV, student_id: KID, month: "2026-11", base_amount: 1000000, discount_amount: 0, total_amount: 1000000, recorded_payment: 250000, paid_amount: 250000,
      carry_in_credit: 0, carry_in_debt: 200000, carry_out_credit: 0, carry_out_debt: 950000, status: "partial", confirmation_status: "pending",
      confirmed_at: null, confirmed_by: null, created_by: ADMIN, updated_by: ADMIN, created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-15T00:00:00Z", class_breakdown: [], number: "HEC-0011" },
    { id: "c-other", student_id: OTHER, month: "2026-11", total_amount: 5, recorded_payment: 5 },
  ],
  monthly_finance_snapshots: [
    { student_id: KID, month: "2026-09", base_amount: 1000000, total_discount: 0, total_amount: 1000000, recorded_payment: 1000000, final_payable: 0,
      carry_in_credit: 0, carry_in_debt: 0, carry_out_credit: 0, carry_out_debt: 0, session_count: 8, closed_at: "2026-10-01T00:00:00Z", closed_by: ADMIN, version: 1, superseded_at: null },
  ],
  attendance: [
    { id: "a1", student_id: KID, status: "Present", marked_at: "2026-11-03T10:00:00Z", marked_by: ADMIN, notes: null, session_id: "s1",
      sessions: { id: "s1", date: "2026-11-03", class_id: "k1", status: "Held", classes: { name: "Stars 2" } } },
    { id: "a2", student_id: KID, status: "excused", marked_at: null, marked_by: null, notes: null, session_id: "s2",
      sessions: { id: "s2", date: "2026-11-10", class_id: "k1", status: "Held", classes: { name: "Stars 2" } } },
  ],
  payments: [
    { id: P_STANDS, student_id: KID, amount: 300000, method: "Cash", memo: "Payment for 2026-11", occurred_at: "2026-11-05T05:00:00Z", created_at: "2026-11-05T05:00:01Z", created_by: ADMIN, parent_payment_id: null },
    { id: P_CORR, student_id: KID, amount: -50000, method: "Cash", memo: "typed twice", occurred_at: "2026-11-06T05:00:00Z", created_at: "2026-11-06T05:00:01Z", created_by: ADMIN, parent_payment_id: null },
    { id: P_FAMILY, student_id: KID, amount: 800000, method: "Bank Transfer", memo: "family", occurred_at: "2026-10-10T05:00:00Z", created_at: "2026-10-10T05:00:01Z", created_by: ADMIN, parent_payment_id: "d0000000-0000-4000-8000-0000000000ff" },
    { id: "p-other", student_id: OTHER, amount: 5, method: "Cash", occurred_at: "2026-11-01T00:00:00Z", created_at: "2026-11-01T00:00:00Z" },
  ],
  ledger_accounts: [
    { id: ACC_AR, student_id: KID, code: "AR" }, { id: ACC_CASH, student_id: KID, code: "CASH" }, { id: ACC_BANK, student_id: KID, code: "BANK" },
  ],
  ledger_entries: [
    // P_STANDS
    { id: "l1", account_id: ACC_CASH, debit: 300000, credit: 0, month: "2026-11", occurred_at: "2026-11-05T05:00:00Z", created_at: "2026-11-05T05:00:01Z", created_by: ADMIN, memo: "Payment (record-payment)", tx_key: `record-payment-${P_STANDS}-${KID}` },
    { id: "l2", account_id: ACC_AR, debit: 0, credit: 300000, month: "2026-11", occurred_at: "2026-11-05T05:00:00Z", created_at: "2026-11-05T05:00:01Z", created_by: ADMIN, memo: "Payment (record-payment)", tx_key: null },
    // P_DELETED and its reversal (delete-payment)
    { id: "l3", account_id: ACC_CASH, debit: 150000, credit: 0, month: "2026-11", occurred_at: "2026-11-07T05:00:00Z", created_at: "2026-11-07T05:00:01Z", created_by: ADMIN, memo: "Payment (record-payment)", tx_key: `record-payment-${P_DELETED}-${KID}` },
    { id: "l4", account_id: ACC_AR, debit: 0, credit: 150000, month: "2026-11", occurred_at: "2026-11-07T05:00:00Z", created_at: "2026-11-07T05:00:01Z", created_by: ADMIN, memo: "Payment (record-payment)", tx_key: null },
    { id: "l5", account_id: ACC_CASH, debit: 0, credit: 150000, month: "2026-11", occurred_at: "2026-11-08T05:00:00Z", created_at: "2026-11-08T05:00:01Z", created_by: ADMIN, memo: "Reversal of deleted payment: wrong child", tx_key: `payment-reversal-${P_DELETED}-l3` },
    { id: "l6", account_id: ACC_AR, debit: 150000, credit: 0, month: "2026-11", occurred_at: "2026-11-08T05:00:00Z", created_at: "2026-11-08T05:00:01Z", created_by: ADMIN, memo: "Reversal of deleted payment: wrong child", tx_key: `payment-reversal-${P_DELETED}-l4` },
  ],
  audit_log: [
    audit("old-pay", "record_payment", { student_id: KID, month: "2026-10", previous_recorded_payment: 0, payment_amount: 200000, new_recorded_payment: 200000, payment_date: "2026-10-03", payment_method: "Cash", memo: "screen" }, "2026-10-03T05:00:00Z"),
    audit("old-corr", "payment_correction", { student_id: KID, month: "2026-10", previous_recorded_payment: 200000, payment_amount: -100000, new_recorded_payment: 100000, memo: "typo", type: "correction" }, "2026-10-04T05:00:00Z"),
    audit("old-ai", "record_payment", { student_id: KID, month: "2026-10", previous_recorded_payment: 100000, payment_amount: 70000, new_recorded_payment: 170000, payment_date: "2026-10-05", payment_method: "Bank Transfer", memo: "Zalo", via: "assistant" }, "2026-10-05T05:00:00Z"),
    audit("old-ai-undo", "payment_correction", { student_id: KID, month: "2026-10", previous_recorded_payment: 170000, payment_amount: -70000, new_recorded_payment: 100000, memo: "Undo of an assistant action", type: "correction", via: "assistant" }, "2026-10-06T05:00:00Z"),
    audit("fam", "smart_family_payment", { student_id: KID, month: "2026-10", amount: 800000 }, "2026-10-10T05:00:00Z"),
    audit("conf", "invoice_confirmed", { student_id: KID, month: "2026-10" }, "2026-10-02T05:00:00Z"),
    rp(P_STANDS, "payment", 300000, "2026-11", 0, "2026-11-05T05:00:00Z"),
    rp(P_CORR, "correction", 50000, "2026-11", 300000, "2026-11-06T05:00:00Z"),
    rp(P_DELETED, "payment", 150000, "2026-11", 250000, "2026-11-07T05:00:00Z"),
    rp(P_CORR_DEL, "correction", 20000, "2026-11", 400000, "2026-11-07T06:00:00Z"),
    rp(P_AI_UNDONE, "payment", 90000, "2026-11", 380000, "2026-11-09T05:00:00Z"),
    // another child's rows: never listed by either
    audit("other-old", "record_payment", { student_id: OTHER, month: "2026-11", previous_recorded_payment: 0, new_recorded_payment: 5 }, "2026-11-01T00:00:00Z", "invoice", "c-other"),
    { ...rp("p-other", "payment", 5, "2026-11", 0, "2026-11-01T00:00:00Z"), id: "other-rp", diff: { ...rp("p-other", "payment", 5, "2026-11", 0, "x").diff, student_id: OTHER } },
  ],
  profiles: [{ id: ADMIN, display_name: "Admin Fixture" }],
};

// ------------------------------------------- a stand-in for supabase-js
function query(table) {
  const filters = [];
  let order = null, lim = null, single = false;
  const q = {
    select() { return q; },
    eq(c, v) { filters.push((r) => r[c] === v); return q; },
    is(c, v) { filters.push((r) => (r[c] ?? null) === v); return q; },
    in(c, vs) { filters.push((r) => vs.includes(r[c])); return q; },
    order(c, o = {}) { order = { c, asc: o.ascending !== false }; return q; },
    limit(n) { lim = n; return q; },
    maybeSingle() { single = true; return q; },
    then(res, rej) {
      try {
        let rows = (TABLES[table] ?? []).filter((r) => filters.every((f) => f(r))).map((r) => structuredClone(r));
        if (order) rows.sort((a, b) => (String(a[order.c] ?? "") < String(b[order.c] ?? "") ? -1 : String(a[order.c] ?? "") > String(b[order.c] ?? "") ? 1 : 0) * (order.asc ? 1 : -1));
        if (lim != null) rows = rows.slice(0, lim);
        return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(res, rej);
      } catch (e) { return Promise.reject(e).then(res, rej); }
    },
  };
  return q;
}
const client = () => ({
  from: (t) => query(t),
  auth: {
    getUser: async () => ({ data: { user: { id: ADMIN } }, error: null }),
    admin: { getUserById: async (id) => ({ data: { user: { id, email: "admin@example.invalid" } } }) },
  },
});
globalThis.__saCreateClient = () => client();
let captured = null;
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => ({ SUPABASE_URL: "https://example.invalid", SUPABASE_SERVICE_ROLE_KEY: "s", SUPABASE_ANON_KEY: "a" })[k] } };

async function load(entry, tag) {
  const out = await build({
    entryPoints: [entry], bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{ name: "remote", setup(b) {
      b.onResolve({ filter: /^https?:\/\// }, (a) => ({ path: a.path, namespace: "remote" }));
      b.onLoad({ filter: /.*/, namespace: "remote" }, () => ({ contents: "export const createClient = (...a) => globalThis.__saCreateClient(...a);", loader: "js" }));
    } }],
  });
  const p = join(tmpdir(), `student-audit.${tag}.${process.pid}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  await import(pathToFileURL(p).href);
  return captured;
}
const beforePath = join(here, "fixtures", "student-audit.before-followups.ts");
const afterPath = join(repo, "supabase", "functions", "student-audit", "index.ts");
ok("the 'before' copy is student-audit as deployed (v5, LF md5 fa04a8014b1b1c819a5ecb9dd6b7f5a3)",
   md5(readFileSync(beforePath, "utf8")) === "fa04a8014b1b1c819a5ecb9dd6b7f5a3", md5(readFileSync(beforePath, "utf8")));
const before = await load(beforePath, "before");
const after = await load(afterPath, "after");
ok("both versions bundle", typeof before === "function" && typeof after === "function");

const ask = async (fn) => (await fn(new Request("http://localhost/student-audit", {
  method: "POST", headers: { Authorization: "Bearer t", "content-type": "application/json" }, body: JSON.stringify({ studentId: KID }),
}))).json();
const A = await ask(before);
const B = await ask(after);
ok("both answer ok", A.ok === true && B.ok === true, { A: A.error, B: B.error });

// --------------------------------------------------- the comparison
const isRp = (e) => e.provenance === "audit_log" && TABLES.audit_log.some((r) => `aud:${r.id}` === e.id && r.diff?.via === "record-payment");
const dropped = A.events.filter((e) => !B.events.some((x) => x.id === e.id));
const added = B.events.filter((e) => !A.events.some((x) => x.id === e.id));
ok("nothing is listed now that was not listed before", added.length === 0, added);
ok("everything no longer listed is an audit row written by record_admin_payment",
   dropped.length > 0 && dropped.every(isRp), dropped.map((e) => e.id));
ok("every other event is byte-identical, in the same order",
   JSON.stringify(A.events.filter((e) => !isRp(e))) === JSON.stringify(B.events), null);
for (const k of ["months", "totals", "student", "actors"]) {
  ok(`'${k}' is identical`, JSON.stringify(A[k]) === JSON.stringify(B[k]));
}
ok("'caveats' differ only by the audit-only rows no longer listed",
   A.caveats.scalarPayments === B.caveats.scalarPayments && A.caveats.auditOnlyEvents - B.caveats.auditOnlyEvents === dropped.length
   && A.caveats.unattributedEvents === B.caveats.unattributedEvents, { A: A.caveats, B: B.caveats });

// The statement's own rule: StudentStatementPrint.tsx "Payments received".
const statementSrc = readFileSync(join(repo, "src", "components", "admin", "reports", "StudentStatementPrint.tsx"), "utf8");
ok("(the statement still lists events of kind payment or correction as payments received)",
   /\.filter\(\(e\) => e\.kind === "payment" \|\| e\.kind === "correction"\)/.test(statementSrc));
const received = (r) => r.events.filter((e) => e.kind === "payment" || e.kind === "correction")
  .map((e) => `${e.id}:${Math.abs(Number(e.amount ?? 0))}`).sort();
const recA = received(A), recB = received(B);
const has = (list, id) => list.some((x) => x.startsWith(`${id}:`));

console.log("\n  before -> after, per case (Payments received)");
ok("  BEFORE (the bug): the deleted record-payment payment printed as 150,000 received", has(recA, `aud:aud-${P_DELETED}`));
ok("  BEFORE (the bug): the deleted record-payment correction printed as 20,000 received", has(recA, `aud:aud-${P_CORR_DEL}`));
ok("  BEFORE (the bug): the undone assistant payment printed as 90,000 received", has(recA, `aud:aud-${P_AI_UNDONE}`));
ok("  AFTER: the deleted payment is not money received", !B.events.some((e) => e.id === `aud:aud-${P_DELETED}`));
ok("  AFTER: the deleted correction is not money received", !B.events.some((e) => e.id === `aud:aud-${P_CORR_DEL}`));
ok("  AFTER: the undone assistant payment is not money received", !B.events.some((e) => e.id === `aud:aud-${P_AI_UNDONE}`));
ok("  AFTER: nothing at all of the three is listed (their ledger legs stay, as adjustments, in both)",
   B.events.filter((e) => e.kind !== "adjustment" && [P_DELETED, P_CORR_DEL, P_AI_UNDONE].some((p) => String(e.id).includes(p))).length === 0
   && A.events.filter((e) => e.provenance === "ledger").length === B.events.filter((e) => e.provenance === "ledger").length
   && B.events.filter((e) => e.provenance === "ledger").every((e) => e.kind === "adjustment"));
ok("  the standing record-payment payment: one line (its payments row), before and after",
   has(recA, `pay:${P_STANDS}`) && has(recB, `pay:${P_STANDS}`) && !has(recA, `aud:aud-${P_STANDS}`) && !has(recB, `aud:aud-${P_STANDS}`));
ok("  the standing record-payment correction: an adjustment, signed (-50,000), never received, before and after",
   [A, B].every((r) => r.events.some((e) => e.id === `pay:${P_CORR}` && e.kind === "adjustment" && e.amount === -50000))
   && !has(recA, `pay:${P_CORR}`) && !has(recB, `pay:${P_CORR}`) && !has(recA, `aud:aud-${P_CORR}`) && !has(recB, `aud:aud-${P_CORR}`));
ok("  the old screens' audit-only payment and correction: unchanged", has(recB, "aud:old-pay") && has(recB, "aud:old-corr")
   && recA.filter((x) => x.startsWith("aud:old-")).join() === recB.filter((x) => x.startsWith("aud:old-")).join());
ok("  the old assistant's rows (via 'assistant'): unchanged", has(recB, "aud:old-ai") && has(recB, "aud:old-ai-undo"));
ok("  the family payment (row + its audit row): unchanged", has(recB, `pay:${P_FAMILY}`) && has(recB, "aud:fam"));
ok("  the confirmation: unchanged, never received", B.events.some((e) => e.id === "aud:conf" && e.kind === "confirmation"));
ok("  another child's rows: never listed", ![A, B].some((r) => r.events.some((e) => /other/.test(e.id))));
ok("  Payments received after = before minus exactly the three", JSON.stringify(recB)
   === JSON.stringify(recA.filter((x) => ![P_DELETED, P_CORR_DEL, P_AI_UNDONE].some((p) => x.startsWith(`aud:aud-${p}:`)))), { recA, recB });

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
