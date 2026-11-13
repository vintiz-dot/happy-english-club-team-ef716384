// A supabase-js look-alike that turns the call chains the recorder (and the
// retention function) make into plain operations, handed to a transport:
//
//   transport({ op, ... }) -> Promise<{ data, error }>
//
// In Node the transport is the fake server's handle(); in the browser harness
// it is a fetch() to the harness HTTP server. Plain JS: it runs in both.
// It implements ONLY the shapes used, so an unexpected call fails loudly.

const b64 = {
  enc(bytes) {
    if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
    let s = ""; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  },
  dec(s) {
    if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(s, "base64"));
    const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out;
  },
};
export { b64 };

async function toBytes(body) {
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (body && typeof body.arrayBuffer === "function") return new Uint8Array(await body.arrayBuffer());
  throw new Error("fake storage: unsupported body");
}

class Query {
  constructor(transport, table) { this.t = transport; this.q = { op: "select", table, filters: [], columns: "*", single: null, returning: false }; }
  select(columns = "*") { if (this.q.op === "select") this.q.columns = columns; else { this.q.returning = true; this.q.columns = columns; } return this; }
  insert(row) { this.q.op = "insert"; this.q.row = row; return this; }
  update(patch) { this.q.op = "update"; this.q.patch = patch; return this; }
  upsert(row, opts = {}) { this.q.op = "upsert"; this.q.row = row; this.q.onConflict = opts.onConflict ?? null; return this; }
  delete() { this.q.op = "delete"; return this; }
  eq(col, val) { this.q.filters.push([col, val]); return this; }
  in(col, vals) { this.q.filters.push([col, { in: vals }]); return this; }
  single() { this.q.single = "single"; return this; }
  maybeSingle() { this.q.single = "maybe"; return this; }
  then(ok, no) { return this.t(this.q).then(ok, no); }
}

export function makeClient(transport) {
  const client = {
    refreshed: 0,
    rpc: (fn, args = {}) => transport({ op: "rpc", fn, args }),
    from: (table) => new Query(transport, table),
    auth: {
      getUser: (token) => transport({ op: "getUser", token }),
      // supabase-js refreshes an expired session; the fake only counts the calls.
      refreshSession: async () => { client.refreshed += 1; return { data: { session: {} }, error: null }; },
    },
    storage: {
      from: (bucket) => ({
        async upload(path, body, opts = {}) {
          const bytes = await toBytes(body);
          return transport({ op: "upload", bucket, path, bytes: b64.enc(bytes), contentType: opts.contentType ?? body?.type ?? null, upsert: !!opts.upsert });
        },
        async download(path) {
          const r = await transport({ op: "download", bucket, path });
          if (r.error) return { data: null, error: r.error };
          const bytes = b64.dec(r.data);
          return { data: new Blob([bytes]), error: null };
        },
        list: (prefix, opts = {}) => transport({ op: "list", bucket, prefix, limit: opts.limit ?? 100, offset: opts.offset ?? 0 }),
        remove: (paths) => transport({ op: "remove", bucket, paths }),
      }),
    },
  };
  return client;
}

/** Browser transport: POST to the harness, which holds the fake server. */
export function httpTransport(base, getUser) {
  return async (q) => {
    const res = await fetch(`${base}/fake`, { method: "POST", headers: { "content-type": "application/json", "x-user": getUser() ?? "" }, body: JSON.stringify(q) });
    if (!res.ok) throw new TypeError(`Failed to fetch (${res.status})`);
    return res.json();
  };
}
