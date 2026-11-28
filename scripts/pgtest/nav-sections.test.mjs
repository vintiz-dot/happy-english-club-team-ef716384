// The sidebar's one definition (src/lib/navSections.ts), bundled with esbuild and run in node.
// A merge of menu entries must never hide a page: every route a teacher or admin could reach
// before is still reachable from the definition, once.
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) { pass++; console.log('  ok   ' + name); } else { fail++; console.log('  FAIL ' + name + (extra ? ' ' + JSON.stringify(extra) : '')); } };

const out = await build({ entryPoints: [resolve(repo, 'src/lib/navSections.ts')], bundle: true, format: 'esm', platform: 'neutral', write: false, logLevel: 'silent' });
const f = resolve(tmpdir(), `nav-sections.${process.pid}.mjs`);
writeFileSync(f, out.outputFiles[0].text);
const nav = await import(pathToFileURL(f).href);

const TEACHER_BEFORE = ['/dashboard', '/schedule', '/teacher/leaderboards', '/teacher/payroll', '/teacher/assignments', '/teacher/attendance',
  '/teacher/journal', '/teacher/exam-reports', '/teacher/vocabulary-audit', '/teacher/smart-upload', '/teacher/my-student-works',
  '/teacher/recorder', '/teacher/resources', '/teacher/books', '/teacher/language-support', '/teacher/class-reports'];
const ADMIN_BEFORE = ['/admin', '/students', '/teachers', '/admin?tab=classes', '/families', '/schedule', '/admin?tab=assignments', '/admin?tab=journal',
  '/admin?tab=exam-reports', '/admin?tab=finance', '/admin?tab=payroll', '/admin?tab=reports', '/admin?tab=automation', '/admin?tab=activity',
  '/admin?tab=ai-actions', '/admin?tab=data', '/admin?tab=stars-sync', '/admin?tab=audit-clips', '/admin?tab=announcements', '/admin?tab=reception',
  '/teacher/smart-upload', '/admin/student-work', '/teacher/recorder', '/teacher/books', '/teacher/language-support', '/teacher/class-reports'];

const paths = (groups) => nav.allMembers(groups).map((m) => m.path);
const dups = (a) => a.filter((x, i) => a.indexOf(x) !== i);

const t = nav.navGroupsFor('teacher', { pilot: true });
const tNo = nav.navGroupsFor('teacher', { pilot: false });
ok('teacher: every old route is reachable (pilot on)', TEACHER_BEFORE.every((p) => paths(t).includes(p)), TEACHER_BEFORE.filter((p) => !paths(t).includes(p)));
ok('teacher: no route listed twice', dups(paths(t)).length === 0, dups(paths(t)));
ok('teacher: nine sidebar entries instead of seventeen', t.flatMap((g) => g.sections).length === 9);
ok('teacher: one Lesson reports entry (class and lesson reports merged, 25 Nov 2026)', paths(t).includes('/teacher/class-reports'));
ok('teacher: the lesson monitor is a tab beside Lesson reports for a pilot teacher only (27 Nov 2026), not a sidebar entry of its own',
  t.flatMap((g) => g.sections).find((s) => s.id === 'class-notes')?.members.some((m) => m.path === '/teacher/lesson-reports') && !paths(tNo).includes('/teacher/lesson-reports'));
ok('teacher: without the pilot flag everything else is still there', TEACHER_BEFORE.every((p) => paths(tNo).includes(p)));

const a = nav.navGroupsFor('admin');
ok('admin: every old route is reachable', ADMIN_BEFORE.every((p) => paths(a).includes(p)), ADMIN_BEFORE.filter((p) => !paths(a).includes(p)));
ok('admin: 28 entries (Level Defence added 28 Nov 2026), no route listed twice', nav.allMembers(a).length === 28 && dups(paths(a)).length === 0, dups(paths(a)));
ok('admin: six headings, as agreed', JSON.stringify(a.map((g) => g.label)) === JSON.stringify(['Overview', 'People', 'Teaching', 'Money', 'Front desk', 'System']));
ok('admin: one page per entry (no tab strip)', a.every((g) => g.sections.every((s) => s.members.length === 1)));
ok('other roles get no menu', nav.navGroupsFor('student').length === 0 && nav.navGroupsFor(null).length === 0);

const sec = (p, s = '') => nav.sectionOfPath(t, p, s)?.id;
ok('sectionOfPath: attendance is in schedule & attendance', sec('/teacher/attendance') === 'schedule-attendance' && sec('/schedule') === 'schedule-attendance');
ok('sectionOfPath: each member finds its section', sec('/teacher/exam-reports') === 'class-notes' && sec('/teacher/class-reports') === 'class-notes' &&
  sec('/teacher/vocabulary-audit') === 'student-work' && sec('/teacher/books') === 'materials' && sec('/teacher/resources') === 'materials');
ok('sectionOfPath: a stray query on a plain path is not a match, an unknown page has no section', sec('/teacher/journal', '?x=1') === undefined && sec('/nowhere') === undefined);
ok('admin ?tab= paths match page and query', nav.sectionOfPath(a, '/admin', '?tab=finance')?.label === 'Finance' && nav.sectionOfPath(a, '/admin')?.label === 'Dashboard');
ok('groupOfPath finds the heading holding the page', nav.groupOfPath(a, '/admin', '?tab=payroll')?.id === 'money' && nav.groupOfPath(a, '/teachers')?.id === 'people');

// The Layout, tab strip and palette use the definition rather than a list of their own.
const src = (p) => readFileSync(resolve(repo, p), 'utf8');
ok('Layout reads navGroupsFor and renders SectionTabs', /navGroupsFor\(/.test(src('src/components/Layout.tsx')) && /<SectionTabs/.test(src('src/components/Layout.tsx')));
ok('CommandPalette lists pages from the definition', /allMembers\(navGroupsFor/.test(src('src/components/CommandPalette.tsx')));

console.log(`\nnav-sections: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
