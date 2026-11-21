// One formatter for every amount of money shown on screen (src/lib/money.ts):
// "3.780.000 ₫", dot thousands, no decimals, a normal space, then ₫; negative
// as "−3.780.000 ₫". Pins the output (it must not depend on Intl locale data)
// and fails when a new local money formatter appears in src/.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/money.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "money-format-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { formatVND, formatSignedVND } = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

const D = "₫", M = "−";
eq("0", formatVND(0), `0 ${D}`);
eq("1000", formatVND(1000), `1.000 ${D}`);
eq("999", formatVND(999), `999 ${D}`);
eq("3780000", formatVND(3780000), `3.780.000 ${D}`);
eq("1 billion", formatVND(1234567890), `1.234.567.890 ${D}`);
eq("negative", formatVND(-3780000), `${M}3.780.000 ${D}`);
eq("negative small", formatVND(-5), `${M}5 ${D}`);
eq("null", formatVND(null), "—");
eq("undefined", formatVND(undefined), "—");
eq("NaN", formatVND(NaN), "—");
eq("Infinity", formatVND(Infinity), "—");
eq("custom fallback", formatVND(null, { fallback: "none" }), "none");
eq("rounds .4 down", formatVND(1000.4), `1.000 ${D}`);
eq("rounds .5 up", formatVND(1000.5), `1.001 ${D}`);
eq("rounds negative half away from zero", formatVND(-1000.5), `${M}1.001 ${D}`);
eq("tiny negative is plain zero", formatVND(-0.2), `0 ${D}`);
eq("numeric string", formatVND("2500000"), `2.500.000 ${D}`);
eq("a normal space, not a no-break one", formatVND(1000).includes(" "), false);
eq("signed positive", formatSignedVND(700000), `+700.000 ${D}`);
eq("signed negative", formatSignedVND(-700000), `${M}700.000 ${D}`);
eq("signed zero has no sign", formatSignedVND(0), `0 ${D}`);
eq("signed option on formatVND", formatVND(5000, { signed: true }), `+5.000 ${D}`);

// The module is pure: it imports nothing.
const src = readFileSync(resolve(repo, "src/lib/money.ts"), "utf8");
ok("money.ts imports nothing", !/^\s*import\s/m.test(src) && !/\brequire\(/.test(src));

// The hook's formatVND delegates to it (callers keep working).
const hook = readFileSync(resolve(repo, "src/hooks/useStudentMonthFinance.ts"), "utf8");
ok("useStudentMonthFinance re-exports the shared formatter", /export \{ formatVND \} from ['"]@\/lib\/money['"]/.test(hook) && !/Intl\.NumberFormat/.test(hook));

// The mirrored pay-rate pair composes its own label (it imports nothing): the same text.
const pr = join(mkdtempSync(join(tmpdir(), "money-format-pr-")), "pay-rate.mjs");
const prOut = await build({ entryPoints: [resolve(repo, "src/lib/payRate.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
writeFileSync(pr, prOut.outputFiles[0].text);
const { describeRate } = await import(pathToFileURL(pr).href);
eq("describeRate uses dot separators", describeRate({ pay_rate_type: "per_session", per_session_rate_vnd: 250000, hourly_rate_vnd: 0 }), `250.000 ${D} / session`);

// Guard: no new local money formatter in src/. Printed documents (hecDocs,
// lib/invoice, the invoice and statement print views) keep their own wording.
const EXEMPT = [
  /src[\\/]lib[\\/]hecDocs[\\/]/, /src[\\/]lib[\\/]invoice[\\/]/, /src[\\/]components[\\/]invoice[\\/]/,
  /StudentStatementPrint\.tsx$/, /src[\\/]lib[\\/]money\.ts$/,
  // Mirrored with supabase/functions/_lib/pay-rate.ts, which imports nothing: it groups the digits itself.
  /src[\\/]lib[\\/]payRate\.ts$/,
  // Server-worded messages whose exact text other suites pin ("5,000,000 VND").
  /src[\\/]lib[\\/]approvals\.ts$/,
];
function walk(d, acc) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx)$/.test(e)) acc.push(p);
  }
  return acc;
}
const PATTERNS = [
  [/\+\s*["'`]\s?₫["'`]/, 'string-concatenated ₫ ("+ \' ₫\'")'],
  [/\+\s*["']\s?VND["']/, 'string-concatenated VND'],
  [/toLocaleString\([^)]*\)\s*(?:\|\|\s*\S+\s*)?\}?\s?₫/, "toLocaleString(...) followed by ₫"],
  [/toLocaleString\([^)]*\)\}?\s+VND\b/, "toLocaleString(...) followed by VND"],
  [/\}\s?₫/, "{amount} ₫ written by hand (use formatVND)"],
  [/new Intl\.NumberFormat\([^)]*\)[^;\n]*currency|currency:\s*["']VND["']/, "Intl currency VND"],
  [/(?:const|function)\s+(?:formatVND|fmtVND|formatCurrency|formatMoney)\b(?!.*money)/, "a local money formatter"],
];
const bad = [];
for (const f of walk(join(repo, "src"), [])) {
  if (EXEMPT.some((r) => r.test(f))) continue;
  const lines = readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((l, i) => {
    if (/^\s*(\/\/|\*|\{?\/\*)/.test(l)) return;
    for (const [re, why] of PATTERNS) if (re.test(l)) bad.push(`${relative(repo, f)}:${i + 1} ${why}: ${l.trim().slice(0, 90)}`);
  });
}
ok("no screen formats money by hand", bad.length === 0, bad.slice(0, 8).join(" | "));

// Screens that show money use the shared formatter.
const money = ["admin/QuickPayPanel.tsx", "admin/RecordPaymentDialog.tsx", "admin/BatchPaymentDialog.tsx", "admin/tabs/PayrollTab.tsx", "admin/FinanceSummary.tsx", "pages/TeacherPayroll.tsx", "student/StudentTuitionTab.tsx"];
for (const m of money) {
  const p = m.startsWith("pages/") ? join(repo, "src", m) : join(repo, "src/components", m);
  const t = readFileSync(p, "utf8");
  ok(`${m} reads formatVND`, /formatVND/.test(t));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
