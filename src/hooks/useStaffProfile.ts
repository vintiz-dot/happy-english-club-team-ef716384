import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type StaffType = "teacher" | "teaching_assistant";

export interface StaffProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  hourly_rate_vnd: number;
  is_active: boolean;
  staffType: StaffType;
}

/**
 * Resolves the current authenticated user as either a teacher or teaching assistant.
 * Returns the profile along with the staff type for conditional logic.
 */
export function useStaffProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["staff-profile", user?.id],
    queryFn: async (): Promise<StaffProfile | null> => {
      if (!user) return null;

      // Try teacher first
      const { data: teacher } = await supabase
        .from("teachers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (teacher) {
        return { ...teacher, staffType: "teacher" as StaffType };
      }

      // Try teaching assistant
      const { data: ta } = await supabase
        .from("teaching_assistants")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (ta) {
        return { ...ta, staffType: "teaching_assistant" as StaffType };
      }

      return null;
    },
    enabled: !!user,
  });
}

/**
 * Given a staff profile, fetch class IDs they have access to.
 * For teachers: sessions where teacher_id matches
 * For TAs: session_participants where teaching_assistant_id matches
 */
export async function getStaffClassIds(staffId: string, staffType: StaffType): Promise<string[]> {
  if (staffType === "teacher") {
    const { data } = await supabase
      .from("sessions")
      .select("class_id")
      .eq("teacher_id", staffId);

    return [...new Set(data?.map(s => s.class_id) || [])];
  } else {
    const { data } = await supabase
      .from("session_participants")
      .select("sessions!inner(class_id)")
      .eq("teaching_assistant_id", staffId)
      .eq("participant_type", "teaching_assistant");

    const classIds = data?.map((sp: any) => sp.sessions?.class_id).filter(Boolean) || [];
    return [...new Set(classIds)];
  }
}

/**
 * Fetch sessions for a staff member (teacher or TA) with class info.
 */
export async function getStaffSessions(
  staffId: string, 
  staffType: StaffType, 
  filters?: { dateGte?: string; dateLte?: string; dateEq?: string }
) {
  if (staffType === "teacher") {
    let query = supabase
      .from("sessions")
      .select(`id, date, start_time, end_time, status, class_id, classes!inner(id, name)`)
      .eq("teacher_id", staffId);

    if (filters?.dateGte) query = query.gte("date", filters.dateGte);
    if (filters?.dateLte) query = query.lte("date", filters.dateLte);
    if (filters?.dateEq) query = query.eq("date", filters.dateEq);

    const { data } = await query.order("start_time", { ascending: true });
    return data || [];
  } else {
    // For TAs, get sessions through session_participants
    let query = supabase
      .from("session_participants")
      .select(`
        sessions!inner(id, date, start_time, end_time, status, class_id, classes!inner(id, name))
      `)
      .eq("teaching_assistant_id", staffId)
      .eq("participant_type", "teaching_assistant");

    if (filters?.dateGte) query = query.gte("sessions.date", filters.dateGte);
    if (filters?.dateLte) query = query.lte("sessions.date", filters.dateLte);
    if (filters?.dateEq) query = query.eq("sessions.date", filters.dateEq);

    const { data } = await query;
    // Flatten the nested sessions
    return (data || []).map((sp: any) => sp.sessions).filter(Boolean);
  }
}

/**
 * Resolve class IDs for the current user (teacher or TA) by user_id.
 * Useful in imperative code where the staff profile isn't already loaded.
 */
export async function getStaffClassIdsForUser(userId: string): Promise<string[]> {
  // Try teacher
  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (teacher) {
    return getStaffClassIds(teacher.id, "teacher");
  }

  // Try TA
  const { data: ta } = await supabase
    .from("teaching_assistants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (ta) {
    return getStaffClassIds(ta.id, "teaching_assistant");
  }

  return [];
}
