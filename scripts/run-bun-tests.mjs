// Runs every bun unit suite - scripts/*.test.ts - as ONE command:
//
//   node scripts/run-bun-tests.mjs        (or: npm run test:bun)
//
// Not `bun test scripts`: bun then also collects scripts/pgtest/*.test.mjs,
// which are NOT bun tests - each is a node script driven by
// scripts/pgtest/run.mjs with migration files as arguments, and under bun's
// collector they wait or hang instead of failing (T4 review, section 9).
// Those run with `node scripts/pgtest/run.mjs`.
//
// The list is read from the folder each time, so a new scripts/*.test.ts is
// picked up without editing anything.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repo = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(join(repo, "scripts"))
  .filter((f) => f.endsWith(".test.ts"))
  .sort()
  .map((f) => `./scripts/${f}`);
if (files.length === 0) {
  console.error("no scripts/*.test.ts found");
  process.exit(1);
}
console.log(`bun test: ${files.length} files`);
const r = spawnSync("npx", ["--yes", "bun", "test", ...files], { cwd: repo, stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
