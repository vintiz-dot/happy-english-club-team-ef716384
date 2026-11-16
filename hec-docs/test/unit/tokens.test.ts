import { test } from "node:test";
import assert from "node:assert/strict";
import { flatten, mergeTokens, toCssVariables, toVars } from "../../src/tokens/compile.ts";
import { loadTenant } from "../../src/tenant.ts";

function lum(hex: string): number {
  const c = hex
    .replace("#", "")
    .match(/../g)!
    .map((x) => parseInt(x, 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

test("tokens compile to CSS variables, with aliases and group $type", () => {
  const tree = { color: { $type: "color", a: { $value: "#112233" }, b: { $value: "{color.a}" } } };
  assert.deepEqual(toVars(tree), { "color-a": "#112233", "color-b": "#112233" });
  assert.match(toCssVariables(tree), /--color-b: #112233;/);
  assert.equal(flatten(tree)[0].type, "color");
});

test("tenant overrides merge leaf by leaf", () => {
  const merged = mergeTokens({ color: { a: { $value: "#000000" }, b: { $value: "#111111" } } }, { color: { b: { $value: "#222222" } } });
  assert.deepEqual(toVars(merged), { "color-a": "#000000", "color-b": "#222222" });
});

test("token values that could break out of CSS are refused", () => {
  for (const bad of ["red; } body { display:none", "url(https://evil)", "#fff</style>", "a\\b"]) {
    assert.throws(() => toVars({ x: { $value: bad } }), /disallowed value/);
  }
  assert.throws(() => toVars({ x: { $value: "{nope}" } }), /Unknown token reference/);
});

test("text colours meet WCAG AA on paper and surface (HEC tenant)", async () => {
  const v = (await loadTenant("hec")).vars;
  for (const bg of ["color-paper", "color-surface"]) {
    for (const fg of ["color-ink", "color-ink-soft", "color-muted", "color-gold-ink", "color-positive", "color-negative"]) {
      const r = contrast(v[fg], v[bg]);
      assert.ok(r >= 4.5, `${fg} on ${bg} is ${r.toFixed(2)}:1`);
    }
  }
});

test("grayscale: ink, accent bar and rules stay distinguishable from paper", async () => {
  const v = (await loadTenant("hec")).vars;
  // In grayscale only luminance survives; keep the structural colours apart.
  assert.ok(contrast(v["color-ink"], v["color-paper"]) > 12);
  assert.ok(contrast(v["color-accent-deep"], v["color-paper"]) > 1.6, "accent bar visible in grayscale");
  assert.ok(contrast(v["color-rule"], v["color-paper"]) > 1.2, "rules visible in grayscale");
  assert.ok(contrast(v["color-surface-strong"], v["color-ink"]) > 7, "meter track vs fill");
});
