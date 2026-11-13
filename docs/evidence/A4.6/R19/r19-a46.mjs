// R19 shooting script (fake Supabase client, never a network). Port 5419, preview dir <repo>/.claude/a46-preview.
//   node a46.mjs <repoRoot> <outDir> <label> [--only=id,id] [--sizes=375,1280] [--themes=light,dark] [--no-axe] [--no-shot]
// Writes <outDir>/<label>-<id>-<w>-<theme>.png and <outDir>/<label>-results.json
// (requests multiset, numbers multiset, overflow, axe impact counts, small targets, normalised outerHTML of the R19 parts).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] || '.');
const outDir = path.resolve(process.argv[3] || '.');
const label = process.argv[4] || 'run';
const opt = Object.fromEntries(process.argv.slice(5).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const PORT = Number(opt.port || 5419), BASE = `http://127.0.0.1:${PORT}`;
const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const pv = path.join(repo, '.claude/a46-preview'); fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'inherit' }).on('exit', r));
const vite = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--config', path.join(pv, 'vite.config.ts'), '--port', String(PORT), '--strictPort'], { cwd: repo, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ channel: 'chrome' });

const INIT = ([role, student, dark, chat, pwa]) => {
  try {
    localStorage.setItem('fake_role', role);
    if (role === 'student') { localStorage.setItem('selected_student_id', student); localStorage.setItem('fake_student', student); }
    localStorage.removeItem('fake_board_style');
    if (chat) localStorage.setItem('fake_chat', '1'); else localStorage.removeItem('fake_chat');
    for (const u of ['u-admin', 'u-teacher', 'u-student', 'u-family']) localStorage.setItem('hec-theme:' + u, dark ? 'dark' : 'light');
    localStorage.setItem('hec-theme-boot', dark ? 'dark' : 'light');
    localStorage.removeItem('classroom-wheel-entries');
  } catch {}
  // R19: one random sequence for Before and After (dice, wheel, team shuffle).
  let seed = 20261113; Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const apply = () => { const de = document.documentElement; if (!de) return false; if (dark) de.classList.add('dark'); return true; };
  if (!apply()) new MutationObserver((_, o) => { if (apply()) o.disconnect(); }).observe(document, { childList: true });
  if (pwa) { let n = 0; const fire = () => { const e = new Event('beforeinstallprompt'); e.prompt = () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); if (++n < 20) setTimeout(fire, 500); }; setTimeout(fire, 500); }
  window.__lastResEnd = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lastResEnd = Math.max(window.__lastResEnd, e.responseEnd); }).observe({ type: 'resource', buffered: true }); } catch {}
};
const ev = async (page, fn, arg) => { for (let i = 0; i < 6; i++) { try { return await page.evaluate(fn, arg); } catch (e) { if (!/context was destroyed|navigation/i.test(e.message)) throw e; await page.waitForTimeout(800); } } return page.evaluate(fn, arg); };

const PROBE = () => {
  const de = document.documentElement;
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0; };
  const out = { overflow: de.scrollWidth > de.clientWidth, htmlAttr: de.getAttribute('data-hec-theme'), htmlClass: de.className };
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=option], [role=radio], [role=slider]';
  const small = [];
  for (const el of document.querySelectorAll(sel)) { if (!visible(el) || el.closest('[aria-hidden=true]')) continue; const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) small.push(`${el.closest('[role=dialog]') ? 'dialog' : el.closest('[data-radix-popper-content-wrapper]') ? 'popper' : el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : el.closest('main') ? 'main' : 'other'}:${el.tagName}${el.getAttribute('role') ? '/' + el.getAttribute('role') : ''} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`); }
  out.smallTargets = small;
  // horizontal overflow inside the open dialog / popper (the tools sheet, the palette, the bell)
  out.innerOverflow = [...document.querySelectorAll('[role=dialog], [data-radix-popper-content-wrapper]')].filter((d) => d.scrollWidth > d.clientWidth + 1 && getComputedStyle(d).overflowX !== 'auto').map((d) => `${d.getAttribute('role') || 'popper'} ${d.scrollWidth}>${d.clientWidth}`);
  const txt = [...document.querySelectorAll('main')].map((e) => e.innerText).join('\n');
  out.numbers = (txt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  const dtxt = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map((e) => e.innerText).join('\n');
  out.dialogNumbers = (dtxt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  // the long test name: never cut (every element whose own text holds it must not clip it)
  const LONG = 'Nguyễn Hoàng Phương Thảo Nguyên';
  out.longName = [];
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el)) continue; const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    if (!own.includes(LONG)) continue; const cs = getComputedStyle(el);
    const clipped = (cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && el.scrollHeight > el.clientHeight + 1);
    out.longName.push(`${el.tagName}${clipped ? ' CLIPPED' : ''}`);
  }
  return out;
};
// normalised outerHTML of the parts this batch owns (ids that React / Radix generate per mount are blanked)
const DOM = (sels) => {
  const norm = (h) => h.replace(/radix-:[a-z0-9]+:/gi, 'radix-ID').replace(/:r[a-z0-9]+:/gi, ':rID:');
  const pick = {
    fab: () => document.querySelector('button[aria-label="Open classroom tools"], button[aria-label="Stop the timer alarm"]'),
    sheet: () => [...document.querySelectorAll('[role=dialog]')].find((d) => d.textContent.includes('Classroom tools')),
    screen: () => document.querySelector('[data-class-screen]'),
    popper: () => document.querySelector('[data-radix-popper-content-wrapper]'),
    dialog: () => document.querySelector('[role=dialog]'),
    bell: () => document.querySelector('button[aria-label^="Notifications"]'),
    topbar: () => [...document.querySelectorAll('header')].find((h) => h.textContent.includes('Quick jump')),
    pwa: () => document.querySelector('button[title="Install Happy English App"]'),
    chat: () => [...document.querySelectorAll('div')].reverse().find((d) => d.textContent.includes('AI can make mistakes') && d.querySelector('textarea') && d.className.includes('min-h-0') && d.className.includes('flex-col')),
    body: () => document.body,
  };
  const out = {};
  for (const s of sels) { const el = pick[s]?.(); out[s] = el ? norm(el.outerHTML) : null; }
  return out;
};

async function run(s, w, h, dark) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light' });
  await ctx.addInitScript(INIT, [s.role, s.student || 's-0013', dark, !!s.chat, !!s.pwa]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(BASE + s.route, { waitUntil: 'load', timeout: 120000 }).catch((e) => errors.push('goto ' + e.message.slice(0, 100)));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const st = await ev(page, () => ({ now: performance.now(), act: Math.max(window.__lastResEnd || 0, window.__lastRequestAt || 0), txt: (document.getElementById('root')?.innerText || '').length })); if (st.now - st.act > 1000 && st.txt > 100) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(2600);
  const m = { errors };
  if (s.action) { try { await s.action(page); await page.waitForTimeout(1500); } catch (e) { m.actionError = String(e.message).slice(0, 200); } }
  const reqs = await ev(page, () => (window.__requests || []).map((r) => `${r.kind}:${r.name}:${r.method}`));
  const k = {}; for (const r of reqs) k[r] = (k[r] || 0) + 1; m.requests = { count: reqs.length, kinds: Object.fromEntries(Object.entries(k).sort()) };
  m.probe = await ev(page, PROBE);
  if (s.dom) m.dom = await ev(page, DOM, s.dom);
  if (!opt['no-axe']) {
    await page.addScriptTag({ content: axeSrc });
    m.axe = await ev(page, async () => { const r = await window.axe.run(document, { resultTypes: ['violations'] }); const by = {}; for (const x of r.violations) by[x.impact || 'none'] = (by[x.impact || 'none'] || 0) + 1; return { byImpact: by, rules: r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, t: x.nodes.slice(0, 3).map((n) => n.target.join(' ').slice(0, 80)) })) }; });
  }
  const theme = dark ? 'dark' : 'light';
  const base = `${label}-${s.id}-${w}-${theme}`;
  if (!opt['no-shot']) {
    let p = path.join(outDir, base + '.png');
    await page.screenshot({ path: p });
    if (fs.statSync(p).size > 390 * 1024) { fs.unlinkSync(p); p = path.join(outDir, base + '.jpg'); await page.screenshot({ path: p, type: 'jpeg', quality: 80 }); }
    m.shot = path.basename(p); m.kb = Math.round(fs.statSync(p).size / 1024);
  }
  await ctx.close();
  return m;
}

const sleep = (p, ms) => p.waitForTimeout(ms);
const openTools = async (p) => { await p.getByRole('button', { name: 'Open classroom tools' }).click(); await sleep(p, 1800); };
const jump = async (p, name) => { await p.getByRole('navigation', { name: 'Jump to a tool' }).getByRole('button', { name, exact: true }).click(); await sleep(p, 2800); };
const card = (p, title) => p.locator('section', { has: p.getByRole('heading', { name: title, exact: true }) });
const spin = async (p) => { await card(p, 'Spinner').getByRole('button', { name: 'Spin', exact: true }).click(); await sleep(p, 5500); };
const mix = async (p) => { await jump(p, 'Teams'); await card(p, 'Team maker').getByRole('button', { name: /Mix teams/ }).click(); await sleep(p, 1500); };
// every Deferred tool mounted: scroll the panel to the end in steps, then back to the top
const mountAll = async (p) => { await openTools(p); for (let i = 0; i < 30; i++) { const done = await p.evaluate(() => { const sc = [...document.querySelectorAll('[role=dialog] .overflow-y-auto')].find((e) => e.querySelector('[data-tool]')); if (!sc) return true; sc.scrollBy(0, 400); return sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 2; }); await sleep(p, 700); if (done) break; } await sleep(p, 3000); await p.evaluate(() => { const sc = [...document.querySelectorAll('[role=dialog] .overflow-y-auto')].find((e) => e.querySelector('[data-tool]')); if (sc) sc.scrollTop = 0; }); await sleep(p, 800); };
const S = [
  { id: 'tools-all', route: '/teacher/dashboard', role: 'teacher', action: mountAll, dom: ['sheet'] },
  { id: 'tdash', route: '/teacher/dashboard', role: 'teacher', pwa: true, dom: ['fab', 'pwa', 'bell'] },
  { id: 'tools', route: '/teacher/dashboard', role: 'teacher', action: openTools, dom: ['sheet'] },
  { id: 'tools-music', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Music'); }, dom: ['sheet'] },
  { id: 'tools-spin', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Spinner'); await spin(p); }, dom: ['sheet'] },
  { id: 'tools-spin-edit', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Spinner'); await card(p, 'Spinner').getByRole('button', { name: /Edit names/ }).click(); await sleep(p, 600); }, dom: ['sheet'] },
  { id: 'tools-spin-screen', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Spinner'); await spin(p); await card(p, 'Spinner').getByRole('button', { name: /Show on/ }).click(); await sleep(p, 1500); }, dom: ['screen'] },
  { id: 'tools-teams', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await mix(p); }, dom: ['sheet'] },
  { id: 'tools-teams-screen', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await mix(p); await card(p, 'Team maker').getByRole('button', { name: /Show on/ }).click(); await sleep(p, 1800); }, dom: ['screen'] },
  { id: 'tools-select', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Teams'); await card(p, 'Team maker').getByRole('combobox').click(); await sleep(p, 900); }, dom: ['sheet', 'popper'] },
  { id: 'tools-att', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Attendance'); }, dom: ['sheet'] },
  { id: 'tools-ai', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await openTools(p); await jump(p, 'Ask AI'); }, dom: ['sheet'] },
  { id: 'tools-ai-hist', route: '/teacher/dashboard', role: 'teacher', chat: true, action: async (p) => { await openTools(p); await jump(p, 'Ask AI'); }, dom: ['sheet'] },
  { id: 'tpalette', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await p.keyboard.press('Control+k'); await sleep(p, 900); await p.keyboard.type('Sta'); await sleep(p, 1500); }, dom: ['dialog'] },
  { id: 'tbell', route: '/teacher/dashboard', role: 'teacher', action: async (p) => { await p.locator('button[aria-label^="Notifications"]:visible').first().click(); await sleep(p, 900); }, dom: ['popper'] },
  { id: 'admin', route: '/admin', role: 'admin', pwa: true, sizes: [1280], dom: ['topbar', 'pwa', 'fab'] },
  { id: 'apalette', route: '/admin', role: 'admin', sizes: [1280], action: async (p) => { await p.getByRole('button', { name: /Quick jump/ }).first().click(); await sleep(p, 900); }, dom: ['dialog'] },
  { id: 'sdash', route: '/student/dashboard', role: 'student', dom: ['bell'] },
  { id: 'sbell', route: '/student/dashboard', role: 'student', action: async (p) => { await p.locator('button[aria-label^="Notifications"]:visible').first().click(); await sleep(p, 900); }, dom: ['popper'] },
  { id: 'schat', route: '/student/dashboard', role: 'student', action: async (p) => { await p.getByRole('button', { name: 'Open the HEC assistant' }).first().click(); await sleep(p, 1500); }, dom: ['chat'] },
  { id: 'schat-hist', route: '/student/dashboard', role: 'student', chat: true, action: async (p) => { await p.getByRole('button', { name: 'Open the HEC assistant' }).first().click(); await sleep(p, 1500); }, dom: ['chat'] },
  { id: 'fam', route: '/family/dashboard', role: 'family', chat: true, themes: ['light'], dom: ['chat', 'bell'] },
  { id: 'fam-bell', route: '/family/dashboard', role: 'family', themes: ['light'], action: async (p) => { await p.locator('button[aria-label^="Notifications"]:visible').first().click(); await sleep(p, 900); }, dom: ['popper'] },
];
const only = opt.only ? String(opt.only).split(',') : null;
const sizes = String(opt.sizes || '375,1280').split(',').map(Number);
const themes = String(opt.themes || 'light,dark').split(',');
fs.mkdirSync(outDir, { recursive: true });
const resPath = path.join(outDir, `${label}-results.json`);
const results = fs.existsSync(resPath) ? JSON.parse(fs.readFileSync(resPath, 'utf8')) : { label, runs: {} };
await run(S[0], 1280, 800, false); // warm-up
for (const s of S) {
  if (only && !only.includes(s.id)) continue;
  const sz = s.sizes ? s.sizes.filter((x) => sizes.includes(x)) : sizes;
  const th = s.themes ? s.themes.filter((x) => themes.includes(x)) : themes;
  for (const w of sz) for (const t of th) {
    const key = `${s.id}-${w}-${t}`;
    if (opt.resume && results.runs[key] && !(results.runs[key].errors || []).length && !results.runs[key].actionError) continue;
    try { results.runs[key] = await run(s, w, w === 375 ? 812 : 800, t === 'dark'); }
    catch (e) { console.log(key, 'RETRY after', String(e.message).slice(0, 120)); results.runs[key] = await run(s, w, w === 375 ? 812 : 800, t === 'dark'); }
    fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
    const r = results.runs[key];
    console.log(key, JSON.stringify({ req: r.requests.count, axe: r.axe?.byImpact, over: r.probe?.overflow, inner: r.probe?.innerOverflow, small: r.probe?.smallTargets.length, attr: r.probe?.htmlAttr, kb: r.kb, err: r.errors.slice(0, 2), act: r.actionError, dom: r.dom ? Object.fromEntries(Object.entries(r.dom).map(([a, b]) => [a, b ? b.length : null])) : undefined }));
  }
}
fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
await browser.close(); stop();
process.exit(0);
