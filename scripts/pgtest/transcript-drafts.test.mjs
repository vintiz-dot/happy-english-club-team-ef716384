// D-26: the transcript analysis writes staff-only DRAFTS; only a teacher's
// approval publishes, and only the teacher's own choices.
//
//   node scripts/pgtest/run.mjs   (or this file with the four migrations)
//
// Part 1 drives the REAL migrations against an in-process Postgres
// (transcript-drafts.setup.mjs builds it and installs the first):
//   20261111110000  the real is_teacher_of_class (TAs included),
//   20261113140000  the staff policies production has on cefr_assessments
//                   and student_error_log,
//   20261117100000  the fix, pasted twice.
// The other policies on these tables (admin, the child's own read, the
// family's read) are production's, copied from the migrations that made
// them (20260712090000, 20260718090000, 20260722090000, 20260730130000).
//
// Part 2 bundles the REAL analyze-transcript (remote imports stubbed, its
// ../_lib imports real), drives it with requests against an in-memory
// stand-in for Supabase and a scripted OpenAI, then loads the drafts it wrote
// into the Postgres of part 1 and approves them as a teacher would.
//
// Part 3 is the screen's reasoning (src/lib/transcriptReview.ts) and the
// suggestion rule (supabase/functions/_lib/speaker-suggestion.ts).
import { build, transform } from "esbuild";
import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  repo, loadTs, loadReview, tally, ok, eq, db, q, one, FIX, UNPUB_MIG, mk, ADMIN, TEA, TEB, TA_ON, PARENT, KID, KIDB, NOROLE, tA, tB, taOn, CA, CB, F1, kid, KIKI, BAO_T, BAO_N, ANH, B1, as, approve, withdraw, draftLesson, ERR1, ERR2, L1, mTeacher, mKiki, mBao, mUnknown, count,
} from "./transcript-drafts.setup.mjs";

// What the screen sends for a speaker given a child: the text the child's page shows (review M-4).
const TXT = { contribution: "Told us about her weekend.", teacher_feedback: "Well done", recommendation: "Practise -ed", highlights: [] };

console.log("=== a draft reaches no family and no child ===");
for (const [label, who] of [["the family's primary login", PARENT], ["the child's own login (Kiki)", KID], ["another class's child", KIDB], ["an account with no role", NOROLE]]) {
  eq(`${label}: no suggestion, no approval, no transcript (draft overview), no draft metric row`,
    [await count(who, "transcript_speaker_suggestions"), await count(who, "transcript_approvals"), await count(who, "class_transcripts"),
     await count(who, "transcript_speaker_metrics")], [0, 0, 0, 0]);
  eq(`${label}: nothing published yet - no error, card, CEFR point or lesson overview`,
    [await count(who, "student_error_log"), await count(who, "srs_cards"), await count(who, "cefr_assessments"), await count(who, "lesson_overviews")], [0, 0, 0, 0]);
}
eq("the class's teacher reads the draft: 3 suggestions, 4 metric rows, the transcript", [await count(TEA, "transcript_speaker_suggestions"), await count(TEA, "transcript_speaker_metrics"), await count(TEA, "class_transcripts")], [3, 4, 1]);
eq("the class's TA reads the suggestions too", await count(TA_ON, "transcript_speaker_suggestions"), 3);
eq("an admin reads them", await count(ADMIN, "transcript_speaker_suggestions"), 3);
eq("a teacher of ANOTHER class reads none of it", [await count(TEB, "transcript_speaker_suggestions"), await count(TEB, "transcript_speaker_metrics"), await count(TEB, "class_transcripts")], [0, 0, 0]);
{
  const r = await as(PARENT, `SELECT * FROM public.transcript_speaker_suggestions WHERE suggested_student_id = $1`, [KIKI]);
  eq("the family cannot read the suggestion about its own child either", r.rows.length, 0);
}

console.log("=== only the approval links a speaker to a child ===");
{
  const svc = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [L1.T, CA, KIKI], { role: "service_role" });
  ok("the service role (the analysis) cannot insert a metric row with a child", /approves the lesson/.test(svc.err ?? ""), svc);
  const t = await as(TEA, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki]);
  ok("the class's teacher cannot link one directly (the approval is the way)", /approves the lesson/.test(t.err ?? ""), t);
  const a = await as(ADMIN, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki]);
  ok("nor can an admin", /approves the lesson/.test(a.err ?? ""), a);
  const s2 = await as(null, `UPDATE public.transcript_speaker_metrics SET student_id = $1 WHERE id = $2`, [KIKI, mKiki], { role: "service_role" });
  ok("nor the service role", /approves the lesson/.test(s2.err ?? ""), s2);
  const edit = await as(TEA, `UPDATE public.transcript_speaker_metrics SET teacher_feedback = 'Lovely work' WHERE id = $1`, [mKiki]);
  ok("the teacher can still correct the drafted feedback text", edit.err === null && edit.n === 1, edit);
  const low = await as(null, `UPDATE public.transcript_speaker_suggestions SET suggested_student_id = $1 WHERE metric_id = $2`, [BAO_T, mBao], { role: "service_role" });
  ok("a LOW suggestion cannot name a child, even written by the service role (CHECK)", /low_is_unknown/.test(low.err ?? ""), low);
  const tw = await as(TEA, `UPDATE public.transcript_speaker_suggestions SET confidence = 'high', suggested_student_id = $1 WHERE metric_id = $2`, [BAO_T, mBao]);
  ok("a teacher cannot rewrite a suggestion (no write policy): 0 rows", tw.err === null && tw.n === 0, tw);
  const fam = await as(PARENT, `INSERT INTO public.transcript_approvals (transcript_id, class_id, approved_by) VALUES ($1,$2,$3)`, [L1.T, CA, PARENT]);
  ok("nobody writes an approval row directly", fam.err !== null, fam);
  const tap = await as(TEA, `INSERT INTO public.transcript_approvals (transcript_id, class_id, approved_by) VALUES ($1,$2,$3)`, [L1.T, CA, TEA]);
  ok("  ...not even the class's teacher", tap.err !== null, tap);
}

console.log("=== who may approve ===");
const KIKI_ONLY = [{ metric_id: mKiki, student_id: KIKI, cefr_level: "A2", errors: [ERR1], text: TXT }];
for (const [label, who] of [["the family", PARENT], ["the child", KID], ["a teacher of another class", TEB], ["an account with no role", NOROLE], ["nobody signed in", null]]) {
  const r = await approve(who, L1.T, KIKI_ONLY, { keep: false });
  ok(`${label}: refused`, r.err !== null && /teacher of this class|Sign in/.test(r.err), r);
}
eq("  ...and nothing was published by any of them", [await count(ADMIN, "student_error_log"), await count(ADMIN, "cefr_assessments"), await count(ADMIN, "lesson_overviews"), await count(ADMIN, "transcript_approvals")], [0, 0, 0, 0]);
{
  const r = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: B1 }], { keep: false });
  ok("a child from another class: refused", /not in this class/.test(r.err ?? ""), r);
  const r2 = await approve(TEA, L1.T, [{ metric_id: mTeacher, student_id: KIKI }], { keep: false });
  ok("the teacher's own speech assigned to a child: refused", /is the teacher/.test(r2.err ?? ""), r2);
  const r3 = await approve(TEA, L1.T, [{ metric_id: randomUUID(), student_id: KIKI }], { keep: false });
  ok("a speaker from no / another lesson: refused", /not part of this lesson/.test(r3.err ?? ""), r3);
  const r4 = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: "Z9", text: TXT }], { keep: false });
  ok("a CEFR level the scale does not have: refused", /unknown CEFR level/.test(r4.err ?? ""), r4);
  const r5 = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, text: TXT }, { metric_id: mKiki, student_id: ANH, text: TXT }], { keep: false });
  ok("one speaker sent twice: refused", /listed twice/.test(r5.err ?? ""), r5);
}

console.log("=== approve publishes the teacher's choices, exactly once ===");
{
  // The teacher confirms the high suggestion and leaves the low one unknown
  // (the screen never pre-selects low). Bao's drafted error must go nowhere.
  const r = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("the class's teacher approves", r.err === null, r);
  const res = r.rows[0]?.r ?? {};
  eq("  result: one child, one unknown speaker, one error, one CEFR point, an overview", [res.students, res.unknown_speakers, res.errors_published, res.cefr_points, !!res.overview_id],
    [[KIKI], 1, 1, 1, true]);
  eq("Kiki's family now reads her CEFR point and the lesson overview", [await count(PARENT, "cefr_assessments", "student_id = $1", [KIKI]), await count(PARENT, "lesson_overviews")], [1, 1]);
  eq("Kiki's own login reads her error, its practice card, her metric row and the overview",
    [await count(KID, "student_error_log"), await count(KID, "srs_cards"), await count(KID, "transcript_speaker_metrics"), await count(KID, "lesson_overviews")], [1, 1, 1, 1]);
  const lv = await one(`SELECT level, created_by, confidence, evidence FROM public.cefr_assessments WHERE student_id = $1`, [KIKI]);
  eq("  the CEFR point is the level the teacher sent, signed by the teacher", [lv.level, lv.created_by, Number(lv.confidence)], ["A2", TEA, 0.6]);
  eq("the LOW suggestion landed on no child: both Baos and Anh have nothing", await one(`SELECT
      (SELECT count(*)::int FROM public.student_error_log WHERE student_id IN ($1,$2,$3)) AS e,
      (SELECT count(*)::int FROM public.cefr_assessments WHERE student_id IN ($1,$2,$3)) AS c,
      (SELECT count(*)::int FROM public.transcript_speaker_metrics WHERE student_id IN ($1,$2,$3)) AS m,
      (SELECT count(*)::int FROM public.srs_cards WHERE student_id IN ($1,$2,$3)) AS s`, [BAO_T, BAO_N, ANH]), { e: 0, c: 0, m: 0, s: 0 });
  eq("  and its metric row is still unlinked", (await one(`SELECT student_id FROM public.transcript_speaker_metrics WHERE id = $1`, [mBao])).student_id, null);
  eq("the teacher's choice is remembered for the class, as a label for later suggestions",
    (await q(`SELECT speaker_label, student_id FROM public.class_speaker_aliases WHERE class_id = $1`, [CA])).map((a) => [a.speaker_label, a.student_id]), [["kiki", KIKI]]);
  const ov = await one(`SELECT summary, homework, materials, edited_by_teacher FROM public.lesson_overviews WHERE transcript_id = $1`, [L1.T]);
  eq("  the overview is the draft's", [ov.summary, ov.homework, ov.materials, ov.edited_by_teacher], ["We practised the past simple.", "Page 15", [{ name: "Book 2", pages: "14" }], true]);
  eq("another class's child sees nothing of it", [await count(KIDB, "lesson_overviews"), await count(KIDB, "student_error_log"), await count(KIDB, "cefr_assessments")], [0, 0, 0]);
  eq("the suggestion rows stay staff-only after approval", [await count(PARENT, "transcript_speaker_suggestions"), await count(KID, "transcript_speaker_suggestions"), await count(KID, "transcript_approvals")], [0, 0, 0]);

  const again = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("approving the same lesson again succeeds", again.err === null, again);
  eq("  ...and replaces: still exactly 1 error, 1 card, 1 CEFR point, 1 overview, 1 approval",
    [await count(ADMIN, "student_error_log"), await count(ADMIN, "srs_cards"), await count(ADMIN, "cefr_assessments"), await count(ADMIN, "lesson_overviews"), await count(ADMIN, "transcript_approvals")], [1, 1, 1, 1, 1]);
  const ap = await one(`SELECT jsonb_array_length(history) AS h, array_length(error_log_ids, 1) AS e FROM public.transcript_approvals WHERE transcript_id = $1`, [L1.T]);
  eq("  the approval keeps its history (2 approvals) and lists the 1 error it wrote", [ap.h, ap.e], [2, 1]);

  const changed = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: null, errors: [], text: TXT }, { metric_id: mBao, student_id: BAO_T, cefr_level: "A1", errors: [ERR2], text: TXT }],
    { overview: { summary: "Teacher's own summary", materials: [], homework: null } });
  ok("the teacher changes their mind: Kiki without an error or level, Bao chosen by hand as Bao Tran", changed.err === null, changed);
  eq("  Kiki's earlier error, card and level are gone; Bao Tran has the one the teacher kept",
    [await count(ADMIN, "student_error_log", "student_id = $1", [KIKI]), await count(ADMIN, "srs_cards", "student_id = $1", [KIKI]), await count(ADMIN, "cefr_assessments", "student_id = $1", [KIKI]),
     await count(ADMIN, "student_error_log", "student_id = $1", [BAO_T]), await count(ADMIN, "cefr_assessments", "student_id = $1", [BAO_T])], [0, 0, 0, 1, 1]);
  eq("  the overview is the teacher's text", (await one(`SELECT summary FROM public.lesson_overviews WHERE transcript_id = $1`, [L1.T])).summary, "Teacher's own summary");
  eq("  Bao Ngoc (the other Bao) has nothing", [await count(ADMIN, "student_error_log", "student_id = $1", [BAO_N]), await count(ADMIN, "transcript_speaker_metrics", "student_id = $1", [BAO_N])], [0, 0]);
  const declined = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: null }, { metric_id: mBao, student_id: null }]);
  ok("the teacher declines even the HIGH suggestion (Kiki left unknown): approved", declined.err === null, declined);
  eq("  the suggestion is not used: nothing about Kiki or anyone from this lesson, only the overview",
    [await count(ADMIN, "student_error_log", "source_id = $1", [L1.T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [L1.T]),
     await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id IS NOT NULL", [L1.T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [L1.T])], [0, 0, 0, 1]);
  const omitted = await approve(TEA, L1.T, []);
  ok("  nor when the speakers are simply left out of the request", omitted.err === null
    && (await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id IS NOT NULL", [L1.T])) === 0, omitted);
  const backToFirst = await approve(TEA, L1.T, [...KIKI_ONLY, { metric_id: mBao, student_id: null }]);
  ok("and back to the first choice", backToFirst.err === null, backToFirst);
}

console.log("=== while approved, the drafts are not rebuilt under it ===");
{
  const d = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L1.T], { role: "service_role" });
  ok("the service role (a re-analysis) cannot delete an approved lesson's metric rows", /Withdraw the approval/.test(d.err ?? ""), d);
  const i = await as(null, `INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label) VALUES ($1,$2,'New')`, [L1.T, CA], { role: "service_role" });
  ok("  ...nor add one", /Withdraw the approval/.test(i.err ?? ""), i);
}

console.log("=== withdraw takes back exactly what the approval wrote ===");
{
  // Unrelated rows about the same child that must survive.
  await q(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'ai_report','A1',1,$3)`, [KIKI, CA, randomUUID()]);
  await q(`INSERT INTO public.student_error_log (student_id, class_id, source, error_text, created_by) VALUES ($1,$2,'live_flag','he go',$3)`, [KIKI, CA, TEA]);
  for (const [label, who] of [["the family", PARENT], ["a teacher of another class", TEB], ["nobody signed in", null]]) {
    const r = await withdraw(who, L1.T);
    ok(`${label}: cannot withdraw`, r.err !== null, r);
  }
  const r = await withdraw(TEA, L1.T);
  ok("the class's teacher withdraws", r.err === null, r);
  eq("  result: 1 error, 1 CEFR point, 1 overview removed", [r.rows[0]?.r?.errors_removed, r.rows[0]?.r?.cefr_removed, r.rows[0]?.r?.overview_removed], [1, 1, 1]);
  eq("the family and the child read none of the lesson now", [await count(PARENT, "lesson_overviews"), await count(KID, "transcript_speaker_metrics"), await count(KID, "srs_cards")], [0, 0, 0]);
  eq("the unrelated CEFR point and live-flag error are untouched",
    [await count(ADMIN, "cefr_assessments", "source = 'ai_report'"), await count(ADMIN, "student_error_log", "source = 'live_flag'")], [1, 1]);
  const ap = await one(`SELECT withdrawn_by, withdrawn_at IS NOT NULL AS w, error_log_ids, jsonb_array_length(history) AS h FROM public.transcript_approvals WHERE transcript_id = $1`, [L1.T]);
  eq("  the approval row says who withdrew it, lists nothing, and keeps its history", [ap.withdrawn_by, ap.w, ap.error_log_ids, ap.h], [TEA, true, [], 7]);
  const again = await withdraw(TEA, L1.T);
  ok("withdrawing twice is refused", /not approved/.test(again.err ?? ""), again);
  const d = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1 AND speaker_label = 'Unknown'`, [L1.T], { role: "service_role", keep: false });
  ok("once withdrawn, a re-analysis may rebuild the drafts again", d.err === null && d.n === 1, d);
}

console.log("=== a lesson the OLD pipeline already published ===");
{
  // As production holds it: rows written at once by the old analysis (no created_by), an overview, a linked metric row.
  const T = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, analyzed_at)
                        VALUES ($1,$2,'Old lesson','2026-10-01','x','analyzed','Old summary','{"materials":[]}'::jsonb, now()) RETURNING id`, [CA, TEA])).id;
  const oldErr = (await one(`INSERT INTO public.student_error_log (student_id, class_id, source, source_id, error_text, corrected_text) VALUES ($1,$2,'transcript',$3,'old error','fixed') RETURNING id`, [KIKI, CA, T])).id;
  await q(`INSERT INTO public.srs_cards (student_id, error_log_id, front, back) VALUES ($1,$2,'f','b')`, [KIKI, oldErr]);
  await q(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, source_id) VALUES ($1,$2,'transcript','B1',3,$3)`, [KIKI, CA, T]);
  await q(`INSERT INTO public.lesson_overviews (transcript_id, class_id, lesson_date, summary) VALUES ($1,$2,'2026-10-01','Old summary')`, [T, CA]);
  await q(`INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [T, CA, KIKI]);
  const before = [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T])];
  eq("the old pipeline's published rows are in place (the migration changes no existing row)", before, [1, 1, 1]);
  const r = await approve(TEA, T, []);
  ok("approving it without saying so is refused, with the code the screen recognises", /earlier automatic analysis \(4 item/.test(r.err ?? ""), r);
  eq("  ...and nothing moved", [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T]), await count(ADMIN, "srs_cards", "error_log_id = $1", [oldErr])], [1, 1, 1, 1]);
  const hint = await db.query(`SELECT 1`).then(async () => {
    await db.exec("BEGIN");
    try { await db.query(`SELECT set_config('test.uid', $1, true)`, [TEA]); await db.exec("SET LOCAL ROLE authenticated");
      await db.query(`SELECT public.approve_transcript_analysis($1, '[]'::jsonb)`, [T]); return null; }
    catch (e) { return e.hint ?? null; } finally { await db.exec("ROLLBACK"); }
  });
  eq("  the refusal's hint is TRANSCRIPT_LEGACY_ROWS", hint, "TRANSCRIPT_LEGACY_ROWS");
  const rr = await approve(TEA, T, [], { replace: true });
  ok("the teacher chooses to replace them: approved", rr.err === null, rr);
  const ap = await one(`SELECT replaced_legacy FROM public.transcript_approvals WHERE transcript_id = $1`, [T]);
  eq("  every replaced row was copied into the approval first", ap.replaced_legacy.map((x) => x.table).sort(), ["cefr_assessments", "lesson_overviews", "student_error_log", "transcript_speaker_metrics"]);
  eq("  the old error (and its card) and the old level are gone; the overview is the approved one", [await count(ADMIN, "student_error_log", "source_id = $1", [T]), await count(ADMIN, "srs_cards", "error_log_id = $1", [oldErr]), await count(ADMIN, "cefr_assessments", "source_id = $1", [T]), await count(ADMIN, "lesson_overviews", "transcript_id = $1", [T])], [0, 0, 0, 1]);
  eq("  rows of OTHER lessons were not touched", [await count(ADMIN, "cefr_assessments", "source = 'ai_report'"), await count(ADMIN, "student_error_log", "source = 'live_flag'")], [1, 1]);
  const del = await as(ADMIN, `DELETE FROM public.class_transcripts WHERE id = $1`, [T], { keep: true });
  ok("an admin can still delete an approved transcript (its rows cascade as the owner)", del.err === null && del.n === 1, del);
}
{
  const p = await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, raw_text, status) VALUES ($1,$2,'x','processing') RETURNING id`, [CA, TEA]);
  const r = await approve(TEA, p.id, []);
  ok("a lesson still analysing cannot be approved", /not finished analysing/.test(r.err ?? ""), r);
}

// =================================================================== fix round 1
// The review's findings (REVIEW-transcript.md), each with the safe behaviour.
const metricRows = (T) => q(`SELECT id, speaker_label, is_teacher, student_id, cefr_estimate, contribution, teacher_feedback, recommendation, highlights, edited_by_teacher
                               FROM public.transcript_speaker_metrics WHERE transcript_id = $1 ORDER BY speaker_label`, [T]);
const sugRows = (T) => q(`SELECT metric_id, suggested_student_id, confidence, basis, labels_from_model, draft_errors, cefr_estimate
                            FROM public.transcript_speaker_suggestions WHERE transcript_id = $1`, [T]);
const aliasOf = async (label) => (await one(`SELECT student_id FROM public.class_speaker_aliases WHERE class_id = $1 AND speaker_label = $2`, [CA, label]))?.student_id ?? null;

console.log("=== who may be given a speaker (N-2, N-3, N-4) ===");
{
  const L = await draftLesson(CA, { title: "Who", date: "2026-11-16" });
  const mk1 = await L.metric("Kiki");
  const mU = await L.metric("Unknown");
  await L.sug(mk1, "kiki", KIKI, "high", "exact_name", [ERR1]);
  const u = await approve(TEA, L.T, [{ metric_id: mU, student_id: ANH, text: TXT }], { keep: false });
  ok("N-4: the mixed Unknown speaker cannot be given to a child", /Unknown/.test(u.err ?? ""), u);
  const GONE = await kid("Old Pupil", null);
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,'2025-01-01','2025-06-01')`, [GONE, CA]);
  const g = await approve(TEA, L.T, [{ metric_id: mk1, student_id: GONE, text: TXT }], { keep: false });
  ok("N-3: a child whose enrolment ended before the lesson is refused", /not in this class on the lesson/.test(g.err ?? ""), g);
  const LATE = await kid("New Pupil", null);
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date) VALUES ($1,$2,'2026-11-20')`, [LATE, CA]);
  const lt = await approve(TEA, L.T, [{ metric_id: mk1, student_id: LATE, text: TXT }], { keep: false });
  ok("N-3: a child who joined after the lesson is refused", /not in this class on the lesson/.test(lt.err ?? ""), lt);
  const LEFT = await kid("Left Since", null);
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,'2026-01-01','2026-11-16')`, [LEFT, CA]);
  const lf = await approve(TEA, L.T, [{ metric_id: mk1, student_id: LEFT, text: TXT }], { keep: false });
  ok("N-3: a child enrolled on the lesson's date (left since) is accepted", lf.err === null, lf);
  // N-2: a class-A row inside a class-B lesson (only the owner can place it there now: N-1).
  const LB = await draftLesson(CB, { title: "B lesson" });
  await LB.metric("Lily");
  await q(`UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [LB.T, mk1]);
  const x = await approve(TEB, LB.T, [{ metric_id: mk1, student_id: B1, text: TXT }], { keep: false });
  ok("N-2: a row whose class is not the lesson's class is not part of the lesson", /not part of this lesson/.test(x.err ?? ""), x);
  await q(`UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L.T, mk1]);
}

console.log("=== the approval publishes the text the teacher saw, and remembers what she kept (M-4, M-2) ===");
{
  const review = await loadReview();
  const L = await draftLesson(CA, { title: "Text", date: "2026-11-16" });
  const mk1 = await L.metric("Kiki");
  await q(`UPDATE public.transcript_speaker_metrics SET contribution = 'AI: talked a lot', recommendation = 'AI: try more',
             highlights = '["AI moment one","AI moment two"]'::jsonb WHERE id = $1`, [mk1]);
  await L.sug(mk1, "kiki", KIKI, "high", "exact_name", [ERR1, ERR2]);
  const no = await approve(TEA, L.T, [{ metric_id: mk1, student_id: KIKI, errors: [ERR1] }], { keep: false });
  ok("M-4: an approval that does not send the text the child's page will show is refused", /send the text/.test(no.err ?? ""), no);
  let mrows = await metricRows(L.T);
  const sugs = await sugRows(L.T);
  const c = review.initialChoices(mrows, sugs, null);
  eq("M-4: the screen starts from the row's text, every highlight ticked",
    [c[mk1].text.teacher_feedback, c[mk1].text.contribution, c[mk1].text.recommendation, c[mk1].text.keepHighlights], ["Well done", "AI: talked a lot", "AI: try more", [true, true]]);
  c[mk1].keepErrors = [true, false];
  c[mk1].text.teacher_feedback = "";
  c[mk1].text.contribution = "Kiki told us about her weekend.";
  c[mk1].text.keepHighlights = [false, true];
  const a = await approve(TEA, L.T, review.buildAssignments(mrows, sugs, c));
  ok("the teacher approves her edited choices", a.err === null, a);
  const kidRow = (await as(KID, `SELECT contribution, teacher_feedback, recommendation, highlights FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L.T])).rows[0];
  eq("M-4: the child reads exactly what the teacher approved: her edit, no feedback, the kept recommendation and highlight",
    kidRow, { contribution: "Kiki told us about her weekend.", teacher_feedback: null, recommendation: "AI: try more", highlights: ["AI moment two"] });
  eq("  the row is marked teacher-edited (a re-analysis keeps her words)", (await one(`SELECT edited_by_teacher FROM public.transcript_speaker_metrics WHERE id = $1`, [mk1])).edited_by_teacher, true);
  eq("  only the kept error is published", [await count(KID, "student_error_log", "source_id = $1", [L.T]), await count(KID, "srs_cards")], [1, 1]);
  let ap = await one(`SELECT assignments, withdrawn_at FROM public.transcript_approvals WHERE transcript_id = $1`, [L.T]);
  const entry = ap.assignments.find((x) => x.metric_id === mk1);
  eq("M-2: the approval records the kept errors, and the text before and after",
    [entry.kept_errors.map((e) => e.error_text), entry.draft_error_count, entry.text_before.teacher_feedback, entry.text.teacher_feedback], [[ERR1.error_text], 2, "Well done", null]);
  mrows = await metricRows(L.T);
  const c2 = review.initialChoices(mrows, sugs, ap);
  eq("M-2: 'Approve again' starts with the dropped error UNticked", c2[mk1].keepErrors, [true, false]);
  const again = await approve(TEA, L.T, review.buildAssignments(mrows, sugs, c2));
  ok("approving again, unchanged", again.err === null, again);
  eq("  still the one kept error; the dropped one is not republished",
    [await count(ADMIN, "student_error_log", "source_id = $1", [L.T]), await count(ADMIN, "student_error_log", "source_id = $1 AND error_text = $2", [L.T, ERR2.error_text])], [1, 0]);
  eq("  the dropped feedback stays dropped, the edit stays",
    (await as(KID, `SELECT contribution, teacher_feedback FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L.T])).rows[0], { contribution: "Kiki told us about her weekend.", teacher_feedback: null });
  const w = await withdraw(TEA, L.T);
  ok("withdrawn", w.err === null, w);
  ap = await one(`SELECT assignments, withdrawn_at FROM public.transcript_approvals WHERE transcript_id = $1`, [L.T]);
  eq("M-2: after a withdrawal the boxes still start from what she kept", review.initialChoices(await metricRows(L.T), sugs, ap)[mk1].keepErrors, [true, false]);
}

console.log("=== a withdrawn pick does not live on as a pre-selection (M-3) ===");
{
  const review = await loadReview();
  const sug = await loadTs("supabase/functions/_lib/speaker-suggestion.ts");
  await q(`INSERT INTO public.class_speaker_aliases (class_id, speaker_label, student_id, created_by) VALUES ($1,'bao',$2,$3)`, [CA, BAO_N, TEA]);
  const L = await draftLesson(CA, { title: "Room", date: "2026-11-16" });
  const mb = await L.metric("Bao");
  await as(null, `INSERT INTO public.transcript_speaker_suggestions (metric_id, transcript_id, class_id, speaker_key, suggested_student_id, confidence, basis, labels_from_model)
                  VALUES ($1,$2,$3,'bao',$4,'medium','teacher_alias',true)`, [mb, L.T, CA, BAO_N], { role: "service_role", keep: true });
  eq("M-3: a saved label on a model-made label is NOT pre-selected", review.initialChoices(await metricRows(L.T), await sugRows(L.T))[mb].studentId, null);
  const a = await approve(TEA, L.T, [{ metric_id: mb, student_id: BAO_T, text: TXT }]);
  ok("the teacher picks Bao Tran instead and approves", a.err === null, a);
  eq("  the label now points at Bao Tran", await aliasOf("bao"), BAO_T);
  const aw = (await one(`SELECT alias_writes FROM public.transcript_approvals WHERE transcript_id = $1`, [L.T])).alias_writes;
  eq("  the approval recorded the write and what it replaced", aw.map((x) => [x.speaker_label, x.existed, x.before, x.after]), [["bao", true, BAO_N, BAO_T]]);
  const w = await withdraw(TEA, L.T);
  eq("M-3: withdrawing puts the label back to what it was (Bao Ngoc)", [w.err, w.rows[0]?.r?.aliases_reverted, await aliasOf("bao")], [null, 1, BAO_N]);
  eq("  and the approval lists no alias writes any more", (await one(`SELECT alias_writes FROM public.transcript_approvals WHERE transcript_id = $1`, [L.T])).alias_writes, []);

  const L2 = await draftLesson(CA, { title: "Bee", date: "2026-11-16" });
  const mbee = await L2.metric("Bee");
  await L2.sug(mbee, "bee", null, "low", "none");
  const a1 = await approve(TEA, L2.T, [{ metric_id: mbee, student_id: KIKI, text: TXT }]);
  const a2 = await approve(TEA, L2.T, [{ metric_id: mbee, student_id: ANH, text: TXT }]);
  ok("a new label approved as Kiki, then re-approved as Anh", a1.err === null && a2.err === null, [a1, a2]);
  eq("  re-approving replaced the label (Anh), it did not stack", await aliasOf("bee"), ANH);
  await withdraw(TEA, L2.T);
  eq("M-3: withdrawing removes a label the approval created (not left at Kiki or Anh)", await aliasOf("bee"), null);
  const a3 = await approve(TEA, L2.T, [{ metric_id: mbee, student_id: KIKI, text: TXT }]);
  await q(`UPDATE public.class_speaker_aliases SET student_id = $1 WHERE class_id = $2 AND speaker_label = 'bee'`, [ANH, CA]);
  await withdraw(TEA, L2.T);
  eq("  a label somebody changed since the approval is left as they set it", [a3.err, await aliasOf("bee")], [null, ANH]);

  const roster = [{ id: "kiki", full_name: "Kiki" }, { id: "baoT", full_name: "Bao Tran" }];
  const fromModel = sug.suggestSpeaker("Bao Tran", roster, new Map([["bao tran", "baoT"]]), true);
  eq("M-3: suggestSpeaker caps a saved label on a model-made label at medium", [fromModel.confidence, fromModel.basis], ["medium", "teacher_alias"]);
  eq("M-3: preselects - saved label on a model label no; on a text label yes; the old pipeline's match no",
    [review.preselects({ metric_id: "x", suggested_student_id: "baoT", confidence: "medium", basis: "teacher_alias", labels_from_model: true }),
     review.preselects({ metric_id: "x", suggested_student_id: "baoT", confidence: "high", basis: "teacher_alias", labels_from_model: false }),
     review.preselects({ metric_id: "x", suggested_student_id: "baoT", confidence: "medium", basis: "legacy_auto", labels_from_model: true }),
     review.preselects({ metric_id: "x", suggested_student_id: "baoT", confidence: "medium", basis: "exact_name", labels_from_model: true })],
    [false, true, false, true]);
}

console.log("=== the link guard and the approval oracle (N-1, N-5, N-6) ===");
{
  const L = await draftLesson(CA, { title: "Guard", date: "2026-11-16" });
  const mk1 = await L.metric("Kiki");
  await L.sug(mk1, "kiki", KIKI, "high", "exact_name", []);
  const a = await approve(TEA, L.T, [{ metric_id: mk1, student_id: KIKI, text: TXT }]);
  ok("setup: a lesson approved with Kiki", a.err === null, a);
  const L2 = await draftLesson(CA, { title: "Other", date: "2026-11-17" });
  const m2 = await L2.metric("Kiki");
  const t1 = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L2.T, mk1]);
  ok("N-1: the class's teacher cannot move a linked row to another lesson", /stays with its own lesson/.test(t1.err ?? ""), t1);
  const t2 = await as(null, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L2.T, mk1], { role: "service_role" });
  ok("  nor can the service role", /stays with its own lesson/.test(t2.err ?? ""), t2);
  const t3 = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L.T, m2]);
  ok("N-1: a draft row cannot be moved INTO an approved lesson", /stays with its own lesson/.test(t3.err ?? ""), t3);
  const t4 = await as(ADMIN, `UPDATE public.transcript_speaker_metrics SET class_id = $1 WHERE id = $2`, [CB, m2]);
  ok("N-1: nor into another class (even by an admin)", /stays with its own lesson/.test(t4.err ?? ""), t4);
  const t5 = await as(TEA, `UPDATE public.transcript_speaker_metrics SET contribution = 'Lovely' WHERE id = $1`, [mk1]);
  ok("  the teacher can still correct the text of a row", t5.err === null && t5.n === 1, t5);
  // N-5: a linked row on a lesson with no approval (as the old pipeline left them) cannot be deleted by a re-analysis.
  const L3 = await draftLesson(CA, { title: "Old linked", date: "2026-11-15" });
  const m3 = (await one(`INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3) RETURNING id`, [L3.T, CA, KIKI])).id;
  const d = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L3.T], { role: "service_role" });
  ok("N-5: the analysis (service role) cannot delete a row linked to a child", /linked to a child/.test(d.err ?? ""), d);
  await q(`DELETE FROM public.transcript_speaker_metrics WHERE id = $1`, [m3]);
  const oracle = async (who, role = "authenticated") => (await as(who, `SELECT public.transcript_approval_active($1) AS a`, [L.T], { role })).rows[0]?.a ?? null;
  eq("N-6: transcript_approval_active answers false to a family, a child, a role-less login and another class's teacher",
    [await oracle(PARENT), await oracle(KID), await oracle(NOROLE), await oracle(TEB)], [false, false, false, false]);
  eq("  and true to the class's teacher, an admin and the service role", [await oracle(TEA), await oracle(ADMIN), await oracle(null, "service_role")], [true, true, true]);
  const an = await as(null, `SELECT public.transcript_approval_active($1) AS a`, [L.T], { role: "anon" });
  ok("  anon cannot call it", an.err !== null, an);
  await withdraw(TEA, L.T);
}

console.log("=== taking back what the old pipeline published (M-1, 20261117100100) ===");
{
  const UNPUB = readFileSync(UNPUB_MIG, "utf8");
  const review = await loadReview();
  const legacyLesson = async (title, { edited = false, overview = true } = {}) => {
    const T = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, analyzed_at, source_format)
                          VALUES ($1,$2,$3,'2026-10-01','x','analyzed','Old summary','{"materials":[]}'::jsonb, now(), 'audio') RETURNING id`, [CA, TEA, title])).id;
    if (overview) {
      await q(`INSERT INTO public.lesson_overviews (transcript_id, class_id, lesson_date, summary, homework, materials, edited_by_teacher)
               VALUES ($1,$2,'2026-10-01',$3,'p.5','[{"name":"Book","pages":"3"}]'::jsonb,$4)`, [T, CA, edited ? "The teacher's own summary" : "AI summary", edited]);
    }
    return T;
  };
  // As the old pipeline wrote them: the owner's writes, no created_by.
  const linked = async (T, label, sid, isTeacher = false) => (await one(`INSERT INTO public.transcript_speaker_metrics
      (transcript_id, class_id, speaker_label, student_id, is_teacher, word_count, cefr_estimate, contribution, teacher_feedback)
      VALUES ($1,$2,$3,$4,$5,30,'A2','AI contribution','AI feedback') RETURNING id`, [T, CA, label, sid, isTeacher])).id;
  const oldErr = async (T, sid, e, at, by = null, source = "transcript") => {
    const id = (await one(`INSERT INTO public.student_error_log (student_id, class_id, source, source_id, error_text, corrected_text, error_type, cefr_topic, created_by, created_at)
                           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [sid, CA, source, T, e.error_text, e.corrected_text, e.error_type, e.cefr_topic, by, at])).id;
    await q(`INSERT INTO public.srs_cards (student_id, error_log_id, front, back) VALUES ($1,$2,'f','b')`, [sid, id]);
    return id;
  };
  const oldCefr = (T, sid, level, at, by = null, source = "transcript") =>
    q(`INSERT INTO public.cefr_assessments (student_id, class_id, source, level, level_score, confidence, evidence, source_id, created_by, created_at)
       VALUES ($1,$2,$3,$4,1,0.5,'old evidence',$5,$6,$7)`, [sid, CA, source, level, T, by, at]);

  const LA = await legacyLesson("Legacy A");
  const ma1 = await linked(LA, "Kiki", KIKI);
  const ma2 = await linked(LA, "Bao", BAO_T);          // the old matcher's guess between two Baos
  await linked(LA, "Teacher", null, true);
  await oldErr(LA, KIKI, ERR1, "2026-10-01T10:00:00Z");
  await oldErr(LA, KIKI, ERR2, "2026-10-01T10:00:01Z");
  await oldErr(LA, KIKI, ERR1, "2026-10-02T10:00:00Z");  // a re-analysis wrote it again
  await oldErr(LA, BAO_T, ERR2, "2026-10-01T10:00:02Z");
  await oldCefr(LA, KIKI, "A1", "2026-10-01T10:00:00Z");
  await oldCefr(LA, KIKI, "A2", "2026-10-02T10:00:00Z");
  await oldCefr(LA, BAO_T, "A1", "2026-10-01T10:00:00Z");
  const LB2 = await legacyLesson("Legacy B", { edited: true });
  await linked(LB2, "Anh", ANH);
  await oldCefr(LB2, ANH, "B1", "2026-10-01T10:00:00Z");
  await q(`INSERT INTO public.class_speaker_aliases (class_id, speaker_label, student_id, created_by) VALUES ($1,'anh',$2,$3) ON CONFLICT (class_id, speaker_label) DO UPDATE SET student_id = EXCLUDED.student_id`, [CA, ANH, TEA]);
  // Made by a person, about the same lessons: must stay exactly as they are.
  const handErr = await oldErr(LB2, ANH, { error_text: "teacher's own", corrected_text: "fixed", error_type: "grammar", cefr_topic: null }, "2026-10-03T10:00:00Z", TEA);
  await oldCefr(LB2, ANH, "A2", "2026-10-03T10:00:00Z", TEA);
  const LC = await legacyLesson("Legacy C", { edited: true });   // only the teacher's overview
  // Other features' rows (no created_by on some): must stay too.
  await oldErr(randomUUID(), KIKI, { error_text: "work error", corrected_text: "x", error_type: "grammar", cefr_topic: null }, "2026-10-01T10:00:00Z", null, "student_work");
  await oldErr(randomUUID(), KIKI, { error_text: "video error", corrected_text: "x", error_type: "grammar", cefr_topic: null }, "2026-10-01T10:00:00Z", TEA, "homework");
  await oldCefr(randomUUID(), KIKI, "A1", "2026-10-01T10:00:00Z", null, "ai_report");

  const OURS = [LA, LB2, LC];
  const snapshotOthers = async () => ({
    err: (await q(`SELECT id FROM public.student_error_log WHERE NOT (source = 'transcript' AND source_id = ANY ($1::uuid[]) AND created_by IS NULL) ORDER BY id`, [OURS])).map((r) => r.id).join(),
    cards: (await q(`SELECT s.id FROM public.srs_cards s JOIN public.student_error_log e ON e.id = s.error_log_id WHERE NOT (e.source = 'transcript' AND e.source_id = ANY ($1::uuid[]) AND e.created_by IS NULL) ORDER BY s.id`, [OURS])).map((r) => r.id).join(),
    cefr: (await q(`SELECT id FROM public.cefr_assessments WHERE NOT (source = 'transcript' AND source_id = ANY ($1::uuid[]) AND created_by IS NULL) ORDER BY id`, [OURS])).map((r) => r.id).join(),
    ov: (await q(`SELECT id, summary FROM public.lesson_overviews WHERE NOT (transcript_id = ANY ($1::uuid[])) OR edited_by_teacher ORDER BY id`, [OURS])).map((r) => r.id + r.summary).join(),
    links: (await q(`SELECT id, student_id FROM public.transcript_speaker_metrics WHERE student_id IS NOT NULL AND NOT (transcript_id = ANY ($1::uuid[])) ORDER BY id`, [OURS])).map((r) => r.id + r.student_id).join(),
    approvals: (await q(`SELECT transcript_id, error_log_ids, cefr_ids, overview_id FROM public.transcript_approvals ORDER BY transcript_id`)).map((r) => JSON.stringify(r)).join(),
  });
  // A standing approval elsewhere must not be touched.
  const LK = await draftLesson(CA, { title: "Approved elsewhere", date: "2026-11-16" });
  const mK = await LK.metric("Kiki");
  await LK.sug(mK, "kiki", KIKI, "high", "exact_name", [ERR1]);
  ok("setup: a lesson approved through the new step", (await approve(TEA, LK.T, [{ metric_id: mK, student_id: KIKI, cefr_level: "A2", errors: [ERR1], text: TXT }])).err === null);
  const before = await snapshotOthers();
  eq("before: Kiki's family and login read the old pipeline's rows (the defect)",
    [await count(KID, "student_error_log", "source_id = $1", [LA]), await count(PARENT, "cefr_assessments", "source_id = $1", [LA]), await count(KID, "transcript_speaker_metrics", "transcript_id = $1", [LA]),
     await count(PARENT, "lesson_overviews", "transcript_id = $1", [LA])], [3, 3, 1, 1]);

  // Preflight: fails closed.
  await db.exec(`ALTER TABLE public.transcript_speaker_metrics DISABLE TRIGGER transcript_metrics_link_guard`);
  let err = null; try { await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("preflight: without this round's 20261117100000 (the guard) it refuses", /paste 20261117100000/.test(err ?? ""), err);
  await db.exec(`ALTER TABLE public.transcript_speaker_metrics ENABLE TRIGGER transcript_metrics_link_guard`);
  const bad = await linked(LA, "Unknown", BAO_N);
  err = null; try { await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("preflight: a linked 'Unknown' speaker it does not expect - refuses", /teacher or the "Unknown"/.test(err ?? ""), err);
  eq("  ...and nothing moved", [await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id IS NOT NULL", [LA]), await count(ADMIN, "student_error_log", "source_id = $1", [LA]),
    (await one(`SELECT to_regclass('public.transcript_legacy_holds') IS NULL AS none`)).none], [3, 4, true]);
  await q(`DELETE FROM public.transcript_speaker_metrics WHERE id = $1`, [bad]);
  const orphan = await oldErr(LA, ANH, ERR1, "2026-10-01T10:00:00Z");
  err = null; try { await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("preflight: a published error of a child no speaker of that lesson is linked to - refuses", /belong to no linked speaker/.test(err ?? ""), err);
  await q(`DELETE FROM public.student_error_log WHERE id = $1`, [orphan]);

  err = null; let res = null;
  try { res = await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  ok("the take-back runs", err === null, err);
  const summary = res?.find((r) => r.rows?.[0] && "lessons" in r.rows[0])?.rows?.[0];
  eq("  its counts: 3 lessons, 3 links for 3 children, 4 errors, 4 cards, 4 CEFR points taken down; 1 overview taken down, 2 teacher overviews kept",
    summary && [summary.lessons, summary.metric_links_unlinked, summary.children, summary.error_rows_removed, summary.cards_removed, summary.cefr_removed, summary.overviews_removed, summary.overviews_kept].map(Number),
    [3, 3, 3, 4, 4, 4, 1, 2]);

  eq("Kiki's login and family read nothing of the old lesson now",
    [await count(KID, "student_error_log", "source_id = $1", [LA]), (await one(`SELECT count(*)::int AS n FROM public.srs_cards s WHERE s.error_log_id IN (SELECT id FROM public.student_error_log WHERE source_id = $1)`, [LA])).n, await count(PARENT, "cefr_assessments", "source_id = $1", [LA]),
     await count(KID, "transcript_speaker_metrics", "transcript_id = $1", [LA]), await count(PARENT, "lesson_overviews", "transcript_id = $1", [LA])],
    [0, 0, 0, 0, 0]);
  eq("  no row of these lessons is linked to a child", await count(ADMIN, "transcript_speaker_metrics", "transcript_id = ANY ($1::uuid[]) AND student_id IS NOT NULL", [OURS]), 0);
  eq("every row a person or another feature made is exactly as it was (ids, overviews' text, links, approvals)", await snapshotOthers(), before);
  eq("  the teacher's own error and level on Legacy B are still published", [await count(ADMIN, "student_error_log", "id = $1", [handErr]), await count(ADMIN, "cefr_assessments", "source_id = $1 AND created_by IS NOT NULL", [LB2])], [1, 1]);
  eq("  the two teacher-edited overviews are still published, unchanged", (await q(`SELECT summary FROM public.lesson_overviews WHERE transcript_id = ANY ($1::uuid[]) ORDER BY summary`, [OURS])).map((r) => r.summary),
    ["The teacher's own summary", "The teacher's own summary"]);

  const holds = await q(`SELECT h.transcript_id, x->>'table' AS t, count(*)::int AS n FROM public.transcript_legacy_holds h, jsonb_array_elements(h.held_rows) x GROUP BY 1, 2 ORDER BY 1, 2`);
  const held = (T) => Object.fromEntries(holds.filter((h) => h.transcript_id === T).map((h) => [h.t, h.n]));
  eq("every row taken down was copied, whole, first (Legacy A)", held(LA), { cefr_assessments: 3, lesson_overviews: 1, srs_cards: 4, student_error_log: 4, transcript_speaker_metrics: 2 });
  eq("  (Legacy B: its link, its pipeline CEFR point, and its kept overview on record)", held(LB2), { cefr_assessments: 1, lesson_overviews: 1, transcript_speaker_metrics: 1 });
  eq("  (Legacy C: the kept teacher overview on record)", held(LC), { lesson_overviews: 1 });
  const fullCopy = (await one(`SELECT x->'row' AS r FROM public.transcript_legacy_holds h, jsonb_array_elements(h.held_rows) x WHERE h.transcript_id = $1 AND x->>'table' = 'transcript_speaker_metrics' AND x->'row'->>'speaker_label' = 'Bao'`, [LA])).r;
  eq("  a held metric row keeps its old child and its text", [fullCopy.student_id, fullCopy.teacher_feedback], [BAO_T, "AI feedback"]);
  eq("the holding table: staff of the class only", [await count(PARENT, "transcript_legacy_holds"), await count(KID, "transcript_legacy_holds"), await count(NOROLE, "transcript_legacy_holds"),
    await count(TEB, "transcript_legacy_holds"), await count(TEA, "transcript_legacy_holds"), await count(ADMIN, "transcript_legacy_holds")], [0, 0, 0, 0, 3, 3]);
  const pol = await q(`SELECT cmd FROM pg_policies WHERE schemaname = 'public' AND tablename = 'transcript_legacy_holds'`);
  eq("  one SELECT policy, no write policy", pol.map((p) => p.cmd), ["SELECT"]);

  const sA = Object.fromEntries((await sugRows(LA)).map((s) => [s.metric_id, s]));
  // Kiki: the standing approval above saved the label "kiki" for her, so the basis says so; Bao Tran is the old guess.
  eq("the old link is kept as a suggestion only: Kiki (a label the teacher saved) and Bao Tran ('legacy_auto'), medium, labels treated as model-made",
    [[sA[ma1]?.suggested_student_id, sA[ma1]?.confidence, sA[ma1]?.basis, sA[ma1]?.labels_from_model], [sA[ma2]?.suggested_student_id, sA[ma2]?.confidence, sA[ma2]?.basis]],
    [[KIKI, "medium", "teacher_alias", true], [BAO_T, "medium", "legacy_auto"]]);
  eq("  Kiki's drafted errors are her published ones, de-duplicated, in order; her level the latest point",
    [sA[ma1]?.draft_errors.map((e) => e.error_text), sA[ma1]?.cefr_estimate], [[ERR1.error_text, ERR2.error_text], "A2"]);
  const sB = await sugRows(LB2);
  eq("  a child the teacher saved for that label (Anh) is 'teacher_alias'", sB.map((s) => [s.suggested_student_id, s.basis]), [[ANH, "teacher_alias"]]);
  const choices = review.initialChoices(await metricRows(LA), await sugRows(LA));
  eq("the screen pre-selects NOBODY from the old pipeline's match", Object.values(choices).map((c) => c.studentId), [null, null]);
  const tr = Object.fromEntries((await q(`SELECT id, overview_draft, analysis, status FROM public.class_transcripts WHERE id = ANY ($1::uuid[])`, [OURS])).map((t) => [t.id, t]));
  eq("each lesson is a draft for the panel (no re-analysis)", OURS.map((T) => review.reviewState(tr[T], null)), ["draft", "draft", "draft"]);
  eq("the draft overview: the AI one stays AI; a teacher's own text stays the teacher's (N-9)",
    [[tr[LA].overview_draft.summary, tr[LA].overview_draft.edited_by_teacher], [tr[LB2].overview_draft.summary, tr[LB2].overview_draft.edited_by_teacher], [tr[LC].overview_draft.summary, tr[LC].overview_draft.edited_by_teacher]],
    [["AI summary", false], ["The teacher's own summary", true], ["The teacher's own summary", true]]);

  const holdsBefore = JSON.stringify(await q(`SELECT transcript_id, held_rows FROM public.transcript_legacy_holds ORDER BY 1`));
  const sugsBefore = await count(ADMIN, "transcript_speaker_suggestions");
  err = null; try { res = await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  const s2 = res?.find((r) => r.rows?.[0] && "lessons" in r.rows[0])?.rows?.[0];
  ok("pasted a second time: runs, finds nothing", err === null && Number(s2?.lessons) === 0, [err, s2]);
  eq("  holds nothing more, drafts nothing more, changes nothing else",
    [JSON.stringify(await q(`SELECT transcript_id, held_rows FROM public.transcript_legacy_holds ORDER BY 1`)) === holdsBefore, await count(ADMIN, "transcript_speaker_suggestions"), JSON.stringify(await snapshotOthers()) === JSON.stringify(before)],
    [true, sugsBefore, true]);

  // The teacher approves, through the panel, with no paid re-analysis.
  const mrows = await metricRows(LA);
  const sugs = await sugRows(LA);
  const c = review.initialChoices(mrows, sugs);
  c[ma1].studentId = KIKI;                    // the teacher confirms Kiki; leaves "Bao" unknown
  const ap = await approve(TEA, LA, review.buildAssignments(mrows, sugs, c));
  ok("Legacy A: approved WITHOUT the replace step (nothing of the old pipeline is left published)", ap.err === null, ap);
  eq("  Kiki gets what the teacher kept; Bao Tran (the old guess) gets nothing",
    [await count(KID, "student_error_log", "source_id = $1", [LA]), await count(PARENT, "cefr_assessments", "source_id = $1 AND student_id = $2", [LA, KIKI]),
     await count(ADMIN, "student_error_log", "source_id = $1 AND student_id = $2", [LA, BAO_T]), await count(ADMIN, "transcript_speaker_metrics", "transcript_id = $1 AND student_id = $2", [LA, BAO_T])], [2, 1, 0, 0]);
  const apC = await approve(TEA, LC, []);
  ok("Legacy C (the teacher's overview only): approved without the replace step", apC.err === null, apC);
  eq("  the published overview is still the teacher's text, not the AI's", (await one(`SELECT summary FROM public.lesson_overviews WHERE transcript_id = $1`, [LC])).summary, "The teacher's own summary");
  const apB = await approve(TEA, LB2, [], { keep: false });
  ok("Legacy B: the teacher's OWN error and level from the old screen are not silently replaced - the replace step is asked (2 items)",
    /earlier automatic analysis \(2 item/.test(apB.err ?? ""), apB);

  // Rows the old function wrote after the first paste (deploy order not kept) are taken back by pasting again.
  const LD = await legacyLesson("Legacy D");
  const mD = await linked(LD, "Bảo Ngọc", BAO_N);
  err = null; try { res = await db.exec(UNPUB); } catch (e) { err = e.message; await db.exec("ROLLBACK").catch(() => {}); }
  const s3 = res?.find((r) => r.rows?.[0] && "lessons" in r.rows[0])?.rows?.[0];
  ok("a later paste takes back a lesson published after the first one (1 lesson, 1 link)", err === null && Number(s3?.lessons) === 1 && Number(s3?.metric_links_unlinked) === 1, [err, s3]);
  const sugLib = await loadTs("supabase/functions/_lib/speaker-suggestion.ts");
  eq("  its speaker key is the one the function computes (diacritics stripped), so the approval saves a usable label",
    (await one(`SELECT speaker_key FROM public.transcript_speaker_suggestions WHERE metric_id = $1`, [mD])).speaker_key, sugLib.speakerKey("Bảo Ngọc"));
  eq("  Legacy A, approved meanwhile, was left alone", [await count(ADMIN, "student_error_log", "source_id = $1", [LA]), await count(ADMIN, "transcript_approvals", "transcript_id = $1 AND withdrawn_at IS NULL", [LA])], [2, 1]);
}


// =================================================================== part 2
console.log("=== the function: what it writes, and what it asks the model ===");
const SERVICE_KEY = "test-service-role-key";
const ANON_KEY = "test-anon-key";
const tokenOf = (u) => `jwt-${u}`;
const world = { tables: {}, log: [], vendor: [], roles: {} };
const embed = (table, row, select) => {
  const out = { ...row };
  if (table === "enrollments" && /students\(/.test(select)) out.students = (world.tables.students || []).find((s) => s.id === row.student_id) ?? null;
  if (table === "sessions" && /teachers\(/.test(select)) out.teachers = (world.tables.teachers || []).find((t) => t.id === row.teacher_id) ?? null;
  return out;
};
function fakeClient(key) {
  const who = key === SERVICE_KEY ? "service" : "other";
  const from = (table) => {
    const st = { op: "select", eq: [], neq: [], in: [], payload: null, single: false, maybe: false, returning: false, limit: null, select: "*" };
    const rows = () => (world.tables[table] ??= []);
    const match = (r) => st.eq.every(([c, v]) => r[c] === v) && st.neq.every(([c, v]) => r[c] !== v) && st.in.every(([c, vs]) => vs.includes(r[c]));
    const exec = () => {
      world.log.push({ client: who, table, op: st.op });
      let data;
      if (st.op === "select") data = rows().filter(match).map((r) => embed(table, r, st.select));
      else if (st.op === "insert" || st.op === "upsert") {
        const list = (Array.isArray(st.payload) ? st.payload : [st.payload]).map((p) => ({ id: p.id ?? randomUUID(), ...p }));
        rows().push(...list); data = list;
      } else if (st.op === "update") { data = rows().filter(match); for (const r of data) Object.assign(r, st.payload); }
      else if (st.op === "delete") { data = rows().filter(match); world.tables[table] = rows().filter((r) => !match(r)); }
      if (st.limit !== null) data = data.slice(0, st.limit);
      if (st.single || st.maybe) {
        if (data.length > 1) return { data: null, error: { message: "multiple rows" } };
        if (data.length === 0) return st.single ? { data: null, error: { message: "no rows" } } : { data: null, error: null };
        return { data: data[0], error: null };
      }
      return { data: st.op === "select" || st.returning ? data : null, error: null };
    };
    const b = new Proxy({}, {
      get(_t, prop) {
        if (prop === "then") return (res, rej) => Promise.resolve().then(exec).then(res, rej);
        return (...a) => {
          if (prop === "eq") st.eq.push([a[0], a[1]]);
          else if (prop === "neq") st.neq.push([a[0], a[1]]);
          else if (prop === "in") st.in.push([a[0], a[1]]);
          else if (prop === "limit") st.limit = a[0];
          else if (["insert", "upsert", "update", "delete"].includes(prop)) { st.op = prop; st.payload = a[0]; }
          else if (prop === "select") { if (st.op !== "select") st.returning = true; else st.select = a[0] ?? "*"; }
          else if (prop === "single") st.single = true;
          else if (prop === "maybeSingle") st.maybe = true;
          return b;
        };
      },
    });
    return b;
  };
  return {
    from,
    rpc: async (name, args) => {
      world.log.push({ client: who, rpc: name });
      if (name === "is_teacher_of_class") return { data: (world.teacherOf[args.user_id] || []).includes(args.class_id), error: null };
      return { data: null, error: null };
    },
    auth: {
      getUser: async (token) => {
        const uid = Object.keys(world.roles).find((u) => tokenOf(u) === token);
        return uid ? { data: { user: { id: uid, email: null } }, error: null } : { data: { user: null }, error: { message: "invalid JWT" } };
      },
    },
  };
}
globalThis.__fakeCreateClient = (_url, key) => fakeClient(key);
// user_roles comes from world.roles.
const baseFrom = fakeClient;
globalThis.__fakeCreateClient = (_url, key) => {
  const c = baseFrom(key);
  const from = c.from;
  c.from = (table) => {
    if (table === "user_roles") world.tables.user_roles = Object.entries(world.roles).flatMap(([u, rs]) => rs.map((role) => ({ user_id: u, role })));
    return from(table);
  };
  return c;
};

// The scripted model: a reply per job, keyed by the system prompt.
const MODEL = {
  report: { summary: "The class practised the past simple.", objectives: [], chronology: [], engagement: [], misconceptions: [], interventions: [],
    general_understanding: "", next_steps: [], materials: [{ name: "Book 2", pages: "14" }], homework: "Page 15", title_coverage: { covered: true, evidence: [], note: "" } },
  students: { students: [
    { name: "Kiki", cefr_estimate: "A2", confidence: 0.7, errors: [ERR1], highlights: [], contribution: "Told us about her weekend.", teacher_feedback: "Great story!", recommendation: "Practise -ed", evidence: "Past forms with help" },
    { name: "Bao", cefr_estimate: "A1", confidence: 0.5, errors: [ERR2], highlights: [], contribution: "Answered once.", teacher_feedback: "Good try", recommendation: "Irregular verbs", evidence: "Short answers" },
    { name: "An", cefr_estimate: "A1", confidence: 0.4, errors: [], highlights: [], contribution: "", teacher_feedback: "", recommendation: "", evidence: "" },
  ] },
  awards: { awards: [{ student_name: "Kiki", points: 5, quote: "Five stars Kiki!", reason: "great answer" }, { student_name: "Bao", points: 2, quote: "Two points Bao", reason: null }] },
  diarize: { utterances: [{ speaker: "Teacher", text: "Who went to the park?" }, { speaker: "Kiki", text: "I go to the park yesterday with my brother." }, { speaker: "Bao", text: "Me too I goed to school today." }] },
};
globalThis.fetch = async (url, init = {}) => {
  const body = init.body ? JSON.parse(init.body) : {};
  world.vendor.push({ url: String(url), body });
  const sys = String(body.messages?.[0]?.content ?? "");
  const reply = /segment a raw classroom/.test(sys) ? MODEL.diarize : /post-lesson report/.test(sys) ? MODEL.report
    : /ESL assessment specialist/.test(sys) ? MODEL.students : /POINT AWARDS/.test(sys) ? MODEL.awards : {};
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(reply) } }] }), { status: 200, headers: { "content-type": "application/json" } });
};
const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY, SUPABASE_ANON_KEY: ANON_KEY, OPENAI_API_KEY: "k-openai" };
let captured = null;
globalThis.__capture = (h) => { captured = h; };
globalThis.Deno = { serve: (h) => { captured = h; }, env: { get: (k) => env[k] } };
let pendingWork = [];
globalThis.EdgeRuntime = { waitUntil: (p) => { pendingWork.push(p); } };

let seq = 0;
async function loadFn() {
  const name = "analyze-transcript";
  const out = await build({
    entryPoints: [resolve(repo, "supabase", "functions", name, "index.ts")],
    bundle: true, format: "esm", platform: "neutral", write: false, logLevel: "silent",
    plugins: [{ name: "remote", setup(b) {
      b.onResolve({ filter: /^(https?:\/\/|npm:|jsr:)/ }, (a) => ({ path: a.path, namespace: "remote" }));
      b.onLoad({ filter: /.*/, namespace: "remote" }, () => ({ loader: "js",
        contents: `export const createClient = (...a) => globalThis.__fakeCreateClient(...a); export const serve = (h) => globalThis.__capture(h); export default {};` }));
    } }],
  });
  const p = resolve(tmpdir(), `transcript-drafts.${process.pid}.${seq++}.mjs`);
  writeFileSync(p, out.outputFiles[0].text);
  captured = null;
  try { await import(pathToFileURL(p).href); } finally { try { unlinkSync(p); } catch { /* ignore */ } }
  return captured;
}
const quiet = { log: console.log, warn: console.warn, error: console.error };
async function call(handler, { token, body }) {
  world.log = []; world.vendor = [];
  const headers = { "content-type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  console.log = console.warn = console.error = () => {};
  try {
    const res = await handler(new Request("https://example.supabase.co/functions/v1/analyze-transcript", { method: "POST", headers, body: JSON.stringify(body ?? {}) }));
    await Promise.all(pendingWork.splice(0));
    const text = await res.text();
    let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, vendor: world.vendor.slice(), writes: world.log.filter((e) => e.op && e.op !== "select").map((e) => `${e.op}:${e.table}`) };
  } finally { Object.assign(console, quiet); }
}

// The world the function sees: the same class and children as the database above.
const T_PASTE = randomUUID(), T_AUDIO = randomUUID(), T_ROOM = randomUUID(), T_APPROVED = randomUUID();
const PASTE = [
  "Teacher: Good morning everyone. What did you do yesterday?",
  "Kiki: I go to the park yesterday with my brother.",
  "Kiki: It was very fun and sunny and we played football.",
  "Bao: Me too I goed to school and then I played games.",
  "An: I like it very much teacher it was a good day.",
  "Teacher: Five stars Kiki! Great answer. Two points Bao.",
].join("\n");
function resetWorld() {
  world.roles = { [TEA]: ["teacher"], [TEB]: ["teacher"], [ADMIN]: ["admin"], [PARENT]: ["family"], [KID]: ["student"], [NOROLE]: [] };
  world.teacherOf = { [TEA]: [CA], [TEB]: [CB] };
  const tr = (id, extra) => ({ id, class_id: CA, uploaded_by: TEA, transcript_date: "2026-11-16", title: "Past simple", lesson_context: null,
    status: "processing", source_format: "paste", raw_text: PASTE, overview_draft: null, ...extra });
  world.tables = {
    class_transcripts: [tr(T_PASTE), tr(T_AUDIO, { source_format: "audio" }), tr(T_ROOM, { raw_text: "who went to the park kiki i go to the park yesterday bao me too i goed to school" }), tr(T_APPROVED)],
    transcript_approvals: [{ transcript_id: T_APPROVED, withdrawn_at: null }],
    students: [{ id: KIKI, full_name: "Kiki" }, { id: BAO_T, full_name: "Bao Tran" }, { id: BAO_N, full_name: "Bao Ngoc" }, { id: ANH, full_name: "Anh" }],
    enrollments: [KIKI, BAO_T, BAO_N, ANH].map((s) => ({ student_id: s, class_id: CA, end_date: null })),
    teachers: [{ id: tA, full_name: "Ms Lan" }],
    sessions: [{ id: randomUUID(), class_id: CA, teacher_id: tA, date: "2026-11-16" }],
    class_speaker_aliases: [], classes: [{ id: CA, name: "Class A" }], cefr_assessments: [], lesson_overviews: [], attendance: [],
    transcript_speaker_metrics: [], transcript_speaker_suggestions: [], transcript_point_suggestions: [],
  };
}
const PUBLISHED = ["student_error_log", "srs_cards", "cefr_assessments", "lesson_overviews", "student_learning_profiles"];
const fn = await loadFn();
ok("the real analyze-transcript loads and registers a handler", typeof fn === "function");

{
  resetWorld();
  for (const [label, token, status] of [["no Authorization header", null, 401], ["the public (anon) key", ANON_KEY, 401], ["an account with no role", tokenOf(NOROLE), 403],
    ["a family login", tokenOf(PARENT), 403], ["a child's login", tokenOf(KID), 403]]) {
    const r = await call(fn, { token, body: { transcript_id: T_PASTE } });
    ok(`${label}: ${status}, no model call, nothing read or written`, r.status === status && r.vendor.length === 0 && world.log.filter((e) => e.table && e.table !== "user_roles").length === 0, r);
  }
  const other = await call(fn, { token: tokenOf(TEB), body: { transcript_id: T_PASTE } });
  ok("a teacher of another class: 403, no model call", other.status === 403 && other.vendor.length === 0, other);
  const appr = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_APPROVED } });
  ok("an approved lesson: 409 (withdraw first), no model call, nothing written", appr.status === 409 && appr.vendor.length === 0 && appr.writes.length === 0, appr);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_PASTE } });
  ok("the class's teacher: analysed (200)", r.status === 200 && r.json?.success === true, r);
  eq("N-8: a synchronous run marks the lesson 'processing' before anything else (no approving the old draft mid-run)", r.writes[0], "update:class_transcripts");
  ok("  the model was asked (vendor calls made)", r.vendor.length >= 3, r.vendor.length);
  eq("  NOTHING was written to a table a child or family reads", r.writes.filter((w) => PUBLISHED.some((t) => w.endsWith(`:${t}`))), []);
  const metrics = world.tables.transcript_speaker_metrics;
  eq("  every metric row is unlinked (student_id null)", metrics.map((m) => m.student_id), metrics.map(() => null));
  const sug = Object.fromEntries(world.tables.transcript_speaker_suggestions.map((s) => [metrics.find((m) => m.id === s.metric_id)?.speaker_label, s]));
  eq("  suggestions: Kiki high (exact name, from the text); Bao low (two Baos: a tie); An low (no match)",
    [[sug.Kiki?.confidence, sug.Kiki?.suggested_student_id], [sug.Bao?.confidence, sug.Bao?.suggested_student_id], [sug.An?.confidence, sug.An?.suggested_student_id]],
    [["high", KIKI], ["low", null], ["low", null]]);
  eq("  no suggestion row for the teacher's speech", Object.keys(sug).includes("Teacher"), false);
  eq("  the drafted errors and CEFR estimate are held on the suggestion", [sug.Kiki?.draft_errors?.length, sug.Kiki?.cefr_estimate, sug.Bao?.draft_errors?.length], [1, "A2", 1]);
  const pts = world.tables.transcript_point_suggestions;
  eq("  point awards: Kiki's names Kiki (a model-extracted name, medium at most); Bao's names nobody (low)",
    pts.map((p) => [p.speaker_label, p.student_id]).sort(), [["Bao", null], ["Kiki", KIKI]]);
  const tr = world.tables.class_transcripts.find((t) => t.id === T_PASTE);
  eq("  the overview is a DRAFT on the transcript row", [tr.status, tr.overview_draft?.summary, tr.overview_draft?.homework, tr.analysis?.drafted_for_review], ["analyzed", "The class practised the past simple.", "Page 15", true]);
  eq("  the response says it needs a teacher's approval", [r.json?.needs_approval, r.json?.suggested_students, r.json?.errors_drafted], [true, 1, 2]);

  // Into the real schema: the drafts, as written, then the teacher's approval.
  const T = (await one(`INSERT INTO public.class_transcripts (id, class_id, uploaded_by, title, transcript_date, raw_text, status, summary, analysis, overview_draft, analyzed_at)
                        VALUES ($1,$2,$3,$4,$5,'x','analyzed',$6,$7::jsonb,$8::jsonb, now()) RETURNING id`,
    [T_PASTE, CA, TEA, tr.title, tr.transcript_date, tr.summary, JSON.stringify(tr.analysis), JSON.stringify(tr.overview_draft)])).id;
  let loadErr = null;
  // Every column the function sent must exist (an unknown key is an error
  // here, not silently dropped); created_at is the table's default.
  const loadRows = async (table, list) => {
    const known = (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`, [table])).map((c) => c.column_name);
    for (const raw of list) {
      // The stand-in gives every inserted row an id; a table keyed otherwise has none.
      const row = { ...raw };
      if (!known.includes("id")) delete row.id;
      const unknown = Object.keys(row).filter((k) => !known.includes(k));
      if (unknown.length) { loadErr = `${table}: the function wrote columns the table does not have: ${unknown.join(", ")}`; continue; }
      const r2 = await as(null, `INSERT INTO public.${table} SELECT * FROM jsonb_populate_record(NULL::public.${table}, $1::jsonb)`,
        [JSON.stringify({ created_at: new Date().toISOString(), ...row })], { role: "service_role", keep: true });
      if (r2.err) loadErr = `${table}: ${r2.err}`;
    }
  };
  await loadRows("transcript_speaker_metrics", metrics);
  await loadRows("transcript_speaker_suggestions", world.tables.transcript_speaker_suggestions);
  ok("the rows the function wrote fit the migration's columns and CHECKs, as the service role, through the link guard", loadErr === null, loadErr);
  // What the screen sends: its own pre-selection (tested in part 3) - Kiki only.
  const review = await loadReview();
  const mRows = (await q(`SELECT id, speaker_label, is_teacher, student_id, cefr_estimate FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [T]));
  const sRows = (await q(`SELECT metric_id, suggested_student_id, confidence, draft_errors, cefr_estimate FROM public.transcript_speaker_suggestions WHERE transcript_id = $1`, [T]));
  const choices = review.initialChoices(mRows, sRows);
  const payload = review.buildAssignments(mRows, sRows, choices);
  const a = await approve(TEA, T, payload);
  ok("the teacher approves what the screen pre-selected", a.err === null, a);
  eq("  Kiki: her error and level are published", [await count(KID, "student_error_log", "source_id = $1", [T]), await count(PARENT, "cefr_assessments", "source_id = $1", [T])], [1, 1]);
  eq("  the LOW suggestions landed on no child: no row for either Bao or Anh from this lesson",
    (await one(`SELECT (SELECT count(*)::int FROM public.student_error_log WHERE source_id = $1 AND student_id <> $2)
                     + (SELECT count(*)::int FROM public.cefr_assessments WHERE source_id = $1 AND student_id <> $2)
                     + (SELECT count(*)::int FROM public.transcript_speaker_metrics WHERE transcript_id = $1 AND student_id IS NOT NULL AND student_id <> $2) AS n`, [T, KIKI])).n, 0);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_AUDIO } });
  const sug = world.tables.transcript_speaker_suggestions.map((s) => [world.tables.transcript_speaker_metrics.find((m) => m.id === s.metric_id)?.speaker_label, s.confidence, s.labels_from_model]);
  ok("a recording's transcript (labels made by the diarizing model): analysed", r.status === 200, r);
  eq("  the exact name match is only MEDIUM, and marked as a model-made label", sug.find((x) => x[0] === "Kiki"), ["Kiki", "medium", true]);
}
{
  resetWorld();
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_ROOM, background: true } });
  ok("an unlabelled room transcript, queued in the background: 200 queued", r.status === 200 && r.json?.queued === true, r);
  ok("  the diarizing model was asked to attribute speakers", r.vendor.some((v) => /segment a raw classroom/.test(String(v.body?.messages?.[0]?.content ?? ""))));
  const sug = world.tables.transcript_speaker_suggestions.map((s) => [world.tables.transcript_speaker_metrics.find((m) => m.id === s.metric_id)?.speaker_label, s.confidence, s.suggested_student_id]);
  eq("  its attribution is a suggestion: Kiki medium, Bao low (no child)", sug.sort(), [["Bao", "low", null], ["Kiki", "medium", KIKI]].sort());
  eq("  and nothing was published", r.writes.filter((w) => PUBLISHED.some((t) => w.endsWith(`:${t}`))), []);
}
{
  resetWorld();
  const r = await call(fn, { token: SERVICE_KEY, body: { transcript_id: T_PASTE } });
  ok("transcribe-lesson-audio's hand-off (service-role key) still runs", r.status === 200 && r.json?.success === true, r);
}
{
  resetWorld();
  const tr = world.tables.class_transcripts.find((t) => t.id === T_PASTE);
  tr.overview_draft = { summary: "The teacher's own summary", materials: [], homework: null, edited_by_teacher: true, from_published: true };
  const r = await call(fn, { token: tokenOf(TEA), body: { transcript_id: T_PASTE } });
  eq("N-9: a re-analysis keeps a draft overview that is the teacher's text (as 20261117100100 seeds it)", [r.status, tr.overview_draft?.summary], [200, "The teacher's own summary"]);
}
{
  resetWorld();
  const src = readFileSync(resolve(repo, "supabase", "functions", "analyze-transcript", "index.ts"), "utf8");
  ok("the function writes none of the published tables (source)", !/from\("(student_error_log|srs_cards|cefr_assessments)"\)\s*\.(insert|upsert|update|delete)/.test(src)
    && !/from\("lesson_overviews"\)\s*\.(insert|upsert|update|delete)/.test(src) && !/fireProfileRefresh/.test(src));
}

// =================================================================== part 3

console.log("=== the screen's reasoning (src/lib/transcriptReview.ts) ===");
{
  const r = await loadReview();
  const metrics = [
    { id: "m1", speaker_label: "Kiki", is_teacher: false, student_id: null },
    { id: "m2", speaker_label: "Bao", is_teacher: false, student_id: null },
    { id: "m3", speaker_label: "Teacher", is_teacher: true, student_id: null },
    { id: "m4", speaker_label: "Unknown", is_teacher: false, student_id: null },
    { id: "m5", speaker_label: "Anna", is_teacher: false, student_id: null },
  ];
  const sugg = [
    { metric_id: "m1", suggested_student_id: "kiki", confidence: "high", draft_errors: [ERR1], cefr_estimate: "A2" },
    { metric_id: "m2", suggested_student_id: null, confidence: "low", draft_errors: [ERR2], cefr_estimate: "A1" },
    // A low row that (wrongly) still named a child: the screen must not use it either.
    { metric_id: "m5", suggested_student_id: "anna", confidence: "low", draft_errors: [], cefr_estimate: null },
  ];
  const c = r.initialChoices(metrics, sugg);
  eq("high is pre-selected; low starts unknown, even when a low row names someone; teacher and Unknown are not offered",
    Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v.studentId])), { m1: "kiki", m2: null, m5: null });
  eq("medium is pre-selected too", r.initialChoices([metrics[0]], [{ ...sugg[0], confidence: "medium" }]).m1.studentId, "kiki");
  const p = r.buildAssignments(metrics, sugg, c);
  eq("the payload: only the teacher's choices; an unknown speaker carries no errors or level",
    p, [{ metric_id: "m1", student_id: "kiki", cefr_level: "A2", errors: [ERR1], text: { contribution: null, teacher_feedback: null, recommendation: null, highlights: [] } }, { metric_id: "m2", student_id: null }, { metric_id: "m5", student_id: null }]);
  c.m1.keepErrors = [false]; c.m1.cefrLevel = "Z9";
  eq("a dropped error and an invalid level are not sent", r.buildAssignments(metrics, sugg, c)[0], { metric_id: "m1", student_id: "kiki", cefr_level: null, errors: [], text: { contribution: null, teacher_feedback: null, recommendation: null, highlights: [] } });
  eq("an approved lesson starts from what was approved", r.initialChoices([{ ...metrics[1], student_id: "baoT", cefr_estimate: "A1" }], sugg).m2, { studentId: "baoT", cefrLevel: "A1", keepErrors: [true], text: { contribution: "", teacher_feedback: "", recommendation: "", keepHighlights: [] } });
  eq("review states", [r.reviewState({ status: "analyzed", analysis: { drafted_for_review: true } }, null), r.reviewState({ status: "analyzed", analysis: {} }, null),
    r.reviewState({ status: "analyzed" }, { withdrawn_at: null }), r.reviewState({ status: "analyzed", analysis: { drafted_for_review: true } }, { withdrawn_at: "x" }),
    r.reviewState({ status: "processing" }, null)], ["draft", "legacy", "approved", "withdrawn", "processing"]);
  eq("the legacy refusal is recognised by its hint", [r.isLegacyRefusal({ hint: "TRANSCRIPT_LEGACY_ROWS" }), r.isLegacyRefusal({ message: "other" })], [true, false]);
}

{
  const page = readFileSync(resolve(repo, "src", "pages", "TeacherTranscripts.tsx"), "utf8");
  ok("N-7: Retry transcription is disabled on an approved lesson", /disabled={retryTranscriptionMutation.isPending || isApproved}/.test(page));
  const panel = readFileSync(resolve(repo, "src", "components", "teacher", "TranscriptApprovalPanel.tsx"), "utf8");
  ok("M-4: the panel edits and names everything the approval publishes about a child",
    ["\"contribution\"", "\"teacher_feedback\"", "\"recommendation\"", "keepHighlights", "speaking", "An empty box publishes nothing"].every((x) => panel.includes(x)));
}

console.log("=== the suggestion rule (_lib/speaker-suggestion.ts) ===");
{
  const s = await loadTs("supabase/functions/_lib/speaker-suggestion.ts");
  const roster = [{ id: "kiki", full_name: "Kiki" }, { id: "baoT", full_name: "Bao Tran" }, { id: "baoN", full_name: "Bao Ngoc" }, { id: "anna", full_name: "Anna Lê" }, { id: "minh", full_name: "Minh Đức" }];
  const none = new Map();
  const t = (label, fromModel = false, aliases = none) => { const x = s.suggestSpeaker(label, roster, aliases, fromModel); return [x.confidence, x.studentId]; };
  eq("exact name from the text: high", t("Kiki"), ["high", "kiki"]);
  eq("exact name from the model: medium", t("Kiki", true), ["medium", "kiki"]);
  eq("diacritics and case do not matter", t("ANNA LE"), ["high", "anna"]);
  eq("a unique whole-word contains ('Anna' / 'Anna Lê'): medium", t("Anna"), ["medium", "anna"]);
  eq("a tie ('Bao' / two Baos): low, no child", t("Bao"), ["low", null]);
  eq("a scrap of a name ('An'): low, no child", t("An"), ["low", null]);
  eq("a unique token match from the text ('Duc Minh'): medium", t("Duc Minh"), ["medium", "minh"]);
  eq("the same from the model: low, no child", t("Duc Minh", true), ["low", null]);
  eq("no match: low, no child", t("Zed"), ["low", null]);
  eq("Unknown and Teacher: low, no child", [t("Unknown"), t("Teacher")], [["low", null], ["low", null]]);
  eq("a teacher's saved choice for a label from the text: high", t("Kiwi", false, new Map([["kiwi", "kiki"]])), ["high", "kiki"]);
  eq("the same saved choice on a label the MODEL made: only medium (review M-3)", t("Kiwi", true, new Map([["kiwi", "kiki"]])), ["medium", "kiki"]);
  eq("a saved choice for a child no longer in the class is ignored", t("Kiwi", false, new Map([["kiwi", "gone"]])), ["low", null]);
  ok("every low answer names no child", ["Bao", "An", "Zed", "Unknown", "Duc Minh"].every((l) => s.suggestSpeaker(l, roster, none, true).confidence !== "low" || s.suggestSpeaker(l, roster, none, true).studentId === null));
}

console.log(`${tally.pass} passed, ${tally.fail} failed`);
process.exit(tally.fail ? 1 : 0);
