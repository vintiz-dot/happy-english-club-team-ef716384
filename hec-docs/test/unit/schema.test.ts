import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { renderHtml } from "../../src/render/render.ts";
import { SchemaError, type FieldError } from "../../src/schema.ts";
import { getRegistry } from "../../src/templates/registry.ts";

async function fieldErrors(p: Promise<unknown>): Promise<FieldError[]> {
  try {
    await p;
  } catch (e) {
    assert.ok(e instanceof SchemaError, String(e));
    return e.errors;
  }
  return assert.fail("expected a SchemaError");
}

const minimalHomework = { homework: { id: "x", title: "t" }, className: "", teacherName: "" };

test("unknown type is a field-level error on /type", async () => {
  const errs = await fieldErrors(renderHtml({ type: "nope", data: {} }));
  assert.equal(errs[0].path, "/type");
});

test("homework: missing, mistyped and unknown fields are reported by JSON pointer", async () => {
  const errs = await fieldErrors(renderHtml({ type: "homework", data: { homework: { id: "x", title: 5 }, teacherName: "", extra: 1 } }));
  const paths = errs.map((e) => e.path);
  assert.ok(paths.includes("/homework/title"), JSON.stringify(errs));
  assert.ok(paths.includes("/className"));
  assert.ok(paths.includes("/extra"));
});

test("an unknown variant is refused with the allowed list", async () => {
  const errs = await fieldErrors(renderHtml({ type: "homework", variant: "fancy", data: minimalHomework }));
  assert.equal(errs[0].path, "/variant");
  assert.match(errs[0].message, /standard/);
});

test("generatedAt must be a date-time", async () => {
  const errs = await fieldErrors(renderHtml({ type: "homework", generatedAt: "yesterday", data: minimalHomework }));
  assert.equal(errs[0].path, "/generatedAt");
});

test("tenant: unknown ids and path-like ids are refused as field errors", async () => {
  assert.equal((await fieldErrors(renderHtml({ type: "homework", tenant: "acme", data: minimalHomework })))[0].path, "/tenant");
  assert.equal((await fieldErrors(renderHtml({ type: "homework", tenant: "../hec", data: minimalHomework })))[0].path, "/tenant");
});

test("every template: semver, schema $id carries the version, fixtures validate and cover every variant", async () => {
  for (const [type, e] of await getRegistry()) {
    const schema = JSON.parse(await readFile(path.join(e.dir, "schema.json"), "utf8"));
    assert.equal(schema.$id, `https://hec-docs.invalid/schemas/${type}/${e.manifest.version}`, `${type} schema $id`);
    const fx = (await readdir(path.join(e.dir, "fixtures"))).filter((f) => f.endsWith(".json"));
    const seen = new Set<string>();
    for (const f of fx) {
      const env = JSON.parse(await readFile(path.join(e.dir, "fixtures", f), "utf8"));
      const { variant } = await renderHtml({ type, data: env.data, variant: env.variant, tenant: env.tenant, generatedAt: env.generatedAt });
      seen.add(variant);
    }
    for (const v of Object.keys(e.manifest.variants)) assert.ok(seen.has(v), `${type}: no fixture for variant ${v}`);
  }
});
