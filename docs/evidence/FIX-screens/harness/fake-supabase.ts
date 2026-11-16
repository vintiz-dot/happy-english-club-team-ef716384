// FAKE Supabase client for the A0 baseline harness. Never talks to a network. Counts every request.
import schema from './schema.json';
import { buildFixtures, U, TODAY, MONTH_START } from './fixtures';

const w: any = typeof window !== 'undefined' ? window : {};
w.__requests = w.__requests || [];
const track = (kind: string, name: string, method = 'select') => { w.__requests.push({ kind, name, method, t: performance.now() }); w.__lastRequestAt = performance.now(); };

const db: Record<string, any[]> = buildFixtures() as any;
for (const t of db.point_transactions) t.month = String(t.month).slice(0, 7); // R14: the app stores point months as YYYY-MM
// R14 additions (made-up): a teaching assistant with the long test name, XP settings, one custom quest.
db.teaching_assistants = [{ id: 'ta-0001', full_name: 'Nguyễn Hoàng Phương Thảo Nguyên', email: 'ta@example.test', phone: '0900 000 000', user_id: null, is_active: true, hourly_rate_vnd: 120000, per_session_rate_vnd: null, pay_rate_type: 'hourly', bio: 'Helps with the Starters classes on Monday and Wednesday evenings.', created_at: '2026-01-05T08:00:00Z', updated_at: '2026-01-05T08:00:00Z' }];
db.xp_settings = [
  { id: 'xs-1', category: 'homework', setting_name: 'homework_submitted', description: 'Points for handing homework in on time', points: 10, is_active: true },
  { id: 'xs-2', category: 'participation', setting_name: 'class_participation', description: 'Points for taking part in class', points: 5, is_active: true },
  { id: 'xs-3', category: 'streaks', setting_name: 'weekly_streak', description: 'Seven days in a row', points: 20, is_active: false },
];
db.custom_quests = [{ id: 'cq-1', name: 'Read three picture books', description: 'Read three books from the class shelf and tell the teacher one new word from each', points: 15, icon: '📚', category: 'homework', is_active: true, created_at: '2026-01-05T08:00:00Z' }];
// R19 additions (made-up): a long class name, notifications (read + unread, a long name in the title),
// one saved assistant conversation (only when fake_chat=1, so the empty state is also seen).
db.classes[0].name = 'Starters 1 (Mon-Wed) Phòng Hoa Hướng Dương với cô Nguyễn Hoàng Phương Thảo Nguyên';
db.notifications = [
  { id: 'n-1', type: 'homework_submitted', title: 'Nguyễn Hoàng Phương Thảo Nguyên handed in "My weekend" a day early', message: 'The homework was submitted with two photos and a short voice note about the weekend trip to the countryside with the family.', is_read: false, created_at: '2026-11-13T10:30:00', journal_id: null, metadata: { class_id: 'c-0001', student_id: 's-0013', student_name: 'Nguyễn Hoàng Phương Thảo Nguyên', class_name: 'Starters 1 (Mon-Wed)', homework_title: 'My weekend' } },
  { id: 'n-2', type: 'journal_collaboration', title: 'New class journal entry', message: 'Cô Hà added notes for Monday.', is_read: false, created_at: '2026-11-12T18:00:00', journal_id: null, metadata: { class_id: 'c-0001' } },
  { id: 'n-3', type: 'economy_request', title: 'Spend request', message: null, is_read: true, created_at: '2026-11-10T09:00:00', journal_id: null, metadata: { class_id: 'c-0001', student_name: 'Trần Bảo Châu' } },
];
// For the fullscreen lab (/teacher/books): one book, a blank page (no network).
db.teacher_flipbooks = [{ id: 'fb-1', title: 'Stand-in book (Unit 5)', url: 'about:blank', teacher_id: 't-0001', class_id: 'c-0001', created_at: '2026-11-02T08:00:00Z', updated_at: '2026-11-02T08:00:00Z' }];
// FIX-screens additions (made-up): two announcements, one Pixel Pal link worth a second look (the linked
// child is not enrolled in the class the record is for), and a stand-in Pixel Pal roster served by the fake
// stars-roster function (held in memory by the page, never saved).
db.site_announcements = [
  { id: 'an-1', title: 'Lớp nghỉ Thứ Sáu 20 tháng 11 - Ngày Nhà giáo Việt Nam: no classes on Friday 20 November', body: 'Teachers Day: the centre is closed.', image_url: null, display_type: 'banner', priority: 1, target_audience: 'teachers', placement: 'top', starts_at: null, expires_at: null, is_active: false, is_dismissible: true, style_config: {}, created_by: 'u-admin', created_at: '2026-11-10T08:00:00Z', updated_at: '2026-11-10T08:00:00Z', target_class_ids: [], target_student_ids: [] },
  { id: 'an-2', title: 'Parents evening', body: 'Thursday 26 November at 18:00.', image_url: null, display_type: 'popup', priority: 0, target_audience: 'teachers', placement: 'top', starts_at: null, expires_at: null, is_active: false, is_dismissible: true, style_config: {}, created_by: 'u-admin', created_at: '2026-11-11T08:00:00Z', updated_at: '2026-11-11T08:00:00Z', target_class_ids: [], target_student_ids: [] },
];
db.stars_class_map = [{ stars_class_id: '9', class_id: 'c-0001', teacher_id: 't-0001', enabled: true }];
db.stars_student_map = [{ stars_student_id: '121', student_id: 's-0013', created_at: '2026-11-02T08:00:00Z' }];
db.stars_sync_events = [
  { event_id: 'sev-1', seq: 1, kind: 'attendance', outcome: 'skipped_not_enrolled', outcome_note: 'student not enrolled', lesson_date: '2026-11-11', stars_class_id: '9', stars_student_id: '121', processed_at: '2026-11-11T12:00:00Z', received_at: '2026-11-11T11:59:00Z', attempts: 1, applied_ref: null, payload: { status: 'present' }, occurred_at: '2026-11-11T11:00:00Z' },
];
const STARS_ROSTER = { status: 'ok', fetched_at: '2026-11-13T11:00:00Z', students: { '121': 'Bé Bông (Pixel Pal)' }, classes: { '9': 'Starters A (Pixel Pal)' }, student_classes: { '121': '9' } };
const chatOn = () => { try { return localStorage.getItem('fake_chat') === '1'; } catch { return false; } };
const CHAT: Record<string, any[]> = {
  chat_conversations: [{ id: 'cv-1', user_id: 'u-x', title: 'When is my next class?', created_at: '2026-11-12T08:00:00Z', updated_at: '2026-11-12T08:01:00Z' }],
  chat_messages: [
    { id: 'cm-1', conversation_id: 'cv-1', role: 'user', content: 'When is my next class?', created_at: '2026-11-12T08:00:00Z' },
    { id: 'cm-2', conversation_id: 'cv-1', role: 'assistant', content: 'Your next class is Starters 1 on Monday 16 November at 17:30, with Cô Hà.\n\nRemember to bring your "My weekend" homework.', created_at: '2026-11-12T08:00:30Z' },
    { id: 'cm-3', conversation_id: 'cv-1', role: 'user', content: 'Thanks! How many points do I have?', created_at: '2026-11-12T08:01:00Z' },
    { id: 'cm-4', conversation_id: 'cv-1', role: 'assistant', content: 'You have 1.250 points this month, Nguyễn Hoàng Phương Thảo Nguyên.', created_at: '2026-11-12T08:01:10Z' },
  ],
};
const copy = <T,>(x: T): T => (x === undefined ? x : JSON.parse(JSON.stringify(x)));
const roleKey = () => { try { return localStorage.getItem('fake_role') || ''; } catch { return ''; } };
const userForRole = (r: string) => (U as any)[r] as string | undefined;

function defaults(table: string, row: any) {
  const cols = (schema as any)[table]; if (!cols) return row; const out: any = {};
  for (const [c, t] of Object.entries<string>(cols)) { out[c] = c in row ? row[c] : (/\| null$/.test(t) ? null : t === 'string' ? '' : t === 'number' ? 0 : t === 'boolean' ? false : /\[\]$/.test(t) ? [] : null); }
  return out;
}
const sing = (s: string) => s === 'classes' ? 'class' : s.replace(/ies$/, 'y').replace(/(ses|xes)$/, (m) => m.slice(0, -2)).replace(/s$/, '');

function matchFilter(row: any, f: any) {
  if (String(f.col).includes('.')) return true; // R14: filters on embedded tables are not modelled
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
  // very small embed support (FIX-screens: whitespace before "(" allowed, as GlobalCalendar writes it): "rel(cols)", "alias:rel(cols)", "rel!inner(cols)", "rel!fk(cols)"
  const rels = [...sel.matchAll(/(?:(\w+):)?(\w+)(?:!\w+)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g)];
  if (!rels.length) return rows;
  return rows.map((r) => {
    const o = { ...r };
    for (const m of rels) {
      const alias = m[1] || m[2]; const rel = m[2];
      if (db[rel]) {
        const fk = `${sing(rel)}_id`;
        if (fk in r) { const one = db[rel].find((x) => x.id === r[fk]); o[alias] = one ? embed(rel, [copy(one)], m[3])[0] : null; }
        else { const back = `${sing(table)}_id`; o[alias] = embed(rel, copy(db[rel].filter((x) => x[back] === r.id)), m[3]); }
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
    let rows = ((this.table in CHAT ? (chatOn() ? CHAT[this.table] : []) : db[this.table]) || []).filter((r) => this.filters.every((f) => matchFilter(r, f)));
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
  if (name === 'manage-admin-users' && body?.action === 'listUsers') return { users: [
    { id: 'u-student', email: 'minhanh@example.test', roles: ['student'], created_at: '2026-01-05T08:00:00Z' },
    { id: 'u-family', email: 'family@example.test', roles: ['family'], created_at: '2026-01-05T08:00:00Z' },
    { id: 'u-family-2', email: 'nguyen.hoang.phuong.thao.nguyen.family@example.test', roles: ['family', 'student'], created_at: '2026-01-05T08:00:00Z' },
    { id: 'u-admin', email: 'admin@example.test', roles: ['admin'], created_at: '2026-01-05T08:00:00Z' },
  ] };
  if (name === 'student-audit') {
    const mk = (month: string, base: number, disc: number, paid: number, src: 'snapshot' | 'invoice', late: number) => ({ month, invoiceId: 'inv-' + month, invoiceNumber: 'HEC-' + month.replace('-', '') + '-13', source: src, closedAt: src === 'snapshot' ? month + '-28T10:00:00Z' : null, closedBy: src === 'snapshot' ? 'u-admin' : null, baseAmount: base, discountAmount: disc, charged: base - disc, paid, carryInCredit: 0, carryInDebt: month.endsWith('10') ? 150000 : 0, carryOutCredit: 0, carryOutDebt: base - disc > paid ? base - disc - paid : 0, status: 'issued', confirmationStatus: null, confirmedAt: src === 'snapshot' ? month + '-27T10:00:00Z' : null, confirmedBy: src === 'snapshot' ? 'u-admin' : null, updatedAt: null, updatedBy: null, classes: [{ classId: 'c-0002', className: 'Movers 2 (Tue-Thu)', sessionsCountStored: 8 - late, amount: base }], attendance: { present: 7 - late, absent: 1, late, excused: 1, billedSessions: 8, rows: [] } });
    const months = [mk('2026-09', 1600000, 160000, 1440000, 'snapshot', 0), mk('2026-10', 1600000, 160000, 1290000, 'snapshot', 1)];
    return { student: { id: body?.studentId, name: 'Nguyễn Hoàng Phương Thảo Nguyên', familyId: null }, months,
      events: [
        { id: 'ev1', kind: 'payment', label: 'Bank transfer', amount: 1440000, occurredAt: '2026-09-05T09:00:00Z', recordedAt: '2026-09-05T10:12:00Z', month: '2026-09', method: 'bank_transfer', memo: 'Tháng 9', actorId: 'u-admin', provenance: 'payments', exact: true },
        { id: 'ev2', kind: 'payment', label: 'Cash', amount: 1290000, occurredAt: null, recordedAt: '2026-10-06T08:30:00Z', month: '2026-10', method: 'cash', memo: null, actorId: null, provenance: 'audit_log', exact: false },
        { id: 'ev3', kind: 'correction', label: 'Correction', amount: -150000, occurredAt: null, recordedAt: '2026-10-20T08:30:00Z', month: '2026-10', method: null, memo: null, actorId: 'u-admin', provenance: 'ledger', exact: true },
      ],
      actors: { 'u-admin': { name: 'Admin', email: 'admin@example.test', known: true } },
      totals: { charged: 2880000, paid: 2730000, balance: -150000, outstanding: 150000, credit: 0, months: 2 },
      caveats: { scalarPayments: true, auditOnlyEvents: 1, unattributedEvents: 1 } };
  }
  if (name === 'manage-student-access') {
    if (body?.action === 'search') return { students: [{ id: 's-0013', full_name: 'Nguyễn Hoàng Phương Thảo Nguyên', classes: ['Movers 2 (Tue-Thu)'], login_email: null, has_account: false }, { id: 's-0001', full_name: 'Nguyễn Minh Anh', classes: ['Starters 1 (Mon-Wed)'], login_email: 'minhanh@example.test', has_account: true }] };
    if (body?.action === 'status') return { has_account: false, login_email: null, suggested_email: 'thaonguyen@example.test', siblings: [], outstanding_code: null, blocked: false, blocked_reason: null };
  }
  if (name === 'stars-roster') return STARS_ROSTER;
  if (name === 'calculate-payroll') return { month: MONTH_START, teachers: [], lines: [], totals: { gross: 0 }, closed: false };
  return {};
}

const channelStub: any = { on() { return channelStub; }, subscribe() { return channelStub; }, unsubscribe() {}, send() {}, track() {} };
const listeners: any[] = [];
const session = () => { const r = roleKey(); const id = userForRole(r); return id ? { access_token: 'fake', refresh_token: 'fake', expires_at: 9999999999, user: { id, email: `${r}@example.test`, user_metadata: { full_name: r }, app_metadata: {} } } : null; };

export const supabase: any = {
  from: (t: string) => new Q(t),
  rpc: (name: string, args?: any) => { track('rpc', name); let hw = false; try { hw = localStorage.getItem('fake_hw') === '1'; } catch {} const data = name === 'get_student_homeworks' && hw ? { homeworks: (db.homeworks || []).map((h: any) => ({ ...h, classes: { name: (db.classes.find((c: any) => c.id === h.class_id) || {}).name } })), submissions: [] } : (name.startsWith('is_') || name.startsWith('has_') ? true : null); return new Promise((r) => setTimeout(() => r({ data, error: null }), 15)); },
  functions: { invoke: (name: string, opts?: any) => { track('function', name); return new Promise((r) => setTimeout(() => r({ data: fnAnswer(name, opts?.body), error: null }), 25)); } },
  auth: {
    getSession: async () => ({ data: { session: session() }, error: null }),
    getUser: async () => ({ data: { user: session()?.user ?? null }, error: null }),
    onAuthStateChange: (cb: any) => { listeners.push(cb); setTimeout(() => cb('INITIAL_SESSION', session()), 0); return { data: { subscription: { unsubscribe() {} } } }; },
    signOut: async () => ({ error: null }), refreshSession: async () => ({ data: { session: session() }, error: null }),
    mfa: { listFactors: async () => ({ data: { totp: [], all: [] }, error: null }) },
  },
  channel: () => channelStub, removeChannel: () => {}, removeAllChannels: () => {},
  storage: { from: () => ({ getPublicUrl: (p: string) => ({ data: { publicUrl: 'data:,' + p } }), createSignedUrl: async () => { track('storage', 'sign'); return { data: { signedUrl: 'data:,x' }, error: null }; }, list: async () => { track('storage', 'list'); return { data: [], error: null }; }, download: async () => ({ data: null, error: { message: 'fake' } }), upload: async () => ({ data: null, error: { message: 'fake' } }) }) },
};
export default supabase;
export { TODAY };
