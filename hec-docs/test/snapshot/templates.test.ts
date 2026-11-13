// Snapshot tests: the HTML each fixture renders to (no browser involved).
// A template change shows up as a reviewable diff of test/snapshot/__snapshots__.
// Update deliberately with: UPDATE_SNAPSHOTS=1 npm run test:snapshot
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderHtml } from "../../src/render/render.ts";
import { getRegistry } from "../../src/templates/registry.ts";

const SNAP = path.join(path.dirname(fileURLToPath(import.meta.url)), "__snapshots__");
const update = process.env.UPDATE_SNAPSHOTS === "1";

for (const [type, entry] of await getRegistry()) {
  const dir = path.join(entry.dir, "fixtures");
  for (const f of (await readdir(dir)).filter((x) => x.endsWith(".json")).sort()) {
    test(`${type}/${f} renders the snapshotted HTML`, async () => {
      const env = JSON.parse(await readFile(path.join(dir, f), "utf8"));
      const { html } = await renderHtml({ type, data: env.data, variant: env.variant, tenant: env.tenant, generatedAt: env.generatedAt });
      // Normalise line endings so Windows and Linux agree.
      const got = html.replace(/\r\n/g, "\n");
      const file = path.join(SNAP, type, f.replace(/\.json$/, ".html"));
      if (update || !existsSync(file)) {
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(file, got);
        if (!update) assert.fail(`snapshot created: ${path.relative(process.cwd(), file)} (commit it, then re-run)`);
        return;
      }
      const want = (await readFile(file, "utf8")).replace(/\r\n/g, "\n");
      assert.equal(got, want, `${type}/${f}: HTML changed; review and run UPDATE_SNAPSHOTS=1 if intended`);
    });
  }
}
