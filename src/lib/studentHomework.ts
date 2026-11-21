// One reading of a student's homework, shared by the dashboard and the
// homework page so both show the same list in the same order.
//
// Pure and dependency-free on purpose (no React, no `@/` imports): the node
// suite scripts/pgtest/student-homework.test.mjs loads this file as it is.

export interface HomeworkItem {
  id: string;
  title?: string | null;
  due_date?: string | null;
  submission?: { status?: string | null; submitted_at?: string | null; graded_at?: string | null } | null;
  [key: string]: any;
}

export interface HomeworkGroups {
  /** Past due, not older than 30 days. Most recently missed first. */
  late: HomeworkItem[];
  /** Past due by more than 30 days. Folded away so they do not bury this week. */
  oldMisses: HomeworkItem[];
  /** Not yet due or undated. Earliest deadline first, undated last. */
  next: HomeworkItem[];
  /** Submitted or graded. Most recent first. */
  done: HomeworkItem[];
}

/** Late homework older than this many days is an "old miss". */
export const OLD_MISS_DAYS = 30;

/** The one react-query key for this list. Other screens already use it with the same shape. */
export const studentHomeworkKey = (studentId: string | null | undefined) =>
  ["student-assignments", studentId] as const;

/** Minimal shape of the supabase client we need, so tests can pass a stub. */
export interface RpcClient {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }>;
}

/**
 * Reads the student's homework with its submissions merged in. Throws when the
 * request fails: an empty list must only ever mean "no homework".
 */
export async function fetchStudentHomework(client: RpcClient, studentId: string): Promise<HomeworkItem[]> {
  const { data, error } = await client.rpc("get_student_homeworks", { p_student_id: studentId });
  if (error) throw error instanceof Error ? error : new Error(error.message || "Could not load homework");
  const homeworks: any[] = data?.homeworks || [];
  const submissions: any[] = data?.submissions || [];
  const byHomework = new Map(submissions.map((s: any) => [s.homework_id, s]));
  return homeworks.map((hw: any) => ({ ...hw, submission: byHomework.get(hw.id) || null }));
}

/** Date-only strings are a local day (as dayjs reads them); anything else is parsed as given. */
function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const dueTime = (a: HomeworkItem): number => toDate(a.due_date)?.getTime() ?? Number.POSITIVE_INFINITY;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/** Stable tie-break so equal deadlines come out in the same order on every screen. */
const tieBreak = (a: HomeworkItem, b: HomeworkItem): number => {
  const t = String(a.title ?? "").localeCompare(String(b.title ?? ""), "en", { sensitivity: "base" });
  return t !== 0 ? t : String(a.id).localeCompare(String(b.id));
};

export function groupHomework(list: readonly HomeworkItem[], now: Date = new Date()): HomeworkGroups {
  const today = startOfDay(now);
  const oldCutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - OLD_MISS_DAYS).getTime();
  const late: HomeworkItem[] = [];
  const oldMisses: HomeworkItem[] = [];
  const next: HomeworkItem[] = [];
  const done: HomeworkItem[] = [];

  for (const a of list) {
    const st = a.submission?.status;
    if (st === "submitted" || st === "graded") {
      done.push(a);
      continue;
    }
    const due = toDate(a.due_date);
    const overdue = due !== null && startOfDay(due).getTime() < today.getTime();
    if (overdue) (dueTime(a) < oldCutoff ? oldMisses : late).push(a);
    else next.push(a);
  }

  late.sort((a, b) => dueTime(b) - dueTime(a) || tieBreak(a, b));
  oldMisses.sort((a, b) => dueTime(b) - dueTime(a) || tieBreak(a, b));
  next.sort((a, b) => {
    const da = dueTime(a);
    const db = dueTime(b);
    if (da === db) return tieBreak(a, b); // also covers two undated (Infinity - Infinity is NaN)
    return da < db ? -1 : 1;
  });
  done.sort((a, b) => {
    const ta = a.submission?.graded_at || a.submission?.submitted_at || a.due_date || "";
    const tb = b.submission?.graded_at || b.submission?.submitted_at || b.due_date || "";
    return tb.localeCompare(ta) || tieBreak(a, b);
  });
  return { late, oldMisses, next, done };
}

/** The first thing to do: the most recently missed late item, else the earliest coming up, else nothing. */
export function nextAction(groups: HomeworkGroups): HomeworkItem | null {
  return groups.late[0] ?? groups.next[0] ?? null;
}

/** Things to do now: late plus coming up. Old misses are not counted. */
export const todoCount = (groups: HomeworkGroups): number => groups.late.length + groups.next.length;
