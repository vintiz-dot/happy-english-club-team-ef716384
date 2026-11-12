import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchEnrollmentsInMonth,
  fetchStudentsInMonth,
  monthBounds,
} from "@/lib/finance/studentsInMonth";
import { tuitionFigures } from "@/lib/tuitionRows";

export interface LiveTuitionItem {
  id: string;
  student_id: string;
  month: string;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  recorded_payment: number;
  finalPayable: number;
  balance: number;
  carry_out_credit: number;
  carry_out_debt: number;
  carry_in_credit: number;
  carry_in_debt: number;
  priorBalance: number;
  settled_in_month: string | null;
  status: string;
  confirmation_status: string;
  students: {
    id: string;
    full_name: string;
    family_id: string | null;
    avatar_url: string | null;
    is_active: boolean;
  };
  classes: Array<{ id: string; name: string }>;
  hasDiscount: boolean;
  hasSiblings: boolean;
  discounts: any[];
}

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

  const batchResultArrays = await Promise.all(
    batches.map((ids) =>
      supabase.functions
        .invoke("calculate-tuition-bulk", { body: { studentIds: ids, month } })
        .then(({ data, error }) => {
          if (error) throw error;
          return (data?.results as any[]) || [];
        })
    )
  );

  const bulkResults = batchResultArrays.flat();
  return new Map<string, any>(bulkResults.map((r: any) => [r.studentId, r]));
}

/**
 * One student's calculate-tuition-bulk answer as the row the tuition lists
 * and the payment dialogs pass around. `data` must be a real answer (not
 * missing, not an error row).
 */
export function liveTuitionItem(
  student: LiveTuitionItem["students"],
  data: any,
  month: string,
  badges: { classes: Array<{ id: string; name: string }>; hasDiscount: boolean; hasSiblings: boolean },
): LiveTuitionItem {
  return {
    id: data.invoiceId || `placeholder-${student.id}`,
    student_id: student.id,
    month,
    base_amount: data.baseAmount ?? 0,
    discount_amount: data.totalDiscount ?? 0,
    total_amount: data.totalAmount ?? 0,
    recorded_payment: data.payments?.monthPayments ?? 0,
    // The function's own payable when it sends one. It does not yet
    // (docs/evidence/T3-prior-balance.md, "Stopped on"), so until then this
    // is still its charge plus its carry-in, added here; the payment dialogs
    // decide the invoice status they write from this figure.
    finalPayable: tuitionFigures(data).payable ?? data.totalAmount + (data.carry?.carryInDebt ?? 0) - (data.carry?.carryInCredit ?? 0),
    balance: (data.carry?.carryOutDebt || 0) - (data.carry?.carryOutCredit || 0),
    carry_out_credit: data.carry?.carryOutCredit ?? 0,
    carry_out_debt: data.carry?.carryOutDebt ?? 0,
    carry_in_credit: data.carry?.carryInCredit ?? 0,
    carry_in_debt: data.carry?.carryInDebt ?? 0,
    priorBalance: (data.carry?.carryInCredit ?? 0) - (data.carry?.carryInDebt ?? 0),
    settled_in_month: data.carry?.settledInMonth ?? null,
    status: data.invoiceStatus || data.carry?.status || "open",
    confirmation_status: data.confirmationStatus || "needs_review",
    students: student,
    classes: badges.classes,
    hasDiscount: badges.hasDiscount,
    hasSiblings: badges.hasSiblings,
    discounts: [],
  };
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
