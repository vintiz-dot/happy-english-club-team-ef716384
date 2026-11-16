// R23v verification driver (fake Supabase client, made-up data, never a network). Based on r21-harness/a46.mjs.
//   node r23v.mjs <repoRoot> <outDir> <label> [--only=id,id] [--sizes=375,1280] [--themes=light,dark] [--no-axe] [--port=5431] [--no-shots]
// Writes <outDir>/<label>-results.json: requests multiset, numbers multiset in <main> (+ dialogs), money styling,
// overflow, long-name clipping, axe (document and in-<main> node counts), and for dom runs the <main> outerHTML (raw and id-normalised).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
import crypto from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] || '.');
const outDir = path.resolve(process.argv[3] || '.');
const label = process.argv[4] || 'run';
const opt = Object.fromEntries(process.argv.slice(5).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const PORT = Number(opt.port || 5431), BASE = `http://127.0.0.1:${PORT}`;
const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const pv = path.join(repo, '.claude/r23v-preview'); fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'inherit' }).on('exit', r));
const vite = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--config', path.join(pv, 'vite.config.ts'), '--port', String(PORT), '--strictPort'], { cwd: repo, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ channel: 'chrome' });

const INIT = ([role, student, dark, calView, flags]) => {
  // The host's network can drop (it did on 16 Nov): the app's offline screen must not replace the page under test.
  try { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => true, configurable: true }); } catch {}
  try { window.addEventListener('offline', (e) => e.stopImmediatePropagation(), true); } catch {}
  try {
    localStorage.setItem('fake_role', role);
    if (calView) localStorage.setItem('hec.calendar.view', calView); else localStorage.removeItem('hec.calendar.view');
    localStorage.removeItem('fake_overlay');
    try { sessionStorage.removeItem('hec-newsite-overlay-dismissed'); } catch {}
    if (student) { localStorage.setItem('selected_student_id', student); localStorage.setItem('fake_student', student); } else localStorage.removeItem('selected_student_id');
    for (const k of ['fake_guard_once', 'fake_family_empty']) { if (flags[k]) localStorage.setItem(k, '1'); else localStorage.removeItem(k); }
    for (const u of ['u-admin', 'u-teacher', 'u-student', 'u-family', 'signed-out']) localStorage.setItem('hec-theme:' + u, dark ? 'dark' : 'light');
    localStorage.setItem('hec-theme-boot', dark ? 'dark' : 'light');
  } catch {}
  const apply = () => { const de = document.documentElement; if (!de) return false; if (dark) de.classList.add('dark'); return true; };
  if (!apply()) new MutationObserver((_, o) => { if (apply()) o.disconnect(); }).observe(document, { childList: true });
  window.__lastResEnd = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lastResEnd = Math.max(window.__lastResEnd, e.responseEnd); }).observe({ type: 'resource', buffered: true }); } catch {}
};
const ev = async (page, fn, arg) => { for (let i = 0; i < 6; i++) { try { return await page.evaluate(fn, arg); } catch (e) { if (!/context was destroyed|navigation/i.test(e.message)) throw e; await page.waitForTimeout(800); } } return page.evaluate(fn, arg); };

const PROBE = () => {
  const de = document.documentElement;
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0; };
  const out = { overflow: de.scrollWidth > de.clientWidth, scrollW: de.scrollWidth, clientW: de.clientWidth, htmlAttr: de.getAttribute('data-hec-theme'), htmlClass: de.className, path: location.pathname + location.search };
  // elements whose right edge is past the viewport (cut at narrow widths)
  const vw = de.clientWidth; const off = [];
  for (const el of document.querySelectorAll('main *, [role=dialog] *, header *')) { if (!visible(el)) continue; const r = el.getBoundingClientRect(); if (r.right > vw + 1 || r.left < -1) { const fixedAnc = (() => { for (let a = el; a; a = a.parentElement) { const cs = getComputedStyle(a); if (cs.overflowX !== 'visible' && a !== el && a.scrollWidth > a.clientWidth) return true; } return false; })(); if (!fixedAnc) off.push(`${el.tagName}.${String(el.className).slice(0, 40)} ${Math.round(r.left)}-${Math.round(r.right)}`); } }
  out.offscreen = off.slice(0, 20); out.offscreenCount = off.length;
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio], [role=combobox]';
  const small = [];
  for (const el of document.querySelectorAll(sel)) { if (!visible(el) || el.closest('[aria-hidden=true]')) continue; const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) small.push(`${el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : el.closest('main') ? 'main' : 'other'}:${el.tagName} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`); }
  out.smallTargets = small;
  const LN = 'Nguyễn Hoàng Phương Thảo Nguyên';
  out.longName = { shown: 0, clipped: [], lines: [] };
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    if (!own.includes(LN) || !visible(el)) continue;
    out.longName.shown++;
    const r = el.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(el).lineHeight) || 20; out.longName.lines.push(Math.round(r.height / lh));
    if (r.right > vw + 1) out.longName.clipped.push('offscreen:' + el.tagName);
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const clip = cs.overflowX !== 'visible' || cs.overflow !== 'visible';
      if (cs.textOverflow === 'ellipsis' && clip && a.scrollWidth > a.clientWidth + 1) { out.longName.clipped.push('ellipsis:' + a.tagName + ' .' + String(a.className).slice(0, 60)); break; }
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && a.scrollHeight > a.clientHeight + 1) { out.longName.clipped.push('clamp:' + a.tagName + ' .' + String(a.className).slice(0, 60)); break; }
      if (a === el && clip && (a.scrollWidth > a.clientWidth + 1)) { out.longName.clipped.push('overflow:' + a.tagName); break; }
      if (a !== el) break;
    }
  }
  const txt = [...document.querySelectorAll('main')].map((e) => e.innerText).join('\n');
  out.numbers = (txt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  const dtxt = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map((e) => e.innerText).join('\n');
  out.dialogNumbers = (dtxt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  // token colours to compare money against (computed under whatever theme the page has)
  const probeColor = (cls) => { const s = document.createElement('span'); s.className = cls; s.textContent = 'x'; (document.querySelector('main') || document.body).appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
  out.brassColor = probeColor('text-hec-brass'); out.inkColor = probeColor('text-hec-ink');
  const money = []; const AMT = /\d[\d.,]*\s?₫/;
  for (const el of document.querySelectorAll('body *')) {
    const t = (el.textContent || '').trim(); if (!AMT.test(t) || t.length > 80) continue;
    if ([...el.children].some((c) => AMT.test(c.textContent || ''))) continue;
    if (!visible(el)) continue; const cs = getComputedStyle(el); const fam = cs.fontFamily.split(',')[0].trim();
    money.push({ t: t.replace(/\s+/g, ' ').slice(0, 50), fam, serif: /serif|palatino|times|fraunces|display|georgia/i.test(fam) && !/sans/i.test(fam), tab: /tabular/.test(cs.fontVariantNumeric), color: cs.color, brass: cs.color === out.brassColor, ink: cs.color === out.inkColor, nowrap: cs.whiteSpace === 'nowrap', inMain: !!el.closest('main') });
  }
  out.money = money;
  return out;
};

const AXE = async () => {
  const r = await window.axe.run(document, { resultTypes: ['violations'] });
  const by = {}; const byMain = {};
  const rules = [];
  for (const x of r.violations) {
    by[x.impact || 'none'] = (by[x.impact || 'none'] || 0) + 1;
    const inMain = x.nodes.filter((n) => { try { const el = document.querySelector(n.target.join(' ')); return !!(el && el.closest('main')); } catch { return false; } }).length;
    if (inMain) byMain[x.impact || 'none'] = (byMain[x.impact || 'none'] || 0) + 1;
    if (x.impact === 'critical' || x.impact === 'serious') rules.push({ id: x.id, impact: x.impact, n: x.nodes.length, inMain, t: x.nodes.slice(0, 4).map((n) => n.target.join(' ').slice(0, 90)), s: x.nodes.slice(0, 4).map((n) => (n.failureSummary || '').slice(0, 160)) });
  }
  return { byImpact: by, byImpactInMain: byMain, rules };
};

async function run(s, w, h, dark) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', reducedMotion: s.dom ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(INIT, [s.role, s.student || '', dark, s.calView || '', s.flags || {}]);
  await ctx.route((u) => !/^(http:\/\/127\.0\.0\.1:\d+|data:|about:|blob:)/.test(String(u)), (route) => route.abort());
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00'));
  const errors = []; page.on('pageerror', (e) => errors.push(String(e.message).slice(0, 160)));
  await page.goto(BASE + s.route, { waitUntil: 'load', timeout: 120000 }).catch((e) => errors.push('goto ' + e.message.slice(0, 100)));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const st = await ev(page, () => ({ now: performance.now(), act: Math.max(window.__lastResEnd || 0, window.__lastRequestAt || 0), txt: (document.getElementById('root')?.innerText || '').length })); if (st.now - st.act > 1000 && st.txt > 60) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(2600);
  const m = { errors };
  const reqs = await ev(page, () => (window.__requests || []).map((r) => `${r.kind}:${r.name}:${r.method}`));
  const k = {}; for (const r of reqs) k[r] = (k[r] || 0) + 1; m.requests = { count: reqs.length, kinds: Object.fromEntries(Object.entries(k).sort()) };
  if (s.action) { try { await s.action(page); await page.waitForTimeout(1200); } catch (e) { m.actionError = String(e.message).slice(0, 200); } }
  if (s.dom) {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch { a.cancel(); } } });
    await page.waitForTimeout(500);
    const doms = await ev(page, (sel) => { const els = [...document.querySelectorAll(sel)]; const raw = els.map((e) => e.outerHTML).join('\n'); const norm = els.map((el) => { const c = el.cloneNode(true); let n = 0; const ids = new Map(); const ren = (v) => v.replace(/(radix-)?:r[0-9a-z]+:/g, (x) => { if (!ids.has(x)) ids.set(x, ':id' + (n++) + ':'); return ids.get(x); }); for (const node of [c, ...c.querySelectorAll('*')]) for (const a of [...node.attributes]) { const v = ren(a.value); if (v !== a.value) node.setAttribute(a.name, v); } return c.outerHTML; }).join('\n'); return { raw, norm, attr: document.documentElement.getAttribute('data-hec-theme') }; }, s.dom);
    m.domRawHash = crypto.createHash('sha256').update(doms.raw).digest('hex').slice(0, 16); m.domNormHash = crypto.createHash('sha256').update(doms.norm).digest('hex').slice(0, 16);
    m.domRaw = doms.raw; m.domNorm = doms.norm; m.domAttr = doms.attr;
  }
  m.probe = await ev(page, PROBE);
  if (!opt['no-axe']) { await page.addScriptTag({ content: axeSrc }); m.axe = await ev(page, AXE); }
  if (!opt['no-shots'] && !s.dom) {
    const p = path.join(outDir, `${label}-${s.id}-${w}-${dark ? 'dark' : 'light'}.png`);
    await page.screenshot({ path: p, fullPage: !!opt.full }); m.shot = path.basename(p);
  }
  await ctx.close();
  return m;
}

const click = async (p, loc) => { await loc.first().click(); await p.waitForTimeout(1200); };
const LONG = 'Nguyễn Hoàng Phương Thảo Nguyên';
const G = { fake_guard_once: true };
const S = [
  // parent + public (listed by R23)
  { id: 'auth', route: '/auth', role: '' },
  { id: 'auth-signup', route: '/auth', role: '', action: (p) => click(p, p.getByRole('button', { name: 'Sign up', exact: true })) },
  { id: 'auth-signup-open', route: '/auth', role: '', action: async (p) => { await click(p, p.getByRole('button', { name: 'Sign up', exact: true })); await click(p, p.locator('main [role=combobox]')); } },
  { id: 'auth-forgot', route: '/auth', role: '', action: (p) => click(p, p.getByRole('button', { name: 'Forgot?' })) },
  { id: 'reset-wait', route: '/auth/reset-password', role: '' },
  { id: 'reset', route: '/auth/reset-password', role: 'family', student: 's-0013' },
  { id: 'reset-typed', route: '/auth/reset-password', role: 'family', student: 's-0013', action: async (p) => { await p.locator('#new-password').fill('abcdefgh'); await p.locator('#confirm-password').fill('abcdefgx'); await p.waitForTimeout(400); } },
  { id: 'claim', route: '/claim', role: '' },
  { id: 'claim-error', route: '/claim', role: '', action: async (p) => { await p.locator('input').first().fill('ABCDE-12345'); await p.locator('#password').fill('abc'); await p.locator('input').nth(2).fill('abc'); await click(p, p.getByRole('button', { name: 'Set my password' })); } },
  { id: 'watch', route: '/watch/t-1', role: '' },
  { id: 'watch-empty', route: '/watch/t-empty', role: '' },
  { id: 'watch-expired', route: '/watch/t-expired', role: '' },
  { id: 'picker', route: '/family/dashboard', role: 'family' },
  { id: 'fdash', route: '/family/dashboard', role: 'family', student: 's-0013' },
  { id: 'fdash-switch', route: '/family/dashboard', role: 'family', student: 's-0013', action: (p) => click(p, p.getByRole('button', { name: new RegExp(LONG) })) },
  { id: 'fdash-empty', route: '/family/dashboard', role: 'family', flags: { fake_family_empty: true } },
  { id: 'index-family13', route: '/', role: 'family', student: 's-0013', flags: G },
  { id: 'index-family1', route: '/', role: 'family', student: 's-0001', flags: G },
  { id: 'index-family2', route: '/', role: 'family', student: 's-0002', flags: G },
  { id: 'index-teacher', route: '/', role: 'teacher', flags: G },
  // inertness witnesses (outside the parent area): <main> raw and normalised
  { id: 'x-admin', route: '/admin', role: 'admin', dom: 'main' },
  { id: 'x-tdash', route: '/teacher/dashboard', role: 'teacher', dom: 'main' },
  { id: 'x-tschedule', route: '/schedule', role: 'teacher', calView: 'week', dom: 'main' },
  { id: 'x-sdash', route: '/student/dashboard', role: 'student', student: 's-0001', dom: 'main' },
  { id: 'x-sjournal', route: '/student/journal', role: 'student', student: 's-0001', dom: 'main' },
  { id: 'x-fschedule', route: '/schedule', role: 'family', student: 's-0013', calView: 'week', dom: 'main' },
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
  for (const w of sizes) for (const t of themes) {
    const key = `${s.id}-${w}-${t}`;
    if (opt.resume && results.runs[key] && !(results.runs[key].errors || []).length && !results.runs[key].actionError) continue;
    try { results.runs[key] = await run(s, w, w <= 375 ? 812 : 800, t === 'dark'); }
    catch (e) { console.log(key, 'RETRY after', String(e.message).slice(0, 120)); results.runs[key] = await run(s, w, w <= 375 ? 812 : 800, t === 'dark'); }
    fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
    const r = results.runs[key];
    console.log(key, JSON.stringify({ req: r.requests.count, axe: r.axe?.byImpact, axeMain: r.axe?.byImpactInMain, over: r.probe?.overflow, off: r.probe?.offscreenCount, ln: r.probe?.longName && (r.probe.longName.shown + '/' + r.probe.longName.clipped.length), money: r.probe?.money.length, attr: r.probe?.htmlAttr, path: r.probe?.path, err: r.errors.slice(0, 2), act: r.actionError }));
  }
}
fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
await browser.close(); stop();
process.exit(0);
