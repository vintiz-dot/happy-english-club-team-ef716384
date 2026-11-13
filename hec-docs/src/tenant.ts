// Tenants are config, not code: tenants/<id>/theme.json + an assets folder.
// A second brand is a new folder; nothing in templates names HEC.
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { config, ROOT } from "./config.ts";
import { mergeTokens, toCssVariables, toVars, type TokenTree } from "./tokens/compile.ts";
import { validatorFor, SchemaError } from "./schema.ts";

export interface Tenant {
  id: string;
  name: string;
  subtitle?: string;
  locale: string;
  timeZone: string;
  logo: { file: string; alt: string };
  tagline: string;
  footer: string;
  qr: { target: string; label: string };
  signOff: { name: string; role: string; closing: string; closingVi?: string };
  encouragement: string[];
  reassurance: Record<string, string>;
  tokens: TokenTree;
  /** Absolute path of the tenant folder. */
  dir: string;
  /** Compiled CSS custom properties for this tenant. */
  css: string;
  /** Token values by name, for places var() cannot reach (@page margin boxes). */
  vars: Record<string, string>;
}

const cache = new Map<string, Promise<Tenant>>();
const TENANT_ID = /^[a-z][a-z0-9-]{0,39}$/;

export async function listTenants(): Promise<string[]> {
  const entries = await readdir(config.tenantsDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory() && TENANT_ID.test(e.name)).map((e) => e.name).sort();
}

export function loadTenant(id: string): Promise<Tenant> {
  if (!TENANT_ID.test(id)) return Promise.reject(new SchemaError("tenant", [{ path: "/tenant", message: `unknown tenant "${id}"` }]));
  let p = cache.get(id);
  if (!p) {
    p = (async () => {
      const dir = path.join(config.tenantsDir, id);
      let raw: string;
      try {
        raw = await readFile(path.join(dir, "theme.json"), "utf8");
      } catch {
        throw new SchemaError("tenant", [{ path: "/tenant", message: `unknown tenant "${id}"` }]);
      }
      const theme = JSON.parse(raw) as Omit<Tenant, "dir" | "css" | "vars">;
      const validate = await validatorFor(path.join(ROOT, "schemas", "tenant.schema.json"));
      validate(theme, "tenant");
      if (theme.id !== id) throw new Error(`tenants/${id}/theme.json has id "${theme.id}"`);
      const logoPath = path.resolve(dir, theme.logo.file);
      if (!logoPath.startsWith(dir + path.sep)) throw new Error(`tenant ${id}: logo must live inside the tenant folder`);
      await stat(logoPath);
      const base = JSON.parse(await readFile(path.join(ROOT, "tokens", "base.tokens.json"), "utf8")) as TokenTree;
      const tokens = mergeTokens(base, theme.tokens);
      return { ...theme, tokens, dir, css: toCssVariables(tokens), vars: toVars(tokens) };
    })();
    cache.set(id, p);
    p.catch(() => cache.delete(id));
  }
  return p;
}
