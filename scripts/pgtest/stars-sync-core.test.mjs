// The TypeScript halves of the Stars sync that make decisions:
//
//   supabase/functions/_lib/stars-sync-core.ts      reading Pixel Pal's
//     answer without trusting it, comparing secrets, and working out which
//     after-effects a page of marks really needs;
//   supabase/functions/_lib/attendance-effects.ts   what a mark does in HEC
//     besides the register - shared by mark-attendance and the sync, so
//     both are tested here against a fake client.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const load = async (rel, name) => {
  const out = resolve(tmpdir(), `${name}.${process.pid}.mjs`);
  writeFileSync(out, (await transform(readFileSync(resolve(repo, rel), "utf8"), { loader: "ts", format: "esm" })).code);
  return import(pathToFileURL(out).href);
};
const core = await load("supabase/functions/_lib/stars-sync-core.ts", "starsSyncCore");
const fx = await load("supabase/functions/_lib/attendance-effects.ts", "attendanceEffects");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
const throwsWith = (n, fn, re) => { try { fn(); ok(n, false, "did not throw"); } catch (e) { ok(n, e instanceof core.FeedError && re.test(e.message), e.message); } };

console.log("=== the secret ===");
{
  const env = (vars) => (k) => vars[k];
  eq("found under the name it was given", core.resolveFeedSecret(env({ starpasscode: "abc" })), "abc");
  eq("or in capitals", core.resolveFeedSecret(env({ STARPASSCODE: "xyz" })), "xyz");
  eq("capitals win if both are set", core.resolveFeedSecret(env({ STARPASSCODE: "A", starpasscode: "b" })), "A");
  eq("surrounding spaces from a paste are trimmed", core.resolveFeedSecret(env({ starpasscode: "  abc \n" })), "abc");
  eq("missing is null, not an empty string sent to Pixel Pal", core.resolveFeedSecret(env({})), null);
  eq("blank counts as missing", core.resolveFeedSecret(env({ starpasscode: "   " })), null);
  ok("the address is Pixel Pal's, over https",
     core.PIXEL_PAL_EXPORT_URL === "https://jncqapcrqrtkqpdmfgma.supabase.co/functions/v1/export-events");
}

console.log("=== comparing the schedule's token ===");
{
  const t = "a".repeat(64);
  ok("the right token matches", core.secretsMatch(t, t));
  ok("one wrong character does not", !core.secretsMatch("a".repeat(63) + "b", t));
  ok("a prefix does not", !core.secretsMatch("a".repeat(32), t));
  ok("a longer string does not", !core.secretsMatch(t + "a", t));
  ok("an empty header does not", !core.secretsMatch("", t));
  ok("no header does not", !core.secretsMatch(null, t));
  ok("and nothing matches an empty expected token", !core.secretsMatch("", ""));
}

console.log("=== reading Pixel Pal's answer ===");
{
  const p = core.parseFeedPage({ events: [{ seq: 5 }, { seq: 6 }], next_cursor: 6 }, 4);
  eq("a good page", [p.events.length, p.nextCursor], [2, 6]);
  eq("an empty page with the same cursor back is fine",
     core.parseFeedPage({ events: [], next_cursor: 4 }, 4).events.length, 0);
  throwsWith("not an object", () => core.parseFeedPage("nope", 0), /expected shape/);
  throwsWith("an array instead of an object", () => core.parseFeedPage([], 0), /expected shape/);
  throwsWith("no events list", () => core.parseFeedPage({ next_cursor: 1 }, 0), /no list of events/);
  throwsWith("no cursor", () => core.parseFeedPage({ events: [] }, 0), /next_cursor/);
  throwsWith("a cursor that is not a whole number", () => core.parseFeedPage({ events: [], next_cursor: 1.5 }, 0), /next_cursor/);
  throwsWith("a negative cursor", () => core.parseFeedPage({ events: [], next_cursor: -1 }, 0), /next_cursor/);
  throwsWith("records whose cursor did not move - which would loop for ever",
     () => core.parseFeedPage({ events: [{ seq: 1 }], next_cursor: 4 }, 4), /did not advance/);
  throwsWith("something in the list that is not a record",
     () => core.parseFeedPage({ events: [{ seq: 1 }, "x"], next_cursor: 9 }, 0), /not a record/);
  try { core.parseFeedPage({ events: [{ seq: 1, payload: { child: "Apple" } }, 7], next_cursor: 9 }, 0); }
  catch (e) { ok("an error never repeats the payload, which is about children", !/Apple/.test(e.message), e.message); }
}

console.log("=== draining the after-effects queue ===");
{
  const S = (id, session, student, attempts = 0) => ({ id, kind: "streak", student_id: student, class_id: "C",
                                                       session_id: session, lesson_date: "2026-10-27", attempts });
  const T = (id, student, month = "2026-10", attempts = 0) => ({ id, kind: "tuition", student_id: student, month, attempts });

  const plan = core.planDrain([S(1, "s1", "apple"), S(2, "s1", "johnny"), S(3, "s2", "minh"), T(4, "apple")], 20);
  eq("streaks are grouped one call per lesson", plan.streaks.length, 2);
  eq("  carrying the queue rows they settle", plan.streaks[0].ids, [1, 2]);
  eq("  and the children", plan.streaks[0].studentIds, ["apple", "johnny"]);
  eq("tuition is planned per child-month", plan.tuition, [{ id: 4, generation: 0, studentId: "apple", month: "2026-10" }]);

  const many = Array.from({ length: 30 }, (_, i) => T(100 + i, `kid${i}`));
  eq("at most the per-run limit of tuition jobs - calculate-tuition allows 30 a minute",
     core.planDrain(many, 20).tuition.length, 20);
  eq("  the rest are left for the next run, oldest first", core.planDrain(many, 20).tuition[0].id, 100);

  const stuck = core.planDrain([T(1, "stuck", "2026-10", 5), T(2, "fresh"), T(3, "fresh2")], 2);
  eq("a job that keeps failing goes behind fresh ones, so it cannot starve them",
     stuck.tuition.map((j) => j.studentId), ["fresh", "fresh2"]);

  eq("nothing queued, nothing to do", core.planDrain(null, 20), { streaks: [], tuition: [] });
  eq("malformed rows are skipped, not guessed at",
     core.planDrain([{ id: 1, kind: "streak", student_id: "a" }, { id: 2, kind: "tuition", student_id: "b", month: "Oct" },
                     null, { id: "x", kind: "tuition" }], 20),
     { streaks: [], tuition: [] });
}
{
  const into = { applied: 2 };
  core.addCounts(into, { applied: 3, rejected: 1, junk: "x" });
  eq("outcome tallies add up, and junk is ignored", into, { applied: 5, rejected: 1 });
}

console.log("=== what a mark does in HEC (shared with mark-attendance) ===");
// A client that records what it was asked to do.
const fakeClient = (existingStreaks = []) => {
  const calls = { invoked: [], upserts: [], inserts: [] };
  const builder = (table) => {
    const b = {
      select: () => b, eq: () => b,
      in: async () => ({ data: table === "student_attendance_streaks" ? existingStreaks : [], error: null }),
      upsert: async (rows, opts) => { calls.upserts.push({ table, rows, opts }); return { error: null }; },
      insert: async (rows) => { calls.inserts.push({ table, rows }); return { error: null }; },
    };
    return b;
  };
  return {
    calls,
    from: builder,
    functions: { invoke: async (name, { body }) => { calls.invoked.push({ name, body }); return { data: null, error: null }; } },
  };
};
const today = new Date().toISOString().split("T")[0];
{
  const sb = fakeClient();
  await fx.afterAttendanceMarked(sb, { classId: "C", date: "2026-10-27", entries: [
    { studentId: "apple", status: "Absent" }, { studentId: "johnny", status: "Excused" }, { studentId: "minh", status: "Late" }] });
  eq("Absent and Excused recalculate tuition for that month",
     sb.calls.invoked.map((c) => [c.name, c.body.studentId, c.body.month]),
     [["calculate-tuition", "apple", "2026-10"], ["calculate-tuition", "johnny", "2026-10"]]);
  eq("  Late does not, as in HEC", sb.calls.invoked.some((c) => c.body.studentId === "minh"), false);
  eq("  and none of them touch streaks", sb.calls.upserts.length, 0);
}
{
  const sb = fakeClient();
  await fx.afterAttendanceMarked(sb, { classId: "C", date: "2026-10-27", entries: [{ studentId: "apple", status: "Present" }] });
  const row = sb.calls.upserts[0]?.rows[0];
  eq("a first Present starts a streak of 1", [row?.consecutive_days, row?.last_attendance_date], [1, today]);
  eq("  keyed so it updates rather than duplicates", sb.calls.upserts[0]?.opts, { onConflict: "student_id,class_id" });
  eq("  and no bonus yet", sb.calls.inserts.length, 0);
}
{
  const sb = fakeClient([{ student_id: "apple", consecutive_days: 4, last_attendance_date: "2026-01-01", bonuses_awarded: 0 }]);
  await fx.afterAttendanceMarked(sb, { classId: "C", date: "2026-10-27", entries: [{ studentId: "apple", status: "Present" }] });
  eq("the fifth consecutive lesson makes it 5", sb.calls.upserts[0]?.rows[0].consecutive_days, 5);
  const bonus = sb.calls.inserts[0]?.rows[0];
  eq("  and awards the 50-point bonus once", [bonus?.points, bonus?.type, sb.calls.inserts.length], [50, "participation", 1]);
  eq("  recorded as awarded", sb.calls.upserts[0]?.rows[0].bonuses_awarded, 1);
}
{
  const sb = fakeClient([{ student_id: "apple", consecutive_days: 5, last_attendance_date: today, bonuses_awarded: 1 }]);
  await fx.afterAttendanceMarked(sb, { classId: "C", date: "2026-10-27", entries: [{ studentId: "apple", status: "Present" }] });
  eq("marking again the same day does not advance the streak", sb.calls.upserts[0]?.rows[0].consecutive_days, 5);
  eq("  nor pay the bonus twice", sb.calls.inserts.length, 0);
}
{
  const sb = fakeClient();
  await fx.afterAttendanceMarked(sb, { classId: null, date: null, entries: [
    { studentId: "apple", status: "Present" }, { studentId: "johnny", status: "Absent" }] });
  eq("no class and no date: nothing is guessed", [sb.calls.upserts.length, sb.calls.invoked.length], [0, 0]);
}
{
  const sb = fakeClient();
  sb.from = () => { throw new Error("database down"); };
  let threw = false;
  try {
    await fx.afterAttendanceMarked(sb, { classId: "C", date: "2026-10-27", entries: [{ studentId: "apple", status: "Present" }] });
  } catch { threw = true; }
  ok("a failure in streaks never fails the mark that triggered it", !threw);
}

console.log("=== the two halves, separately - what the drain relies on ===");
{
  const sb = fakeClient();
  sb.functions.invoke = async (name, { body }) =>
    ({ data: null, error: body.studentId === "johnny" ? new Error("429 rate limited") : null });
  const failed = await fx.recalcTuition(sb, { date: "2026-10-27", entries: [
    { studentId: "apple", status: "Absent" }, { studentId: "johnny", status: "Excused" }, { studentId: "minh", status: "Present" }] });
  eq("recalcTuition reports how many calls were refused", failed, 1);
}
{
  const sb = fakeClient();
  eq("advanceStreaks reports success", await fx.advanceStreaks(sb, { classId: "C", entries: [{ studentId: "apple", status: "Present" }] }), true);
  const bad = fakeClient();
  const realFrom = bad.from;
  bad.from = (table) => {
    const b = realFrom(table);
    b.upsert = async () => ({ error: new Error("write failed") });
    return b;
  };
  eq("  and failure, when a write is refused - so the drain keeps the job",
     await fx.advanceStreaks(bad, { classId: "C", entries: [{ studentId: "apple", status: "Present" }] }), false);
}
{
  // The bug this fixes in mark-attendance's own path: a failed read used
  // to carry on with no streaks, and write every child back to 1.
  const sb = fakeClient();
  const realFrom = sb.from;
  sb.from = (table) => {
    const b = realFrom(table);
    b.in = async () => ({ data: null, error: new Error("read failed") });
    return b;
  };
  const ok2 = await fx.advanceStreaks(sb, { classId: "C", entries: [{ studentId: "apple", status: "Present" }] });
  eq("a failed streak read stops, rather than resetting everyone's streak to 1",
     [ok2, sb.calls.upserts.length], [false, 0]);
}

console.log("=== second review: streaks count lessons, bonuses are not lost ===");
// Remembers what it is written, so each step reads the one before it - as
// the drain does when it works through a child's backlog.
const streakStore = () => {
  const rows = new Map();
  const sb = {
    rows, bonuses: [], refuseBonus: false,
    from: (table) => {
      const b = {
        select: () => b, eq: () => b,
        in: async (_col, ids) => ({ data: [...rows.values()].filter((r) => ids.includes(r.student_id)), error: null }),
        upsert: async (list) => { for (const r of list) rows.set(r.student_id, { ...r }); return { error: null }; },
        insert: async (list) => {
          if (sb.refuseBonus) return { error: new Error("insert refused") };
          sb.bonuses.push(...list);
          return { error: null };
        },
      };
      return b;
    },
  };
  return sb;
};
const present = [{ studentId: "apple", status: "Present" }];
{
  const sb = streakStore();
  for (const d of ["2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"]) {
    await fx.advanceStreaks(sb, { classId: "C", lessonDate: d, entries: present });
  }
  const r = sb.rows.get("apple");
  eq("a backlog of five lessons drained in one run is five steps, not one",
     [r.consecutive_days, r.last_attendance_date], [5, "2026-10-24"]);
  eq("  and earns the fifth-lesson bonus", sb.bonuses.length, 1);
  await fx.advanceStreaks(sb, { classId: "C", lessonDate: "2026-10-24", entries: present });
  eq("working the same lesson again is not another step", sb.rows.get("apple").consecutive_days, 5);
  eq("  nor another bonus", sb.bonuses.length, 1);
  await fx.advanceStreaks(sb, { classId: "C", lessonDate: "2026-10-19", entries: present });
  eq("an earlier lesson worked late still counts",
     sb.rows.get("apple").consecutive_days, 6);
  eq("  without moving the latest lesson back", sb.rows.get("apple").last_attendance_date, "2026-10-24");
}
{
  const sb = streakStore();
  sb.rows.set("apple", { student_id: "apple", consecutive_days: 4, last_attendance_date: "2026-10-23", bonuses_awarded: 0 });
  sb.refuseBonus = true;
  const first = await fx.advanceStreaks(sb, { classId: "C", lessonDate: "2026-10-24", entries: present });
  eq("a refused bonus fails the job, so the drain keeps it", first, false);
  eq("  the streak still moves to 5", sb.rows.get("apple").consecutive_days, 5);
  eq("  but is not marked as having paid the bonus", sb.rows.get("apple").bonuses_awarded, 0);
  sb.refuseBonus = false;
  const again = await fx.advanceStreaks(sb, { classId: "C", lessonDate: "2026-10-24", entries: present });
  eq("the retry pays it", [again, sb.bonuses.length, sb.rows.get("apple").bonuses_awarded], [true, 1, 1]);
  eq("  without stepping the streak twice", sb.rows.get("apple").consecutive_days, 5);
}
{
  const S = (id, session, date, generation = 0) => ({ id, kind: "streak", student_id: "k" + id, class_id: "C",
                                                       session_id: session, lesson_date: date, attempts: 0, generation });
  const plan = core.planDrain([S(1, "late", "2026-10-24", 2), S(2, "early", "2026-10-20"), S(3, "mid", "2026-10-22")], 20);
  eq("streak steps are worked in lesson order, whatever order they were queued in",
     plan.streaks.map((b) => b.lessonDate), ["2026-10-20", "2026-10-22", "2026-10-24"]);
  eq("  each carrying the generation it read", plan.streaks[2].generations, [2]);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
