import { supabase } from "@/integrations/supabase/client";

/**
 * Month-aware student selection for finance queries.
 *
 * Every finance view used to filter students with `is_active = true`, which
 * asks "is this student here today?" — the wrong question when the UI is
 * rendering July. Deactivating a student erased their revenue, payments and
 * outstanding debt from every month that had not already been snapshotted.
 *
 * `students.deactivated_at` (added 20260904090000) records *when* a student
 * left, so we can ask the right question instead:
 *
 *     is_active = true OR deactivated_at >= <first day of the month>
 *
 * A student deactivated 2026-07-15 counts for July and every earlier month,
 * and stops counting from August on. Their tuition for the departure month
 * stays accurate on its own: amounts come from sessions actually held and
 * attendance actually recorded, so a mid-month leaver is billed for the part
 * of the month they attended, not the whole thing.
 *
 * These helpers are the single definition of "which students belong to this
 * month". The four finance call sites previously duplicated it and had
 * already drifted — the summary bounded enrolments by the *next* month's
 * first day while the tuition list used the last day of the month, so the
 * two disagreed on the roster for any student enrolling on the 1st.
 */

export interface StudentInMonth {
  id: string;
  full_name: string;
  family_id: string | null;
  avatar_url: string | null;
  is_active: boolean;
  deactivated_at: string | null;
}

export interface EnrollmentInMonth {
  student_id: string;
  class_id: string;
  classes: { id: string; name: string; is_active: boolean } | null;
}

/** First and last calendar day of `month` (YYYY-MM) as YYYY-MM-DD. */
export function monthBounds(month: string): { monthStart: string; monthEnd: string } {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  // Day 0 of the following month is the last day of this one.
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
  return { monthStart: `${month}-01`, monthEnd };
}

/**
 * PostgREST `.or()` clause selecting students who were on the roster at any
 * point during `month`. Exported for callers that need their own `select`
 * shape; it is the one place the predicate is written.
 */
export function studentsInMonthOrClause(month: string): string {
  const { monthStart } = monthBounds(month);
  return `is_active.eq.true,deactivated_at.gte.${monthStart}`;
}

/**
 * Every student who was on the roster at any point during `month`,
 * regardless of whether they are still active today.
 */
export async function fetchStudentsInMonth(month: string): Promise<StudentInMonth[]> {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, family_id, avatar_url, is_active, deactivated_at")
    .or(studentsInMonthOrClause(month));

  if (error) throw error;
  return (data ?? []) as StudentInMonth[];
}

/**
 * Enrollments in active classes that overlap `month`, for the given students.
 */
export async function fetchEnrollmentsInMonth(
  month: string,
  studentIds: string[],
): Promise<EnrollmentInMonth[]> {
  if (studentIds.length === 0) return [];
  const { monthStart, monthEnd } = monthBounds(month);

  const { data, error } = await supabase
    .from("enrollments")
    .select("student_id, class_id, classes!inner(id, name, is_active)")
    .in("student_id", studentIds)
    .eq("classes.is_active", true)
    .lte("start_date", monthEnd)
    .or(`end_date.is.null,end_date.gte.${monthStart}`);

  if (error) throw error;
  return (data ?? []) as unknown as EnrollmentInMonth[];
}

/**
 * The billable roster for `month`: students on the roster during that month
 * who also had an enrollment in an active class overlapping it. This is the
 * set every finance aggregate and month-close should operate on.
 */
export async function fetchBilledStudentIds(month: string): Promise<string[]> {
  const students = await fetchStudentsInMonth(month);
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return [];

  const enrollments = await fetchEnrollmentsInMonth(month, ids);
  const enrolled = new Set(enrollments.map((e) => e.student_id));
  return ids.filter((id) => enrolled.has(id));
}
