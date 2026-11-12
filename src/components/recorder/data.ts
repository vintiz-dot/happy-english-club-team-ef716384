/**
 * Every read and write the recorder screens make, through the INJECTED
 * client (the signed-in teacher's or admin's own session). RLS and the
 * migration's functions (20261112100000_class_recorder.sql) decide; nothing
 * here writes a table the server would not check: the class switch, a
 * child's consent and a deletion request go through their RPCs, and the
 * recording itself through the engine.
 *
 * The recorder tables are not in src/integrations/supabase/types.ts yet (the
 * migration is not applied), so the client is used untyped here, as the
 * engine's backend does.
 */

import type { LessonLike, WindowMinutes, EnrolledChild, ConsentRow } from "@/lib/recorderUi";
import { DEFAULT_MINUTES } from "@/lib/recorderUi";

type Client = any;

const one = <T,>(x: T | T[] | null | undefined): T | null => (Array.isArray(x) ? x[0] ?? null : x ?? null);

export interface RecorderSettings extends WindowMinutes { wordingVersion: string | null; retentionDays: number }

export async function fetchRecorderSettings(client: Client): Promise<RecorderSettings> {
  const { data } = await client.from("recorder_settings")
    .select("pre_roll_minutes, grace_minutes, arm_window_minutes, consent_wording_version, retention_days")
    .eq("id", 1).maybeSingle();
  return {
    preRoll: data?.pre_roll_minutes ?? DEFAULT_MINUTES.preRoll,
    grace: data?.grace_minutes ?? DEFAULT_MINUTES.grace,
    armWindow: data?.arm_window_minutes ?? DEFAULT_MINUTES.armWindow,
    // null = cannot be read: the admin screen then refuses to switch on, as the server does.
    wordingVersion: data?.consent_wording_version ?? null,
    retentionDays: data?.retention_days ?? 30,
  };
}

// ---------------------------------------------------------------- teacher

/**
 * Today's lessons for the signed-in teacher - the same read as the teacher
 * dashboard (TeacherDashboard.tsx "teacher-today-sessions": teachers by
 * user_id, then sessions by teacher_id and date).
 */
export async function fetchTodayLessons(client: Client, userId: string, date: string): Promise<LessonLike[]> {
  const { data: teacher } = await client.from("teachers").select("id").eq("user_id", userId).maybeSingle();
  if (!teacher?.id) return [];
  const { data } = await client.from("sessions")
    .select("id, date, start_time, end_time, status, class_id, classes!inner(name, id)")
    .eq("teacher_id", teacher.id)
    .eq("date", date)
    .order("start_time", { ascending: true });
  return (data ?? []).map((s: any) => {
    const cls = one<any>(s.classes);
    return { sessionId: s.id, classId: s.class_id ?? cls?.id, className: cls?.name ?? "Class", date: s.date, startTime: s.start_time, endTime: s.end_time, status: s.status };
  });
}

/** The class switch. No row, an error or anything unclear reads as OFF. */
export async function fetchClassSwitch(client: Client, classId: string): Promise<boolean> {
  const { data, error } = await client.from("class_recording_settings").select("recording_enabled").eq("class_id", classId).maybeSingle();
  if (error) return false;
  return data?.recording_enabled === true;
}

/** A number, never names (the teacher's view of consent). null = could not be read. */
export async function fetchMissingConsentCount(client: Client, classId: string): Promise<number | null> {
  const { data, error } = await client.rpc("recorder_class_missing_consent", { p_class: classId });
  if (error || typeof data !== "number") return null;
  return data;
}

/** Children enrolled in the class on `date`, for the name chips (same rule as AttendanceMarking). */
export async function fetchEnrolled(client: Client, classIds: string[], date: string): Promise<(EnrolledChild & { class_id: string })[]> {
  if (!classIds.length) return [];
  const { data } = await client.from("enrollments")
    .select("student_id, class_id, start_date, end_date, students(id, full_name)")
    .in("class_id", classIds)
    .lte("start_date", date)
    .or(`end_date.is.null,end_date.gte.${date}`);
  const seen = new Set<string>();
  const out: (EnrolledChild & { class_id: string })[] = [];
  for (const e of data ?? []) {
    if (!(e.start_date <= date && (!e.end_date || e.end_date >= date))) continue;
    const key = `${e.class_id}|${e.student_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ student_id: e.student_id, class_id: e.class_id, name: one<any>(e.students)?.full_name ?? "Student" });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------- admin

export interface ClassSwitchRow {
  class_id: string;
  recording_enabled: boolean;
  consent_confirmed_by: string | null;
  consent_confirmed_at: string | null;
  consent_wording_version: string | null;
  consent_note: string | null;
  disabled_by: string | null;
  disabled_at: string | null;
}

export interface AdminClass { id: string; name: string; switch: ClassSwitchRow | null }

export async function fetchAdminClasses(client: Client): Promise<AdminClass[]> {
  const [{ data: classes }, { data: settings }] = await Promise.all([
    client.from("classes").select("id, name").eq("is_active", true).order("name", { ascending: true }),
    client.from("class_recording_settings").select("class_id, recording_enabled, consent_confirmed_by, consent_confirmed_at, consent_wording_version, consent_note, disabled_by, disabled_at"),
  ]);
  const by = new Map<string, ClassSwitchRow>((settings ?? []).map((s: ClassSwitchRow) => [s.class_id, s]));
  return (classes ?? []).map((c: any) => ({ id: c.id, name: c.name, switch: by.get(c.id) ?? null }));
}

export async function fetchConsents(client: Client): Promise<ConsentRow[]> {
  const { data } = await client.from("recorder_child_consents").select("student_id, status, wording_version");
  return data ?? [];
}

/** The server's own answer, word for word, when it refuses. */
export class ServerSaid extends Error {}

async function rpc(client: Client, fn: string, args: Record<string, unknown>) {
  const { error } = await client.rpc(fn, args);
  if (error) throw new ServerSaid(String(error.message ?? error));
}

export const setClassRecording = (client: Client, classId: string, on: boolean, wording: string | null, note: string) =>
  rpc(client, "recorder_set_class_recording", { p_class: classId, p_enabled: on, p_wording_version: on ? wording : null, p_consent_note: note });

export const recordChildConsent = (client: Client, studentId: string, status: "granted" | "withdrawn", note: string) =>
  rpc(client, "recorder_record_child_consent", { p_student: studentId, p_status: status, p_note: note });

export const requestDeletion = (client: Client, recordingId: string, reason: string) =>
  rpc(client, "recorder_request_deletion", { p_recording: recordingId, p_reason: reason });

export interface RecordingRow {
  id: string;
  class_id: string;
  session_date: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  started_by: string | null;
  stop_reason: string | null;
  abandon_reason: string | null;
  delete_after: string | null;
  deletion_requested_at: string | null;
  deletion_reason: string | null;
  audio_deleted_at: string | null;
  verified_audio_ms: number | null;
  verified_lesson_ms: number | null;
  ran: boolean | null;
}

export async function fetchRecordings(client: Client): Promise<RecordingRow[]> {
  const { data } = await client.from("class_recordings")
    .select("id, class_id, session_date, scheduled_start, scheduled_end, status, started_by, stop_reason, abandon_reason, delete_after, deletion_requested_at, deletion_reason, audio_deleted_at")
    .order("scheduled_start", { ascending: false })
    .limit(200);
  const rows = data ?? [];
  const ids = rows.map((r: any) => r.id);
  const ev = new Map<string, any>();
  if (ids.length) {
    // Duration "verified by the server": the view's figures, never the laptop's claim.
    const { data: e } = await client.from("recorder_session_evidence")
      .select("recording_id, verified_audio_ms, verified_lesson_ms, recording_ran_evidence")
      .in("recording_id", ids);
    for (const x of e ?? []) ev.set(x.recording_id, x);
  }
  return rows.map((r: any) => ({
    ...r,
    verified_audio_ms: ev.get(r.id)?.verified_audio_ms ?? null,
    verified_lesson_ms: ev.get(r.id)?.verified_lesson_ms ?? null,
    ran: ev.get(r.id)?.recording_ran_evidence ?? null,
  }));
}

export interface AuditRow { id: number; at: string; actor: string | null; action: string; class_id: string | null; session_id: string | null; recording_id: string | null; detail: Record<string, unknown> }

export async function fetchAudit(client: Client): Promise<AuditRow[]> {
  const { data } = await client.from("recorder_audit_log")
    .select("id, at, actor, action, class_id, session_id, recording_id, detail")
    .order("at", { ascending: false })
    .limit(200);
  return data ?? [];
}

/** user id -> a name to show (a teacher's name, else the profile's display name). */
export async function fetchPeople(client: Client, userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const out = new Map<string, string>();
  if (!ids.length) return out;
  const [{ data: t }, { data: p }] = await Promise.all([
    client.from("teachers").select("user_id, full_name").in("user_id", ids),
    client.from("profiles").select("id, display_name").in("id", ids),
  ]);
  for (const x of p ?? []) if (x.display_name) out.set(x.id, x.display_name);
  for (const x of t ?? []) if (x.full_name) out.set(x.user_id, x.full_name);
  return out;
}
