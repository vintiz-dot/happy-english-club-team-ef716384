/**
 * Who said each line of a lesson report (owner, 24 Nov 2026; design Option B).
 *
 * The overnight job (scripts/lesson-monitor/voice.py) adds to each line:
 *   "m": the child the teacher TAPPED as speaking then (speaking board),
 *   "g": the voice group the line belongs to (G1, G2, ...),
 * and to the report "voice.groups": each group's seconds and, sometimes, a
 * suggestion from the children's voiceprints. The teacher's answers live in
 * lesson_monitor_voice_groups (20261124120000). This file only combines the
 * two; it decides nothing. A suggestion is shown as a question until the
 * teacher answers it. Kept apart from lessonMonitor.ts, whose mapping names
 * nobody (Option A).
 *
 * Pure: no imports.
 */

export type VoiceAnswer = "child" | "several" | "teacher" | "unknown";

export interface GroupRow {
  group_key: string;
  seconds: number;
  line_count: number;
  suggested_student: string | null;
  suggested_score: number | null;
  answer: VoiceAnswer | null;
  student_id: string | null;
}

export interface LineVoice { tapped: string | null; group: string | null }

export type SpeakerKind = "teacher" | "named" | "tapped" | "suggested" | "several" | null;
export interface Speaker { kind: SpeakerKind; label: string }

export const VOICE_WORDING = {
  intro: "The computer grouped the children's lines by voice. Name a group once and every line in it carries the name. Your answers also teach the laptop each child's voice (only children whose parents agreed to voiceprints).",
  suggestion: (name: string) => `Sounds like ${name}?`,
  notSure: "The computer is not sure whose voice this is.",
  several: "Several voices",
  teacher: "Me (the teacher)",
  unknown: "Don't know",
  tapped: "You tapped this child on \"Who's speaking\".",
  groupMayMix: "A group can hold more than one child when children talk over each other: listen before you name it.",
  seatedAt: (mic: string) => `On the mic board at ${mic}:`,
  someoneElse: "Someone else…",
  voiceCard: "Voice card: the child you tapped read and answered at their mic.",
} as const;

/** What the Lark engine says about a group (owner, 28 Nov 2026): its mic, the children the mic board seated there
 * (offered first as the answer: a HINT, never a name), and whether it is a voice-card (enrolment) group. */
export interface GroupHint { mic: string | null; seated: string[]; enrol: boolean }

const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const id = (v: unknown): string | null => (typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v) ? v : null);
const key = (v: unknown): string | null => (typeof v === "string" && /^G[0-9]{1,3}$/.test(v) ? v : null);

/** One entry per line, in the same order and with the same filter as toReportView's lines. */
export function lineVoices(body: unknown): LineVoice[] {
  return arr(obj(body).lines).flatMap((x) => {
    const l = obj(x);
    const ok = typeof l.t === "number" && Number.isFinite(l.t) && typeof l.text === "string" && l.text !== "";
    return ok ? [{ tapped: id(l.m), group: key(l.g) }] : [];
  });
}

/** The Lark engine's hints per group key, from body.voice.groups[].mic / seated / enrol. Older reports: empty. */
export function groupHints(body: unknown): Map<string, GroupHint> {
  const out = new Map<string, GroupHint>();
  for (const x of arr(obj(obj(body).voice).groups)) {
    const g = obj(x);
    const k = key(g.key);
    if (!k) continue;
    const mic = typeof g.mic === "string" && /^mic[1-4]$/.test(g.mic) ? `mic ${g.mic.slice(3)}` : null;
    const seated = arr(g.seated).map(id).filter((v): v is string => v !== null);
    if (mic || seated.length || g.enrol === true) out.set(k, { mic, seated, enrol: g.enrol === true });
  }
  return out;
}

/** Whether the report carries the voice step at all (older reports and a skipped step do not). */
export function hasVoices(body: unknown): boolean {
  return arr(obj(obj(body).voice).groups).length > 0;
}

/** What a line shows as its speaker: the teacher's answer first, then the tap, then a suggestion. */
export function speakerOf(v: LineVoice, teacherMic: boolean, rows: Map<string, GroupRow>, nameOf: (id: string) => string): Speaker {
  const g = v.group ? rows.get(v.group) : undefined;
  if (g?.answer === "child" && g.student_id) return { kind: "named", label: nameOf(g.student_id) };
  if (g?.answer === "teacher" || teacherMic) return { kind: "teacher", label: "T" };
  if (v.tapped) return { kind: "tapped", label: nameOf(v.tapped) };
  if (g?.answer === "several") return { kind: "several", label: VOICE_WORDING.several.toLowerCase() };
  if (g && !g.answer && g.suggested_student) return { kind: "suggested", label: `${nameOf(g.suggested_student)}?` };
  return { kind: null, label: "" };
}

/** The groups to name: unanswered first, longest first (the most voice for one answer). */
export function groupsToName(rows: GroupRow[]): GroupRow[] {
  return [...rows].sort((a, b) => Number(a.answer !== null) - Number(b.answer !== null) || b.seconds - a.seconds
    || Number(a.group_key.slice(1)) - Number(b.group_key.slice(1)));
}

/** Line indexes of one group, for playing a few of them. */
export function linesOf(voices: LineVoice[], group: string, max = 3): number[] {
  const out: number[] = [];
  voices.forEach((v, i) => { if (v.group === group && out.length < max) out.push(i); });
  return out;
}

/** The child most tapped inside a group: a hint the screen may show next to the computer's suggestion. */
export function tappedIn(voices: LineVoice[], group: string): string | null {
  const n = new Map<string, number>();
  for (const v of voices) if (v.group === group && v.tapped) n.set(v.tapped, (n.get(v.tapped) ?? 0) + 1);
  let best: string | null = null, most = 0;
  for (const [k, c] of n) if (c > most) { best = k; most = c; }
  return best;
}
