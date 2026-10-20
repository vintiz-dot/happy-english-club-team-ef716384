/**
 * schedule-history — which timetable was a class on, on a given date?
 *
 * The Deno-side counterpart to src/lib/scheduleHistory.ts. It is NOT a
 * byte-identical mirror of that file the way _lib/pay-rate.ts mirrors
 * src/lib/payRate.ts: the browser module imports @/lib/classSchedule for
 * slot parsing and carries the pending-change / version-ends-on helpers
 * the admin screens need. The generator needs none of that - it wants the
 * raw weeklySlots array in force on a date and nothing else - so this is
 * the resolution rule on its own.
 *
 * WHY IT HAS TO EXIST AT ALL. public.class_schedule_versions is the record
 * of when a timetable changed; classes.schedule_template is only "what is
 * this class on TODAY", which is what the catalogue, the forms and the
 * calendars want. schedule-sessions is the one caller that reads a
 * template to decide something about a FUTURE date, so it is the one
 * caller for which the current template is the wrong answer.
 *
 * The rule here is deliberately the same one public.class_slots_on
 * implements in SQL, fallback included: the latest version at or before
 * the date, or the class's current template when no version covers it.
 * They must not drift, because is_teacher_of_class resolves access through
 * the SQL one while this decides which sessions exist. If they disagree, a
 * teacher holds a class the generator never scheduled them for, or the
 * reverse.
 *
 * Resolved in memory rather than by calling class_slots_on per date: a run
 * covers every active class across a whole month, so the SQL helper would
 * be one round trip per class per day.
 */

/** A row of public.class_schedule_versions, as the generator reads it. */
export interface ScheduleVersionRow {
  class_id: string;
  /** YYYY-MM-DD, inclusive. Runs until the next version starts. */
  effective_from: string;
  weekly_slots: unknown;
}

/**
 * Group versions by class, newest first, so a date lookup is a scan from
 * the front rather than a sort per date.
 */
export function indexVersions<T extends ScheduleVersionRow>(
  rows: T[] | null | undefined,
): Map<string, T[]> {
  const byClass = new Map<string, T[]>();
  for (const row of rows ?? []) {
    if (!row?.class_id || typeof row.effective_from !== "string") continue;
    const list = byClass.get(row.class_id);
    if (list) list.push(row);
    else byClass.set(row.class_id, [row]);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) =>
      a.effective_from < b.effective_from ? 1 : a.effective_from > b.effective_from ? -1 : 0
    );
  }
  return byClass;
}

/**
 * The slots in force for one class on one date.
 *
 * `versionsDesc` is that class's entry from indexVersions. `fallback` is
 * classes.schedule_template, used only when no version covers the date -
 * which after the 1900-01-01 backfill means a class created since, whose
 * baseline row has not been written yet. Falling back to the template
 * beats falling back to nothing: an empty array would quietly generate no
 * sessions at all for that class.
 *
 * Dates are compared as YYYY-MM-DD strings. That is a correct ordering for
 * this format and avoids pulling a timezone into a comparison that is
 * already being made in Asia/Bangkok calendar terms by the caller.
 */
export function slotsOnDate<S>(
  versionsDesc: ScheduleVersionRow[] | null | undefined,
  date: string,
  fallback: unknown,
): S[] {
  const day = date.slice(0, 10);
  for (const v of versionsDesc ?? []) {
    if (v.effective_from.slice(0, 10) <= day) {
      return Array.isArray(v.weekly_slots) ? (v.weekly_slots as S[]) : [];
    }
  }
  return Array.isArray(fallback) ? (fallback as S[]) : [];
}
