// Type-checks the app - for real.
//
// `tsc --noEmit` at the repo root checks NOTHING. tsconfig.json there is a
// solution file - "files": [] plus project references - and without -p or
// -b TypeScript loads zero files and exits 0. It was used as "the type
// check" for weeks and reported clean every time while looking at none of
// the code.
//
// So this runs the app project explicitly, and before believing a clean
// result it checks that the files were actually loaded - a check whose
// pass condition is silence has to prove it looked.
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const tsc = resolve(repo, "node_modules", "typescript", "bin", "tsc");
const run = (args) => spawnSync(process.execPath, [tsc, ...args], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

{
  const root = run(["--noEmit", "--listFiles"]);
  const loaded = `${root.stdout}`.split("\n").filter((l) => l.replace(/\\/g, "/").includes("/src/")).length;
  ok("the root tsconfig really does check nothing (why this file exists)", loaded === 0, `${loaded} src files`);
}

const app = run(["--noEmit", "-p", "tsconfig.app.json", "--listFiles"]);
const out = `${app.stdout ?? ""}${app.stderr ?? ""}`;
const files = out.split("\n").filter((l) => l.replace(/\\/g, "/").includes("/src/")).length;
ok("the app project loads the source", files > 400, `${files} src files`);

const errors = out.split("\n").filter((l) => /error TS\d+/.test(l));
ok("and it type-checks", errors.length === 0,
   errors.length ? `\n          ${errors.slice(0, 15).join("\n          ")}` : "");

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
