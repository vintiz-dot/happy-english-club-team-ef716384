// Every breadcrumb opens a page that exists (owner, 23 Nov 2026: "many
// breadcrumbs give a 404").
//
// The trail is built by src/lib/breadcrumbs.ts (AdminTopBar renders it). This
// reads the real <Route path>s out of src/App.tsx, builds the trail of every
// route (and of the admin tabs), and fails when a crumb links to a URL no
// route matches - or when the module's own route list drifts from App.tsx,
// or when another file starts drawing breadcrumb links of its own.
import { build } from "esbuild";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/breadcrumbs.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "breadcrumbs-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const B = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => { const g = JSON.stringify(got), w = JSON.stringify(want); ok(n, g === w, g === w ? "" : `got ${g}, want ${w}`); };

// The routes as App.tsx declares them.
const app = readFileSync(resolve(repo, "src/App.tsx"), "utf8");
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== "*");
ok("App.tsx declares routes", routes.length > 30, String(routes.length));
const missing = routes.filter((r) => !B.APP_ROUTES.includes(r)), extra = B.APP_ROUTES.filter((r) => !routes.includes(r));
eq("breadcrumbs.ts lists exactly App.tsx's routes (add a new page to APP_ROUTES)", { missing, extra }, { missing: [], extra: [] });

// An independent matcher (not the module's): the test must not trust the code it tests.
const matches = (href) => {
  const segs = href.split(/[?#]/)[0].split("/").filter(Boolean);
  return routes.some((r) => { const rs = r.split("/").filter(Boolean); return rs.length === segs.length && rs.every((x, i) => x.startsWith(":") || x === segs[i]); });
};
const sample = (r) => r.replace(/:[^/]+/g, "4b489a92-59f0-4878-b866-5b3aa48715fe");

const broken = [];
for (const r of routes) {
  for (const tab of [null, "classes", "finance", "payroll", "stars-sync"]) {
    const crumbs = B.buildCrumbs(sample(r), tab);
    for (const c of crumbs) if (c.href && !matches(c.href)) broken.push(`${sample(r)}${tab ? "?tab=" + tab : ""} -> ${c.label} (${c.href})`);
    if (crumbs.length && crumbs[crumbs.length - 1].href) broken.push(`${r}: the last crumb (this page) is a link`);
  }
}
eq("no crumb on any page links to a URL without a route", broken, []);
eq("every stand-in parent page is a route", Object.entries(B.PARENT_PAGES).filter(([, to]) => !matches(to)), []);

// The trails the owner met.
eq("a teacher's class: Teacher and Classes go to the teacher dashboard", B.buildCrumbs("/teacher/classes/abc-1234567890abcdef1234", null).map((c) => c.href ?? null), ["/teacher/dashboard", "/teacher/dashboard", null]);
eq("an admin's class: Admin, then Classes on the classes tab", B.buildCrumbs("/admin/classes/abc-1234567890abcdef1234", null).map((c) => c.href ?? null), ["/admin", "/admin?tab=classes", null]);
eq("a lesson report: back to the list of lesson reports", B.buildCrumbs("/teacher/lesson-report/abc-1234567890abcdef1234", null).map((c) => c.href ?? null), ["/teacher/dashboard", "/teacher/lesson-reports", null]);
eq("a level with no page is plain text", B.buildCrumbs("/watch/sometoken", null).map((c) => c.href ?? null), [null, null]);
eq("a student's tuition: Students and the student link, the page does not", B.buildCrumbs("/students/abc-1234567890abcdef1234/tuition", null).map((c) => c.href ?? null), ["/students", "/students/abc-1234567890abcdef1234", null]);
eq("an admin tab is the leaf", B.buildCrumbs("/admin", "finance").map((c) => [c.label, c.href ?? null]), [["Admin", "/admin"], ["Finance", null]]);
ok("the module's matcher agrees: /teacher is not a page", !B.isAppRoute("/teacher") && B.isAppRoute("/teacher/dashboard") && B.isAppRoute("/admin?tab=classes"));

// Nobody else draws breadcrumb links by hand: every file that renders BreadcrumbLink builds its trail with buildCrumbs.
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(n) ? [p] : []; });
const own = walk(resolve(repo, "src")).filter((p) => !/[\\/]components[\\/]ui[\\/]breadcrumb\.tsx$/.test(p))
  .filter((p) => { const s = readFileSync(p, "utf8"); return /<BreadcrumbLink\b/.test(s) && !/\bbuildCrumbs\(/.test(s); })
  .map((p) => p.slice(repo.length + 1));
eq("every breadcrumb trail comes from src/lib/breadcrumbs.ts", own, []);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
