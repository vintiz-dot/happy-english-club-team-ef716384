/**
 * Free trial lessons (owner, 24 Nov 2026).
 *
 * The school sometimes gives a child a lesson as a free trial. An admin ticks
 * the lesson for that child (table free_trial_lessons: one row per child and
 * lesson, with a reason) and the lesson is not billed, whatever its mark. The
 * rule itself is in _lib/tuition-pricing.ts (state "trial"); this file only
 * reads the rows for the calculators, the same way for both.
 *
 * The table arrives with migration 20261124090000. A calculator deployed
 * before it is pasted finds no table: that is "no free trials", not a failure.
 * Any other read error fails the calculation - a free trial silently left out
 * is a wrong charge saved on the bill.
 */

export const freeTrialKey = (sessionId: string, studentId: string) => `${sessionId}:${studentId}`;

/** The table is not there yet (PostgREST: not in the schema cache; Postgres: undefined table). */
export function isMissingFreeTrialTable(error: any): boolean {
  const code = String(error?.code ?? "");
  const message = String(error?.message ?? "");
  return code === "PGRST205" || code === "42P01" || /free_trial_lessons.*(does not exist|schema cache)/i.test(message);
}

/**
 * The free trial lessons of these students among these sessions, as
 * freeTrialKey(session, student). Paged by id, so a long list is never cut.
 */
export async function readFreeTrials(supabase: any, studentIds: string[], sessionIds: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  const students = [...new Set((studentIds ?? []).filter(Boolean))];
  const sessions = [...new Set((sessionIds ?? []).filter(Boolean))];
  if (students.length === 0 || sessions.length === 0) return out;
  const CHUNK = 150;
  const PAGE = 1000;
  for (let i = 0; i < sessions.length; i += CHUNK) {
    const part = sessions.slice(i, i + CHUNK);
    for (let j = 0; j < students.length; j += CHUNK) {
      const who = students.slice(j, j + CHUNK);
      let after: string | null = null;
      for (;;) {
        let q = supabase.from("free_trial_lessons").select("id, session_id, student_id").in("session_id", part).in("student_id", who);
        if (after !== null) q = q.gt("id", after);
        const { data, error } = await q.order("id", { ascending: true }).limit(PAGE);
        if (error) {
          if (isMissingFreeTrialTable(error)) return new Set<string>();
          throw new Error("Unable to read the free trial lessons");
        }
        for (const r of data ?? []) out.add(freeTrialKey(r.session_id, r.student_id));
        if (!data || data.length < PAGE) break;
        after = String(data[data.length - 1].id);
      }
    }
  }
  return out;
}
