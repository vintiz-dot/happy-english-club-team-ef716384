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

/**
 * ok: recorded, `data` set. Otherwise `message` is the function's own words.
 * answered: record-payment itself replied with a definite outcome - the
 * attempt is over, so the next one needs a new key.
 * Not answered: the request may have reached the server and been recorded
 * with no reply arriving (a dropped connection, a gateway error, or the
 * function's own `unknown` answer when the database's reply was lost). The
 * screen KEEPS the key, so the retry either records it once or is refused as
 * a duplicate - it cannot pay twice (fix round 1, review B-2).
 * conflict: the bill changed since the screen loaded; reload it.
 */
export interface RecordPaymentResult {
  ok: boolean;
  data?: RecordPaymentDone;
  message: string;
  answered: boolean;
  conflict: boolean;
  duplicate: boolean;
}

/** What the screens say when there was no definite answer (the key is kept). */
export const NO_ANSWER_MESSAGE =
  "No answer from the server, so the payment may or may not have been recorded. Retry with the same entry (it cannot be recorded twice) or reload to check before entering it again.";

export function newPaymentKey(): string {
  return crypto.randomUUID();
}

/** Today in Hanoi, YYYY-MM-DD (a UTC date is yesterday before 07:00 Hanoi). */
export function receiptDateToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export async function recordPayment(client: any, args: RecordPaymentArgs): Promise<RecordPaymentResult> {
  let data: any = null, error: any = null;
  try {
    ({ data, error } = await client.functions.invoke("record-payment", { body: args }));
  } catch {
    return { ok: false, message: NO_ANSWER_MESSAGE, answered: false, conflict: false, duplicate: false };
  }
  if (!error && data?.success) return { ok: true, data, message: "", answered: true, conflict: false, duplicate: false };
  if (!error) {
    // A 2xx without success. Only record-payment's own JSON `error` is an
    // answer; anything else (no body, a page from something in between) is not.
    const own = !!data && typeof data === "object" && typeof data.error === "string" && data.error.length > 0;
    const answered = own && data.unknown !== true;
    return {
      ok: false, message: own ? data.error : NO_ANSWER_MESSAGE, answered,
      conflict: answered && !!data.conflict, duplicate: answered && !!data.duplicate,
    };
  }
  // functions-js does not throw on a network failure: it returns a
  // FunctionsFetchError whose `context` is the fetch error. Only an HTTP
  // Response is a reply - and only one carrying record-payment's own JSON
  // `error` (a gateway 5xx page is not record-payment answering).
  const context = error?.context;
  const isReply = typeof Response !== "undefined" && context instanceof Response;
  let body: any = null;
  if (isReply) {
    try {
      body = await context.clone().json();
    } catch {
      body = null;
    }
  }
  const fromFunction = isReply && !!body && typeof body.error === "string" && body.error.length > 0;
  const answered = fromFunction && body.unknown !== true;
  const message = fromFunction ? body.error : NO_ANSWER_MESSAGE;
  return { ok: false, message, answered, conflict: answered && !!body?.conflict, duplicate: answered && !!body?.duplicate };
}
