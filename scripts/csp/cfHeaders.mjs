// Cloudflare Pages `_headers`, as documented (developers.cloudflare.com/pages/configuration/headers):
// blocks of "<url pattern>" then indented "Name: value" lines; "! Name" detaches what an EARLIER
// matching rule attached; rules apply in file order; a header attached twice is joined with ", ".
// One splat (*) per pattern, :placeholders match up to the next "/". Used by
// scripts/pgtest/csp-headers.test.mjs and by the browser harness that serves dist/ (docs/evidence/CSP.md).

export function parseHeaders(text) {
  const rules = [];
  let cur = null;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      cur = { pattern: raw.trim(), ops: [] };
      rules.push(cur);
      continue;
    }
    if (!cur) throw new Error(`header line before any URL pattern: ${raw}`);
    const line = raw.trim();
    if (line.startsWith("! ")) cur.ops.push({ detach: line.slice(2).trim().toLowerCase() });
    else {
      const i = line.indexOf(":");
      if (i < 1) throw new Error(`not a header line: ${raw}`);
      cur.ops.push({ name: line.slice(0, i).trim(), value: line.slice(i + 1).trim() });
    }
  }
  return rules;
}

function matcher(pattern) {
  const path = pattern.replace(/^https?:\/\/[^/]+/, "");
  let re = "";
  for (let i = 0; i < path.length; i++) {
    const c = path[i];
    if (c === "*") re += ".*";
    else if (c === ":" && /[A-Za-z]/.test(path[i + 1] || "")) {
      const m = /^:[A-Za-z]\w*/.exec(path.slice(i));
      re += "[^/]+";
      i += m[0].length - 1;
    } else re += c.replace(/[.+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

/** The headers Cloudflare would attach to a response for `pathname`, as {lowercased name: value}. */
export function headersFor(rules, pathname) {
  const out = new Map();
  for (const r of rules) {
    if (!matcher(r.pattern).test(pathname)) continue;
    for (const op of r.ops) {
      if (op.detach) out.delete(op.detach);
      else {
        const k = op.name.toLowerCase();
        out.set(k, out.has(k) ? `${out.get(k)}, ${op.value}` : op.value);
      }
    }
  }
  return Object.fromEntries(out);
}

/** "a b; c d" -> {a: ["b"], c: ["d"]} */
export function parsePolicy(value) {
  const d = {};
  for (const part of value.split(";")) {
    const [name, ...src] = part.trim().split(/\s+/);
    if (name) d[name.toLowerCase()] = src;
  }
  return d;
}
