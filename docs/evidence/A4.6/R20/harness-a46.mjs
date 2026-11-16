// A4.6 shooting script (fake Supabase client, never a network). Port 5414, preview dir <repo>/.claude/a46-preview.
//   node a46.mjs <repoRoot> <outDir> <label> [--only=id,id] [--sizes=375,1280] [--themes=light,dark] [--force-ivory] [--no-axe]
// Writes <outDir>/<label>-<id>-<w>-<theme>.png (viewport, PNG; big ones re-shot as JPEG) and <outDir>/<label>-results.json
// (requests multiset, numbers multiset, overflow, axe impact counts, small targets).
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(process.argv[2] || '.');
const outDir = path.resolve(process.argv[3] || '.');
const label = process.argv[4] || 'run';
const opt = Object.fromEntries(process.argv.slice(5).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const PORT = 5420, BASE = `http://127.0.0.1:${PORT}`;
const axeSrc = fs.readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');

const pv = path.join(repo, '.claude/a46-preview'); fs.mkdirSync(pv, { recursive: true });
for (const f of fs.readdirSync(path.join(here, 'preview'))) fs.copyFileSync(path.join(here, 'preview', f), path.join(pv, f));
await new Promise((r) => spawn(process.execPath, [path.join(here, 'gen-schema.mjs'), repo, path.join(pv, 'schema.json')], { stdio: 'inherit' }).on('exit', r));
const vite = spawn(process.execPath, [path.join(repo, 'node_modules/vite/bin/vite.js'), '--config', path.join(pv, 'vite.config.ts'), '--port', String(PORT), '--strictPort'], { cwd: repo, stdio: 'ignore' });
const stop = () => { try { vite.kill(); } catch {} };
process.on('exit', stop);
for (let i = 0; i < 90; i++) { try { if ((await fetch(BASE + '/')).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
const browser = await chromium.launch({ channel: 'chrome' });

const INIT = ([role, student, boardStyle, dark, forceIvory, calView, overlay]) => {
  try {
    localStorage.setItem('fake_role', role);
    if (calView) localStorage.setItem('hec.calendar.view', calView); else localStorage.removeItem('hec.calendar.view');
    if (overlay) localStorage.setItem('fake_overlay', '1'); else localStorage.removeItem('fake_overlay');
    try { sessionStorage.removeItem('hec-newsite-overlay-dismissed'); } catch {}
    if (role === 'student') { localStorage.setItem('selected_student_id', student); localStorage.setItem('fake_student', student); }
    if (boardStyle) localStorage.setItem('fake_board_style', boardStyle); else localStorage.removeItem('fake_board_style');
    for (const u of ['u-admin', 'u-teacher', 'u-student', 'u-family']) localStorage.setItem('hec-theme:' + u, dark ? 'dark' : 'light');
    localStorage.setItem('hec-theme-boot', dark ? 'dark' : 'light');
  } catch {}
  const apply = () => { const de = document.documentElement; if (!de) return false; if (dark) de.classList.add('dark'); if (forceIvory) de.setAttribute('data-hec-theme', 'ivory'); return true; };
  if (!apply()) new MutationObserver((_, o) => { if (apply()) o.disconnect(); }).observe(document, { childList: true });
  window.__lastResEnd = 0;
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lastResEnd = Math.max(window.__lastResEnd, e.responseEnd); }).observe({ type: 'resource', buffered: true }); } catch {}
};
const ev = async (page, fn, arg) => { for (let i = 0; i < 6; i++) { try { return await page.evaluate(fn, arg); } catch (e) { if (!/context was destroyed|navigation/i.test(e.message)) throw e; await page.waitForTimeout(800); } } return page.evaluate(fn, arg); };

const PROBE = () => {
  const de = document.documentElement;
  const visible = (el) => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0; };
  const out = { overflow: de.scrollWidth > de.clientWidth, htmlAttr: de.getAttribute('data-hec-theme'), htmlClass: de.className };
  const sel = 'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=menuitem], [role=menuitemradio]';
  const small = [];
  for (const el of document.querySelectorAll(sel)) { if (!visible(el) || el.closest('[aria-hidden=true]')) continue; const r = el.getBoundingClientRect(); if (r.width < 43.5 || r.height < 43.5) small.push(`${el.closest('header') ? 'header' : el.closest('nav') ? 'nav' : el.closest('main') ? 'main' : 'other'}:${el.tagName} "${(el.getAttribute('aria-label') || el.innerText || '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`); }
  out.smallTargets = small;
  // R18: is the long test name cut anywhere (ellipsis, line clamp, or overflowing a clipping box)?
  const LN = 'Nguyễn Hoàng Phương Thảo Nguyên';
  out.longName = { shown: 0, clipped: [] };
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('');
    if (!own.includes(LN) || !visible(el)) continue;
    out.longName.shown++;
    for (let a = el; a && a !== document.body; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const clip = cs.overflowX !== 'visible' || cs.overflow !== 'visible';
      if (cs.textOverflow === 'ellipsis' && clip && a.scrollWidth > a.clientWidth + 1) { out.longName.clipped.push('ellipsis:' + a.tagName); break; }
      if (cs.webkitLineClamp && cs.webkitLineClamp !== 'none' && a.scrollHeight > a.clientHeight + 1) { out.longName.clipped.push('clamp:' + a.tagName); break; }
      if (a === el && clip && (a.scrollWidth > a.clientWidth + 1)) { out.longName.clipped.push('overflow:' + a.tagName); break; }
      if (a !== el) break;
    }
  }
  const txt = [...document.querySelectorAll('main')].map((e) => e.innerText).join('\n');
  out.numbers = (txt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  const dtxt = [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].map((e) => e.innerText).join('\n');
  out.dialogNumbers = (dtxt.match(/[-+]?\d[\d.,:/]*/g) || []).sort();
  return out;
};

async function run(s, w, h, dark) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', reducedMotion: s.element && opt.freeze ? 'reduce' : 'no-preference' });
  await ctx.addInitScript(INIT, [s.role, s.student || 's-0001', s.boardStyle || '', dark, !!opt['force-ivory'], s.calView || '', !!s.overlay]);
  // R18: nothing leaves the machine. ARASAAC pictures/search are answered locally with made-up placeholders; anything else non-local is aborted.
  await ctx.route((u) => !/^(http:\/\/127\.0\.0\.1:\d+|data:|about:|blob:)/.test(String(u)), (route) => {
    const u = route.request().url();
    if (/static\.arasaac\.org|api\.arasaac\.org\/v1\/pictograms\/\d+/.test(u)) { const id = (u.match(/(\d{3,})/) || [])[1] || '0'; return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="8" y="8" width="84" height="84" rx="12" fill="#9aa4b8"/><text x="50" y="58" font-size="18" text-anchor="middle" fill="#fff">' + id + '</text></svg>' }); }
    if (/api\.arasaac\.org\/v1\/pictograms\/en\/(best)?search/.test(u)) return route.fulfill({ contentType: 'application/json', body: JSON.stringify([2349, 2350, 2351, 2352, 2353, 2354].map((id, i) => ({ _id: id, keywords: [{ keyword: ['cat', 'kitten', 'pet cat', 'tabby cat with a very long keyword label', 'cat face', 'cats'][i] }] }))) });
    return route.abort();
  });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-11-13T12:00:00')); // R16: one date for Before and After; local and UTC day agree at noon
  const errors = []; page.on('pageerror', (e) => errors.push(String(process.env.STACK ? e.stack : e.message).slice(0, process.env.STACK ? 1500 : 160)));
  await page.goto(BASE + s.route, { waitUntil: 'load', timeout: 120000 }).catch((e) => errors.push('goto ' + e.message.slice(0, 100)));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const st = await ev(page, () => ({ now: performance.now(), act: Math.max(window.__lastResEnd || 0, window.__lastRequestAt || 0), txt: (document.getElementById('root')?.innerText || '').length })); if (st.now - st.act > 1000 && st.txt > 100) break; await page.waitForTimeout(250); }
  await page.waitForTimeout(2600);
  const m = { errors };
  const reqs = await ev(page, () => (window.__requests || []).map((r) => `${r.kind}:${r.name}:${r.method}`));
  const k = {}; for (const r of reqs) k[r] = (k[r] || 0) + 1; m.requests = { count: reqs.length, kinds: Object.fromEntries(Object.entries(k).sort()) };
  if (s.action) { try { await s.action(page); await page.waitForTimeout(1200); } catch (e) { m.actionError = String(e.message).slice(0, 200); } }
  m.probe = await ev(page, PROBE);
  if (s.dom) m.dom = await ev(page, ([sel, strip]) => [...document.querySelectorAll(sel)].map((el) => { const c = el.cloneNode(true); if (strip) { const frames = new Set([...c.querySelectorAll('[aria-label=Month]')].map((t) => t.closest('div.relative.overflow-hidden')).filter(Boolean)); for (const fr of frames) if (fr.children[1]) fr.children[1].replaceWith(document.createTextNode('[class board]')); } for (const n of [c, ...c.querySelectorAll('*')]) for (const a of [...n.attributes]) if (/^(id|for|src|srcset|style|aria-controls|aria-labelledby|aria-describedby|data-radix-.*)$/.test(a.name) || /radix-/.test(a.value)) n.removeAttribute(a.name); return c.outerHTML; }).join('\n'), [s.dom, !!s.stripBoard]);
  if (!opt['no-axe']) {
    await page.addScriptTag({ content: axeSrc });
    m.axe = await ev(page, async () => { const r = await window.axe.run(document, { resultTypes: ['violations'] }); const by = {}; for (const x of r.violations) by[x.impact || 'none'] = (by[x.impact || 'none'] || 0) + 1; return { byImpact: by, rules: r.violations.filter((x) => x.impact === 'critical' || x.impact === 'serious').map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, t: x.nodes.slice(0, 3).map((n) => n.target.join(' ').slice(0, 80)) })) }; });
  }
  const theme = dark ? 'dark' : 'light';
  const base = `${label}-${s.id}-${w}-${theme}`;
  if (s.element && opt.freeze) {
    await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}' });
    await page.evaluate(() => { for (const a of document.getAnimations()) { try { a.finish(); } catch { a.cancel(); } } });
    await page.waitForTimeout(500);
  }
  if (s.element) {
    const handle = await page.evaluateHandle(s.element);
    const el = handle.asElement();
    if (el) { await el.screenshot({ path: path.join(outDir, base + '.png') }); m.shot = base + '.png'; } else m.shotError = 'element not found';
  } else {
    let p = path.join(outDir, base + '.png');
    await page.screenshot({ path: p });
    if (fs.statSync(p).size > 390 * 1024) { fs.unlinkSync(p); p = path.join(outDir, base + '.jpg'); await page.screenshot({ path: p, type: 'jpeg', quality: 80 }); }
    m.shot = path.basename(p); m.kb = Math.round(fs.statSync(p).size / 1024);
  }
  await ctx.close();
  return m;
}

const click = async (p, loc) => { await loc.first().click(); await p.waitForTimeout(1500); };
const scrollTo = async (p, text, off = -80) => { await p.getByText(text, { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.mouse.wheel(0, off); await p.waitForTimeout(500); };
const scrollRe = async (p, re, off = -80) => { await p.getByText(re).first().evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.mouse.wheel(0, off); await p.waitForTimeout(500); };
const tab = async (p, name) => { const t = p.getByRole('tab', { name, exact: true }).first(); await t.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1500); };
const pick = async (p, nth, option) => { await click(p, p.locator('main [role=combobox]').nth(nth)); await click(p, p.getByRole('option', { name: option })); };
const LONG = 'Nguyễn Hoàng Phương Thảo Nguyên';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// Smart Upload: class + the long-name student picked
const suPick = async (p) => { await pick(p, 0, 'Starters 1 (Mon-Wed)'); await pick(p, 1, new RegExp(LONG)); };
const suRun = async (p) => {
  await suPick(p);
  await p.locator('main input[type=file]').first().setInputFiles({ name: 'unit3-page12.jpg', mimeType: 'image/jpeg', buffer: png });
  await p.waitForTimeout(1500);
  await tab(p, 'Vocab Scan');
  await p.locator('main input[type=file]').last().setInputFiles({ name: 'vocab-page-with-a-long-file-name-from-the-phone-camera.jpg', mimeType: 'image/jpeg', buffer: png });
  await p.waitForTimeout(2500);
};
const trOpen = async (p, title = 'Unit 3 - Colours') => { await pick(p, 0, 'Starters 1 (Mon-Wed)'); await p.waitForTimeout(800); await click(p, p.locator('main button', { hasText: title })); };
const calBody = async (p) => { await p.locator('main').getByText(/^\d+ sessions?$/).first().evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.mouse.wheel(0, -60); await p.waitForTimeout(500); };
const S = [
  // R20: the calendar views (admin /schedule), each view, the mini calendar, the filters, the "+N more" peek
  { id: 'cal-week', route: '/schedule', role: 'admin', calView: 'week', dom: 'main' },
  { id: 'cal-week-body', route: '/schedule', role: 'admin', calView: 'week', action: calBody },
  { id: 'cal-day', route: '/schedule', role: 'admin', calView: 'day', dom: 'main', action: calBody },
  { id: 'cal-month', route: '/schedule', role: 'admin', calView: 'month', dom: 'main', action: calBody },
  { id: 'cal-agenda', route: '/schedule', role: 'admin', calView: 'agenda', dom: 'main', action: calBody },
  { id: 'cal-mini', route: '/schedule', role: 'admin', calView: 'week', dom: 'main', action: (p) => click(p, p.locator('main button:has(svg.lucide-calendar-days)')) },
  { id: 'cal-filter', route: '/schedule', role: 'admin', calView: 'week', dom: '[data-radix-popper-content-wrapper]', action: (p) => click(p, p.locator('main button', { hasText: /^Class$/ })) },
  { id: 'cal-filter-t', route: '/schedule', role: 'admin', calView: 'week', action: async (p) => { await click(p, p.locator('main button', { hasText: /^Teacher$/ })); } },
  { id: 'cal-more', route: '/schedule', role: 'admin', calView: 'month', dom: '[data-radix-popper-content-wrapper]', action: async (p) => { await calBody(p); await click(p, p.locator('main button', { hasText: /^\+\d+ more$/ })); } },
  { id: 'cal-teacher', route: '/teacher/attendance', role: 'teacher', calView: 'week', dom: 'main' },
  // the calendar for the other areas on /schedule (unlisted: must not change at all)
  { id: 'cal-family', route: '/schedule', role: 'family', calView: 'week', dom: 'main' },
  { id: 'cal-family-m', route: '/schedule', role: 'family', calView: 'month', dom: 'main' },
  { id: 'cal-student', route: '/schedule', role: 'student', student: 's-0013', calView: 'agenda', dom: 'main' },
  { id: 'fam', route: '/family/dashboard', role: 'family', dom: 'body' },
  // the leaderboard frames and the classic board
  { id: 'lb', route: '/teacher/leaderboards', role: 'teacher', boardStyle: 'podium', dom: 'main', action: (p) => click(p, p.getByRole('button', { name: 'Standard' })) },
  { id: 'lb-rows', route: '/teacher/leaderboards', role: 'teacher', boardStyle: 'podium', action: async (p) => { await click(p, p.getByRole('button', { name: 'Standard' })); await scrollTo(p, 'Everyone else', -40); } },
  { id: 'lb-select', route: '/teacher/leaderboards', role: 'teacher', boardStyle: 'podium', action: async (p) => { await click(p, p.getByRole('button', { name: 'Standard' })); await click(p, p.locator('main button', { hasText: /^Select all$/ })); await scrollTo(p, 'Everyone else', -40); } },
  { id: 'cls-lb', route: '/admin/classes/c-0001?tab=leaderboard', role: 'admin', boardStyle: 'podium', dom: 'main' },
  { id: 'cls-lb-empty', route: '/admin/classes/c-0003?tab=leaderboard', role: 'admin', boardStyle: 'podium', dom: 'main' },
  { id: 'stu-detail', route: '/students/s-0013', role: 'admin', boardStyle: 'podium', dom: 'main', action: (p) => scrollRe(p, /^Flyers Advanced Weekend/, -80) },
  // the live student area: the frame (already on the new design) must not change; only the classic board inside it is restyled
  { id: 'sdash', route: '/student/dashboard', role: 'student', student: 's-0013', boardStyle: 'podium', dom: 'main', stripBoard: true, action: async (p) => { await p.locator('main [aria-label=Month]').first().evaluate((el) => el.scrollIntoView({ block: 'start' })); await p.mouse.wheel(0, -90); await p.waitForTimeout(600); } },
  { id: 'sdash-self', route: '/student/dashboard', role: 'student', student: 's-0001', boardStyle: 'podium', dom: 'main', stripBoard: true, action: (p) => scrollTo(p, 'Everyone else', -200) },
  // the family page (admin)
  { id: 'famdetail', route: '/families/f-0001', role: 'admin', dom: 'main' },
  // NewSiteMigrationOverlay: no importer in the app; the harness mounts it over a listed route (new design) and an unlisted one (old)
  { id: 'ov-intro', route: '/student/dashboard', role: 'student', overlay: true },
  { id: 'ov-remember', route: '/student/dashboard', role: 'student', overlay: true, action: (p) => click(p, p.getByRole('button', { name: /Yes, take me there/ })) },
  { id: 'ov-create', route: '/student/dashboard', role: 'student', overlay: true, action: async (p) => { await click(p, p.getByRole('button', { name: /Yes, take me there/ })); await click(p, p.getByRole('button', { name: /No, I forgot/ })); } },
  { id: 'ov-done', route: '/student/dashboard', role: 'student', overlay: true, action: async (p) => { await click(p, p.getByRole('button', { name: /Yes, take me there/ })); await click(p, p.getByRole('button', { name: /No, I forgot/ })); await click(p, p.getByRole('button', { name: /Create my new login/ })); } },
  { id: 'ov-fam', route: '/family/dashboard', role: 'family', overlay: true, dom: 'div.fixed.inset-0' },
  { id: 'ov-fam-done', route: '/family/dashboard', role: 'family', overlay: true, dom: 'div.fixed.inset-0', action: async (p) => { await click(p, p.getByRole('button', { name: /Yes, take me there/ })); await click(p, p.getByRole('button', { name: /No, I forgot/ })); await click(p, p.getByRole('button', { name: /Create my new login/ })); } },
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
  const sz = s.element ? [1280] : sizes;
  const th = s.element ? ['light'] : themes;
  for (const w of sz) for (const t of th) {
    const key = `${s.id}-${w}-${t}`;
    if (opt.resume && results.runs[key] && !(results.runs[key].errors || []).length && !results.runs[key].actionError) continue;
    try { results.runs[key] = await run(s, w, w === 375 ? 812 : 800, t === 'dark'); }
    catch (e) { console.log(key, 'RETRY after', String(e.message).slice(0, 120)); results.runs[key] = await run(s, w, w === 375 ? 812 : 800, t === 'dark'); }
    fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
    const r = results.runs[key];
    console.log(key, JSON.stringify({ req: r.requests.count, axe: r.axe?.byImpact, over: r.probe?.overflow, small: r.probe?.smallTargets.length, ln: r.probe?.longName && (r.probe.longName.shown + "/" + r.probe.longName.clipped.length), attr: r.probe?.htmlAttr, cls: r.probe?.htmlClass, kb: r.kb, err: r.errors.slice(0, 2), act: r.actionError, shotErr: r.shotError }));
  }
}
fs.writeFileSync(resPath, JSON.stringify(results, null, 1));
await browser.close(); stop();
process.exit(0);
