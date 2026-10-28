/**
 * The parts of the Stars sync that are decisions rather than I/O.
 *
 * Kept apart from the edge function, importing nothing, so that each can
 * be tested directly - scripts/pgtest/stars-sync-core.test.mjs. The
 * decisions about a child's record are not here; they are in the
 * database, in stars_sync_apply_page, where they run in one transaction.
 * What is here is everything around that: reading Pixel Pal's answer
 * without trusting it, comparing a secret without leaking it, and
 * deciding how much of the after-effects queue to drain in one run.
 */

/** Pixel Pal's export endpoint. A constant, not a setting: the request
 *  carries the shared secret, so wherever this points is where the
 *  secret goes. Changing it is a code change, and gets reviewed. */
export const PIXEL_PAL_EXPORT_URL =
  "https://jncqapcrqrtkqpdmfgma.supabase.co/functions/v1/export-events";

/** The names the shared secret may be stored under. The owner set it as
 *  "starpasscode"; secret stores differ on whether they keep case. */
export const FEED_SECRET_NAMES = ["STARPASSCODE", "starpasscode"] as const;

export function resolveFeedSecret(get: (name: string) => string | undefined): string | null {
  for (const name of FEED_SECRET_NAMES) {
    const value = get(name)?.trim();
    if (value) return value;
  }
  return null;
}

/**
 * Equal, in time that does not depend on where they differ.
 *
 * A plain === returns at the first differing character, which over enough
 * requests tells an attacker how much of a guess was right. This walks the
 * whole of the longer string either way. Length is not hidden - the token
 * is a fixed 64 characters, so its length is no secret.
 */
export function secretsMatch(given: string | null | undefined, expected: string | null | undefined): boolean {
  if (typeof given !== "string" || typeof expected !== "string" || expected.length === 0) return false;
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(expected);
  let diff = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export class FeedError extends Error {}

export interface FeedPage {
  events: Record<string, unknown>[];
  nextCursor: number;
}

/**
 * Pixel Pal's answer, checked before any of it reaches the database.
 *
 * Throws FeedError - whose message is shown to an admin, so it says what
 * was wrong in words and never echoes the payload, which is about
 * children.
 */
export function parseFeedPage(body: unknown, since: number): FeedPage {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new FeedError("Pixel Pal's answer was not the expected shape.");
  }
  const { events, next_cursor } = body as { events?: unknown; next_cursor?: unknown };
  if (!Array.isArray(events)) {
    throw new FeedError("Pixel Pal's answer had no list of events.");
  }
  if (typeof next_cursor !== "number" || !Number.isSafeInteger(next_cursor) || next_cursor < 0) {
    throw new FeedError("Pixel Pal's answer had no usable next_cursor.");
  }
  if (events.length > 0 && next_cursor <= since) {
    // Records came back but the cursor did not move: following it would
    // ask for the same page for ever.
    throw new FeedError(`Pixel Pal returned records but its cursor did not advance past ${since}.`);
  }
  if (events.some((e) => !e || typeof e !== "object" || Array.isArray(e))) {
    throw new FeedError("Pixel Pal's answer contained something that is not a record.");
  }
  return { events: events as Record<string, unknown>[], nextCursor: next_cursor };
}

/** One row of stars_sync_effects, as the drain reads it. */
export interface QueuedEffect {
  id: number;
  /** Times it has been tried and failed. Failing jobs go to the back. */
  attempts?: number | null;
  /** Bumped by each request for the same job; the drain deletes at the one it read. */
  generation?: number | null;
  kind: "tuition" | "streak";
  student_id: string;
  class_id?: string | null;
  session_id?: string | null;
  lesson_date?: string | null;
  month?: string | null;
}

export interface StreakBatch {
  /** Queue rows this batch settles, deleted only if it succeeds. */
  ids: number[];
  /** Each row's generation, in the same order as ids. */
  generations: number[];
  classId: string;
  /** The lesson, so a streak counts lessons rather than the days the queue was drained. */
  lessonDate: string | null;
  studentIds: string[];
}

export interface DrainPlan {
  /** One advanceStreaks call per lesson, earliest lesson first. */
  streaks: StreakBatch[];
  /** Tuition recalculations, oldest first, at most `tuitionLimit`. */
  tuition: { id: number; generation: number; studentId: string; month: string }[];
}

/**
 * What one run takes off the after-effects queue.
 *
 * The queue is written in the same transaction as each mark
 * (20261028090000), so nothing in it can be lost; this only decides how
 * much to do now. Tuition is bounded because calculate-tuition allows 30
 * calls a minute - whatever is not done stays queued for the next run,
 * five minutes later. Jobs that have failed before go behind ones that
 * have not, so a job that can never succeed cannot starve the rest.
 * Streak steps run in lesson order - each reads what the last one wrote,
 * so a child's backlog has to be worked through as it happened.
 * Malformed rows are skipped rather than guessed at.
 */
export function planDrain(raw: unknown, tuitionLimit: number): DrainPlan {
  const rows = Array.isArray(raw) ? (raw as QueuedEffect[]) : [];
  const lessons = new Map<string, StreakBatch>();
  const tuition: DrainPlan["tuition"] = [];
  const order = (r: QueuedEffect) => [Number(r?.attempts ?? 0), Number(r?.id)];
  const sorted = [...rows].sort((a, b) => {
    const [aa, ai] = order(a);
    const [ba, bi] = order(b);
    return aa - ba || ai - bi;
  });
  for (const r of sorted) {
    if (!r || typeof r.student_id !== "string" || !Number.isFinite(Number(r.id))) continue;
    if (r.kind === "streak") {
      if (typeof r.session_id !== "string" || typeof r.class_id !== "string") continue;
      const lessonDate = typeof r.lesson_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.lesson_date)
        ? r.lesson_date
        : null;
      const batch = lessons.get(r.session_id) ??
        { ids: [], generations: [], classId: r.class_id, lessonDate, studentIds: [] };
      batch.ids.push(Number(r.id));
      batch.generations.push(generationOf(r));
      batch.studentIds.push(r.student_id);
      lessons.set(r.session_id, batch);
    } else if (r.kind === "tuition") {
      if (typeof r.month !== "string" || !/^\d{4}-\d{2}$/.test(r.month)) continue;
      if (tuition.length < Math.max(0, tuitionLimit)) {
        tuition.push({ id: Number(r.id), generation: generationOf(r), studentId: r.student_id, month: r.month });
      }
    }
  }
  // Undated lessons last; ties keep queue order.
  const streaks = [...lessons.values()].sort((a, b) =>
    (a.lessonDate ?? "9999-99-99").localeCompare(b.lessonDate ?? "9999-99-99") || a.ids[0] - b.ids[0]);
  return { streaks, tuition };
}

const generationOf = (r: QueuedEffect) => {
  const g = Number(r.generation ?? 0);
  return Number.isInteger(g) ? g : 0;
};

/** Adds one tally of outcomes into another. */
export function addCounts(into: Record<string, number>, more: unknown): Record<string, number> {
  if (more && typeof more === "object" && !Array.isArray(more)) {
    for (const [k, v] of Object.entries(more as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) into[k] = (into[k] ?? 0) + v;
    }
  }
  return into;
}
