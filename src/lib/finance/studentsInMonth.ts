import { supabase } from "@/integrations/supabase/client";
import { monthBounds, studentsEnrolledIn, type RosterEnrollment } from "./monthRoster";

/**
 * Month-aware student selection for finance queries.
 *
 * The rule is src/lib/finance/monthRoster.ts (owner, 24 Nov 2026): a child
 * belongs to a month when one of their enrolments covers a day of it. A
 * child whose last enrolment ended in January is in January and is dropped
 * from February on.
 *
 * Before that the test was `is_active = true OR deactivated_at >= <first day
 * of the month>`. It kept a child who had left in the next month's lists
 * whenever the Deactivate click came after the month turned, and it put
 * every child active today into every past month, enrolled then or not.
 * Neither `is_active` nor `deactivated_at` is read here any more.
 *
 * These helpers are the single definition of "which students belong to this
 * month" for the browser; calculate-tuition bills by the same enrolments.
 */

export { monthBounds };

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

/** The ids of the children with an enrolment covering a day of `month`. */
export async function fetchEnrolledStudentIds(month: string): Promise<Set<string>> {
  const { monthStart, monthEnd } = monthBounds(month);
  const rows: RosterEnrollment[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("enrollments")
      .select("id, student_id, start_date, end_date")
      .lte("start_date", monthEnd)
      .or(`end_date.is.null,end_date.gte.${monthStart}`)
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw error;
    rows.push(...((data ?? []) as unknown as RosterEnrollment[]));
    if (!data || data.length < PAGE) break;
  }
  return studentsEnrolledIn(rows, month);
}

/**
 * Every student who belongs to `month`: enrolled on at least one day of it,
 * whether or not they are still active today.
 */
export async function fetchStudentsInMonth(month: string): Promise<StudentInMonth[]> {
  const ids = [...(await fetchEnrolledStudentIds(month))];
  const students: StudentInMonth[] = [];
  const CHUNK = 100;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, family_id, avatar_url, is_active, deactivated_at")
      .in("id", ids.slice(i, i + CHUNK));
    if (error) throw error;
    students.push(...((data ?? []) as StudentInMonth[]));
  }
  return students;
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
 * The billable roster for `month`: students who belong to that month and
 * whose enrollment is in an active class. This is the set every finance
 * aggregate and month-close should operate on.
 */
export async function fetchBilledStudentIds(month: string): Promise<string[]> {
  const students = await fetchStudentsInMonth(month);
  const ids = students.map((s) => s.id);
  if (ids.length === 0) return [];

  const enrollments = await fetchEnrollmentsInMonth(month, ids);
  const enrolled = new Set(enrollments.map((e) => e.student_id));
  return ids.filter((id) => enrolled.has(id));
}
