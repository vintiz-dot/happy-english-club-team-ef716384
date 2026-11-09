/**
 * How each homework state LOOKS and READS to a young learner. Presentation
 * only: the state itself still comes from `getHomeworkStatus`.
 *
 * Words are short and say what to do next ("Do it now", "See feedback"),
 * one colour per state, used the same way on the card, the sheet and the
 * dashboard.
 */
import { dayjs } from "@/lib/date";
import type { HomeworkStatus } from "@/lib/homeworkStatus";

export interface HomeworkLook {
  emoji: string;
  pill: string;
  /** Pill colours. */
  pillClass: string;
  /** Card border + soft wash. */
  cardClass: string;
  /** The chunky main button: face colour + the darker "ledge" under it. */
  buttonClass: string;
  cta: string;
}

const chunky =
  "text-white font-extrabold tracking-wide shadow-[0_4px_0_0_var(--ledge)] active:translate-y-[3px] active:shadow-[0_1px_0_0_var(--ledge)] transition-[transform,box-shadow] duration-100";

export const homeworkLook: Record<HomeworkStatus, HomeworkLook> = {
  overdue: {
    emoji: "⏰",
    pill: "Late",
    pillClass: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
    cardClass: "border-rose-300 dark:border-rose-500/50 bg-rose-50/70 dark:bg-rose-500/[0.07]",
    buttonClass: `${chunky} bg-rose-500 hover:bg-rose-500/95 [--ledge:theme(colors.rose.700)]`,
    cta: "Do it now",
  },
  "due-today": {
    emoji: "🔥",
    pill: "Due today",
    pillClass: "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
    cardClass: "border-amber-300 dark:border-amber-500/50 bg-amber-50/70 dark:bg-amber-500/[0.07]",
    buttonClass: `${chunky} bg-amber-500 hover:bg-amber-500/95 [--ledge:theme(colors.amber.700)]`,
    cta: "Start",
  },
  "due-soon": {
    emoji: "⏳",
    pill: "Due soon",
    pillClass: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
    cardClass: "border-orange-200 dark:border-orange-500/40 bg-card",
    buttonClass: `${chunky} bg-violet-500 hover:bg-violet-500/95 [--ledge:theme(colors.violet.700)]`,
    cta: "Start",
  },
  upcoming: {
    emoji: "📝",
    pill: "To do",
    pillClass: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    cardClass: "border-border bg-card",
    buttonClass: `${chunky} bg-violet-500 hover:bg-violet-500/95 [--ledge:theme(colors.violet.700)]`,
    cta: "Start",
  },
  submitted: {
    emoji: "📬",
    pill: "Sent",
    pillClass: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
    cardClass: "border-sky-200 dark:border-sky-500/40 bg-card",
    buttonClass: `${chunky} bg-sky-500 hover:bg-sky-500/95 [--ledge:theme(colors.sky.700)]`,
    cta: "Open",
  },
  graded: {
    emoji: "🌟",
    pill: "Marked",
    pillClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    cardClass: "border-emerald-200 dark:border-emerald-500/40 bg-card",
    buttonClass: `${chunky} bg-emerald-500 hover:bg-emerald-500/95 [--ledge:theme(colors.emerald.700)]`,
    cta: "See feedback",
  },
};

/** The class chip gets a steady colour per class, so "Starters A" is always teal. */
const CLASS_TINTS = [
  "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-200",
  "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-200",
  "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-200",
  "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-200",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-200",
  "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-200",
];

export function classTint(name: string | null | undefined): string {
  const s = name || "";
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return CLASS_TINTS[h % CLASS_TINTS.length];
}

/**
 * "Due today", "Due tomorrow", "Due Fri 14 Nov", "2 days late". Days are
 * counted the same way `getHomeworkStatus` counts them (calendar days in the
 * device's time zone), so the words never disagree with the colour.
 */
/** "Sat 20 Dec", with the year added when it isn't this year (so last December doesn't read as next month). */
function shortDate(d: dayjs.Dayjs) {
  return d.format(d.year() === dayjs().year() ? "ddd D MMM" : "D MMM YYYY");
}

/**
 * The date line on a card. Finished work is listed newest-marked first, so it
 * says when it was marked or sent; work still to do says when it is due.
 */
export function dueText(
  dueDate: string | null | undefined,
  done: boolean,
  submission?: { status?: string | null; graded_at?: string | null; submitted_at?: string | null } | null,
): string | null {
  if (done && submission) {
    const when = (iso: string) => {
      const ago = dayjs().startOf("day").diff(dayjs(iso).startOf("day"), "day");
      return ago === 0 ? "today" : ago === 1 ? "yesterday" : shortDate(dayjs(iso));
    };
    if (submission.status === "graded" && submission.graded_at) return `Marked ${when(submission.graded_at)}`;
    if (submission.submitted_at) return `Sent ${when(submission.submitted_at)}`;
  }
  if (!dueDate) return null;
  const due = dayjs(dueDate).startOf("day");
  const days = due.diff(dayjs().startOf("day"), "day");
  if (done) return `Due ${shortDate(due)}`;
  if (days < -1) return `${-days} days late`;
  if (days === -1) return "1 day late";
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days < 7) return `Due ${due.format("dddd")}`;
  return `Due ${shortDate(due)}`;
}
