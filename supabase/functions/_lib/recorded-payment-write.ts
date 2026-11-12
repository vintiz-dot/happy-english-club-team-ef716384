/*
 * EDGE copy. Mirrored, byte for byte below this comment, by
 * src/lib/recordedPaymentWrite.ts (the admin payment screens); Deno cannot
 * import from src/. scripts/pgtest/mirrors.test.mjs fails when they differ.
 * This file imports nothing - the Supabase client is passed in.
 */
// Every write of invoices.recorded_payment goes through here, as a
// COMPARE-AND-SET on the value the writer read:
//
//   UPDATE invoices SET recorded_payment = <new>, ... WHERE id = <bill>
//     AND recorded_payment = <the value read>          (and return the row)
//
// Two payments on one bill at the same moment used to lose one: each read
// the bill, added its own amount and wrote the sum, so the second write
// replaced the first (T1 review 2, R2-m6). The admin dialogs had the widest
// window - the value read is the one the SCREEN loaded, possibly minutes
// old. Now a write whose value read is no longer the bill's writes nothing:
//
//   - setRecordedPayment (the admin screens): reports `conflict`; the screen
//     tells the admin and reloads. Nothing is guessed.
//   - addToRecordedPayment (the payment functions): re-reads the bill and
//     tries once more with the fresh figure; a second miss fails loudly.
//
// Not an atomic `recorded_payment + delta` in SQL on purpose: that would turn
// a double submit of the same absolute value into a double payment.

export const BILL_COLUMNS =
  "id, student_id, month, recorded_payment, paid_amount, base_amount, total_amount, carry_in_debt, carry_in_credit, status";

export const CHANGED_SINCE_LOADED =
  "This bill changed since the screen was loaded (another payment or correction was saved). Nothing was saved. The list has been reloaded: check the bill and enter the payment again.";

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

// ok false = conflict: nothing was written, and message says so for the admin.
export type SetResult = { ok: boolean; conflict?: boolean; message?: string };

/**
 * Set a bill's recorded payment to `next`, only if it still holds `expected`.
 * With no `invoiceId` the bill does not exist yet: it is inserted with
 * `newRow`; if one appeared meanwhile, the compare-and-set applies to it
 * (expecting `expected`, normally 0).
 */
export async function setRecordedPayment(
  client: any,
  args: {
    invoiceId?: string | null;
    studentId: string;
    month: string;
    expected: number;
    next: number;
    fields?: Record<string, unknown>; // status, updated_at, updated_by...
    newRow?: Record<string, unknown>; // the bill's other columns, for an insert
  },
): Promise<SetResult> {
  const set = { ...(args.fields ?? {}), recorded_payment: args.next };
  if (!args.invoiceId) {
    const { error } = await client.from("invoices").insert({ ...(args.newRow ?? {}), ...set, student_id: args.studentId, month: args.month });
    if (!error) return { ok: true };
    if (error.code !== "23505") throw new Error(error.message || "Unable to save the payment");
  }
  let q = client.from("invoices").update(set);
  q = args.invoiceId ? q.eq("id", args.invoiceId) : q.eq("student_id", args.studentId).eq("month", args.month);
  const { data, error } = await q.eq("recorded_payment", args.expected).select("id");
  if (error) throw new Error(error.message || "Unable to save the payment");
  if (!data || data.length === 0) return { ok: false, conflict: true, message: CHANGED_SINCE_LOADED };
  return { ok: true };
}

/**
 * Add `delta` (negative to take money off) to a bill read as `row`, by
 * compare-and-set, re-reading and trying once more if another write got
 * there first. `fields(bill, newRecorded)` gives the other columns to write
 * with it (label, paid_amount...), from the bill as it is at that attempt.
 * `guard(bill)` may refuse a fresh bill (returns the reason). Returns the
 * recorded payment before and after.
 */
export async function addToRecordedPayment(
  client: any,
  row: any,
  delta: number,
  fields: (bill: any, newRecorded: number) => Record<string, unknown>,
  guard?: (bill: any) => string | null,
): Promise<{ before: number; after: number; bill: any }> {
  let bill = row;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) {
      const { data, error } = await client.from("invoices").select(BILL_COLUMNS).eq("id", row.id).maybeSingle();
      if (error) throw new Error(`Unable to re-read the ${row.month ?? ""} bill: ${error.message}`);
      if (!data) throw new Error(`The ${row.month ?? ""} bill no longer exists`);
      bill = data;
      const refused = guard ? guard(bill) : null;
      if (refused) throw new Error(refused);
    }
    const before = num(bill.recorded_payment);
    const after = before + delta;
    const { data, error } = await client
      .from("invoices")
      .update({ ...fields(bill, after), recorded_payment: after })
      .eq("id", bill.id)
      .eq("recorded_payment", before)
      .select("id");
    if (error) throw new Error(`Unable to update the ${bill.month ?? ""} bill: ${error.message}`);
    if (data && data.length > 0) return { before, after, bill };
  }
  throw new Error(`The ${row.month ?? ""} bill kept changing while this payment was being saved; nothing more was written to it. Try again.`);
}
