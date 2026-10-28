// Type-checks the edge functions, which nothing else here does.
//
// There is no Deno on the machines this repo is worked on, and the
// functions are deployed by hand. So between an edit and production there
// was nothing at all: a symbol used but not imported, a renamed export, a
// typo in a field name - all of it reached the Supabase deploy before
// anything complained, and the thing that broke was payroll.
//
// This runs the repo's own TypeScript over supabase/functions with the
// remote imports (esm.sh, deno.land) stubbed as `any` and the Deno global
// declared. It cannot check what those remote modules return, and it is
// not a substitute for `deno check` - but it does catch the whole class of
// mistake above, which is the class that actually happens.
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const functions = resolve(repo, "supabase", "functions");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

/** Every .ts under supabase/functions. */
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const files = walk(functions);
ok("there are edge functions to check", files.length > 0, `${files.length} file(s)`);

/**
 * tsconfig globs are POSIX, always. Handed a Windows path with
 * backslashes, `include` silently matches NOTHING and tsc exits 0 having
 * checked no files at all - which is how this test passed while the very
 * mistake it was written for was still in the file.
 */
const glob = (p) => p.split("\\").join("/");

const work = mkdtempSync(join(tmpdir(), "edgecheck-"));
writeFileSync(join(work, "deno.d.ts"), `
// Enough of the Deno runtime for the functions to type-check. Deliberately
// loose: this test is about the repo's own code, not about Deno's types.
// \`var\`, not \`const\`: in Deno it is a property of globalThis, and the
// generated mcp function reads it as globalThis.Deno.
declare var Deno: {
  serve(handler: (req: Request) => Response | Promise<Response>): void;
  env: { get(key: string): string | undefined };
};
declare module "https://*";
declare module "npm:*";
declare module "jsr:*";
`);
writeFileSync(join(work, "tsconfig.json"), JSON.stringify({
  compilerOptions: {
    target: "ES2022",
    module: "ESNext",
    moduleResolution: "Bundler",
    allowImportingTsExtensions: true,
    noEmit: true,
    // Matches the main app's settings, so this does not fail the build on
    // strictness the rest of the repo does not ask for either.
    strict: false,
    strictNullChecks: false,
    noImplicitAny: false,
    skipLibCheck: true,
    // Deno treats every file as a module. Without this a function whose
    // first line is a `const` and which imports nothing is read as a
    // script, and its top-level names collide with every other one.
    moduleDetection: "force",
    types: [],
    lib: ["ES2022", "DOM", "DOM.Iterable"],
  },
  include: [glob(join(work, "deno.d.ts")), glob(join(functions, "**/*.ts"))],
}, null, 2));

const tsc = resolve(repo, "node_modules", "typescript", "bin", "tsc");
const run = spawnSync(
  process.execPath,
  [tsc, "-p", join(work, "tsconfig.json"), "--listFiles"],
  { encoding: "utf8" },
);

const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim();

// A check that checks nothing passes every time. Assert it actually
// loaded the functions before believing the absence of errors.
const loaded = output
  .split("\n")
  .filter((line) => glob(line.trim()).includes(glob(functions) + "/")).length;
ok("tsc actually loaded the function files", loaded >= files.length,
   `${loaded} loaded of ${files.length}`);
/**
 * What this cannot judge, and why each one is dropped.
 *
 * The remote modules are stubbed, not fetched, so anything that depends
 * on what THEY declare is noise here rather than a fault in this repo:
 *
 *   TS2709 / TS2694  a stubbed module's export used as a type. The stub
 *                    has no types to offer, so `SupabaseClient` is a
 *                    namespace rather than an interface.
 *   TS2307           the stubbed module itself not resolving.
 *
 * Everything else still applies, and that is the useful part: a name used
 * but not imported, a renamed export, a typo in a field, a wrong argument
 * count - the mistakes that are actually made in these files.
 */
const STUB_ARTEFACTS = /error TS(2709|2694|2307):/;

const problems = output
  .split("\n")
  .filter((line) => /error TS/.test(line))
  .filter((line) => !line.includes("deno.d.ts"))
  .filter((line) => !STUB_ARTEFACTS.test(line))
  .map((line) => glob(line).replace(glob(functions) + "/", ""));

ok("supabase/functions type-checks", problems.length === 0,
   problems.length ? `\n          ${problems.slice(0, 12).join("\n          ")}` : "");

// The specific failure that prompted this: a type used in the response
// shape but left out of the import list. Deno would refuse it; nothing
// else here would have noticed until the deploy.
const payroll = files.find((f) => f.endsWith(join("calculate-payroll", "index.ts")));
ok("calculate-payroll is among the files checked", Boolean(payroll),
   payroll ? relative(repo, payroll) : "not found");

// supabase/functions/mcp is generated by Lovable's Vite plugin, which on
// Windows emits the entry as `import mcp from "npm:C:\..."` - a path on
// the machine that built it. The stub above declares every npm: import, so
// the type check passes it; this is what catches it. vite.config.ts keeps
// the plugin off on Windows, and this stays in case that is undone.
const machinePath = /["'](?:npm:)?(?:[A-Za-z]:[\\/]|\/(?:Users|home)\/)/;
const leaked = files
  .filter((f) => machinePath.test(readFileSync(f, "utf8")))
  .map((f) => relative(repo, f));
ok("no function imports a path on the machine that built it", leaked.length === 0, leaked.join(", "));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
