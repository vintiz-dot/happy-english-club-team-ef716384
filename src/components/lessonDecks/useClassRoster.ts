import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Student = { id: string; name: string };
const uniq = (xs: Student[]) => [...new Map(xs.filter((x) => x.name).map((x) => [x.id, x])).values()];

/**
 * The children in the room, for a deck's name slots and per-child homework:
 * today's "Present" marks when attendance has been taken, otherwise everyone
 * enrolled now. Read through the teacher's own session, so RLS decides what they
 * see (the same reads the Team Maker makes). Names stay in memory, never saved;
 * only student ids are kept (for the class's homework interest groups).
 */
export function useClassRoster(classId: string | null) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return useQuery({
    queryKey: ["lesson-deck-roster", classId, today],
    enabled: !!classId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ names: string[]; students: Student[]; enrolled: Student[]; from: "present" | "roster" }> => {
      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
      const { data: enrolledRows, error } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(id, full_name, is_active)")
        .eq("class_id", classId!)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (error) throw error;
      const enrolled = uniq((enrolledRows ?? []).map((r) => one(r.students)).filter((s) => s && s.is_active !== false)
        .map((s) => ({ id: s!.id, name: s!.full_name })));

      const { data: sessions } = await supabase
        .from("sessions")
        .select("id")
        .eq("class_id", classId!)
        .eq("date", today)
        .neq("status", "Canceled");
      const ids = (sessions ?? []).map((s) => s.id);
      if (ids.length > 0) {
        const { data: present } = await supabase
          .from("attendance")
          .select("student_id, students!inner(id, full_name)")
          .in("session_id", ids)
          .eq("status", "Present");
        const students = uniq((present ?? []).map((r) => one(r.students)).filter(Boolean).map((s) => ({ id: s!.id, name: s!.full_name })));
        if (students.length > 0) return { names: students.map((s) => s.name), students, enrolled, from: "present" };
      }
      return { names: enrolled.map((s) => s.name), students: enrolled, enrolled, from: "roster" };
    },
  });
}
