import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEnrollmentsInMonth,
  fetchStudentsInMonth,
  monthBounds,
} from "@/lib/finance/studentsInMonth";
import { liveTuitionItem, type LiveTuitionItem } from "@/lib/liveTuitionItem";

export { liveTuitionItem, type LiveTuitionItem };

/**
 * calculate-tuition-bulk for a set of students, keyed by student id.
 *
 * The function caps its input at 200 student ids per request (and can time
 * out on very large batches), so a roster above that must be chunked -
 * otherwise the single call returns a non-2xx and the whole tuition tab
 * errors. The one place the batching lives: the Finance tab and the admin
 * tuition list (/tuition) both ask through here.
 */
export async function fetchBulkTuition(studentIds: string[], month: string): Promise<Map<string, any>> {
  const BATCH_SIZE = 150;
  const batches: string[][] = [];
  for (let i = 0; i < studentIds.length; i += BATCH_SIZE) {
    batches.push(studentIds.slice(i, i + BATCH_SIZE));
  }

  // One batch after another, not all at once. Each batch asks
  // compute-sibling-discounts for the families it has no decision for, and
  // that function holds one lock per month: batches sent together found it
  // busy and came back with those families "unresolved".
  const bulkResults: any[] = [];
  for (const ids of batches) {
    const { data, error } = await supabase.functions.invoke("calculate-tuition-bulk", { body: { studentIds: ids, month } });
    if (error) throw error;
    bulkResults.push(...((data?.results as any[]) || []));
  }
  return new Map<string, any>(bulkResults.map((r: any) => [r.studentId, r]));
}

/**
 * Hook to fetch live tuition data for all students using calculate-tuition-bulk edge function.
 * Single call replaces N individual calls for massive performance improvement.
 */
export function useLiveTuitionData(month: string) {
  return useQuery({
    queryKey: ["admin-tuition-live", month],
    queryFn: async (): Promise<LiveTuitionItem[]> => {
      const { monthStart, monthEnd } = monthBounds(month);

      // Everyone who was on the roster during this month. Students
      // deactivated since are still included for the months they were
      // here, so past tuition never disappears from the list.
      const allStudents = await fetchStudentsInMonth(month);
      if (allStudents.length === 0) return [];

      const allStudentIds = allStudents.map((s) => s.id);

      // Fetch enrollments for active classes to filter students
      const enrollments = await fetchEnrollmentsInMonth(month, allStudentIds);

      // Map student to classes
      const studentClasses = new Map<string, any[]>();
      enrollments?.forEach((e: any) => {
        const existing = studentClasses.get(e.student_id) || [];
        if (e.classes) {
          existing.push(Array.isArray(e.classes) ? e.classes[0] : e.classes);
        }
        studentClasses.set(e.student_id, existing);
      });

      // Filter to only students with active enrollments this month
      const studentsWithEnrollments = allStudents.filter(
        (student) => (studentClasses.get(student.id) || []).length > 0
      );

      if (studentsWithEnrollments.length === 0) return [];

      // Fetch discount assignments for badges
      const { data: discounts } = await supabase
        .from("discount_assignments")
        .select("student_id")
        .lte("effective_from", monthEnd)
        .or(`effective_to.is.null,effective_to.gte.${monthStart}`);

      const studentDiscounts = new Set(discounts?.map((d) => d.student_id) || []);

      // Get families with multiple students for sibling badge
      const familyCounts = new Map<string, number>();
      allStudents.forEach((s) => {
        if (s.family_id) {
          familyCounts.set(s.family_id, (familyCounts.get(s.family_id) || 0) + 1);
        }
      });

      const siblingStudents = new Set(
        allStudents
          .filter((s) => s.family_id && (familyCounts.get(s.family_id) || 0) >= 2)
          .map((s) => s.id)
      );

      // Call bulk endpoint in batches (see fetchBulkTuition).
      const resultMap = await fetchBulkTuition(studentsWithEnrollments.map((s) => s.id), month);

      // Map to LiveTuitionItem[]
      const results: LiveTuitionItem[] = [];

      for (const student of studentsWithEnrollments) {
        const data: any = resultMap.get(student.id);
        if (!data || data.error) continue;

        results.push(
          liveTuitionItem(student, data, month, {
            classes: studentClasses.get(student.id) || [],
            hasDiscount: studentDiscounts.has(student.id),
            hasSiblings: siblingStudents.has(student.id),
          }),
        );
      }

      return results;
    },
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}
