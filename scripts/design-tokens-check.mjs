// Design-token check for the "ivory" design system (docs/DESIGN_SYSTEM.md).
//
//   node scripts/design-tokens-check.mjs
//
// Reads src/index.css and tailwind.config.ts. Nothing is hard-coded here except
// the list of pairs that the document promises; every colour comes from the CSS.
//
// It fails (exit 1) when:
//   1. a custom property exists in the light scope and not in the dark one, or
//      the other way round - in any @media context;
//   2. the two spellings of the dark scope (attribute on <html>, attribute on an
//      inner root) do not carry exactly the same declarations;
//   3. a var(--hec-*) used in index.css or tailwind.config.ts is defined nowhere;
//   4. the "young" scale overrides something that is a colour, or a token that
//      does not exist in the base;
//   5. a documented text/surface pair is under its WCAG threshold in either theme;
//   6. the raw logo green would pass as text on a light surface (it must not be
//      mistaken for a text colour: the doc forbids it, this keeps the doc true).
//
// It prints the markdown tables that are pasted into the document.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "src/index.css"), "utf8");
const tw = readFileSync(join(root, "tailwind.config.ts"), "utf8");

const LIGHT = '[data-hec-theme="ivory"]';
const DARK_ROOT = '.dark[data-hec-theme="ivory"]';
const DARK_INNER = '.dark [data-hec-theme="ivory"]';
const YOUNG = [
  '[data-hec-theme="ivory"][data-hec-scale="young"]',
  '[data-hec-theme="ivory"] [data-hec-scale="young"]',
];

const failures = [];
const fail = (m) => failures.push(m);

// ---------------------------------------------------------------- CSS reading
// A small brace walker: enough for this file (no braces inside strings in the
// blocks we care about). Returns [{ context, selectors, decls }].
function readRules(source) {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules = [];
  const walk = (start, end, context) => {
    let i = start;
    while (i < end) {
      const open = text.indexOf("{", i);
      if (open === -1 || open >= end) break;
      // The prelude starts after the previous ';' or '}' inside this block.
      let preludeStart = i;
      for (let k = open - 1; k >= i; k--) {
        if (text[k] === ";" || text[k] === "}") { preludeStart = k + 1; break; }
      }
      const prelude = text.slice(preludeStart, open).trim().replace(/\s+/g, " ");
      let depth = 1;
      let j = open + 1;
      while (j < end && depth > 0) {
        if (text[j] === "{") depth++;
        else if (text[j] === "}") depth--;
        j++;
      }
      const bodyStart = open + 1;
      const bodyEnd = j - 1;
      if (prelude.startsWith("@")) {
        if (/^@(media|supports|layer|container)\b/.test(prelude)) {
          const ctx = /^@layer\b/.test(prelude) ? context : [...context, prelude];
          walk(bodyStart, bodyEnd, ctx);
        }
        // @keyframes, @font-face ...: not style rules, skipped.
      } else {
        const body = text.slice(bodyStart, bodyEnd);
        if (body.includes("{")) {
          walk(bodyStart, bodyEnd, context); // nested rules (the legacy file has some)
        }
        const decls = [];
        const flat = body.replace(/[^{}]*\{[^{}]*\}/g, "");
        for (const part of flat.split(";")) {
          const m = part.match(/^\s*(--[A-Za-z0-9_-]+)\s*:\s*([\s\S]+?)\s*$/);
          if (m) decls.push([m[1], m[2].replace(/\s+/g, " ")]);
        }
        rules.push({
          context: context.join(" > ") || "(top level)",
          selectors: prelude.split(",").map((s) => s.trim()),
          decls,
        });
      }
      i = j;
    }
  };
  walk(0, text.length, []);
  return rules;
}

const rules = readRules(css);

// context -> scope -> Map(name -> value)
const scopes = new Map();
const bucket = (context, scope) => {
  if (!scopes.has(context)) scopes.set(context, new Map());
  const c = scopes.get(context);
  if (!c.has(scope)) c.set(scope, new Map());
  return c.get(scope);
};
const young = new Map();
for (const rule of rules) {
  for (const sel of rule.selectors) {
    const scope = sel === LIGHT ? "light" : sel === DARK_ROOT ? "darkRoot" : sel === DARK_INNER ? "darkInner" : null;
    if (scope) for (const [k, v] of rule.decls) bucket(rule.context, scope).set(k, v);
    if (YOUNG.includes(sel)) for (const [k, v] of rule.decls) young.set(k, v);
  }
}

if (!scopes.has("(top level)") || !scopes.get("(top level)").has("light")) {
  console.error(`No ${LIGHT} block found in src/index.css.`);
  process.exit(1);
}

// ------------------------------------------------------------------ 1 + 2 parity
const parityRows = [];
for (const [context, c] of scopes) {
  const light = c.get("light") ?? new Map();
  const darkRoot = c.get("darkRoot") ?? new Map();
  const darkInner = c.get("darkInner") ?? new Map();
  const missingInDark = [...light.keys()].filter((k) => !darkRoot.has(k));
  const missingInLight = [...darkRoot.keys()].filter((k) => !light.has(k));
  const spellingDiff = [
    ...[...darkRoot].filter(([k, v]) => darkInner.get(k) !== v).map(([k]) => k),
    ...[...darkInner.keys()].filter((k) => !darkRoot.has(k)),
  ];
  parityRows.push([context, light.size, darkRoot.size, missingInDark.length, missingInLight.length, spellingDiff.length]);
  if (missingInDark.length) fail(`[${context}] in light, missing in dark: ${missingInDark.join(", ")}`);
  if (missingInLight.length) fail(`[${context}] in dark, missing in light: ${missingInLight.join(", ")}`);
  if (spellingDiff.length) fail(`[${context}] the two dark selectors differ on: ${spellingDiff.join(", ")}`);
}

const light = scopes.get("(top level)").get("light");
const dark = scopes.get("(top level)").get("darkRoot") ?? new Map();

// ------------------------------------------------------------------ 3 references
const used = new Set();
for (const m of css.matchAll(/var\(\s*(--hec-[A-Za-z0-9_-]+)/g)) used.add(m[1]);
const usedTw = new Set();
for (const m of tw.matchAll(/var\(\s*(--hec-[A-Za-z0-9_-]+)/g)) usedTw.add(m[1]);
for (const name of new Set([...used, ...usedTw])) {
  if (!light.has(name)) fail(`var(${name}) is used but not defined in the light scope`);
  if (!dark.has(name)) fail(`var(${name}) is used but not defined in the dark scope`);
}
const hecTokens = [...light.keys()].filter((k) => k.startsWith("--hec-"));
const legacyTokens = [...light.keys()].filter((k) => !k.startsWith("--hec-"));

// ------------------------------------------------------------------ colours
const TRIPLET = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/;
function resolve(map, name, seen = new Set()) {
  let v = map.get(name);
  if (v === undefined) return undefined;
  const m = v.match(/^var\(\s*(--[A-Za-z0-9_-]+)\s*\)$/);
  if (m) {
    if (seen.has(name)) return undefined;
    seen.add(name);
    return resolve(map, m[1], seen);
  }
  return v;
}
function rgbOf(map, token) {
  const v = resolve(map, `--hec-${token}`);
  const m = v && v.match(TRIPLET);
  if (!m) return null;
  const h = Number(m[1]) / 360, s = Number(m[2]) / 100, l = Number(m[3]) / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  // Rounded to 8-bit, because that is what a screen draws.
  return [hue(h + 1 / 3), hue(h), hue(h - 1 / 3)].map((c) => Math.round(c * 255));
}
const hex = (rgb) => !rgb ? "n/a" : "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase();
function luminance(rgb) {
  const [r, g, b] = rgb.map((c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const colourTokens = hecTokens.filter((k) => TRIPLET.test(resolve(light, k) ?? ""));
for (const k of colourTokens) {
  if (!TRIPLET.test(resolve(dark, k) ?? "")) fail(`${k} is a colour in light but not in dark`);
}

// 4. the young scale
for (const k of young.keys()) {
  if (!light.has(k)) fail(`young scale overrides ${k}, which the base scope does not define`);
  if (colourTokens.includes(k)) fail(`young scale overrides the colour ${k}; it may only change size, spacing and radius`);
}

// ------------------------------------------------------------------ 5 pairs
// [foreground, background, minimum, what it is]
const SURFACES = ["paper", "surface", "raised", "sunken", "honey"];
const TEXT = 4.5, UI = 3;
const pairs = [];
for (const fg of ["ink", "ink-soft", "ink-faint", "brass", "leaf", "warn", "danger"]) {
  for (const bg of SURFACES) pairs.push([fg, bg, TEXT, "text"]);
}
pairs.push(
  ["on-action", "action", TEXT, "label on the primary button"],
  ["on-brass", "brass-fill", TEXT, "label on the brass button"],
  ["on-danger", "danger-fill", TEXT, "label on the destructive button"],
  ["leaf", "leaf-tint", TEXT, "text on a success panel"],
  ["warn", "warn-tint", TEXT, "text on a warning panel"],
  ["danger", "danger-tint", TEXT, "text on a danger panel"],
  ["ink", "leaf-tint", TEXT, "body text on a success panel"],
  ["ink", "warn-tint", TEXT, "body text on a warning panel"],
  ["ink", "danger-tint", TEXT, "body text on a danger panel"],
  ["ink-soft", "leaf-tint", TEXT, "secondary text on a success panel"],
  ["ink-soft", "warn-tint", TEXT, "secondary text on a warning panel"],
  ["ink-soft", "danger-tint", TEXT, "secondary text on a danger panel"],
);
for (const bg of SURFACES) pairs.push(["line-strong", bg, UI, "control border"]);
for (const bg of SURFACES) pairs.push(["ring", bg, UI, "focus ring"]);
for (const bg of ["paper", "surface", "raised", "honey"]) {
  pairs.push(["action", bg, UI, "primary button edge"]);
  pairs.push(["brass-fill", bg, UI, "brass button edge"]);
  pairs.push(["danger-fill", bg, UI, "destructive button edge"]);
}
pairs.push(["brass", "sunken", UI, "progress fill on its track"]);

const fmt = (n) => (Math.floor(n * 100) / 100).toFixed(2); // floor: never round a fail up to a pass
let lowest = { ratio: Infinity };
const pairRows = [];
for (const [fg, bg, min, what] of pairs) {
  const cells = [];
  for (const [themeName, map] of [["light", light], ["dark", dark]]) {
    const a = rgbOf(map, fg), b = rgbOf(map, bg);
    if (!a || !b) {
      fail(`pair ${fg} on ${bg}: not a colour token in ${themeName}`);
      cells.push("n/a");
      continue;
    }
    const r = contrast(a, b);
    if (r < min) fail(`${themeName}: ${fg} on ${bg} is ${fmt(r)}:1, needs ${min}:1 (${what})`);
    if (r < lowest.ratio && min === TEXT) lowest = { ratio: r, fg, bg, themeName };
    cells.push(fmt(r));
  }
  pairRows.push(`| \`${fg}\` | \`${bg}\` | ${what} | ${min} | ${cells[0]} | ${cells[1]} |`);
}

// 6. raw logo green is not a text colour
const logoRows = [];
for (const bg of SURFACES) {
  const logo = rgbOf(light, "logo"), surface = rgbOf(light, bg);
  if (!logo || !surface) { fail(`logo on ${bg}: not a colour token in light`); continue; }
  const r = contrast(logo, surface);
  logoRows.push(`\`${bg}\` ${fmt(r)}`);
  if (r >= UI) fail(`logo green on ${bg} (light) reaches ${fmt(r)}:1 - the doc says it never carries text; re-read the rule`);
}

// ------------------------------------------------------------------ output
console.log("## Token parity\n");
console.log("| Context | light | dark | missing in dark | missing in light | dark spellings differ |");
console.log("|---|---|---|---|---|---|");
for (const r of parityRows) console.log(`| ${r.join(" | ")} |`);
console.log(`\n${hecTokens.length} \`--hec-*\` tokens (${colourTokens.length} colours) and ${legacyTokens.length} remapped legacy tokens per theme; young scale overrides ${young.size}.`);
console.log(`\`var(--hec-*)\` references checked: ${used.size} in index.css, ${usedTw.size} in tailwind.config.ts.`);

console.log("\n## Palette\n");
console.log("| Token | Light HSL | Light hex | Dark HSL | Dark hex |");
console.log("|---|---|---|---|---|");
for (const k of colourTokens) {
  const t = k.replace("--hec-", "");
  console.log(`| \`${k}\` | ${resolve(light, k)} | ${hex(rgbOf(light, t))} | ${resolve(dark, k)} | ${hex(rgbOf(dark, t))} |`);
}

console.log("\n## Contrast (WCAG 2.x relative luminance, ratios floored to 2 decimals)\n");
console.log("| Foreground | Background | Use | Min | Light | Dark |");
console.log("|---|---|---|---|---|---|");
for (const r of pairRows) console.log(r);
console.log(`\nRaw logo green on light surfaces (must stay under 3, it is not a text colour): ${logoRows.join(", ")}.`);
if (lowest.fg) console.log(`Lowest text pair: \`${lowest.fg}\` on \`${lowest.bg}\` (${lowest.themeName}) ${fmt(lowest.ratio)}:1.`);

console.log(`\n${pairs.length} pairs x 2 themes checked.`);
if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.error("  - " + f);
  process.exit(1);
}
console.log("PASS");
