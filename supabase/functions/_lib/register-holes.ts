/**
 * _lib/register-holes.ts - a lesson that happened, that the child was enrolled
 * for, and that has NO attendance row. Pure; imports nothing.
 *
 * Tuition bills a lesson only when the child has a Present / Absent / Late row
 * for it (_lib/tuition-session.ts). A lesson with no row at all is never a
 * decision anybody made: seeding gives every enrolled child a Present
 * placeholder and an excused child has an Excused row. So a missing row is a
 * hole in the register (an old class-transfer function deleted March-August
 * marks of one child), and a hole must never lower a bill that is already
 * saved. calculate-tuition and calculate-tuition-bulk both use this.
 *
 * The enrolment rule is NOT restated here: the caller passes in the resolver it
 * already prices with (enrollmentOn over the creation-ordered rows, the
 * weekday test, the rate), so a hole is judged by exactly the rule a charged
 * lesson passes.
 */

export interface HoleSession {
  id: string;
  date: string; // YYYY-MM-DD
  status: string;
  class_id: string;
}

export interface Hole {
  session_id: string;
  date: string;
  class_id: string;
}

export interface HoleRules<S extends HoleSession, E> {
  /** The enrolment a lesson is billed under (enrollmentOn), or undefined when the child was not enrolled that day. */
  enrollmentFor: (session: S) => E | undefined;
  /** Is the lesson on a weekday the child attends (allowed_days)? */
  onAllowedDay: (session: S, enrollment: E) => boolean;
  /** The rate the lesson would be priced at for this enrolment. */
  rateOf: (session: S, enrollment: E) => number;
}

/** Today's date in Hanoi (UTC+7, no daylight saving), YYYY-MM-DD. */
export function hanoiToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/**
 * The holes among `sessions`: Held, dated before `today`, enrolled that day on
 * an allowed weekday with a rate above 0, and no attendance row of any status.
 * A Scheduled or Canceled lesson, one dated today or later, and one outside the
 * enrolment are never holes.
 */
export function findRegisterHoles<S extends HoleSession, E>(
  sessions: S[],
  attendance: { has(sessionId: string): boolean },
  today: string,
  rules: HoleRules<S, E>,
): Hole[] {
  const holes: Hole[] = [];
  for (const s of sessions) {
    if (s.status !== "Held") continue;
    if (!(s.date < today)) continue;
    if (attendance.has(s.id)) continue;
    const enrollment = rules.enrollmentFor(s);
    if (!enrollment) continue;
    if (!rules.onAllowedDay(s, enrollment)) continue;
    if (!(rules.rateOf(s, enrollment) > 0)) continue;
    holes.push({ session_id: s.id, date: s.date, class_id: s.class_id });
  }
  return holes.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.session_id < b.session_id ? -1 : 1));
}

/**
 * What a month with holes does to its bill: "a lesson with no mark is priced as
 * it was charged, never beyond the saved bill". Two bases come from the normal
 * pricing loop: N (today's rule, holes not billed) and W (holes counted as
 * billable lessons at their normal rate).
 *
 *   normal             no holes, no saved bill, a frozen bill, or N is not below
 *                      the saved base: save as always (holes, if any, are flagged);
 *   priced_as_charged  N is below the saved base but W is not above it: price the
 *                      month WITH the holes, so the bill moves only by a real change
 *                      (a lesson since cancelled or excused); a force is ignored;
 *   forced             N < saved < W and an admin forced it: save N;
 *   held               N < saved < W: some deleted marks must have been Excused and
 *                      nobody can tell which, so the saved figures stand.
 */
export type HoleMode = "normal" | "forced" | "priced_as_charged" | "held";

export function decideHoles(opts: {
  holeCount: number;
  savedBase: number | null; // null when there is no saved bill
  frozen: boolean;
  nBase: number;
  wBase: number | null; // null when it was not needed (see above)
  forced: boolean;
}): HoleMode {
  if (opts.holeCount === 0 || opts.savedBase === null || opts.frozen || opts.nBase >= opts.savedBase) return "normal";
  // Priced as charged wins over a force: there is no lower figure to force.
  if (opts.wBase !== null && opts.wBase <= opts.savedBase) return "priced_as_charged";
  return opts.forced ? "forced" : "held";
}

export const REGISTER_MISSING_MARKS = "register_missing_marks";
export const LOWERED_DESPITE_MISSING_MARKS = "lowered_despite_missing_marks";

/** The review flag that records the holes found for a bill. */
export function missingMarksFlag(
  holes: Hole[],
  savedBase: number | null,
  registerBase: number,
  mode: HoleMode = "normal",
) {
  return {
    type: REGISTER_MISSING_MARKS,
    label: `${holes.length} ${holes.length === 1 ? "lesson has" : "lessons have"} no mark in the register`,
    details: { count: holes.length, dates: holes.map((h) => h.date), savedBase, registerBase, mode },
  };
}

/** The flag left behind when an admin saves the lower figure anyway. */
export function loweredDespiteFlag(opts: {
  savedBase: number;
  newBase: number;
  count: number;
  actorUserId: string | null;
  actorEmail: string | null;
  reason: string;
  at: string;
}) {
  return {
    type: LOWERED_DESPITE_MISSING_MARKS,
    label: "Saved lower although lessons had no mark",
    details: {
      savedBase: opts.savedBase,
      newBase: opts.newBase,
      count: opts.count,
      actor: opts.actorUserId,
      actorEmail: opts.actorEmail,
      reason: opts.reason,
      at: opts.at,
    },
  };
}

/** The sentence a person reads when a bill is held. */
export function heldSentence(count: number, month: string): string {
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const m = Number(month.slice(5, 7));
  const label = names[m - 1] ?? month;
  return `Held: ${count} ${count === 1 ? "lesson" : "lessons"} in ${label} ${count === 1 ? "has" : "have"} no mark. The bill stays as charged until the register is fixed.`;
}

function canon(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])]));
  }
  return v;
}

/**
 * Do two flag lists say the same thing? Key order does not matter (the database
 * returns json keys in its own order), so a save that would only reorder keys
 * is not a change.
 */
export function sameFlags(a: unknown, b: unknown): boolean {
  const x = Array.isArray(a) ? a : [];
  const y = Array.isArray(b) ? b : [];
  return JSON.stringify(canon(x)) === JSON.stringify(canon(y));
}
