// The admin screens' one way to put money on (or take it off) a child's bill:
// the record-payment edge function (D5 G-1). It writes the payments row, both
// ledger legs and the bill's recorded_payment together, or nothing. The
// screens no longer write recorded_payment themselves.

export interface RecordPaymentArgs {
  studentId: string;
  /** The tuition month the admin confirmed (useTuitionMonthConfirmation). */
  month: string;
  kind: "payment" | "correction";
  /** Whole dong, > 0. A correction takes it off. */
  amount: number;
  /** As the screen labels it: "Cash" goes to the CASH account, anything else to BANK. */
  method: string;
  /** Receipt date, YYYY-MM-DD. */
  occurredAt: string;
  memo?: string | null;
  /** One per attempt: a second click with it records nothing more. */
  idempotencyKey: string;
  /** The recorded payment the screen showed, when the change is made against it. */
  expectedRecorded?: number;
}

export interface RecordPaymentDone {
  paymentId: string;
  recordedBefore: number;
  recordedAfter: number;
  ledgerAccount: "CASH" | "BANK";
}

export type RecordPaymentResult =
  | { ok: true; data: RecordPaymentDone }
  /**
   * answered: the function replied (refused or failed) - the attempt is over,
   * so the next one needs a new key. Not answered (network): the outcome is
   * unknown, so the retry keeps the same key and cannot pay twice.
   * conflict: the bill changed since the screen loaded; reload it.
   */
  | { ok: false; message: string; answered: boolean; conflict: boolean; duplicate: boolean };

export function newPaymentKey(): string {
  return crypto.randomUUID();
}

export async function recordPayment(client: any, args: RecordPaymentArgs): Promise<RecordPaymentResult> {
  let data: any = null, error: any = null;
  try {
    ({ data, error } = await client.functions.invoke("record-payment", { body: args }));
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || "The payment could not be sent", answered: false, conflict: false, duplicate: false };
  }
  if (!error && data?.success) return { ok: true, data };
  let body: any = data;
  const context = error?.context;
  if (context && typeof context.json === "function") {
    try {
      body = await (typeof context.clone === "function" ? context.clone() : context).json();
    } catch {
      body = null;
    }
  }
  const answered = !!context || !!data;
  const message = (body && typeof body.error === "string" && body.error) || error?.message || "The payment could not be recorded";
  return { ok: false, message, answered, conflict: !!body?.conflict, duplicate: !!body?.duplicate };
}
