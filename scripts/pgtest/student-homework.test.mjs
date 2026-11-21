// The student homework list: one fetch, one grouping, one "what next".
//
// The dashboard and the homework page both read src/lib/studentHomework.ts.
// What matters here: a failed request must THROW (so neither screen can show
// an all-clear), the two screens order equal deadlines the same way, and the
// next action is the first late item, else the first coming up.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = readFileSync(resolve(repo, "src/lib/studentHomework.ts"), "utf8");
const out = resolve(tmpdir(), `studentHomework.${process.pid}.mjs`);
writeFileSync(out, (await transform(src, { loader: "ts", format: "esm" })).code);
const m = await import(pathToFileURL(out).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const NOW = new Date(2026, 10, 21, 10, 0, 0); // 21 Nov 2026, local
const day = (offset) => {
  const d = new Date(2026, 10, 21 + offset);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const hw = (id, title, due, submission = null) => ({ id, title, due_date: due, submission });

const homeworks = [
  hw("h1", "Reading A", day(3)),
  hw("h2", "Reading B", day(1)),
  hw("h3", "Writing", day(1)), // same deadline as h2
  hw("h4", "Alpha tie", day(1)), // third on the same day: title breaks the tie
  hw("h5", "Speaking", day(-2)), // late
  hw("h6", "Vocabulary", day(-5)), // late, older
  hw("h7", "Ancient", day(-31)), // old miss
  hw("h8", "Free task", null), // undated
  hw("h9", "Just sent", day(0), { status: "submitted", submitted_at: "2026-11-21T09:00:00Z" }),
  hw("h10", "Marked", day(-4), { status: "graded", graded_at: "2026-11-18T09:00:00Z" }),
];
const submissions = [
  { homework_id: "h9", status: "submitted", submitted_at: "2026-11-21T09:00:00Z" },
  { homework_id: "h10", status: "graded", graded_at: "2026-11-18T09:00:00Z" },
];
const rpcData = { homeworks: homeworks.map(({ submission, ...r }) => r), submissions };

console.log("fetch");
{
  const calls = [];
  const good = { rpc: async (fn, args) => { calls.push([fn, args]); return { data: rpcData, error: null }; } };
  const list = await m.fetchStudentHomework(good, "stu-1");
  ok("calls get_student_homeworks for the student", calls[0][0] === "get_student_homeworks" && calls[0][1].p_student_id === "stu-1");
  ok("merges submission into its homework", list.find((h) => h.id === "h9").submission?.status === "submitted" && list.find((h) => h.id === "h1").submission === null);
  ok("keeps every homework", list.length === 10);

  const bad = { rpc: async () => ({ data: null, error: { message: "boom" } }) };
  let threw = null;
  try { await m.fetchStudentHomework(bad, "stu-1"); } catch (e) { threw = e; }
  ok("a failed request throws (never an empty list)", threw instanceof Error && threw.message === "boom");

  const dead = { rpc: async () => { throw new Error("network down"); } };
  threw = null;
  try { await m.fetchStudentHomework(dead, "stu-1"); } catch (e) { threw = e; }
  ok("a request that rejects still throws", threw?.message === "network down");

  const empty = { rpc: async () => ({ data: { homeworks: [], submissions: [] }, error: null }) };
  ok("a real empty result is []", (await m.fetchStudentHomework(empty, "stu-1")).length === 0);
}

console.log("grouping");
const list = homeworks;
const g = m.groupHomework(list, NOW);
const ids = (a) => a.map((h) => h.id);
ok("late = two recent misses, most recent first", JSON.stringify(ids(g.late)) === '["h5","h6"]', ids(g.late).join());
ok("31-day-old miss is an old miss, not late", JSON.stringify(ids(g.oldMisses)) === '["h7"]');
ok("next: earliest first, equal deadlines by title then id, undated last",
  JSON.stringify(ids(g.next)) === '["h4","h2","h3","h1","h8"]', ids(g.next).join());
ok("done = submitted + graded", JSON.stringify(ids(g.done)) === '["h9","h10"]', ids(g.done).join());
ok("a task due today and not sent is coming up, not late", ids(m.groupHomework([hw("t", "Today", day(0))], NOW).next).join() === "t");
ok("exactly 30 days old is still late", ids(m.groupHomework([hw("x", "Edge", day(-30))], NOW).late).join() === "x");
ok("every item lands in exactly one group", g.late.length + g.oldMisses.length + g.next.length + g.done.length === list.length);

console.log("order is stable");
{
  const shuffled = [...list].reverse();
  const g2 = m.groupHomework(shuffled, NOW);
  ok("input order does not change the result",
    JSON.stringify([ids(g2.late), ids(g2.next), ids(g2.done), ids(g2.oldMisses)]) ===
    JSON.stringify([ids(g.late), ids(g.next), ids(g.done), ids(g.oldMisses)]));
}

console.log("next action and counts");
ok("next action is the first late item", m.nextAction(g)?.id === "h5");
ok("no late: next action is the first coming up", m.nextAction({ ...g, late: [] })?.id === "h4");
ok("only old misses: no next action", m.nextAction(m.groupHomework([hw("o", "Old", day(-40))], NOW)) === null);
ok("nothing at all: no next action", m.nextAction(m.groupHomework([], NOW)) === null);
ok("to-do count = late + next (7 open here, old miss excluded)", m.todoCount(g) === 7, String(m.todoCount(g)));
ok("to-do count is not capped at 5", m.todoCount(m.groupHomework(Array.from({ length: 9 }, (_, i) => hw(`n${i}`, `T${i}`, day(i + 1))), NOW)) === 9);
ok("the just-sent task is not to do", !ids(g.late).includes("h9") && !ids(g.next).includes("h9"));

console.log("query key");
ok("key is shared with the other screens that read this list", JSON.stringify(m.studentHomeworkKey("s1")) === '["student-assignments","s1"]');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
