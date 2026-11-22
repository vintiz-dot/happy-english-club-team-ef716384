#!/usr/bin/env node
// Pip, the Happy English Club mascot: a chao mao (red-whiskered bulbul).
//
//   node scripts/mascot/build-pip.mjs
//
// One set of shapes, every pose. Writes:
//   public/mascot/pip*.svg            static poses for the app (see docs/MASCOT.md)
//   public/mascot/sheet.html          the design sheet
//   public/reception-tv/assets/pip.svg, pip-badge.svg   animated, for the reception TV
//
// The TV is Chromium 38: the files it gets use SVG 1.1 and SMIL only - no CSS
// inside the SVG, no filters, no text. Do not edit the outputs by hand.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Palette. Ink, cream, brass and leaf are the Ivory design system's; coral is
// Pip's own and is used nowhere else in the product.
const C = {
  ink: "#131D35",
  chestnut: "#8A5A38",
  slateLight: "#5B76B5",
  cream: "#FFFDF6",
  creamShade: "#F0E4C8",
  coral: "#F0604F",
  coralDeep: "#B8352F",
  gold: "#E9BC52",
  goldDeep: "#B98A2B",
  leaf: "#8BC63F",
  leafDeep: "#5F9B2B",
  white: "#FFFFFF",
  edge: "#FFFDF6", // the sticker edge that keeps Pip readable on navy and in dark mode
};

const OUT = 7;
const sw = (w = OUT) => `stroke="${C.ink}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** A painter draws either the art, or the same silhouettes as one cream edge. */
function painter(edge) {
  const E = `fill="${C.edge}" stroke="${C.edge}" stroke-width="26" stroke-linejoin="round" stroke-linecap="round"`;
  return {
    edge,
    path: (d, fill, w) => (edge ? `<path d="${d}" ${E}/>` : `<path d="${d}" fill="${fill}" ${sw(w)}/>`),
    ellipse: (cx, cy, rx, ry, fill, extra = "") =>
      edge ? `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${E}/>` : `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${sw()} ${extra}/>`,
    circle: (cx, cy, r, fill) => (edge ? `<circle cx="${cx}" cy="${cy}" r="${r}" ${E}/>` : `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${sw()}/>`),
    /** Inner detail: never part of the edge. */
    detail: (svg) => (edge ? "" : svg),
  };
}

function starPath(cx, cy, R, r = R * 0.46, rot = -90) {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = ((rot + i * 36) * Math.PI) / 180;
    const rad = i % 2 ? r : R;
    d += `${i ? "L" : "M"}${(cx + rad * Math.cos(a)).toFixed(1)} ${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }
  return d + "Z";
}
const heartPath = (cx, cy, s) =>
  `M${cx} ${cy + 13 * s}C${cx - 24 * s} ${cy - 5 * s} ${cx - 11 * s} ${cy - 25 * s} ${cx} ${cy - 10 * s}C${cx + 11 * s} ${cy - 25 * s} ${cx + 24 * s} ${cy - 5 * s} ${cx} ${cy + 13 * s}Z`;

// ---------------------------------------------------------------- the parts
const WING = "M322 344C346 316 380 276 410 246C430 236 450 252 446 272C424 312 386 352 348 378C334 374 324 360 322 344Z";
const WING_LINES = "M416 252l-11 15M429 259l-13 15M439 270l-13 13";
const WING_DOWN = "M342 326C382 344 390 410 356 448C328 434 314 380 320 334Z";
const WING_DOWN_LINES = "M352 428q14-6 18-20M344 404q16-4 24-22";
const mirror = (svg) => `<g transform="translate(512 0) scale(-1 1)">${svg}</g>`;

function wing(p, pose, anim) {
  if (pose === "down") {
    return p.path(WING_DOWN, C.chestnut) + p.detail(`<path d="${WING_DOWN_LINES}" fill="none" ${sw(4)}/>`);
  }
  const lift = pose === "up" ? -26 : 0;
  const body = p.path(WING, C.chestnut) + p.detail(`<path d="${WING_LINES}" fill="none" ${sw(4)}/>`);
  const wave = anim
    ? `<animateTransform attributeName="transform" type="rotate" dur="5.2s" repeatCount="indefinite" ` +
      `values="0 334 360;-17 334 360;5 334 360;-17 334 360;5 334 360;0 334 360;0 334 360" keyTimes="0;0.07;0.14;0.21;0.28;0.35;1"/>`
    : "";
  return `<g${lift ? ` transform="rotate(${lift} 334 360)"` : ""}>${wave}${body}</g>`;
}

function tail(p) {
  return (
    p.path("M206 412C168 426 124 452 96 488C108 506 150 508 188 492C212 480 230 464 240 450Z", C.chestnut) +
    p.detail(
      `<path d="M96 488C108 506 150 508 188 492L176 466Q146 462 124 462Q108 474 96 488Z" fill="${C.cream}" ${sw()}/>` +
        `<path d="M143 500l9-22" fill="none" ${sw(4)}/>`,
    )
  );
}

function foot(p, x) {
  return (
    p.detail(`<path d="M${x} 450V468" fill="none" stroke="${C.ink}" stroke-width="17" stroke-linecap="round"/><path d="M${x} 450V468" fill="none" stroke="${C.goldDeep}" stroke-width="7" stroke-linecap="round"/>`) +
    p.path(`M${x - 22} 480Q${x - 22} 464 ${x - 11} 467Q${x - 6} 458 ${x} 465Q${x + 6} 458 ${x + 11} 467Q${x + 22} 464 ${x + 22} 480Z`, C.gold, 6)
  );
}

function body(p) {
  return (
    p.ellipse(256, 372, 102, 92, C.cream) +
    p.detail(`<path d="M166 398C186 458 326 458 346 398C338 476 174 476 166 398Z" fill="${C.creamShade}"/>`)
  );
}

function scarf(p) {
  return (
    p.path("M166 298C200 344 312 344 346 298C356 314 354 332 342 344C300 378 212 378 170 344C158 332 156 314 166 298Z", C.leaf) +
    p.path("M286 350L322 396L298 398L292 420L268 362Z", C.leaf) +
    p.detail(
      `<path d="M178 318C214 352 298 352 334 318" fill="none" stroke="${C.leafDeep}" stroke-width="5" stroke-linecap="round"/>` +
        `<path d="${starPath(284, 352, 15)}" fill="${C.gold}" ${sw(5)}/>`,
    )
  );
}

function eye(cx, kind, anim) {
  const cy = 226;
  if (kind === "smile") return `<path d="M${cx - 21} ${cy + 6}Q${cx} ${cy - 22} ${cx + 21} ${cy + 6}" fill="none" ${sw(9)}/>`;
  const blink = anim
    ? `<animate attributeName="ry" dur="4.6s" repeatCount="indefinite" values="26;26;2;26;26" keyTimes="0;0.46;0.485;0.51;1"/>`
    : "";
  const hide = anim
    ? `<animate attributeName="opacity" dur="4.6s" repeatCount="indefinite" values="1;1;0;1;1" keyTimes="0;0.455;0.485;0.515;1"/>`
    : "";
  const big = kind === "sparkle";
  return (
    `<ellipse cx="${cx}" cy="${cy}" rx="21" ry="26" fill="${C.ink}">${blink}</ellipse>` +
    `<g>${hide}<circle cx="${cx - 7}" cy="${cy - 10}" r="${big ? 10 : 8.5}" fill="${C.white}"/>` +
    `<circle cx="${cx + 8}" cy="${cy + 9}" r="${big ? 5 : 3.8}" fill="${C.white}"/>` +
    (big ? `<path d="${starPath(cx + 9, cy - 12, 6, 2.2)}" fill="${C.white}"/>` : "") +
    `</g>`
  );
}

function beak(open) {
  if (!open) {
    return (
      `<path d="M234 248Q256 232 278 248Q270 268 256 276Q242 268 234 248Z" fill="${C.gold}" ${sw(6)}/>` +
      `<path d="M241 254Q256 262 271 254" fill="none" stroke="${C.goldDeep}" stroke-width="4" stroke-linecap="round"/>`
    );
  }
  return (
    `<path d="M238 252Q256 300 274 252Z" fill="${C.coralDeep}" ${sw(6)}/>` +
    `<ellipse cx="256" cy="272" rx="8" ry="6" fill="${C.coral}"/>` +
    `<path d="M232 246Q256 228 280 246Q268 259 256 261Q244 259 232 246Z" fill="${C.gold}" ${sw(6)}/>`
  );
}

function head(p, o, id) {
  const sway = o.anim
    ? `<animateTransform attributeName="transform" type="rotate" dur="6.4s" repeatCount="indefinite" ` +
      `values="0 258 120;3 258 120;0 258 120;-2.5 258 120;0 258 120" keyTimes="0;0.25;0.5;0.75;1"/>`
    : "";
  const crest =
    `<g>${sway}` +
    p.path("M196 132C172 98 180 60 212 38C210 70 222 98 242 118Z", C.ink) +
    p.path("M204 126C198 66 246 18 324 4C300 44 306 88 318 126Z", C.ink) +
    p.detail(`<path d="M238 104C240 72 262 42 292 28" fill="none" stroke="${C.slateLight}" stroke-width="6" stroke-linecap="round"/>`) +
    `</g>`;
  const face = p.detail(
    `<clipPath id="${id}"><circle cx="256" cy="210" r="117"/></clipPath>` +
      `<path clip-path="url(#${id})" d="M120 60H392V204Q256 92 120 204Z" fill="${C.ink}"/>` +
      `<circle cx="256" cy="210" r="120" fill="none" ${sw()}/>` +
      `<ellipse cx="174" cy="270" rx="26" ry="18" fill="${C.coral}" transform="rotate(-12 174 270)"/>` +
      `<ellipse cx="338" cy="270" rx="26" ry="18" fill="${C.coral}" transform="rotate(12 338 270)"/>` +
      `<ellipse cx="166" cy="264" rx="7" ry="4" fill="${C.white}" opacity="0.55" transform="rotate(-12 166 264)"/>` +
      `<ellipse cx="330" cy="264" rx="7" ry="4" fill="${C.white}" opacity="0.55" transform="rotate(12 330 264)"/>` +
      eye(210, o.eyes === "wink" ? "open" : o.eyes, o.anim) +
      eye(302, o.eyes === "wink" ? "smile" : o.eyes, o.anim) +
      beak(o.beak === "open"),
  );
  return `<g transform="rotate(-5 256 322)">${crest}${p.circle(256, 210, 120, C.cream)}${face}</g>`;
}

function extras(o) {
  let s = "";
  if (o.extra === "hearts") {
    s += `<path d="${heartPath(256, 404, 1.5)}" fill="${C.coral}" ${sw(6)}/>`;
    s += `<path d="${heartPath(420, 150, 0.8)}" fill="${C.coral}" ${sw(5)}/><path d="${heartPath(452, 98, 0.5)}" fill="${C.coral}" ${sw(4)}/>`;
  }
  if (o.extra === "confetti") {
    const bits = [
      [70, 120, C.gold], [112, 60, C.coral], [44, 210, C.leaf], [452, 60, C.leaf], [478, 150, C.gold], [420, 20, C.coral], [150, 14, C.leaf], [486, 250, C.coral], [30, 300, C.gold],
    ];
    bits.forEach(([x, y, f], i) => {
      s += i % 3 === 0 ? `<path d="${starPath(x, y, 15)}" fill="${f}" ${sw(4)}/>` : i % 3 === 1 ? `<circle cx="${x}" cy="${y}" r="9" fill="${f}" ${sw(4)}/>` : `<rect x="${x - 9}" y="${y - 5}" width="18" height="10" rx="3" fill="${f}" ${sw(4)} transform="rotate(${i * 37} ${x} ${y})"/>`;
    });
  }
  if (o.extra === "star") {
    s += `<path d="${starPath(452, 196, 30)}" fill="${C.gold}" ${sw(6)}/>`;
    s += `<path d="M452 140v-16M492 160l12-10M500 204h14" fill="none" stroke="${C.gold}" stroke-width="6" stroke-linecap="round"/>`;
  }
  return s;
}

/** One pass over every part, back to front. */
function layers(p, o, id) {
  const right = wing(p, o.right, o.anim && o.right === "wave");
  const left = mirror(wing(p, o.left, false));
  const raisedBehind = (o.right !== "down" ? right : "") + (o.left !== "down" ? left : "");
  const restingFront = (o.right === "down" ? right : "") + (o.left === "down" ? left : "");
  return tail(p) + raisedBehind + foot(p, 228) + foot(p, 284) + body(p) + restingFront + scarf(p) + head(p, o, id) + p.detail(extras(o));
}

function art(o, id = "pf") {
  const bob = o.anim
    ? `<animateTransform attributeName="transform" type="translate" dur="3.4s" repeatCount="indefinite" calcMode="spline" ` +
      `values="0 0;0 -6;0 0" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>`
    : "";
  return `<g>${bob}${layers(painter(true), o, id + "e")}${layers(painter(false), o, id)}</g>`;
}

const POSES = {
  // file           eyes        beak      right    left     extra        what it is for
  pip:              { eyes: "open", beak: "open", right: "wave", left: "down" },                       // hello: the default
  "pip-happy":      { eyes: "open", beak: "closed", right: "down", left: "down" },                     // at rest
  "pip-excited":    { eyes: "sparkle", beak: "open", right: "up", left: "up" },                        // a streak, good news
  "pip-celebrating":{ eyes: "smile", beak: "open", right: "up", left: "up", extra: "confetti" },       // all done, level up
  "pip-encouraging":{ eyes: "wink", beak: "closed", right: "wave", left: "down", extra: "star" },      // you can do this
  "pip-loving":     { eyes: "smile", beak: "closed", right: "down", left: "down", extra: "hearts" },   // good night, thank you
};

const VB = "-14 -22 540 540";
const svg = (inner, vb = VB) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${inner}</svg>\n`;
const shadow = `<ellipse cx="256" cy="490" rx="118" ry="13" fill="${C.ink}" opacity="0.13"/>`;

/** Head and shoulders in a cream disc with a brass ring: avatars, the TV footer. */
function badge(anim) {
  const o = { eyes: "open", beak: "closed", right: "down", left: "down", anim };
  return svg(
    `<circle cx="256" cy="232" r="246" fill="${C.gold}"/><circle cx="256" cy="232" r="232" fill="#F7F1E3"/>` +
      `<clipPath id="pb"><circle cx="256" cy="232" r="232"/></clipPath>` +
      `<g clip-path="url(#pb)"><g transform="translate(18 40) scale(0.93)">${layers(painter(false), o, "pbf")}</g></g>`,
    "8 -16 496 496",
  );
}

const files = {};
for (const [name, o] of Object.entries(POSES)) files[`public/mascot/${name}.svg`] = svg(shadow + art(o));
files["public/mascot/pip-badge.svg"] = badge(false);
files["public/reception-tv/assets/pip.svg"] = svg(shadow + art({ ...POSES.pip, anim: true }));
files["public/reception-tv/assets/pip-badge.svg"] = badge(true);

// ------------------------------------------------------------ design sheet
const swatch = (name, hex, use) =>
  `<div class="sw"><i style="background:${hex}"></i><b>${name}</b><code>${hex}</code><span>${use}</span></div>`;
files["public/mascot/sheet.html"] = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pip - Happy English Club mascot</title>
<style>
  body{margin:0;background:#F7F1E3;color:#131D35;font:16px/1.6 ui-sans-serif,system-ui,"Segoe UI",Roboto,Arial,sans-serif}
  main{max-width:1080px;margin:0 auto;padding:32px 16px 64px}
  h1,h2{font-family:ui-serif,"Palatino Linotype","Noto Serif",serif;font-weight:500;margin:0}
  h1{font-size:40px;line-height:1.2} h2{font-size:24px;margin:48px 0 16px}
  p{max-width:62ch;margin:8px 0 0}
  .hero{display:flex;flex-wrap:wrap;gap:16px;margin-top:24px}
  .panel{flex:1 1 300px;border-radius:20px;padding:16px;text-align:center;border:1px solid #E3D9C2}
  .panel img{width:100%;max-width:340px;height:auto}
  .panel small{display:block;margin-top:4px;opacity:.75}
  .ivory{background:#FFFDF6} .navy{background:#0B1B3A;color:#F7F1E3;border-color:#0B1B3A} .dark{background:#0A111E;color:#E9E2D0;border-color:#0A111E}
  .grid{display:flex;flex-wrap:wrap;gap:16px}
  .grid figure{flex:1 1 150px;margin:0;background:#FFFDF6;border:1px solid #E3D9C2;border-radius:16px;padding:12px;text-align:center}
  .grid img{width:100%;max-width:200px;height:auto} figcaption b{display:block}
  figcaption span{font-size:14px;color:#454F66}
  .sizes{display:flex;align-items:flex-end;gap:24px;flex-wrap:wrap;background:#FFFDF6;border:1px solid #E3D9C2;border-radius:16px;padding:16px}
  .sw{display:flex;align-items:center;gap:12px;padding:6px 0;flex-wrap:wrap} .sw i{width:36px;height:36px;border-radius:50%;border:1px solid #131D3533}
  .sw b{min-width:70px} .sw code{min-width:80px} .sw span{color:#454F66;font-size:14px}
</style></head><body><main>
<h1>Pip</h1>
<p>The Happy English Club mascot: a ch&agrave;o m&agrave;o, the crested songbird every Vietnamese child knows. Its name begins with <i>ch&agrave;o</i>, hello. Pip is the bird who learned to say it in English.</p>
<div class="hero">
  <div class="panel ivory"><img src="pip.svg" alt="Pip waving hello"><small>On ivory: the app in light mode</small></div>
  <div class="panel navy"><img src="../reception-tv/assets/pip.svg" alt=""><small>On navy, animated: the reception TV</small></div>
  <div class="panel dark"><img src="pip-happy.svg" alt=""><small>On deep ink: the app in dark mode</small></div>
</div>
<h2>Six moods</h2>
<div class="grid">
  <figure><img src="pip.svg" alt=""><figcaption><b>Hello</b><span>greeting, first visit of the day</span></figcaption></figure>
  <figure><img src="pip-happy.svg" alt=""><figcaption><b>Happy</b><span>at rest, beside the next task</span></figcaption></figure>
  <figure><img src="pip-encouraging.svg" alt=""><figcaption><b>Encouraging</b><span>homework is waiting</span></figcaption></figure>
  <figure><img src="pip-excited.svg" alt=""><figcaption><b>Excited</b><span>good news, a new badge</span></figcaption></figure>
  <figure><img src="pip-celebrating.svg" alt=""><figcaption><b>Celebrating</b><span>all done, a level reached</span></figcaption></figure>
  <figure><img src="pip-loving.svg" alt=""><figcaption><b>Loving</b><span>thank you, good night</span></figcaption></figure>
</div>
<h2>Small sizes</h2>
<div class="sizes">
  <img src="pip-badge.svg" width="32" alt=""><img src="pip-badge.svg" width="48" alt=""><img src="pip-badge.svg" width="72" alt=""><img src="pip-badge.svg" width="120" alt="">
  <img src="pip-happy.svg" width="64" alt=""><img src="pip-happy.svg" width="112" alt="">
</div>
<h2>Colours</h2>
${swatch("Ink", C.ink, "crest, cap, outline - the design system's ink")}
${swatch("Cream", C.cream, "face and belly; also the sticker edge")}
${swatch("Chestnut", C.chestnut, "wings and tail, as on the real bird")}
${swatch("Coral", C.coral, "the red whisker: Pip's own colour, used nowhere else")}
${swatch("Brass", C.gold, "beak, feet, the star pin")}
${swatch("Leaf", C.leaf, "the club scarf - the logo's green")}
</main></body></html>
`;

for (const [rel, text] of Object.entries(files)) {
  const abs = path.join(repo, rel);
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text);
  console.log(`${rel}  ${(text.length / 1024).toFixed(1)} kB`);
}
