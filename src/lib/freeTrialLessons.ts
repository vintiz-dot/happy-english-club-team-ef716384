/**
 * Free trial lessons on a child's tuition page (owner, 24 Nov 2026).
 *
 * The lessons, their prices and their states come from calculate-tuition
 * (`lessons` in its answer; the rule is supabase/functions/_lib/tuition-pricing.ts).
 * Nothing is priced here: this only says, for each lesson the function listed,
 * what the admin sees and which button, if any, sits beside it.
 *
 * Pure; imports nothing (free-trial-lessons.test.mjs).
 */

export interface TuitionLesson {
  session_id: string;
  date: string;
  class_id?: string;
  class_name?: string;
  price_vnd: number;
  mark?: string | null;
  held?: boolean;
  /** billed | excused | cancelled | free (the price is 0) | trial (a free trial lesson) */
  state: string;
}

export type TrialAction = "give" | "take_back" | null;

export interface TrialRow {
  lesson: TuitionLesson;
  /** What the lesson is on the bill, in words. */
  label: string;
  /** give: make it a free trial; take_back: charge it again; null: nothing to do. */
  action: TrialAction;
}

/** One row per lesson, oldest first. */
export function trialRows(lessons: TuitionLesson[] | null | undefined): TrialRow[] {
  return [...(lessons ?? [])]
    .filter((l) => l && l.session_id)
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.session_id < b.session_id ? -1 : 1))
    .map((lesson) => {
      switch (lesson.state) {
        case "trial":
          return { lesson, label: "Free trial: not charged", action: "take_back" as const };
        case "billed":
          return { lesson, label: "Charged", action: "give" as const };
        case "excused":
          // Not charged already; a free trial on top would change nothing today,
          // but it keeps the lesson free if the mark is changed later.
          return { lesson, label: "Excused: not charged", action: "give" as const };
        case "cancelled":
          return { lesson, label: "Cancelled: not charged", action: null };
        case "free":
          return { lesson, label: "Free place: nothing to charge", action: null };
        default:
          return { lesson, label: lesson.state || "Unknown", action: null };
      }
    });
}

/** What the free trial lessons listed would have cost. */
export function trialValue(lessons: TuitionLesson[] | null | undefined): { lessons: number; amount: number } {
  const trial = (lessons ?? []).filter((l) => l?.state === "trial");
  return { lessons: trial.length, amount: trial.reduce((n, l) => n + (Number(l.price_vnd) || 0), 0) };
}

/** The database's answer when the table is not installed yet (migration 20261124090000). */
export function isMissingTrialTable(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code ?? "");
  return code === "PGRST205" || code === "42P01" || /free_trial_lessons.*(does not exist|schema cache)/i.test(String(error?.message ?? ""));
}
