// The Schedule's "Class report" page (src/lib/sessionClassReport.ts), without the page.
//
// Held here: (1) an older transcript is tied to a lesson only when the rule is sure
// (a meeting's own date, the day filed or the day before, never a cancelled lesson,
// never a coin toss between two lessons on one day); (2) the talk-time share is
// counted from the words each speaker said and says "unknown" when no speaker is
// the teacher; (3) a pasted summary is not mistaken for a conversation; (4) the
// taps give a share too, and a forgotten "stop" cannot swallow the lesson;
// (5) a source that is missing leaves its part empty and never throws; (6) a
// speaker label names a child only when it can mean one child.
// Every line and name below is made up; the shapes are the ones in class_transcripts.
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const out = await build({ entryPoints: [resolve(repo, "src/lib/sessionClassReport.ts")], bundle: true, write: false, format: "esm", platform: "neutral", logLevel: "silent" });
const file = join(mkdtempSync(join(tmpdir(), "session-class-report-")), "module.mjs");
writeFileSync(file, out.outputFiles[0].text);
const M = await import(pathToFileURL(file).href);

let pass = 0, fail = 0;
const ok = (n, c, x = "") => { console.log(`  ${c ? "PASS" : "FAIL"}  ${n}${x ? " :: " + x : ""}`); c ? pass++ : fail++; };
const eq = (n, got, want) => ok(n, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) === JSON.stringify(want) ? "" : `got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);

// ---------------------------------------------------------------- 1. which lesson a transcript is about
const S = (id, date, start = "19:30:00", status = "Held") => ({ id, date, start_time: start, status });
const T = (over) => ({ id: "t", class_id: "c", session_id: null, transcript_date: "2026-08-28", status: "analyzed", raw_text: "x".repeat(300), ...over });

eq("a stored session id always wins", M.resolveTranscriptSession(T({ session_id: "stored" }), [S("a", "2026-08-28")]), "stored");
eq("the lesson on the transcript's own date", M.resolveTranscriptSession(T({}), [S("a", "2026-08-28"), S("b", "2026-08-27")]), "a");
eq("filed the morning after is NOT confirmed (the day-before guess is only offered to a person)", M.resolveTranscriptSession(T({}), [S("b", "2026-08-27")]), null);
eq("...but it is the lesson suggested to the person", M.suggestTranscriptSession(T({}), [S("b", "2026-08-27")]), "b");
eq("no suggestion when the filing day has its own lesson", M.suggestTranscriptSession(T({}), [S("a", "2026-08-28"), S("b", "2026-08-27")]), null);
eq("no suggestion for a pasted meeting that names its own day", M.suggestTranscriptSession(T({ raw_text: "Aug 20, 2026\nMeeting Aug 20, 2026 at 17:26 GMT+07:00\n" + "x".repeat(300) }), [S("b", "2026-08-27")]), null);
eq("confirmedMatch says how: meeting / date",
  [M.confirmedMatch(T({}), [S("a", "2026-08-28")]).how, M.confirmedMatch(T({ raw_text: "Aug 27, 2026\nMeeting Aug 27, 2026 at 17:26 GMT+07:00\n" + "x".repeat(300) }), [S("b", "2026-08-27")]).how], ["date", "meeting"]);
// A person's decision lives in analysis.session_match and beats every rule, including "none".
const chose = (id) => T({ analysis: { summary: "kept", session_match: { session_id: id, by: "u", at: "2026-11-25T00:00:00Z" } } });
eq("a person's choice is used", M.resolveTranscriptSession(chose("pick"), [S("a", "2026-08-28")]), "pick");
eq("a person saying 'none' beats the date rule", M.resolveTranscriptSession(chose(null), [S("a", "2026-08-28")]), null);
eq("'none' is a decision, so nothing is suggested either", M.suggestTranscriptSession(chose(null), [S("b", "2026-08-27")]), null);
eq("a stored session id beats a person's choice", M.resolveTranscriptSession(T({ session_id: "stored", analysis: chose("pick").analysis }), []), "stored");
const kept = M.matchPatch({ summary: "kept", students: [1] }, "pick", "u1", "2026-11-25T00:00:00Z");
eq("saving a choice keeps the rest of the analysis", [kept.summary, kept.students, kept.session_match.session_id, kept.session_match.by], ["kept", [1], "pick", "u1"]);
eq("taking a choice back removes only it", Object.keys(M.matchPatch(kept, undefined, "u1", "x")), ["summary", "students"]);
eq("a null analysis can take a choice", M.matchPatch(null, null, "u1", "t").session_match.session_id, null);
eq("chosenMatch on a plain analysis is nothing", M.chosenMatch({ analysis: { summary: "x" } }), null);
// The same recording filed under two classes (seen in the live data) is wrong under at least one.
const A = (id, cls, d) => ({ id, class_id: cls, audio_duration_seconds: d });
eq("same length in two classes: both are twins", [...M.audioTwinIds([A("1", "c1", "5150.64990234375"), A("2", "c2", 5150.6499), A("3", "c1", 100)])].sort(), ["1", "2"]);
eq("same length in one class is not a twin (a re-upload there is harmless)", [...M.audioTwinIds([A("1", "c1", 60), A("2", "c1", 60)])], []);
eq("no audio length, no twin", [...M.audioTwinIds([A("1", "c1", null), A("2", "c2", null)])], []);
eq("a meeting names its own day, which beats the filing date",
  M.resolveTranscriptSession(T({ transcript_date: "2026-08-12", raw_text: "Aug 9, 2026\nMeeting Aug 9, 2026 at 18:57 GMT+07:00 - Transcript\n" + "x".repeat(300) }),
    [S("sun", "2026-08-09", "19:00:00"), S("wed", "2026-08-12")]), "sun");
eq("a cancelled lesson never matches", M.resolveTranscriptSession(T({}), [S("a", "2026-08-28", "19:30:00", "Canceled")]), null);
eq("nothing within a day: no match", M.resolveTranscriptSession(T({}), [S("a", "2026-08-20")]), null);
eq("two lessons that day and no clock: left empty", M.resolveTranscriptSession(T({}), [S("a", "2026-08-28", "16:15:00"), S("b", "2026-08-28", "17:30:00")]), null);
eq("two lessons that day, the meeting started at 17:26: the 17:30 one",
  M.resolveTranscriptSession(T({ raw_text: "Aug 28, 2026\nMeeting Aug 28, 2026 at 17:26 GMT+07:00\n" + "x".repeat(300) }), [S("a", "2026-08-28", "16:15:00"), S("b", "2026-08-28", "17:30:00")]), "b");
eq("two lessons close together: not a guess",
  M.resolveTranscriptSession(T({ raw_text: "Aug 28, 2026\nMeeting Aug 28, 2026 at 17:00 GMT+07:00\n" + "x".repeat(300) }), [S("a", "2026-08-28", "16:45:00"), S("b", "2026-08-28", "17:15:00")]), null);
eq("meetingStamp reads date and time", M.meetingStamp("Aug 27, 2026\nMeeting Aug 27, 2026 at 17:26 GMT+07:00 - Transcript"), { date: "2026-08-27", minutes: 17 * 60 + 26 });
eq("no stamp, no date", M.meetingStamp("Hello everyone. Okay."), null);

const placeholder = T({ id: "p", status: "processing", raw_text: "[Audio uploaded - transcribing...]" });
const failed = T({ id: "f", status: "failed", raw_text: "y".repeat(500) });
const analysed = T({ id: "a", status: "analyzed", raw_text: "z".repeat(400) });
eq("a placeholder is not a transcript", M.bestTranscript([placeholder]), null);
eq("analysed beats failed, even when shorter", M.bestTranscript([failed, analysed])?.id, "a");
eq("a failed transcript still has text worth showing", M.bestTranscript([failed, placeholder])?.id, "f");

// ---------------------------------------------------------------- 2. parsing and the talk share
const vtt = `WEBVTT

00:00:00.420 --> 00:00:02.420
<v Teacher>One two three four five six.</v>

00:00:02.660 --> 00:00:06.820
<v Unknown>one two</v>

00:00:07.000 --> 00:00:09.000
<v Teacher>Good. Again please everyone now.</v>
`;
const vt = M.parseSpokenTranscript(vtt);
eq("WebVTT: speakers in order", vt.map((t) => t.speaker), ["Teacher", "Unknown", "Teacher"]);
eq("WebVTT: the clock is the cue start", vt.map((t) => t.t), [0.42, 2.66, 7]);
const vs = M.talkShare(vt, []);
eq("'Teacher' is the teacher even when no name is given", vs.speakers.find((s) => s.speaker === "Teacher").isTeacher, true);
eq("WebVTT: 11 of 13 words are the teacher's", [vs.totalWords, vs.teacherPct, vs.othersPct], [13, 85, 15]);

const meet = `Aug 27, 2026
Meeting Aug 27, 2026 at 17:26 GMT+07:00 - Transcript
00:00:17

Victor Moronu: Hello David. How are you today?
David: Hello.
Victor Moronu: What poster is that? Is it football?
David: No.
Victor Moronu: Look behind you.
David: Oh come on.

00:29:52

Jack: Yes.
Victor Moronu: Who takes care of Jack?
Jack: Mum
Jack: and Dad.
`;
const mt = M.parseSpokenTranscript(meet);
eq("Meet paste: the heading and the clock lines are not speech", mt.every((t) => !/Meeting|^\d{2}:/.test(t.text)), true);
eq("Meet paste: four speakers' turns counted", mt.length, 10);
eq("Meet paste: the clock lines move the clock", mt.find((t) => t.speaker === "Jack").t, 29 * 60 + 52);
const ms = M.talkShare(mt, ["Victor Moronu"]);
eq("Meet paste: the teacher is found by the lesson's teacher name", ms.speakers.find((s) => s.isTeacher)?.speaker, "Victor Moronu");
ok("Meet paste: shares add to about 100", Math.abs(ms.speakers.reduce((a, s) => a + s.pct, 0) - 100) <= 2);
const unknownTeacher = M.talkShare(mt, ["Somebody Else"]);
eq("no speaker is the teacher: the split is unknown, not guessed", [unknownTeacher.teacherPct, unknownTeacher.othersPct], [null, null]);
eq("a name part alone counts as the teacher", M.isTeacherLabel("victor moronu", ["Moronu Victor"]), true);
eq("a student whose name shares one part with the teacher is not the teacher", M.isTeacherLabel("Victor", ["Victor Moronu"]), true);
eq("another person is not the teacher", M.isTeacherLabel("David", ["Victor Moronu"]), false);

const otter = `Speaker 1  0:01
Okay. Now, when you speak, please look over here.

Speaker 2  0:09
Hello teacher.

Speaker 1  0:12
Very good.
`;
const ot = M.parseSpokenTranscript(otter);
eq("Otter headings: speakers", ot.map((t) => t.speaker), ["Speaker 1", "Speaker 2", "Speaker 1"]);
eq("Otter headings: the words under the heading", ot[0].text, "Okay. Now, when you speak, please look over here.");

const summary = `Lesson Review: Day and Night - Alphabet Review

Class type: Young learners (ESL/EFL)
Lesson focus: the alphabet
Words: A is for apple.
`;
eq("a pasted summary is not a conversation", M.parseSpokenTranscript(summary), []);
eq("plain text with no speakers gives no turns and no share", [M.parseSpokenTranscript("Hello everyone. Can you speak louder?").length, M.talkShare([], [])], [0, null]);
eq("nothing at all", M.parseSpokenTranscript(null), []);

// ---------------------------------------------------------------- 3. who's-speaking taps
const m = (kind, s, ids = []) => ({ kind, student_ids: ids, at: "2026-11-19T10:00:00Z", offset_ms: s * 1000 });
const tp = M.markShare([m("teacher", 0), m("student", 60, ["a"]), m("teacher", 90), m("chorus", 120), m("stop", 150)]);
eq("taps: teacher 60+30, child 30, class 30", [tp.teacherS, tp.childrenS, tp.chorusS], [90, 30, 30]);
eq("taps: percentages", [tp.teacherPct, tp.childrenPct, tp.chorusPct], [60, 20, 20]);
eq("taps: the child is credited", tp.perStudentS, { a: 30 });
const forgot = M.markShare([m("student", 0, ["a", "b"]), m("teacher", 3000)]);
eq("a forgotten stop counts at most 90 s", forgot.childrenS, 90);
eq("two children share the time", forgot.perStudentS, { a: 45, b: 45 });
eq("one tap is not enough to say anything", M.markShare([m("teacher", 0)]), null);
eq("taps that all say stop give nothing", M.markShare([m("stop", 0), m("stop", 10)]), null);

// ---------------------------------------------------------------- 4. a label and a child
const kids = [{ id: "1", full_name: "Nguyen Minh Anh" }, { id: "2", full_name: "Tran Gia Bao" }, { id: "3", full_name: "Le Minh Khoa" }, { id: "4", full_name: "Pham Jack" }];
eq("a full name", M.matchStudent("Tran Gia Bao", kids), "2");
eq("a name part only one child has", M.matchStudent("Jack", kids), "4");
eq("a part two children share is not guessed", M.matchStudent("Minh", kids), null);
eq("Vietnamese marks are folded", M.matchStudent("Lê Minh Khoa", kids), "3");
eq("'Unknown' and 'Teacher' are no child", [M.matchStudent("Unknown", kids), M.matchStudent("Teacher", kids)], [null, null]);
eq("a stranger is no child", M.matchStudent("Capybara", kids), null);

// ---------------------------------------------------------------- 5. the class-level report, by source
const approved = M.viewFromReportBody({
  lesson: { title: "Animals", summary: "We met animals." },
  objectives: [{ text: "Name animals", met: "yes", evidence: "SECRET staff evidence" }],
  words: [{ en: "cat", vi: "con meo" }], gaps: [{ issue: "SECRET gap" }],
  parents: { next_lesson: { en: "Next: colours" } },
  homework: [{ title: "Workbook p5" }],
}, "approved");
eq("approved report: title, objective with its verdict, word, next, homework",
  [approved.title, approved.objectives, approved.words[0].en, approved.nextSteps, approved.homework],
  ["Animals", [{ text: "Name animals", met: "yes" }], "cat", ["Next: colours"], ["Workbook p5"]]);
ok("approved report: staff-only evidence and gaps are not carried", !JSON.stringify(approved).includes("SECRET"));
eq("an empty body is no report", M.viewFromReportBody({}, "draft"), null);
eq("a body that is not an object is no report", M.viewFromReportBody("nope", "draft"), null);

const old = M.viewFromTranscriptAnalysis({
  summary: "The class reviewed the alphabet.", materials: [{ name: "Phonics book", pages: "p. 4" }], homework: null,
  lesson_report: { chronology: [{ phase: "Warm-up", detail: "Recited letters." }], objectives: ["Review the alphabet"], general_understanding: "Good grasp.", misconceptions: ["B vs D"], next_steps: ["Practise"] },
}, null, null);
eq("old analysis: summary, materials with pages, objectives, how it went",
  [old.source, old.summary, old.materials, old.objectives, old.chronology], ["transcript", "The class reviewed the alphabet.", ["Phonics book (p. 4)"], [{ text: "Review the alphabet" }], [{ phase: "Warm-up", detail: "Recited letters." }]]);
eq("old analysis with only the transcript's summary column", M.viewFromTranscriptAnalysis(null, "Alphabet", "A short summary.")?.summary, "A short summary.");
eq("old analysis with nothing", M.viewFromTranscriptAnalysis({}, null, null), null);
eq("old analysis with a homework text", M.viewFromTranscriptAnalysis({ homework: "Read p. 6" }, null, null).homework, ["Read p. 6"]);

// ---------------------------------------------------------------- 6. one row per child
const rows = M.buildStudentRows({
  enrolled: kids,
  attendance: { 1: "Present", 2: "Absent" },
  notes: { 1: { highlight: "Led the game", points: 3 } },
  analysisNotes: [{ name: "Jack", contribution: "Answered often", level: "A1", errors: 2 }, { name: "Student", contribution: "ignored" }],
  share: M.talkShare(M.parseSpokenTranscript("Teacher: one two three four five six seven eight.\nJack: hello\nTeacher: good\nJack: yes\nTeacher: fine\nJack: no\nJack: ok"), []),
  marks: tp, points: { 1: 5 },
});
eq("one row per enrolled child, in the order given", rows.map((r) => r.name), kids.map((k) => k.full_name));
eq("child 1: attendance, the report's highlight, points from the lesson's ledger win",
  [rows[0].attendance, rows[0].highlight, rows[0].points], ["Present", "Led the game", 5]);
eq("child 4 (Jack): the analysis entry that names him, and his share of the words",
  [rows[3].contribution, rows[3].level, rows[3].errors, rows[3].wordPct], ["Answered often", "A1", 2, 29]);
eq("a child with no source has empty fields, not invented ones", [rows[2].highlight, rows[2].contribution, rows[2].wordPct, rows[2].attendance, rows[2].points], ["", "", null, null, null]);
eq("the analysis entry called 'Student' is tied to nobody", rows.some((r) => r.contribution === "ignored"), false);

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
