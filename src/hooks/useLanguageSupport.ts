/**
 * Data for Language Support: a teacher's classes, sets and picture choices,
 * and the sets a child's classes have switched on. Every read and write goes
 * through the signed-in person's own client, so the row policies in
 * 20261110090000_language_support.sql are the boundary.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { ApprovedSentence } from "@/lib/languageSupport/strip";

/** The new tables are not in the generated types until they are regenerated. */
export const lsDb = supabase as any;

export interface ClassRef { id: string; name: string }

export interface LanguageSet {
  id: string;
  owner_user_id: string;
  title: string;
  description: string | null;
  sentences: ApprovedSentence[];
  updated_at: string;
}

/** The classes a teacher may switch a set on for; an admin may use any active class. */
export function useTeacherClasses() {
  const { user, role } = useAuth();
  return useQuery({
    queryKey: ["language-support-classes", user?.id, role],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ClassRef[]> => {
      if (role === "admin") {
        const { data } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
        return data ?? [];
      }
      const { data: teacher } = await supabase.from("teachers").select("id").eq("user_id", user!.id).maybeSingle();
      let classIds: string[] = [];
      if (teacher) {
        const { data: sessions } = await supabase.from("sessions").select("class_id").eq("teacher_id", teacher.id);
        classIds = [...new Set((sessions ?? []).map((s) => s.class_id))];
      } else {
        const { data: ta } = await supabase.from("teaching_assistants").select("id").eq("user_id", user!.id).maybeSingle();
        if (!ta) return [];
        const { data: sp } = await supabase
          .from("session_participants")
          .select("sessions!inner(class_id)")
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant");
        classIds = [...new Set((sp ?? []).map((r: any) => r.sessions?.class_id).filter(Boolean))];
      }
      if (!classIds.length) return [];
      const { data } = await supabase.from("classes").select("id, name").in("id", classIds).eq("is_active", true).order("name");
      return data ?? [];
    },
  });
}

/** The teacher's own sets, newest first. */
export function useMySets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["language-support-sets", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LanguageSet[]> => {
      const { data, error } = await lsDb
        .from("language_support_sets")
        .select("id, owner_user_id, title, description, sentences, updated_at")
        .eq("owner_user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Which classes each of these sets is on for: { setId: { classId: active } }. */
export function useActivations(setIds: string[]) {
  return useQuery({
    queryKey: ["language-support-activations", setIds.join(",")],
    enabled: setIds.length > 0,
    queryFn: async (): Promise<Record<string, Record<string, boolean>>> => {
      const { data, error } = await lsDb
        .from("language_support_set_classes")
        .select("set_id, class_id, active")
        .in("set_id", setIds);
      if (error) throw error;
      const out: Record<string, Record<string, boolean>> = {};
      for (const r of data ?? []) (out[r.set_id] ??= {})[r.class_id] = r.active;
      return out;
    },
  });
}

/** The teacher's own picture choices, concept -> ARASAAC id. */
export function useOverrides() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["language-support-overrides", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await lsDb.from("language_support_overrides").select("concept, pictogram");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((r: any) => [r.concept, r.pictogram]));
    },
  });
}

export interface ChildSet extends LanguageSet {
  class_names: string[];
}

/**
 * The sets switched on, right now, for the classes this child is enrolled in.
 * Empty when no teacher has activated one - the Picture Reader menu item
 * only appears when this is not.
 */
export function useSetsForStudent(studentId: string | undefined) {
  return useQuery({
    queryKey: ["language-support-for-student", studentId],
    enabled: !!studentId,
    staleTime: 5 * 60 * 1000,
    retry: false, // before the migration is applied the tables do not exist: show nothing
    queryFn: async (): Promise<ChildSet[]> => {
      const { data: enr } = await supabase
        .from("enrollments")
        .select("class_id, classes(id, name)")
        .eq("student_id", studentId!)
        .is("end_date", null);
      const classes = new Map<string, string>();
      for (const e of (enr ?? []) as any[]) if (e.classes) classes.set(e.classes.id, e.classes.name);
      if (!classes.size) return [];
      const { data: links, error } = await lsDb
        .from("language_support_set_classes")
        .select("set_id, class_id")
        .in("class_id", [...classes.keys()])
        .eq("active", true);
      if (error) throw error;
      const bySet = new Map<string, string[]>();
      for (const l of links ?? []) bySet.set(l.set_id, [...(bySet.get(l.set_id) ?? []), classes.get(l.class_id) ?? ""]);
      if (!bySet.size) return [];
      const { data: sets, error: setError } = await lsDb
        .from("language_support_sets")
        .select("id, owner_user_id, title, description, sentences, updated_at")
        .in("id", [...bySet.keys()])
        .order("updated_at", { ascending: false });
      if (setError) throw setError;
      return (sets ?? []).map((s: LanguageSet) => ({ ...s, class_names: bySet.get(s.id) ?? [] }));
    },
  });
}
