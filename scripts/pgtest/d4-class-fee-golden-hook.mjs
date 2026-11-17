// Preload for invoice-status.test.mjs (node --import), used ONLY by
// d4-class-fee.test.mjs to run the golden-figure gate of D4 step 2
// (docs/evidence/D4-design.md (d) step 2, f.2) without editing that suite.
//
// invoice-status.test.mjs hands its bundles a Supabase stand-in through
// globalThis.__t1Client. This wraps it so that `class_fee_history` answers
// as the mode asks; every other table is the suite's own:
//
//   D4_FEE_MODE=missing   PGRST205 - the migration is not pasted yet
//   D4_FEE_MODE=baseline  one 1900-01-01 row per class at its session_rate_vnd
//                         (what the migration writes)
//   D4_FEE_MODE=future    baseline + a row from 2027-01-01 at 999,999 for every
//                         class (after every month the fixtures bill)
//   D4_FEE_MODE=inmonth   baseline + a row from 2026-10-01 at fee + 30,000 -
//                         the negative control: the gate MUST see it
//
// On exit it writes one line to stderr: how many times the table was read.
let inner = null;
let reads = 0;
const mode = process.env.D4_FEE_MODE || 'baseline';

function feeQuery(client) {
  const filters = [];
  let orderKey = null;
  let lim = Infinity;
  const q = {
    select() { return q; },
    in(k, vs) { filters.push((r) => vs.includes(r[k])); return q; },
    eq(k, v) { filters.push((r) => r[k] === v); return q; },
    gt(k, v) { filters.push((r) => String(r[k]) > String(v)); return q; },
    order(k) { orderKey = k; return q; },
    limit(n) { lim = n; return q; },
    then(done, bad) {
      reads += 1;
      if (mode === 'missing') {
        return Promise.resolve({ data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.class_fee_history' in the schema cache" } }).then(done, bad);
      }
      return Promise.resolve(client.from('classes').select('id, session_rate_vnd')).then(({ data }) => {
        const rows = [];
        for (const c of data ?? []) {
          const fee = Number(c.session_rate_vnd ?? 0);
          rows.push({ id: `fee-${c.id}-1900`, class_id: c.id, effective_from: '1900-01-01', session_rate_vnd: fee });
          if (mode === 'future') rows.push({ id: `fee-${c.id}-2027`, class_id: c.id, effective_from: '2027-01-01', session_rate_vnd: 999999 });
          if (mode === 'inmonth') rows.push({ id: `fee-${c.id}-2026`, class_id: c.id, effective_from: '2026-10-01', session_rate_vnd: fee + 30000 });
        }
        let out = rows.filter((r) => filters.every((f) => f(r)));
        if (orderKey) out = out.sort((a, b) => (String(a[orderKey]) < String(b[orderKey]) ? -1 : String(a[orderKey]) > String(b[orderKey]) ? 1 : 0));
        return { data: out.slice(0, lim), error: null };
      }).then(done, bad);
    },
  };
  return q;
}

const wrap = (...args) => {
  const c = inner(...args);
  return { ...c, from: (t) => (t === 'class_fee_history' ? feeQuery(c) : c.from(t)) };
};
Object.defineProperty(globalThis, '__t1Client', {
  configurable: true,
  get: () => (inner ? wrap : undefined),
  set: (v) => { inner = v; },
});
process.on('exit', () => { process.stderr.write(`D4 fee hook: mode=${mode} reads=${reads}\n`); });
