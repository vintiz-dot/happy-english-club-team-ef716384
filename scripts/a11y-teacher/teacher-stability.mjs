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
  // a tablet/phone: no hover, coarse pointer (index.css:805-812 keys 44 px targets off `hover: none`)
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: touch ? [{ name: 'hover', value: 'none' }, { name: 'any-hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'any-hover', value: 'hover' }, { name: 'pointer', value: 'fine' }, { name: 'any-pointer', value: 'fine' }] });
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
    // deepest elements whose text contains `text` ("+{pts}" renders as two text nodes, so match elements)
    // (an element also counts when its OWN text nodes hold the text: Radix tooltips repeat it in a 1px a11y child)
    const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    const cands = [...document.body.querySelectorAll('*')].filter((e) => e.tagName !== 'SCRIPT' && e.tagName !== 'STYLE' && (e.textContent || '').includes(text) && (own(e).includes(text) || ![...e.children].some((c) => (c.textContent || '').includes(text))));
    for (const el of cands) {
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
    record('M4.history', S, 'INFO', { added: hist1 - hist0, page: p50, loads: l50 - l0 }, `50 turns added ${hist1 - hist0} entries to the TAB's history (history.length ${hist0} -> ${hist1}; Chrome caps history.length at 50); book on page ${p50}; extra loads during turns ${l50 - l0}`);
    if (S === '1024x768') { // M9: two more runs of 50 turns (back 50, then forward 50), heap after GC each time
      const heaps = [heap0, heap1];
      for (const d of [-1, 1]) {
        const loc = bookFrame(page).locator(d < 0 ? '#prev' : '#next');
        for (let i = 0; i < 50; i++) await loc.click();
        await page.__cdp.send('HeapProfiler.collectGarbage');
        heaps.push((await page.__cdp.send('Runtime.getHeapUsage')).usedSize);
      }
      record('M9.parent-heap-3runs', S, 'INFO', heaps, `parent JS heap after GC across 3 x 50 turns: ${heaps.map((x) => (x / 1048576).toFixed(1)).join(' -> ')} MiB; book page now ${await bookPage(page)}`);
    }

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
    // M4 after a reload: what do the book's old history entries do now?
    if (dTok > 0) {
      const ua = page.url(); const pa = await bookPage(page);
      await page.goBack({ timeout: 8000 }).catch(() => {}); await sleep(1500);
      const ub = page.url(); const pb = await bookPage(page); const lb = await loads(page);
      record('M4.back-after-reload', S, 'INFO', { url: [ua, ub], page: [pa, pb] }, `browser Back right after the reload: app URL ${ub === ua ? 'unchanged' : ua + ' -> ' + ub}; book page ${pa} -> ${Number.isNaN(pb) ? 'no book' : pb}; loads now ${lb}`);
      if (ub !== ua) { await page.goForward({ timeout: 8000 }).catch(() => {}); await page.waitForSelector('iframe[src*="book.html"]', { timeout: 60000 }).catch(() => {}); await settle(page); }
    }

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
    // the page criterion only applies once the bare tab round trip keeps the page (else it is H2's reset)
    gate('M3.title-edit', S, ttl.d - dTab === 0 && (dTab > 0 || ttl.page[1] === ttl.page[0]), ttl, `title-only edit path: +${ttl.d} load(s) (tab round trip alone +${dTab}, so the edit itself adds ${ttl.d - dTab}); page ${ttl.page[0]} -> ${ttl.page[1]}`);
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

// ================================================================= 2. OVERLAYS IN FULLSCREEN (M5, H5, H8)
const textInDom = (page, t) => page.evaluate((t) => document.body.textContent.includes(t), t);
async function ensureLabFs(page) {
  if (!(await page.evaluate(() => !!document.fullscreenElement))) { await page.locator('#lab-fs').click(); await sleep(700); }
  return page.evaluate(() => !!document.fullscreenElement);
}
async function closeOverlay(page) { await page.keyboard.press('Escape').catch(() => {}); await sleep(400); await page.mouse.move(2, 2).catch(() => {}); }
const LAB_OVERLAYS = [
  { id: 'SkillButton-popover', text: '+10', open: (p) => p.locator('#lab-skill button').first().click() },
  { id: 'StudentActionPopover', text: 'Trần Bảo Châu', open: (p) => p.locator('#sap-trigger').click() },
  { id: 'ui-popover', text: 'Lab popover body', open: (p) => p.locator('#lab-popover-trigger').click() },
  { id: 'ui-select', text: 'Lab option Alpha', open: (p) => p.locator('#lab-select-trigger').click() },
  { id: 'ui-dialog', text: 'lab dialog body', open: (p) => p.locator('#lab-dialog-trigger').click() },
  { id: 'ui-dropdown-menu', text: 'Lab menu item', open: (p) => p.locator('#lab-menu-trigger').click() },
  { id: 'ui-alert-dialog', text: 'lab alert body', open: (p) => p.locator('#lab-alert-trigger').click() },
  { id: 'ui-sheet', text: 'lab sheet body', open: (p) => p.locator('#lab-sheet-trigger').click() },
  { id: 'ui-tooltip', text: 'Lab tooltip text', open: async (p) => { await p.locator('#lab-tip-trigger').focus(); } },
];
async function overlays(size) {
  const S = size.join('x');
  const { ctx, page } = await newPage(size, { live: '1' });
  try {
    await page.goto(BASE + '/__lab');
    await page.waitForSelector('#lab-hud button', { timeout: 90000 });
    await page.__throttle();
    // control: every overlay is visible when NOT fullscreen (proves the probe itself)
    if (S === '1024x768') for (const o of LAB_OVERLAYS) {
      await o.open(page); await sleep(800);
      const vis = await hintVisible(page, o.text);
      record(`M5.control.${o.id}`, S, vis ? 'INFO' : 'FAIL', vis, `not fullscreen (control): ${o.id} ${vis ? 'visible' : 'NOT visible - probe broken'}`);
      await closeOverlay(page);
    }
    // H8a: a tooltip already open when fullscreen starts
    const steps = await tabTo(page, page.locator('#lab-tip-trigger')); await sleep(700);
    const openBefore = await hintVisible(page, 'Lab tooltip text');
    await page.keyboard.press('Shift'); // a trusted key press = user activation for requestFullscreen
    await page.evaluate(() => document.getElementById('fs-host').requestFullscreen()).catch(() => {});
    await sleep(900);
    const fsOn = await page.evaluate(() => !!document.fullscreenElement);
    const stillInDom = await textInDom(page, 'Lab tooltip text'); const visFs = await hintVisible(page, 'Lab tooltip text');
    const where = await page.evaluate(() => { const fs = document.fullscreenElement; const n = [...document.querySelectorAll('[data-radix-popper-content-wrapper]')].find((e) => e.textContent.includes('Lab tooltip text')); return n ? (fs && fs.contains(n) ? 'inside the fullscreen element' : 'outside the fullscreen element') : 'not in DOM'; });
    gate('M5.H8.tooltip-open-across-enter', S, !fsOn || !stillInDom || visFs, { steps, openBefore, fsOn, stillInDom, visFs, where }, `tooltip open by keyboard (${steps} Tabs, visible ${openBefore}) then fullscreen ${fsOn ? 'on' : 'FAILED'}: tooltip ${stillInDom ? 'still open, ' + where + ', visible ' + visFs : 'closed itself (no stale portal to judge)'}`);
    await page.locator('#lab-tip-trigger').blur().catch(() => {}); await sleep(300);
    // M5: each overlay opened while fullscreen
    for (const o of LAB_OVERLAYS) {
      const on = await ensureLabFs(page);
      if (!on) { record(`M5.${o.id}`, S, 'NOTMEASURED', null, 'fullscreen could not be entered'); continue; }
      await o.open(page); await sleep(800);
      const inDom = await textInDom(page, o.text); const vis = await hintVisible(page, o.text);
      const where = await page.evaluate((t) => { const fs = document.fullscreenElement; const all = [...document.body.querySelectorAll('*')].filter((e) => (e.textContent || '').includes(t) && ![...e.children].some((c) => (c.textContent || '').includes(t))); const best = all[all.length - 1]; if (!best) return 'not in DOM'; return fs && fs.contains(best) ? 'inside fullscreen element' : 'portalled outside the fullscreen element (' + (best.closest('body > *')?.tagName || '?') + ' child of body)'; }, o.text);
      gate(`M5.${o.id}`, S, vis, { inDom, vis, where }, `in fullscreen: ${o.id} opened=${inDom}, ${where}, visible=${vis}`);
      await closeOverlay(page);
      if (o.id === 'ui-tooltip') await page.locator('#lab-tip-trigger').blur().catch(() => {});
    }
    // H8b: a tooltip open INSIDE fullscreen, then fullscreen ends
    if (await ensureLabFs(page)) {
      await page.locator('#lab-tip-trigger').focus(); await sleep(700);
      const v0 = await hintVisible(page, 'Lab tooltip text');
      await page.evaluate(() => document.exitFullscreen()).catch(() => {}); await sleep(900);
      const v1 = await hintVisible(page, 'Lab tooltip text'); const d1 = await textInDom(page, 'Lab tooltip text');
      const conn = await page.evaluate(() => { const n = [...document.querySelectorAll('[data-radix-popper-content-wrapper]')].find((e) => e.textContent.includes('Lab tooltip text')); return n ? n.isConnected : null; });
      // A2.3 diagnostics: where the open tooltip is after fullscreen ends, and what covers its centre
      const dbg = await page.evaluate(() => { const n = [...document.querySelectorAll('[data-radix-popper-content-wrapper]')].find((e) => e.textContent.includes('Lab tooltip text')); if (!n) return null; const c = n.firstElementChild || n; const r = c.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { parent: n.parentElement?.tagName + (n.parentElement?.id ? '#' + n.parentElement.id : ''), rect: [r.left, r.top, r.width, r.height].map(Math.round), opacity: getComputedStyle(c).opacity, state: c.getAttribute('data-state'), wrapperTransform: n.style.transform, hit: hit ? hit.tagName + (hit.id ? '#' + hit.id : '') : null, focusOnTrigger: document.activeElement?.id === 'lab-tip-trigger', viewport: [innerWidth, innerHeight] }; });
      gate('M5.H8.tooltip-open-across-exit', S, !d1 || v1, { v0, v1, d1, conn, dbg }, `tooltip open in fullscreen (visible ${v0}), fullscreen ends: ${d1 ? 'still open, connected ' + conn + ', visible ' + v1 : 'closed itself'}`);
    }
    if (page.__errors?.length) record('page-errors.lab', S, 'INFO', page.__errors.slice(0, 5), `${page.__errors.length} page error(s): ${page.__errors[0]}`);
  } catch (e) {
    record('overlays.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
    await page.screenshot({ path: path.join(OUT, `overlays-error-${S}.png`) }).catch(() => {});
  } finally { await ctx.close(); }

  // the real page: TeacherBooks fullscreen -> classroom tools -> a Select inside a tool
  const { ctx: c2, page: p2 } = await newPage(size);
  try {
    await p2.goto(BASE + '/teacher/books');
    await p2.waitForSelector('iframe[src*="book.html"]', { timeout: 90000 }); await settle(p2);
    await p2.__throttle();
    await p2.getByRole('button', { name: /Present Fullscreen/ }).click(); await sleep(900);
    const fsOn = await fsState(p2);
    await p2.getByRole('button', { name: /Open classroom tools/ }).click(); await sleep(1200);
    const sheetVis = await hintVisible(p2, 'nothing hides anything else');
    gate('M5.TeacherBooks.classroom-tools-sheet', S, !!fsOn && sheetVis, { fsOn, sheetVis }, `fullscreen ${fsOn ?? 'none'}; classroom tools sheet visible=${sheetVis}`);
    // a Select inside a tool panel (TeamMaker / LeaderboardTool use ui/select)
    // data tools are Deferred until near the viewport: jump to them first
    for (const t of ['Teams', 'Board']) { await p2.getByRole('navigation', { name: 'Jump to a tool' }).getByRole('button', { name: t }).click().catch(() => {}); await sleep(2500); }
    await p2.getByRole('navigation', { name: 'Jump to a tool' }).getByRole('button', { name: 'Teams' }).click().catch(() => {}); await sleep(1500);
    const combo = p2.getByRole('dialog').getByRole('combobox').first();
    if (await combo.count()) {
      await combo.scrollIntoViewIfNeeded().catch(() => {}); await combo.click(); await sleep(900);
      const opt = await p2.evaluate(() => { const o = document.querySelector('[role=option]'); if (!o) return null; const fs = document.fullscreenElement; const r = o.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { text: o.textContent.trim().slice(0, 40), inFs: !!fs && fs.contains(o), hit: !!hit && o.contains(hit) }; });
      gate('M5.TeacherBooks.tool-select', S, !!opt && opt.inFs && opt.hit, opt, opt ? `Select in a tool panel: first option "${opt.text}" inside fullscreen=${opt.inFs}, hit-testable=${opt.hit}` : 'Select opened but no option rendered');
    } else record('M5.TeacherBooks.tool-select', S, 'NOTMEASURED', null, 'no Select found in the open tools sheet');
  } catch (e) {
    record('overlays.books.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
    await p2.screenshot({ path: path.join(OUT, `overlays-books-error-${S}.png`) }).catch(() => {});
  } finally { await c2.close(); }
}

// ================================================================= 3. HINTS: hover / tap / keyboard (M6, H6, H7)
async function hintMatrix(page, S, id, locator, hint, { tapGated = true, hoverGated = true, native = false } = {}) {
  const c = await centerOf(locator);
  if (!c) { record(`M6.${id}`, S, 'NOTMEASURED', null, 'control not rendered'); return; }
  const res = {};
  // hover (mouse)
  await page.mouse.move(c.x, c.y); await sleep(1200);
  res.hover = await hintVisible(page, hint);
  await resetPointer(page);
  // keyboard: walk with Tab from the top of the page
  const steps = await tabTo(page, locator); await sleep(800);
  res.keyboardReached = steps > 0; res.keyboard = steps > 0 && (await hintVisible(page, hint));
  await page.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur());
  await resetPointer(page);
  // tap (touch)
  if (tapGated !== 'skip') {
    await page.touchscreen.tap(c.x, c.y); await sleep(1000);
    res.tap = await hintVisible(page, hint);
    await resetPointer(page);
  }
  const how = native ? ' (native title=: no DOM hint; a browser may still draw its own title bubble on mouse hover)' : '';
  if (native) record(`M6.${id}.hover`, S, 'INFO', res.hover, `hover: DOM hint visible=${res.hover}${how}`);
  else if (hoverGated) gate(`M6.${id}.hover`, S, res.hover, res.hover, `hover: hint visible=${res.hover}`);
  else record(`M6.${id}.hover`, S, 'INFO', res.hover, `hover: hint visible=${res.hover}`);
  gate(`M6.${id}.keyboard`, S, res.keyboard, { steps, ...res }, `keyboard: ${res.keyboardReached ? `reached after ${steps} Tab(s)` : 'NOT reachable with Tab'}, hint visible=${res.keyboard}${how}`);
  if (tapGated === 'skip') record(`M6.${id}.tap`, S, 'INFO', null, 'tap: not run - a tap activates this control (navigates / opens a tab); there is no hint to see first');
  else if (tapGated) gate(`M6.${id}.tap`, S, res.tap, res.tap, `tap: hint visible=${res.tap}${how}`);
  else record(`M6.${id}.tap`, S, 'INFO', res.tap, `tap: hint visible=${res.tap}`);
}
async function hints(size) {
  const S = size.join('x');
  // (a) lab: HUD chip title, ui/tooltip primitive
  {
    const { ctx, page } = await newPage(size, { live: '1' });
    try {
      // A2.3: the chip's hint is no longer a title= attribute; a chip with points today is one that shows "Last engaged"
      await page.goto(BASE + '/__lab'); await page.waitForSelector('#lab-hud button', { timeout: 90000 });
      await page.__throttle();
      const chip = page.locator('#lab-hud button').filter({ hasText: /\+\d/ }).first();
      await hintMatrix(page, S, 'HUD-chip-last-engaged', chip, 'Last engaged', { native: /title="?Last engaged/.test(await chip.evaluate((b) => b.outerHTML)) });
      await hintMatrix(page, S, 'ui-tooltip-primitive', page.locator('#lab-tip-trigger'), 'Lab tooltip text');
    } catch (e) { record('hints.lab.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]); } finally { await ctx.close(); }
  }
  // (b) TeacherLeaderboards with no lesson in progress: the Live button's reason tooltip (H7)
  {
    const { ctx, page } = await newPage(size, { live: '0' });
    try {
      await page.goto(BASE + '/teacher/leaderboards'); const live = page.locator('button:has(svg.lucide-zap)').first();
      await live.waitFor({ timeout: 90000 }); await sleep(1500);
      await page.__throttle();
      const st = await live.evaluate((b) => ({ disabled: b.disabled, pe: getComputedStyle(b).pointerEvents, name: (b.getAttribute('aria-label') || b.innerText || '').trim() }));
      record('M6.Leaderboards-live.state', S, 'INFO', st, `Live button disabled=${st.disabled}, pointer-events=${st.pe}, visible name "${st.name}"`);
      // A2.3: the disabled button may sit in a focusable wrapper; the outermost of the two is the trigger
      const liveTrigger = page.locator(':is(span[tabindex="0"], button):has(svg.lucide-zap)').first();
      await hintMatrix(page, S, 'Leaderboards-live-reason', liveTrigger, 'No session in progress for this class');
    } catch (e) { record('hints.leaderboards.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]); } finally { await ctx.close(); }
  }
  // (c) TeacherBooks' two icon buttons with native title= (TeacherBooks.tsx:439, :515)
  {
    const { ctx, page } = await newPage(size);
    try {
      await page.goto(BASE + '/teacher/books'); await page.waitForSelector('iframe[src*="book.html"]', { timeout: 90000 }); await settle(page);
      await page.__throttle();
      await hintMatrix(page, S, 'Books-back-button', page.locator('button[title="Return to LMS"]'), 'Return to LMS', { native: true, tapGated: 'skip' });
      await hintMatrix(page, S, 'Books-open-in-tab', page.locator('button[title="Open directly in tab"]'), 'Open directly in tab', { native: true, tapGated: 'skip' });
    } catch (e) { record('hints.books.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]); } finally { await ctx.close(); }
  }
}

// ================================================================= 4. HUD churn (M7, H9) - 1024x768 only
async function hud(size) {
  const S = size.join('x');
  const { ctx, page } = await newPage(size, { live: '1' });
  try {
    await page.goto(BASE + '/__lab'); await page.waitForSelector('#lab-hud button', { timeout: 90000 }); await sleep(3000);
    await page.__throttle(); await sleep(1500);
    const subs = await page.evaluate(() => window.__rt.subs.filter((s) => !s.removed && s.channel.startsWith('hud-')).map((s) => ({ channel: s.channel, table: s.filter?.table, event: s.filter?.event, filter: s.filter?.filter ?? null })));
    const att = subs.find((s) => s.table === 'attendance');
    // INFO, not gated: the plan allows either a filter or a debounce; M7.unrelated-burst gates both
    record('M7.attendance-subscription-filter', S, att && att.filter ? 'INFO' : 'INFO', subs, `HUD realtime subscriptions: ${subs.map((s) => `${s.table}(${s.event}) filter=${s.filter ?? 'NONE'}`).join('; ')}`);
    const HUDT = ['enrollments', 'point_transactions', 'sessions', 'attendance'];
    const snap = () => page.evaluate((T) => ({ commits: window.__hudCommits.filter((c) => c.phase !== 'mount').length, reqs: window.__requests.filter((r) => T.includes(r.name)).length }), HUDT);
    const unrelated = (k) => page.evaluate((k) => window.__rt.emit('attendance', { eventType: 'UPDATE', new: { id: 'a-x' + k, session_id: 'ses-other-class-' + k, student_id: 's-0009', status: 'Present' }, old: {} }), k);
    // single unrelated events, 3 s apart
    const per = [];
    for (let k = 0; k < 3; k++) { const a = await snap(); const delivered = await unrelated(k); await sleep(3000); const b = await snap(); per.push({ delivered, commits: b.commits - a.commits, requests: b.reqs - a.reqs }); }
    // a burst of 5 unrelated events within about one second
    const a = await snap();
    for (let k = 0; k < 5; k++) { await unrelated(10 + k); await sleep(200); }
    await sleep(3000); const b = await snap();
    const burst = { commits: b.commits - a.commits, requests: b.reqs - a.reqs };
    record('M7.unrelated-single', S, 'INFO', per, `each unrelated attendance event (another class's session): delivered to ${per.map((p) => p.delivered).join('/')} HUD handler(s), HUD commits ${per.map((p) => p.commits).join('/')}, HUD queries ${per.map((p) => p.requests).join('/')}`);
    gate('M7.unrelated-burst', S, burst.commits <= 1 && burst.requests <= 4, burst, `5 unrelated attendance events in ~1 s: HUD commits ${burst.commits}, HUD queries ${burst.requests} (gate: <= 1 commit and <= 1 refetch = 4 queries per 2 s)`);
    // control: a related point for this class does refresh the HUD
    const c0 = await snap();
    await page.evaluate(() => window.__rt.emit('point_transactions', { eventType: 'INSERT', new: { id: 'pt-x', class_id: 'c-0001', student_id: 's-0001', points: 1 }, old: {} }));
    await sleep(3000); const c1 = await snap();
    record('M7.related-control', S, 'INFO', { commits: c1.commits - c0.commits, requests: c1.reqs - c0.reqs }, `control: a point for THIS class -> HUD commits ${c1.commits - c0.commits}, queries ${c1.reqs - c0.reqs}`);
    // an open StudentActionPopover across an unrelated refetch
    const chip = page.locator('#lab-hud button').first();
    await chip.click(); await sleep(1200);
    const focused = await page.evaluate(() => { const d = [...document.querySelectorAll('[role=dialog]')].pop(); const btn = d && d.querySelector('button:not([disabled])'); if (!btn) return null; btn.focus(); window.__keep = btn; return btn.textContent.trim().slice(0, 30); });
    const o0 = await snap();
    await unrelated(99); await sleep(3000);
    const o1 = await snap();
    const kept = await page.evaluate(() => ({ open: !!document.querySelector('[role=dialog]'), sameFocus: document.activeElement === window.__keep, connected: !!window.__keep && window.__keep.isConnected }));
    gate('M7.open-popover-kept', S, kept.open && kept.sameFocus && kept.connected, { focused, ...kept, commits: o1.commits - o0.commits, requests: o1.reqs - o0.reqs }, `open StudentActionPopover (focus on "${focused}") across an unrelated event (+${o1.commits - o0.commits} commits, +${o1.reqs - o0.reqs} queries): still open=${kept.open}, focus kept=${kept.sameFocus}, focused node connected=${kept.connected}`);
    await closeOverlay(page);
    if (flag('idle-minute')) {
      const openTips = () => page.evaluate(() => ({ tooltips: document.querySelectorAll('[role=tooltip]').length, focus: (document.activeElement?.textContent || document.activeElement?.tagName || '').trim().slice(0, 20) }));
      const t0 = await openTips();
      const i0 = await snap(); await sleep(61000); const i1 = await snap();
      record('M7.idle-minute.state', S, 'INFO', t0, `at the start of the idle window: open tooltips ${t0.tooltips}, focus on "${t0.focus}"`);
      record('M7.idle-minute', S, 'INFO', { commits: i1.commits - i0.commits, requests: i1.reqs - i0.reqs }, `61 s idle: HUD commits ${i1.commits - i0.commits}, HUD queries ${i1.reqs - i0.reqs} (30 s tick at LiveEngagementHUD.tsx:46-49, 60 s refetchInterval at :54)`);
    } else record('M7.idle-minute', S, 'NOTMEASURED', null, 'run with --idle-minute to measure the 61 s idle window');
  } catch (e) {
    record('hud.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
  } finally { await ctx.close(); }
}

// ================================================================= 5. TAP TARGETS under 44x44 (M8, H10)
async function smallTargets(page, rootSel) {
  return page.evaluate((rootSel) => {
    const roots = [...document.querySelectorAll(rootSel)];
    const out = [];
    for (const root of roots) for (const el of root.querySelectorAll('button, a[href], input, select, textarea, [role=button], [role=option], [tabindex]:not([tabindex="-1"])')) {
      const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
      out.push({ label: (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 24), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  }, rootSel);
}
function reportTargets(S, id, list, gated = true) {
  const small = list.filter((t) => t.w < 44 || t.h < 44);
  const sample = small.slice(0, 6).map((t) => `"${t.label}" ${t.w}x${t.h}`).join(', ');
  const detail = `${small.length} of ${list.length} interactive targets under 44x44${small.length ? ': ' + sample + (small.length > 6 ? ', ...' : '') : ''}`;
  return gated ? gate(`M8.${id}`, S, list.length > 0 && small.length === 0, { total: list.length, small }, list.length ? detail : 'no targets found - probe broken') : record(`M8.${id}`, S, 'INFO', { total: list.length, small }, detail);
}
async function targets(size) {
  for (const touch of [true, false]) {
    const S = size.join('x') + (touch ? ' touch' : ' mouse');
    const { ctx, page } = await newPage(size, { live: '1', touch });
    try {
      await page.goto(BASE + '/__lab'); await page.waitForSelector('#lab-hud button', { timeout: 90000 }); await sleep(1500);
      const mq = await page.evaluate(() => ({ hoverNone: matchMedia('(hover: none)').matches, coarse: matchMedia('(pointer: coarse)').matches }));
      record('M8.media', S, 'INFO', mq, `(hover: none)=${mq.hoverNone}, (pointer: coarse)=${mq.coarse}`);
      // gated on touch (the tablet in class); the mouse context is reported for comparison
      reportTargets(S, 'HUD-chips', await smallTargets(page, '#lab-hud'), touch);
      await page.locator('#lab-skill button').first().click(); await sleep(800);
      reportTargets(S, 'SkillButton-popover', await smallTargets(page, '[data-radix-popper-content-wrapper]'), touch);
      await closeOverlay(page);
      const radial = [...await smallTargets(page, '#lab-radial')];
      await page.locator('#lab-radial button', { hasText: 'Correction' }).click(); await sleep(500);
      radial.push(...await smallTargets(page, '#lab-radial'));
      await page.locator('#lab-radial button').nth(1).click(); await sleep(500);
      radial.push(...await smallTargets(page, '#lab-radial'));
      reportTargets(S, 'RadialSkillMenu-all-stages', radial, touch);
      await page.locator('#lab-hud button').first().click(); await sleep(1200);
      reportTargets(S, 'StudentActionPopover', await smallTargets(page, '[role=dialog]'), false);
    } catch (e) {
      record('targets.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
    } finally { await ctx.close(); }
  }
}

// ================================================================= 5b. NEUTRALITY outside fullscreen (A2.3): where each overlay's content is portalled
// With no fullscreen element the shared ui/* primitives must behave exactly as before: content portalled
// to document.body. Records the chain from body to the content and its rect, so before/after can be diffed.
async function neutral(size) {
  const S = size.join('x');
  const { ctx, page } = await newPage(size, { live: '1', touch: false });
  try {
    await page.goto(BASE + '/__lab'); await page.waitForSelector('#lab-hud button', { timeout: 90000 }); await sleep(1500);
    for (const o of LAB_OVERLAYS) {
      await o.open(page); await sleep(900);
      const pos = await page.evaluate((t) => {
        const own = (e) => [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
        const el = [...document.body.querySelectorAll('*')].filter((e) => own(e).includes(t) && getComputedStyle(e).position !== 'absolute').pop(); // last: portals are appended after the app
        if (!el) return null;
        let root = el; while (root.parentElement && root.parentElement !== document.body) root = root.parentElement;
        const chain = []; for (let n = el; n && n !== document.body; n = n.parentElement) chain.unshift(n.tagName.toLowerCase() + (n.getAttribute('role') ? `[role=${n.getAttribute('role')}]` : '') + (n.hasAttribute('data-radix-popper-content-wrapper') ? '[popper]' : ''));
        const r = el.getBoundingClientRect();
        return { portalParent: root.parentElement ? root.parentElement.tagName : null, rootIsLab: root.id === 'root' || !!root.querySelector('#fs-host'), chain: chain.join('>'), rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], fs: !!document.fullscreenElement };
      }, o.text);
      gate(`N.${o.id}.portal-parent`, S, !!pos && pos.portalParent === 'BODY' && !pos.rootIsLab && !pos.fs, pos, pos ? `no fullscreen: content portalled to ${pos.portalParent} (own body child, not the app root: ${!pos.rootIsLab}); chain ${pos.chain}; rect ${pos.rect.join(',')}` : 'content not found');
      await closeOverlay(page);
      if (o.id === 'ui-tooltip') await page.locator('#lab-tip-trigger').blur().catch(() => {});
    }
  } catch (e) {
    record('neutral.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
  } finally { await ctx.close(); }
}

// ================================================================= 5c. CLICK-THROUGH (A2.3): the same writes before and after
// award +1 and custom 7 on SkillButton (onTap args), then +1 skill and a -1 correction in StudentActionPopover
// (fake-client requests). The list is recorded; compare the before / after results files.
async function clickthrough(size) {
  const S = size.join('x');
  const { ctx, page } = await newPage(size, { live: '1', touch: false });
  try {
    await page.goto(BASE + '/__lab'); await page.waitForSelector('#lab-hud button', { timeout: 90000 }); await sleep(2500);
    const n0 = await page.evaluate(() => window.__requests.length);
    await page.locator('#lab-skill button').first().click(); await sleep(700);
    await page.locator('[data-radix-popper-content-wrapper] button', { hasText: '+1' }).first().click(); await sleep(700);
    await page.locator('#lab-skill button').first().click(); await sleep(700);
    await page.locator('[data-radix-popper-content-wrapper] input[type=number]').fill('7');
    await page.locator('[data-radix-popper-content-wrapper] input[type=number]').press('Enter'); await sleep(700);
    await page.locator('#sap-trigger').click(); await sleep(1500);
    await page.getByRole('dialog').getByRole('button', { name: /Skills/ }).click(); await sleep(700);
    await page.getByRole('dialog').getByRole('button').filter({ hasText: /Speaking/ }).first().click(); await sleep(1500);
    await page.getByRole('dialog').getByRole('button', { name: /Skills/ }).click(); await sleep(700);
    const corr = page.getByRole('dialog').locator('p', { hasText: 'Corrections (-1)' }).locator('xpath=..').getByRole('button').first();
    await corr.click(); await sleep(1500);
    const out = await page.evaluate((n0) => ({ taps: window.__taps.map((a) => a.join(':')), writes: window.__requests.slice(n0).filter((r) => r.method !== 'select').map((r) => `${r.kind}:${r.name}:${r.method}`) }), n0);
    record('CT.click-through', S, 'INFO', out, `onTap calls [${out.taps.join(', ')}]; fake-client writes [${out.writes.join(', ')}]`);
    gate('CT.click-through.taps', S, out.taps.join('|') === 'speaking:1|speaking:7', out.taps, `SkillButton onTap calls ${JSON.stringify(out.taps)} (expected speaking:1, speaking:7)`);
  } catch (e) {
    record('clickthrough.error', S, 'FAIL', String(e), 'scenario aborted: ' + String(e).split('\n')[0]);
  } finally { await ctx.close(); }
}

// ================================================================= 6. STATIC: native title= hints on screens the fake cannot populate
function staticHints() {
  const items = [
    ['src/pages/TeacherSmartUpload.tsx', 'Draft personalized feedback with AI'],
    ['src/pages/TeacherTranscripts.tsx', 'This run was cut off'],
    ['src/pages/TeacherTranscripts.tsx', 'Re-run Whisper transcription'],
    ['src/pages/TeacherTranscripts.tsx', 'Re-run analysis on the stored transcript'],
    ['src/pages/TeacherTranscripts.tsx', 'title="Remove"'],
    ['src/pages/TeacherTranscripts.tsx', 'Correct this feedback'],
  ];
  for (const [file, needle] of items) {
    const src = fs.readFileSync(path.join(repo, file), 'utf8').split(/\r?\n/);
    const line = src.findIndex((l) => l.includes(needle));
    const isTitle = line >= 0 && /\btitle=/.test(src[line]);
    gate(`M6.static.${path.basename(file, '.tsx')}:${line + 1}`, '', !isTitle, { file, line: line + 1, needle }, line < 0 ? `"${needle}" no longer in ${file}` : `${file}:${line + 1} ${isTitle ? 'hint is a native title= (unreachable by tap and keyboard; not rendered with fake data, so judged by reading)' : 'hint is no longer a native title='}`);
  }
}

// ================================================================= run
fs.mkdirSync(OUT, { recursive: true });
try {
  if (want('static')) staticHints();
  for (const size of SIZES) {
    if (want('flipbook')) { await flipbook(size); saveResults(); }
    if (want('overlays')) { await overlays(size); saveResults(); }
    if (want('hints')) { await hints(size); saveResults(); }
    if (want('targets')) { await targets(size); saveResults(); }
    if (want('hud') && size.join('x') === '1024x768') { await hud(size); saveResults(); }
    if (want('neutral')) { await neutral(size); saveResults(); }
    if (want('clickthrough') && size.join('x') === '1024x768') { await clickthrough(size); saveResults(); }
  }
} finally {
  saveResults();
  await browser.close().catch(() => {});
  await stop();
}
const fails = results.checks.filter((c) => c.status === 'FAIL');
console.log(`\n${results.checks.length} lines, ${fails.length} FAIL. Results: ${path.relative(repo, path.join(OUT, 'results.json'))}`);
process.exit(fails.length ? 1 : 0);
