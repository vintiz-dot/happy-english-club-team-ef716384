// Reception display, class time (owner, 29 Nov 2026): a class is the
// screen's subject from 10 minutes before it starts to 20 after, and for 15
// minutes once it ends. Runs public/reception-tv/focus.js (ES5, the TV's own
// file) in Node, and checks the display app wires it in.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "public", "reception-tv");
const box = { window: {} };
vm.runInNewContext(readFileSync(resolve(root, "focus.js"), "utf8"), box);
const F = box.window.HEC_FOCUS;
let pass = 0, fail = 0;
const eq = (n, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  console.log(`  ${g === w ? "PASS" : "FAIL"}  ${n}${g === w ? "" : ` :: got ${g}, want ${w}`}`);
  g === w ? pass++ : fail++;
};
const DAY = "2026-11-30";
const at = (hm) => ({ day: DAY, minutes: F.mins(hm) });
const S = [
  { class_name: "Jupiter", start: "17:10:00", end: "18:40:00" },
  { class_name: "Venus", start: "18:45:00", end: "20:15:00" },
];
const who = (hm) => F.classesInFocus(S, DAY, at(hm)).map((c) => `${c.mode}:${c.class_name}`);

eq("nothing at 16:59", who("16:59"), []);
eq("arrive from 17:00 (10 min before 17:10)", who("17:00"), ["arrive:Jupiter"]);
eq("still arriving at 17:29", who("17:29"), ["arrive:Jupiter"]);
eq("normal loop from 17:30 (20 min after)", who("17:30"), []);
eq("18:35: Venus drop-off opens while Jupiter is still in class", who("18:35"), ["arrive:Venus"]);
eq("pick-up from 18:40, ahead of the next drop-off", who("18:40"), ["leave:Jupiter", "arrive:Venus"]);
eq("pick-up and the next class's drop-off together, pick-up first", who("18:45"), ["leave:Jupiter", "arrive:Venus"]);
eq("pick-up ends at 18:55", who("18:55"), ["arrive:Venus"]);
eq("Venus arriving until 19:05", who("19:04"), ["arrive:Venus"]);
eq("Venus pick-up 20:15-20:30", [who("20:15"), who("20:30")], [["leave:Venus"], []]);
eq("another day's lessons are ignored (stale cache)", F.classesInFocus(S, "2026-11-29", at("17:05")), []);
eq("a class appears once", F.classesInFocus([...S, { class_name: "Jupiter", start: "17:10", end: "18:40" }], DAY, at("17:05")).length, 1);
eq("focus key", F.focusKey(F.classesInFocus(S, DAY, at("18:45"))), "leave:Jupiter|arrive:Venus");
eq("Hanoi clock", F.hanoiNow(Date.UTC(2026, 10, 30, 10, 5)), { day: DAY, minutes: 17 * 60 + 5 });
eq("Hanoi clock past midnight UTC+7", F.hanoiNow(Date.UTC(2026, 10, 29, 17, 30)).day, "2026-11-30");

const html = readFileSync(resolve(root, "index.html"), "utf8");
eq("index.html loads focus.js before app.js", html.indexOf("focus.js") > 0 && html.indexOf("focus.js") < html.indexOf("app.js"), true);
const app = readFileSync(resolve(root, "app.js"), "utf8");
eq("app.js reads today_sessions and highlights", /today_sessions/.test(app) && /highlights/.test(app), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
