/**
 * Loads one month's bills, payments and cash / bank ledger legs and runs the
 * early-warning checks over them (src/lib/finance/paymentChecks.ts). Read
 * only. A source that fails to load turns its checks "unavailable" instead of
 * reporting a clean month.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  keyIds,
  monthTotals,
  runPaymentChecks,
  type BillAmountRow,
  type CashLeg,
  type CheckBill,
  type CheckPayment,
  type CheckResult,
  type MonthTotals,
  type RegisterGap,
} from "@/lib/finance/paymentChecks";

export interface CheckedBill extends CheckBill {
  discount_amount: number | null;
  paid_amount: number | null;
  student_name: string;
}

export interface PaymentChecksData {
  month: string;
  bills: CheckedBill[];
  payments: CheckPayment[] | null;
  totals: MonthTotals;
  checks: CheckResult;
  names: Map<string, string>;
  /** The raw sources, for the forensic trail (null = did not load). */
  billAmounts: BillAmountRow[] | null;
  cashLegs: CashLeg[] | null;
  knownPaymentIds: Set<string> | null;
}

const PAGE = 1000;

/** Every row of a query, a page at a time (PostgREST stops at 1000). */
async function allRows<T>(make: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await make(from, from + PAGE - 1);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

/** A loader that reports null instead of throwing, so one source cannot blank the screen. */
async function maybe<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (e) {
    console.warn("[payment checks] a source did not load", e);
    return null;
  }
}

export function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export async function loadPaymentChecks(month: string): Promise<PaymentChecksData> {
  const start = `${month}-01T00:00:00+07:00`;
  const end = `${nextMonth(month)}-01T00:00:00+07:00`;
  const sb = supabase as any;

  const billsP = allRows<any>((a, b) =>
    sb
      .from("invoices")
      .select("id, student_id, month, base_amount, discount_amount, total_amount, carry_in_debt, carry_in_credit, recorded_payment, paid_amount, status, students(full_name)")
      .eq("month", month)
      .order("id")
      .range(a, b),
  );
  const billAmountsP = maybe(() =>
    allRows<BillAmountRow>((a, b) =>
      sb.from("payment_bill_amounts").select("payment_id, source, student_id, month, amount").eq("month", month).range(a, b),
    ),
  );
  const paymentsP = maybe(async () => {
    const [dated, opening] = await Promise.all([
      allRows<CheckPayment>((a, b) =>
        sb.from("payments").select("id, student_id, amount, method, occurred_at, source, month")
          .gte("occurred_at", start).lt("occurred_at", end).order("id").range(a, b),
      ),
      allRows<CheckPayment>((a, b) =>
        sb.from("payments").select("id, student_id, amount, method, occurred_at, source, month")
          .eq("source", "historical").eq("month", month).order("id").range(a, b),
      ),
    ]);
    const seen = new Set(dated.map((p) => p.id));
    return [...dated, ...opening.filter((p) => !seen.has(p.id))];
  });
  const legsP = maybe(async () => {
    const rows = await allRows<any>((a, b) =>
      sb.from("ledger_entries").select("tx_key, month, debit, credit, ledger_accounts!inner(code)")
        .not("tx_key", "is", null).in("ledger_accounts.code", ["CASH", "BANK"]).order("id").range(a, b),
    );
    return rows.map((r) => ({ tx_key: r.tx_key, month: r.month, debit: r.debit, credit: r.credit })) as CashLeg[];
  });
  const gapsP = maybe(async () => {
    const { data, error } = await sb.rpc("tuition_bill_gaps", { p_month: month });
    if (error) throw error;
    return (data ?? []) as Array<RegisterGap & { full_name?: string }>;
  });

  const [rawBills, billAmounts, payments, cashLegs, gaps] = await Promise.all([billsP, billAmountsP, paymentsP, legsP, gapsP]);

  // Which ids in the legs' keys are payments that still exist.
  const knownPaymentIds = cashLegs
    ? await maybe(async () => {
        const ids = [...new Set(cashLegs.flatMap((l) => keyIds(l.tx_key)))];
        const found = new Set<string>();
        for (let i = 0; i < ids.length; i += 100) {
          const { data, error } = await sb.from("payments").select("id").in("id", ids.slice(i, i + 100));
          if (error) throw error;
          for (const r of data ?? []) found.add(String(r.id).toLowerCase());
        }
        return found;
      })
    : null;

  const names = new Map<string, string>();
  const bills: CheckedBill[] = rawBills.map((r) => {
    const name = r.students?.full_name ?? "Unknown student";
    names.set(r.student_id, name);
    return { ...r, student_name: name };
  });
  for (const g of gaps ?? []) if (g.full_name && !names.has(g.student_id)) names.set(g.student_id, g.full_name);
  bills.sort((a, b) => a.student_name.localeCompare(b.student_name));

  const checks = runPaymentChecks({
    month, bills, billAmounts, payments, cashLegs, knownPaymentIds, gaps, now: new Date().toISOString(),
  });
  // A payment's own student may have no bill this month (paid ahead / late).
  const missing = [...new Set((payments ?? []).map((p) => p.student_id).filter((id) => !names.has(id)))];
  if (missing.length) {
    const { data } = await sb.from("students").select("id, full_name").in("id", missing.slice(0, 200));
    for (const s of data ?? []) names.set(s.id, s.full_name);
  }
  return {
    month, bills, payments, totals: monthTotals(bills, payments, month), checks, names,
    billAmounts, cashLegs, knownPaymentIds,
  };
}

export function usePaymentChecks(month: string) {
  return useQuery<PaymentChecksData>({
    queryKey: ["payment-checks", month],
    queryFn: () => loadPaymentChecks(month),
    staleTime: 30_000,
  });
}
