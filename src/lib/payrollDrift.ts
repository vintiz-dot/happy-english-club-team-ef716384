/**
 * What has moved in a CLOSED payroll month since it was closed, per person:
 * what the month computes now (calculate-payroll's `live` figures, as the
 * Payroll screen shows them) against what it was closed at (payroll_lines),
 * less anything already carried into a later month (payroll_adjustments).
 *
 * Arithmetic over figures calculate-payroll and the close already decided;
 * it prices nothing.
 *
 * A person with a stored line and NO row in the live figures earns nothing
 * in the month now - calculate-payroll leaves out an assistant with no paid
 * minutes and an archived teacher with no lessons, and fails the whole call
 * on a read error rather than leave someone out. They are a correction of
 * minus what they were paid, and are reported, not dropped (D5 G-7: before
 * this, the panel walked the live rows only and such a person vanished).
 * Until the live figures have loaded nothing is reported, so a closed month
 * does not flash "everyone paid too much" while the screen loads.
 *
 * A person with a correction carried OUT of the month and neither a line nor
 * a live row (review M-1: their line was removed after the carry) is also a
 * row: paid 0, now 0, so what is left is minus what was carried. The close
 * refuses to remove such a line now (HC149); this keeps any that got there
 * another way from being silent.
 */
export interface DriftLiveRow {
  id: string;
  staffType: "teacher" | "ta";
  name: string;
  totalEarned: number;
}

export interface DriftLine {
  teacher_id: string | null;
  assistant_id: string | null;
  staff_name: string;
  total_amount_vnd: number;
}

export interface DriftCarried {
  teacher_id: string | null;
  assistant_id: string | null;
  amount_vnd: number;
  /** The person's name, when the screen has it (for a row with no line). */
  staff_name?: string | null;
}

export interface DriftRow extends DriftLiveRow {
  /** What the month was closed at for this person (0 when no line). */
  paid: number;
  /** What is still to carry: now - paid - already carried. Never 0. */
  delta: number;
  /** True when the person has a line but no live row: earns nothing now. */
  noLongerEarns: boolean;
  /** True when the person has neither a line nor a live row, only a carry. */
  carriedOnly: boolean;
}

export function payrollDrift(
  locked: boolean,
  liveReady: boolean,
  live: DriftLiveRow[],
  lines: DriftLine[],
  carried: DriftCarried[],
): DriftRow[] {
  if (!locked || !liveReady) return [];
  const paid = new Map<string, number>();
  for (const l of lines) paid.set(l.teacher_id ?? l.assistant_id ?? "", l.total_amount_vnd);
  const done = new Map<string, number>();
  for (const a of carried) {
    const id = a.teacher_id ?? a.assistant_id ?? "";
    done.set(id, (done.get(id) ?? 0) + a.amount_vnd);
  }
  const seen = new Set(live.map((s) => s.id));
  const rows: DriftRow[] = live.map((s) => ({
    ...s,
    paid: paid.get(s.id) ?? 0,
    delta: Math.round(s.totalEarned - (paid.get(s.id) ?? 0) - (done.get(s.id) ?? 0)),
    noLongerEarns: false,
    carriedOnly: false,
  }));
  for (const l of lines) {
    const id = l.teacher_id ?? l.assistant_id ?? "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      staffType: l.teacher_id ? "teacher" : "ta",
      name: l.staff_name,
      totalEarned: 0,
      paid: l.total_amount_vnd,
      delta: Math.round(0 - l.total_amount_vnd - (done.get(id) ?? 0)),
      noLongerEarns: true,
      carriedOnly: false,
    });
  }
  for (const a of carried) {
    const id = a.teacher_id ?? a.assistant_id ?? "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rows.push({
      id,
      staffType: a.teacher_id ? "teacher" : "ta",
      name: a.staff_name ?? "Staff member",
      totalEarned: 0,
      paid: 0,
      delta: Math.round(0 - (done.get(id) ?? 0)),
      noLongerEarns: true,
      carriedOnly: true,
    });
  }
  return rows.filter((s) => s.delta !== 0);
}

/** The close's answer about people taken off the month, as one sentence. */
export interface RemovedLine {
  staffName?: string | null;
  totalAmountVnd?: number | null;
}

export function removedLinesText(removed: RemovedLine[] | null | undefined, vnd: (n: number) => string): string {
  if (!Array.isArray(removed) || removed.length === 0) return "";
  const who = removed.map((r) => `${r.staffName ?? "someone"} (${vnd(Number(r.totalAmountVnd ?? 0))})`).join(", ");
  return `Removed ${removed.length} line(s) from the earlier close of staff who earn nothing in the month now: ${who}.`;
}

/** The close's answer about booked payroll costs it took off, as one sentence. */
export interface RemovedCost {
  memo?: string | null;
  sourceKey?: string | null;
  amount?: number | null;
}

export function removedCostsText(removed: RemovedCost[] | null | undefined, vnd: (n: number) => string): string {
  if (!Array.isArray(removed) || removed.length === 0) return "";
  const what = removed.map((c) => `${c.memo ?? c.sourceKey ?? "a payroll cost"} (${vnd(Number(c.amount ?? 0))})`).join(", ");
  return `Removed ${removed.length} booked payroll cost(s) of staff who earn nothing in the month now: ${what}.`;
}
