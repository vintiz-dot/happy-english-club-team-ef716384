// The Stars Sync records screen, without the screen.
//
// stars_sync_events says "Pixel Pal child 121 is not matched to an HEC
// child." What an admin needs is whose record that is, why it is stuck and
// what would unstick it - and to slice a few thousand of them any way they
// like. Drives the real src/lib/starsRecords.ts. All the children here are
// made up.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({
  entryPoints: [resolve(repo, "src/lib/starsRecords.ts")],
  bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
});
const file = join(mkdtempSync(join(tmpdir(), "stars-records-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const {
  toRecord, toRecords, filterRecords, sortRecords, groupRecords, computeFacets, countResults, findBlockers,
  applyPreset, viewMatchesPreset, clearFilters, countActiveFilters, reviveView, resultOf, kindOf,
  BLANK_VIEW, VIEW_PRESETS, DEFAULT_COLUMNS,
} = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

let nextSeq = 1;
const row = (over = {}) => {
  const seq = over.seq ?? nextSeq++;
  return {
    event_id: `00000000-0000-4000-8000-${String(seq).padStart(12, "0")}`,
    seq, kind: "attendance", outcome: "applied", outcome_note: "Marked Present.",
    lesson_date: "2026-10-20", stars_class_id: "19", stars_student_id: "88",
    processed_at: `2026-10-20T0${seq % 10}:00:00Z`, received_at: "2026-10-20T00:00:00Z", attempts: 1,
    payload: { status: "Present" }, occurred_at: "2026-10-20T00:00:00Z", applied_ref: null,
    ...over,
  };
};
const ctx = {
  classes: new Map([["19", "Stars"], ["12", "Sanrio Grade 6"]]),
  children: new Map([["88", { studentId: "s88", name: "Nguyễn Gia Bình" }], ["89", { studentId: "s89", name: "Lê Hà My" }]]),
  pixelPalChildren: new Map([["121", "Pumpkin"], ["88", "Bin"]]),
  pixelPalClasses: new Map([["44", "Comets"]]),
};
const unlinked = (over = {}) => row({
  outcome: "skipped_unmapped", stars_student_id: "121",
  outcome_note: "Pixel Pal child 121 is not matched to an HEC child.", ...over,
});

// -------------------------------------------------------------- reading
console.log("=== reading a record ===");
{
  const r = toRecord(unlinked(), ctx);
  eq("a stuck record is waiting", r.result, "waiting");
  eq("  because the child is not linked", r.why, "child_unlinked");
  eq("  shown by Pixel Pal's name, not its number", r.childName, "Pumpkin");
  ok("  the note says the name", r.note.includes("Pumpkin") && !r.note.includes("121"));
  eq("  and it says where to fix it", r.fix, "link_child");
  eq("the class reads as HEC's", r.className, "Stars");
}
{
  const r = toRecord(unlinked({ stars_student_id: "999", outcome_note: "Pixel Pal child 999 is not matched to an HEC child." }), ctx);
  eq("with no name yet, the number is all there is", r.childName, "Pixel Pal child no. 999");
}
eq("a linked child shows HEC's name", toRecord(row(), ctx).childName, "Nguyễn Gia Bình");
eq("  and keeps Pixel Pal's for searching", toRecord(row(), ctx).pixelPalName, "Bin");
{
  const r = toRecord(row({
    outcome: "skipped_unmapped", stars_class_id: "44", stars_student_id: "88",
    outcome_note: "Pixel Pal class 44 is not mapped to an HEC class.",
  }), ctx);
  eq("an unmapped class is told from an unlinked child", r.why, "class_unmapped");
  eq("  by Pixel Pal's name for it", r.className, "Comets (Pixel Pal)");
  eq("  and it says where to fix that", r.fix, "link_class");
}
{
  const r = toRecord(unlinked({
    stars_student_id: "88", outcome_note: "Pixel Pal child 88 is not matched to an HEC child.",
  }), ctx);
  eq("linked since it last ran: it says so, rather than the stale reason", r.why, "just_linked");
  eq("  and nothing is left to fix", r.fix, null);
}
{
  const r = toRecord(row({ kind: "points", payload: { points: 5, category: "homework", reason: "workbook" } }), ctx);
  eq("points read as what they are", r.what, "+5 homework: workbook");
  eq("  homework by category", r.aboutHomework, true);
  eq("  not a look-alike", r.homeworkLookalike, false);
}
for (const reason of ["BTVN tuần 3", "HW done", "Bài tập unit 4", "homework!", "workbook p12"]) {
  const r = toRecord(row({ kind: "points", payload: { points: 2, category: "participation", reason } }), ctx);
  eq(`"${reason}" filed as participation is flagged as homework by another name`, r.homeworkLookalike, true);
}
eq("  and an ordinary reason is not", toRecord(row({ kind: "points", payload: { points: 2, category: "participation", reason: "great answer" } }), ctx).homeworkLookalike, false);
eq("a deduction reads with its sign", toRecord(row({ kind: "points", payload: { points: -3, category: "adjustment" } }), ctx).what, "-3 adjustment");
eq("a homework record shows its title", toRecord(row({ kind: "homework", stars_student_id: null, payload: { title: "Unit 4", homework_ref: "h1" } }), ctx).what, "Unit 4");
eq("  and has no child", toRecord(row({ kind: "homework", stars_student_id: null, payload: { title: "Unit 4" } }), ctx).childName, "—");
eq("a grade shows the grade and the points",
   toRecord(row({ kind: "grade", payload: { grade: "8/10", points: 5, homework_ref: "h1" } }), ctx).what, "Grade 8/10, +5 points");
eq("a kind nobody has heard of still reads", toRecord(row({ kind: "stickers", payload: {} }), ctx).what, 'A "stickers" record');
eq("  as 'other'", kindOf("stickers"), "other");

for (const [outcome, want] of [["applied", "applied"], ["conflict", "settle"], ["retracted", "withdrawn"], ["rejected", "refused"],
  ["duplicate", "duplicate"], ["skipped_before_start", "before_start"], ["skipped_no_session", "waiting"], ["skipped_something_new", "waiting"]]) {
  eq(`${outcome} is ${want}`, resultOf(outcome), want);
}

for (const [note, want] of [
  ["This was recorded more than 24 hours after the lesson ended.", "late"],
  ["7 points is over the limit of 5 for one award.", "over_limit"],
  ["The Stars lesson on 2026-10-20 is cancelled in HEC.", "cancelled"],
  ["The lesson (2026-08-01) is more than 60 days old.", "too_old"],
  ["The lesson date 2027-01-01 is in the future.", "future"],
  ['"Maybe" is not an attendance status HEC knows.', "unreadable"],
  ["HEC refused this: something", "refused_other"],
]) {
  eq(`refused: "${note.slice(0, 34)}..." is ${want}`, toRecord(row({ outcome: "rejected", outcome_note: note }), ctx).why, want);
}

{
  const target = row({ seq: 500, stars_student_id: "121", outcome: "retracted", outcome_note: "x" });
  const withdrawal = row({ seq: 501, kind: "retraction", stars_student_id: null, stars_class_id: null, lesson_date: null,
    payload: { retracts_event_id: target.event_id, reason: "changed" }, outcome_note: "Withdrew a record that had not applied." });
  const [, w] = toRecords([target, withdrawal], ctx);
  eq("a withdrawal with no child of its own takes the one it withdraws", w.childName, "Pumpkin");
  eq("  and the class", w.className, "Stars");
  eq("  and the lesson", w.lessonDate, "2026-10-20");
  eq("  and says what happened", w.what, "Withdrew a record: changed in Pixel Pal");
}
{
  const hw = row({ seq: 510, kind: "homework", stars_student_id: null, payload: { homework_ref: "h9", title: "Unit 4" } });
  const gr = row({ seq: 511, kind: "grade", payload: { homework_ref: "h9", grade: "A" } });
  eq("a grade names the homework it belongs to", toRecords([hw, gr], ctx)[1].what, "Grade A on Unit 4");
}

// ------------------------------------------------------------ the view
console.log("=== filtering ===");
const rows = [
  row({ seq: 601, stars_student_id: "88", lesson_date: "2026-10-20" }),
  row({ seq: 602, stars_student_id: "89", lesson_date: "2026-10-21", kind: "points", payload: { points: 5, category: "participation" }, outcome_note: "+5 points" }),
  unlinked({ seq: 603, lesson_date: "2026-10-22" }),
  unlinked({ seq: 604, lesson_date: "2026-10-22", kind: "points", payload: { points: 7, category: "homework" } }),
  row({ seq: 605, stars_class_id: "12", stars_student_id: "89", outcome: "rejected", outcome_note: "This was recorded more than 24 hours after the lesson ended.", lesson_date: "2026-10-23" }),
  row({ seq: 606, outcome: "conflict", outcome_note: "HEC has Absent, Pixel Pal says Present.", lesson_date: "2026-10-24" }),
];
const records = toRecords(rows, ctx);
const view = (over = {}) => ({ ...BLANK_VIEW, ...over });
const seqs = (list) => list.map((r) => r.seq).join(",");
eq("no filters shows everything", filterRecords(records, view()).length, 6);
eq("by result", seqs(filterRecords(records, view({ results: ["waiting"] }))), "603,604");
eq("by more than one result", seqs(filterRecords(records, view({ results: ["refused", "settle"] }))), "605,606");
eq("by type", seqs(filterRecords(records, view({ kinds: ["points"] }))), "602,604");
eq("by class", seqs(filterRecords(records, view({ classes: ["12"] }))), "605");
eq("by child", seqs(filterRecords(records, view({ children: ["121"] }))), "603,604");
eq("by reason", seqs(filterRecords(records, view({ whys: ["late"] }))), "605");
eq("by points category", seqs(filterRecords(records, view({ categories: ["homework"] }))), "604");
eq("by date, from", seqs(filterRecords(records, view({ from: "2026-10-23" }))), "605,606");
eq("by date, to", seqs(filterRecords(records, view({ to: "2026-10-20" }))), "601");
eq("by homework", seqs(filterRecords(records, view({ homeworkOnly: true }))), "604");
eq("filters combine", seqs(filterRecords(records, view({ results: ["waiting"], kinds: ["points"] }))), "604");
eq("search ignores accents", seqs(filterRecords(records, view({ search: "gia binh" }))), "601,606");
eq("search finds Pixel Pal's name for a linked child", seqs(filterRecords(records, view({ search: "bin", children: ["88"] }))), "601,606");
eq("search finds the number", seqs(filterRecords(records, view({ search: "121" }))), "603,604");
eq("search words all have to match", seqs(filterRecords(records, view({ search: "pumpkin homework" }))), "604");
eq("search with nothing in it finds nothing", filterRecords(records, view({ search: "zzz" })).length, 0);

console.log("=== what each filter offers ===");
{
  const f = computeFacets(records, view({ results: ["waiting"] }));
  eq("ticking Waiting does not zero the other results", f.results.find((o) => o.value === "applied").count, 2);
  eq("  they keep their order of importance", f.results[0].value, "settle");
  eq("other filters count within it", f.classes.find((o) => o.value === "19").count, 2);
  ok("  a class with nothing in it drops off", !f.classes.some((o) => o.value === "12"));
  eq("children read by name", f.children[0].label, "Pumpkin");
  ok("  and flag that they are not linked", f.children[0].sublabel.includes("not linked"));
  const ticked = computeFacets(records, view({ results: ["waiting"], classes: ["12"] }));
  eq("something ticked stays on the list at 0, or it could not be unticked", ticked.classes.find((o) => o.value === "12").count, 0);
}

console.log("=== sorting ===");
eq("lesson date, newest first", sortRecords(records, "lesson", true)[0].seq, 606);
eq("  or oldest first", sortRecords(records, "lesson", false)[0].seq, 601);
eq("by result, what needs a person first", sortRecords(records, "result", false)[0].seq, 606);
eq("  refused next", sortRecords(records, "result", false)[1].seq, 605);
eq("by child, by name", sortRecords(records, "child", false)[0].childName, "Lê Hà My");
ok("equal records keep a fixed order, newest first",
   sortRecords(records, "class", false).filter((r) => r.className === "Stars").every((r, i, a) => i === 0 || a[i - 1].seq > r.seq));
eq("sorting does not disturb the original", records[0].seq, 601);

console.log("=== grouping ===");
{
  const groups = groupRecords(records, "child", true);
  eq("whoever needs the most attention comes first", groups[0].label, "Pumpkin");
  eq("  counted by result", groups[0].counts.waiting, 2);
  eq("  with the points held up", groups[0].waitingPoints, 7);
  eq("  and what would fix it", groups[0].linkChild, "121");
  ok("  and their number, because it is not linked", groups[0].sublabel.includes("not linked"));
  const my = groups.find((g) => g.label === "Lê Hà My");
  eq("points already applied are counted apart", my.appliedPoints, 5);
  eq("  and a linked child has nothing to link", my.linkChild, null);
}
eq("no grouping is no groups", groupRecords(records, "none", true).length, 0);
eq("by lesson, newest first", groupRecords(records, "lesson", true)[0].key, "2026-10-24");
eq("  or oldest", groupRecords(records, "lesson", false)[0].key, "2026-10-20");
eq("by result, in order of importance", groupRecords(records, "result", true)[0].label, "To settle");
eq("by reason, largest first", groupRecords(records.filter((r) => r.why), "why", true)[0].label, "Child not linked");
eq("by type", groupRecords(records, "kind", true)[0].label, "Register");

console.log("=== blockers ===");
{
  const more = toRecords([
    ...rows,
    unlinked({ seq: 620, stars_student_id: "999", outcome_note: "Pixel Pal child 999 is not matched to an HEC child." }),
    row({ seq: 621, outcome: "skipped_unmapped", stars_class_id: "44", outcome_note: "Pixel Pal class 44 is not mapped to an HEC class." }),
    row({ seq: 622, kind: "homework", outcome: "skipped_unsupported", stars_student_id: null, outcome_note: "x" }),
    row({ seq: 623, kind: "homework", outcome: "skipped_unsupported", stars_student_id: null, outcome_note: "x" }),
    row({ seq: 624, outcome: "skipped_not_permitted", outcome_note: "The lesson has not started in HEC yet." }),
    row({ seq: 625, stars_student_id: "88", outcome: "skipped_unmapped", outcome_note: "Pixel Pal child 88 is not matched to an HEC child." }),
  ], ctx);
  const b = findBlockers(more);
  eq("the biggest comes first", b[0].key, "child:121");
  eq("  with what it holds up", b[0].count, 2);
  eq("  and the points in it", b[0].points, 7);
  ok("  and the child's name, not just their number", b[0].headline.includes("Pumpkin") && b[0].headline.includes("121"));
  eq("  and where to fix it", b[0].fix, "link_child");
  ok("each child is their own blocker", b.some((x) => x.key === "child:999"));
  ok("  and with no name, by number", b.find((x) => x.key === "child:999").headline.startsWith("Pixel Pal child no. 999"));
  ok("an unmapped class is its own blocker", b.find((x) => x.key === "class:44").headline.includes("Comets"));
  eq("records of a kind HEC cannot take are one blocker", b.find((x) => x.key === "kind:homework").count, 2);
  ok("a lesson that has not started is not something to fix", !b.some((x) => x.why === "not_started"));
  ok("a child linked since it last ran is not something to fix", !b.some((x) => x.childRef === "88" && x.why === "just_linked"));
  ok("what already applied is not a blocker", !b.some((x) => x.key === "applied"));
}
eq("results count up", countResults(records).waiting, 2);

console.log("=== views ===");
{
  const custom = { ...BLANK_VIEW, columns: ["child", "what"], density: "compact", pageSize: 200, search: "old" };
  const attention = VIEW_PRESETS.find((p) => p.key === "attention");
  const applied = applyPreset(custom, attention, "2026-11-04");
  eq("a preset replaces the old search", applied.search, "");
  eq("  sets its own filters", applied.results.length, 3);
  eq("  keeps the columns someone chose", applied.columns.length, 2);
  eq("  and the density", applied.density, "compact");
  eq("  and the page size", applied.pageSize, 200);
  ok("a view knows which preset it is", viewMatchesPreset(applied, attention, "2026-11-04"));
  ok("  and stops being it when a filter changes", !viewMatchesPreset({ ...applied, kinds: ["points"] }, attention, "2026-11-04"));

  const today = applyPreset(BLANK_VIEW, VIEW_PRESETS.find((p) => p.key === "today"), "2026-11-04");
  eq("today is today", today.from, "2026-11-04");
  // 4 Nov 2026 is a Wednesday, so its week starts on Monday the 2nd.
  eq("this week starts on Monday", applyPreset(BLANK_VIEW, VIEW_PRESETS.find((p) => p.key === "week"), "2026-11-04").from, "2026-11-02");
  eq("  even on a Sunday", applyPreset(BLANK_VIEW, VIEW_PRESETS.find((p) => p.key === "week"), "2026-11-08").from, "2026-11-02");

  eq("clearing filters keeps the layout", clearFilters(custom).columns.length, 2);
  eq("  and clears the search", clearFilters(custom).search, "");
  eq("active filters are counted", countActiveFilters({ ...BLANK_VIEW, search: "x", kinds: ["points"], from: "2026-01-01", to: "2026-02-01" }), 3);
  eq("  none is none", countActiveFilters(BLANK_VIEW), 0);
}
{
  eq("rubbish from storage is ignored", reviveView("nope"), null);
  eq("  and a broken view", reviveView({ results: "waiting" }), null);
  const old = reviveView({ results: ["waiting"], somethingOld: 1 });
  eq("a view from an older version keeps what it had", old.results[0], "waiting");
  eq("  and gains what it lacked", old.groupBy, "none");
  eq("a nonsense page size is corrected", reviveView({ pageSize: 7 }).pageSize, 50);
  eq("columns that no longer exist fall back", reviveView({ columns: ["gone"] }).columns, DEFAULT_COLUMNS);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
