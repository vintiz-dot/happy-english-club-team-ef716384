/**
 * Reports > Executive: the month on one screen.
 *
 *   1. Red flags - the discrepancy checks (src/lib/finance/paymentChecks.ts),
 *      counted, with the same list Finance > Recorded shows.
 *   2. Cash in against billed - monthTotals over the month's bills and receipts.
 *   3. Profit and margin - useFinanceSummary, the same figures as Finance >
 *      Summary (payroll from calculate-payroll, never priced here).
 *   4. Trend - the last six months' bills, payable and recorded money.
 *
 * Read only. Every figure comes from a function or helper another screen
 * already uses; this page adds no calculation of its own beyond sums.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loading } from "@/components/ui/loading";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { formatVND } from "@/lib/money";
import { monthTotals, type CheckBill, type MonthTotals } from "@/lib/finance/paymentChecks";
import { usePaymentChecks } from "@/hooks/usePaymentChecks";
import { useFinanceSummary } from "@/hooks/useFinanceSummary";
import { MonthMoneyTiles, Tile } from "@/components/admin/finance/MonthMoneyTiles";
import { PaymentChecksPanel } from "@/components/admin/finance/PaymentChecksPanel";

const TREND_MONTHS = 6;

export function monthOptions(): { value: string; label: string }[] {
  const now = dayjs().tz().startOf("month");
  return Array.from({ length: 15 }, (_, i) => now.add(2 - i, "month")).map((d) => ({
    value: d.format("YYYY-MM"),
    label: d.format("MMMM YYYY"),
  }));
}

function useTrend(endMonth: string) {
  return useQuery({
    queryKey: ["executive-trend", endMonth],
    staleTime: 60_000,
    queryFn: async () => {
      const months = Array.from({ length: TREND_MONTHS }, (_, i) =>
        dayjs(`${endMonth}-01`).subtract(TREND_MONTHS - 1 - i, "month").format("YYYY-MM"),
      );
      const rows: CheckBill[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await (supabase as any)
          .from("invoices")
          .select("id, student_id, month, base_amount, total_amount, carry_in_debt, carry_in_credit, recorded_payment, status")
          .in("month", months)
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return months.map((m) => ({ month: m, totals: monthTotals(rows.filter((r) => r.month === m), null, m) }));
    },
  });
}

/** Share of payable collected, bill by bill: one family paying ahead does not hide another's debt. */
const collected = (t: MonthTotals) => (t.payable > 0 ? Math.max(0, Math.round(((t.payable - t.outstanding) / t.payable) * 100)) : null);

function Delta({ now, before, money = true, invert = false }: { now: number; before: number | undefined; money?: boolean; invert?: boolean }) {
  if (before == null) return null;
  const d = now - before;
  if (d === 0) return <span className="inline-flex items-center gap-0.5"><Minus className="h-3 w-3" aria-hidden />same as last month</span>;
  const good = invert ? d < 0 : d > 0;
  const Icon = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 ${good ? "text-hec-leaf" : "text-hec-danger"}`}>
      <Icon className="h-3 w-3" aria-hidden />
      {money ? formatVND(Math.abs(d)) : Math.abs(d)} vs last month
    </span>
  );
}

export default function ExecutiveReport({ onOpenForensic }: { onOpenForensic?: () => void }) {
  const [month, setMonth] = useState(() => dayjs().tz().format("YYYY-MM"));
  const prevMonth = dayjs(`${month}-01`).subtract(1, "month").format("YYYY-MM");
  const monthLabel = dayjs(`${month}-01`).format("MMMM YYYY");

  const checks = usePaymentChecks(month);
  const finance = useFinanceSummary(month);
  const financePrev = useFinanceSummary(prevMonth);
  const trend = useTrend(month);
  const prevTotals: MonthTotals | undefined = trend.data?.find((t) => t.month === prevMonth)?.totals;

  const f = finance.data;
  const fp = financePrev.data;
  const margin = f && f.totalTuition > 0 ? Math.round((f.netActual / f.totalTuition) * 100) : null;
  const maxPayable = Math.max(1, ...(trend.data ?? []).map((t) => t.totals.payable));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="w-[200px]" aria-label="Month"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions().map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-hec-ink-soft">The school's month on one screen. Click a flagged student to open the forensic view.</p>
      </div>

      {/* 1. Red flags */}
      {checks.data?.month === month ? (
        <PaymentChecksPanel checks={checks.data.checks} names={checks.data.names} monthLabel={monthLabel} compact onSelectStudent={onOpenForensic ? () => onOpenForensic() : undefined} />
      ) : checks.isError ? (
        <p className="text-sm text-hec-danger">The checks could not run: {(checks.error as Error)?.message}</p>
      ) : (
        <Loading size="sm" className="py-4" />
      )}

      {/* 2. Cash in vs billed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><Wallet className="h-5 w-5" aria-hidden />Cash in against billed</CardTitle>
          <CardDescription>
            Recorded = money on {monthLabel}'s bills. Received = receipts dated in the month (a payment for another month's bill is counted there).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {checks.data?.month === month ? (
            <>
              <MonthMoneyTiles totals={checks.data.totals} />
              {prevTotals && (
                <p className="text-xs text-hec-ink-soft">
                  Recorded: <Delta now={checks.data.totals.recorded} before={prevTotals.recorded} /> · Still owed:{" "}
                  <Delta now={checks.data.totals.outstanding} before={prevTotals.outstanding} invert />
                </p>
              )}
            </>
          ) : (
            <Loading size="sm" className="py-4" />
          )}
        </CardContent>
      </Card>

      {/* 3. Profit and margin */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5" aria-hidden />Profit and margin</CardTitle>
          <CardDescription>Charged tuition less payroll (calculate-payroll) and operating costs: the Finance Summary figures.</CardDescription>
        </CardHeader>
        <CardContent>
          {f ? (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile label="Tuition charged" value={formatVND(f.totalTuition)} sub={<Delta now={f.totalTuition} before={fp?.totalTuition} />} />
              <Tile label="Payroll" value={formatVND(f.totalSalaryActual)} sub={<Delta now={f.totalSalaryActual} before={fp?.totalSalaryActual} invert />} />
              <Tile label="Operating costs" value={formatVND(f.operatingExpenditures)} sub={<Delta now={f.operatingExpenditures} before={fp?.operatingExpenditures} invert />} />
              <Tile
                label="Net profit"
                value={formatVND(f.netActual)}
                tone={f.netActual < 0 ? "danger" : "leaf"}
                sub={<>{margin == null ? "no tuition" : `${margin}% margin`} · <Delta now={f.netActual} before={fp?.netActual} /></>}
              />
            </div>
          ) : finance.isError ? (
            <p className="text-sm text-hec-danger">The profit figures could not be loaded.</p>
          ) : (
            <Loading size="sm" className="py-4" />
          )}
          {f && ((f as any).payrollDiscrepancies ?? 0) > 0 && (
            <p className="mt-2 text-xs text-hec-warn">
              {(f as any).payrollDiscrepancies} lesson(s) have a length that disagrees with the class setting, so payroll and net profit may move.
            </p>
          )}
        </CardContent>
      </Card>

      {/* 4. Trend */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Last {TREND_MONTHS} months</CardTitle>
          <CardDescription>Bills, payable and money recorded on each month's bills. The bar is the share of payable collected.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {trend.data ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Bills</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead className="text-right">Recorded</TableHead>
                  <TableHead className="text-right">Still owed</TableHead>
                  <TableHead className="min-w-[10rem]">Collected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trend.data.map(({ month: m, totals: t }) => {
                  const rate = collected(t);
                  return (
                    <TableRow key={m} className={m === month ? "bg-hec-sunken" : undefined}>
                      <TableCell className="whitespace-nowrap font-medium">{dayjs(`${m}-01`).format("MMM YYYY")}</TableCell>
                      <TableCell className="text-right tabular-nums">{t.bills}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVND(t.payable)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVND(t.recorded)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatVND(t.outstanding)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2" title={`${rate ?? 0}% of ${formatVND(t.payable)}`}>
                          <div className="h-2 flex-1 rounded-full bg-hec-sunken" style={{ maxWidth: `${Math.max(8, (t.payable / maxPayable) * 100)}%` }}>
                            <div className="h-2 rounded-full bg-hec-action" style={{ width: `${rate ?? 0}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums text-hec-ink-soft">{rate == null ? "—" : `${rate}%`}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : trend.isError ? (
            <p className="text-sm text-hec-danger">The trend could not be loaded.</p>
          ) : (
            <Loading size="sm" className="py-4" />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
