/**
 * payHistory — what was this person paid, on this date?
 *
 * public.staff_pay_rates holds one row per (member of staff, date the rate
 * starts). The rate in force on a date is the row with the greatest
 * effective_from at or before it. Changing a rate adds a row; it never
 * edits an old one.
 *
 * WHY THIS EXISTS. A rate used to live only on the staff row, so it was a
 * fact about right now applied backwards over everything. calculate-payroll
 * read it once per teacher and priced a whole month with it, whatever date
 * each session ran on - so a raise re-priced every month that teacher had
 * ever worked, including months already paid, and the payroll_summaries row
 * was overwritten by the same run. A rate is evidence about a period of
 * work, and this is the shape that keeps it answerable.
 *
 * THE SAME FILE RUNS ON BOTH SIDES. supabase/functions/_lib/pay-history.ts
 * is a byte-identical copy, as _lib/pay-rate.ts is of lib/payRate.ts, and
 * for the same reason: if the admin screen and calculate-payroll ever
 * resolve a rate differently, the screen shows one number and the teacher
 * is paid another. It is self-contained - no imports - so that the copy can
 * stay byte-identical rather than diverging on an import path. Verify with
 *
 *     diff src/lib/payHistory.ts supabase/functions/_lib/pay-history.ts
 *
 * It must also agree with public.teacher_rate_on / assistant_rate_on, which
 * implement the same rule in SQL for anything that cannot run code. The
 * fallback below is part of that agreement, not a convenience.
 *
 * Resolution happens here rather than through the SQL helpers because
 * payroll resolves a month of sessions for every member of staff at once -
 * a function call per session would be a join per row. The SQL helpers
 * exist for RLS, reports, and checking a figure by hand.
 */

/** A row of public.staff_pay_rates. */
export interface PayRateRecord {
  /** Exactly one of these is set, matching staff_pay_rates_one_subject_check. */
  teacher_id?: string | null;
  assistant_id?: string | null;
  /** YYYY-MM-DD, inclusive. Runs until the next record starts. */
  effective_from: string;
  pay_rate_type: string;
  hourly_rate_vnd: number;
  per_session_rate_vnd: number;
  note?: string | null;
  id?: string;
  created_at?: string;
}

/**
 * The three fields the pay maths needs. Structurally a StaffPayRate, so it
 * can be handed straight to sessionPayVnd / totalPayVnd / describeRate
 * without a conversion step - and declared here rather than imported so
 * this file stays free of imports and the two copies stay identical.
 */
export interface ResolvedRate {
  pay_rate_type: "hourly" | "per_session";
  hourly_rate_vnd: number;
  per_session_rate_vnd: number;
}

/**
 * Anything rate-shaped that has come out of the database, where
 * pay_rate_type is a text column and so is plain `string`. Narrowing it to
 * the union is this module's job, not the caller's - which is why the
 * fallback below takes this and returns a ResolvedRate.
 */
export interface RateLike {
  pay_rate_type?: string | null;
  hourly_rate_vnd?: number | null;
  per_session_rate_vnd?: number | null;
}

/** Which member of staff a record is about, whichever column names them. */
export function subjectOf(record: PayRateRecord): string | null {
  return record.teacher_id ?? record.assistant_id ?? null;
}

/**
 * Group records by the member of staff they belong to, newest first, so
 * resolving a date is a scan from the front rather than a sort per date.
 *
 * Teachers and assistants share the map. Their ids are uuids from different
 * tables and cannot collide, and every caller already knows which kind of
 * person it is holding.
 */
export function indexPayRates(
  rows: PayRateRecord[] | null | undefined,
): Map<string, PayRateRecord[]> {
  const byStaff = new Map<string, PayRateRecord[]>();
  for (const row of rows ?? []) {
    const id = row && subjectOf(row);
    if (!id || typeof row.effective_from !== "string") continue;
    const list = byStaff.get(id);
    if (list) list.push(row);
    else byStaff.set(id, [row]);
  }
  for (const list of byStaff.values()) list.sort(byEffectiveFromDesc);
  return byStaff;
}

/** Newest first. Exported so callers that sort their own list agree with this one. */
export function byEffectiveFromDesc(a: PayRateRecord, b: PayRateRecord): number {
  return a.effective_from < b.effective_from ? 1 : a.effective_from > b.effective_from ? -1 : 0;
}

/**
 * The record in force on a date, or null when none covers it.
 *
 * Dates are compared as YYYY-MM-DD strings, which is a correct ordering for
 * that format and keeps a timezone out of a comparison the caller is already
 * making in calendar terms.
 */
export function recordOnDate(
  recordsDesc: PayRateRecord[] | null | undefined,
  date?: string | null,
): PayRateRecord | null {
  if (!date || !recordsDesc?.length) return null;
  const day = date.slice(0, 10);
  for (const r of recordsDesc) {
    if (r.effective_from.slice(0, 10) <= day) return r;
  }
  return null;
}

/**
 * The rate to price a session on this date with.
 *
 * `fallback` is the member of staff's own row. It is used when no record
 * covers the date, which means someone hired after the backfill whose first
 * rate record has not been written yet. Falling back to their row rather
 * than to nothing is the same choice teacher_rate_on makes in SQL, and the
 * reason is that the alternative pays them 0.
 */
export function rateOnDate(
  recordsDesc: PayRateRecord[] | null | undefined,
  date: string | null | undefined,
  fallback?: RateLike | null,
): ResolvedRate {
  const record = recordOnDate(recordsDesc, date);
  const source = record ?? fallback ?? null;
  const type = source?.pay_rate_type === "per_session" ? "per_session" : "hourly";
  return {
    pay_rate_type: type,
    hourly_rate_vnd: type === "hourly" ? Math.max(0, Math.round(source?.hourly_rate_vnd ?? 0)) : 0,
    per_session_rate_vnd:
      type === "per_session" ? Math.max(0, Math.round(source?.per_session_rate_vnd ?? 0)) : 0,
  };
}

/** The record in force today - what the staff row should be mirroring. */
export function currentRecord(
  recordsDesc: PayRateRecord[] | null | undefined,
  today: string,
): PayRateRecord | null {
  return recordOnDate(recordsDesc, today);
}

/** Changes dated after today: agreed, saved, not yet in force. */
export function pendingRecords(
  recordsDesc: PayRateRecord[] | null | undefined,
  today: string,
): PayRateRecord[] {
  return (recordsDesc ?? []).filter((r) => r.effective_from.slice(0, 10) > today.slice(0, 10));
}

/**
 * The last day this record applies to - the day before the next one starts -
 * or null when it is the latest and still running.
 */
export function recordEndsOn(
  recordsDesc: PayRateRecord[] | null | undefined,
  record: PayRateRecord,
): string | null {
  const later = (recordsDesc ?? [])
    .filter((r) => r.effective_from > record.effective_from)
    .map((r) => r.effective_from)
    .sort();
  return later.length ? addDays(later[0], -1) : null;
}

/** YYYY-MM-DD plus a number of days, done in UTC so no local offset creeps in. */
export function addDays(day: string, delta: number): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/**
 * The months a change dated here would re-price, given the months that have
 * payroll on record. Used to show the consequence of backdating BEFORE the
 * save, because "this will change what four already-paid months say" is not
 * something an admin should discover afterwards.
 *
 * Months are YYYY-MM. A change effective part-way through a month still
 * re-prices that month, because the month's total is the sum of its
 * sessions and some of them fall on or after the date.
 */
export function monthsRepricedBy(
  effectiveFrom: string,
  monthsOnRecord: string[] | null | undefined,
): string[] {
  const from = effectiveFrom.slice(0, 7);
  return (monthsOnRecord ?? []).filter((m) => m.slice(0, 7) >= from).sort();
}
