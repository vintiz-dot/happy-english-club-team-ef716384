// "Proof a child was in the room": pure helpers, no Supabase import.
// The database decides (attendance_proof_for_session); the screens only show it.
// Every function here treats missing or malformed input as "no information".

export type ProofStrength = "proof" | "indication";

export interface ProofRow {
  student_id: string;
  strength: ProofStrength;
  kinds: string[];
  summary: string;
}

export type ProofMap = Map<string, ProofRow>;

const PREFIX = "ATTENDANCE_PROOF:";

/** Rows from the RPC -> one entry per child. A child with proof is never downgraded by an indication row. */
export function parseProofRows(data: unknown): ProofMap {
  const map: ProofMap = new Map();
  if (!Array.isArray(data)) return map;
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.student_id !== "string" || !r.student_id) continue;
    const strength: ProofStrength = r.strength === "proof" ? "proof" : "indication";
    const row: ProofRow = {
      student_id: r.student_id,
      strength,
      kinds: Array.isArray(r.kinds) ? r.kinds.filter((k): k is string => typeof k === "string") : [],
      summary: typeof r.summary === "string" ? r.summary : "",
    };
    const old = map.get(row.student_id);
    if (old && old.strength === "proof" && row.strength !== "proof") continue;
    map.set(row.student_id, row);
  }
  return map;
}

/** Only proof locks Absent and Excused. An indication never does. */
export function isLocked(map: ProofMap | undefined | null, studentId: string): boolean {
  return map?.get(studentId)?.strength === "proof";
}

/**
 * Where to remove the proof, from its kinds. Mirrored in supabase/functions/mark-attendance/index.ts.
 * individual_points -> the child's point history; speaker_mark -> Undo on the speakers page.
 */
export function removalAdvice(kinds: readonly string[] | undefined | null): string {
  const k = kinds ?? [];
  const parts: string[] = [];
  if (k.includes("individual_points")) parts.push("delete it in the child's point history");
  if (k.includes("speaker_mark")) parts.push("use Undo on the lesson's speakers page");
  return parts.length ? parts.join(" or ") : "remove it first";
}

/** The sentence shown on the lock, or null when the child is not locked. */
export function lockReason(map: ProofMap | undefined | null, studentId: string): string | null {
  const row = map?.get(studentId);
  if (!row || row.strength !== "proof") return null;
  const what = row.summary.trim();
  const advice = removalAdvice(row.kinds);
  return what
    ? `In class: ${what}. If that was a mistake, ${advice}, then change the mark.`
    : `There is proof this child was in this lesson. If that was a mistake, ${advice}, then change the mark.`;
}

/** Absent and Excused are the two choices a lock takes away. */
export function statusIsLockedOut(status: string): boolean {
  return status === "Absent" || status === "Excused";
}

/** The next status in a tap-to-cycle control, skipping Absent and Excused for a locked child. */
export function nextStatus(current: string, locked: boolean): string {
  const cycle = ["Present", "Absent", "Excused"];
  const i = cycle.indexOf(current);
  const next = cycle[(i + 1) % cycle.length];
  if (locked && statusIsLockedOut(next)) return "Present";
  return next;
}

function collectText(value: unknown, out: string[], depth = 0): void {
  if (depth > 6 || value == null) return;
  if (typeof value === "string") {
    // An error body is often JSON inside a string: read its fields, never the raw text
    // (the raw text would carry the keys that follow the message).
    const t = value.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try { collectText(JSON.parse(t), out, depth + 1); return; } catch { /* plain text */ }
    }
    out.push(value);
    return;
  }
  if (Array.isArray(value)) { for (const v of value) collectText(v, out, depth + 1); return; }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    for (const k of ["message", "error", "details", "detail", "hint", "body", "context"]) {
      if (k in o) collectText(o[k], out, depth + 1);
    }
  }
}

/**
 * The sentence after "ATTENDANCE_PROOF:" anywhere in an error (a database error, an Error,
 * an edge-function error body, JSON nested in a string), or null when it is not that refusal.
 */
export function parseProofRefusal(error: unknown): string | null {
  const texts: string[] = [];
  collectText(error, texts);
  if (error instanceof Error && error.message) texts.push(error.message);
  for (const t of texts) {
    const at = t.indexOf(PREFIX);
    if (at < 0) continue;
    let rest = t.slice(at + PREFIX.length);
    // text cut out of a broken JSON string: stop at the next key, then drop closing quotes and braces
    rest = rest.replace(/"\s*,\s*"[A-Za-z_]+"\s*:[\s\S]*$/, "");
    rest = rest.replace(/["'}\]\\]+\s*$/, "").trim();
    if (rest) return rest;
  }
  return null;
}

/** The body mark-attendance answers 409 with: { error: "attendance_proof", message, students }. */
export function proofRefusalFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (b.error === "attendance_proof" && typeof b.message === "string" && b.message.trim()) return b.message.trim();
  return parseProofRefusal(body);
}

/** Children a batch save refused, from a success response (`refused: [...]`). */
export function refusedStudentIds(data: unknown): string[] {
  const list = (data as { refused?: unknown } | null)?.refused;
  if (!Array.isArray(list)) return [];
  return list
    .map((r) => (typeof r === "string" ? r : (r as { student_id?: unknown })?.student_id))
    .filter((s): s is string => typeof s === "string" && !!s);
}

/** One sentence for a batch save where some children were refused: what was saved and who was not changed. */
export function refusedBatchText(data: unknown, nameOf: (id: string) => string | undefined): string | null {
  const list = (data as { refused?: unknown } | null)?.refused;
  if (!Array.isArray(list) || list.length === 0) return null;
  const kinds = new Set<string>();
  const parts = list.map((r) => {
    const o = typeof r === "object" && r ? (r as { student_id?: string; summary?: string; kinds?: string[] }) : null;
    const id = typeof r === "string" ? r : o?.student_id;
    for (const k of o?.kinds ?? []) kinds.add(k);
    const name = (id && nameOf(id)) || "A child";
    return o?.summary ? `${name} (${o.summary})` : name;
  });
  return `The other marks were saved. Not changed because they were in class: ${parts.join(", ")}. If that was a mistake, ${removalAdvice([...kinds])}, then change the mark.`;
}

/** True when a request would change the stored mark to Absent or Excused (no row, or a different status). */
export function changesToAbsentOrExcused(stored: string | null | undefined, requested: string): boolean {
  return statusIsLockedOut(requested) && stored !== requested;
}

/* ------------------------------------------------------------------ admin check */

export type GapKind =
  | "proof_no_mark"
  | "proof_contradicts_person"
  | "proof_contradicts_system"
  | "no_mark_no_proof"
  | "proof_not_enrolled"
  | "proof_on_cancelled";

export const GAP_KINDS: GapKind[] = [
  "proof_no_mark",
  "proof_contradicts_system",
  "proof_contradicts_person",
  "proof_not_enrolled",
  "proof_on_cancelled",
  "no_mark_no_proof",
];

export const GAP_LABEL: Record<GapKind, string> = {
  proof_no_mark: "No mark, but there is proof the child was in the lesson",
  proof_contradicts_system: "Marked absent by the system, but there is proof the child was in the lesson",
  proof_contradicts_person: "Marked absent, but there is proof the child was in the lesson",
  proof_not_enrolled: "Proof in the lesson, but the child was not enrolled that day",
  proof_on_cancelled: "Proof in a lesson that was cancelled",
  no_mark_no_proof: "No mark and no proof",
};

/** Kinds that need a person to look at them. */
export const GAP_NEEDS_PERSON: GapKind[] = ["proof_contradicts_person", "proof_not_enrolled", "proof_on_cancelled"];

export interface GapRow {
  kind: GapKind;
  session_id: string;
  student_id: string;
  student_name: string;
  class_id: string | null;
  class_name: string | null;
  lesson_date: string;
  current_status: string | null;
  marked_by_person: boolean | null;
  proof_kinds: string[];
  summary: string;
}

export function parseGapRows(data: unknown): GapRow[] {
  if (!Array.isArray(data)) return [];
  const out: GapRow[] = [];
  for (const raw of data) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    if (!GAP_KINDS.includes(r.kind as GapKind)) continue;
    if (typeof r.session_id !== "string" || typeof r.student_id !== "string") continue;
    out.push({
      kind: r.kind as GapKind,
      session_id: r.session_id,
      student_id: r.student_id,
      student_name: typeof r.student_name === "string" ? r.student_name : "A child",
      class_id: typeof r.class_id === "string" ? r.class_id : null,
      class_name: typeof r.class_name === "string" ? r.class_name : null,
      lesson_date: typeof r.lesson_date === "string" ? r.lesson_date : "",
      current_status: typeof r.current_status === "string" ? r.current_status : null,
      marked_by_person: typeof r.marked_by_person === "boolean" ? r.marked_by_person : null,
      proof_kinds: Array.isArray(r.proof_kinds) ? r.proof_kinds.filter((k): k is string => typeof k === "string") : [],
      summary: typeof r.summary === "string" ? r.summary : "",
    });
  }
  return out;
}

export function groupGaps(rows: GapRow[]): Record<GapKind, GapRow[]> {
  const g = Object.fromEntries(GAP_KINDS.map((k) => [k, [] as GapRow[]])) as Record<GapKind, GapRow[]>;
  for (const r of rows) g[r.kind].push(r);
  return g;
}

export interface ApplyResult {
  dry_run: boolean;
  inserted: number;
  corrected: number;
  left_for_admin: number;
  affected_months: Array<{ student_id: string; month: string }>;
}

export function parseApplyResult(data: unknown): ApplyResult | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const months = Array.isArray(d.affected_months) ? d.affected_months : [];
  return {
    dry_run: d.dry_run === true,
    inserted: num(d.inserted),
    corrected: num(d.corrected),
    left_for_admin: num(d.left_for_admin),
    affected_months: months.flatMap((m) => {
      const x = m as { student_id?: unknown; month?: unknown };
      return typeof x?.student_id === "string" && typeof x?.month === "string" ? [{ student_id: x.student_id, month: x.month }] : [];
    }),
  };
}

/** Distinct months, oldest first. */
export function monthsOf(result: ApplyResult | null): string[] {
  return Array.from(new Set((result?.affected_months ?? []).map((m) => m.month))).sort();
}

/**
 * True only when the error says THIS function is not in the database yet (PGRST202 / 42883 that
 * names it). Any other error, including a missing function inside it, is a real error.
 */
export function isNotInstalled(error: unknown, fn = "attendance_evidence_gaps"): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const msg = String(e.message ?? "");
  if (!msg.includes(fn)) return false;
  if (e.code === "PGRST202" || e.code === "42883") return true;
  return !e.code && /does not exist|could not find the function|schema cache/i.test(msg);
}

/** Pages of a long list: the first `shown` rows. */
export function firstRows<T>(rows: readonly T[], shown: number): T[] {
  return rows.slice(0, Math.max(0, shown));
}

export const PROOF_LOCK_TITLE = "Absent and Excused are locked for this child";

/** The proof sentence inside a supabase-js function error (reads the response body), or null. */
export async function proofRefusalOf(error: unknown): Promise<string | null> {
  try {
    const ctx = (error as { context?: { clone?: () => unknown; json?: () => Promise<unknown> } } | null)?.context;
    const src = (typeof ctx?.clone === "function" ? ctx.clone() : ctx) as { json?: () => Promise<unknown> } | undefined;
    const body = (await src?.json?.()) ?? null;
    return proofRefusalFromBody(body);
  } catch {
    return null;
  }
}
