/**
 * teacherAccess — when is a class this teacher's business?
 *
 * THE RULE, in two tiers. It must match
 * supabase/migrations/20261007120000_scope_teacher_class_access_in_time.sql,
 * which is what actually enforces it. These helpers only decide what the UI
 * offers; if the UI is more generous than the database the teacher gets an
 * empty screen with no explanation, and if it is stricter they lose a class
 * they can legitimately open.
 *
 *   Roster  — permanent. The class names them as its default teacher, or one
 *             of its weekly slots does. supabase/functions/schedule-sessions
 *             generates every session from `slot.teacherId ||
 *             cls.default_teacher_id`, so the roster decides who teaches
 *             what and the session rows are a projection of it.
 *
 *   Cover   — time-boxed. A non-cancelled session assigned to them inside the
 *             window below.
 *
 * WHY THIS EXISTS. The old rule, in both the database and three separate
 * client queries, was "has this person ever had one session row for this
 * class". Covering a single lesson therefore granted the class permanently —
 * and not read-only: the point and attendance policies are FOR ALL. A
 * cancelled session granted it too, because status was never checked.
 */

import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { parseWeeklySlots } from "@/lib/classSchedule";

/**
 * Teaching a lesson is not the end of the work — attendance, points and
 * marking trail it, so cover does not lapse the moment the bell goes. But it
 * should not outlast the work either: at 45 days, the first value tried here,
 * a teacher who covered one lesson kept the class in their leaderboard for
 * six weeks and it read as though the class had been assigned to them.
 *
 * Kept in step with 20261007140000_shorten_cover_window_to_seven_days.sql.
 */
export const COVER_TRAILING_DAYS = 7;

/**
 * A teacher has to be able to prepare a class they are about to cover, and
 * the generator writes sessions ahead of time.
 */
export const COVER_UPCOMING_DAYS = 60;

/** The cover window as inclusive YYYY-MM-DD bounds, for a date filter. */
export function coverWindow(today = dayjs()) {
  return {
    from: today.subtract(COVER_TRAILING_DAYS, "day").format("YYYY-MM-DD"),
    to: today.add(COVER_UPCOMING_DAYS, "day").format("YYYY-MM-DD"),
  };
}

/** The shape this needs off a `classes` row; anything else is ignored. */
export interface RosterClassRow {
  default_teacher_id?: string | null;
  schedule_template?: unknown;
}

/**
 * Is this teacher on the class's roster? Permanent, and independent of
 * whether any session has been generated yet — a class set up for next term
 * has no sessions at all, and its teacher should still see it.
 */
export function isRosteredFor(cls: RosterClassRow, teacherId: string): boolean {
  if (!teacherId) return false;
  if (cls.default_teacher_id === teacherId) return true;
  return parseWeeklySlots(cls.schedule_template).some((slot) => slot.teacherId === teacherId);
}

export interface AccessibleClass {
  id: string;
  name: string;
}

/**
 * Every class this user may open a leaderboard for: on the roster, or
 * currently covering.
 *
 * Shared because this query existed in two places with the same bug in both
 * — fixing one surface and not the other leaves the leak live. Mirrors
 * is_teacher_of_class, so a class listed here is one the database will
 * actually serve data for.
 */
export async function fetchAccessibleClasses(userId: string): Promise<AccessibleClass[]> {
  if (!userId) return [];

  const window = coverWindow();
  const byId = new Map<string, AccessibleClass>();
  const add = (cls?: { id?: string; name?: string } | null) => {
    if (cls?.id && !byId.has(cls.id)) byId.set(cls.id, { id: cls.id, name: cls.name || "Class" });
  };

  const { data: teacher } = await supabase
    .from("teachers")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (teacher) {
    // Roster: permanent, and true before any session has been generated.
    const { data: rostered } = await supabase
      .from("classes")
      .select("id, name, default_teacher_id, schedule_template")
      .eq("is_active", true);

    for (const cls of rostered || []) {
      if (isRosteredFor(cls, teacher.id)) add(cls);
    }

    // Cover: bounded on both sides, cancelled sessions excluded, and limited
    // to active classes — archiving a class used to change nothing here.
    const { data: covering } = await supabase
      .from("sessions")
      .select(`class_id, classes!inner(id, name, is_active)`)
      .eq("teacher_id", teacher.id)
      .neq("status", "Canceled")
      .eq("classes.is_active", true)
      .gte("date", window.from)
      .lte("date", window.to);

    for (const row of covering || []) {
      const cls: any = Array.isArray((row as any).classes)
        ? (row as any).classes[0]
        : (row as any).classes;
      add(cls);
    }

    return [...byId.values()];
  }

  const { data: ta } = await supabase
    .from("teaching_assistants")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!ta) return [];

  const { data: assisting } = await supabase
    .from("session_participants")
    .select(`sessions!inner(class_id, date, status, classes!inner(id, name, is_active))`)
    .eq("teaching_assistant_id", ta.id)
    .eq("participant_type", "teaching_assistant")
    .neq("sessions.status", "Canceled")
    .eq("sessions.classes.is_active", true)
    .gte("sessions.date", window.from)
    .lte("sessions.date", window.to);

  for (const sp of assisting || []) {
    const session: any = Array.isArray((sp as any).sessions)
      ? (sp as any).sessions[0]
      : (sp as any).sessions;
    const cls: any = Array.isArray(session?.classes) ? session.classes[0] : session?.classes;
    add(cls);
  }

  return [...byId.values()];
}
