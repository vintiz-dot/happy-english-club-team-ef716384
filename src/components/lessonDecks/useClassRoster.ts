import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Full names of the children in the room, for a deck's name slots: today's
 * "Present" marks when attendance has been taken, otherwise everyone enrolled
 * now. Read through the teacher's own session, so RLS decides what they see
 * (the same reads the Team Maker makes). Names stay in memory, never saved.
 */
export function useClassRoster(classId: string | null) {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });
  return useQuery({
    queryKey: ["lesson-deck-roster", classId, today],
    enabled: !!classId,
    staleTime: 30_000,
    queryFn: async (): Promise<{ names: string[]; from: "present" | "roster" }> => {
      const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
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
        const names = [...new Set((present ?? []).map((r) => one(r.students)?.full_name).filter(Boolean) as string[])];
        if (names.length > 0) return { names, from: "present" };
      }
      const { data: enrolled, error } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(id, full_name, is_active)")
        .eq("class_id", classId!)
        .lte("start_date", today)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (error) throw error;
      const names = [
        ...new Set(
          (enrolled ?? [])
            .map((r) => one(r.students))
            .filter((s) => s && s.is_active !== false)
            .map((s) => s!.full_name),
        ),
      ];
      return { names, from: "roster" };
    },
  });
}
