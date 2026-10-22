// Which lessons a person is paid for - the rule both calculate-payroll
// and the admin Payroll screen now read instead of each restating it.
// Drives the real src/lib/payrollSessions.ts.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { transform } from "esbuild";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC = resolve(repo, "src/lib/payrollSessions.ts");
const TMP = resolve(tmpdir(), `payrollSessions.${process.pid}.mjs`);
writeFileSync(TMP, (await transform(readFileSync(SRC, "utf8"), { loader: "ts", format: "esm" })).code);
const m = await import(pathToFileURL(TMP).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };

const S = (id, status) => ({ id, status });

console.log("=== which lessons count ===");
{
  const all = [S("a", "Held"), S("b", "Scheduled"), S("c", "Canceled"), S("d", "Held")];
  const { actual, pending, projected } = m.splitByStatus(all);
  ok("held lessons are what is owed now", actual.map((s) => s.id).join(",") === "a,d");
  ok("scheduled ones are not owed yet", pending.map((s) => s.id).join(",") === "b");
  ok("projected is both together", projected.map((s) => s.id).join(",") === "a,b,d");
  ok("a cancelled lesson is in none of them",
     ![...actual, ...pending, ...projected].some((s) => s.id === "c"));
  ok("  so actual plus pending is exactly projected",
     actual.length + pending.length === projected.length);
}
{
  const { actual, pending, projected } = m.splitByStatus(null);
  ok("null is three empty lists, not a crash",
     actual.length === 0 && pending.length === 0 && projected.length === 0);
  ok("an unknown status counts as nothing",
     m.splitByStatus([S("x", "Holiday"), S("y", null), S("z", undefined)]).projected.length === 0);
}

console.log("=== which assistant rosters are paid ===");
const P = (over = {}) => ({
  session_id: "s1", teaching_assistant_id: "ta1",
  participant_type: "teaching_assistant", attended: true, ...over,
});
{
  ok("a present assistant is paid", m.participationIsPayable(P()));
  ok("an absent one is not", !m.participationIsPayable(P({ attended: false })));
  ok("a teacher participation row is not an assistant's pay",
     !m.participationIsPayable(P({ participant_type: "teacher" })));
  ok("a row with no session is not payable", !m.participationIsPayable(P({ session_id: null })));
  ok("a row with no assistant is not payable",
     !m.participationIsPayable(P({ teaching_assistant_id: null })));
  ok("null is not payable", !m.participationIsPayable(null));
}
{
  // attended is NOT NULL DEFAULT true in the database, so only an
  // explicit false is an absence. Anything else must mean present -
  // withholding pay because a query forgot to select the column would
  // be the worse failure.
  ok("a missing attended column counts as present",
     m.participationIsPayable(P({ attended: undefined })));
  ok("a null attended counts as present", m.participationIsPayable(P({ attended: null })));
}

console.log("=== grouping ===");
{
  const map = m.payableSessionIdsByAssistant([
    P({ session_id: "s1" }),
    P({ session_id: "s2" }),
    P({ session_id: "s3", attended: false }),
    P({ session_id: "s4", teaching_assistant_id: "ta2" }),
    P({ session_id: "s5", participant_type: "teacher" }),
  ]);
  ok("each assistant gets their own lessons", map.get("ta1").sort().join(",") === "s1,s2");
  ok("  without the one they missed", !map.get("ta1").includes("s3"));
  ok("another assistant is kept separate", map.get("ta2").join(",") === "s4");
  ok("a teacher row creates nobody", map.size === 2, String(map.size));
}
{
  // A lesson can carry more than one roster row for the same assistant.
  const map = m.payableSessionIdsByAssistant([
    P({ session_id: "s1" }), P({ session_id: "s1" }), P({ session_id: "s1" }),
  ]);
  ok("a duplicated roster row does not pay them twice",
     map.get("ta1").length === 1, JSON.stringify(map.get("ta1")));
}
{
  ok("nothing in, nothing out", m.payableSessionIdsByAssistant(null).size === 0);
  ok("  and an all-absent assistant is absent from the map entirely",
     m.payableSessionIdsByAssistant([P({ attended: false })]).size === 0);
}

console.log("=== the constants both callers query on ===");
{
  ok("actual is Held", [...m.ACTUAL_SESSION_STATUSES].join(",") === "Held");
  ok("projected is Held and Scheduled",
     [...m.PROJECTED_SESSION_STATUSES].join(",") === "Held,Scheduled");
  ok("  and actual is a subset of projected",
     [...m.ACTUAL_SESSION_STATUSES].every((s) => [...m.PROJECTED_SESSION_STATUSES].includes(s)));
  ok("neither includes a cancellation",
     ![...m.PROJECTED_SESSION_STATUSES].includes("Canceled"));
  ok("the participant type is the one the database stores",
     m.ASSISTANT_PARTICIPANT_TYPE === "teaching_assistant");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
