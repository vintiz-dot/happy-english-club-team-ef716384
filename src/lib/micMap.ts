// Mic map: who sits at which Lark mic (1-4). Pure; imports nothing.
// A seat row means "this child is at mic N from `at`"; the latest row per child
// at or before a moment wins. No row = unknown seat (the engine searches the class).

export const MICS = [1, 2, 3, 4] as const;
export type Mic = 1 | 2 | 3 | 4;
export interface SeatRow { student_id: string; mic: number; at: string }
export type Seating = Record<string, Mic | null>;

const isMic = (n: unknown): n is Mic => n === 1 || n === 2 || n === 3 || n === 4;

/** Where each child sits at `atMs` (default: the latest rows). Children without a row are absent from the result. */
export function seatsAt(rows: SeatRow[] | null | undefined, atMs: number = Number.POSITIVE_INFINITY): Record<string, Mic> {
  const best = new Map<string, { t: number; i: number; mic: Mic }>();
  (rows ?? []).forEach((r, i) => {
    const t = Date.parse(r.at);
    if (!isMic(r.mic) || !Number.isFinite(t) || t > atMs) return;
    const cur = best.get(r.student_id);
    if (!cur || t > cur.t || (t === cur.t && i > cur.i)) best.set(r.student_id, { t, i, mic: r.mic });
  });
  return Object.fromEntries([...best].map(([id, v]) => [id, v.mic]));
}

/** The starting board: each child's seat in the class's previous lesson, if they were there and are here now. */
export function prefill(childIds: string[], previousRows: SeatRow[] | null | undefined): Seating {
  const prev = seatsAt(previousRows);
  return Object.fromEntries(childIds.map((id) => [id, prev[id] ?? null]));
}

/** Children grouped by mic; `unseated` holds those with no mic. */
export function byMic(childIds: string[], seating: Seating): { mics: Record<Mic, string[]>; unseated: string[] } {
  const mics: Record<Mic, string[]> = { 1: [], 2: [], 3: [], 4: [] };
  const unseated: string[] = [];
  for (const id of childIds) { const m = seating[id]; if (m) mics[m].push(id); else unseated.push(id); }
  return { mics, unseated };
}

/** Rows to insert when the teacher confirms: one per seated child. */
export function confirmRows(sessionId: string, seating: Seating): { session_id: string; student_id: string; mic: Mic }[] {
  return Object.entries(seating).filter(([, m]) => !!m).map(([student_id, m]) => ({ session_id: sessionId, student_id, mic: m as Mic }));
}

/** Tap on a mic for a child: tapping the child's own mic again clears the seat. */
export function setSeat(seating: Seating, childId: string, mic: Mic): Seating {
  return { ...seating, [childId]: seating[childId] === mic ? null : mic };
}
