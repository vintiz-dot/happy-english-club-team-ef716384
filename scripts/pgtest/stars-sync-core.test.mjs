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

console.log("=== which after-effects a page needs ===");
{
  const A = (session, student, status) => ({ type: "attendance", session_id: session, student_id: student,
                                              class_id: "C", date: "2026-10-27", status });
  const R = (session, student) => ({ type: "restore", session_id: session, student_id: student, month: "2026-10" });

  const plan = core.planEffects([A("s1", "apple", "Present"), A("s1", "johnny", "Absent")]);
  eq("one lesson is one call, with both children", plan.attendance.length, 1);
  eq("  carrying their marks", plan.attendance[0].entries.map((e) => e.status).sort(), ["Absent", "Present"]);

  const flip = core.planEffects([A("s1", "apple", "Present"), R("s1", "apple"), A("s1", "apple", "Absent")]);
  eq("a mark, its withdrawal and a replacement: only where the child ended up counts",
     flip.attendance[0].entries, [{ studentId: "apple", status: "Absent" }]);
  ok("  so no streak is credited for the Present that was replaced",
     !flip.attendance.some((g) => g.entries.some((e) => e.status === "Present")));
  eq("  but the withdrawal's tuition recalculation is kept", flip.tuition, [{ studentId: "apple", month: "2026-10" }]);

  const gone = core.planEffects([A("s1", "apple", "Present"), R("s1", "apple")]);
  eq("a mark then withdrawn: no attendance effect", gone.attendance.length, 0);
  eq("  only the tuition recalculation", gone.tuition.length, 1);

  const twice = core.planEffects([R("s1", "apple"), R("s2", "apple")]);
  eq("two withdrawals in one month recalculate that month once", twice.tuition.length, 1);

  eq("nothing in, nothing out", core.planEffects(null), { attendance: [], tuition: [] });
  eq("rubbish is ignored rather than crashing",
     core.planEffects([null, 7, { type: "other" }, { type: "attendance" }]), { attendance: [], tuition: [] });
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
