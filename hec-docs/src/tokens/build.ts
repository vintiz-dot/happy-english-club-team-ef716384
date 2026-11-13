// `npm run tokens`: writes dist/tokens/<tenant>.css for inspection and for
// other consumers (the web app could import the same palette). Rendering
// compiles tokens in memory, so this file is not needed at runtime.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ROOT } from "../config.ts";
import { listTenants, loadTenant } from "../tenant.ts";
import { toCssVariables } from "./compile.ts";

const out = path.join(ROOT, "dist", "tokens");
await mkdir(out, { recursive: true });
for (const id of await listTenants()) {
  const t = await loadTenant(id);
  await writeFile(path.join(out, `${id}.css`), toCssVariables(t.tokens));
  console.log(`tokens: ${id} -> dist/tokens/${id}.css`);
}
