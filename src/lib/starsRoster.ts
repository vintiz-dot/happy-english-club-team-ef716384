/**
 * Pixel Pal's list of its classes and children.
 *
 * It reaches this page two ways, in one shape: live from the stars-roster
 * function once Pixel Pal has its export-roster endpoint, or pasted by an
 * admin from what Pixel Pal gave them. Either way it stays in this page's
 * memory. It is personal data about children and it is never saved in HEC -
 * only the pairs of numbers an admin confirms are.
 *
 * Third-party input, so it is checked rather than trusted: anything that is
 * not a short string under a short key is dropped.
 */

export interface StarsRoster {
  /** Pixel Pal class number -> its name. */
  classes: Map<string, string>;
  /** Pixel Pal child number -> the name Pixel Pal knows them by. */
  students: Map<string, string>;
  /** Pixel Pal child number -> the Pixel Pal classes they are in. */
  studentClasses: Map<string, string[]>;
  /** Children Pixel Pal has archived: named, but not worth asking about. */
  inactive: Set<string>;
}

export const EMPTY_ROSTER: StarsRoster = {
  classes: new Map(),
  students: new Map(),
  studentClasses: new Map(),
  inactive: new Set(),
};

const MAX_REF = 64;
const MAX_NAME = 200;

function cleanRef(value: unknown): string | null {
  const text = typeof value === "number" && Number.isFinite(value) ? String(value) : value;
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  return trimmed && trimmed.length <= MAX_REF ? trimmed : null;
}

function nameMap(value: unknown): Map<string, string> {
  const out = new Map<string, string>();
  if (!value || typeof value !== "object" || Array.isArray(value)) return out;
  for (const [key, name] of Object.entries(value as Record<string, unknown>)) {
    const ref = cleanRef(key);
    if (ref && typeof name === "string" && name.trim()) out.set(ref, name.trim().slice(0, MAX_NAME));
  }
  return out;
}

/** The roster's JSON, from the function or from a paste. Null if it has no children in it. */
export function readRoster(value: unknown): StarsRoster | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  const students = nameMap(body.students);
  if (students.size === 0) return null;

  const studentClasses = new Map<string, string[]>();
  if (body.student_classes && typeof body.student_classes === "object" && !Array.isArray(body.student_classes)) {
    for (const [key, raw] of Object.entries(body.student_classes as Record<string, unknown>)) {
      const ref = cleanRef(key);
      if (!ref) continue;
      // One class is what Pixel Pal sends today; a list is what it would
      // need to send for a child in two.
      const list = (Array.isArray(raw) ? raw : [raw]).map(cleanRef).filter((c): c is string => c !== null);
      if (list.length > 0) studentClasses.set(ref, list);
    }
  }

  const inactive = new Set<string>();
  if (Array.isArray(body.inactive_students)) {
    for (const raw of body.inactive_students) {
      const ref = cleanRef(raw);
      if (ref) inactive.add(ref);
    }
  }

  return { classes: nameMap(body.classes), students, studentClasses, inactive };
}

export interface PastedRoster {
  roster: StarsRoster | null;
  error: string | null;
}

/** What an admin pasted, with the reason in words if it cannot be read. */
export function parsePastedRoster(text: string): PastedRoster {
  if (!text.trim()) return { roster: null, error: null };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { roster: null, error: "That is not the JSON Pixel Pal gave you. Paste the whole thing, from { to }." };
  }
  const roster = readRoster(parsed);
  if (!roster) return { roster: null, error: "That list has no \"students\" section." };
  return { roster, error: null };
}
