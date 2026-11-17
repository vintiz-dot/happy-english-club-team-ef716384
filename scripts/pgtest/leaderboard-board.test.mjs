// src/lib/leaderboard/board.ts: how the screens read the server's board.
// It renames and orders; these cases hold it to that, and to the two date
// faults the old month list had (the 31st, and early on the 1st in Hanoi).
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import * as esbuild from "esbuild";

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, g, w) => { const a = JSON.stringify(g), b = JSON.stringify(w); ok(n, a === b, a === b ? "" : `got ${a}, want ${b}`); };

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, "..", "..", "src", "lib", "leaderboard", "board.ts"), "utf8");
ok("board.ts imports nothing (loadable as it is)", !/^\s*import\s/m.test(src));
const js = (await esbuild.transform(src, { loader: "ts", format: "esm" })).code;
const tmp = join(mkdtempSync(join(tmpdir(), "board-")), "board.mjs");
writeFileSync(tmp, js);
const B = await import(pathToFileURL(tmp).href);

const row = (id, name, rank, total, extra = {}) => ({
  student_id: id, name, rank, total,
  categories: { homework: 0, video: 0, class: total, streak: 0, vocabulary: 0, reading: 0 },
  category_ranks: { homework: 1, video: 1, class: rank, streak: 1, vocabulary: 1, reading: 1 },
  ...extra,
});
const board = {
  period: { kind: "month", from: "2026-11-01", to: "2026-11-30", label: "November 2026", term_id: null, basis: "total" },
  class_id: "c", rows: [
    row("d", "Dung", 4, 40),
    row("b", "Binh", 1, 100),
    row("a", "An", 1, 100, { category_ranks: { homework: 2, video: 1, class: 1, streak: 1, vocabulary: 1, reading: 1 } }),
    row("c", "Chi", 3, 60),
  ],
  champions: [], climber: null, streak: null,
};

console.log("order and rank are the server's");
eq("rows ordered by the server's rank, then name", B.orderedRows(board, null).map((r) => r.name), ["An", "Binh", "Chi", "Dung"]);
ok("a shared rank is a tie", B.isTied(board, board.rows[1], null) && !B.isTied(board, board.rows[3], null));
eq("an older server: a tab falls back to that category's rank", B.shownRank(board, board.rows[2], "homework"), 2);
eq("points to the podium: third place has 60, Dung 40 -> 21", B.toPodium(board, board.rows[0], null), 21);
eq("nothing to the podium for a podium place", B.toPodium(board, board.rows[3], null), 0);
const pl = { ...board, period: { ...board.period, kind: "all", basis: "per_lesson" },
  rows: board.rows.map((r, i) => ({ ...r, per_lesson: [5.5, 20, 20, 9][i] })) };
eq("a per-lesson board shows points per lesson", B.shownPoints(pl, pl.rows[1], null), 20);
eq("and measures the podium gap in tenths", B.toPodium(pl, pl.rows[0], null), 3.6);
ok("per-lesson flag", B.isPerLesson(pl) && !B.isPerLesson(board));

console.log("review follow-up: no points, no rank; the server ranks a tab");
const zero = { ...board, rows: [row("x", "Xuan", null, 0), row("y", "Yen", null, 0)] };
zero.rows.forEach((r) => { r.points = 0; });
eq("nobody with points: nobody ranked, nobody tied", zero.rows.map((r) => [B.shownRank(zero, r, null), B.isTied(zero, r, null)]), [[null, false], [null, false]]);
eq("and one point reaches the empty podium", B.toPodium(zero, zero.rows[0], null), 1);
const mixed = { ...board, rows: [row("a", "An", 1, 50), row("z", "Zed", null, 0), row("b", "Bao", 2, 20)] };
mixed.rows.forEach((r) => { r.points = r.total; });
eq("unranked children go last, after every ranked one", B.orderedRows(mixed, null).map((r) => r.name), ["An", "Bao", "Zed"]);
const tab = { ...board, category: "reading", rows: [
  { student_id: "a", name: "An", rank: null, points: 0 }, { student_id: "b", name: "Binh", rank: 1, points: 100 }] };
eq("a board the server ranked on a tab is read as it is: rank and points", tab.rows.map((r) => [B.shownRank(tab, r, "reading"), B.shownPoints(tab, r, "reading")]), [[null, 0], [1, 100]]);
eq("and ordered by that rank", B.orderedRows(tab, "reading").map((r) => r.name), ["Binh", "An"]);
const famRow = { student_id: "c", name: "Chi", avatar_url: null, rank: 3, points: 7.5 };
const perL = { ...board, period: { ...board.period, kind: "all", basis: "per_lesson" }, rows: [famRow] };
eq("a classmate on a per-lesson board shows the server's points (no total sent)", B.shownPoints(perL, famRow, null), 7.5);

console.log("dates");
eq("Hanoi today at 23:30 UTC is tomorrow", B.hanoiToday(new Date("2026-10-31T23:30:00Z")), "2026-11-01");
eq("Hanoi today at 16:59 UTC is still today", B.hanoiToday(new Date("2026-11-17T16:59:00Z")), "2026-11-17");
const m31 = B.recentMonths("2026-12-31", 4).map((m) => m.anchor);
eq("on the 31st every month appears once, in order (setMonth skipped November)", m31, ["2026-12-01", "2026-11-01", "2026-10-01", "2026-09-01"]);
eq("across a new year", B.recentMonths("2027-01-15", 3).map((m) => m.label), ["January 2027", "December 2026", "November 2026"]);
const w = B.recentWeeks("2026-11-19", 3);
eq("weeks start on Monday", w.map((x) => x.anchor), ["2026-11-16", "2026-11-09", "2026-11-02"]);
eq("week labels", w.map((x) => x.label), ["This week", "Last week", "Week of 2 Nov"]);
eq("a Sunday belongs to the week that began on Monday", B.recentWeeks("2026-11-22", 1)[0].anchor, "2026-11-16");
eq("future terms are not offered; newest first",
  B.termOptions([{ id: "1", name: "Spring", starts_on: "2026-01-05", ends_on: "2026-04-01" },
                 { id: "2", name: "Autumn", starts_on: "2026-09-01", ends_on: "2026-12-20" },
                 { id: "3", name: "Next", starts_on: "2027-01-05", ends_on: "2027-04-01" }], "2026-11-17").map((t) => t.label),
  ["Autumn", "Spring"]);
eq("the legacy month for a month choice", B.legacyMonthOf({ kind: "month", anchor: "2026-10-01" }, "2026-11-17"), "2026-10");
eq("no legacy month for a week", B.legacyMonthOf({ kind: "week", anchor: null }, "2026-11-17"), null);

console.log("an older class-leaderboard");
const lb = B.legacyToBoard([{ student_id: "a", student_name: "An", avatar_url: null, participation_points: 5, homework_points: 3,
  reading_theory_points: 2, vocabulary_quiz_points: 1, total_points: 11, is_current_user: true, rank: 1 }], "c", "2026-10");
eq("legacy rows keep the server's rank and totals", [lb.rows[0].rank, lb.rows[0].total, lb.rows[0].is_self], [1, 11, true]);
eq("legacy categories add up to the total",
  Object.values(lb.rows[0].categories).reduce((a, b) => a + b, 0), 11);
ok("no level is invented for a legacy row", lb.rows[0].level === null);
ok("a missing function is recognised", B.isMissingFunction({ code: "PGRST202" }) && !B.isMissingFunction({ code: "42501" }));


console.log("edge functions (review N-1, N-5)");
{
  const reset = readFileSync(resolve(here, "..", "..", "supabase", "functions", "reset-monthly-leaderboard", "index.ts"), "utf8");
  const m = reset.match(/const monthToArchive = targetMonth \|\| \(\(\) => \{([\s\S]*?)\}\)\(\);/);
  ok("reset-monthly-leaderboard: default month found", !!m);
  const lastMonth = (iso) => {
    const realNow = Date.now;
    Date.now = () => new Date(iso).getTime();
    try { return new Function(m[1])(); } finally { Date.now = realNow; }
  };
  eq("on 31 Dec (Hanoi) the default is November", lastMonth("2026-12-31T05:00:00Z"), "2026-11");
  eq("on 31 Oct it is September (setMonth gave October)", lastMonth("2026-10-31T05:00:00Z"), "2026-09");
  eq("on 1 Jan in Hanoi (still 31 Dec in UTC) it is December", lastMonth("2026-12-31T18:00:00Z"), "2026-12");
  eq("on 15 Jan it is last December", lastMonth("2027-01-15T05:00:00Z"), "2026-12");
  const cl = readFileSync(resolve(here, "..", "..", "supabase", "functions", "class-leaderboard", "index.ts"), "utf8");
  ok("class-leaderboard lets staff in by is_teacher_of_class (teaching assistants, cover) and not the teachers table",
    /rpc\("is_teacher_of_class"/.test(cl) && !/from\("teachers"\)/.test(cl));
  ok("class-leaderboard counts a second guardian's children", /secondary_user_id\.eq\./.test(cl));
  ok("class-leaderboard's old-shape total_points is never a per-lesson figure", /total_points: Number\(r\.total \?\? 0\)/.test(cl));
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
