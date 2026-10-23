/**
 * THIS IS THE DENO COPY, and currently the only one with a caller. The
 * original is src/lib/payrollSessions.ts; everything below this header
 * is byte-identical to it. Deno cannot import from src/, so the
 * duplication is the price of sharing the rule at all. Change one, copy
 * it to the other - scripts/pgtest/mirrors.test.mjs fails if you do not.
 *
 * Which lessons does this person get paid for?
 *
 * Pay used to be worked out twice, from the same tables, by different
 * code: this function and the admin Payroll screen. They drifted three
 * times, most recently when the attendance filter added here never
 * reached the screen's own query and it went on paying assistants for
 * lessons they had missed. The screen now reads this function instead of
 * recomputing, so this module is the only place the question is
 * answered - and the src copy stands ready for whatever in the browser
 * needs it next, rather than that code restating the rule.
 */

/** A lesson that happened. What someone is actually owed for. */
export const ACTUAL_SESSION_STATUSES = ["Held"] as const;

/**
 * A lesson that happened or is still going to. What the month will cost
 * if nothing else changes. Cancellations are in neither.
 */
export const PROJECTED_SESSION_STATUSES = ["Held", "Scheduled"] as const;

/** The participant_type that means "an assistant on this lesson". */
export const ASSISTANT_PARTICIPANT_TYPE = "teaching_assistant";

export interface SessionLike {
  status?: string | null;
}

export function isActualSession(session: SessionLike | null | undefined): boolean {
  const statuses: readonly string[] = ACTUAL_SESSION_STATUSES;
  return statuses.includes(session?.status ?? "");
}

export function isProjectedSession(session: SessionLike | null | undefined): boolean {
  const statuses: readonly string[] = PROJECTED_SESSION_STATUSES;
  return statuses.includes(session?.status ?? "");
}

/**
 * Every set either caller needs, in one pass.
 *
 *   actual     lessons that happened - what someone is owed now
 *   pending    lessons still to come - what is not owed yet
 *   projected  both together - what the month will come to
 *
 * All three exist because the two callers want different pairs of them:
 * calculate-payroll reports actual against projected, the admin screen
 * reports actual against pending and adds them up. Deriving the third
 * at each call site is exactly how these two drifted before.
 *
 * Cancellations are in none of them.
 */
export function splitByStatus<T extends SessionLike>(
  sessions: readonly T[] | null | undefined,
): { actual: T[]; pending: T[]; projected: T[] } {
  const actual: T[] = [];
  const pending: T[] = [];
  const projected: T[] = [];
  for (const session of sessions ?? []) {
    if (!isProjectedSession(session)) continue;
    projected.push(session);
    if (isActualSession(session)) actual.push(session);
    else pending.push(session);
  }
  return { actual, pending, projected };
}

export interface AssistantParticipation {
  session_id?: string | null;
  teaching_assistant_id?: string | null;
  participant_type?: string | null;
  /** False when they were rostered for the lesson but did not work it. */
  attended?: boolean | null;
}

/**
 * Does this roster row earn money?
 *
 * `attended` is NOT NULL DEFAULT true in the database (20261022090000),
 * so only an explicit false is an absence. Anything else - including a
 * row read back before the column existed, or a column a client forgot
 * to select - counts as present, because the alternative is silently
 * withholding pay from everybody the moment a query is written slightly
 * differently.
 */
export function participationIsPayable(
  participation: AssistantParticipation | null | undefined,
): boolean {
  if (!participation) return false;
  if (!participation.session_id || !participation.teaching_assistant_id) return false;
  if (participation.participant_type !== ASSISTANT_PARTICIPANT_TYPE) return false;
  return participation.attended !== false;
}

/**
 * assistant id -> the lessons they are paid for, de-duplicated.
 *
 * De-duplicated because a lesson can carry more than one roster row for
 * the same assistant, and counting those twice would pay them twice.
 */
export function payableSessionIdsByAssistant(
  participations: readonly AssistantParticipation[] | null | undefined,
): Map<string, string[]> {
  const seen = new Map<string, Set<string>>();
  for (const participation of participations ?? []) {
    if (!participationIsPayable(participation)) continue;
    const assistantId = participation.teaching_assistant_id as string;
    const sessionId = participation.session_id as string;
    const ids = seen.get(assistantId) ?? new Set<string>();
    ids.add(sessionId);
    seen.set(assistantId, ids);
  }
  const out = new Map<string, string[]>();
  for (const [assistantId, ids] of seen) out.set(assistantId, [...ids]);
  return out;
}
