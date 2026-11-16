/**
 * _lib/class-fee.ts - the class fee in force on a lesson's date (D4 step 2).
 *
 * public.class_fee_history (supabase/migrations/20261114092000) holds one row
 * per month a class's fee changed - effective_from is the first day of a
 * month - plus a baseline row dated 1900-01-01. A lesson is priced at the row
 * with the greatest effective_from on or before its date: the same rule as
 * the database's class_fee_on(class, date). calculate-tuition,
 * calculate-tuition-bulk and projected-per-class read the history ONCE per
 * call and ask here for each lesson.
 *
 * classes.session_rate_vnd is "the fee now", a mirror. It is the fallback, so
 * this module and the migration ship in either order:
 *   - no history table yet (42P01 / PGRST205)  -> every lesson at the mirror,
 *     exactly as before step 2;
 *   - a class with no row                      -> that class at the mirror.
 * Any other failure to read the history throws: guessing the mirror would
 * re-price the past at today's fee, which is the defect this replaced.
 *
 * Imports nothing (Deno and the test bundles load it as it is).
 */

export interface ClassFeeRow {
  class_id: string;
  effective_from: string;
  session_rate_vnd: number | string | null;
}

/** Rows grouped by class, NEWEST first. `null` means "there is no history table". */
export type ClassFeeHistory = Map<string, Array<{ from: string; fee: number }>>;

/** Group the rows the reader fetched; dates compared as YYYY-MM-DD text. */
export function indexClassFees(rows: ClassFeeRow[] | null | undefined): ClassFeeHistory {
  const out: ClassFeeHistory = new Map();
  for (const r of rows ?? []) {
    if (!r || !r.class_id || !r.effective_from) continue;
    const fee = Number(r.session_rate_vnd);
    if (!Number.isFinite(fee)) continue;
    const list = out.get(r.class_id) ?? [];
    list.push({ from: String(r.effective_from).slice(0, 10), fee });
    out.set(r.class_id, list);
  }
  for (const list of out.values()) list.sort((a, b) => (a.from < b.from ? 1 : a.from > b.from ? -1 : 0));
  return out;
}

/**
 * The fee of `classId` on `date` (YYYY-MM-DD): the newest row dated on or
 * before it; `fallback` (the class's session_rate_vnd) when there is no
 * history at all, no row for the class, or no row that early.
 */
export function classFeeOn(
  history: ClassFeeHistory | null | undefined,
  classId: string,
  date: string,
  fallback: number,
): number {
  if (!history) return fallback;
  const rows = history.get(classId);
  if (!rows || rows.length === 0) return fallback;
  const d = String(date ?? "").slice(0, 10);
  for (const r of rows) if (r.from <= d) return r.fee;
  return fallback;
}

/** True when the error only says that the history table does not exist (yet). */
export function isMissingFeeHistory(error: any): boolean {
  if (!error) return false;
  const code = String(error.code ?? "");
  if (code === "42P01" || code === "PGRST205") return true;
  const message = String(error.message ?? "");
  return /class_fee_history/.test(message) && /(schema cache|does not exist)/i.test(message);
}

const PAGE = 1000;

/**
 * Read the history of these classes, every row (paged by id: PostgREST stops
 * at its max-rows without saying so). `null` when the table is not there;
 * throws on any other error.
 */
export async function readClassFeeHistory(supabase: any, classIds: string[]): Promise<ClassFeeHistory | null> {
  const ids = [...new Set((classIds ?? []).filter(Boolean))];
  if (ids.length === 0) return new Map();
  const rows: ClassFeeRow[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    let after: string | null = null;
    for (;;) {
      let q = supabase.from("class_fee_history").select("id, class_id, effective_from, session_rate_vnd").in("class_id", chunk);
      if (after !== null) q = q.gt("id", after);
      const { data, error } = await q.order("id", { ascending: true }).limit(PAGE);
      if (error) {
        if (isMissingFeeHistory(error)) return null;
        throw error;
      }
      if (!data || data.length === 0) break;
      rows.push(...data);
      const last = data[data.length - 1]?.id;
      if (last === undefined || last === null) throw new Error("Paged read of class_fee_history returned a row without id");
      after = String(last);
    }
  }
  return indexClassFees(rows);
}
