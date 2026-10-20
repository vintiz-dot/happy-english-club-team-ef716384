/**
 * scheduleHistory — which timetable was this class on, on a given date?
 *
 * public.class_schedule_versions holds one row per (class, effective_from).
 * The schedule in force on a date is the row with the greatest
 * effective_from at or before it. Changing a class's timetable adds a row;
 * it never edits the old one, so the past stays describable.
 *
 * WHY THIS MATTERS AND IS NOT COSMETIC. classSchedule.expectedLengthFor
 * takes `slots` as a plain argument, and every caller used to hand it
 * `parseWeeklySlots(classes.schedule_template)` — the CURRENT timetable —
 * no matter what date the session it was judging ran on. So the day after
 * an admin moved a class from 90 minutes to 120, every ninety-minute lesson
 * already taught became a "mismatch": the payroll screen filled with a
 * variance nobody caused, and the "projected at scheduled lengths" figure
 * re-priced finished months at a length that was never scheduled when they
 * happened. For an hourly teacher that is a wrong number next to their name.
 *
 * The fix is here rather than in classSchedule.ts on purpose: that module's
 * signature was already right. It asked for the slots that apply. The
 * callers were answering the wrong question.
 *
 * Resolution happens in code rather than through the SQL helper
 * (public.class_slots_on) because the screens that need it hold a month of
 * sessions across every class at once — a function call per session row
 * would be a join per row. The SQL helper exists for places that cannot run
 * code, namely is_teacher_of_class.
 */

import { parseWeeklySlots, type WeeklySlot } from "@/lib/classSchedule";

/** A row of public.class_schedule_versions. */
export interface ScheduleVersion {
  class_id: string;
  /** YYYY-MM-DD, inclusive. Runs until the next version starts. */
  effective_from: string;
  weekly_slots: unknown;
  default_session_length_minutes: number | null;
  note?: string | null;
  id?: string;
  created_at?: string;
}

/** What a caller needs to judge one session. */
export interface ScheduleAtDate {
  slots: WeeklySlot[];
  defaultMinutes: number | null;
  /** The version used, or null when falling back to the class's template. */
  version: ScheduleVersion | null;
}

/**
 * Groups versions by class, newest first.
 *
 * Sorting once here rather than on every lookup: a payroll month is
 * hundreds of sessions over a handful of classes, and re-sorting per
 * session is the kind of quiet quadratic that only shows up on the biggest
 * school's busiest month.
 */
export function indexScheduleVersions(
  rows: ScheduleVersion[] | null | undefined,
): Map<string, ScheduleVersion[]> {
  const byClass = new Map<string, ScheduleVersion[]>();
  for (const row of rows ?? []) {
    if (!row?.class_id) continue;
    const list = byClass.get(row.class_id);
    if (list) list.push(row);
    else byClass.set(row.class_id, [row]);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => (a.effective_from < b.effective_from ? 1 : a.effective_from > b.effective_from ? -1 : 0));
  }
  return byClass;
}

/**
 * The version in force on `date`, from a list already sorted newest first.
 *
 * String comparison, not Date parsing: both sides are YYYY-MM-DD, which
 * sorts correctly as text, and parsing would drag a timezone into a
 * question that has none. A session dated 2026-11-01 belongs to the
 * version effective 2026-11-01 whatever hemisphere the admin is in.
 */
export function versionOnDate(
  sortedDesc: ScheduleVersion[] | null | undefined,
  date?: string | null,
): ScheduleVersion | null {
  if (!date || !sortedDesc?.length) return null;
  const day = date.slice(0, 10);
  for (const v of sortedDesc) {
    if (v.effective_from <= day) return v;
  }
  return null;
}

/**
 * Everything needed to judge a session on one date.
 *
 * `fallback` is the class row's own template and default length, used when
 * no version covers the date. That should not happen — the migration
 * backfills a 1900-01-01 baseline for every class — but a class created
 * after that migration by a path that forgets to write a version would
 * otherwise be judged against an empty timetable, which flags every one of
 * its sessions as wrong. Falling back to the present is the lesser error.
 */
export function scheduleOnDate(
  versionsForClass: ScheduleVersion[] | null | undefined,
  date: string | null | undefined,
  fallback?: { schedule_template?: unknown; default_session_length_minutes?: number | null } | null,
): ScheduleAtDate {
  const version = versionOnDate(versionsForClass, date);
  if (version) {
    return {
      slots: parseWeeklySlots({ weeklySlots: version.weekly_slots }),
      defaultMinutes: version.default_session_length_minutes ?? null,
      version,
    };
  }
  return {
    slots: parseWeeklySlots(fallback?.schedule_template),
    defaultMinutes: fallback?.default_session_length_minutes ?? null,
    version: null,
  };
}

/**
 * The version in force today — what `classes.schedule_template` mirrors.
 *
 * Takes today's date rather than reading the clock so the caller stays
 * testable and so a screen rendering a month does not drift across
 * midnight mid-render.
 */
export function currentVersion(
  versionsForClass: ScheduleVersion[] | null | undefined,
  today: string,
): ScheduleVersion | null {
  return versionOnDate(versionsForClass, today);
}

/**
 * Versions that have not started yet, oldest first.
 *
 * The admin screen shows these separately: a schedule change saved for next
 * term is invisible on every other screen until it starts, and an admin who
 * cannot see that it is pending will make it twice.
 */
export function pendingVersions(
  versionsForClass: ScheduleVersion[] | null | undefined,
  today: string,
): ScheduleVersion[] {
  return (versionsForClass ?? [])
    .filter((v) => v.effective_from > today)
    .sort((a, b) => (a.effective_from < b.effective_from ? -1 : 1));
}

/**
 * The day before the next version starts — a version's last day, or null if
 * it is the current one. For the "3 Feb 2026 – 31 Oct 2026" label.
 */
export function versionEndsOn(
  sortedDesc: ScheduleVersion[] | null | undefined,
  version: ScheduleVersion,
): string | null {
  const later = (sortedDesc ?? []).filter((v) => v.effective_from > version.effective_from);
  if (!later.length) return null;
  const next = later[later.length - 1].effective_from; // sortedDesc: last is earliest
  return addDays(next, -1);
}

/** YYYY-MM-DD arithmetic that stays in UTC, so no date ever shifts by one. */
export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  const t = Date.UTC(y, (m || 1) - 1, d || 1) + delta * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
