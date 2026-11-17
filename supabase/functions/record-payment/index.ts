// record-payment: an admin records money for ONE child's bill of ONE month
// (D5 gap G-1, docs/evidence/G1-record-payment.md).
//
// The admin screens (RecordPaymentDialog, QuickPayPanel, BatchPaymentDialog,
// RecordedPaymentManager) used to add to invoices.recorded_payment from the
// browser and nothing else: no payments row, no ledger legs. Every such write
// now comes here, and is recorded in all three places by ONE database
// function, public.record_admin_payment (migration 20261117120000), in ONE
// transaction:
//
//   1. a payments row, whose id is the screen's idempotency key;
//   2. both ledger legs in one insert, keyed record-payment-<payment>-<student>
//      (payment: DR CASH/BANK, CR AR; correction: DR AR, CR CASH/BANK);
//   3. recorded_payment on the bill, read FOR UPDATE and written by
//      compare-and-set, never below 0, labelled by invoice_paid_label (an
//      admin's 'credit' kept); and the audit row.
//
// NEVER HALF-DONE. A failure anywhere rolls the whole transaction back, so
// there is no undo here and nothing is ever deleted (fix round 1: the undo
// this replaced deleted the payments row through the admin's client, which
// live's prevent_client_payment_deletion trigger refuses, review B-1).
//
// WHAT THIS FUNCTION DOES ITSELF: the role check, the input check, and making
// sure the bill exists - a payment for a month with no bill asks
// calculate-tuition to price and save it (never a bill from screen figures),
// and its error is read, not assumed away (review N-2). Then it calls the
// database function with the CALLER's client (anon key + the admin's JWT), so
// row security and the D4 money triggers see the admin, and maps the answer.
//
// AN ANSWER THE DATABASE DID NOT GIVE. If the call to the database fails with
// no SQLSTATE (the connection dropped, the reply was lost), the payment may or
// may not have been committed. That is answered 503 `unknown: true`: the
// screen keeps the same key, so a retry either records it once or is refused
// as a duplicate - it cannot pay twice.
//
// The service client is used only for the role check and the calculate-tuition
// invokes (the internal call every payment path makes).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireRole } from "../_lib/auth.ts";
import { callerClient } from "../_lib/session-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const Input = z.object({
  studentId: z.string().uuid(),
  // The tuition month the admin confirmed on the screen (useTuitionMonthConfirmation),
  // separate from the receipt date.
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  kind: z.enum(["payment", "correction"]).default("payment"),
  amount: z.number().int().positive().max(500000000),
  method: z.string().trim().min(1).max(50),
  // The receipt date (YYYY-MM-DD) or a full timestamp.
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/),
  memo: z.string().max(500).optional().nullable(),
  idempotencyKey: z.string().uuid(),
  // The recorded payment the screen showed. When given, the bill must still
  // hold exactly that or nothing is recorded (an edit made against a stale
  // screen would otherwise land on someone else's figure).
  expectedRecorded: z.number().int().min(0).optional(),
});

/** The database function's refusals (SQLSTATE) -> HTTP status and the flags the screens read. */
const REFUSALS: Record<string, { status: number; duplicate?: boolean; conflict?: boolean }> = {
  RP403: { status: 403 },
  RP404: { status: 404 },
  RP409: { status: 409, duplicate: true },
  RP410: { status: 409 },
  RP412: { status: 409, conflict: true },
  RP422: { status: 409 },
  RP424: { status: 409 },
  "22023": { status: 400 },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

  // A person, and an admin: the service key has no admin behind it.
  const gate = await requireRole(req, service, ["admin"], corsHeaders, { allowServiceRole: false });
  if (gate instanceof Response) return gate;
  // The admin's own client: row security and auth.uid() apply to everything below.
  const supabase = callerClient(createClient, url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", req.headers.get("Authorization") ?? "");

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

  /** Ask calculate-tuition to price / refresh the bill; its failure is logged and returned, never thrown away. */
  const recalc = async (why: string): Promise<string | null> => {
    try {
      const { error } = await service.functions.invoke("calculate-tuition", { body: { studentId, month } });
      if (!error) return null;
      const detail = error.message ?? String(error);
      console.error(`[record-payment] calculate-tuition (${why}) for ${studentId} ${month}:`, detail);
      return detail;
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      console.error(`[record-payment] calculate-tuition (${why}) for ${studentId} ${month}:`, detail);
      return detail;
    }
  };

  try {
    // ---- Before the database function: who, and the bill exists ------------
    const { data: student, error: studentError } = await supabase
      .from("students").select("id, full_name").eq("id", studentId).maybeSingle();
    if (studentError) throw new Error(`Unable to read the student: ${studentError.message}`);
    if (!student) return respond({ error: "Student not found. Nothing was recorded." }, 404);

    const billExists = async () => {
      const { data, error } = await supabase
        .from("invoices").select("id").eq("student_id", studentId).eq("month", month).maybeSingle();
      if (error) throw new Error(`Unable to read the ${month} bill: ${error.message}`);
      return !!data;
    };
    if (!(await billExists())) {
      if (kind === "correction") {
        // A bill that does not exist records nothing: there is nothing to take off.
        return respond({ error: `There is no ${month} bill for ${student.full_name}, so there is no payment to correct. Nothing was recorded.` }, 409);
      }
      // No bill yet: calculate-tuition prices and saves it (the one place
      // tuition is priced). Never a bill made from figures a screen sent.
      const failed = await recalc("price the missing bill");
      if (!(await billExists())) {
        return respond({
          error: `There is no ${month} bill for ${student.full_name} and it could not be created${failed ? ` (calculate-tuition: ${failed})` : ""}. The family discount may still be being worked out. Nothing was recorded: try again in a minute.`,
        }, 409);
      }
    }

    // ---- The three writes, one transaction ----------------------------------
    let data: unknown = null;
    let error: { code?: unknown; message?: string } | null = null;
    try {
      ({ data, error } = await supabase.rpc("record_admin_payment", {
        p_payment_id: paymentId,
        p_student_id: studentId,
        p_month: month,
        p_kind: kind,
        p_amount: amount,
        p_method: method,
        p_occurred_at: occurredAt,
        p_memo: memo?.trim() || null,
        p_expected_recorded: expectedRecorded ?? null,
      }));
    } catch (e) {
      // Thrown, not answered: the same as a lost reply (below).
      error = { code: "", message: e instanceof Error ? e.message : String(e) };
    }

    if (error) {
      const code = typeof error.code === "string" ? error.code : "";
      const refusal = REFUSALS[code];
      if (refusal) {
        return respond({
          error: error.message,
          paymentId,
          ...(refusal.duplicate ? { duplicate: true } : {}),
          ...(refusal.conflict ? { conflict: true } : {}),
        }, refusal.status);
      }
      if (code === "") {
        // No SQLSTATE: the database's answer never arrived. It may have committed.
        console.error("[record-payment] no answer from the database:", error.message);
        return respond({
          error: "The database did not answer, so this payment may or may not have been recorded. Do not enter it again as a new payment: retry (the same request cannot be recorded twice) or reload to check.",
          paymentId, unknown: true,
        }, 503);
      }
      // The database answered with an error: the transaction was rolled back.
      console.error("[record-payment] record_admin_payment:", code, error.message);
      return respond({ error: `Nothing was recorded: ${error.message}`, paymentId }, 500);
    }
    const done = data as Record<string, unknown> | null;
    if (!done || done.success !== true) {
      // A 2xx with no result: treat as unknown rather than as recorded or not.
      return respond({
        error: "The database's answer could not be read, so this payment may or may not have been recorded. Retry (the same request cannot be recorded twice) or reload to check.",
        paymentId, unknown: true,
      }, 503);
    }

    // ---- After: the bill's refresh, as every payment path -------------------
    const refreshFailed = await recalc("refresh after the payment");

    return respond({ ...done, ...(refreshFailed ? { refreshFailed } : {}) });
  } catch (error) {
    console.error("[record-payment]", error);
    return respond({ error: `Nothing was recorded: ${error instanceof Error ? error.message : "unknown error"}` }, 400);
  }
});
