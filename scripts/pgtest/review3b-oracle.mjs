// D4 step 3B review: the builder's reach oracle (d4-reach-oracle.test.mjs),
// reused AS IT IS for its school, its stand-in and the REAL bundled
// calculate-tuition / compute-sibling-discounts, with the reviewer's edits
// instead of the builder's. Generated at run time from the builder's file
// (so it cannot drift): everything above its "the edits" line is executed,
// plus one fixture row (a second, overlapping enrolment of child B, created
// later, with a rate override - the "created first prices the lesson" case).
//   node scripts/pgtest/review3b-oracle.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(here, 'd4-reach-oracle.test.mjs'), 'utf8').replace(/\r\n/g, '\n');
const cut = src.indexOf('// ------------------------------------------------------------ the edits');
src = src.slice(0, cut);
src = src.replace('const KIDS = [A, B];', `const EB2 = (await q1(\`INSERT INTO enrollments(class_id, student_id, start_date, rate_override_vnd, created_at)
  VALUES ($1,$2,$3,50000, now() + interval '1 hour') RETURNING id\`, [C1, B, first(0)])).id;
const KIDS = [A, B];`);
src = src.replace("const files = process.argv.slice(2);", "const files = JSON.parse(process.env.REVIEW_FILES);");
src += `
const signedOff = (b) => b.tuition_frozen || ['confirmed', 'adjusted'].includes(b.confirmation_status ?? '');
async function probe(label, setup, adminRaw) {
  await db.exec('BEGIN');
  let refused = null, moved = [];
  try {
    for (const s of setup) await db.exec(s);
    if (setup.length) await calcAll();
    const before = await bills();
    await db.exec('SAVEPOINT raw');
    try {
      await db.exec(\`SELECT set_config('test.uid', '\${ADMIN}', true), set_config('test.jwt_role', 'authenticated', true); SET LOCAL ROLE authenticated; \${adminRaw};\`);
    } catch (x) { refused = x.code; await db.exec('ROLLBACK TO SAVEPOINT raw'); }
    await db.exec("RESET ROLE; SELECT set_config('test.uid', '', true), set_config('test.jwt_role', '', true);");
    await calcAll();
    const now = await bills();
    for (const [key, was] of before) {
      const is = now.get(key);
      if (!is || ['base_amount', 'discount_amount', 'total_amount'].some((f) => is[f] !== was[f]) || is.tuition_frozen !== was.tuition_frozen) {
        const [sid, month] = key.split(':');
        moved.push({ kid: sid === A ? 'A' : 'B', month, past: PAST[month], signed: signedOff(was), was: was.total_amount, is: is?.total_amount ?? null,
                     frozen_was: was.tuition_frozen, frozen_is: is?.tuition_frozen ?? null });
      }
    }
  } finally { await db.exec('ROLLBACK').catch(() => {}); await db.exec('RESET ROLE').catch(() => {}); }
  const hit = moved.filter((m) => m.past || m.signed);
  console.log(\`PROBE \${label}: admin raw statement \${refused ? 'REFUSED ' + refused : 'ALLOWED'}; past/signed bills moved: \${hit.length}\${!refused && hit.length ? '  <== HOLE' : ''}\`);
  for (const m of hit) console.log('      ', JSON.stringify(m));
}
await probe('O1 created_at of the later, overlapping enrolment set before the first (B)', [],
  \`UPDATE enrollments SET created_at = '2000-01-01' WHERE id = '\${EB2}'\`);
await probe('O2 control: the same rows rate_override_vnd changed', [],
  \`UPDATE enrollments SET rate_override_vnd = 40000 WHERE id = '\${EB2}'\`);
const fixRate = [\`UPDATE enrollments SET rate_override_vnd = 60000 WHERE id = '\${EA}'\`];   // history corrected (owner lane); the frozen month keeps its figure
await probe('O3 frozen bill of A (' + MONTHS[0] + ') DELETED by an admin after a history correction', fixRate,
  \`DELETE FROM invoices WHERE student_id = '\${A}' AND month = '\${MONTHS[0]}'\`);
await probe('O4 frozen bill of A re-keyed to another month by an admin', fixRate,
  \`UPDATE invoices SET month = '2001-01' WHERE student_id = '\${A}' AND month = '\${MONTHS[0]}'\`);
await probe('O5 control: frozen bill of A unfrozen raw by an admin', fixRate,
  \`UPDATE invoices SET tuition_frozen = false WHERE student_id = '\${A}' AND month = '\${MONTHS[0]}'\`);
console.log('done');
process.exit(0);
`;
const out = join(here, '.review3b-oracle.gen.mjs');
writeFileSync(out, src);
const mig = ['20261009130000_audit_every_admin_action.sql', '20261027090000_cancelled_lesson_attendance_guard.sql',
  '20261106090000_attendance_enrollment_guard.sql', '20261112090000_session_held_evidence.sql',
  '20261112091000_session_cancel_guard.sql', '20261106120000_invoice_tuition_freeze.sql', '20261114090000_d4_floors.sql',
  '20261114091000_d4_core_register.sql', '20261106100000_attendance_guard_no_auto_changes.sql',
  '20261106100001_date_aware_enrollment_changes.sql', '20261113120000_pause_enrollment_admin_only.sql',
  '20260403051502_c6a09ad3-08c3-4ee2-ac06-2637acd66dff.sql',
  process.env.INPUTS_FILE ?? '20261114094000_d4_money_inputs_guard.sql'];
process.env.REVIEW_FILES = JSON.stringify(mig);
await import(pathToFileURL(out).href);
