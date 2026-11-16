// Cloudflare Pages Function: POST /csp-report (F-23, docs/evidence/CSP.md).
//
// Browsers post here when the Content-Security-Policy in public/_headers
// would block (report-only) or has blocked (enforcing) something. This keeps
// only what is needed to fix the policy - which directive, which origin, which
// screen - and drops everything that could carry a person's data: query
// strings, the referrer, ids in the path, the script sample, the policy text.
//
// Where the reports go:
//  - always a log line "csp-violation {...}": live in the Cloudflare dashboard
//    (Workers & Pages > the project > deployment > Functions > real-time logs)
//    or `npx wrangler pages deployment tail --project-name <project> --search csp-violation`;
//  - if the project has a KV namespace bound as CSP_REPORTS, a count per day,
//    directive, origin and screen, kept 30 days, readable in the dashboard
//    (Storage & databases > KV > the namespace > KV pairs).
// No binding, no storage: the function never fails a report.
//
// No imports and plain JavaScript, so `scripts/pgtest/csp-headers.test.mjs`
// runs this same file in node.

const MAX_BODY = 64 * 1024;
const MAX_REPORTS = 20;
const TTL_SECONDS = 30 * 24 * 3600;

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/** A path with ids taken out: /students/2f0c...-.../tuition -> /students/:id/tuition */
export function screenOf(url) {
  try {
    const u = new URL(url);
    return u.pathname.replace(UUID, ":id").replace(/\/\d+(?=\/|$)/g, "/:n").slice(0, 120) || "/";
  } catch {
    return "?";
  }
}

/** What was blocked, without the part of a URL that can hold data. */
export function blockedOf(uri) {
  if (!uri) return "none";
  const s = String(uri);
  if (/^(inline|eval|wasm-eval|trusted-types-policy|trusted-types-sink)$/.test(s)) return s;
  if (/^(data|blob|about|filesystem|mediastream):?/i.test(s)) return s.split(":")[0].toLowerCase() + ":";
  try {
    const u = new URL(s);
    if (u.protocol === "http:" || u.protocol === "https:" || u.protocol === "ws:" || u.protocol === "wss:") return u.origin;
    return u.protocol;
  } catch {
    return s.slice(0, 40);
  }
}

function sourceOf(file) {
  if (!file) return null;
  try {
    const u = new URL(String(file));
    return (u.origin === "null" ? u.protocol : u.origin + u.pathname).slice(0, 160);
  } catch {
    return String(file).slice(0, 40);
  }
}

/** Browser extensions inject into pages; their reports say nothing about the app. */
function fromExtension(r) {
  return /^(chrome|moz|safari|safari-web|ms-browser)-extension:/.test(`${r.blocked} ${r.rawSource ?? ""}`) ||
    /-extension$/.test(r.blocked.replace(/:$/, ""));
}

/**
 * Turn a request body into tidy entries. Accepts both formats:
 *  - report-uri:  {"csp-report": {"document-uri", "effective-directive", "blocked-uri", ...}}
 *  - report-to:   [{"type": "csp-violation", "body": {"documentURL", "effectiveDirective", "blockedURL", ...}}]
 */
export function normalise(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const raw = [];
  if (data && typeof data === "object" && !Array.isArray(data) && data["csp-report"]) {
    const r = data["csp-report"];
    raw.push({
      page: r["document-uri"],
      directive: r["effective-directive"] || String(r["violated-directive"] || "").split(" ")[0],
      blocked: r["blocked-uri"],
      source: r["source-file"],
      line: r["line-number"],
      disposition: r.disposition,
    });
  } else if (Array.isArray(data)) {
    for (const rep of data.slice(0, MAX_REPORTS)) {
      if (!rep || rep.type !== "csp-violation" || !rep.body) continue;
      const b = rep.body;
      raw.push({
        page: b.documentURL || rep.url,
        directive: b.effectiveDirective,
        blocked: b.blockedURL,
        source: b.sourceFile,
        line: b.lineNumber,
        disposition: b.disposition,
      });
    }
  }
  return raw
    .map((r) => ({
      directive: String(r.directive || "unknown").slice(0, 40),
      blocked: blockedOf(r.blocked),
      screen: screenOf(r.page),
      source: sourceOf(r.source),
      rawSource: r.source ? String(r.source).slice(0, 40) : null,
      line: Number.isFinite(Number(r.line)) ? Number(r.line) : null,
      disposition: r.disposition === "enforce" ? "enforce" : "report",
    }))
    .filter((r) => !fromExtension(r))
    .map(({ rawSource, ...r }) => r);
}

export async function onRequestPost({ request, env }) {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY) return new Response(null, { status: 413 });
  const text = await request.text();
  if (text.length > MAX_BODY) return new Response(null, { status: 413 });

  const entries = normalise(text);
  const day = new Date().toISOString().slice(0, 10);
  for (const e of entries) {
    console.log("csp-violation " + JSON.stringify({ day, ...e }));
    const kv = env && env.CSP_REPORTS;
    if (!kv) continue;
    const key = `${day}|${e.disposition}|${e.directive}|${e.blocked}|${e.screen}`.slice(0, 480);
    try {
      const n = Number((await kv.get(key)) || 0) + 1;
      await kv.put(key, String(n), { expirationTtl: TTL_SECONDS, metadata: { source: e.source, line: e.line } });
    } catch {
      // over the free plan's daily KV writes, or KV unavailable: the log line stands
    }
  }
  return new Response(null, { status: 204 });
}
