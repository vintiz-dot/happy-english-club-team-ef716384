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

/**
 * What one payment attempt is, for keeping its key across a closed dialog
 * (review R-N2). A bill is one child and one month, so the child and the
 * month stand for it: NOT the invoice row's id, because a payment for a
 * month with no bill yet makes the bill (calculate-tuition) on the way - a
 * reopened dialog would then see a real id where the first one had a
 * placeholder, take it for a different payment and make a new key.
 */
export interface PaymentAttempt {
  studentId: string;
  month: string;
  kind: "payment" | "correction";
  amount: number;
}

/** sessionStorage, or anything with its three methods (tests). */
export interface KeyStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

const STORE_PREFIX = "hec.record-payment.pending:";

/**
 * Keys of attempts that got NO definite answer, kept until one arrives.
 *
 * The screens used to hold the key in the component (useRef): closing the
 * dialog after "no answer from the server" and opening it again made a NEW
 * key, so the retry of a payment that had in fact been recorded recorded it
 * a second time. The key now lives here - in memory for this page, and in
 * sessionStorage so a reload of the tab keeps it too - under the attempt
 * (child, month, kind, amount). It is created when the admin presses Save
 * (before the request leaves) and removed only when record-payment gives a
 * definite answer (recorded, or refused with its reason). The same entry made
 * again therefore carries the same key: if the first one was recorded the
 * retry is refused as a duplicate; if it was not, the retry records it once.
 * A duplicate keeps the key (review N-2): the screen says an identical
 * payment was found recorded and offers "This is a different payment -
 * record it too", which is the only thing that drops it (forget). A
 * different amount is a different payment and gets its own key.
 */
export function createPaymentKeyStore(storage: KeyStorage | null = null, makeKey: () => string = newPaymentKey) {
  const memory = new Map<string, string>();
  const name = (a: PaymentAttempt) =>
    `${STORE_PREFIX}${a.studentId}|${a.month}|${a.kind}|${Math.trunc(Number(a.amount))}`;
  const read = (n: string): string | null => {
    const m = memory.get(n);
    if (m) return m;
    try {
      const s = storage?.getItem(n) ?? null;
      if (s && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s)) {
        memory.set(n, s);
        return s;
      }
    } catch {
      // storage refused (private window, blocked site data): memory only
    }
    return null;
  };
  return {
    /** The key for this attempt: the one kept from an unanswered try, or a new one (kept from now on). */
    keyFor(a: PaymentAttempt): string {
      const n = name(a);
      const kept = read(n);
      if (kept) return kept;
      const k = makeKey();
      memory.set(n, k);
      try { storage?.setItem(n, k); } catch { /* memory only */ }
      return k;
    },
    /** True when an earlier try of this attempt got no answer (the screen can say so). */
    pending(a: PaymentAttempt): boolean {
      return read(name(a)) !== null;
    },
    /**
     * After a reply: drop the key on a definite answer, keep it otherwise.
     * A duplicate is kept too (review N-2): it says an identical payment sent
     * earlier WAS recorded, so the same entry made again is refused again -
     * until the admin says it is a different payment (forget).
     */
    settle(a: PaymentAttempt, result: Pick<RecordPaymentResult, "ok" | "answered"> & { duplicate?: boolean }): void {
      if (!(result.ok || result.answered) || (!result.ok && result.duplicate)) return;
      drop(a);
    },
    /** The admin said "this is a different payment": the next try of it gets a new key. Only that choice calls this. */
    forget(a: PaymentAttempt): void {
      drop(a);
    },
  };
  function drop(a: PaymentAttempt): void {
    const n = name(a);
    memory.delete(n);
    try { storage?.removeItem(n); } catch { /* memory only */ }
  }
}

/** The button that lets a genuinely different payment of the same amount through. */
export const DIFFERENT_PAYMENT_LABEL = "This is a different payment - record it too";

/** What a screen says when record-payment refused an attempt as a duplicate of one that got no answer before. */
export function waitingDuplicateMessage(a: PaymentAttempt, who?: string): string {
  const what = a.kind === "correction" ? "correction" : "payment";
  return `An identical ${what} of ${Math.trunc(Number(a.amount)).toLocaleString()} ₫ for ${a.month}${who ? ` (${who})` : ""} was sent earlier `
    + `and got no answer at the time. It WAS recorded, so this one was not recorded again (that would count it twice). `
    + `Reload to see it. If this really is a different ${what} of the same amount, choose "${DIFFERENT_PAYMENT_LABEL}" and save again.`;
}

/** What a screen shows before saving when the entry is exactly one that got no answer before. */
export function waitingNotice(a: PaymentAttempt): string {
  const what = a.kind === "correction" ? "correction" : "payment";
  return `An identical ${what} of ${Math.trunc(Number(a.amount)).toLocaleString()} ₫ for ${a.month} was sent earlier and got no answer. `
    + `Saving again is safe: if that one was recorded, nothing more is recorded.`;
}

function sessionStore(): KeyStorage | null {
  try {
    return typeof sessionStorage !== "undefined" ? sessionStorage : null;
  } catch {
    return null;
  }
}

/** The one store every payment screen shares (module level: it outlives a dialog). */
export const paymentKeys = createPaymentKeyStore(sessionStore());

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
