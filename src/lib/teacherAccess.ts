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

import { dayjs } from "@/lib/date";
import { parseWeeklySlots } from "@/lib/classSchedule";

/**
 * Teaching a lesson is not the end of the work — attendance, points and
 * marking trail it, so cover does not lapse the moment the bell goes.
 */
export const COVER_TRAILING_DAYS = 45;

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
