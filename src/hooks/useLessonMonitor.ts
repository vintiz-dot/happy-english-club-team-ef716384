import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChunkRow } from "@/lib/lessonMonitor";
import type { GroupRow, VoiceAnswer } from "@/lib/lessonMonitorVoices";

// The lesson monitor pilot's tables and functions (20261117090000) are not in
// the generated types yet.
const db = supabase as any;

export interface PilotClass { class_id: string; class_name: string; enabled: boolean; starts_on: string | null; ends_on: string | null }
export interface ReportRow {
  id: string; recording_id: string; class_id: string; session_date: string; made_at: string;
  first_opened_at: string | null; reading_minutes: number | null; used_something: string | null; body?: unknown;
}
export interface LessonRow { session_id: string; class_id: string; class_name: string; lesson_date: string; start_time: string; words: string[]; structures: string[] }

/** The pilot classes this teacher teaches. Empty (not an error) before the migration is pasted. */
export function useMyPilotClasses(enabled = true) {
  return useQuery({
    queryKey: ["lesson-monitor", "classes"],
    enabled,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<PilotClass[]> => {
      const { data, error } = await db.rpc("lesson_monitor_my_classes");
      if (error) return [];
      return (data ?? []) as PilotClass[];
    },
  });
}

/** Reports the database lets this person read: only their own lessons' (RLS). */
export function useMyReports() {
  return useQuery({
    queryKey: ["lesson-monitor", "reports"],
    queryFn: async (): Promise<ReportRow[]> => {
      const { data, error } = await db.from("lesson_monitor_reports")
        .select("id, recording_id, class_id, session_date, made_at, first_opened_at, reading_minutes, used_something")
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });
}

export function useReport(id: string | null) {
  return useQuery({
    queryKey: ["lesson-monitor", "report", id],
    enabled: !!id,
    queryFn: async (): Promise<ReportRow | null> => {
      const { data, error } = await db.from("lesson_monitor_reports").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      if (data && !data.first_opened_at) await db.rpc("lesson_monitor_report_feedback", { p_report: id });
      return data as ReportRow | null;
    },
  });
}

/** The room track's chunks of the recording, to play a line's moment (authenticated download only). */
export function useRoomChunks(recordingId: string | null) {
  return useQuery({
    queryKey: ["lesson-monitor", "chunks", recordingId],
    enabled: !!recordingId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<ChunkRow[]> => {
      const { data, error } = await db.from("class_recording_chunks")
        .select("storage_path, t_start_ms, t_end_ms").eq("recording_id", recordingId).eq("track", "room").order("seq");
      if (error) throw error;
      return (data ?? []) as ChunkRow[];
    },
  });
}

export async function downloadChunk(path: string): Promise<Blob> {
  const { data, error } = await db.storage.from("class-recorder-audio").download(path);
  if (error || !data) throw error ?? new Error("The recording is no longer kept.");
  return data as Blob;
}

export function useMyLessons(from: string, to: string, enabled: boolean) {
  return useQuery({
    queryKey: ["lesson-monitor", "lessons", from, to],
    enabled,
    queryFn: async (): Promise<LessonRow[]> => {
      const { data, error } = await db.rpc("lesson_monitor_my_lessons", { p_from: from, p_to: to });
      if (error) throw error;
      return (data ?? []) as LessonRow[];
    },
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["lesson-monitor"] });
}

export function useFeedback() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (v: { id: string; minutes: number | null; used: string | null }) => {
      const { error } = await db.rpc("lesson_monitor_report_feedback", { p_report: v.id, p_minutes: v.minutes, p_used: v.used });
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export function useDeleteReport() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.rpc("lesson_monitor_delete_report", { p_report: id });
      if (error) throw error;
    },
    onSuccess: done,
  });
}

export function useSetTargets() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (v: { sessionId: string; words: string[]; structures: string[] }) => {
      const { error } = await db.rpc("lesson_monitor_set_targets", { p_session: v.sessionId, p_words: v.words, p_structures: v.structures });
      if (error) throw error;
    },
    onSuccess: done,
  });
}

/** A report's voice groups and the teacher's answers (20261124120000). Empty before that migration is pasted. */
export function useVoiceGroups(reportId: string | null) {
  return useQuery({
    queryKey: ["lesson-monitor", "voices", reportId],
    enabled: !!reportId,
    retry: false,
    queryFn: async (): Promise<GroupRow[]> => {
      const { data, error } = await db.from("lesson_monitor_voice_groups")
        .select("group_key, seconds, line_count, suggested_student, suggested_score, answer, student_id")
        .eq("report_id", reportId);
      if (error) return [];
      return ((data ?? []) as GroupRow[]).map((r) => ({ ...r, seconds: Number(r.seconds) }));
    },
  });
}

/** The children of the lesson, for naming voices (staff of the lesson only). */
export function useLessonRoster(sessionId: string | null) {
  return useQuery({
    queryKey: ["lesson-monitor", "roster", sessionId],
    enabled: !!sessionId,
    staleTime: 10 * 60_000,
    retry: false,
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data, error } = await db.rpc("lesson_speaker_roster", { p_session: sessionId });
      if (error) return [];
      return ((data ?? []) as { student_id: string; full_name: string }[]).map((k) => ({ id: k.student_id, name: k.full_name }));
    },
  });
}

export function useNameVoiceGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { reportId: string; group: string; answer: VoiceAnswer | null; childId?: string | null }) => {
      const { error } = await db.rpc("lesson_monitor_name_voice_group", {
        p_report: v.reportId, p_group: v.group, p_answer: v.answer, p_student: v.answer === "child" ? v.childId ?? null : null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ["lesson-monitor", "voices", v.reportId] }),
  });
}

/** The kill switch: a teacher of the class may always stop it. */
export function useStopPilot() {
  const done = useInvalidate();
  return useMutation({
    mutationFn: async (classId: string) => {
      const { error } = await db.rpc("lesson_monitor_set_class", { p_class: classId, p_enabled: false, p_consent_note: "stopped by the teacher" });
      if (error) throw error;
    },
    onSuccess: done,
  });
}
