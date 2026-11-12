// FAKE Supabase client (copied from the A0 baseline harness, extended for A2.1). Never talks to a network.
// Counts every request. Made-up children only (fixtures.ts).
import schema from './schema.json';
import { buildFixtures, U, TODAY, MONTH_START } from './fixtures';

const w: any = typeof window !== 'undefined' ? window : {};
w.__requests = w.__requests || [];
const track = (kind: string, name: string, method = 'select') => { w.__requests.push({ kind, name, method, t: performance.now() }); w.__lastRequestAt = performance.now(); };

const db: Record<string, any[]> = buildFixtures() as any;
const copy = <T,>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const roleKey = () => { try { return localStorage.getItem('fake_role') || ''; } catch { return ''; } };
const userForRole = (r: string) => (U as any)[r] as string | undefined;

function defaults(table: string, row: any) {
  const cols = (schema as any)[table]; if (!cols) return row; const out: any = {};
  for (const [c, t] of Object.entries<string>(cols)) { out[c] = c in row ? row[c] : (/\| null$/.test(t) ? null : t === 'string' ? '' : t === 'number' ? 0 : t === 'boolean' ? false : /\[\]$/.test(t) ? [] : null); }
  return out;
}
const sing = (s: string) => s.replace(/ies$/, 'y').replace(/(ses|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');

function matchFilter(row: any, f: any) {
  const v = row[f.col];
  switch (f.op) {
    case 'eq': return v === f.val || String(v) === String(f.val);
    case 'neq': return !(v === f.val);
    case 'gt': return v > f.val; case 'gte': return v >= f.val; case 'lt': return v < f.val; case 'lte': return v <= f.val;
    case 'in': return (f.val as any[]).includes(v);
    case 'is': return f.val === null ? v == null : v === f.val;
    case 'like': case 'ilike': { const re = new RegExp('^' + String(f.val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 'i'); return re.test(String(v ?? '')); }
    case 'not': return !matchFilter(row, { col: f.col, op: f.sub, val: f.val });
    default: return true; // contains / overlaps / or: not modelled
  }
}

function embed(table: string, rows: any[], sel: string) {
  // very small embed support: "rel(cols)", "alias:rel(cols)", "rel!inner(cols)", "rel!fk(cols)"
  const rels = [...sel.matchAll(/(?:(\w+):)?(\w+)(?:!\w+)?\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)];
  if (!rels.length) return rows;
  return rows.map((r) => {
    const o = { ...r };
    for (const m of rels) {
      const alias = m[1] || m[2]; const rel = m[2];
      if (db[rel]) {
        const fk = `${sing(rel)}_id`;
        if (fk in r) { o[alias] = copy(db[rel].find((x) => x.id === r[fk])) ?? null; }
        else { const back = `${sing(table)}_id`; o[alias] = copy(db[rel].filter((x) => x[back] === r.id)); }
      } else o[alias] = null;
    }
    return o;
  });
}

class Q implements PromiseLike<any> {
  filters: any[] = []; table: string; method = 'select'; sel = '*'; ord: any[] = []; lim: number | null = null; rng: [number, number] | null = null; one: 'single' | 'maybe' | null = null; head = false; wantCount = false; payload: any = null;
  constructor(table: string) { this.table = table; }
  select(s = '*', opts?: any) { if (this.method === 'select') this.method = 'select'; this.sel = s; if (opts?.head) this.head = true; if (opts?.count) this.wantCount = true; return this; }
  insert(p: any) { this.method = 'insert'; this.payload = p; return this; }
  update(p: any) { this.method = 'update'; this.payload = p; return this; }
  upsert(p: any) { this.method = 'upsert'; this.payload = p; return this; }
  delete() { this.method = 'delete'; return this; }
  order(col: string, o?: any) { this.ord.push([col, o?.ascending !== false]); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.rng = [a, b]; return this; }
  single() { this.one = 'single'; return this; }
  maybeSingle() { this.one = 'maybe'; return this; }
  abortSignal() { return this; }
  csv() { return this; }
  returns() { return this; }
  eq(col: string, val: any) { this.filters.push({ col, op: 'eq', val }); return this; }
  neq(col: string, val: any) { this.filters.push({ col, op: 'neq', val }); return this; }
  gt(col: string, val: any) { this.filters.push({ col, op: 'gt', val }); return this; }
  gte(col: string, val: any) { this.filters.push({ col, op: 'gte', val }); return this; }
  lt(col: string, val: any) { this.filters.push({ col, op: 'lt', val }); return this; }
  lte(col: string, val: any) { this.filters.push({ col, op: 'lte', val }); return this; }
  in(col: string, val: any[]) { this.filters.push({ col, op: 'in', val }); return this; }
  is(col: string, val: any) { this.filters.push({ col, op: 'is', val }); return this; }
  like(col: string, val: any) { this.filters.push({ col, op: 'like', val }); return this; }
  ilike(col: string, val: any) { this.filters.push({ col, op: 'ilike', val }); return this; }
  not(col: string, sub: string, val: any) { this.filters.push({ col, op: 'not', sub, val }); return this; }
  or() { return this; } contains() { return this; } overlaps() { return this; } match(o: any) { for (const [k, v] of Object.entries(o)) this.eq(k, v); return this; } filter() { return this; } textSearch() { return this; }
  exec() {
    track('from', this.table, this.method);
    let rows = (db[this.table] || []).filter((r) => this.filters.every((f) => matchFilter(r, f)));
    if (this.method !== 'select') {
      const echo = Array.isArray(this.payload) ? this.payload : this.payload ? [this.payload] : [];
      return { data: this.one ? (echo[0] ?? null) : copy(echo), error: null, count: null, status: 200, statusText: 'OK' };
    }
    for (const [c, asc] of [...this.ord].reverse()) rows = [...rows].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
    const count = rows.length;
    if (this.rng) rows = rows.slice(this.rng[0], this.rng[1] + 1);
    if (this.lim != null) rows = rows.slice(0, this.lim);
    rows = rows.map((r) => defaults(this.table, r));
    if (this.table === 'classes') { let o = ''; try { o = localStorage.getItem('fake_board_style') || ''; } catch {} if (o) rows = rows.map((r) => ({ ...r, leaderboard_style: o })); }
    rows = embed(this.table, rows, this.sel);
    rows = copy(rows);
    if (this.head) return { data: null, error: null, count, status: 200, statusText: 'OK' };
    if (this.one) { if (!rows.length) return this.one === 'single' ? { data: null, error: { code: 'PGRST116', message: 'no rows' }, count: null } : { data: null, error: null, count: null }; return { data: rows[0], error: null, count: null }; }
    return { data: rows, error: null, count: this.wantCount ? count : null, status: 200, statusText: 'OK' };
  }
  then(res?: any, rej?: any) { return Promise.resolve().then(() => new Promise((r) => setTimeout(r, 15))).then(() => this.exec()).then(res, rej); }
}

// edge function / rpc canned answers: only what is needed for screens to render; everything else returns empty.
function fnAnswer(name: string, body: any) {
  if (name === 'calculate-tuition' || name === 'calculate-tuition-bulk') {
    const inv = db.invoices.find((i) => i.student_id === body?.studentId) || db.invoices[0];
    return { tuition: { baseAmount: inv.base_amount, discountAmount: inv.discount_amount, totalAmount: inv.total_amount, classBreakdown: [], siblingState: { status: 'resolved' } }, invoices: db.invoices.map((i) => ({ studentId: i.student_id, month: i.month, totalAmount: i.total_amount, baseAmount: i.base_amount, discountAmount: i.discount_amount, siblingState: { status: 'resolved' } })), siblingState: { status: 'resolved' } };
  }
  if (name === 'admin-unlock') return { unlocked: true, passkeys: [], hasPasscode: true, passcodeLockedUntil: null, enrolled: true, rpId: 'localhost' };
  if (name === 'calculate-payroll') return { month: MONTH_START, teachers: [], lines: [], totals: { gross: 0 }, closed: false };
  return {};
}

// ---- Realtime stand-in (A2.1): records every postgres_changes subscription with its filter,
// and lets the check deliver a made-up change event: window.__rt.emit(table, { eventType, new, old }).
const rt: any = (w.__rt = w.__rt || { subs: [], delivered: [], emit: null });
const filterMatches = (filter: string | undefined, row: any) => {
  if (!filter) return true; // no filter = every row in the table, as Supabase Realtime does
  const m = /^(\w+)=eq\.(.*)$/.exec(filter); if (!m) return true;
  return row && String(row[m[1]]) === m[2];
};
rt.emit = (table: string, payload: any) => {
  let n = 0;
  for (const s of rt.subs) {
    if (s.removed || s.type !== 'postgres_changes' || (s.filter?.table && s.filter.table !== table)) continue;
    if (!filterMatches(s.filter?.filter, payload.new || payload.old)) continue;
    n++; rt.delivered.push({ channel: s.channel, table, t: performance.now() });
    try { s.cb({ schema: 'public', table, commit_timestamp: new Date().toISOString(), errors: null, ...payload }); } catch (e) { console.error(e); }
  }
  return n;
};
const makeChannel = (name: string) => {
  const ch: any = {
    name,
    on(type: string, filter: any, cb: any) { rt.subs.push({ channel: name, type, filter, cb, removed: false, ch }); return ch; },
    subscribe(cb?: any) { if (typeof cb === 'function') setTimeout(() => cb('SUBSCRIBED'), 0); return ch; },
    unsubscribe() { for (const s of rt.subs) if (s.ch === ch) s.removed = true; return Promise.resolve('ok'); },
    send() { return Promise.resolve('ok'); }, track() { return Promise.resolve('ok'); }, untrack() { return Promise.resolve('ok'); }, presenceState() { return {}; },
  };
  return ch;
};

const listeners: any[] = [];
// A NEW session object on every call: GoTrueClient builds one from the refresh response
// (auth-js GoTrueClient.js:1884-1890, TOKEN_REFRESHED) or by parsing storage (:1859, SIGNED_IN).
const session = () => { const r = roleKey(); const id = userForRole(r); return id ? { access_token: 'fake', refresh_token: 'fake', expires_at: 9999999999, user: { id, email: `${r}@example.test`, user_metadata: { full_name: r }, app_metadata: {} } } : null; };
// ---- Auth event stand-in (A2.1): window.__fakeAuth.emit('TOKEN_REFRESHED') delivers what supabase-js would.
const fakeAuth: any = (w.__fakeAuth = w.__fakeAuth || { log: [] });
fakeAuth.emit = (event: string) => { const s = event === 'SIGNED_OUT' ? null : session(); fakeAuth.log.push({ event, t: performance.now() }); for (const cb of [...listeners]) { try { cb(event, s); } catch (e) { console.error(e); } } };
// supabase-js registers its own visibilitychange listener at client creation; on hidden -> visible it runs
// _recoverAndRefresh, which emits SIGNED_IN with a session parsed from storage (GoTrueClient.js:2163-2186, :1859).
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') setTimeout(() => fakeAuth.emit('SIGNED_IN'), 0); });
}

export const supabase: any = {
  from: (t: string) => new Q(t),
  rpc: (name: string, args?: any) => { track('rpc', name); return new Promise((r) => setTimeout(() => r({ data: name.startsWith('is_') || name.startsWith('has_') ? true : null, error: null }), 15)); },
  functions: { invoke: (name: string, opts?: any) => { track('function', name); return new Promise((r) => setTimeout(() => r({ data: fnAnswer(name, opts?.body), error: null }), 25)); } },
  auth: {
    getSession: async () => ({ data: { session: session() }, error: null }),
    getUser: async () => ({ data: { user: session()?.user ?? null }, error: null }),
    onAuthStateChange: (cb: any) => { listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', session()), 0); return { data: { subscription: { unsubscribe() { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); } } } }; },
    signOut: async () => ({ error: null }), refreshSession: async () => ({ data: { session: session() }, error: null }),
    mfa: { listFactors: async () => ({ data: { totp: [], all: [] }, error: null }) },
  },
  channel: (name: string) => makeChannel(name),
  removeChannel: (ch: any) => { try { ch?.unsubscribe?.(); } catch {} return Promise.resolve('ok'); },
  removeAllChannels: () => { for (const s of rt.subs) s.removed = true; return Promise.resolve([]); },
  getChannels: () => [],
  storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: 'data:,' + p } }), createSignedUrl: async () => { track('storage', 'sign'); return { data: { signedUrl: 'data:,x' }, error: null }; }, list: async () => { track('storage', 'list'); return { data: [], error: null }; }, download: async () => ({ data: null, error: { message: 'fake' } }), upload: async () => ({ data: null, error: { message: 'fake' } }) }) },
};
export default supabase;
export { TODAY };
