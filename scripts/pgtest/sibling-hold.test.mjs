// D5: the sibling-discount hold (students.sibling_discount_from) had no test
// of its own. supabase/functions/_lib/sibling-hold.ts is the one rule
// (root AGENTS.md); this suite holds it:
//   1. the month rule: a child is left out of the family discount for every
//      month BEFORE the month of sibling_discount_from, and counts from that
//      month on (the day inside the month does not matter);
//   2. siblingHolds reads only the families asked for, only children with a
//      hold, and keeps only those held for the month; a read error throws
//      (guessing "nobody is on hold" would give a held child's family a
//      discount) - except a missing column (42703, before the migration);
//   3. both deciders ask it and drop held children before working out the
//      family: compute-sibling-discounts and projectedByFamilyPerClass
//      (behind watch-sibling-threshold); no other edge function restates it.
//   G-10 (fixed in D5 fix round 1): an error whose MESSAGE mentioned
//   sibling_discount_from used to read as "nobody on hold" - a permission
//   error on that column failed open. Now only code 42703 does.
import { transform } from 'esbuild';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
let pass = 0, fail = 0;
const ok = (name, value, extra) => {
  console.log(`  ${value ? 'PASS' : 'FAIL'} ${name}${!value && extra !== undefined ? `  -- ${JSON.stringify(extra).slice(0, 600)}` : ''}`);
  value ? pass++ : fail++;
};
const libPath = join(repo, 'supabase', 'functions', '_lib', 'sibling-hold.ts');
const lib = readFileSync(libPath, 'utf8');
const out = join(mkdtempSync(join(tmpdir(), 'sibling-hold-')), 'sibling-hold.mjs');
writeFileSync(out, (await transform(lib, { loader: 'ts', format: 'esm' })).code);
const { heldOutOfSiblingDiscount, siblingHolds } = await import(pathToFileURL(out).href);

console.log('\n1. the month rule');
{
  const cases = [
    // from, month, held?
    ['2026-11-15', '2026-10', true],
    ['2026-11-15', '2026-11', false],   // counts from the month of the date, whatever the day
    ['2026-11-01', '2026-11', false],
    ['2026-11-30', '2026-12', false],
    ['2027-01-01', '2026-12', true],    // across a year
    [null, '2026-11', false],
    [undefined, '2026-11', false],
    ['', '2026-11', false],
  ];
  for (const [from, month, held] of cases) ok(`hold from ${JSON.stringify(from)}, month ${month}: ${held ? 'left out' : 'counts'}`, heldOutOfSiblingDiscount(from, month) === held);
}

console.log('\n2. siblingHolds against a stand-in client');
{
  const fake = (rows, error = null) => {
    const calls = [];
    const q = {
      select: (c) => (calls.push(['select', c]), q),
      in: (c, v) => (calls.push(['in', c, v]), q),
      not: (c, op, v) => (calls.push(['not', c, op, v]), Promise.resolve({ data: error ? null : rows, error })),
    };
    return { calls, client: { from: (t) => (calls.push(['from', t]), q) } };
  };
  const rows = [{ id: 'a', sibling_discount_from: '2026-12-01' }, { id: 'b', sibling_discount_from: '2026-11-20' }, { id: 'c', sibling_discount_from: '2026-10-01' }];
  const f = fake(rows);
  const held = await siblingHolds(f.client, ['fam1', 'fam1', '', null], '2026-11');
  ok('November: only the child whose hold runs to December is held', held.size === 1 && held.has('a'), [...held]);
  ok('  it reads students, of the families asked for (deduplicated, blanks dropped), children with a hold only',
     JSON.stringify(f.calls) === JSON.stringify([['from', 'students'], ['select', 'id, sibling_discount_from'], ['in', 'family_id', ['fam1']], ['not', 'sibling_discount_from', 'is', null]]), f.calls);
  const none = fake(rows);
  ok('no family: no read at all, nobody held', (await siblingHolds(none.client, [], '2026-11')).size === 0 && none.calls.length === 0);
  const missing = fake(null, { code: '42703', message: 'column students.sibling_discount_from does not exist' });
  ok('the column not there yet (42703): nobody on hold', (await siblingHolds(missing.client, ['f'], '2026-11')).size === 0);
  let threw = null;
  try { await siblingHolds(fake(null, { code: '57014', message: 'canceling statement due to statement timeout' }).client, ['f'], '2026-11'); } catch (e) { threw = e; }
  ok('any other read error throws (fails closed: no guessed discount)', !!threw, threw);
  // G-10 (fixed in D5 fix round 1): only 42703 means "the column is missing".
  for (const err of [
    { code: '42501', message: 'permission denied for column sibling_discount_from' },
    { code: 'PGRST204', message: "Could not find the 'sibling_discount_from' column of 'students' in the schema cache" },
    { code: undefined, message: 'column students.sibling_discount_from does not exist' },
    { code: '42P01', message: 'relation "students" does not exist' },
  ]) {
    let t = null;
    try { await siblingHolds(fake(null, err).client, ['f'], '2026-11'); } catch (e) { t = e; }
    ok(`G-10 fixed: ${err.code ?? 'no code'} "${err.message.slice(0, 50)}..." throws (fails closed), even when it names the column`, t === err, t);
  }
  ok('  the source accepts exactly one code as "column missing": 42703',
     /if \(error\.code === "42703"\) return new Set\(\);/.test(lib) && !/sibling_discount_from\/\.test/.test(lib));
}

console.log('\n3. the deciders use it, and nothing else restates it');
{
  const fn = (p) => readFileSync(join(repo, 'supabase', 'functions', p), 'utf8');
  for (const p of ['compute-sibling-discounts/index.ts', '_lib/projected-per-class.ts']) {
    const t = fn(p);
    ok(`${p} imports siblingHolds and drops held children before working out the family`,
       /import \{[^}]*siblingHolds[^}]*\} from ['"]\.{1,2}\/(_lib\/)?sibling-hold\.ts['"]/.test(t) && /filter\(\(s: any\) => !held\.has\(s\.id\)\)/.test(t));
  }
  ok('watch-sibling-threshold goes through projectedByFamilyPerClass (via getHighestClassPerStudent)',
     /getHighestClassPerStudent[^\n]*projected-per-class\.ts/.test(fn('watch-sibling-threshold/index.ts'))
       && /getHighestClassPerStudent[\s\S]{0,200}await projectedByFamilyPerClass\(/.test(fn('_lib/projected-per-class.ts')));
  const files = [];
  const walk = (d) => { for (const n of readdirSync(d)) { const p = join(d, n); statSync(p).isDirectory() ? walk(p) : /\.ts$/.test(n) && files.push(p); } };
  walk(join(repo, 'supabase', 'functions'));
  const restating = files.filter((p) => !p.endsWith('sibling-hold.ts') && !p.endsWith(join('mcp', 'index.ts'))
    && /sibling_discount_from/.test(readFileSync(p, 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')))
    .map((p) => p.slice(repo.length + 1).replace(/\\/g, '/'));
  ok('no other edge function reads sibling_discount_from (the rule lives in one file)', restating.length === 0, restating);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
