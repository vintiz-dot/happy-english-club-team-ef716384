// record-payment: an admin records money for ONE child's bill of ONE month
// (D5 gap G-1, docs/evidence/G1-record-payment.md).
//
// The admin screens (RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog,
// RecordedPaymentManager) used to add to invoices.recorded_payment from the
// browser and nothing else: no payments row, no ledger legs. So the ledger was
// not the record of money received, reports from `payments` missed it, and
// delete-payment had nothing to take back. Every such write now comes here and
// is recorded in all three places, in this order:
//
//   1. a payments row, whose id is the screen's idempotency key (a double
//      click is refused before anything is written);
//   2. both ledger legs in ONE insert, keyed record-payment-<payment>-<student>
//      (payment: DR CASH/BANK, CR AR; correction: DR AR, CR CASH/BANK);
//   3. the compare-and-set on recorded_payment (_lib/recorded-payment-write.ts,
//      re-read and tried once more on a conflict), labelled by the one rule
//      (labelAfterPayment: an admin's 'credit' is kept).
//
// NEVER HALF-DONE. If 3 fails after 1 and 2, the legs are reversed by new legs
// keyed payment-reversal-<payment>-<leg> (the ledger is append-only, G-11:
// nothing is updated or deleted there) and the payments row is deleted, so
// the three records agree again; the answer says so. If that undo fails too,
// the answer names the payment and says it is not on the bill (so it must not
// go through delete-payment, which would take the amount off the bill).
//
// Not refused: a frozen bill (a freeze locks what is charged, not what is
// paid) and a closed month (the family payment paths do not refuse it).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireRole } from "../_lib/auth.ts";
import { labelAfterPayment } from "../_lib/invoice-status.ts";
import { addToRecordedPayment, BILL_COLUMNS } from "../_lib/recorded-payment-write.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** The key prefix of this function's ledger transactions; delete-payment's keyKind knows it. */
export const RECORD_PAYMENT_KEY = "record-payment";

const Input = z.object({
  studentId: z.string().uuid(),
  // The tuition month the admin confirmed on the screen (useTuitionMonthConfirmation),
  // separate from the receipt date.
  month: z.string().regex(/^\d{4}-\d{2}$/),
  kind: z.enum(["payment", "correction"]).default("payment"),
  amount: z.number().int().positive().max(500000000),
  method: z.string().trim().min(1).max(50),
  // The receipt date (YYYY-MM-DD) or a full timestamp.
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/),
  memo: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().uuid(),
  // The recorded payment the screen showed. When given, the bill must still
  // hold exactly that, at every attempt, or nothing is recorded (an edit made
  // against a stale screen would otherwise land on someone else's figure).
  expectedRecorded: z.number().int().min(0).optional(),
});

/** 'Cash' / 'cash' / ' CASH ' -> CASH; every other method (bank transfer, card, other) -> BANK. */
export function cashAccountCode(method: string): "CASH" | "BANK" {
  return method.trim().toLowerCase() === "cash" ? "CASH" : "BANK";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // A person, and an admin: the service key has no admin behind it.
  const gate = await requireRole(req, supabase, ["admin"], corsHeaders, { allowServiceRole: false });
  if (gate instanceof Response) return gate;
  const actor = gate.userId;

  let input: z.infer<typeof Input>;
  try {
    input = Input.parse(await req.json());
  } catch (e) {
    return respond({ error: `Nothing was recorded: ${e instanceof z.ZodError ? e.errors.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") : "the request could not be read"}` }, 400);
  }
  const { studentId, month, kind, amount, method, memo, idempotencyKey: paymentId, expectedRecorded } = input;
  if (kind === "correction" && !memo?.trim()) {
    return respond({ error: "A correction needs a note saying why. Nothing was recorded." }, 400);
  }
  const occurredAt = input.occurredAt.length === 10 ? `${input.occurredAt}T12:00:00+07:00` : input.occurredAt;
  const delta = kind === "correction" ? -amount : amount;

  try {
    // ---- Before anything is written: who, which bill, not twice ----------
    const { data: student, error: studentError } = await supabase
      .from("students").select("id, full_name").eq("id", studentId).maybeSingle();
    if (studentError) throw new Error(`Unable to read the student: ${studentError.message}`);
    if (!student) return respond({ error: "Student not found. Nothing was recorded." }, 404);

    const { data: existing, error: existingError } = await supabase
      .from("payments").select("id").eq("id", paymentId).maybeSingle();
    if (existingError) throw new Error(`Unable to check for a repeated request: ${existingError.message}`);
    if (existing) {
      return respond({ error: "This payment was already submitted (a second click or a retry). Nothing more was recorded: reload to see it.", paymentId, duplicate: true }, 409);
    }
    // A key an earlier, undone attempt used: its legs and reversal are in the
    // ledger, and reusing the id would mix the two. The screen makes a new key.
    const { data: usedKey, error: usedKeyError } = await supabase
      .from("ledger_entries").select("id").like("tx_key", `%${paymentId}%`).limit(1);
    if (usedKeyError) throw new Error(`Unable to check for a repeated request: ${usedKeyError.message}`);
    if ((usedKey ?? []).length > 0) {
      return respond({ error: "This request was tried before and undone. Nothing was recorded: reload and enter the payment again.", paymentId }, 409);
    }

    const readBill = async () => {
      const { data, error } = await supabase
        .from("invoices").select(BILL_COLUMNS).eq("student_id", studentId).eq("month", month).maybeSingle();
      if (error) throw new Error(`Unable to read the ${month} bill: ${error.message}`);
      return data;
    };
    let bill = await readBill();
    if (!bill) {
      // No bill yet: calculate-tuition prices and saves it (the one place
      // tuition is priced). Never a bill made from figures a screen sent.
      try {
        await supabase.functions.invoke("calculate-tuition", { body: { studentId, month } });
      } catch (e) {
        console.error("[record-payment] calculate-tuition:", e instanceof Error ? e.message : e);
      }
      bill = await readBill();
      if (!bill) {
        return respond({ error: `There is no ${month} bill for ${student.full_name} and it could not be created (the family discount may still be being worked out). Nothing was recorded: try again in a minute.` }, 409);
      }
    }
    const recordedNow = Number(bill.recorded_payment ?? 0);
    if (expectedRecorded !== undefined && recordedNow !== expectedRecorded) {
      return respond({ error: "This bill changed since the screen was loaded (another payment or correction was saved). Nothing was recorded: reload, check the bill and enter it again.", conflict: true }, 409);
    }
    if (recordedNow + delta < 0) {
      return respond({ error: `The ${month} bill records ${recordedNow}; a correction of ${amount} would take it below 0. Nothing was recorded.` }, 409);
    }

    // Ledger accounts, read before any write: a child without them gets them
    // first (the same five the family paths create).
    for (const code of ["AR", "CASH", "BANK", "REVENUE", "CREDIT"]) {
      const { error } = await supabase.from("ledger_accounts")
        .upsert({ student_id: studentId, code }, { onConflict: "student_id,code", ignoreDuplicates: true });
      if (error) throw new Error(`Unable to prepare the ledger accounts: ${error.message}`);
    }
    const { data: accounts, error: accountsError } = await supabase
      .from("ledger_accounts").select("id, code").eq("student_id", studentId);
    if (accountsError) throw new Error(`Unable to read the ledger accounts: ${accountsError.message}`);
    const accountOf = new Map((accounts ?? []).map((a: any) => [String(a.code), String(a.id)]));
    const cashCode = cashAccountCode(method);
    const cashAccount = accountOf.get(cashCode), arAccount = accountOf.get("AR");
    if (!cashAccount || !arAccount) {
      return respond({ error: `${student.full_name}'s ledger accounts are missing. Nothing was recorded.` }, 409);
    }

    // ---- 1. The payment row ----------------------------------------------
    const { error: paymentError } = await supabase.from("payments").insert({
      id: paymentId,
      student_id: studentId,
      amount: delta,
      method,
      occurred_at: occurredAt,
      memo: memo?.trim() || (kind === "correction" ? "Correction" : `Payment for ${month}`),
      created_by: actor,
    });
    if (paymentError) {
      if (paymentError.code === "23505") {
        return respond({ error: "This payment was already submitted (a second click or a retry). Nothing more was recorded: reload to see it.", paymentId, duplicate: true }, 409);
      }
      throw new Error(`Unable to record the payment: ${paymentError.message}`);
    }

    // ---- 2. Both legs, one insert ----------------------------------------
    const txId = crypto.randomUUID();
    const legMemo = `${kind === "correction" ? "Payment correction" : "Payment"} (record-payment)${memo?.trim() ? `: ${memo.trim()}` : ""}`;
    const cashLeg = { tx_id: txId, tx_key: `${RECORD_PAYMENT_KEY}-${paymentId}-${studentId}`, account_id: cashAccount,
      debit: kind === "payment" ? amount : 0, credit: kind === "payment" ? 0 : amount,
      occurred_at: occurredAt, memo: legMemo, month, created_by: actor };
    const arLeg = { tx_id: txId, account_id: arAccount,
      debit: kind === "payment" ? 0 : amount, credit: kind === "payment" ? amount : 0,
      occurred_at: occurredAt, memo: legMemo, month, created_by: actor };
    /**
     * Take back what this request wrote, so the three records agree again:
     * reversing legs for `legs` (the ledger is append-only, G-11: nothing in it
     * is updated or deleted), then the payments row. The bill is not touched.
     */
    const undo = async (written: any[], reason: string) => {
      if (written.length > 0) {
        const reversalTx = crypto.randomUUID();
        const { error } = await supabase.from("ledger_entries").insert(written.map((leg) => ({
          tx_id: reversalTx, tx_key: `payment-reversal-${paymentId}-${leg.id}`, account_id: leg.account_id,
          debit: leg.credit, credit: leg.debit, occurred_at: new Date().toISOString(),
          memo: `Undo of an unfinished payment: ${reason}`.slice(0, 500), month: leg.month, created_by: actor,
        })));
        if (error) return `the ledger reversal failed (${error.message})`;
      }
      const { error } = await supabase.from("payments").delete().eq("id", paymentId);
      return error ? `the payment row could not be removed (${error.message})` : null;
    };
    const halfDone = (what: string, undoFailure: string) => respond({
      // Not "use Delete payment": that also takes the amount off the bill,
      // which never received it - it would remove another payment's money.
      error: `${what}, and undoing the payment failed: ${undoFailure}. Payment ${paymentId} may be in the payments list or the ledger but is NOT on the bill. Do not delete it with Delete payment (that would also take money off the bill); report this payment id so its ledger entries are reversed by hand.`,
      paymentId, halfDone: true,
    }, 500);

    let legs: any[] = [];
    let ledgerFailure: string | null = null;
    try {
      const { data, error } = await supabase.from("ledger_entries").insert([cashLeg, arLeg]).select("*");
      if (error) ledgerFailure = error.message;
      else legs = data ?? [];
    } catch (e) {
      ledgerFailure = e instanceof Error ? e.message : String(e);
    }
    if (ledgerFailure !== null || legs.length !== 2) {
      // One insert: both legs or neither. If the answer was lost, read what
      // is there by key, so a pair that did land is reversed too.
      const { data: landed } = await supabase.from("ledger_entries").select("*").eq("tx_id", txId);
      const reason = `the ledger could not be written (${ledgerFailure ?? "no rows returned"})`;
      const failed = await undo(landed ?? [], reason);
      if (failed) return halfDone(reason, failed);
      return respond({ error: `${reason[0].toUpperCase()}${reason.slice(1)}. Nothing was recorded.`, paymentId, undone: true }, 500);
    }

    // ---- 3. The bill (compare-and-set) -----------------------------------
    let result: { before: number; after: number };
    try {
      result = await addToRecordedPayment(supabase, bill, delta, (fresh, newRecorded) => {
        const label = labelAfterPayment(fresh, newRecorded);
        return {
          paid_amount: Math.max(0, Number(fresh.paid_amount ?? 0) + delta),
          ...(label ? { status: label } : {}),
          updated_at: new Date().toISOString(),
          updated_by: actor,
        };
      }, (fresh) => {
        const held = Number(fresh.recorded_payment ?? 0);
        if (expectedRecorded !== undefined && held !== expectedRecorded) return "the bill changed since the screen was loaded";
        if (held + delta < 0) return `the bill now records ${held}, less than this correction`;
        return null;
      });
    } catch (e) {
      // Undo 1 and 2 so the three records agree.
      const reason = e instanceof Error ? e.message : String(e);
      const failed = await undo(legs, reason);
      if (failed) return halfDone(`The bill could not be updated (${reason})`, failed);
      return respond({ error: `The bill could not be updated: ${reason}. Nothing was recorded (the payment was undone).`, paymentId, undone: true }, 409);
    }

    // ---- After: audit and the bill's refresh (as every payment path) -----
    await supabase.from("audit_log").insert({
      entity: "invoice",
      entity_id: bill.id,
      action: kind === "correction" ? "payment_correction" : "record_payment",
      actor_user_id: actor,
      diff: { student_id: studentId, month, payment_id: paymentId, ledger_tx_id: txId, method, ledger_account: cashCode,
        previous_recorded_payment: result.before, payment_amount: delta, new_recorded_payment: result.after,
        payment_date: input.occurredAt, memo: memo ?? null, type: kind, via: "record-payment" },
    });
    try {
      await supabase.functions.invoke("calculate-tuition", { body: { studentId, month } });
    } catch (e) {
      console.error("[record-payment] recalc:", e instanceof Error ? e.message : e);
    }

    return respond({
      success: true, paymentId, ledgerTxId: txId, studentId, month, kind, amount: delta,
      ledgerAccount: cashCode, recordedBefore: result.before, recordedAfter: result.after,
    });
  } catch (error) {
    console.error("[record-payment]", error);
    return respond({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
