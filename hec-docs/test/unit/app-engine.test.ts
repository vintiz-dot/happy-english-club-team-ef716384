// The web app's engine bundle (../src/lib/hecDocs/engine.generated.js) must
// render exactly what this service renders, for every fixture. The only
// allowed difference is where fonts, styles and the logo are loaded from.
// If this fails after a template change, run `npm run build:app`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "../../src/config.ts";
import { renderHtml } from "../../src/render/render.ts";
import { getRegistry } from "../../src/templates/registry.ts";
import { sanitizeRich } from "../../src/format.ts";

const ENGINE = path.resolve(ROOT, "..", "src", "lib", "hecDocs", "engine.generated.js");
const engine = (await import(pathToFileURL(ENGINE).href)) as {
  prepare: (type: string, data: unknown, o: { sanitiseRich: (h: string) => string; variant?: string; generatedAt?: string }) => Promise<{ html: string; filename: string; meta: { title: string } }>;
  TYPES: string[];
};

test("the app engine knows every template type", async () => {
  assert.deepEqual([...engine.TYPES].sort(), [...(await getRegistry()).keys()].sort());
});

for (const [type, e] of await getRegistry()) {
  for (const f of (await readdir(path.join(e.dir, "fixtures"))).filter((x) => x.endsWith(".json")).sort()) {
    test(`app engine == service: ${type}/${f}`, async () => {
      const fx = JSON.parse(await readFile(path.join(e.dir, "fixtures", f), "utf8"));
      const req = { data: fx.data, variant: fx.variant, generatedAt: fx.generatedAt };
      const svc = await renderHtml({ type, ...req });
      const app = await engine.prepare(type, structuredClone(fx.data), { sanitiseRich: sanitizeRich, variant: fx.variant, generatedAt: fx.generatedAt });
      assert.equal(app.html.replaceAll("/hec-docs/", "/"), svc.html, "HTML differs (rebuild with npm run build:app?)");
      assert.equal(app.meta.title, svc.title);
    });
  }
}
