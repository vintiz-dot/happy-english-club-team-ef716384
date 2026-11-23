// In-memory stand-in for the Supabase client. Made-up data only.
import { buildDb, getState, ME } from "./fixtures";

type Row = Record<string, any>;
type Result = { data: any; error: any; count?: number | null };

const copy = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const get = (row: Row, col: string) => {
  const v = col.split(".").reduce((o: any, k) => (o == null ? o : o[k]), row);
  return v === undefined ? null : v;
};

// Writes are kept in memory for the life of the page, so a grade or an approval can be watched end to end.
// patch: merged into the row with that id; added: inserted rows; gone: deleted ids.
const writes = {
  patch: {} as Record<string, Record<string, Row>>,
  added: {} as Record<string, Row[]>,
  gone: {} as Record<string, Set<string>>,
};
const withWrites = (table: string, base: Row[]): Row[] => {
  const gone = writes.gone[table];
  const patch = writes.patch[table] ?? {};
  const rows = base.filter((r) => !gone?.has(r.id)).map((r) => (patch[r.id] ? { ...r, ...patch[r.id] } : r));
  return rows.concat(copy(writes.added[table] ?? []));
};
export const patchRow = (table: string, id: string, values: Row) => {
  (writes.patch[table] ??= {})[id] = { ...(writes.patch[table]?.[id] ?? {}), ...values };
};
let nextId = 1;

class Query implements PromiseLike<Result> {
  private op: { kind: "update" | "insert" | "upsert" | "delete"; payload?: any; conflict?: string } | null = null;
  private filters: Array<(r: Row) => boolean> = [];
  private orders: Array<{ col: string; asc: boolean }> = [];
  private lim: number | null = null;
  private lo = 0;
  private hi: number | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  private head = false;
  private wantCount = false;
  constructor(private table: string) {}

  select(_cols?: string, opts?: { count?: string; head?: boolean }) {
    if (opts?.count) this.wantCount = true;
    if (opts?.head) this.head = true;
    return this;
  }
  private f(fn: (r: Row) => boolean) { this.filters.push(fn); return this; }
  eq(c: string, v: any) { return this.f((r) => get(r, c) === v); }
  neq(c: string, v: any) { return this.f((r) => get(r, c) !== v); }
  in(c: string, vs: any[]) { return this.f((r) => (vs || []).includes(get(r, c))); }
  is(c: string, v: any) { return this.f((r) => get(r, c) === v); }
  gte(c: string, v: any) { return this.f((r) => get(r, c) !== null && get(r, c) >= v); }
  lte(c: string, v: any) { return this.f((r) => get(r, c) !== null && get(r, c) <= v); }
  gt(c: string, v: any) { return this.f((r) => get(r, c) !== null && get(r, c) > v); }
  lt(c: string, v: any) { return this.f((r) => get(r, c) !== null && get(r, c) < v); }
  not(c: string, op: string, v: any) {
    return this.f((r) => (op === "is" || op === "eq" ? get(r, c) !== v : true));
  }
  or(_expr: string) { return this; }
  filter(_c: string, _op: string, _v: any) { return this; }
  match(obj: Row) { return this.f((r) => Object.entries(obj).every(([k, v]) => get(r, k) === v)); }
  order(col: string, o?: { ascending?: boolean }) { this.orders.push({ col, asc: o?.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  range(a: number, b: number) { this.lo = a; this.hi = b; return this; }
  maybeSingle() { this.mode = "maybe"; return this; }
  single() { this.mode = "single"; return this; }
  insert(payload?: any) { this.op = { kind: "insert", payload }; return this; }
  update(payload?: any) { this.op = { kind: "update", payload }; return this; }
  upsert(payload?: any, opts?: { onConflict?: string }) { this.op = { kind: "upsert", payload, conflict: opts?.onConflict }; return this; }
  delete() { this.op = { kind: "delete" }; return this; }

  private run(): Result {
    const state = getState();
    const db = buildDb();
    if (state === "error" && (db.errorOn.includes(this.table) || (this.head && db.errorOn.includes(this.table + "#head")))) return { data: null, error: { message: "offline" } };
    const source = state === "empty" && db.emptyOn.includes(this.table) ? [] : withWrites(this.table, db.tables[this.table] ?? []);
    if (this.op) {
      const op = this.op;
      let touched: Row[] = [];
      if (op.kind === "update") {
        touched = (copy(source) as Row[]).filter((r) => this.filters.every((fn) => fn(r)));
        for (const r of touched) patchRow(this.table, r.id, op.payload ?? {});
      } else if (op.kind === "delete") {
        touched = (copy(source) as Row[]).filter((r) => this.filters.every((fn) => fn(r)));
        for (const r of touched) (writes.gone[this.table] ??= new Set()).add(r.id);
      } else {
        const list = Array.isArray(op.payload) ? op.payload : [op.payload ?? {}];
        for (const item of list) {
          const key = op.conflict && op.kind === "upsert" ? source.find((r) => get(r, op.conflict!) === item[op.conflict!]) : null;
          if (key) { patchRow(this.table, key.id, item); touched.push({ ...key, ...item }); }
          else { const row = { id: item.id ?? `new-${nextId++}`, ...item }; (writes.added[this.table] ??= []).push(row); touched.push(row); }
        }
      }
      if (this.mode === "many") return { data: touched, error: null, count: null };
      return touched.length === 1 ? { data: touched[0], error: null } : { data: null, error: { message: "no single row", code: "PGRST116" } };
    }
    let rows = copy(source) as Row[];
    rows = rows.filter((r) => this.filters.every((fn) => fn(r)));
    for (const { col, asc } of [...this.orders].reverse()) {
      rows.sort((a, b) => {
        const x = get(a, col), y = get(b, col);
        return (x === y ? 0 : x === null ? 1 : y === null ? -1 : x < y ? -1 : 1) * (asc ? 1 : -1);
      });
    }
    const total = rows.length;
    if (this.hi !== null) rows = rows.slice(this.lo, this.hi + 1);
    if (this.lim !== null) rows = rows.slice(0, this.lim);
    const count = this.wantCount ? total : null;
    if (this.head) return { data: null, error: null, count };
    if (this.mode === "many") return { data: rows, error: null, count };
    if (this.mode === "maybe") return { data: rows.length === 1 ? rows[0] : null, error: null, count };
    return rows.length === 1
      ? { data: rows[0], error: null, count }
      : { data: null, error: { message: "no single row", code: "PGRST116" }, count };
  }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: any) => B | PromiseLike<B>) | null) {
    // a write takes a moment, as a real save does (the screens show a pending state first)
    const wait = this.op ? 250 : 0;
    return new Promise<void>((r) => setTimeout(r, wait)).then(() => this.run()).then(ok, bad);
  }
}

const rpc = (name: string, args: Row = {}): PromiseLike<Result> => {
  const db = buildDb();
  let out: Result = { data: null, error: null };
  if (name === "get_student_homeworks") {
    const state = getState();
    out = state === "error"
      ? { data: null, error: { message: "offline" } }
      : { data: copy(state === "empty" ? { homeworks: [], submissions: [] } : db.homeworkRpc), error: null };
  } else if (name === "student_points_summary") {
    const ids: string[] = args.p_students || [];
    const data: Row = {};
    for (const id of ids) if (db.points[id]) data[id] = copy(db.points[id]);
    out = { data, error: null };
  }
  // Phase 3 preview: an approval changes what the screens read next.
  if (name === "approve_video_feedback" && getState() !== "error") {
    patchRow("video_submissions", args.p_video_submission, { status: "approved" });
    patchRow("video_analyses", "va-1", { approved_at: new Date().toISOString(), final_grade: args.p_grade, final_feedback_student: args.p_feedback_student, final_feedback_parent: args.p_feedback_parent, final_gaps: args.p_gaps });
  }
  // Admin screens: a few rpcs answer with made-up data (adminFixtures.ts).
  const custom = db.rpcs[name];
  if (custom) out = { data: copy(custom(args)), error: null };
  // a write takes a moment, as a real save does
  return new Promise<Result>((r) => setTimeout(() => r(out), /^(approve|award)_/.test(name) ? 250 : 0));
};

const user = {
  id: ME.userId,
  email: "preview@example.invalid",
  app_metadata: {},
  user_metadata: { full_name: ME.name },
  aud: "authenticated",
  created_at: "2026-01-01T00:00:00Z",
};
const session = { access_token: "fake", refresh_token: "fake", expires_in: 3600, token_type: "bearer", user };

const channel = () => {
  const ch: any = { on: () => ch, subscribe: () => ch, unsubscribe: () => Promise.resolve("ok"), send: () => Promise.resolve("ok") };
  return ch;
};

export const supabase: any = {
  from: (t: string) => new Query(t),
  rpc,
  functions: {
    // A function the preview knows (adminFixtures.ts) answers with made-up data; any other answers nothing.
    invoke: async (name: string, opts?: { body?: any }) => {
      // Smart Upload preview: the reading takes a few seconds, so a job can be seen running.
      if (name === "ocr-student-work") {
        await new Promise((r) => setTimeout(r, 5000));
        patchRow("student_work", opts?.body?.work_id, { status: "needs_review" });
        return { data: { success: true, detected_student_name: "Nguyễn Minh Anh", match_confidence: 0.92 }, error: null };
      }
      if (name === "ocr-vocab-scan" && opts?.body?.approve) {
        patchRow("student_work", opts.body.work_id, { status: "approved" });
        return { data: { success: true, points_awarded: 6, entry_ids: (opts.body.words || []).map((_: string, i: number) => `e${i}`) }, error: null };
      }
      const fn = buildDb().functions[name];
      return Promise.resolve(fn ? copy(fn(opts?.body)) : { data: null, error: null });
    },
  },
  auth: {
    getSession: () => Promise.resolve({ data: { session }, error: null }),
    getUser: () => Promise.resolve({ data: { user }, error: null }),
    onAuthStateChange: (cb: any) => {
      setTimeout(() => cb("INITIAL_SESSION", session), 0);
      return { data: { subscription: { unsubscribe() {} } } };
    },
    signOut: () => Promise.resolve({ error: null }),
    refreshSession: () => Promise.resolve({ data: { session }, error: null }),
  },
  storage: {
    from: () => ({
      getPublicUrl: (p: string) => ({ data: { publicUrl: `about:blank#${p}` } }),
      createSignedUrl: (p: string) => Promise.resolve({ data: { signedUrl: `about:blank#${p}` }, error: null }),
      createSignedUrls: () => Promise.resolve({ data: [], error: null }),
      list: () => Promise.resolve({ data: [], error: null }),
    }),
  },
  channel,
  removeChannel: () => Promise.resolve("ok"),
  getChannels: () => [],
};
export default supabase;
