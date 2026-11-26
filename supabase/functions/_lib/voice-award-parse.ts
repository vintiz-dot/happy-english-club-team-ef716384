/**
 * _lib/voice-award-parse.ts - the pure part of the `voice-award` function
 * (owner, 27 Nov 2026): the prompt Gemini is given, the JSON shape it must
 * answer in, and the SERVER-SIDE CHECK of that answer.
 *
 * Gemini is asked what was said; it is never trusted with who. It answers a
 * roster INDEX, and this module decides whether the spoken name really belongs
 * to that child (and to nobody else in the room) before anything may be
 * called "high" confidence. "High" is the only thing that saves by itself, so
 * it is deliberately hard to get.
 *
 * Imports nothing (the contract's constants are restated below; the suite
 * checks they equal src/lib/voiceAward/types.ts).
 */

export const MAX_POINTS = 100;
export const SKILLS = ["speaking", "listening", "reading", "writing", "focus", "teamwork"] as const;
export type Skill = (typeof SKILLS)[number];
export type Intent = "award" | "confirm" | "cancel" | "undo" | "none";

/** A child marked Present or Late in the lesson running now. */
export interface RosterEntry {
  id: string;
  fullName: string;
  /** Optional short name / nickname if the database ever holds one. */
  nickname?: string | null;
}

export interface VoiceParse {
  intent: Intent;
  studentId: string | null;
  studentName: string | null;
  points: number | null;
  skill: Skill | null;
  heard: string;
  confidence: "high" | "low";
  reason: string | null;
}

/** What Gemini answers (see GEMINI_RESPONSE_SCHEMA). */
export interface GeminiAnswer {
  intent?: unknown;
  student_index?: unknown;
  name_heard?: unknown;
  points?: unknown;
  skill?: unknown;
  heard?: unknown;
  confidence?: unknown;
}

// ---------------------------------------------------------------- names

/** Lower-case, no Vietnamese diacritics, letters and digits only, single spaces. */
export function normalizeName(s: string): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

/** 1 = identical, 0 = nothing alike. Short names (3 letters or fewer) must be exact. */
export function nameSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (Math.min(a.length, b.length) <= 3) return 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/** A spoken name counts as a match from this similarity up. */
export const NAME_MATCH_MIN = 0.78;
/** Another child scoring within this much of the chosen one makes the name ambiguous. */
export const NAME_AMBIGUITY_GAP = 0.1;

/** Every way a child may be called: the whole name, each word, each pair of neighbouring words, the nickname. */
export function nameForms(e: RosterEntry): string[] {
  const out = new Set<string>();
  const add = (s: string) => {
    const n = normalizeName(s);
    if (n) out.add(n);
  };
  add(e.fullName);
  if (e.nickname) add(e.nickname);
  const words = normalizeName(e.fullName).split(" ").filter(Boolean);
  for (const w of words) add(w);
  for (let i = 0; i + 1 < words.length; i++) add(`${words[i]} ${words[i + 1]}`);
  if (words.length > 2) add(`${words[0]} ${words[words.length - 1]}`);
  return [...out];
}

/** How well the spoken name fits this child (0..1). */
export function matchScore(heardName: string, e: RosterEntry): number {
  const h = normalizeName(heardName);
  if (!h) return 0;
  let best = 0;
  for (const f of nameForms(e)) best = Math.max(best, nameSimilarity(h, f));
  return best;
}

// --------------------------------------------------------------- skills

const SKILL_WORDS: Record<string, Skill> = {
  speaking: "speaking", speak: "speaking", talk: "speaking", talking: "speaking", spoken: "speaking",
  pronunciation: "speaking", conversation: "speaking",
  listening: "listening", listen: "listening", listened: "listening",
  reading: "reading", read: "reading",
  writing: "writing", write: "writing", handwriting: "writing", spelling: "writing", essay: "writing",
  focus: "focus", behaviour: "focus", behavior: "focus", quiet: "focus", attention: "focus",
  concentration: "focus", discipline: "focus",
  teamwork: "teamwork", team: "teamwork", "group work": "teamwork", groupwork: "teamwork",
  group: "teamwork", helping: "teamwork", sharing: "teamwork", cooperation: "teamwork",
};

export function normalizeSkill(v: unknown): Skill | null {
  if (typeof v !== "string") return null;
  const k = v.toLowerCase().trim().replace(/[^a-z ]+/g, "");
  if (!k || k === "none" || k === "null") return null;
  return SKILL_WORDS[k] ?? null;
}

// --------------------------------------------------------------- prompt

/** The roster as Gemini sees it: numbered from 1, no ids. */
export function rosterLines(roster: RosterEntry[]): string {
  return roster
    .map((e, i) => {
      const words = e.fullName.trim().split(/\s+/);
      const first = words[0] ?? "";
      const last = words.length > 1 ? words[words.length - 1] : "";
      const parts = [`${i + 1}. ${e.fullName.trim()}`];
      if (words.length > 1) parts.push(`first word: ${first}`, `last word (usual Vietnamese given name): ${last}`);
      if (e.nickname) parts.push(`nickname: ${e.nickname}`);
      return parts.join(" | ");
    })
    .join("\n");
}

export function buildPrompt(roster: RosterEntry[]): string {
  return [
    "You listen to a short audio clip from an English classroom in Hanoi. A teacher has just said the wake word \"HEC\" and then a command about class points.",
    "The teacher speaks English, often with a Vietnamese accent. Children's names are Vietnamese (e.g. Minh Anh, Bao, Khoa) or English nicknames (e.g. Potato, Bella, Tom). A Vietnamese name may be said by its last word or by its full name.",
    "",
    "Children in the room now (answer with the NUMBER, never invent a child):",
    rosterLines(roster),
    "",
    "Return JSON only, with these fields:",
    "- heard: exactly what you heard, as text, WITHOUT the wake word. Do not clean it up.",
    "- intent: \"award\" (add or take away points), \"confirm\" (yes / ok / confirm / do it), \"cancel\" (cancel / no / stop / never mind), \"undo\" (undo / take that back / remove the last one), or \"none\" (silence, noise, or nothing about points).",
    "- student_index: the number of the child named, or null if no child in the list was named or you are not sure.",
    "- name_heard: the name as spoken, as you heard it, or null.",
    "- points: a whole number. \"add / give / plus / award / gain\" is positive. \"take away / minus / remove / subtract / lose / deduct\" is negative. \"stars\", \"points\", \"star points\" all mean the same thing. \"a star\" or \"one star\" is 1. null if no number was said.",
    "- skill: one of speaking, listening, reading, writing, focus, teamwork, or null if none was named. Map: talk / speak / pronunciation -> speaking; listen -> listening; read -> reading; write / handwriting / spelling -> writing; behaviour / quiet / attention -> focus; group work / helping / sharing -> teamwork. Anything else (for example \"for being kind\") -> null.",
    "- confidence: \"high\" only if you clearly heard the intent, the name AND the number; otherwise \"low\".",
    "",
    "Examples: \"add 30 stars to Potato for writing\" -> award, points 30, skill writing. \"take away 10 points from Bao\" -> award, points -10. \"yes\" -> confirm. \"undo\" -> undo.",
    "Never guess a child's number from a name that is not in the list.",
  ].join("\n");
}

/** responseSchema for generateContent (OpenAPI subset Gemini accepts). */
export const GEMINI_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    heard: { type: "STRING" },
    intent: { type: "STRING", enum: ["award", "confirm", "cancel", "undo", "none"] },
    student_index: { type: "INTEGER", nullable: true },
    name_heard: { type: "STRING", nullable: true },
    points: { type: "NUMBER", nullable: true },
    skill: { type: "STRING", enum: [...SKILLS], nullable: true },
    confidence: { type: "STRING", enum: ["high", "low"] },
  },
  required: ["heard", "intent", "confidence"],
} as const;

// ---------------------------------------------------------------- check

const INTENTS: Intent[] = ["award", "confirm", "cancel", "undo", "none"];

function low(
  base: Omit<VoiceParse, "confidence" | "reason">,
  reason: string,
): VoiceParse {
  return { ...base, confidence: "low", reason };
}

/**
 * Gemini's answer (a JSON string or an object) against the roster.
 * Never throws: anything unreadable is intent "none", low.
 */
export function checkAnswer(raw: unknown, roster: RosterEntry[]): VoiceParse {
  let a: GeminiAnswer | null = null;
  if (typeof raw === "string") {
    try {
      a = JSON.parse(raw);
    } catch {
      a = null;
    }
  } else if (raw && typeof raw === "object") {
    a = raw as GeminiAnswer;
  }
  if (!a || typeof a !== "object") {
    return {
      intent: "none", studentId: null, studentName: null, points: null, skill: null,
      heard: "", confidence: "low", reason: "I could not understand that. Please say it again.",
    };
  }

  const heard = typeof a.heard === "string" ? a.heard.trim().slice(0, 300) : "";
  const intent: Intent = INTENTS.includes(a.intent as Intent) ? (a.intent as Intent) : "none";
  const gemHigh = a.confidence === "high";

  if (intent === "none") {
    return {
      intent, studentId: null, studentName: null, points: null, skill: null, heard,
      confidence: "low", reason: "I did not hear a points command.",
    };
  }
  if (intent !== "award") {
    return {
      intent, studentId: null, studentName: null, points: null, skill: null, heard,
      confidence: gemHigh ? "high" : "low", reason: gemHigh ? null : `I am not sure you said "${intent}".`,
    };
  }

  // ---- award
  const skill = normalizeSkill(a.skill);
  const nameHeard = typeof a.name_heard === "string" ? a.name_heard.trim() : "";
  const spoken = nameHeard || "that name";

  // Child: Gemini's index, 1-based, inside the roster or nobody.
  let student: RosterEntry | null = null;
  const idx = typeof a.student_index === "number" && Number.isInteger(a.student_index) ? a.student_index : null;
  if (idx !== null && idx >= 1 && idx <= roster.length) student = roster[idx - 1];

  // Points: a whole number, not 0, not past the cap. Nothing is clamped.
  const rawPoints = typeof a.points === "number" && Number.isFinite(a.points) ? a.points : null;
  let points: number | null = rawPoints;
  let pointsReason: string | null = null;
  if (rawPoints === null) pointsReason = "I did not hear how many points.";
  else if (!Number.isInteger(rawPoints)) pointsReason = `I heard ${rawPoints} points, which is not a whole number.`;
  else if (rawPoints === 0) pointsReason = "I heard 0 points.";
  else if (Math.abs(rawPoints) > MAX_POINTS) pointsReason = `I heard ${rawPoints} points, more than the limit of ${MAX_POINTS}.`;

  const base = {
    intent: "award" as const,
    studentId: student?.id ?? null,
    studentName: student?.fullName ?? null,
    points,
    skill,
    heard,
  };

  if (!student) {
    return low(base, nameHeard
      ? `I heard "${nameHeard}" but no child in this lesson is called that.`
      : "I did not hear which child.");
  }
  if (pointsReason) return low(base, pointsReason);

  // The spoken name must independently fit the chosen child...
  if (!nameHeard) return low(base, `I did not catch the child's name; was it ${student.fullName}?`);
  const mine = matchScore(nameHeard, student);
  if (mine < NAME_MATCH_MIN) {
    return low(base, `I heard "${nameHeard}", which does not sound like ${student.fullName}.`);
  }
  // ...and nobody else present may fit it about as well.
  const rivals = roster
    .filter((e) => e.id !== student!.id)
    .map((e) => ({ e, s: matchScore(nameHeard, e) }))
    .filter((r) => r.s >= NAME_MATCH_MIN && r.s >= mine - NAME_AMBIGUITY_GAP)
    .sort((x, y) => y.s - x.s);
  if (rivals.length) {
    const names = [student.fullName, ...rivals.slice(0, 2).map((r) => r.e.fullName)];
    return low(base, `I heard "${nameHeard}" but it could be ${names.join(" or ")}.`);
  }

  if (!gemHigh) return low(base, `I am not sure I heard that right: "${heard || spoken}".`);
  return { ...base, confidence: "high", reason: null };
}
