// In-memory stand-in for the Supabase client. Made-up data only.
import { buildDb, getState, ME } from "./fixtures";

type Row = Record<string, any>;
type Result = { data: any; error: any; count?: number | null };

const copy = <T,>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const get = (row: Row, col: string) => {
  const v = col.split(".").reduce((o: any, k) => (o == null ? o : o[k]), row);
  return v === undefined ? null : v;
};

class Query implements PromiseLike<Result> {
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
  insert() { return this; }
  update() { return this; }
  upsert() { return this; }
  delete() { return this; }

  private run(): Result {
    const state = getState();
    const db = buildDb();
    if (state === "error" && db.errorOn.includes(this.table)) return { data: null, error: { message: "offline" } };
    const source = state === "empty" && db.emptyOn.includes(this.table) ? [] : db.tables[this.table] ?? [];
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
    return Promise.resolve().then(() => this.run()).then(ok, bad);
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
  return Promise.resolve(out);
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
  functions: { invoke: () => Promise.resolve({ data: null, error: null }) },
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
