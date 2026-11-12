/**
 * The shell's shared question: "which students does this login look after?"
 *
 * ProfileSwitcher (header) and ProfilePicker (app root) used to each run
 * the same families -> students sequence on every mount and every time
 * the auth `user` object was replaced, which is several times per page
 * load. They now call the one function below through the React Query
 * cache, so concurrent and repeated asks share one answer.
 *
 * Safety rules, because this decides which child a shared login sees:
 *  - The cache key always contains the signed-in user's id, so one
 *    user's list can never be returned for another.
 *  - The answer is only kept when both requests succeeded; a failure is
 *    never remembered.
 *  - The freshness window is short (30 s): long enough to merge a page
 *    load's repeats, short enough that a child added by an admin shows
 *    up on the next page.
 *  - Everything under SHELL_CACHE_ROOT (and the per-user identity key) is removed on sign-out.
 *  - Which child is SELECTED is not here. It stays in the callers and in
 *    StudentProfileContext; this module only lists who could be selected.
 */
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const SHELL_CACHE_ROOT = "shell";
export const SHELL_STUDENTS_STALE_MS = 30 * 1000;

export interface ShellStudent {
  id: string;
  full_name: string;
  date_of_birth: string | null;
}

export function shellStudentsKey(userId: string) {
  return [SHELL_CACHE_ROOT, "students", userId] as const;
}

interface StudentsAnswer {
  students: any[] | null;
  /** False when a request errored: the caller still gets the rows, the cache keeps nothing. */
  complete: boolean;
}

/** The same two-step lookup both components ran; text of the queries unchanged. */
async function fetchMyStudents(userId: string): Promise<StudentsAnswer> {
  const { data: familyData, error: familyError } = await supabase
    .from("families")
    .select("id")
    .eq("primary_user_id", userId)
    .maybeSingle();

  let studentData;
  let studentError;
  if (familyData) {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, date_of_birth")
      .eq("family_id", familyData.id)
      .eq("is_active", true)
      .order("full_name");
    studentData = data;
    studentError = error;
  } else {
    const { data, error } = await supabase
      .from("students")
      .select("id, full_name, date_of_birth")
      .eq("linked_user_id", userId)
      .eq("is_active", true)
      .order("full_name");
    studentData = data;
    studentError = error;
  }

  return { students: studentData ?? null, complete: !familyError && !studentError };
}

/**
 * Returns what the components' own loops returned (`data`, possibly null).
 * Callers keep their own `studentData || []` and their own selection logic.
 */
export async function loadMyStudents(queryClient: QueryClient, userId: string): Promise<any[] | null> {
  const key = shellStudentsKey(userId);
  const answer = await queryClient.fetchQuery({
    queryKey: key,
    queryFn: () => fetchMyStudents(userId),
    staleTime: SHELL_STUDENTS_STALE_MS,
  });
  if (!answer.complete) queryClient.removeQueries({ queryKey: key, exact: true });
  return answer.students;
}

/** Sign-out / no user: forget everything the shell remembered about a person. */
export function clearShellCache(queryClient: QueryClient) {
  // Announcement keys already carry the user id and the anonymous one is live on /auth; they are left alone.
  for (const root of [SHELL_CACHE_ROOT, "identity"]) {
    queryClient.removeQueries({ queryKey: [root] });
  }
}
