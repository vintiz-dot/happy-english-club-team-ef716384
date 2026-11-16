// F-23: the Content-Security-Policy in public/_headers and its report endpoint (docs/evidence/CSP.md).
//
//   node scripts/pgtest/csp-headers.test.mjs
//
// What it holds, so a later edit cannot quietly break the policy:
//  - the theme-boot <script> in index.html is allowed by its sha256 (computed on LF line endings, as
//    git stores it and as Cloudflare builds it); edit that script and this fails until the hash is updated;
//  - index.html has no inline event handler and no other inline script;
//  - no 'unsafe-eval', no 'unsafe-inline' for scripts, object-src 'none', base-uri, form-action;
//  - every host the app's own code fetches from is in connect-src (read from those files, not restated);
//  - the service worker is served without the page policy (both header names detached);
//  - every line fits Cloudflare's 2,000 characters;
//  - functions/csp-report.js accepts both report formats and keeps no query string, id or extension noise.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseHeaders, headersFor, parsePolicy } from "../csp/cfHeaders.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => readFileSync(resolve(repo, p), "utf8");
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? "PASS" : "FAIL"} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 700)}` : ""}`);
  value ? pass++ : fail++;
};

const headersText = read("public/_headers");
const rules = parseHeaders(headersText);
const page = headersFor(rules, "/");
const NAME = page["content-security-policy"] ? "content-security-policy" : "content-security-policy-report-only";
const policyText = page[NAME];
ok("the page gets exactly one CSP header (report-only or enforcing)", !!policyText && !(page["content-security-policy"] && page["content-security-policy-report-only"]), page);
const p = parsePolicy(policyText || "");

ok("every _headers line is under Cloudflare's 2,000 characters", headersText.split(/\r?\n/).every((l) => l.length < 2000));
ok("a deep SPA route gets the same policy", headersFor(rules, "/students/2f0c0000-0000-4000-8000-000000000000/tuition")[NAME] === policyText);
ok("the HEC Docs blank page (opened by the printer) gets the same policy", headersFor(rules, "/hec-docs/blank")[NAME] === policyText);

// index.html's inline scripts
const html = read("index.html").replace(/\r\n/g, "\n");
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
ok("index.html has one inline script (the theme boot)", inline.length === 1, inline.length);
for (const s of inline) {
  const h = `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`;
  ok(`script-src allows the inline script by its hash ${h} (LF: git and Cloudflare's build)`, (p["script-src"] || []).includes(h), p["script-src"]);
  const hc = `'sha256-${createHash("sha256").update(s.replace(/\n/g, "\r\n"), "utf8").digest("base64")}'`;
  ok(`script-src also allows its CRLF form ${hc} (a dist built on a Windows checkout)`, (p["script-src"] || []).includes(hc), p["script-src"]);
}
ok("index.html has no inline event handler (on...=)", !/<[^>]+\son[a-z]+\s*=/i.test(html));
ok("index.html loads no third-party script", [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].every((m) => m[1].startsWith("/")));

// inline event handlers written as HTML strings in src/ (they run only if script-src lists their hash with 'unsafe-hashes')
const { readdirSync, statSync } = await import("node:fs");
const walk = (d) => readdirSync(d).flatMap((n) => { const p = resolve(d, n); return statSync(p).isDirectory() ? walk(p) : /\.(tsx?|jsx?)$/.test(n) && !/generated/.test(n) ? [p] : []; });
const handlers = new Map();
for (const f of walk(resolve(repo, "src"))) {
  for (const m of readFileSync(f, "utf8").matchAll(/\son[a-z]+="([^"]+)"/g)) handlers.set(m[1], f.slice(repo.length + 1));
}
const scriptSrc = p["script-src"] || [];
ok("found the one inline handler in src/ (the fallback homework PDF's logo onerror)", handlers.size === 1, [...handlers]);
for (const [code, file] of handlers) {
  const h = `'sha256-${createHash("sha256").update(code, "utf8").digest("base64")}'`;
  ok(`script-src allows the inline handler ${JSON.stringify(code)} (${file}) by ${h}`, scriptSrc.includes("'unsafe-hashes'") && scriptSrc.includes(h), scriptSrc);
}
const allowedHashes = new Set([...inline, ...inline.map((s) => s.replace(/\n/g, "\r\n")), ...handlers.keys()].map((s) => `'sha256-${createHash("sha256").update(s, "utf8").digest("base64")}'`));
ok("script-src lists no hash that matches nothing in index.html or src/", scriptSrc.filter((s) => s.startsWith("'sha256-")).every((s) => allowedHashes.has(s)), scriptSrc);

// the hard parts of the policy
ok("script-src has no 'unsafe-eval' and no 'unsafe-inline'", !(p["script-src"] || []).some((s) => s === "'unsafe-eval'" || s === "'unsafe-inline'"));
ok("script-src names no remote host", (p["script-src"] || []).every((s) => /^'|^blob:$/.test(s)), p["script-src"]);
ok("object-src 'none', base-uri 'self', form-action 'self', frame-ancestors 'self'",
  p["object-src"]?.join() === "'none'" && p["base-uri"]?.join() === "'self'" && p["form-action"]?.join() === "'self'" && p["frame-ancestors"]?.join() === "'self'");
ok("default-src 'self'", p["default-src"]?.join() === "'self'");
// report-to would make Chrome stop using report-uri, and its Reporting API path delivered nothing in the harness
ok("reports go to /csp-report by report-uri, and there is no report-to", p["report-uri"]?.join() === "/csp-report" && !p["report-to"] && !page["reporting-endpoints"]);

// connect-src covers every host the app's own code calls, read from the code
const connect = p["connect-src"] || [];
const supa = /href="(https:\/\/[a-z0-9]+\.supabase\.co)"/.exec(html)?.[1];
ok("connect-src has the Supabase project (https and wss) that index.html preconnects to", !!supa && connect.includes(supa) && connect.includes(supa.replace("https:", "wss:")), { supa, connect });
const hosts = new Set();
for (const f of ["src/lib/hecDocs/index.ts", "src/lib/languageSupport/arasaac.ts", "src/components/vocabulary/VocabularyCreator.tsx"]) {
  for (const m of read(f).matchAll(/fetch\(\s*["`]?(https:\/\/[a-z0-9.-]+)|(?:PRINTER|SEARCH)\s*=\s*"(https:\/\/[a-z0-9.-]+)/g)) hosts.add(m[1] || m[2]);
}
ok("found the fetch hosts in the code (printer, ARASAAC, dictionary, translation)", hosts.size >= 4, [...hosts]);
for (const h of hosts) ok(`connect-src allows ${h}`, connect.includes(h), connect);
ok("connect-src allows Azure live pronunciation (wss://*.stt.speech.microsoft.com)", connect.includes("wss://*.stt.speech.microsoft.com"));
ok("worker-src allows the recorder's encoder ('self') and the speech SDK's blob worker", ["'self'", "blob:"].every((s) => (p["worker-src"] || []).includes(s)));
ok("img-src and frame-src take any https (pictures, teachers' book links)", (p["img-src"] || []).includes("https:") && (p["frame-src"] || []).includes("https:"));

// the service worker
const sw = headersFor(rules, "/service-worker.js");
ok("the service worker is served without either CSP header", !sw["content-security-policy"] && !sw["content-security-policy-report-only"], sw);
const swBlock = rules.find((r) => r.pattern === "/service-worker.js");
ok("the service-worker block detaches BOTH names, so enforcing is a one-line change",
  ["content-security-policy", "content-security-policy-report-only"].every((n) => swBlock?.ops.some((o) => o.detach === n)));
ok("switching the policy line to enforcing gives the page an enforcing policy and leaves the worker without one", (() => {
  const enforced = parseHeaders(headersText.replace("Content-Security-Policy-Report-Only: ", "Content-Security-Policy: "));
  const pg = headersFor(enforced, "/"), w = headersFor(enforced, "/service-worker.js");
  return pg["content-security-policy"] === policyText && !pg["content-security-policy-report-only"] && !w["content-security-policy"];
})());

// the report endpoint
const fn = await import(pathToFileURL(resolve(repo, "functions/csp-report.js")).href);
const legacy = JSON.stringify({ "csp-report": {
  "document-uri": "https://user.hanoienglish.com/students/2f0c0000-0000-4000-8000-000000000000/tuition?month=2026-11&name=Minh",
  referrer: "https://user.hanoienglish.com/students?q=Minh",
  "violated-directive": "img-src", "effective-directive": "img-src",
  "original-policy": "default-src 'self'",
  "blocked-uri": "https://evil.example/pixel.gif?who=Minh",
  "source-file": "https://user.hanoienglish.com/assets/index-abc.js?x=1", "line-number": 12,
  "script-sample": "secret sample", disposition: "report",
} });
const [a] = fn.normalise(legacy);
ok("report-uri format: directive, origin only, screen with ids taken out", a?.directive === "img-src" && a.blocked === "https://evil.example" && a.screen === "/students/:id/tuition", a);
ok("report-uri format keeps nothing from the query string, referrer, sample or policy", !/Minh|month|secret|default-src|who=/.test(JSON.stringify(a)), a);
const modern = JSON.stringify([
  { type: "csp-violation", url: "https://user.hanoienglish.com/admin?tab=finance", body: { documentURL: "https://user.hanoienglish.com/admin?tab=finance", effectiveDirective: "script-src-elem", blockedURL: "inline", disposition: "enforce", sourceFile: "https://user.hanoienglish.com/admin", lineNumber: 3 } },
  { type: "csp-violation", body: { documentURL: "https://user.hanoienglish.com/", effectiveDirective: "script-src-elem", blockedURL: "chrome-extension://abcdef/inject.js" } },
  { type: "deprecation", body: {} },
]);
const b = fn.normalise(modern);
ok("report-to format: the csp-violation kept, the extension and the other report type dropped", b.length === 1 && b[0].blocked === "inline" && b[0].disposition === "enforce" && b[0].screen === "/admin", b);
ok("blob:/data: blocked URLs are reported as the scheme only", fn.blockedOf("blob:https://user.hanoienglish.com/1234") === "blob:" && fn.blockedOf("data:image/png;base64,AAAA") === "data:");
const probe = fn.normalise(JSON.stringify({ "csp-report": { "document-uri": "https://user.hanoienglish.com/teacher/assignments", "effective-directive": "script-src", "blocked-uri": "eval", "source-file": "https://user.hanoienglish.com/assets/engine.generated-CSr67a5e.js", "line-number": 2 } }));
const realEval = fn.normalise(JSON.stringify({ "csp-report": { "document-uri": "https://user.hanoienglish.com/admin", "effective-directive": "script-src", "blocked-uri": "eval", "source-file": "https://user.hanoienglish.com/assets/index-abc.js" } }));
ok("the HEC Docs engine's global-object probe is tagged known; an eval anywhere else is not", probe[0]?.known === "global-this-probe" && realEval.length === 1 && !realEval[0].known, { probe, realEval });
ok("garbage is ignored", fn.normalise("not json").length === 0 && fn.normalise("{}").length === 0);

const kv = new Map();
const env = { CSP_REPORTS: { get: async (k) => kv.get(k) ?? null, put: async (k, v, o) => kv.set(k, v) && o } };
const logs = [];
const log = console.log; console.log = (...x) => logs.push(x.join(" "));
const post = (body, e) => fn.onRequestPost({ request: new Request("https://user.hanoienglish.com/csp-report", { method: "POST", body, headers: { "content-type": "application/csp-report" } }), env: e });
const r1 = await post(legacy, env), r2 = await post(legacy, env), r3 = await post(legacy, undefined);
const big = await post("x".repeat(70 * 1024), env);
console.log = log;
ok("the endpoint answers 204 with or without the KV binding", r1.status === 204 && r2.status === 204 && r3.status === 204);
ok("with KV bound, the same violation is counted per day", [...kv.values()].join() === "2" && /\|report\|img-src\|https:\/\/evil\.example\|\/students\/:id\/tuition$/.test([...kv.keys()][0]), [...kv.entries()]);
ok("every report is logged once as a 'csp-violation' line", logs.filter((l) => l.startsWith("csp-violation ")).length === 3, logs);
ok("a body over 64 KB is refused (413)", big.status === 413);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
