// One shared, sandboxed headless Chromium. Every page it opens can reach
// exactly one origin (ASSET_ORIGIN), served from an allow-listed set of local
// files; any other request is aborted, so nothing is fetched from the network
// at render time and user data can never pull in a remote resource.
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.ts";
import { log } from "../log.ts";

export const ASSET_ORIGIN = "https://hec-docs.invalid";

const MIME: Record<string, string> = {
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".css": "text/css",
  ".mjs": "text/javascript",
  ".js": "text/javascript",
  ".pdf": "application/pdf",
};

let browserPromise: Promise<Browser> | null = null;

export function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        // Chromium's own sandbox stays ON. Running as root (some containers)
        // is refused by Chromium; the Dockerfile runs as an unprivileged user.
        chromiumSandbox: config.chromiumSandbox,
        args: ["--disable-gpu", "--font-render-hinting=none", "--disable-lcd-text"],
      })
      .then((b) => {
        log.info("browser.launch", { version: b.version() });
        b.on("disconnected", () => {
          browserPromise = null;
        });
        return b;
      })
      .catch((err) => {
        browserPromise = null;
        throw err;
      });
  }
  return browserPromise;
}

export async function closeBrowser(): Promise<void> {
  contexts.clear();
  if (!browserPromise) return;
  const b = await browserPromise.catch(() => null);
  browserPromise = null;
  await b?.close();
}

/** Root directories a page may read from (by URL path prefix). */
export interface AssetMount {
  prefix: string; // e.g. "/fonts/"
  dir: string; // absolute directory
}

export interface IsolatedPage {
  page: Page;
  context: BrowserContext;
  close(): Promise<void>;
}

interface PageJob {
  html?: string;
  mounts: AssetMount[];
  extraFiles?: Record<string, Buffer>;
}

// Static assets (fonts, CSS, logos) are read once per process. They are
// pinned files in the repo, so there is nothing to invalidate in production.
const assetCache = new Map<string, Buffer>();
async function readAsset(abs: string): Promise<Buffer> {
  let b = assetCache.get(abs);
  if (!b) {
    b = await readFile(abs);
    if (process.env.NODE_ENV === "production" || /[\/]fonts[\/]/.test(abs)) assetCache.set(abs, b);
  }
  return b;
}

const jobs = new WeakMap<Page, PageJob>();
const contexts = new Map<string, Promise<BrowserContext>>();

/**
 * Contexts are shared per (JavaScript, scale) setting; every job gets its
 * own page. Pages hold no state worth isolating: document scripts are
 * forbidden by CSP, there are no cookies or storage, and the route handler
 * serves each page only its own HTML.
 */
function sharedContext(javaScript: boolean, scale: number): Promise<BrowserContext> {
  const key = `${javaScript}:${scale}`;
  let p = contexts.get(key);
  if (!p) {
    p = (async () => {
      const browser = await getBrowser();
      const context = await browser.newContext({
        javaScriptEnabled: javaScript,
        locale: "en-GB",
        timezoneId: "Asia/Ho_Chi_Minh",
        colorScheme: "light",
        serviceWorkers: "block",
        acceptDownloads: false,
        deviceScaleFactor: scale,
      });
      context.on("close", () => contexts.delete(key));
      browser.on("disconnected", () => contexts.delete(key));
      await context.route("**/*", async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        if (url.origin !== ASSET_ORIGIN) {
          log.warn("render.blocked_request", { url: url.origin + url.pathname });
          return route.abort("blockedbyclient");
        }
        let job: PageJob | undefined;
        try {
          job = jobs.get(req.frame().page());
        } catch {
          job = undefined; // worker requests have no frame
        }
        if (!job) {
          for (const pg of context.pages()) if (jobs.has(pg) && pg.workers().length) job = jobs.get(pg);
        }
        if (!job) return route.fulfill({ status: 404, body: "" });
        const p = decodeURIComponent(url.pathname);
        if (p === "/doc.html" && job.html !== undefined) {
          return route.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: job.html });
        }
        if (job.extraFiles && p in job.extraFiles) {
          return route.fulfill({ status: 200, contentType: MIME[path.extname(p)] ?? "application/octet-stream", body: job.extraFiles[p] });
        }
        for (const m of job.mounts) {
          if (!p.startsWith(m.prefix)) continue;
          const abs = path.resolve(m.dir, p.slice(m.prefix.length));
          // Path traversal guard: the resolved file must stay inside the mount.
          if (!abs.startsWith(path.resolve(m.dir) + path.sep)) break;
          try {
            return route.fulfill({ status: 200, contentType: MIME[path.extname(abs)] ?? "application/octet-stream", body: await readAsset(abs) });
          } catch {
            break;
          }
        }
        log.warn("render.missing_asset", { path: p });
        return route.fulfill({ status: 404, body: "" });
      });
      return context;
    })();
    contexts.set(key, p);
    p.catch(() => contexts.delete(key));
  }
  return p;
}

/** A new page for one job: offline except for its own assets. */
export async function openIsolatedPage(opts: {
  html?: string;
  mounts: AssetMount[];
  javaScript: boolean;
  deviceScaleFactor?: number;
  extraFiles?: Record<string, Buffer>;
}): Promise<IsolatedPage> {
  const context = await sharedContext(opts.javaScript, opts.deviceScaleFactor ?? 1);
  const page = await context.newPage();
  jobs.set(page, { html: opts.html, mounts: opts.mounts, extraFiles: opts.extraFiles });
  return {
    page,
    context,
    close: () => page.close(),
  };
}
