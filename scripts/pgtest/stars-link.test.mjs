// "Who is this child?" - the reasoning behind the Stars Sync link tool.
//
// A wrong link moves one child's register and points onto another, so what
// these assert is mostly about being careful: two children called Minh are
// a question and not a guess, a child already linked is never offered, a
// "no" is never asked again, and every answer makes the next question
// easier. Drives the real src/lib/starsLink.ts, starsNames.ts and
// starsRoster.ts. All the children here are made up.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const bundle = async (rel) => {
  const out = await build({
    entryPoints: [resolve(repo, rel)], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent",
  });
  const file = join(mkdtempSync(join(tmpdir(), "stars-link-")), "module.mjs");
  writeFileSync(file, out.outputFiles[0].text);
  return import(pathToFileURL(file).href);
};
const { buildQuestions, auditLinks, suggestClass, displayName } = await bundle("src/lib/starsLink.ts");
const { nameAffinity, foldText } = await bundle("src/lib/starsNames.ts");
const { parsePastedRoster, readRoster } = await bundle("src/lib/starsRoster.ts");

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, got === want, got === want ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// --------------------------------------------------------------- names
console.log("=== names ===");
eq("accents and đ fold away", foldText("Nguyễn Đức Bình"), "nguyen duc binh");
eq("the same name scores 1", nameAffinity("Apple", "Apple").score, 1);
eq("  and so does the same name written differently", nameAffinity("Ka Ka", "Kaka").score, 1);
ok("a nickname that is the front of the name is a strong match",
   nameAffinity("Bin", "Nguyễn Gia Bình").score >= 0.75, String(nameAffinity("Bin", "Nguyễn Gia Bình").score));
ok("  and says which words it means", nameAffinity("Bin", "Nguyễn Gia Bình").why.includes("Bin") && nameAffinity("Bin", "Nguyễn Gia Bình").why.includes("Bình"));
eq("a whole nickname inside the full name is 'contains'", nameAffinity("Minh Duc", "Trần Minh Đức").kind, "contains");
ok("  which is strong, but short of the exact name", nameAffinity("Minh Duc", "Trần Minh Đức").score < 1 && nameAffinity("Minh Duc", "Trần Minh Đức").score > 0.9);
ok("a family name alone says little - half the class shares it",
   nameAffinity("Nguyen", "Nguyễn Gia Bình").score < 0.45, String(nameAffinity("Nguyen", "Nguyễn Gia Bình").score));
eq("'Bé' in front of a name is not part of it", nameAffinity("Bé Na", "Phạm Na").kind, "contains");
eq("names with nothing in common score 0", nameAffinity("Apple", "Nguyễn Gia Bình").score, 0);
ok("a misspelling still counts", nameAffinity("Jonny", "Johnny").score >= 0.7, String(nameAffinity("Jonny", "Johnny").score));
eq("no name scores 0, not a crash", nameAffinity(null, "Apple").score, 0);

// ------------------------------------------------------------ fixtures
const STARS = "class-stars", SANRIO = "class-sanrio";
const kid = (id, name, klass = STARS, extra = {}) => ({
  id, name, active: true,
  enrollments: klass ? [{ classId: klass, start: "2026-09-01", end: null, allowedDays: null, ...extra }] : [],
});
const pal = (ref, name, classRefs = ["19"]) => ({ ref, name, classRefs });
const mark = (ref, date, status, over = {}) => ({ ref, classRef: "19", date, kind: "attendance", status, waiting: true, ...over });
const award = (ref, date, points, over = {}) => ({ ref, classRef: "19", date, kind: "points", points, waiting: true, ...over });
const inputs = (over = {}) => ({
  children: [], records: [], hecChildren: [], marks: [], awards: [],
  classMap: new Map([["19", STARS], ["12", SANRIO]]),
  classNames: new Map([[STARS, "Stars"], [SANRIO, "Sanrio Grade 6"]]),
  links: new Map(),
  today: "2026-11-04",
  ...over,
});
const only = (qs, ref) => qs.find((q) => q.child.ref === ref);

// ----------------------------------------------------------- the question
console.log("=== asking the right question ===");
{
  const q = buildQuestions(inputs({
    children: [pal("121", "Bin")],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt")],
    records: [mark("121", "2026-10-20", "Absent"), award("121", "2026-10-22", 5)],
  }))[0];
  eq("one child stands out: a yes or no", q.mode, "confirm");
  eq("  asked in plain words, names first", q.question, "Is Bin from Pixel Pal Nguyễn Gia Bình on HEC?");
  eq("  the likely child is first", q.candidates[0].studentId, "a");
  ok("  says why", q.candidates[0].reasons.some((r) => r.sign === 1 && r.text.includes("Bình")));
  eq("  and counts what a yes would apply", q.waiting.records, 2);
  eq("  - the marks", q.waiting.marks, 1);
  eq("  - the points", q.waiting.pointsTotal, 5);
  eq("  - and there are no grades", q.waiting.grades, 0);
  eq("  - and the days away", q.waiting.absences[0], "2026-10-20");
}
{
  const q = buildQuestions(inputs({
    children: [pal("7", "Minh")],
    hecChildren: [kid("a", "Nguyễn Hoàng Minh"), kid("b", "Trần Quang Minh"), kid("c", "Lê Hà My")],
  }))[0];
  eq("two children called Minh: it asks which, it does not pick", q.mode, "choose");
  eq("  and says so", q.question, "2 children in Stars could be Minh. Which one is it?");
  ok("  neither is presented as likely", q.candidates[0].confidence < 0.6, String(q.candidates[0].confidence));
}
{
  const q = buildQuestions(inputs({
    children: [pal("121", null)],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt")],
  }))[0];
  eq("no name and no evidence: it asks who, from the class", q.mode, "choose");
  eq("  by number, because that is all there is", q.question, "Who is Pixel Pal's child no. 121?");
  ok("  and says why it has no name", (q.hint ?? "").includes("has not told us"));
  eq("  offering the whole class", q.candidates.length, 3);
  eq("displayName falls back to the number", displayName({ ref: "121", name: null }), "Pixel Pal child no. 121");
}
{
  const q = buildQuestions(inputs({
    children: [pal("121", null)],
    records: [mark("121", "2026-10-13", "Absent"), mark("121", "2026-10-20", "Absent"), mark("121", "2026-10-22", "Present")],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt")],
    marks: [
      { studentId: "b", classId: STARS, date: "2026-10-13", status: "Absent" },
      { studentId: "b", classId: STARS, date: "2026-10-20", status: "Absent" },
      { studentId: "a", classId: STARS, date: "2026-10-13", status: "Present" },
    ],
  }))[0];
  eq("with no name, the register alone can find them", q.candidates[0].studentId, "b");
  eq("  firmly enough to ask yes or no", q.mode, "confirm");
  eq("  by number", q.question, "Is Pixel Pal's child no. 121 Lê Hà My on HEC?");
  ok("  naming the days", q.candidates[0].reasons.some((r) => r.text.includes("13 Oct") && r.text.includes("20 Oct")));
  ok("the child marked here the day Pixel Pal says away counts against",
     q.candidates.find((c) => c.studentId === "a").reasons.some((r) => r.sign === -1 && r.text.includes("disagree")));
}

{
  const q = buildQuestions(inputs({
    children: [pal("121", "Bin")],
    hecChildren: [kid("a", "Nguyễn Gia Bình")],
    records: [{ ref: "121", classRef: "19", date: "2026-10-20", kind: "grade", points: 4, waiting: true }],
  }))[0];
  eq("a grade counts as waiting too", q.waiting.grades, 1);
  eq("  with its points", q.waiting.pointsTotal, 4);
}

console.log("=== never offering the wrong child ===");
{
  const qs = buildQuestions(inputs({
    children: [pal("121", "Bin"), pal("88", "Apple")],
    links: new Map([["88", "z"]]),
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("z", "Bin Trần")],
  }));
  eq("a Pixel Pal child already linked is not asked about", qs.length, 1);
  ok("a HEC child already linked is never offered", !qs[0].candidates.some((c) => c.studentId === "z"));
}
{
  const before = buildQuestions(inputs({
    children: [pal("7", "Minh")],
    hecChildren: [kid("a", "Nguyễn Hoàng Minh"), kid("b", "Lê Hà My"), kid("c", "Trần Bảo Long")],
  }))[0];
  eq("a good name is asked as yes or no", before.mode, "confirm");
  const after = buildQuestions(inputs({
    children: [pal("7", "Minh")],
    rejected: new Set(["7:a"]),
    hecChildren: [kid("a", "Nguyễn Hoàng Minh"), kid("b", "Lê Hà My"), kid("c", "Trần Bảo Long")],
  }))[0];
  ok("a 'no' is never asked again", !after.candidates.some((c) => c.studentId === "a"));
  eq("  and the question changes with it", after.mode, "choose");
  eq("  and it remembers how many were ruled out", after.ruledOut, 1);
}
{
  const q = buildQuestions(inputs({
    children: [pal("9", "Apple")],
    hecChildren: [kid("a", "Apple", SANRIO), kid("b", "Lê Hà My", SANRIO)],
  }))[0];
  ok("a child in another class is offered only with a matching name", q.candidates.length === 1 && q.candidates[0].studentId === "a");
  eq("  flagged as outside the class", q.candidates[0].inClass, false);
  ok("  with the reason shown", q.candidates[0].reasons.some((r) => r.sign === -1 && r.text.includes("Not enrolled in Stars")));
}
{
  const q = buildQuestions(inputs({
    children: [pal("9", "Bin")],
    hecChildren: [kid("a", "Lê Hà My", SANRIO)],
  }))[0];
  eq("nobody plausible: go and search, do not guess", q.mode, "search");
  eq("  by name", q.question, "Who is Bin from Pixel Pal on HEC?");
}
{
  const q = buildQuestions(inputs({
    children: [pal("9", "Bin", ["44"])],
    pixelPalClassNames: new Map([["44", "Comets"]]),
    hecChildren: [kid("a", "Nguyễn Gia Bình")],
  }))[0];
  eq("a class nobody mapped comes first", q.mode, "class_first");
  ok("  and names it", q.question.includes("Comets"));
}
{
  const late = kid("a", "Nguyễn Gia Bình");
  late.enrollments[0].start = "2026-10-25";
  const q = buildQuestions(inputs({
    children: [pal("121", "Binh")],
    hecChildren: [late, kid("b", "Trần Thanh Bình")],
    records: [mark("121", "2026-10-13", "Present"), mark("121", "2026-10-20", "Present")],
  }))[0];
  eq("enrolled on the lesson days beats not enrolled", q.candidates[0].studentId, "b");
  ok("  and the other says why not", q.candidates[1].reasons.some((r) => r.sign === -1 && r.text.includes("Not enrolled on 2")));
}
{
  // 2026-11-02 is a Monday, 2026-11-03 a Tuesday.
  const mondays = kid("a", "Nguyễn Gia Bình", STARS, { allowedDays: [1] });
  const tuesdays = kid("b", "Trần Thanh Bình", STARS, { allowedDays: [2] });
  const q = buildQuestions(inputs({
    children: [pal("121", "Binh")],
    hecChildren: [tuesdays, mondays],
    records: [mark("121", "2026-11-02", "Present")],
  }))[0];
  eq("a child who only comes Mondays fits a Monday record", q.candidates[0].studentId, "a");
  ok("  and the Tuesday child is told apart", q.candidates[1].reasons.some((r) => r.sign === -1 && r.text.includes("do not come")));
}
{
  const q = buildQuestions(inputs({
    children: [pal("121", null)],
    records: [award("121", "2026-10-20", 3), award("121", "2026-10-20", 5)],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt")],
    awards: [
      { studentId: "a", classId: STARS, date: "2026-10-20", points: 3 },
      { studentId: "b", classId: STARS, date: "2026-10-20", points: 3 },
      { studentId: "c", classId: STARS, date: "2026-10-20", points: 3 },
      { studentId: "b", classId: STARS, date: "2026-10-20", points: 5 },
    ],
  }))[0];
  eq("an award only one child got says more than one the whole class got", q.candidates[0].studentId, "b");
}
{
  const q = buildQuestions(inputs({
    children: [pal("1", "Bin"), pal("2", "Binh Tran")],
    hecChildren: [kid("a", "Trần Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt")],
    records: [mark("1", "2026-10-20", "Present"), mark("2", "2026-10-20", "Present")],
  }));
  const bin = only(q, "1");
  ok("a child who fits somebody else better is marked down",
     bin.candidates.find((c) => c.studentId === "a").reasons.some((r) => r.text.includes("Looks more like Binh Tran")));
}

{
  // Neither child has a name, and one HEC child fits both. It cannot be both.
  const onlyMondays = kid("t", "Ngô Thanh Tâm", STARS, { allowedDays: [1] });
  const qs = buildQuestions(inputs({
    children: [pal("1", null), pal("2", null)],
    hecChildren: [kid("n", "Đặng Bích Ngọc"), onlyMondays],
    records: [mark("1", "2026-11-03", "Present"), mark("2", "2026-11-03", "Present")],
  }));
  eq("the same best guess for two children is not a yes or no for either", only(qs, "1").mode, "choose");
  eq("  for the other either", only(qs, "2").mode, "choose");
  ok("  and it says so", only(qs, "1").candidates[0].reasons.some((r) => r.text.includes("Also the best guess")));
}
{
  // Both like the same child, but one name fits far better.
  const qs = buildQuestions(inputs({
    children: [pal("1", "Bình"), pal("2", null)],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My")],
    records: [mark("1", "2026-10-20", "Present"), mark("2", "2026-10-20", "Present")],
  }));
  eq("a child clearly ahead of its rival is still a yes or no", only(qs, "1").mode, "confirm");
}

console.log("=== every answer makes the next one easier ===");
{
  const hecChildren = [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My")];
  const children = [pal("1", "Bin"), pal("2", "Pumpkin")];
  const records = [mark("1", "2026-10-20", "Present"), mark("2", "2026-10-20", "Present")];
  const first = buildQuestions(inputs({ children, hecChildren, records }));
  eq("the sure one is asked first", first[0].child.ref, "1");
  ok("the nickname with nothing to go on is not sure yet",
     only(first, "2").candidates[0].confidence < 0.9, String(only(first, "2").candidates[0].confidence));

  const next = buildQuestions(inputs({ children, hecChildren, records, links: new Map([["1", "a"]]) }));
  eq("  once that is answered it is gone", next.length, 1);
  eq("  and the last child on both sides becomes a yes or no", next[0].mode, "confirm");
  eq("  about the one child left", next[0].question, "Is Pumpkin from Pixel Pal Lê Hà My on HEC?");
  ok("  which says it is the only one left",
     next[0].candidates[0].reasons.some((r) => r.text.includes("only child left")));
}
{
  const q = buildQuestions(inputs({
    children: [pal("1", "Pumpkin"), pal("2", "Mochi"), pal("3", "Bin")],
    hecChildren: [kid("a", "Lê Hà My")],
  }));
  ok("one free child and three still waiting is not 'the only one left'",
     !only(q, "1").candidates[0].reasons.some((r) => r.text.includes("only child left")));
}
{
  const qs = buildQuestions(inputs({
    children: [pal("1", "Pumpkin"), pal("2", "Bin"), pal("3", "Mochi"), pal("4", "Kiet", ["44"])],
    hecChildren: [kid("a", "Nguyễn Gia Bình"), kid("b", "Lê Hà My"), kid("c", "Phạm Tuấn Kiệt"), kid("d", "Đỗ Thu Hà")],
    records: [mark("1", "2026-10-20", "Present"), mark("1", "2026-10-21", "Present"), mark("2", "2026-10-20", "Present")],
  }));
  eq("first: sure of the answer, with records waiting", qs[0].child.ref, "2");
  eq("then: records waiting, even if unsure", qs[1].child.ref, "1");
  eq("then: nothing waiting yet", qs[2].child.ref, "3");
  eq("last: blocked on a class", qs[3].child.ref, "4");
}
{
  const qs = buildQuestions(inputs({
    children: [pal("1", "Bin")],
    setAside: new Set(["1"]),
    hecChildren: [kid("a", "Nguyễn Gia Bình")],
  }));
  eq("a child set aside as not in HEC is not asked about", qs.length, 0);
}

// --------------------------------------------------------------- audits
console.log("=== links worth a second look ===");
const auditBase = (over = {}) => ({
  links: new Map([["1", "a"]]),
  names: new Map([["1", "Bin"]]),
  hecChildren: [kid("a", "Lê Hà My"), kid("b", "Nguyễn Gia Bình")],
  classRefsOf: new Map([["1", ["19"]]]),
  classMap: new Map([["19", STARS]]),
  classNames: new Map([[STARS, "Stars"]]),
  notEnrolledWaiting: new Map(),
  ...over,
});
{
  const a = auditLinks(auditBase());
  eq("a name that clearly fits somebody else is flagged", a[0]?.worry, "name_elsewhere");
  ok("  naming who", a[0]?.detail.includes("Nguyễn Gia Bình"));
  eq("a nickname that merely looks unrelated is not", auditLinks(auditBase({
    hecChildren: [kid("a", "Lê Hà My"), kid("b", "Phạm Tuấn Kiệt")],
  })).length, 0);
  eq("a name that matches is not", auditLinks(auditBase({ links: new Map([["1", "b"]]) })).length, 0);
  eq("records stuck on enrolment are flagged", auditLinks(auditBase({
    links: new Map([["1", "b"]]), notEnrolledWaiting: new Map([["1", 4]]),
  }))[0]?.worry, "not_enrolled");
  eq("no name to compare is not a worry", auditLinks(auditBase({ names: new Map() })).length, 0);
}

// --------------------------------------------------------------- classes
console.log("=== suggesting a class ===");
{
  const classes = [{ id: "s", name: "Stars" }, { id: "s2", name: "Stars 2" }, { id: "x", name: "Sanrio Grade 6" }];
  eq("the same name is the suggestion", suggestClass("Stars", classes)?.id, "s");
  eq("  and the longer one when that is what it says", suggestClass("Stars 2", classes)?.id, "s2");
  eq("a class in no way alike gets none", suggestClass("Comets", classes), null);
  eq("no name gets none", suggestClass(null, classes), null);
  eq("a tie is not a suggestion", suggestClass("Star", [{ id: "a", name: "Star A" }, { id: "b", name: "Star B" }]), null);
}

// --------------------------------------------------------------- roster
console.log("=== Pixel Pal's list ===");
{
  eq("nothing pasted is no error", parsePastedRoster("  ").error, null);
  ok("something that is not JSON says so", /not the JSON/.test(parsePastedRoster("{oops").error));
  ok("JSON with no children says so", /no "students"/.test(parsePastedRoster('{"classes":{}}').error));
  const r = parsePastedRoster(JSON.stringify({
    classes: { 19: "Stars" }, students: { 121: "Bin", 122: "", 123: 5 }, student_classes: { 121: 19 },
    inactive_students: [122, "not-a-number-but-fine"],
  })).roster;
  eq("numbers become text, as the feed sends them", r.students.get("121"), "Bin");
  eq("a blank name is dropped", r.students.has("122"), false);
  eq("a name that is not text is dropped", r.students.has("123"), false);
  eq("one class is read", r.studentClasses.get("121")[0], "19");
  eq("class names are read", r.classes.get("19"), "Stars");
  ok("archived children are read", r.inactive.has("122"));
  eq("a list of classes is read too", readRoster({ students: { 1: "A" }, student_classes: { 1: ["19", "22"] } }).studentClasses.get("1").length, 2);
  eq("not an object is nothing", readRoster("hello"), null);
  eq("a long name is cut, not refused", readRoster({ students: { 1: "x".repeat(500) } }).students.get("1").length, 200);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
