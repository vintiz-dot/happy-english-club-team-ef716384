// A4.6 rollout inventory: per source file, what still carries the old look.
//   node scripts/design-rollout-inventory.mjs [--json out.json] [--md out.md]
// Counts, per .ts/.tsx file under src/:
//   palette  hard-coded Tailwind palette classes (bg-/text-/border-/from-/to-/via-/ring-/fill-/stroke-/
//            shadow-/outline-/divide-/placeholder- x the 22 palette names + white/black), any variant prefix
//   hex      #rgb / #rrggbb(aa) literals;  rgb  rgb()/rgba()/hsl() literals with numbers
//   dark     `dark:` variants;  cut  truncate / line-clamp-* / text-ellipsis sites
//   legacy   old decorative utilities the system removes (glass*, backdrop-blur*, text-shimmer, aurora/citrus/
//            glacier/mint/night gradients, animate-float*, shadow-q*, shadow-premium*, hover:scale-*)
// Excluded (with the reason, printed): the three display boards and their frame, D's cancellation dialogs and
// session-guard, the recorder, audit clips, lesson-eval, src/components/ui (A4.6 foundations), the
// Supabase types file. Read-only: writes nothing unless --json / --md is given.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const argVal = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };

const EXCLUDE = [
  [/^src\/components\/leaderboard\//, "display boards (DESIGN_SYSTEM s.17): themed canvases"],
  [/^src\/components\/admin\/session-guard\//, "D session guard: restyled after the D release is live"],
  [/(^|\/)(CancelSessionDialog|SessionActionsModal|EditSessionModal|DeleteSessionDialog|BulkSessionDelete)\.tsx$/, "D cancellation dialogs: after the D release is live"],
  [/^src\/components\/recorder\//, "recorder: owner's release first"],
  [/^src\/lib\/recorder\//, "recorder: owner's release first"],
  [/AuditClip|auditClips|audit-clips/i, "audit clips: owner's release first"],
  [/^src\/components\/ui\//, "shared primitives: A4.6 foundations"],
  [/^src\/integrations\//, "generated"],
];
const PAL = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black";
const reP = new RegExp(String.raw`(?<![\w-])(?:[\w\[\]=&\-\/.:]+:)?-?(?:bg|text|border(?:-[trblxy])?|from|to|via|ring|ring-offset|fill|stroke|shadow|outline|divide|placeholder|decoration|caret|accent)-(?:${PAL})(?:-\d{2,3})?(?:\/\d{1,3})?(?![\w-])`, "g");
const reHex = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
const reRgb = /\b(?:rgba?|hsla?)\(\s*\d/g;
const reDark = /(?<![\w-])dark:/g;
const reCut = /(?<![\w-])(?:truncate|line-clamp-\d+|text-ellipsis)(?![\w-])/g;
const reLegacy = /(?<![\w-])(?:[\w-]+:)?(?:glass(?:-[\w]+)?|backdrop-blur(?:-\w+)?|text-shimmer|(?:bg|text)-(?:aurora|citrus|glacier|mint|night)|animate-(?:float[\w-]*|glow-pulse|shimmer)|shadow-(?:q\d|premium[\w-]*)|hover:scale-[\w.\[\]]+)(?![\w-])/g;

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(e.name) && !/\.d\.ts$/.test(e.name)) files.push(p); } };
walk(path.join(repo, "src"));

const rows = [], excluded = {};
for (const abs of files) {
  const rel = path.relative(repo, abs).split(path.sep).join("/");
  const ex = EXCLUDE.find(([re]) => re.test(rel));
  const src = fs.readFileSync(abs, "utf8");
  const c = (re) => (src.match(re) || []).length;
  const row = { file: rel, palette: c(reP), hex: c(reHex), rgb: c(reRgb), dark: c(reDark), cut: c(reCut), legacy: c(reLegacy), lines: src.split("\n").length };
  if (ex) { (excluded[ex[1]] = excluded[ex[1]] || []).push(row); continue; }
  if (row.palette + row.hex + row.rgb + row.dark + row.cut + row.legacy > 0) rows.push(row);
}
rows.sort((a, b) => a.file.localeCompare(b.file));
const sum = (k, rs = rows) => rs.reduce((s, r) => s + r[k], 0);
const totals = { files: rows.length, palette: sum("palette"), hex: sum("hex"), rgb: sum("rgb"), dark: sum("dark"), cut: sum("cut"), legacy: sum("legacy") };
console.log("in scope:", JSON.stringify(totals));
for (const [why, rs] of Object.entries(excluded)) console.log(`excluded (${why}): ${rs.length} files, palette ${sum("palette", rs)}, hex ${sum("hex", rs)}`);
if (argVal("--json")) fs.writeFileSync(argVal("--json"), JSON.stringify({ totals, rows, excluded: Object.fromEntries(Object.entries(excluded).map(([k, v]) => [k, v.map((r) => r.file)])) }, null, 1));
if (argVal("--md")) {
  const md = ["| File | palette | hex | rgb | dark: | cut | legacy |", "|---|---|---|---|---|---|---|", ...rows.map((r) => `| \`${r.file}\` | ${r.palette} | ${r.hex} | ${r.rgb} | ${r.dark} | ${r.cut} | ${r.legacy} |`), `| **total (${totals.files} files)** | ${totals.palette} | ${totals.hex} | ${totals.rgb} | ${totals.dark} | ${totals.cut} | ${totals.legacy} |`];
  fs.writeFileSync(argVal("--md"), md.join("\n") + "\n");
}
