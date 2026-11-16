// FIX-screens page harness (fake Supabase client, never a network; made-up data only).
//   node fix-pages.mjs <repoRoot> <outDir> <label> [--port=5433] [--only=palette,calendar,dialogs] [--ivory]
// palette : Ctrl+K as admin (admin page, shared page, teacher page) and as teacher; which palettes open (video at 1280).
// calendar: /schedule month and week view as admin; axe label-content-name-mismatch + every serious/critical; chip names.
// dialogs : the three destructive actions; the dialog open, Keep (nothing written), the destructive button (one write).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const label = process.argv[4] || 'run';
const opt = Object.fromEntries(process.argv.slice(5).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const only = new Set(String(opt.only || 'palette,calendar,dialogs').split(','));
const PORT = Number(opt.port || 5433), BASE = `http://127.0.0.1:${PORT}`;
const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const pv = path.join(repo, '.claude/fix-pages-preview'); fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
if (opt.ivory) { const src = fs.readFileSync(path.join(repo, 'src/lib/ivoryScope.ts'), 'utf8'); const anchor = '{ path: "/vocabulary" },'; fs.writeFileSync(path.join(pv, 'ivoryScope.harness.ts'), src.replace(anchor, anchor + ' { path: "/admin" }, { path: "/schedule" }, { path: "/families/:id" }, { path: "/teacher/dashboard" },')); }
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'ignore' }).on('exit', r));
try { await fetch(BASE + '/'); console.error('port ' + PORT + ' already serves something: refusing to measure it'); process.exit(3); } catch {}
const vite = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--config', path.join(pv, 'vite.config.ts'), '--port', String(PORT), '--strictPort'], { cwd: repo, stdio: 'ignore', env: { ...process.env, FIX_IVORY: opt.ivory ? '1' : '0' } });
let stopping = false;
vite.on('exit', (c) => { if (!stopping) { console.error('vite exited early', c); process.exit(4); } });
const stop = () => { stopping = true; try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ channel: 'chrome' });
fs.mkdirSync(outDir, { recursive: true });
{ const c = await browser.newContext(); await c.addInitScript(() => { try { localStorage.setItem('fake_role', 'admin'); } catch {} }); const p = await c.newPage();
  for (const r of ['/admin', '/schedule', '/families/f-0001', '/admin?tab=announcements', '/admin?tab=stars-sync', '/teacher/dashboard']) { await p.goto(BASE + r, { waitUntil: 'load', timeout: 300000 }).catch(() => {}); await p.waitForSelector('main', { timeout: 240000 }).catch(() => {}); await p.waitForTimeout(3000); }
  await c.close(); }

const INIT = ([role]) => {
  try { localStorage.setItem('fake_role', role); for (const u of ['u-admin', 'u-teacher']) localStorage.setItem('hec-theme:' + u, 'light'); localStorage.setItem('hec-theme-boot', 'light'); } catch {}
  let seed = 20261113; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
};
const results = { label, checks: [], palette: {}, calendar: {}, dialogs: {} };
const rec = (id, ok, v) => { results.checks.push({ id, status: ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL', v }); console.log(`[${ok === null ? 'INFO' : ok ? 'PASS' : 'FAIL'}] ${id} ${JSON.stringify(v).slice(0, 400)}`); };
const newPage = async (role, w, video) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: w < 600 ? 812 : 800 }, deviceScaleFactor: 1, colorScheme: 'light', });
  await ctx.addInitScript(INIT, [role]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  page.on('dialog', (d) => d.dismiss().catch(() => {}));
  return { ctx, page, errors };
};
const settle = (page, ms = 2500) => page.waitForTimeout(ms);
const ready = async (page) => { await page.waitForSelector('main', { timeout: 240000 }); await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 60000 }).catch(() => {}); };
const shot = (page, name) => page.screenshot({ path: path.join(outDir, `${label}-${name}.png`) });
const writes = (page) => page.evaluate(() => (window.__requests || []).filter((r) => r.method !== 'select').map((r) => `${r.kind}:${r.name}:${r.method}`));

// ---------------------------------------------------------------- palette
const PALETTES = () => [...document.querySelectorAll('[role=dialog]')].filter((d) => d.querySelector('[cmdk-input]')).map((d) => {
  const input = d.querySelector('[cmdk-input]');
  const groups = [...d.querySelectorAll('[cmdk-group-heading]')].map((g) => g.textContent.trim());
  return { placeholder: input.getAttribute('placeholder'), groups, kind: groups.includes('Admin') ? 'admin' : 'general' };
});
if (only.has('palette')) {
  const cases = [
    ['admin', '/admin', 'admin'], ['admin', '/students', 'admin'], ['admin', '/schedule', 'general'], ['admin', '/teacher/dashboard', 'general'],
    ['teacher', '/teacher/dashboard', 'general'], ['teacher', '/schedule', 'general'],
  ];
  for (const w of [1280, 375]) for (const [role, route, want] of cases) {
    const keyShots = route === '/admin' || route === '/teacher/dashboard';
    const { ctx, page, errors } = await newPage(role, w);
    const id = `palette-${role}-${route.replace(/\W+/g, '_')}-${w}`;
    try {
      await page.goto(BASE + route, { waitUntil: 'load', timeout: 300000 }); await ready(page); await settle(page, 2500);
      // The recorded keypress: a frame before, the key event as the page saw it, a frame after.
      await page.evaluate(() => { window.__keys = []; document.addEventListener('keydown', (e) => window.__keys.push({ key: e.key, ctrl: e.ctrlKey, meta: e.metaKey, defaultPrevented: e.defaultPrevented, t: Math.round(performance.now()) }), true); });
      if (keyShots) await shot(page, id + '-0-before-key');
      await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(900);
      const open = await page.evaluate(PALETTES);
      results.palette[id + '-keys'] = await page.evaluate(() => window.__keys);
      results.palette[id] = open;
      rec(id, open.length === 1 && open[0].kind === want, { open: open.map((o) => o.kind), want });
      if (keyShots) await shot(page, id + '-1-after-key');
      // Ctrl+K again closes it
      await page.keyboard.press('Control+KeyK'); await page.waitForTimeout(700);
      rec(id + '-toggle-closed', (await page.evaluate(PALETTES)).length === 0, {});
      if (w === 1280) {
        // the "Quick jump" button opens the page's one palette too
        const btn = page.getByRole('button', { name: /Quick jump/ }).first();
        if (await btn.count()) { await btn.click(); await page.waitForTimeout(900); const o2 = await page.evaluate(PALETTES); rec(id + '-quickjump-button', o2.length === 1 && o2[0].kind === want, { open: o2.map((o) => o.kind), want }); await page.keyboard.press('Escape'); await page.waitForTimeout(500); }
      }
      rec(id + '-page-errors', errors.length === 0, errors.slice(0, 2));
    } catch (e) { rec(id, false, String(e.message).slice(0, 300)); }
    await ctx.close();
  }
}

// --------------------------------------------------------------- calendar
const CHIPS = () => [...document.querySelectorAll('button[aria-label]')].filter((b) => /\d\d:\d\d/.test(b.getAttribute('aria-label')) && /\d\d:\d\d/.test(b.innerText)).slice(0, 6).map((b) => ({ name: b.getAttribute('aria-label'), visible: b.innerText.replace(/\s+/g, ' ').trim() }));
const runAxe = async (page) => { await page.addScriptTag({ content: axeSrc }); return page.evaluate(async () => { const r = await window.axe.run(document, { resultTypes: ['violations'] }); return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, sample: v.nodes.slice(0, 2).map((n) => n.html.slice(0, 160)) })); }); };
if (only.has('calendar')) {
  for (const w of [1280, 375]) for (const view of ['month', 'week']) {
    const { ctx, page } = await newPage('admin', w);
    const id = `calendar-${view}-${w}`;
    try {
      await page.goto(BASE + '/schedule', { waitUntil: 'load', timeout: 300000 }); await ready(page); await settle(page, 3000);
      // PremiumCalendar's view buttons (icon-only at 375): Month = the grid icon, Week = calendar-range.
      { const icon = view === 'week' ? 'calendar-range' : 'grid'; const b = page.locator(`button[aria-pressed]:has(svg[class*="${icon}"])`).first(); if (await b.count()) { await b.click(); await settle(page, 2500); } else rec(id + '-no-view-button', false, {}); }
      results.calendar[id + '-pressed'] = await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed=true]')].map((b) => b.innerText.trim() || b.querySelector('svg')?.getAttribute('class')));
      const chips = await page.evaluate(CHIPS);
      const axe = await runAxe(page);
      const mismatch = axe.find((v) => v.id === 'label-content-name-mismatch');
      results.calendar[id] = { chips, axe };
      const norm = (s) => s.toLowerCase().replace(/[\p{P}\p{S}]/gu, '').replace(/\s+/g, ' ').trim();
      rec(id + '-names-start-with-visible-text', chips.length > 0 && chips.every((c) => norm(c.name).startsWith(norm(c.visible))), { sample: chips.slice(0, 2) });
      rec(id + '-axe-label-content-name-mismatch', !mismatch, mismatch ? { nodes: mismatch.nodes, sample: mismatch.sample } : { nodes: 0 });
      rec(id + '-axe-serious-critical', null, axe.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}:${v.nodes}`));
      await shot(page, id);
    } catch (e) { rec(id, false, String(e.message).slice(0, 300)); }
    await ctx.close();
  }
}

// --------------------------------------------------- calendar pixels (inertness of the spacing)
// Element shots of the calendar grid only (the sidebar logo shimmers), month and week, both widths.
if (only.has('calshots')) {
  for (const w of [1280, 375]) for (const view of ['month', 'week']) {
    const { ctx, page } = await newPage('admin', w);
    try {
      await page.goto(BASE + '/schedule', { waitUntil: 'load', timeout: 300000 }); await ready(page); await settle(page, 3000);
      const icon = view === 'week' ? 'calendar-range' : 'grid'; await page.locator(`button[aria-pressed]:has(svg[class*="${icon}"])`).first().click(); await settle(page, 2500);
      // the grid: the nearest ancestor of the first chip that holds every chip
      const handle = await page.evaluateHandle(() => { const chips = [...document.querySelectorAll('button[aria-roledescription=draggable]')]; let el = chips[0]; while (el && !chips.every((c) => el.contains(c))) el = el.parentElement; return el; });
      const el = handle.asElement();
      if (el) { await el.screenshot({ path: path.join(outDir, `${label}-calgrid-${view}-${w}.png`), animations: 'disabled' }); rec(`calgrid-${view}-${w}`, true, {}); } else rec(`calgrid-${view}-${w}`, false, 'no grid');
    } catch (e) { rec(`calgrid-${view}-${w}`, false, String(e.message).slice(0, 200)); }
    await ctx.close();
  }
}

// ---------------------------------------------------------------- dialogs
const DIALOG = () => { const d = document.querySelector('[role=alertdialog]'); if (!d) return null; return { title: d.querySelector('h2')?.textContent, text: d.innerText.replace(/\s+/g, ' ').trim(), buttons: [...d.querySelectorAll('button')].map((b) => b.textContent.trim()), focused: document.activeElement?.textContent?.trim() ?? null }; };
if (only.has('dialogs')) {
  const cases = [
    { id: 'announcement', route: '/admin?tab=announcements', open: async (page) => page.getByRole('button', { name: /^Delete Parents evening$/ }).click(), keep: 'Keep the announcement', act: 'Delete the announcement', write: 'from:site_announcements:delete' },
    { id: 'family', route: '/families/f-0001', open: async (page) => page.getByRole('button', { name: /^Remove$/ }).first().click(), keep: 'Keep them in the family', act: 'Remove from the family', write: 'from:students:update' },
    { id: 'stars', route: '/admin?tab=stars-sync', prep: async (page) => { await page.getByRole('tab', { name: /Tools/ }).click(); await settle(page, 3500); await page.getByText('Links worth a second look').scrollIntoViewIfNeeded(); await page.waitForTimeout(600); }, open: async (page) => page.getByRole('button', { name: /^Unlink$/ }).first().click(), keep: 'Keep the link', act: 'Unlink the child', write: 'from:stars_student_map:delete' },
  ];
  for (const w of [1280, 375]) for (const c of cases) for (const choice of ['keep', 'act']) {
    const { ctx, page, errors } = await newPage('admin', w);
    const id = `dialog-${c.id}-${choice}-${w}`;
    try {
      await page.goto(BASE + c.route, { waitUntil: 'load', timeout: 300000 }); await ready(page); await settle(page, 3000);
      if (c.prep) await c.prep(page);
      const before = await writes(page);
      await c.open(page); await page.waitForTimeout(900);
      const d = await page.evaluate(DIALOG);
      const afterOpen = await writes(page);
      rec(id + '-asks-first', !!d && afterOpen.length === before.length, { dialog: d, writesOnOpen: afterOpen.slice(before.length) });
      if (choice === 'keep') await shot(page, `dialog-${c.id}-${w}`);
      if (d) {
        rec(id + '-focus-on-keep', d.focused === c.keep, { focused: d.focused });
        await page.getByRole('alertdialog').getByRole('button', { name: choice === 'keep' ? c.keep : c.act, exact: true }).click();
        await page.waitForTimeout(1500);
        const after = (await writes(page)).slice(before.length);
        const gone = !(await page.evaluate(DIALOG));
        if (choice === 'keep') rec(id + '-keep-writes-nothing', gone && after.length === 0, { after });
        else rec(id + '-destructive-runs-once', gone && after.filter((x) => x === c.write).length === 1, { after });
        if (choice === 'act') await shot(page, `dialog-${c.id}-after-${w}`);
      }
      rec(id + '-page-errors', errors.length === 0, errors.slice(0, 2));
    } catch (e) { rec(id, false, String(e.message).slice(0, 300)); await shot(page, `${id}-error`).catch(() => {}); }
    await ctx.close();
  }
}

fs.writeFileSync(path.join(outDir, `${label}-results.json`), JSON.stringify(results, null, 1));
const fails = results.checks.filter((c) => c.status === 'FAIL').length;
console.log(`${label}: ${results.checks.filter((c) => c.status === 'PASS').length} PASS, ${fails} FAIL, ${results.checks.filter((c) => c.status === 'INFO').length} INFO`);
await browser.close(); stop();
process.exit(0);
