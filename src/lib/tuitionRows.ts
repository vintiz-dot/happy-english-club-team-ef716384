/**
 * calculate-tuition-bulk's answer for one student, in the shape the admin
 * tuition list draws.
 *
 * WHY THIS FILE EXISTS. The admin tuition list (/tuition) used to work the
 * carried balance out a second time, in the browser: it summed
 * recorded_payment - total_amount over every earlier invoice row, split the
 * result into credit and debt, added this month's SAVED total and clamped a
 * carry-out from that. The calculator does the same sum, but with this
 * month's charge worked out from the register, so the two parted whenever
 * the saved bill was missing or out of date - a student with no bill yet
 * read as owing nothing for the month - and the list never knew a debt had
 * been settled in a later month.
 *
 * The list no longer computes anything. It reads the function and this
 * module hands its figures over. There is NO arithmetic on money here: no
 * sum, no difference, no clamp, no sign flip. A figure is either the number
 * the function sent or null, and null is drawn as words ("Not available"),
 * never as 0 and never as a guess.
 *
 * It imports nothing, so scripts/tuitionRows.test.ts and
 * scripts/pgtest/tuition-prior-balance.test.mjs can drive it without a
 * browser - the second one against the real function's answers.
 */

/** One entry of calculate-tuition-bulk's `results`, narrowed to what the list reads. */
export interface TuitionFunctionResult {
  studentId?: string | null;
  /** The function could not work this student out. */
  error?: unknown;
  baseAmount?: number | null;
  totalDiscount?: number | null;
  /** This month's charge. The saved figure when the bill is frozen. */
  totalAmount?: number | null;
  payments?: { monthPayments?: number | null } | null;
  carry?: {
    carryInCredit?: number | null;
    carryInDebt?: number | null;
    carryOutCredit?: number | null;
    carryOutDebt?: number | null;
    settledInMonth?: string | null;
    /**
     * Charge plus what was carried in. NOT in the function's answer today
     * (12 Nov 2026); read here so that the day it is, the screen shows the
     * function's own figure.
     */
    payable?: number | null;
  } | null;
  invoiceId?: string | null;
  invoiceStatus?: string | null;
  confirmationStatus?: string | null;
  /** calculate-tuition sends these; the bulk function does not yet. */
  siblingState?: { status?: string | null } | null;
  siblingUnresolved?: boolean | null;
  tuitionFrozen?: boolean | null;
}

/**
 * ready       - every figure below is the function's.
 * pending     - the family discount is still being decided: the charge is
 *               provisional, so no figure is shown until it is settled.
 * unavailable - no answer, an error, or an answer missing a figure.
 */
export type TuitionFigureState = "ready" | "pending" | "unavailable";

export interface TuitionFigures {
  state: TuitionFigureState;
  base: number | null;
  discount: number | null;
  charge: number | null;
  paid: number | null;
  carryInCredit: number | null;
  carryInDebt: number | null;
  carryOutCredit: number | null;
  carryOutDebt: number | null;
  /** The function's own payable, when it sends one. */
  payable: number | null;
  settledInMonth: string | null;
  invoiceId: string | null;
  invoiceStatus: string | null;
  confirmationStatus: string | null;
  frozen: boolean;
}

export const NOT_AVAILABLE = "Not available";
export const BEING_CALCULATED = "Being calculated";

const amount = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const text = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

const NO_FIGURES = {
  base: null,
  discount: null,
  charge: null,
  paid: null,
  carryInCredit: null,
  carryInDebt: null,
  carryOutCredit: null,
  carryOutDebt: null,
  payable: null,
  settledInMonth: null,
} as const;

/** The function's answer for one student -> the figures the list may show. */
export function tuitionFigures(result: TuitionFunctionResult | null | undefined): TuitionFigures {
  const identity = {
    invoiceId: text(result?.invoiceId),
    invoiceStatus: text(result?.invoiceStatus),
    confirmationStatus: text(result?.confirmationStatus),
    frozen: result?.tuitionFrozen === true,
  };
  if (!result || result.error) return { state: "unavailable", ...NO_FIGURES, ...identity };

  // A provisional bill is not a figure. Nothing of it is passed on.
  if (result.siblingUnresolved === true || result.siblingState?.status === "unresolved") {
    return { state: "pending", ...NO_FIGURES, ...identity };
  }

  const figures = {
    base: amount(result.baseAmount),
    discount: amount(result.totalDiscount),
    charge: amount(result.totalAmount),
    paid: amount(result.payments?.monthPayments),
    carryInCredit: amount(result.carry?.carryInCredit),
    carryInDebt: amount(result.carry?.carryInDebt),
    carryOutCredit: amount(result.carry?.carryOutCredit),
    carryOutDebt: amount(result.carry?.carryOutDebt),
  };
  // One missing figure makes the status and the balance unknowable, so the
  // whole row says so instead of showing the half that arrived.
  if (Object.values(figures).some((value) => value === null)) {
    return { state: "unavailable", ...NO_FIGURES, ...identity };
  }
  return {
    state: "ready",
    ...figures,
    payable: amount(result.carry?.payable),
    settledInMonth: text(result.carry?.settledInMonth),
    ...identity,
  };
}

/** A carried amount as the list words it: who it is owed by, never a sign. */
export type CarriedAmount =
  | { kind: "owed"; amount: number }
  | { kind: "credit"; amount: number }
  | { kind: "none"; amount: null }
  | { kind: "pending"; amount: null }
  | { kind: "unavailable"; amount: null };

function carried(state: TuitionFigureState, debt: number | null, credit: number | null): CarriedAmount {
  if (state === "pending") return { kind: "pending", amount: null };
  if (state !== "ready" || debt === null || credit === null) return { kind: "unavailable", amount: null };
  if (debt > 0) return { kind: "owed", amount: debt };
  if (credit > 0) return { kind: "credit", amount: credit };
  return { kind: "none", amount: null };
}

/** "Prior Bal.": what the function carried INTO the month. */
export const carriedIn = (f: TuitionFigures): CarriedAmount => carried(f.state, f.carryInDebt, f.carryInCredit);
/** "Balance": what the function carried OUT of the month - what the family owes now. */
export const carriedOut = (f: TuitionFigures): CarriedAmount => carried(f.state, f.carryOutDebt, f.carryOutCredit);

/** What getPaymentStatus needs, or null while there is nothing to judge. */
export function tuitionStatusInput(f: TuitionFigures): {
  carryOutDebt: number;
  carryOutCredit: number;
  totalAmount: number;
  monthPayments: number;
  settledInMonth: string | null;
} | null {
  if (f.state !== "ready" || f.carryOutDebt === null || f.carryOutCredit === null || f.charge === null || f.paid === null) {
    return null;
  }
  return {
    carryOutDebt: f.carryOutDebt,
    carryOutCredit: f.carryOutCredit,
    totalAmount: f.charge,
    monthPayments: f.paid,
    settledInMonth: f.settledInMonth,
  };
}

/** The words shown where a figure would be, while there is none. */
export const figurePlaceholder = (state: TuitionFigureState): string =>
  state === "pending" ? BEING_CALCULATED : NOT_AVAILABLE;

/** A figure as text, or the placeholder. `format` is the screen's own formatter. */
export function figureText(f: TuitionFigures, value: number | null, format: (n: number) => string): string {
  return f.state === "ready" && value !== null ? format(value) : figurePlaceholder(f.state);
}

/**
 * Sort order, largest first, rows without a figure last. A comparison, not a
 * subtraction: nothing here produces a number of money.
 */
export function largestFirst(a: number | null, b: number | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a > b ? -1 : a < b ? 1 : 0;
}

/**
 * The function's own `carry.payable`, whatever else the answer says, or null
 * when the function (one deployed before 12 Nov 2026) did not send it.
 */
export function payableFromFunction(result: TuitionFunctionResult | null | undefined): number | null {
  return amount(result?.carry?.payable);
}

export interface TuitionCell {
  text: string;
  accent?: "green" | "red" | "blue";
}

/** Everything one row of the admin tuition list says about money, as words. */
export interface TuitionRowCells {
  /** The balance in the row's header: "Settled" when nothing is owed either way. */
  headerBalance: { text: string; tone: "owed" | "credit" | "quiet" };
  base: TuitionCell;
  discount: TuitionCell;
  prior: TuitionCell;
  payable: TuitionCell;
  paid: TuitionCell;
  balance: TuitionCell;
  /** A payment may be recorded only against a row whose figures are the function's. */
  canRecordPay: boolean;
}

/**
 * The cells of one row. `format` is the screen's money formatter.
 *
 * `olderFunctionPayable` is used only when the function sent no
 * `carry.payable` (see src/lib/liveTuitionItem.ts); it is never looked at
 * for a row that is pending or unavailable.
 */
export function tuitionRowCells(
  f: TuitionFigures,
  format: (n: number) => string,
  olderFunctionPayable?: number | null,
): TuitionRowCells {
  const none = figurePlaceholder(f.state);
  const carriedCell = (c: CarriedAmount, nothing: string): TuitionCell =>
    c.kind === "owed"
      ? { text: format(c.amount), accent: "red" }
      : c.kind === "credit"
        ? { text: `+${format(c.amount)}`, accent: "green" }
        : { text: c.kind === "none" ? nothing : none };
  const out = carriedOut(f);
  const payable = f.state === "ready" ? (f.payable ?? amount(olderFunctionPayable)) : null;
  return {
    headerBalance:
      out.kind === "owed"
        ? { text: format(out.amount), tone: "owed" }
        : out.kind === "credit"
          ? { text: `+${format(out.amount)}`, tone: "credit" }
          : { text: out.kind === "none" ? "Settled" : none, tone: "quiet" },
    base: { text: figureText(f, f.base, format) },
    discount:
      f.discount === null
        ? { text: none }
        : f.discount > 0
          ? { text: `−${format(f.discount)}`, accent: "green" }
          : { text: "—" },
    prior: carriedCell(carriedIn(f), "—"),
    payable: { text: payable === null ? none : format(payable) },
    paid: { text: figureText(f, f.paid, format), accent: "blue" },
    balance: carriedCell(out, format(0)),
    canRecordPay: f.state === "ready",
  };
}
