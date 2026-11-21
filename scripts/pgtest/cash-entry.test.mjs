// What the payment screens take as the cash handed over (src/lib/cashEntry.ts).
//
// The Nov 2026 tuition audit found 21.1M of "payments" equal to the bill or
// its balance to the đồng: QuickPay pre-ticked every child and pre-filled the
// balance. Now nothing is pre-filled, a typed figure is read the way staff
// type it, and an odd figure is called out. Also holds the two screens to it:
// no pre-fill from the balance, no "Pay Full" button.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/cashEntry.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "cash-entry-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { parseCash, isRoundCash, cashWarning } = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

console.log("cash entry");
eq("empty is 0", parseCash(""), 0);
eq("undefined is 0", parseCash(undefined), 0);
eq("plain digits", parseCash("1600000"), 1600000);
eq("vi-VN dots", parseCash("1.600.000"), 1600000);
eq("commas", parseCash("1,600,000"), 1600000);
eq("spaces and a currency sign", parseCash(" 1 600 000 ₫"), 1600000);
eq("no digits is 0", parseCash("abc"), 0);
eq("a minus sign does not make a negative payment", parseCash("-500000"), 500000);
eq("an absurd length is 0, not a rounded float", parseCash("9".repeat(30)), 0);
eq("a number passes through", parseCash(720000), 720000);

ok("1,600,000 is round", isRoundCash(1600000));
ok("1,596,000 is round (a thousand)", isRoundCash(1596000));
ok("725,400 is not round", !isRoundCash(725400));
ok("0 is not cash", !isRoundCash(0));

eq("no warning on a round sum", cashWarning(1600000, 1596000), null);
eq("no warning on nothing typed", cashWarning(0, 725400), null);
ok("the exact odd balance is called out as a balance", /exact balance/.test(cashWarning(725400, 725400) ?? ""));
ok("another odd figure is called out", /round thousand/.test(cashWarning(600001, 600000) ?? ""));

console.log("payment screens");
const quick = readFileSync(resolve(repo, "src/components/admin/QuickPayPanel.tsx"), "utf8");
const batch = readFileSync(resolve(repo, "src/components/admin/BatchPaymentDialog.tsx"), "utf8");
ok("QuickPay reads amounts through parseCash", /getEntryAmount = \(item: any\) => parseCash\(amounts\[item\.student_id\]\)/.test(quick));
ok("QuickPay does not pre-fill the balance into the amount", !/String\(outstanding\)/.test(quick) && !/return getOutstanding\(item\)/.test(quick));
ok("QuickPay records only rows with a typed amount", /selectedRows = unpaid\.filter\(\(i\) => getEntryAmount\(i\) > 0\)/.test(quick));
ok("Batch has no Pay Full buttons", !/Pay Full|handlePayFull/.test(batch));
ok("Batch does not fill amounts from the balance", !/String\(outstanding\)/.test(batch));
ok("both show the odd-amount warning", /cashWarning\(/.test(quick) && /cashWarning\(/.test(batch));

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
