// Shared harness for the S2 edge-function suite: bundle a REAL function
// (remote imports stubbed, its ../_lib imports real), capture its handler,
// and drive it with requests against an in-memory stand-in for Supabase.
//
// The stand-in is small on purpose: tables are arrays of rows; eq / in / is
// filter, everything else (order, gte, ...) is accepted and ignored; every
// read, write, rpc, auth and storage call is logged so a suite can show that
// a refused request touched nothing.
import { build } from "esbuild";
import { writeFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

export const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const FUNCTIONS = resolve(repo, "supabase", "functions");
export const SERVICE_KEY = "test-service-role-key";
export const ANON_KEY = "test-anon-key";
export const tokenOf = (u) => `jwt-${u}`;

export const world = {
  tables: {},          // name -> rows
  users: {},           // uid -> { id, email, password? }
  rpc: {},             // name -> (args, client) => data
  log: [],             // everything asked of Supabase
  vendor: [],          // every fetch
  fetchAnswer: null,   // (url, init) => Response
};
export function reset(tables = {}) {
  world.tables = JSON.parse(JSON.stringify(tables));
  world.log = []; world.vendor = [];
}
const uidOfToken = (t) => Object.keys(world.users).find((u) => tokenOf(u) === t) ?? null;

function client(key, opts = {}) {
  const who = key === SERVICE_KEY ? "service" : "anon";
  const bound = opts?.global?.headers?.Authorization?.replace(/^Bearer\s+/i, "") ?? null;
  const from = (table) => {
    const st = { table, op: "select", eq: [], in: [], is: [], payload: null, single: false, maybe: false, returning: false, limit: null };
    const rows = () => (world.tables[table] ??= []);
    const match = (r) => st.eq.every(([c, v]) => r[c] === v) && st.in.every(([c, vs]) => vs.includes(r[c])) && st.is.every(([c, v]) => (r[c] ?? null) === v);
    const exec = () => {
      world.log.push({ client: who, table, op: st.op, eq: st.eq.slice() });
      let data;
      if (st.op === "select") data = rows().filter(match);
      else if (st.op === "insert" || st.op === "upsert") {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: p.id ?? `row-${rows().length + 1}`, ...p }));
        if (table === "admin_passkeys" && list.some((p) => rows().some((r) => r.credential_id === p.credential_id))) return { data: null, error: { code: "23505", message: "duplicate" } };
        rows().push(...list); data = list;
      } else if (st.op === "update") { data = rows().filter(match); for (const r of data) Object.assign(r, st.payload); }
      else if (st.op === "delete") { data = rows().filter(match); world.tables[table] = rows().filter((r) => !match(r)); }
      if (st.limit !== null) data = data.slice(0, st.limit);
      if (st.single || st.maybe) {
        // PostgREST: .single() and .maybeSingle() both error on more than one row.
        if (data.length > 1) return { data: null, error: { message: "multiple rows", code: "PGRST116" } };
        if (data.length === 0) return st.single ? { data: null, error: { message: "no rows", code: "PGRST116" } } : { data: null, error: null };
        return { data: data[0], error: null };
      }
      return { data: st.op === "select" || st.returning ? data : null, error: null };
    };
    const b = new Proxy({}, {
      get(_t, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve().then(exec).then(res, rej);
        return (...a) => {
          if (prop === "eq") st.eq.push([a[0], a[1]]);
          else if (prop === "in") st.in.push([a[0], a[1]]);
          else if (prop === "is") st.is.push([a[0], a[1]]);
          else if (prop === "limit") st.limit = a[0];
          else if (["insert", "upsert", "update", "delete"].includes(prop)) { st.op = prop; st.payload = a[0]; }
          else if (prop === "select" && st.op !== "select") st.returning = true;
          else if (prop === "single") st.single = true;
          else if (prop === "maybeSingle") st.maybe = true;
          return b;
        };
      },
    });
    return b;
  };
  return {
    from,
    rpc: async (name, args) => {
      world.log.push({ client: who, rpc: name, args });
      const f = world.rpc[name];
      return f ? { data: await f(args), error: null } : { data: null, error: { message: `no rpc ${name}` } };
    },
    storage: {
      from: (bucket) => ({
        download: async (p) => { world.log.push({ storage: "download", bucket, p }); return { data: new Blob([new Uint8Array([1, 2, 3])]), error: null }; },
        upload: async (p, _b, o) => { world.log.push({ storage: "upload", bucket, p, contentType: o?.contentType }); return { data: { path: p }, error: null }; },
        move: async (a, c) => { world.log.push({ storage: "move", bucket, a, c }); return { data: {}, error: null }; },
        remove: async (p) => { world.log.push({ storage: "remove", bucket, p }); return { data: [], error: null }; },
        createSignedUrl: async (p) => ({ data: { signedUrl: `https://signed/${p}` }, error: null }),
        getPublicUrl: (p) => ({ data: { publicUrl: `https://public/${p}` } }),
      }),
    },
    auth: {
      getUser: async (token) => {
        world.log.push({ client: who, auth: "getUser" });
        const uid = uidOfToken(token ?? bound);
        return uid ? { data: { user: { id: uid, email: world.users[uid].email, user_metadata: world.users[uid].meta ?? {} } }, error: null }
          : { data: { user: null }, error: { message: "invalid JWT" } };
      },
      signInWithPassword: async ({ email, password }) => {
        world.log.push({ client: who, auth: "signInWithPassword", email });
        const u = Object.values(world.users).find((x) => x.email === email && x.password === password);
        return u ? { data: { session: { access_token: tokenOf(u.id) } }, error: null } : { data: { session: null }, error: { message: "bad credentials" } };
      },
      admin: {
        updateUserById: async (id, attrs) => { world.log.push({ auth: "updateUserById", id }); if (attrs.password) world.users[id].password = attrs.password; return { data: {}, error: null }; },
        signOut: async (jwt, scope) => {
          world.log.push({ auth: "admin.signOut", jwt, scope });
          return uidOfToken(jwt) ? { data: null, error: null } : { data: null, error: { message: "invalid JWT" } };
        },
        createUser: async (a) => { const id = `new-${Object.keys(world.users).length}`; world.users[id] = { id, email: a.email, password: a.password }; world.log.push({ auth: "createUser", password: a.password }); return { data: { user: { id } }, error: null }; },
      },
    },
  };
}

const env = {
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY,
  OPENAI_API_KEY: "k-openai", azure_key: "k-azure", AZURE_SPEECH_REGION: "southeastasia", GOOGLE_CLOUD_VISION_API_KEY: "k-vision",
};
let captured = null;
globalThis.__fakeCreateClient = (_url, key, opts) => client(key, opts);
globalThis.__capture = (h) => { captured = h; };
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
globalThis.fetch = async (url, init = {}) => {
  world.vendor.push({ url: String(url), body: typeof init.body === "string" ? init.body : null });
  if (world.fetchAnswer) return world.fetchAnswer(String(url), init);
  return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }], responses: [{ fullTextAnnotation: { text: "" } }] }), { status: 200, headers: { "content-type": "application/json" } });
};

let seq = 0;
export async function load(name, source) {
  const out = await build({
    stdin: { contents: source, resolveDir: resolve(FUNCTIONS, name), sourcefile: "index.ts", loader: "ts" },
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{
      name: "remote-imports",
      setup(b) {
        b.onResolve({ filter: /^(https?:\/\/|npm:|jsr:)/ }, (args) => ({ path: args.path, namespace: "remote" }));
        b.onLoad({ filter: /.*/, namespace: "remote" }, (args) => ({
          loader: "js",
          contents: args.path.includes("zod")
            ? `const any = () => new Proxy(function () {}, { get: (_t, p) => p === "parse" ? (v) => v : p === "safeParse" ? (v) => ({ success: true, data: v }) : any(), apply: () => any() });
               export const z = any(); export default z;`
            : args.path.startsWith("npm:microsoft-cognitiveservices-speech-sdk")
              ? `const spend = () => { throw new Error("sdk stub"); }; export const SpeechConfig = { fromSubscription: spend }; export function SpeechSynthesizer() { spend(); }
                 export const PropertyId = {}; export const ResultReason = {}; export const SpeechSynthesisOutputFormat = {};`
              : `export const createClient = (...a) => globalThis.__fakeCreateClient(...a); export const serve = (h) => globalThis.__capture(h); export default {};`,
        }));
      },
    }],
  });
  const p = resolve(tmpdir(), `s2-fn.${name}.${process.pid}.${seq++}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}

const quiet = { log: console.log, warn: console.warn, error: console.error };
export async function call(handler, name, { token, body, headers: extra = {}, form = null, origin = "https://app.example" } = {}) {
  world.log = []; world.vendor = [];
  const headers = { origin, ...extra };
  if (!form) headers["content-type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request(`https://example.supabase.co/functions/v1/${name}`, { method: "POST", headers, body: form ?? JSON.stringify(body ?? {}) }));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  } finally { Object.assign(console, quiet); }
}
export const wrote = (table) => world.log.some((e) => e.table === table && e.op !== "select");
export const read = (table) => world.log.some((e) => e.table === table && e.op === "select");
