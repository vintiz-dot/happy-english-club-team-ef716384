/**
 * What the server's board looks like, and how a screen reads it.
 *
 * Every number here was decided by `leaderboard_json`
 * (supabase/migrations/20261117120000_leaderboard_engine.sql): who is on
 * the board, the rank (ties share it), the categories, the level, the
 * climber and the streak. This file only renames and orders; it never
 * ranks, sums the ledger or prices a level. If a field is missing - an
 * older function, a family view - the screen shows less, it does not
 * work the figure out itself.
 *
 * Imports nothing, so the pgtest suite can load it as it is.
 */

export type ServerCategory = "homework" | "video" | "class" | "streak" | "vocabulary" | "reading";
export type BoardKey = "homework" | "video" | "participation" | "streak" | "reading_theory" | "vocabulary_quiz";
export type PeriodKind = "week" | "month" | "term" | "all";

export interface ServerLevel { level: number; from: number; next: number; progress: number; to_next: number }

export interface ServerRow {
  student_id: string;
  name: string;
  avatar_url?: string | null;
  rank: number;
  tied?: boolean;
  is_new?: boolean;
  is_self?: boolean;
  total: number;
  per_lesson?: number | string | null;
  gain_week?: number;
  categories?: Partial<Record<ServerCategory, number>>;
  category_ranks?: Partial<Record<ServerCategory, number>>;
  all_time?: number;
  level?: ServerLevel | null;
  /** Staff, and a family's own child, only. */
  lessons?: number;
  attended?: number;
  streak_now?: number;
  joined_on?: string;
  centre?: { rank: number; of: number } | null;
}

export interface ServerBoard {
  period: { kind: PeriodKind; from: string; to: string; label: string; term_id: string | null; basis: "total" | "per_lesson" };
  class_id: string;
  full?: boolean;
  rows: ServerRow[];
  champions: Array<{ category: ServerCategory; student_id: string; name: string; points: number }>;
  climber: { student_id: string; name: string; gain: number } | null;
  streak: { student_id: string; name: string; lessons: number } | null;
}

/** The server's category names against the board's (older) keys. */
export const BOARD_KEY_OF: Record<ServerCategory, BoardKey> = {
  homework: "homework",
  video: "video",
  class: "participation",
  streak: "streak",
  reading: "reading_theory",
  vocabulary: "vocabulary_quiz",
};
export const SERVER_KEY_OF: Record<BoardKey, ServerCategory> = {
  homework: "homework",
  video: "video",
  participation: "class",
  streak: "streak",
  reading_theory: "reading",
  vocabulary_quiz: "vocabulary",
};
export const SERVER_CATEGORIES: ServerCategory[] = ["homework", "video", "class", "streak", "reading", "vocabulary"];

const num = (v: unknown): number => {
  const n = typeof v === "string" ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
};

export const categoryPoints = (r: ServerRow, k: ServerCategory): number => num(r.categories?.[k]);
export const perLessonOf = (r: ServerRow): number => num(r.per_lesson);

/** True when the board ranks on points per lesson (term and all time). */
export const isPerLesson = (b: Pick<ServerBoard, "period"> | null | undefined): boolean =>
  b?.period?.basis === "per_lesson";

/**
 * The number a board shows beside a child: points per lesson on a
 * per-lesson board, the category's points on a category tab, else total.
 */
export function shownPoints(b: ServerBoard, r: ServerRow, active: ServerCategory | null): number {
  if (active) return categoryPoints(r, active);
  return isPerLesson(b) ? perLessonOf(r) : num(r.total);
}

/** The rank to show: the category's own when a tab is chosen. */
export function shownRank(r: ServerRow, active: ServerCategory | null): number {
  if (active) return num(r.category_ranks?.[active]) || num(r.rank);
  return num(r.rank);
}

/**
 * The rows in the order to draw them: by the server's rank for what is
 * shown, then by name. Sorting by a rank the server gave is not ranking.
 */
export function orderedRows(b: ServerBoard, active: ServerCategory | null): ServerRow[] {
  return [...(b.rows ?? [])].sort(
    (x, y) => shownRank(x, active) - shownRank(y, active) || x.name.localeCompare(y.name),
  );
}

/** Whether another child shares this child's shown rank. */
export function isTied(b: ServerBoard, r: ServerRow, active: ServerCategory | null): boolean {
  const mine = shownRank(r, active);
  return (b.rows ?? []).filter((x) => shownRank(x, active) === mine).length > 1;
}

/**
 * Points still needed to reach third place on what is shown; 0 when on
 * the podium. Arithmetic over the server's own figures, nothing more.
 */
export function toPodium(b: ServerBoard, r: ServerRow, active: ServerCategory | null): number {
  if (shownRank(r, active) <= 3) return 0;
  const third = (b.rows ?? []).filter((x) => shownRank(x, active) <= 3)
    .map((x) => shownPoints(b, x, active));
  if (!third.length) return 0;
  const bar = Math.min(...third);
  const gap = bar - shownPoints(b, r, active);
  // A per-lesson board moves in tenths.
  return isPerLesson(b) && !active ? Math.max(0, Math.round((gap + 0.1) * 10) / 10) : Math.max(0, Math.floor(gap) + 1);
}

/* ------------------------------------------------------------ periods */

/** Today in Hanoi (UTC+7, no daylight saving), as YYYY-MM-DD. */
export function hanoiToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July",
  "August", "September", "October", "November", "December"];
const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** The month containing `today` and the n-1 before it: { anchor: first day, label }. */
export function recentMonths(today: string, n = 6, short = false): Array<{ anchor: string; label: string }> {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7)) - 1;
  const out: Array<{ anchor: string; label: string }> = [];
  for (let i = 0; i < n; i += 1) {
    // Year/month arithmetic, never Date.setMonth on today: on the 31st
    // that skips a month and repeats another.
    const mm = ((m - i) % 12 + 12) % 12;
    const yy = y + Math.floor((m - i) / 12);
    out.push({ anchor: `${yy}-${String(mm + 1).padStart(2, "0")}-01`, label: `${(short ? SHORT : MONTHS)[mm]} ${yy}` });
  }
  return out;
}

/** This week (Monday) and the n-1 before it. */
export function recentWeeks(today: string, n = 8): Array<{ anchor: string; label: string }> {
  const d = new Date(today + "T00:00:00Z");
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  const out: Array<{ anchor: string; label: string }> = [];
  for (let i = 0; i < n; i += 1) {
    const iso = d.toISOString().slice(0, 10);
    const label = i === 0 ? "This week" : i === 1 ? "Last week"
      : `Week of ${d.getUTCDate()} ${SHORT[d.getUTCMonth()]}`;
    out.push({ anchor: iso, label });
    d.setUTCDate(d.getUTCDate() - 7);
  }
  return out;
}

/** The terms an admin set (school_terms), newest first, as picker options. */
export function termOptions(terms: Array<{ id: string; name: string; starts_on: string; ends_on: string }>, today: string) {
  return [...terms]
    .filter((t) => t.starts_on <= today)
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))
    .map((t) => ({ anchor: t.starts_on, label: t.name }));
}

export interface PeriodChoice { kind: PeriodKind; anchor: string | null }

/** A stable cache key for a period. */
export const periodKey = (p: PeriodChoice) => `${p.kind}:${p.anchor ?? "now"}`;

/** The month board's `month` ("2026-10") for an older class-leaderboard. */
export const legacyMonthOf = (p: PeriodChoice, today: string): string | null =>
  p.kind === "month" ? (p.anchor ?? today).slice(0, 7) : null;

/* ------------------------------------------- an older class-leaderboard */

export interface LegacyEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  participation_points: number;
  homework_points: number;
  reading_theory_points?: number;
  vocabulary_quiz_points?: number;
  total_points: number;
  is_current_user: boolean;
  rank: number;
}

/**
 * The month board from a class-leaderboard that predates the engine (or
 * runs before the migration is pasted). It already ranked the rows; this
 * only reshapes them. No category ranks, no level: the screen shows less.
 */
export function legacyToBoard(entries: LegacyEntry[], classId: string, month: string): ServerBoard {
  return {
    period: { kind: "month", from: `${month}-01`, to: `${month}-28`, label: month, term_id: null, basis: "total" },
    class_id: classId,
    full: false,
    rows: (entries ?? []).map((e) => ({
      student_id: e.student_id,
      name: e.student_name,
      avatar_url: e.avatar_url,
      rank: e.rank,
      is_self: e.is_current_user,
      total: Number(e.total_points) || 0,
      categories: {
        homework: Number(e.homework_points) || 0,
        class: Number(e.participation_points) || 0,
        reading: Number(e.reading_theory_points) || 0,
        vocabulary: Number(e.vocabulary_quiz_points) || 0,
      },
      level: null,
    })),
    champions: [],
    climber: null,
    streak: null,
  };
}

/** PostgREST's answer when a function is not in the database yet. */
export const isMissingFunction = (e: { code?: string; message?: string } | null | undefined) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || /could not find the function/i.test(e.message ?? ""));
