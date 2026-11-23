// A stale lazy chunk after a deploy reloads the same page once; it never sends
// the browser elsewhere (owner, 23 Nov 2026: "Recovering, redirecting you
// safely" landed on Schedule, and the full page load ended Mars's recording).
// Drives the real src/lib/chunkReload.ts and reads ErrorBoundary.tsx.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/chunkReload.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "chunk-reload-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const C = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

ok("Chrome's stale chunk is recognised", C.isChunkLoadError(new TypeError("Failed to fetch dynamically imported module: https://x/assets/Schedule-abc.js")));
ok("Safari's", C.isChunkLoadError(new TypeError("Importing a module script failed.")));
ok("Firefox's", C.isChunkLoadError(new TypeError("error loading dynamically imported module: https://x/assets/a.js")));
ok("Vite's CSS preload", C.isChunkLoadError(new Error("Unable to preload CSS for /assets/a.css")));
ok("an ordinary bug is not", !C.isChunkLoadError(new TypeError("Cannot read properties of undefined (reading 'map')")));

const t = 1_000_000;
ok("first failure on a URL: reload", C.mayReload(null, "/teacher/speakers", t));
ok("a second failure on the same URL soon after: no loop", !C.mayReload(JSON.stringify({ url: "/teacher/speakers", at: t }), "/teacher/speakers", t + 5000));
ok("another URL: reload", C.mayReload(JSON.stringify({ url: "/teacher/speakers", at: t }), "/schedule", t + 5000));
ok("the same URL a while later (another deploy): reload", C.mayReload(JSON.stringify({ url: "/schedule", at: t }), "/schedule", t + C.RELOAD_WINDOW_MS + 1));

C.setRecorderBusy(true);
ok("a lesson being recorded: never reloaded by itself", C.recorderBusy() && C.reloadForNewVersion(null, t) === false);
C.setRecorderBusy(false);

const eb = readFileSync(resolve(repo, "src/components/ErrorBoundary.tsx"), "utf8");
ok("the error boundary never navigates away by itself", !/location\.href\s*=|location\.assign\(|location\.replace\(/.test(eb));
ok("it reloads a stale chunk through the helper", /reloadForNewVersion\(\)/.test(eb));
const appSrc = readFileSync(resolve(repo, "src/App.tsx"), "utf8");
ok("routes sit in a boundary that a change of route clears", /<RouteErrorBoundary>/.test(appSrc) && /resetKey=\{pathname\}/.test(appSrc));
ok("Vite's preload errors are hooked", /hookPreloadErrors\(\)/.test(appSrc));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
