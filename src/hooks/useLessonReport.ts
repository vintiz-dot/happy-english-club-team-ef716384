import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { shrinkPhoto } from "@/lib/shrinkPhoto";
import type { ApprovalArgs } from "@/lib/lessonReportApproval";

/**
 * Lesson reports, stage A (docs/LESSON_REPORTS.md): the staff side.
 * Every read and write is the signed-in person's own; RLS and the contract's
 * functions (20261121130000) decide who may. The tables are not in the
 * generated types yet, hence the cast.
 */
const db = supabase as any;
export const LESSON_PHOTO_BUCKET = "lesson-photos";
export const PHOTO_KINDS = [
  { value: "whiteboard", label: "Whiteboard" },
  { value: "screen", label: "Screen" },
  { value: "worksheet", label: "Worksheet" },
  { value: "material", label: "Other material" },
  { value: "class", label: "The class" },
  { value: "other", label: "Other" },
] as const;

export interface LessonPhoto { id: string; storage_path: string; kind: string; caption: string | null; uploaded_by: string; created_at: string; url?: string | null }
export interface DraftRow { session_id: string; status: "building" | "ready" | "failed"; run: number; body: unknown; model: string | null; error: string | null; started_at: string; finished_at: string | null }
export interface LessonInfo { id: string; class_id: string; date: string; start_time: string; end_time: string; status: string; class_name: string }

const key = (sessionId: string | null | undefined, ...rest: string[]) => ["lesson-report", sessionId ?? "", ...rest];

export function useLessonPhotos(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: key(sessionId, "photos"),
    enabled: !!sessionId,
    queryFn: async (): Promise<LessonPhoto[]> => {
      const { data, error } = await db.from("lesson_report_photos")
        .select("id, storage_path, kind, caption, uploaded_by, created_at").eq("session_id", sessionId).order("created_at");
      if (error) throw error;
      const rows = (data ?? []) as LessonPhoto[];
      if (!rows.length) return rows;
      const { data: signed } = await db.storage.from(LESSON_PHOTO_BUCKET).createSignedUrls(rows.map((r) => r.storage_path), 3600);
      const urls = new Map<string, string>((signed ?? []).filter((s: any) => s.signedUrl).map((s: any) => [s.path, s.signedUrl]));
      return rows.map((r) => ({ ...r, url: urls.get(r.storage_path) ?? null }));
    },
  });
}

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function useAddLessonPhotos(sessionId: string, classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { files: File[]; kind: string; caption: string }) => {
      let added = 0;
      const failed: string[] = [];
      for (const original of v.files) {
        const file = await shrinkPhoto(original);
        const type = (file.type || "").toLowerCase().replace("image/jpg", "image/jpeg");
        if (!EXT[type]) { failed.push(`${original.name}: use a JPEG, PNG or WebP photo`); continue; }
        const path = `${classId}/${sessionId}/${crypto.randomUUID()}.${EXT[type]}`;
        const up = await db.storage.from(LESSON_PHOTO_BUCKET).upload(path, file, { contentType: type, upsert: false });
        if (up.error) { failed.push(`${original.name}: ${up.error.message}`); continue; }
        const { error } = await db.from("lesson_report_photos").insert({
          session_id: sessionId, class_id: classId, storage_path: path, kind: v.kind, caption: v.caption.trim() || null,
        });
        if (error) {
          await db.storage.from(LESSON_PHOTO_BUCKET).remove([path]);
          failed.push(`${original.name}: ${error.message}`);
          continue;
        }
        added++;
      }
      return { added, failed };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(sessionId, "photos") }),
  });
}

export function useDeleteLessonPhoto(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: LessonPhoto) => {
      const { error } = await db.from("lesson_report_photos").delete().eq("id", p.id);
      if (error) throw error;
      // The row is what the report reads; the file goes after it.
      await db.storage.from(LESSON_PHOTO_BUCKET).remove([p.storage_path]);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(sessionId, "photos") }),
  });
}

export function useLessonInfo(sessionId: string | undefined) {
  return useQuery({
    queryKey: key(sessionId, "lesson"),
    enabled: !!sessionId,
    queryFn: async (): Promise<LessonInfo | null> => {
      const { data, error } = await db.from("sessions")
        .select("id, class_id, date, start_time, end_time, status, classes(name)").eq("id", sessionId).maybeSingle();
      if (error) throw error;
      return data ? { ...data, class_name: data.classes?.name ?? "" } : null;
    },
  });
}

/** Whether the person may build and approve (a teacher of the class or an admin; a TA may not). */
export function useLessonReportTeacherCan(sessionId: string | undefined) {
  return useQuery({
    queryKey: key(sessionId, "teacher-can"),
    enabled: !!sessionId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await db.rpc("lesson_report_teacher_can", { p_session: sessionId });
      if (error) return false;
      return data === true;
    },
  });
}

export function useLessonDraft(sessionId: string | undefined) {
  return useQuery({
    queryKey: key(sessionId, "draft"),
    enabled: !!sessionId,
    refetchInterval: (q: any) => (q.state.data?.status === "building" ? 5000 : false),
    queryFn: async (): Promise<DraftRow | null> => {
      const { data, error } = await db.from("lesson_report_drafts").select("*").eq("session_id", sessionId).maybeSingle();
      if (error) throw error;
      return data as DraftRow | null;
    },
  });
}

export function useApprovedReport(sessionId: string | undefined) {
  return useQuery({
    queryKey: key(sessionId, "report"),
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await db.from("lesson_reports")
        .select("id, approved_at, review_homework_id, photo_ids").eq("session_id", sessionId).maybeSingle();
      if (error) throw error;
      return data as { id: string; approved_at: string; review_homework_id: string | null; photo_ids: string[] } | null;
    },
  });
}

/** The records the approval mapping checks against: children enrolled on the day, and whose work is whose. */
export function useLessonRecords(lesson: LessonInfo | null | undefined, workIds: string[]) {
  return useQuery({
    queryKey: key(lesson?.id, "records", workIds.slice().sort().join(",")),
    enabled: !!lesson,
    queryFn: async () => {
      const { data: enr, error } = await db.from("enrollments")
        .select("student_id, students!inner(id, full_name)")
        .eq("class_id", lesson!.class_id).lte("start_date", lesson!.date).or(`end_date.is.null,end_date.gte.${lesson!.date}`);
      if (error) throw error;
      const names: Record<string, string> = {};
      for (const e of enr ?? []) names[e.student_id] = e.students?.full_name ?? "";
      const workOwner: Record<string, string> = {};
      if (workIds.length) {
        const { data: works } = await db.from("student_work").select("id, student_id").in("id", workIds);
        for (const w of works ?? []) if (w.student_id) workOwner[w.id] = w.student_id;
      }
      return { names, enrolled: Object.keys(names), workOwner };
    },
  });
}

async function functionError(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* fall through */ }
  return error?.message ?? "The draft could not be started";
}

export function useBuildDraft(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (redo: boolean) => {
      const { data, error } = await supabase.functions.invoke("lesson-report-draft", { body: { session_id: sessionId, redo } });
      if (error) throw new Error(await functionError(error));
      return data as { status: string; run: number };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(sessionId, "draft") }),
  });
}

export function useApproveReport(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: ApprovalArgs) => {
      const { data, error } = await db.rpc("approve_lesson_report", args);
      if (error) throw error;
      return data as { report_id: string; homework_id: string | null };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key(sessionId) }),
  });
}
