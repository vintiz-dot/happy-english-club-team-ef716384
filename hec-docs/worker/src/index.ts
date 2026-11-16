// HEC Docs printer: a Cloudflare Worker (free plan) that turns document HTML
// into a PDF or PNG with Cloudflare Browser Rendering.
//
// The web app does the real work in the user's browser (templates, schema
// validation, PDF finishing; see src/lib/hecDocs in the app). This Worker only
// prints, because a free Worker has 10 ms of CPU per request:
//
//   POST /v1/print   { html, kind: "pdf" }                       -> application/pdf
//                    { html, kind: "png", png: {width,height,scale} } -> image/png
//   GET  /healthz
//
// Who may call it: a signed-in user of the school app. The caller's Supabase
// access token is checked against Supabase Auth (GET /auth/v1/user). Browser
// callers must also come from an allowed origin (CORS).
//
// What the browser may reach: the session is created with Cloudflare's
// guardrails, so it can load nothing but the app's own origin (fonts, styles,
// logo). The HTML also carries a CSP. No other network access at render time.
import { launch, acquire, connect, sessions, limits, type Browser } from "@cloudflare/playwright";

export interface Env {
  BROWSER: Fetcher;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  ALLOWED_ORIGINS: string;
  ALLOWED_ORIGIN_SUFFIX: string;
  ASSET_ORIGIN: string;
  /** Test sessions only (wrangler dev --var DEV_ALLOW_ANON:1). Never set in wrangler.toml. */
  DEV_ALLOW_ANON?: string;
}

const MAX_HTML = 2 * 1024 * 1024;
// Free plan: 10 minutes of browser time a day (an idle open browser counts),
// 3 browsers at once, and a NEW browser only once every 20 seconds. So:
// reuse an open browser when there is one; otherwise wait for the next start
// slot; close straight after a single document; keep it open (10 s, the
// minimum) only between the documents of a bulk run.
const KEEP_ALIVE_MS = 15_000;
const MAX_WAIT_FOR_LAUNCH_MS = 22_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  if (!origin || !originAllowed(origin, env)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, content-type, x-hec-keep",
    "Access-Control-Expose-Headers": "x-hec-docs-ms",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function originAllowed(origin: string, env: Env): boolean {
  if (env.ALLOWED_ORIGINS.split(",").map((s) => s.trim()).includes(origin)) return true;
  try {
    const u = new URL(origin);
    return u.protocol === "https:" && !!env.ALLOWED_ORIGIN_SUFFIX && u.hostname.endsWith(env.ALLOWED_ORIGIN_SUFFIX);
  } catch {
    return false;
  }
}

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });
}

/** The caller must be a signed-in user of the app. */
async function signedIn(req: Request, env: Env): Promise<boolean> {
  const auth = req.headers.get("authorization") ?? "";
  if (!/^Bearer [\w.-]{20,}$/.test(auth)) return false;
  const r = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: env.SUPABASE_ANON_KEY } });
  return r.ok;
}

/** Reuse an idle session of ours if there is one, otherwise start one. */
async function getBrowser(env: Env, keep: boolean): Promise<Browser> {
  try {
    const all = await sessions(env.BROWSER);
    console.log("sessions", JSON.stringify(all.map((x) => ({ id: x.sessionId.slice(0, 8), conn: !!x.connectionId }))));
    const free = all.filter((s) => !s.connectionId);
    for (const s of free) {
      try {
        const b = await connect(env.BROWSER, s.sessionId);
        console.log("reused", s.sessionId.slice(0, 8));
        return b;
      } catch (e) {
        console.log("connect failed", String(e).slice(0, 120));
        // taken by a concurrent request; try the next one
      }
    }
  } catch {
    // listing failed; launch instead
  }
  const host = new URL(env.ASSET_ORIGIN).hostname;
  const deadline = Date.now() + MAX_WAIT_FOR_LAUNCH_MS;
  for (;;) {
    try {
      const l = await limits(env.BROWSER);
      if (l.allowedBrowserAcquisitions === 0 && l.timeUntilNextAllowedBrowserAcquisition > 0) {
        if (Date.now() + l.timeUntilNextAllowedBrowserAcquisition > deadline) throw new Error("429: no browser available in time");
        await sleep(l.timeUntilNextAllowedBrowserAcquisition + 250);
      }
    } catch (e) {
      if (/429/.test(String(e))) throw e;
      // limits endpoint unavailable: just try to launch
    }
    try {
      const opts = { keep_alive: KEEP_ALIVE_MS, guardrails: { allowedDomains: [host] } };
      if (!keep) return await launch(env.BROWSER, opts);
      // Bulk: reserve the browser, then attach to it. Closing an attached
      // browser only detaches, so the next document can reuse it.
      const { sessionId } = await acquire(env.BROWSER, opts);
      console.log("acquired", sessionId.slice(0, 8));
      return await connect(env.BROWSER, sessionId);
    } catch (e) {
      // Another request took the start slot; wait for the next one.
      console.log("launch failed", String(e).slice(0, 120));
      if (!/429/.test(String(e)) || Date.now() + 4_000 > deadline) throw e;
      await sleep(4_000);
    }
  }
}

async function print(env: Env, html: string, kind: "pdf" | "png", png: { width: number; height: number; scale: number } | undefined, keep: boolean): Promise<Uint8Array> {
  const browser = await getBrowser(env, keep);
  try {
    const context = await browser.newContext({
      viewport: png ? { width: png.width, height: png.height } : undefined,
      deviceScaleFactor: png?.scale ?? 1,
      colorScheme: "light",
      locale: "en-GB",
      timezoneId: "Asia/Ho_Chi_Minh",
    });
    try {
      const page = await context.newPage();
      // Open a blank page on the app's own site first, so the document has
      // that origin and its fonts, styles and logo load as same-origin files.
      await page.goto(`${env.ASSET_ORIGIN}/hec-docs/blank`, { waitUntil: "load", timeout: 15_000 });
      await page.setContent(html, { waitUntil: "load", timeout: 20_000 });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      if (kind === "png") {
        const el = page.locator("[data-capture]").first();
        return await el.screenshot({ type: "png", animations: "disabled", scale: "device" });
      }
      await page.emulateMedia({ media: "print" });
      return await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    } finally {
      await context.close().catch(() => {});
    }
  } finally {
    // A single document: close() ends the browser now, so no idle time is
    // spent. A bulk run (x-hec-keep: 1) attached with connect(), where close()
    // only detaches: the browser stays for the next document and ends itself
    // after KEEP_ALIVE_MS of inactivity.
    await browser.close().catch(() => {});
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const origin = req.headers.get("origin");
    const cors = corsHeaders(origin, env);

    if (req.method === "OPTIONS") return new Response(null, { status: origin && originAllowed(origin, env) ? 204 : 403, headers: cors });
    if (req.method === "GET" && url.pathname === "/healthz") return json(200, { ok: true }, cors);
    if (req.method !== "POST" || url.pathname !== "/v1/print") return json(404, { error: "not_found" }, cors);
    if (origin && !originAllowed(origin, env)) return json(403, { error: "origin_not_allowed" });
    if (env.DEV_ALLOW_ANON !== "1" && !(await signedIn(req, env))) return json(401, { error: "sign_in_required" }, cors);

    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > MAX_HTML) return json(413, { error: "too_large" }, cors);
    let body: { html?: unknown; kind?: unknown; png?: { width?: unknown; height?: unknown; scale?: unknown } };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "bad_json" }, cors);
    }
    if (typeof body.html !== "string" || body.html.length > MAX_HTML || !/^<!doctype html>/i.test(body.html.trimStart())) {
      return json(422, { error: "invalid_html" }, cors);
    }
    const kind = body.kind === "png" ? "png" : "pdf";
    let png: { width: number; height: number; scale: number } | undefined;
    if (kind === "png") {
      const w = Number(body.png?.width), h = Number(body.png?.height), s = Number(body.png?.scale ?? 2);
      if (!(w > 0 && w <= 2000 && h > 0 && h <= 2000 && s >= 1 && s <= 3)) return json(422, { error: "invalid_png_size" }, cors);
      png = { width: w, height: h, scale: s };
    }
    const t0 = Date.now();
    try {
      const out = await print(env, body.html, kind, png, req.headers.get("x-hec-keep") === "1");
      return new Response(out as unknown as BodyInit, {
        status: 200,
        headers: { ...cors, "content-type": kind === "png" ? "image/png" : "application/pdf", "cache-control": "no-store", "x-hec-docs-ms": String(Date.now() - t0) },
      });
    } catch (err) {
      const msg = String((err as Error)?.message ?? err);
      // Daily free browser time used up, or all 3 browsers busy.
      const limited = /429|rate limit|limit exceeded|Too many|time limit/i.test(msg);
      return json(limited ? 429 : 502, { error: limited ? "browser_limit" : "print_failed", detail: msg.slice(0, 300) }, cors);
    }
  },
};
