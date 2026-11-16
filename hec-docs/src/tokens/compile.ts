// W3C Design Tokens (DTCG) -> CSS custom properties.
// Supports $value / $type / $description, group-level $type inheritance and
// {alias.references}. Tenants deep-merge overrides before compiling.

export type TokenTree = { [k: string]: unknown };

export interface FlatToken {
  path: string[];
  type: string | undefined;
  value: unknown;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function mergeTokens(base: TokenTree, override: TokenTree | undefined): TokenTree {
  if (!override) return base;
  const out: TokenTree = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const b = out[k];
    if (isObj(b) && isObj(v) && !("$value" in v)) out[k] = mergeTokens(b, v);
    else if (isObj(b) && isObj(v) && "$value" in v) out[k] = { ...b, ...v };
    else out[k] = v;
  }
  return out;
}

export function flatten(tree: TokenTree, path: string[] = [], inheritedType?: string): FlatToken[] {
  const type = (tree.$type as string | undefined) ?? inheritedType;
  if ("$value" in tree) return [{ path, type, value: tree.$value }];
  const out: FlatToken[] = [];
  for (const [k, v] of Object.entries(tree)) {
    if (k.startsWith("$") || !isObj(v)) continue;
    out.push(...flatten(v, [...path, k], type));
  }
  return out;
}

const SAFE_VALUE = /^[#()%.,\w\s'"-]+$/;

function cssValue(t: FlatToken, lookup: Map<string, FlatToken>, depth = 0): string {
  let v = t.value;
  if (typeof v === "string" && /^\{[^}]+\}$/.test(v)) {
    if (depth > 8) throw new Error(`Token alias loop at ${t.path.join(".")}`);
    const ref = lookup.get(v.slice(1, -1));
    if (!ref) throw new Error(`Unknown token reference ${v} at ${t.path.join(".")}`);
    return cssValue(ref, lookup, depth + 1);
  }
  if (t.type === "fontFamily" && Array.isArray(v)) {
    v = v.map((f) => (/^[a-z-]+$/.test(String(f)) ? String(f) : `"${String(f)}"`)).join(", ");
  }
  const s = String(v);
  // Tokens may come from a tenant file; refuse anything that could break out
  // of the declaration (braces, semicolons, url(), backslashes, <).
  if (!SAFE_VALUE.test(s) || /url\s*\(/i.test(s)) {
    throw new Error(`Token ${t.path.join(".")} has a disallowed value: ${s}`);
  }
  return s;
}

/** Flat map: "color-ink" -> "#14213D". Validated, safe to inline in CSS. */
export function toVars(tree: TokenTree): Record<string, string> {
  const flat = flatten(tree);
  const lookup = new Map(flat.map((t) => [t.path.join("."), t]));
  return Object.fromEntries(flat.map((t) => [t.path.join("-"), cssValue(t, lookup)]));
}

export function toCssVariables(tree: TokenTree, selector = ":root"): string {
  const lines = Object.entries(toVars(tree)).map(([k, v]) => `  --${k}: ${v};`);
  return `${selector} {\n${lines.join("\n")}\n}\n`;
}
