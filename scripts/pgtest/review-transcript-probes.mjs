// The independent reviewer's probes for D-26 (REVIEW-transcript.md, R1-R9),
// turned round after fix round 1: each line now PASSES when the weakness it
// describes is GONE (R7c and R9 were controls and stay so).
//
//   node scripts/pgtest/run.mjs   (or this file with the four migrations of
//                                  transcript-drafts.test.mjs)
//
// It builds the same database as transcript-drafts.test.mjs
// (transcript-drafts.setup.mjs) and probes it on its own.
import {
  loadReview, tally, ok, eq, q, one, TEA, TEB, PARENT, KID, KIDB, NOROLE, CA, CB, KIKI, ANH, B1, kid, as, approve,
  draftLesson, ERR1, ERR2, L1, mKiki,
} from "./transcript-drafts.setup.mjs";

const TXT = { contribution: "Told us about her weekend.", teacher_feedback: "Well done", recommendation: "Practise -ed", highlights: [] };

console.log("=== REVIEW PROBES (fix round 1: the safe behaviour) ===");
const L2 = await draftLesson(CA, { title: "Second lesson", date: "2026-11-17" });
const m2Kiki = await L2.metric("Kiki");
await L2.sug(m2Kiki, "kiki", KIKI, "high", "exact_name", [ERR1, ERR2]);

// R1 -> N-6: transcript_approval_active is no oracle for a family or a role-less login.
{
  const a = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: "A2", errors: [ERR1], text: TXT }]);
  ok("R1 setup: approve L1", a.err === null, a);
  const r = await as(PARENT, `SELECT public.transcript_approval_active($1) AS a`, [L1.T]);
  const r2 = await as(NOROLE, `SELECT public.transcript_approval_active($1) AS a`, [L1.T]);
  const r3 = await as(TEA, `SELECT public.transcript_approval_active($1) AS a`, [L1.T]);
  eq("R1 fixed: a family and a role-less login get false for an approved lesson; its teacher gets true",
    [r.rows[0]?.a, r2.rows[0]?.a, r3.rows[0]?.a], [false, false, true]);
}

// R2 -> M-4: what the child reads from the metric row is what the teacher sent.
{
  const a = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, cefr_level: "A2", errors: [ERR1],
    text: { contribution: null, teacher_feedback: "Lovely story, Kiki!", recommendation: null, highlights: [] } }]);
  ok("R2 setup: the teacher re-approves L1 with her own feedback and nothing else", a.err === null, a);
  const r = await as(KID, `SELECT contribution, teacher_feedback, recommendation FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L1.T]);
  eq("R2 fixed: the child reads the teacher's text only (the AI draft text is not published unseen)", r.rows, [{ contribution: null, teacher_feedback: "Lovely story, Kiki!", recommendation: null }]);
  const no = await approve(TEA, L1.T, [{ metric_id: mKiki, student_id: KIKI, errors: [ERR1] }], { keep: false });
  ok("R2 fixed: an approval that does not send that text is refused", /send the text/.test(no.err ?? ""), no);
}

// R3 -> N-1: a metric row stays with its own lesson.
{
  const t = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L2.T, mKiki]);
  ok("R3 fixed: the class teacher cannot UPDATE a LINKED row of an approved lesson into another lesson", t.err !== null && t.n === 0, t);
  const svc = await as(null, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L2.T, mKiki], { role: "service_role" });
  ok("R3 fixed: nor can the service role", svc.err !== null && svc.n === 0, svc);
  const mvIn = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2 RETURNING id`, [L1.T, m2Kiki]);
  ok("R3 fixed: a draft row cannot be UPDATEd INTO an approved lesson", mvIn.err !== null && mvIn.n === 0, mvIn);
}

// R4 -> N-1 + N-2: no cross-class plant.
{
  const L3 = await draftLesson(CB, { title: "B lesson" });
  const mB = await L3.metric("Lily");
  const tA_mv = await as(TEA, `UPDATE public.transcript_speaker_metrics SET transcript_id = $1, teacher_feedback = 'planted by class A' WHERE id = $2 RETURNING id`, [L3.T, m2Kiki], { keep: true });
  ok("R4 fixed: the teacher of class A cannot move a class-A row into class B's lesson", tA_mv.err !== null && tA_mv.n === 0, tA_mv);
  // Even placed there by the owner, the approval does not take a row of another class.
  await q(`UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L3.T, m2Kiki]);
  const appr = await approve(TEB, L3.T, [{ metric_id: m2Kiki, student_id: B1, text: TXT }, { metric_id: mB, student_id: null }], { keep: false });
  ok("R4 fixed: B's teacher cannot link the class-A row to B's child", /not part of this lesson/.test(appr.err ?? ""), appr);
  await q(`UPDATE public.transcript_speaker_metrics SET transcript_id = $1 WHERE id = $2`, [L2.T, m2Kiki]);
  const leak = await as(TEA, `SELECT student_id FROM public.transcript_speaker_metrics WHERE student_id = $1`, [B1]);
  const kidb = await as(KIDB, `SELECT teacher_feedback FROM public.transcript_speaker_metrics`, []);
  eq("R4 fixed: class A's teacher reads no class-B child's row, and B's child reads nothing planted", [leak.rows.length, kidb.rows.length], [0, 0]);
}

// R5 -> N-3: only an enrolment covering the lesson's date counts.
{
  const GONE = await kid("Old Pupil", null);
  await q(`INSERT INTO public.enrollments (student_id, class_id, start_date, end_date) VALUES ($1,$2,'2025-01-01','2025-06-01')`, [GONE, CA]);
  const L4 = await draftLesson(CA, { title: "L4", date: "2026-11-16" });
  const m4 = await L4.metric("Someone");
  const r = await approve(TEA, L4.T, [{ metric_id: m4, student_id: GONE, cefr_level: "A1", text: TXT }], { keep: false });
  ok("R5 fixed: approve refuses a child whose enrolment ended 2025-06-01 for a 2026-11-16 lesson", /not in this class on the lesson/.test(r.err ?? ""), r);
}

// R6 -> N-4: the mixed Unknown bucket is nobody.
{
  const L5 = await draftLesson(CA, { title: "L5" });
  const mU = await L5.metric("Unknown");
  const r = await approve(TEA, L5.T, [{ metric_id: mU, student_id: ANH, cefr_level: "A1", text: TXT }], { keep: false });
  ok("R6 fixed: approve refuses a child for the 'Unknown' speaker bucket", /Unknown/.test(r.err ?? ""), r);
}

// R7 -> M-2: "Approve again" starts from the errors the teacher kept.
{
  const rv = await loadReview();
  const metrics = [{ id: "m1", speaker_label: "Kiki", is_teacher: false, student_id: "kid-1", cefr_estimate: "A2" }];
  const sugg = [{ metric_id: "m1", suggested_student_id: "kid-1", confidence: "high", draft_errors: [ERR1, ERR2] }];
  const approval = { withdrawn_at: null, assignments: [{ metric_id: "m1", student_id: "kid-1", kept_errors: [ERR1] }] };
  const c = rv.initialChoices(metrics, sugg, approval);
  eq("R7 fixed: an APPROVED speaker (teacher had dropped ERR2) starts with ERR2 unticked", c.m1.keepErrors, [true, false]);
  const out = rv.buildAssignments(metrics, sugg, c);
  eq("R7 fixed: so 'Approve again' unchanged republishes only the kept error", out[0].errors.length, 1);
  const lowApproved = rv.initialChoices([{ id: "m2", speaker_label: "Bao", is_teacher: false, student_id: null, cefr_estimate: null }],
    [{ metric_id: "m2", suggested_student_id: null, confidence: "low", draft_errors: [] }]);
  eq("R7c (control): a low suggestion starts unknown", lowApproved.m2.studentId, null);
}

// R8 -> N-5: a re-analysis cannot delete a row linked to a child.
{
  const L6 = (await one(`INSERT INTO public.class_transcripts (class_id, uploaded_by, title, raw_text, status, analysis) VALUES ($1,$2,'legacy','x','analyzed','{}'::jsonb) RETURNING id`, [CA, TEA])).id;
  await q(`INSERT INTO public.transcript_speaker_metrics (transcript_id, class_id, speaker_label, student_id) VALUES ($1,$2,'Kiki',$3)`, [L6, CA, KIKI]);
  const del = await as(null, `DELETE FROM public.transcript_speaker_metrics WHERE transcript_id = $1`, [L6], { role: "service_role" });
  ok("R8 fixed: the analysis (service role) cannot delete a legacy lesson's LINKED metric rows", del.err !== null && /linked to a child/.test(del.err) && del.n === 0, del);
}

// R9 (control): withdraw by another class's teacher / family refused; definer search_path set.
{
  const w = await as(TEB, `SELECT public.withdraw_transcript_approval($1)`, [L1.T]);
  const w2 = await as(PARENT, `SELECT public.withdraw_transcript_approval($1)`, [L1.T]);
  ok("R9 control: another class's teacher and a family cannot withdraw", w.err !== null && w2.err !== null, [w, w2]);
  const sp = await q(`SELECT p.proname, p.proconfig FROM pg_proc p WHERE p.proname IN ('approve_transcript_analysis','withdraw_transcript_approval','transcript_approval_active','transcript_metrics_link_guard','_transcript_alias_revert') ORDER BY 1`);
  ok("R9 control: every new function pins search_path", sp.length === 5 && sp.every((r) => (r.proconfig || []).some((c) => c.startsWith("search_path="))), sp);
  const ex = await q(`SELECT has_function_privilege('authenticated', 'public._transcript_alias_revert(uuid, jsonb)', 'EXECUTE') AS a,
                             has_function_privilege('service_role', 'public._transcript_alias_revert(uuid, jsonb)', 'EXECUTE') AS s`);
  eq("R9 control: nobody but the owner may run the alias helper", [ex[0].a, ex[0].s], [false, false]);
}

console.log(`\n${tally.pass} passed, ${tally.fail} failed`);
process.exit(tally.fail ? 1 : 0);
