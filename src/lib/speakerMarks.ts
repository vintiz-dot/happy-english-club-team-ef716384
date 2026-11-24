/**
 * Who's speaking: the pure part. A mark says who speaks FROM that moment on;
 * the screen's "active" tiles are just the latest mark read back.
 * Teacher and chorus are exclusive tiles; children can be several at once.
 */
export type SpeakerKind = "student" | "teacher" | "chorus" | "stop";
export interface SpeakerState { kind: SpeakerKind; studentIds: string[] }
export const NOBODY: SpeakerState = { kind: "stop", studentIds: [] };

export function stateOf(latest: { kind: SpeakerKind; student_ids: string[] | null } | null | undefined): SpeakerState {
  if (!latest) return NOBODY;
  return { kind: latest.kind, studentIds: latest.kind === "student" ? [...(latest.student_ids ?? [])] : [] };
}

/** What tapping a tile makes the next mark. */
export function tap(cur: SpeakerState, tile: { kind: "teacher" | "chorus" } | { kind: "student"; id: string }): SpeakerState {
  if (tile.kind !== "student") return cur.kind === tile.kind ? NOBODY : { kind: tile.kind, studentIds: [] };
  const ids = cur.kind === "student" ? cur.studentIds : [];
  const next = ids.includes(tile.id) ? ids.filter((x) => x !== tile.id) : [...ids, tile.id];
  return next.length ? { kind: "student", studentIds: next } : NOBODY;
}

/**
 * 24 Nov 2026 (owner: tapping on and off was tedious). A plain tap on a child
 * is "now THIS child speaks": it replaces whoever was marked, so the next
 * child's tap ends the last one's turn and nobody needs tapping off. The
 * teacher's own turns come from their microphone overnight, and a child's
 * turn ends there on its own when the teacher speaks. Tapping the one child
 * who is speaking stops them. A long press adds a child to whoever is
 * speaking: a conversation (`tap`).
 */
export function tapOne(cur: SpeakerState, tile: { kind: "teacher" | "chorus" } | { kind: "student"; id: string }): SpeakerState {
  if (tile.kind !== "student") return tap(cur, tile);
  const ids = cur.kind === "student" ? cur.studentIds : [];
  if (ids.includes(tile.id)) {
    const rest = ids.filter((x) => x !== tile.id);
    return rest.length ? { kind: "student", studentIds: rest } : NOBODY;
  }
  return { kind: "student", studentIds: [tile.id] };
}

/** "1:05:09" / "4:07" into the recording. */
export function offsetLabel(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms)) return "";
  const t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${p(m)}:${p(s)}` : `${m}:${p(s)}`;
}

/**
 * 23 Nov 2026 (owner): two or more children speaking at once is a
 * conversation / dialogue. A mark already holds everyone speaking from that
 * moment, so this is read from the mark, never stored twice.
 */
export function isConversation(s: { kind: SpeakerKind; studentIds?: string[]; student_ids?: string[] | null }): boolean {
  const ids = s.studentIds ?? s.student_ids ?? [];
  return s.kind === "student" && ids.length >= 2;
}

/** How the board names what is going on now. */
export function speakingLabel(s: SpeakerState, nameOf: (id: string) => string): string {
  if (s.kind === "teacher") return "Teacher speaking";
  if (s.kind === "chorus") return "Everyone (chorus)";
  if (s.kind === "stop" || !s.studentIds.length) return "Nobody marked";
  const names = s.studentIds.map(nameOf).join(" + ");
  return isConversation(s) ? `Conversation: ${names}` : `${names} speaking`;
}

/**
 * The children to show: those marked Present or Late at this lesson. With no
 * register read (not marked yet, or not readable), everyone enrolled.
 */
export function presentChildren<K extends { student_id: string }>(roster: K[], register: { student_id: string; status: string }[] | null | undefined): K[] {
  if (!register || !register.length) return roster;
  const here = new Set(register.filter((r) => /^(present|late)$/i.test(r.status)).map((r) => r.student_id));
  return roster.filter((k) => here.has(k.student_id));
}
