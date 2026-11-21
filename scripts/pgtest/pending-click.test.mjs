// Button's busy logic (src/lib/pendingClick.ts): a handler that returns a
// promise makes the button busy until it settles; sync handlers change nothing.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/pendingClick.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "pending-click-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const { isThenable, trackClickResult, isClickBlocked } = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c) => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}`); c ? pass++ : fail++; };

ok("promise is thenable", isThenable(Promise.resolve()));
ok("undefined, number, plain object are not", !isThenable(undefined) && !isThenable(3) && !isThenable({}));

let log = [];
ok("sync result: not tracked, no state change", trackClickResult(undefined, () => log.push("s"), () => log.push("d")) === false && log.length === 0);

log = [];
let res; const p = new Promise((r) => { res = r; });
ok("promise: busy starts at once", trackClickResult(p, () => log.push("s"), () => log.push("d")) === true && log.join() === "s");
res(); await p; await Promise.resolve();
ok("promise: done once after resolve", log.join() === "s,d");

log = [];
const rej = Promise.reject(new Error("x"));
trackClickResult(rej, () => log.push("s"), () => log.push("d"));
let surfaced = false; await rej.catch(() => { surfaced = true; }); await Promise.resolve();
ok("rejection: busy clears and the caller still sees the error", log.join() === "s,d" && surfaced);

ok("blocked while busy / loading / disabled", isClickBlocked({ busy: true }) && isClickBlocked({ busy: false, loading: true }) && isClickBlocked({ busy: false, disabled: true }) && !isClickBlocked({ busy: false }));

const src = readFileSync(resolve(repo, "src/components/ui/button.tsx"), "utf8");
ok("submit and asChild buttons are left alone", /tracksPromise = !asChild && props\.type !== "submit"/.test(src));
ok("busy sets aria-busy", /aria-busy=/.test(src));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
