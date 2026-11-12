// A2.1 teacher-stability regression check (flipbook, overlays in fullscreen, hints on touch/keyboard,
// HUD churn, tap targets). Measures the CURRENT code; exits non-zero while any gated check fails.
//
//   node scripts/a11y-teacher/teacher-stability.mjs --harness C:\Users\Dell\hec-tools\a2-harness --port 5321
//        [--out docs/evidence/A2.1] [--only flipbook,overlays,hints,hud,targets,static] [--sizes 1024x768,768x1024,375x812]
//        [--idle-minute]   (adds the 61 s idle HUD measurement)
//
// --harness: a folder OUTSIDE the repo holding node_modules/playwright (no repo dependency is added).
//            The preview template (scripts/a11y-teacher/preview) is copied into <harness>/preview and served
//            by the repo's own Vite with the Supabase client aliased to a FAKE (made-up children, no network).
// The flipbook is a LOCAL stand-in page (preview/book.html) on a second origin (localhost vs 127.0.0.1).
// The real providers' in-iframe behaviour (Google Slides, Canva, flipbook hosts) is NOT measured.
// Chrome is used through Playwright's "chrome" channel (the installed browser; nothing is downloaded).
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const flag = (k) => process.argv.includes('--' + k);
const HARNESS = path.resolve(arg('harness', 'C:/Users/Dell/hec-tools/a2-harness'));
const PORT = Number(arg('port', '5321'));
const OUT = path.resolve(repo, arg('out', 'docs/evidence/A2.1'));
const ONLY = (arg('only', '') || '').split(',').filter(Boolean);
const SIZES = (arg('sizes', '1024x768,768x1024,375x812')).split(',').map((s) => s.split('x').map(Number));
const BASE = `http://127.0.0.1:${PORT}`;
const want = (k) => !ONLY.length || ONLY.includes(k);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
if (PORT === 5191) { console.error('5191 is the A0 harness port; pick another'); process.exit(2); }

const req = createRequire(path.join(HARNESS, 'package.json'));
const pw = await import(pathToFileURL(req.resolve('playwright')).href);
const chromium = pw.chromium || pw.default.chromium;

// ---------------------------------------------------------------- results
const results = { when: new Date().toISOString(), base: 'vite dev server + fake Supabase client + local stand-in book (NOT production, NOT the real book hosts)', cpu: '4x (CDP Emulation.setCPUThrottlingRate)', network: 'Fast 3G-like (CDP Network.emulateNetworkConditions latency 562.5 ms, 180 KB/s down, 84 KB/s up) applied after the app shell has loaded, plus a 562 ms delay on every book.html request', checks: [] };
const record = (id, size, status, value, detail) => {
  const r = { id, size, status, value, detail };
  results.checks.push(r);
  console.log(`[${status}] ${id}${size ? ' @' + size : ''}: ${detail}`);
  return r;
};
const gate = (id, size, ok, value, detail) => record(id, size, ok ? 'PASS' : 'FAIL', value, detail);
const saveResults = () => { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(results, null, 1)); };

// ---------------------------------------------------------------- preview + server
const pv = path.join(HARNESS, 'preview');
fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
// bare imports from the preview files (react, radix ...) resolve through a junction to the repo's packages
const pvModules = path.join(pv, 'node_modules');
let hasLink = false; try { hasLink = fs.lstatSync(pvModules).isSymbolicLink(); } catch {}
if (!hasLink) fs.symlinkSync(fs.realpathSync(path.join(repo, 'node_modules')), pvModules, 'junction');
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'inherit' }).on('exit', r));
// Vite runs in-process from the repo's own node_modules (a config file outside the repo could not
// resolve "vite"). The fake client alias comes BEFORE "@", so no page can reach the live project.
const repoReq = createRequire(path.join(repo, 'package.json'));
const { createServer } = await import(pathToFileURL(path.join(repo, 'node_modules/vite/dist/node/index.js')).href);
const reactMod = await import(pathToFileURL(repoReq.resolve('@vitejs/plugin-react-swc')).href);
const react = typeof reactMod.default === 'function' ? reactMod.default : reactMod.default.default;
process.chdir(repo); // tailwind content globs are relative to the cwd
const server = await createServer({
  configFile: false, root: pv, cacheDir: path.join(HARNESS, '.vite-cache'), logLevel: 'error',
  css: { postcss: repo },
  server: { host: '127.0.0.1', port: PORT, strictPort: true, fs: { strict: false }, hmr: false },
  plugins: [react()],
  resolve: { alias: [
    { find: '@/integrations/supabase/client', replacement: path.join(pv, 'fake-supabase.ts') },
    { find: '@', replacement: path.join(repo, 'src') },
  ] },
});
await server.listen();
let stopped = false;
const stop = async () => { if (stopped) return; stopped = true; try { await server.close(); } catch {} };
process.on('SIGINT', async () => { await stop(); process.exit(130); });
let up = false;
for (let i = 0; i < 90 && !up; i++) { try { up = (await fetch(BASE + '/')).ok; } catch {} if (!up) await sleep(1000); }
if (!up) { console.error('Vite did not start on ' + PORT); await stop(); process.exit(2); }

const browser = await chromium.launch({ channel: 'chrome' });

// ---------------------------------------------------------------- helpers
const INIT = ([role, live]) => {
  try { localStorage.setItem('fake_role', role); if (live) localStorage.setItem('fake_live', live); else localStorage.removeItem('fake_live'); } catch {}
  window.__book = { loads: [], pages: [] };
  window.addEventListener('message', (e) => {
    const d = e.data; if (!d || d.source !== 'a2-book') return;
    if (d.type === 'load') window.__book.loads.push({ loadId: d.loadId, href: d.href, t: performance.now() });
    else window.__book.pages.push({ page: d.page, loadId: d.loadId, t: performance.now() });
  });
  window.__perf = { longtasks: [], frames: [], rec: false };
  try { new PerformanceObserver((l) => { if (window.__perf.rec) for (const e of l.getEntries()) window.__perf.longtasks.push(e.duration); }).observe({ type: 'longtask', buffered: false }); } catch {}
  let last = 0; const raf = (t) => { if (window.__perf.rec && last) window.__perf.frames.push(t - last); last = t; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
};

async function newPage([w, h], { role = 'teacher', live = '', touch = true } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch && w < 600 });
  await ctx.addInitScript(INIT, [role, live]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => { (page.__errors ||= []).push(String(e)); });
  const cdp = await ctx.newCDPSession(page);
  page.__slow = false;
  await page.route('**/book.html*', async (route) => { if (page.__slow) await sleep(562); await route.continue(); });
  page.__throttle = async () => {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 562.5, downloadThroughput: 180000, uploadThroughput: 84375 });
    page.__slow = true;
  };
  page.__cdp = cdp;
  return { ctx, page };
}

const bookFrame = (page) => page.frameLocator('iframe[src*="book.html"]');
const loads = (page) => page.evaluate(() => window.__book.loads.length);
async function bookPage(page) {
  try { const t = await bookFrame(page).locator('#pg').textContent({ timeout: 20000 }); return Number(/Page (\d+)/.exec(t || '')?.[1] ?? NaN); } catch { return NaN; }
}
async function bookTitle(page) { return page.evaluate(() => document.querySelector('iframe[src*="book.html"]')?.getAttribute('title') ?? null); }
// wait until no new book load for `quiet` ms and the book shows a page (or there is no iframe at all)
async function settle(page, quiet = 1500, max = 30000) {
  const t0 = Date.now(); let n = await loads(page).catch(() => 0); let since = Date.now();
  while (Date.now() - t0 < max) {
    await sleep(250);
    const m = await loads(page).catch(() => n);
    if (m !== n) { n = m; since = Date.now(); continue; }
    if (Date.now() - since >= quiet) break;
  }
  await bookPage(page);
}
async function turn(page, n) { const next = bookFrame(page).locator('#next'); for (let i = 0; i < n; i++) await next.click(); }
async function setVisibility(page, state) {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => s });
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => s === 'hidden' });
    document.dispatchEvent(new Event('visibilitychange', { bubbles: true }));
  }, state);
}
const fsState = (page) => page.evaluate(() => (document.fullscreenElement ? (document.fullscreenElement.tagName + (document.fullscreenElement.contains(document.querySelector('iframe[src*="book.html"]')) ? ' (holds the book)' : '')) : null));

// is `text` shown somewhere a person can see it (not only in a title attribute, not a 1px a11y copy)?
async function hintVisible(page, text) {
  return page.evaluate((text) => {
    const fsEl = document.fullscreenElement;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent || !n.textContent.includes(text)) continue;
      const el = n.parentElement; if (!el) continue;
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
      if (fsEl && !fsEl.contains(el)) continue;
      const x = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), y = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hit = document.elementFromPoint(x, y);
      if (hit && (el.contains(hit) || hit.contains(el) || hit.closest('[data-radix-popper-content-wrapper],[role=tooltip],[role=dialog]')?.contains(el))) return true;
    }
    return false;
  }, text);
}
async function centerOf(locator) { const b = await locator.boundingBox(); return b ? { x: b.x + b.width / 2, y: b.y + b.height / 2, b } : null; }
async function tabTo(page, locator, max = 150) {
  const h = await locator.elementHandle();
  await page.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, 0); });
  await page.mouse.click(1, 1).catch(() => {});
  for (let i = 1; i <= max; i++) {
    await page.keyboard.press('Tab');
    if (await page.evaluate((el) => !!el && (document.activeElement === el || el.contains(document.activeElement)), h)) return i;
  }
  return -1;
}
async function resetPointer(page) { await page.keyboard.press('Escape').catch(() => {}); await page.mouse.move(2, 2).catch(() => {}); await sleep(300); }

// ================================================================= 1. FLIPBOOK (M1-M4, M9)
async function flipbook(size) {
  const S = size.join('x');
  const { ctx, page } = await newPage(size);
  try {
    await page.goto(BASE + '/teacher/books');
    await page.waitForSelector('iframe[src*="book.html"]', { timeout: 90000 });
    await settle(page);
    await page.__throttle();
    // choose book B so a reset to booksData[0] (TeacherBooks.tsx:199-201) is visible
    await page.locator('#active-book-select').click();
    await page.getByRole('option', { name: /Stand-in book B/ }).click();
    await settle(page);
    const l0 = await loads(page);
    record('M1.select-book', S, 'INFO', l0, `loads so far ${l0} (first book + the deliberate switch to book B)`);

    // ---- M9 + M4: 50 page turns, parent-page cost and history entries
    const hist0 = await page.evaluate(() => history.length);
    await page.evaluate(() => { window.__perf.longtasks = []; window.__perf.frames = []; window.__perf.rec = true; });
    await page.__cdp.send('HeapProfiler.enable'); await page.__cdp.send('HeapProfiler.collectGarbage');
    const heap0 = (await page.__cdp.send('Runtime.getHeapUsage')).usedSize;
    const tt = Date.now();
    await turn(page, 50);
    const turnMs = Date.now() - tt;
    await page.__cdp.send('HeapProfiler.collectGarbage');
    const heap1 = (await page.__cdp.send('Runtime.getHeapUsage')).usedSize;
    const perf = await page.evaluate(() => { window.__perf.rec = false; const f = window.__perf.frames; const s = [...f].sort((a, b) => a - b); return { longtasks: window.__perf.longtasks.length, longMs: Math.round(window.__perf.longtasks.reduce((a, b) => a + b, 0)), frames: f.length, p95: Math.round(s[Math.floor(s.length * 0.95)] || 0), max: Math.round(s[s.length - 1] || 0), over50: f.filter((x) => x > 50).length }; });
    const p50 = await bookPage(page); const hist1 = await page.evaluate(() => history.length);
    const l50 = await loads(page);
    record('M9.parent-cost', S, 'INFO', perf, `50 turns in ${turnMs} ms wall: parent long tasks ${perf.longtasks} (${perf.longMs} ms), rAF frames ${perf.frames}, p95 ${perf.p95} ms, max ${perf.max} ms, frames >50 ms ${perf.over50}`);
    record('M9.parent-heap', S, 'INFO', { before: heap0, after: heap1 }, `parent JS heap after GC ${(heap0 / 1048576).toFixed(1)} -> ${(heap1 / 1048576).toFixed(1)} MiB over 50 turns`);
    record('M4.history', S, 'INFO', { added: hist1 - hist0, page: p50, loads: l50 - l0 }, `50 turns added ${hist1 - hist0} entries to the TAB's history (history.length ${hist0} -> ${hist1}); book on page ${p50}; extra loads during turns ${l50 - l0}`);

    // ---- M1 + M2: TOKEN_REFRESHED while presenting fullscreen
    await page.getByRole('button', { name: /Present Fullscreen/ }).click();
    await sleep(800);
    const fsBefore = await fsState(page);
    const t1 = await bookTitle(page);
    const before = await loads(page);
    await page.evaluate(() => window.__fakeAuth.emit('TOKEN_REFRESHED'));
    await settle(page);
    const dTok = (await loads(page)) - before; const pTok = await bookPage(page); const tTok = await bookTitle(page); const fsAfter = await fsState(page);
    gate('M1.token-refresh', S, dTok === 0 && pTok === p50 && tTok === t1, { loads: dTok, page: [p50, pTok], book: [t1, tTok] }, `TOKEN_REFRESHED: +${dTok} iframe load(s); page ${p50} -> ${pTok}; book "${t1}" -> "${tTok}"`);
    gate('M2.fullscreen-kept', S, !!fsBefore && !!fsAfter, { before: fsBefore, after: fsAfter }, `fullscreenElement before ${fsBefore ?? 'none'} -> after TOKEN_REFRESHED ${fsAfter ?? 'none'}`);
    if (!fsBefore) record('M2.note', S, 'INFO', null, 'fullscreen could not be entered in this browser context; M2 not meaningful at this size');
    if (await page.evaluate(() => !!document.fullscreenElement)) await page.evaluate(() => document.exitFullscreen()).catch(() => {});
    await sleep(400);

    // ---- M1: tab hidden -> visible (supabase-js emits SIGNED_IN with a new session object)
    if ((await bookTitle(page)) !== t1) { await page.locator('#active-book-select').click(); await page.getByRole('option', { name: /Stand-in book B/ }).click(); await settle(page); }
    let pg = await bookPage(page); if (pg < 10) { await turn(page, 10); pg = await bookPage(page); }
    const tv = await bookTitle(page); const bv = await loads(page);
    await setVisibility(page, 'hidden'); await sleep(500); await setVisibility(page, 'visible');
    await settle(page);
    const dVis = (await loads(page)) - bv; const pVis = await bookPage(page); const tVis = await bookTitle(page);
    gate('M1.visibility', S, dVis === 0 && pVis === pg && tVis === tv, { loads: dVis, page: [pg, pVis], book: [tv, tVis] }, `hidden->visible (fake emits SIGNED_IN as auth-js does): +${dVis} load(s); page ${pg} -> ${pVis}; book "${tv}" -> "${tVis}"`);

    // ---- M3: Present -> Settings -> Present
    if ((await bookTitle(page)) !== t1) { await page.locator('#active-book-select').click(); await page.getByRole('option', { name: /Stand-in book B/ }).click(); await settle(page); }
    pg = await bookPage(page); if (pg < 10) { await turn(page, 10); pg = await bookPage(page); }
    let b = await loads(page);
    await page.getByRole('tab', { name: /Settings/ }).click(); await sleep(600);
    await page.getByRole('tab', { name: /Presenter/ }).click(); await settle(page);
    const dTab = (await loads(page)) - b; const pTab = await bookPage(page);
    gate('M3.tab-switch', S, dTab === 0 && pTab === pg, { loads: dTab, page: [pg, pTab] }, `Presenter -> Settings -> Presenter: +${dTab} load(s); page ${pg} -> ${pTab}`);

    // ---- M3: title-only edit (measured as: loads of the edit path minus loads of a bare tab round trip)
    const editPath = async (mutate) => {
      const tb = await bookTitle(page);
      pg = await bookPage(page); if (pg < 10) { await turn(page, 10); pg = await bookPage(page); }
      const b0 = await loads(page);
      await page.getByRole('tab', { name: /Settings/ }).click(); await sleep(500);
      const row = page.getByRole('row').filter({ hasText: tb });
      await row.getByRole('button').first().click();
      await page.locator('#book-title').waitFor();
      await mutate();
      await page.getByRole('button', { name: /Save Changes/ }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' }).catch(() => {});
      await page.getByRole('tab', { name: /Presenter/ }).click(); await settle(page);
      return { d: (await loads(page)) - b0, page: [pg, await bookPage(page)], book: [tb, await bookTitle(page)] };
    };
    const ttl = await editPath(async () => { await page.locator('#book-title').fill(((await bookTitle(page)) || 'Book') + ' (edited)'); });
    gate('M3.title-edit', S, ttl.d - dTab === 0 && ttl.page[1] === ttl.page[0], ttl, `title-only edit path: +${ttl.d} load(s) (tab round trip alone +${dTab}, so the edit itself adds ${ttl.d - dTab}); page ${ttl.page[0]} -> ${ttl.page[1]}`);
    const url = await editPath(async () => { const u = await page.locator('#book-url').inputValue(); await page.locator('#book-url').fill(u.replace(/(\?b=\d+).*$/, '$1&v=2')); });
    record('M3.url-edit', S, 'INFO', url, `URL edit path: +${url.d} load(s) (tab round trip alone +${dTab}; a URL change is a legitimate reload, expected exactly 1 after the fix)`);

    // ---- M4: where does the browser Back button land?
    pg = await bookPage(page); if (pg < 5) { await turn(page, 5); pg = await bookPage(page); }
    const u0 = page.url(); const h0 = await page.evaluate(() => history.length);
    await page.goBack({ timeout: 8000 }).catch(() => {}); await sleep(1200);
    const u1 = page.url(); const pBack = await bookPage(page);
    record('M4.back', S, 'INFO', { url: [u0, u1], page: [pg, pBack], historyLength: h0 }, `browser Back from book page ${pg}: app URL ${u1 === u0 ? 'unchanged' : u0 + ' -> ' + u1}; book page ${pg} -> ${pBack}`);
    if (page.__errors?.length) record('page-errors', S, 'INFO', page.__errors.slice(0, 5), `${page.__errors.length} page error(s): ${page.__errors[0]}`);
  } catch (e) {
    record('flipbook.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, `flipbook-error-${S}.png`) }).catch(() => {});
  } finally { await ctx.close(); }
}

// ================================================================= run
fs.mkdirSync(OUT, { recursive: true });
try {
  for (const size of SIZES) {
    if (want('flipbook')) await flipbook(size);
    saveResults();
  }
} finally {
  saveResults();
  await browser.close().catch(() => {});
  await stop();
}
const fails = results.checks.filter((c) => c.status === 'FAIL');
console.log(`\n${results.checks.length} lines, ${fails.length} FAIL. Results: ${path.relative(repo, path.join(OUT, 'results.json'))}`);
process.exit(fails.length ? 1 : 0);
