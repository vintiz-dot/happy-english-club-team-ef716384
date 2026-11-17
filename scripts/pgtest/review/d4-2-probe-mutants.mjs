// Runs the reviewer probe (d4-2-probe.mjs) against the reviewer's mutants
// V01-V05 of the class-fee migration (same find/replace as d4-mutants.mjs).
//   node scripts/pgtest/review/d4-2-probe-mutants.mjs
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..', '..');
const src = readFileSync(join(repo, 'supabase/migrations/20261114092000_d4_class_fee_history.sql'), 'utf8').replace(/\r\n/g, '\n');
const V = [
  ['V01', "public.tuition_reach(v_kids, p_class, v_min, v_max)", "public.tuition_reach(v_kids, p_class, v_min, v_min)"],
  ['V02', "AND a.status::text IN ('Present', 'Absent', 'Late');", "AND a.status::text IN ('Present', 'Late');"],
  ['V03', " AND (o.change ->> 'effective_from')::date = v_from", ""],
  ['V04', "IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.id = OLD.class_id) THEN", "IF TG_OP = 'DELETE' THEN"],
  ['V05', "v_tier := COALESCE((v_reach ->> 'tier')::int, 3);", "v_tier := COALESCE((v_reach ->> 'tier')::int, 0);"],
];
for (const [id, find, repl] of V) {
  if (src.split(find).length !== 2) { console.log(`${id} BAD MUTANT`); continue; }
  const p = join(tmpdir(), `d4-2-review-${id}.sql`);
  writeFileSync(p, src.replace(find, () => repl));
  const r = spawnSync(process.execPath, [join(here, 'd4-2-probe.mjs')], { env: { ...process.env, D4_FEE_FILE: p }, encoding: 'utf8', maxBuffer: 1 << 26 });
  const fails = String(r.stdout).split('\n').filter((l) => l.includes('FAIL'));
  console.log(`${id} ${r.status !== 0 ? `CAUGHT by probe: ${fails[0]?.trim().slice(0, 150)}` : 'SURVIVED the probe'}`);
}
