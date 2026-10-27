/**
 * The parts of the Stars sync that are decisions rather than I/O.
 *
 * Kept apart from the edge function, importing nothing, so that each can
 * be tested directly - scripts/pgtest/stars-sync-core.test.mjs. The
 * decisions about a child's record are not here; they are in the
 * database, in stars_sync_apply_page, where they run in one transaction.
 * What is here is everything around that: reading Pixel Pal's answer
 * without trusting it, comparing a secret without leaking it, and
 * working out which after-effects a page of marks actually needs.
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

/** One after-effect the database asked for, as stars_sync_apply_page returns it. */
export interface SyncEffect {
  type: "attendance" | "restore";
  session_id: string;
  student_id: string;
  class_id?: string;
  date?: string;
  status?: string;
  month?: string;
}

export interface AttendanceGroup {
  classId: string;
  date: string;
  entries: { studentId: string; status: string }[];
}

export interface EffectPlan {
  /** One call of afterAttendanceMarked per lesson, final marks only. */
  attendance: AttendanceGroup[];
  /** Tuition to recalculate for marks that were withdrawn. */
  tuition: { studentId: string; month: string }[];
}

/**
 * What to do after a page commits.
 *
 * The LAST effect for each child on each lesson wins. A page can carry a
 * mark, its withdrawal and a replacement for the same child, and running
 * the streak for a "Present" that was replaced by "Absent" two records
 * later would credit a child for a lesson they missed. HEC's own screen
 * cannot express that sequence in one save; a page of Pixel Pal records
 * can, so the page is reduced to where each child ended up.
 */
export function planEffects(raw: unknown): EffectPlan {
  const effects = Array.isArray(raw) ? (raw as SyncEffect[]) : [];
  const last = new Map<string, SyncEffect>();
  for (const e of effects) {
    if (!e || (e.type !== "attendance" && e.type !== "restore")) continue;
    if (typeof e.session_id !== "string" || typeof e.student_id !== "string") continue;
    const key = `${e.session_id}|${e.student_id}`;
    last.delete(key); // re-insert so iteration order follows the last write
    last.set(key, e);
  }

  const lessons = new Map<string, AttendanceGroup>();
  for (const e of last.values()) {
    if (e.type !== "attendance" || !e.class_id || !e.date || !e.status) continue;
    const group = lessons.get(e.session_id) ?? { classId: e.class_id, date: e.date, entries: [] };
    group.entries.push({ studentId: e.student_id, status: e.status });
    lessons.set(e.session_id, group);
  }

  // Every withdrawal changed a register, so its tuition is recalculated
  // even when a later mark in the page supersedes it: afterAttendanceMarked
  // only recalculates for Absent or Excused, and a withdrawn Absent
  // replaced by Present changes the bill too. Recalculating is idempotent;
  // skipping one is not.
  const tuition = new Map<string, { studentId: string; month: string }>();
  for (const e of effects) {
    if (e?.type === "restore" && typeof e.student_id === "string" && typeof e.month === "string") {
      tuition.set(`${e.student_id}|${e.month}`, { studentId: e.student_id, month: e.month });
    }
  }
  return { attendance: [...lessons.values()], tuition: [...tuition.values()] };
}

/** Adds one tally of outcomes into another. */
export function addCounts(into: Record<string, number>, more: unknown): Record<string, number> {
  if (more && typeof more === "object" && !Array.isArray(more)) {
    for (const [k, v] of Object.entries(more as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) into[k] = (into[k] ?? 0) + v;
    }
  }
  return into;
}
