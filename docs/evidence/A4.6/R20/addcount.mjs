// node addcount.mjs <diff.txt> : inventory regexes applied to ADDED lines only (what the ivory branches bring in), per file.
import fs from 'node:fs';
const PAL = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black";
const re = {
  palette: new RegExp(String.raw`(?<![\w-])(?:[\w\[\]=&\-\/.:]+:)?-?(?:bg|text|border(?:-[trblxy])?|from|to|via|ring|ring-offset|fill|stroke|shadow|outline|divide|placeholder|decoration|caret|accent)-(?:${PAL})(?:-\d{2,3})?(?:\/\d{1,3})?(?![\w-])`, 'g'),
  hex: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g,
  rgb: /\b(?:rgba?|hsla?)\(\s*\d/g,
  dark: /(?<![\w-])dark:/g,
  cut: /(?<![\w-])(?:truncate|line-clamp-\d+|text-ellipsis)(?![\w-])/g,
  legacy: /(?<![\w-])(?:[\w-]+:)?(?:glass(?:-[\w]+)?|backdrop-blur(?:-\w+)?|text-shimmer|(?:bg|text)-(?:aurora|citrus|glacier|mint|night)|animate-(?:float[\w-]*|glow-pulse|shimmer)|shadow-(?:q\d|premium[\w-]*)|hover:scale-[\w.\[\]]+)(?![\w-])/g,
};
const lines = fs.readFileSync(process.argv[2], 'utf8').replace(/\r/g, '').split('\n');
let file = '', out = {};
for (const l of lines) {
  if (l.startsWith('+++ ')) { file = l.slice(6); continue; }
  if (l.startsWith('---')) continue;
  const sign = l.startsWith('+') ? 1 : l.startsWith('-') ? -1 : 0;
  if (!sign) continue;
  // net = added - removed. The legacy strings move from removed lines into the `: OLD` side of added lines and cancel,
  // so what is left is what the ivory branches bring in.
  const t = l.slice(1);
  out[file] ||= Object.fromEntries(Object.keys(re).map((k) => [k, 0]));
  for (const [k, r] of Object.entries(re)) out[file][k] += sign * (t.match(r) || []).length;
}
console.log(JSON.stringify(out, null, 1));
