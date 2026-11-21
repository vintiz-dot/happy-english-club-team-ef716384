// What a payments row is (tuition audit phase 3, migration 20261121110000).
//
// payments.source is 'receipt' (money received - every row before the
// migration, and the default) or 'historical': an OPENING BALANCE, the part of
// a bill's recorded_payment that was already there before the 17 Nov 2026
// payment path, with no receipt behind it. A historical row stands behind
// money the bill already holds. It is never cash received on top of the bill,
// has no ledger legs, and cannot be deleted (the guard trigger refuses it,
// service_role included).
//
// Readers fetch payments with select('*') so that a function deployed before
// the migration still works: a row without `source` is a receipt.
//
// Imports nothing, so it can be bundled into a test as it is.

export const HISTORICAL_SOURCE = "historical";

export interface PaymentRowLike {
  id?: string;
  amount?: number | string | null;
  source?: string | null;
  month?: string | null;
  occurred_at?: string | null;
  created_at?: string;
  created_by?: string | null;
  method?: string | null;
  memo?: string | null;
  parent_payment_id?: string | null;
}

export function isHistoricalPayment(p: PaymentRowLike | null | undefined): boolean {
  return !!p && p.source === HISTORICAL_SOURCE;
}

export const HISTORICAL_DELETE_REFUSAL =
  "This is an opening-balance row from the tuition audit (recorded on the bill before 17 Nov 2026, no receipt behind it). " +
  "It is not a payment that can be deleted, and the money on its bill stays. Nothing was changed; " +
  "to correct the bill, record a correction through Record Payment.";

export type PaymentEventKind = "payment" | "adjustment";

/**
 * How student-audit lists a payments row. A receipt is a payment (a
 * negative one, a record-payment correction, an adjustment). A historical
 * row is an adjustment labelled as an opening balance, in the month of its
 * bill: the Account Statement's "Payments received" lists only payment and
 * correction events, so it never prints it, and the audit_log bump it stands
 * behind is not counted a second time.
 */
export function paymentAuditEvent(p: PaymentRowLike) {
  const amount = Number(p.amount ?? 0);
  if (isHistoricalPayment(p)) {
    return {
      kind: "adjustment" as PaymentEventKind,
      label: "Opening balance (already on the bill before 17 Nov 2026; no receipt on record)",
      amount,
      month: p.month ?? (p.occurred_at ? String(p.occurred_at).slice(0, 7) : null),
    };
  }
  const correction = amount < 0;
  return {
    kind: (correction ? "adjustment" : "payment") as PaymentEventKind,
    label: correction ? "Payment correction (taken off the bill)"
      : p.parent_payment_id ? "Payment (part of a family payment)" : "Payment",
    amount,
    month: p.occurred_at ? String(p.occurred_at).slice(0, 7) : null,
  };
}

/** Receipts only: money that came in, not opening balances. */
export function receiptRows<T extends PaymentRowLike>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).filter((p) => !isHistoricalPayment(p));
}
