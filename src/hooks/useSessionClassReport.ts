import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toReportView, type ReportView } from "@/lib/lessonMonitor";
import {
  addDays, bestTranscript, buildStudentRows, markShare, noteFromAnalysisStudent, noteFromReportPart, parseSpokenTranscript,
  resolveTranscriptSession, talkShare, viewFromReportBody, viewFromTranscriptAnalysis,
  type ClassReportView, type MarkShare, type SessionRef, type StudentNote, type StudentRow, type TalkShare, type Turn,
} from "@/lib/sessionClassReport";
import type { CurriculumLesson } from "@/lib/curriculumLessons";

/**
 * Everything the Schedule's "Class report" page shows for one lesson. Every read is
 * the signed-in person's own (RLS decides, and a teacher or admin is who gets here);
 * each source is optional: one that is missing, refused, or not installed yet
 * (a table the database does not have) leaves its part empty and never fails the page.
 * The decisions are in src/lib/sessionClassReport.ts.
 */
const db = supabase as any;

export interface SessionReport {
  lesson: { id: string; class_id: string; date: string; start_time: string; end_time: string; status: string; class_name: string; teacher_names: string[] } | null;
  report: ClassReportView | null;
  /** Approved, ready draft, or back-filled from an older transcript: where `report` came from, in words. */
  reportNote: string | null;
  plan: CurriculumLesson[];
  talk: { share: TalkShare | null; marks: MarkShare | null; monitor: { teacherPct: [number, number]; othersPct: [number, number] } | null; note: string | null };
  transcript: { kind: "monitor" | "spoken" | "text" | null; monitor: ReportView | null; turns: Turn[]; text: string; note: string | null };
  students: StudentRow[];
  sources: { approved: boolean; draft: boolean; monitor: boolean; transcript: boolean; taps: boolean };
}

/** A query whose table or policy is missing must not take the page down. */
async function soft<T>(p: PromiseLike<{ data: T | null; error: any }>): Promise<T | null> {
  try {
    const { data, error } = await p;
    return error ? null : data;
  } catch {
    return null;
  }
}

export function useSessionClassReport(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["session-class-report", sessionId],
    enabled: !!sessionId,
    staleTime: 60_000,
    queryFn: async (): Promise<SessionReport> => {
      const { data: s, error } = await db.from("sessions")
        .select("id, class_id, date, start_time, end_time, status, classes(name), teachers(full_name)").eq("id", sessionId).maybeSingle();
      if (error) throw error;
      if (!s) {
        return { lesson: null, report: null, reportNote: null, plan: [], talk: { share: null, marks: null, monitor: null, note: null }, transcript: { kind: null, monitor: null, turns: [], text: "", note: null }, students: [], sources: { approved: false, draft: false, monitor: false, transcript: false, taps: false } };
      }
      const sid = s.id as string;

      const [approved, draft, plan, monitor, marks, enr, att, points, sessions, transcripts] = await Promise.all([
        soft<any>(db.from("lesson_reports").select("id, class_part, approved_at").eq("session_id", sid).maybeSingle()),
        soft<any>(db.from("lesson_report_drafts").select("status, body").eq("session_id", sid).maybeSingle()),
        soft<any[]>(db.from("session_lesson_plans").select("position, curriculum_lessons(*)").eq("session_id", sid).order("position")),
        soft<any>(db.from("lesson_monitor_reports").select("body").eq("session_id", sid).maybeSingle()),
        soft<any[]>(db.from("lesson_speaker_marks").select("kind, student_ids, at, offset_ms").eq("session_id", sid)),
        soft<any[]>(db.from("enrollments").select("student_id, students!inner(id, full_name)")
          .eq("class_id", s.class_id).lte("start_date", s.date).or(`end_date.is.null,end_date.gte.${s.date}`)),
        soft<any[]>(db.from("attendance").select("student_id, status").eq("session_id", sid)),
        soft<any[]>(db.from("point_transactions").select("student_id, points").eq("session_id", sid)),
        // The class's lessons around the date: a transcript is matched to one of them (resolveTranscriptSession).
        soft<any[]>(db.from("sessions").select("id, date, start_time, status").eq("class_id", s.class_id)
          .gte("date", addDays(s.date, -3)).lte("date", addDays(s.date, 3))),
        // Older transcripts have no session_id: the same class, filed on the day or up to five days after.
        soft<any[]>(db.from("class_transcripts").select("id, class_id, session_id, transcript_date, status, raw_text, title, summary, analysis")
          .eq("class_id", s.class_id).gte("transcript_date", s.date).lte("transcript_date", addDays(s.date, 5))),
      ]);

      const classSessions: SessionRef[] = sessions ?? [{ id: sid, date: s.date, start_time: s.start_time, status: s.status }];
      const mine = (transcripts ?? []).filter((t) => resolveTranscriptSession(t, classSessions) === sid);
      const transcript = bestTranscript(mine);

      const teacherNames = [s.teachers?.full_name].filter(Boolean) as string[];
      const turns = transcript ? parseSpokenTranscript(transcript.raw_text) : [];
      const share = turns.length ? talkShare(turns, teacherNames) : null;
      const tapShare = markShare((marks ?? []) as any[]);
      const monitorView = monitor?.body ? toReportView(monitor.body) : null;
      const monitorTalk = monitorView?.talk ?? null;

      // The class-level report: the approved one, else the ready draft, else what an older transcript's analysis said.
      let report: ClassReportView | null = null;
      let reportNote: string | null = null;
      if (approved?.class_part) {
        report = viewFromReportBody(approved.class_part, "approved");
        reportNote = report ? `Approved ${new Date(approved.approved_at).toLocaleDateString()}. Families can see it.` : null;
      }
      if (!report && draft?.status === "ready" && draft.body) {
        report = viewFromReportBody(draft.body, "draft");
        reportNote = report ? "Draft, not approved yet. Families cannot see it." : null;
      }
      if (!report && transcript) {
        report = viewFromTranscriptAnalysis(transcript.analysis, transcript.title, transcript.summary);
        reportNote = report ? "Filled in from the lesson's transcript. It was not written for families." : null;
      }

      // Per-child notes: the approved report's, else the draft's, else the transcript analysis's.
      const notes: Record<string, StudentNote> = {};
      const analysisNotes: ReturnType<typeof noteFromAnalysisStudent>[] = [];
      if (approved?.id) {
        const parts = await soft<any[]>(db.from("lesson_report_students").select("student_id, part").eq("report_id", approved.id));
        for (const p of parts ?? []) notes[p.student_id] = noteFromReportPart(p.part);
      } else if (draft?.status === "ready" && Array.isArray(draft.body?.students)) {
        for (const p of draft.body.students) if (p?.student_id) notes[p.student_id] = noteFromReportPart(p);
      }
      if (transcript && Array.isArray(transcript.analysis?.students)) {
        for (const x of transcript.analysis.students) analysisNotes.push(noteFromAnalysisStudent(x));
      }

      const enrolled = (enr ?? []).map((e: any) => ({ id: e.student_id as string, full_name: (e.students?.full_name as string) ?? "" }))
        .filter((e) => e.full_name).sort((a, b) => a.full_name.localeCompare(b.full_name));
      const pointsBy: Record<string, number> = {};
      for (const p of points ?? []) pointsBy[p.student_id] = (pointsBy[p.student_id] ?? 0) + (Number(p.points) || 0);

      const students = buildStudentRows({
        enrolled,
        attendance: Object.fromEntries((att ?? []).map((a: any) => [a.student_id, a.status])),
        notes, analysisNotes, share, marks: tapShare, points: pointsBy,
      });

      let talkNote: string | null = null;
      if (share && share.teacherPct === null) talkNote = "The transcript does not say which speaker is the teacher, so only each speaker's share is shown.";
      if (monitorTalk) talkNote = null;

      return {
        lesson: {
          id: sid, class_id: s.class_id, date: s.date, start_time: s.start_time, end_time: s.end_time, status: s.status,
          class_name: s.classes?.name ?? "", teacher_names: teacherNames,
        },
        report, reportNote,
        plan: ((plan ?? []).map((p) => p.curriculum_lessons).filter(Boolean)) as CurriculumLesson[],
        talk: { share, marks: tapShare, monitor: monitorTalk ? { teacherPct: monitorTalk.teacherPct, othersPct: monitorTalk.othersPct } : null, note: talkNote },
        transcript: monitorView?.ok && monitorView.lines.length
          ? { kind: "monitor", monitor: monitorView, turns: [], text: "", note: null }
          : turns.length
            ? { kind: "spoken", monitor: null, turns, text: "", note: transcript?.status === "analyzed" ? null : "This transcript was never analysed. Its text is shown as it was saved." }
            : transcript
              ? { kind: "text", monitor: null, turns: [], text: String(transcript.raw_text ?? ""), note: "Saved without speaker names, so no talk-time share can be worked out from it." }
              : { kind: null, monitor: null, turns: [], text: "", note: null },
        students,
        sources: { approved: !!approved, draft: draft?.status === "ready", monitor: !!monitorView?.ok, transcript: !!transcript, taps: !!tapShare },
      };
    },
  });
}
