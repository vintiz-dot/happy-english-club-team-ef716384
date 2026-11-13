// R19 fullscreen lab: the classroom tools as a teacher uses them in class, inside TeacherBooks' "Present Fullscreen".
//   node r19-fs.mjs <repoRoot> <outDir> <label> [--sizes=1024x768,768x1024,375x812] [--dark] [--mouse] [--shots]
// For each step: is the thing inside the fullscreen element, on screen, and the topmost element at its centre?
// Also records the request multiset, the fullscreen element after each step, the normalised outerHTML of the
// sheet / class screen (legacy-vs-legacy inertness), and every visible control under 44 px inside the fullscreen element.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2]);
const outDir = path.resolve(process.argv[3]);
const label = process.argv[4] || 'run';
const opt = Object.fromEntries(process.argv.slice(5).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const SIZES = String(opt.sizes || '1024x768,768x1024,375x812').split(',').map((s) => s.split('x').map(Number));
const PORT = 5429, BASE = `http://127.0.0.1:${PORT}`;
const pv = path.join(repo, '.claude/r19-fs-preview'); fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'ignore' }).on('exit', r));
const vite = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--config', path.join(pv, 'vite.config.ts'), '--port', String(PORT), '--strictPort'], { cwd: repo, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ channel: 'chrome' });
fs.mkdirSync(outDir, { recursive: true });

const INIT = ([dark]) => {
  try { localStorage.setItem('fake_role', 'teacher'); localStorage.removeItem('fake_chat'); localStorage.removeItem('classroom-wheel-entries'); for (const u of ['u-teacher']) localStorage.setItem('hec-theme:' + u, dark ? 'dark' : 'light'); localStorage.setItem('hec-theme-boot', dark ? 'dark' : 'light'); } catch {}
  let seed = 20261113; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
};
const VIS = (sel) => {
  const fsEl = document.fullscreenElement;
  const byText = (t) => [...(document.querySelector('[data-tool="teams"]') || document).querySelectorAll('li span, p, h2, h3')].find((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.includes(t)));
  const el = sel.startsWith('text=') ? byText(sel.slice(5)) : document.querySelector(sel);
  if (!el) return { found: false };
  const r = el.getBoundingClientRect();
  const x = Math.min(innerWidth - 1, Math.max(0, r.left + Math.min(r.width / 2, 40))), y = Math.min(innerHeight - 1, Math.max(0, r.top + Math.min(r.height / 2, 30)));
  const hit = document.elementFromPoint(x, y);
  const onScreen = r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  return { found: true, inFs: !!fsEl && fsEl.contains(el), onScreen, top: !!hit && (el === hit || el.contains(hit)), fs: fsEl ? (fsEl.hasAttribute('data-class-screen') ? 'class-screen' : fsEl.tagName) : null };
};
const SMALL = () => {
  const fsEl = document.fullscreenElement || document.body; const out = [];
  for (const el of fsEl.querySelectorAll('a[href], button, input:not([type=hidden]), textarea, [role=button], [role=radio], [role=slider], [role=option], [role=combobox]')) {
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    if (r.bottom < 0 || r.top > innerHeight) continue;
    if (r.width < 43.5 || r.height < 43.5) out.push(`${el.tagName}${el.getAttribute('role') ? '/' + el.getAttribute('role') : ''} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 28)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return out;
};
const DOM = () => {
  const norm = (h) => h.replace(/radix-:[a-z0-9]+:/gi, 'radix-ID').replace(/:r[a-z0-9]+:/gi, ':rID:');
  const sheet = [...document.querySelectorAll('[role=dialog]')].find((d) => d.textContent.includes('Classroom tools'));
  const screen = document.querySelector('[data-class-screen]');
  return { sheet: sheet ? norm(sheet.outerHTML) : null, screen: screen ? norm(screen.outerHTML) : null };
};

const results = { label, checks: [], dom: {}, small: {}, requests: {} };
const rec = (id, size, ok, v) => { results.checks.push({ id, size, status: ok ? 'PASS' : 'FAIL', v }); console.log(`[${ok ? 'PASS' : 'FAIL'}] ${id} @${size} ${JSON.stringify(v)}`); };
for (const [w, h] of SIZES) {
  const S = `${w}x${h}`;
  const touch = !opt.mouse;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: opt.dark ? 'dark' : 'light', hasTouch: touch, isMobile: touch && w < 600 });
  await ctx.addInitScript(INIT, [!!opt.dark]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { media: '', features: touch ? [{ name: 'hover', value: 'none' }, { name: 'any-hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }] });
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  const shot = async (step) => { if (opt.shots && (w === 375 || w === 1024)) { const p = path.join(outDir, `fs-${label}-${step}-${w}.png`); await page.screenshot({ path: p }); if (fs.statSync(p).size > 390 * 1024) { fs.unlinkSync(p); await page.screenshot({ path: p.replace(/\.png$/, '.jpg'), type: 'jpeg', quality: 80 }); } } };
  const step = async (id, sel, extra) => { const v = await page.evaluate(VIS, sel); const ok = v.found && v.inFs && v.onScreen && v.top; rec(id, S, ok, { ...v, ...(extra || {}) }); results.small[`${id}@${S}`] = await page.evaluate(SMALL); return ok; };
  const inFs = (css) => `:fullscreen ${css}`;
  try {
    await page.goto(BASE + '/teacher/books', { waitUntil: 'load', timeout: 300000 });
    await page.getByRole('button', { name: /Present Fullscreen/ }).waitFor({ timeout: 60000 }); await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /Present Fullscreen/ }).click(); await page.waitForTimeout(900);
    await step('fab-visible', inFs('button[aria-label="Open classroom tools"]'));
    await shot('fab');
    await page.locator(inFs('button[aria-label="Open classroom tools"]')).click(); await page.waitForTimeout(1500);
    await step('sheet', '[role=dialog] h2');
    await shot('sheet');
    const jump = async (name) => { await page.getByRole('navigation', { name: 'Jump to a tool' }).getByRole('button', { name, exact: true }).click(); await page.waitForTimeout(2800); };
    const card = (title) => page.locator('section', { has: page.getByRole('heading', { name: title, exact: true }) });
    // Team maker: its Select inside fullscreen, then the teams on the class screen
    await jump('Teams');
    await card('Team maker').getByRole('combobox').click(); await page.waitForTimeout(900);
    await step('teams-select-option', '[role=option]');
    await shot('select');
    await page.keyboard.press('Escape'); await page.waitForTimeout(500);
    await step('sheet-after-select', '[role=dialog] h2');
    await card('Team maker').getByRole('button', { name: /Mix teams/ }).click(); await page.waitForTimeout(1500);
    await step('teams-dealt', 'text=Nguyễn Hoàng Phương Thảo Nguyên');
    await shot('teams');
    // Music, attendance, Ask AI
    await jump('Music');
    await step('music-mood', '[data-tool="music"] button[aria-pressed]');
    await step('music-slider', '[data-tool="music"] [role=slider]');
    await shot('music');
    await jump('Attendance');
    await step('attendance-row', '[data-tool="attendance"] ul li button');
    await shot('attendance');
    await jump('Ask AI');
    await page.locator('[role=dialog] textarea').scrollIntoViewIfNeeded(); await page.waitForTimeout(400);
    await step('ai-chat-input', '[role=dialog] textarea');
    await shot('ai');
    await jump('Spinner');
    await card('Spinner').getByRole('button', { name: 'Spin', exact: true }).click(); await page.waitForTimeout(5500);
    await step('spinner-picked', '[data-tool="spinner"] button[aria-label^="Remove "]');
    await shot('spinner');
    results.dom['sheet@' + S] = (await page.evaluate(DOM)).sheet;
    // A class screen opened while the BOOK is already fullscreen (recorded, not gated: ui/sheet behaviour)
    await card('Spinner').getByRole('button', { name: /Show on/ }).click(); await page.waitForTimeout(1800);
    const cs = await page.evaluate(VIS, '[data-class-screen] h2');
    const sheetOpen = await page.getByRole('navigation', { name: 'Jump to a tool' }).count();
    results.checks.push({ id: 'books-fs-then-class-screen', size: S, status: 'INFO', v: { classScreen: cs, sheetStillOpen: !!sheetOpen, fs: await page.evaluate(() => document.fullscreenElement ? (document.fullscreenElement.hasAttribute('data-class-screen') ? 'class-screen' : document.fullscreenElement.tagName) : null) } });
    console.log('[INFO] books-fs-then-class-screen @' + S, JSON.stringify(results.checks.at(-1).v));
    await shot('books-classscreen');
    await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    // Part 2: the class screens as they are opened from the panel on any page (they ask for fullscreen themselves)
    await page.goto(BASE + '/teacher/dashboard', { waitUntil: 'load', timeout: 120000 });
    await page.getByRole('button', { name: 'Open classroom tools' }).first().waitFor({ timeout: 60000 }); await page.waitForTimeout(2500);
    await page.getByRole('button', { name: 'Open classroom tools' }).first().click(); await page.waitForTimeout(1500);
    await jump('Teams');
    await card('Team maker').getByRole('button', { name: /Mix teams/ }).click(); await page.waitForTimeout(1500);
    await card('Team maker').getByRole('button', { name: /Show on/ }).click(); await page.waitForTimeout(1800);
    await step('teams-class-screen', '[data-class-screen] h2', { fsIsScreen: await page.evaluate(() => !!document.fullscreenElement?.hasAttribute('data-class-screen')) });
    await step('teams-class-screen-name', '[data-class-screen] li:last-child span:last-child');
    await step('teams-class-screen-exit', '[data-class-screen] button[aria-label="Leave class screen"]');
    results.dom['teams-screen@' + S] = (await page.evaluate(DOM)).screen;
    await shot('teams-screen');
    await page.locator('[data-class-screen] button[aria-label="Leave class screen"]').click(); await page.waitForTimeout(1200);
    rec('teams-class-screen-closed', S, !(await page.locator('[data-class-screen]').count()) && !(await page.evaluate(() => !!document.fullscreenElement)), {});
    rec('sheet-open-after-exit', S, !!(await page.getByRole('navigation', { name: 'Jump to a tool' }).count()), {});
    await jump('Spinner');
    await card('Spinner').getByRole('button', { name: 'Spin', exact: true }).click(); await page.waitForTimeout(5500);
    await card('Spinner').getByRole('button', { name: /Show on/ }).click(); await page.waitForTimeout(1800);
    await step('spinner-class-screen', '[data-class-screen] h2');
    await step('spinner-class-screen-spin', '[data-class-screen] button:not([aria-label])');
    await step('spinner-class-screen-winner', '[data-class-screen] p');
    results.dom['spinner-screen@' + S] = (await page.evaluate(DOM)).screen;
    await shot('spinner-screen');
    await page.keyboard.press('Escape'); await page.waitForTimeout(1200);
    rec('spinner-class-screen-closed-by-escape', S, !(await page.locator('[data-class-screen]').count()), {});
    results.dom['sheet-dash@' + S] = (await page.evaluate(DOM)).sheet;
    rec('page-errors', S, errors.length === 0, errors.slice(0, 3));
    const reqs = await page.evaluate(() => (window.__requests || []).map((r) => `${r.kind}:${r.name}:${r.method}`).sort());
    results.requests[S] = reqs;
  } catch (e) {
    rec('scenario', S, false, String(e.message).slice(0, 300));
    await page.screenshot({ path: path.join(outDir, `fs-${label}-error-${w}.png`) }).catch(() => {});
  } finally { await ctx.close(); }
}
fs.writeFileSync(path.join(outDir, `fs-${label}-results.json`), JSON.stringify(results, null, 1));
const fails = results.checks.filter((c) => c.status === 'FAIL').length;
console.log(`${label}: ${results.checks.length - fails} PASS, ${fails} FAIL`);
await browser.close(); stop();
process.exit(0);
