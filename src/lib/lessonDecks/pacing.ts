// Pacing guide: which lesson falls on which class date. Imports nothing.
//
// A class's schedule_template.weeklySlots uses JavaScript weekdays (0 = Sunday).
// Dates are plain "YYYY-MM-DD" strings worked in UTC so a browser's time zone
// can never move a lesson to the day before.

export type WeeklySlot = { dayOfWeek: number; startTime?: string; endTime?: string };
export type PacedLesson<T> = { date: string; weekday: string; startTime?: string; week: number; item: T };

const DAY = 86_400_000;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toUtc(d: string): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}
function fromUtc(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** The next `count` class dates on or after `start`, skipping `skip` (holidays). */
export function classDates(slots: WeeklySlot[], start: string, count: number, skip: string[] = []) {
  const days = new Map<number, WeeklySlot>();
  for (const s of slots) if (s.dayOfWeek >= 0 && s.dayOfWeek <= 6 && !days.has(s.dayOfWeek)) days.set(s.dayOfWeek, s);
  const out: { date: string; weekday: string; startTime?: string }[] = [];
  if (days.size === 0 || count <= 0) return out;
  const skipped = new Set(skip);
  // A year of weeks is far more than any unit needs; the bound stops a bad input looping.
  for (let t = toUtc(start), n = 0; out.length < count && n < 400; t += DAY, n++) {
    const dow = new Date(t).getUTCDay();
    const slot = days.get(dow);
    const date = fromUtc(t);
    if (slot && !skipped.has(date)) out.push({ date, weekday: WEEKDAYS[dow], startTime: slot.startTime });
  }
  return out;
}

/** One lesson per class, in order. Week 1 is the week of the first lesson (Mon-Sun). */
export function paceLessons<T>(items: T[], slots: WeeklySlot[], start: string, skip: string[] = []): PacedLesson<T>[] {
  const dates = classDates(slots, start, items.length, skip);
  if (dates.length === 0) return [];
  const monday = (d: string) => {
    const t = toUtc(d);
    return t - ((new Date(t).getUTCDay() + 6) % 7) * DAY;
  };
  const first = monday(dates[0].date);
  return dates.map((d, i) => ({ ...d, week: Math.round((monday(d.date) - first) / (7 * DAY)) + 1, item: items[i] }));
}
