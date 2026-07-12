import { useState, useMemo } from "react";
import { ChevronRight, Lock, AlertTriangle } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatVND } from "@/hooks/useStudentMonthFinance";
import { useStudentSnapshotTimeline } from "@/hooks/useMonthlyFinanceSnapshots";
import { cn } from "@/lib/utils";

export interface PriorBalanceItem {
  type: 'charge' | 'payment' | 'canceled';
  className?: string;
  classId?: string;
  amount: number;
  description: string;
  date?: string;
}

export interface PriorBalanceMonth {
  month: string;
  label: string;
  charges: number;
  payments: number;
  netBalance: number;
  items: PriorBalanceItem[];
}

export interface PriorBalanceBreakdownData {
  months: PriorBalanceMonth[];
  summary: {
    totalPriorCharges: number;
    totalPriorPayments: number;
    netCarryIn: number;
  };
}

interface Props {
  breakdown: PriorBalanceBreakdownData;
  studentId?: string;
}

function formatShortMonth(monthStr: string): string {
  const date = new Date(`${monthStr}-01`);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatClosedAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Tolerance for treating snapshot vs live values as equal (VND).
// Anything larger surfaces a drift indicator.
const DRIFT_TOLERANCE_VND = 1;

export function PriorBalanceBreakdown({ breakdown, studentId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: snapshots = [] } = useStudentSnapshotTimeline(studentId);

  // Merge live breakdown rows with snapshots so the UI displays one row
  // per month. Snapshots are canonical when present; live values are only
  // used to flag drift when they disagree with the frozen snapshot.
  const merged = useMemo(() => {
    const liveByMonth = new Map(breakdown.months.map((m) => [m.month, m]));
    const snapByMonth = new Map(snapshots.map((s) => [s.month, s]));

    const allMonths = Array.from(new Set([...liveByMonth.keys(), ...snapByMonth.keys()])).sort();

    return allMonths.map((month) => {
      const live = liveByMonth.get(month);
      const snap = snapByMonth.get(month);

      const charges = snap ? snap.total_amount : (live?.charges ?? 0);
      const payments = snap ? snap.recorded_payment : (live?.payments ?? 0);
      // Canonical net balance for this month: charges − payments (negative
      // means overpaid this month). This matches the live breakdown shape.
      const netBalance = -(charges - payments);

      let driftCharges = 0;
      let driftPayments = 0;
      if (snap && live) {
        driftCharges = live.charges - snap.total_amount;
        driftPayments = live.payments - snap.recorded_payment;
      }
      const hasDrift =
        Math.abs(driftCharges) > DRIFT_TOLERANCE_VND ||
        Math.abs(driftPayments) > DRIFT_TOLERANCE_VND;

      return {
        month,
        charges,
        payments,
        netBalance,
        snap: snap ?? null,
        live: live ?? null,
        hasDrift,
        driftCharges,
        driftPayments,
      };
    });
  }, [breakdown.months, snapshots]);

  if (merged.length === 0) {
    return (
      <p className="text-xs text-muted-foreground mt-2">
        No prior balance history
      </p>
    );
  }

  // Re-derive summary off the merged rows so the footer reflects whatever
  // snapshot/live mix is being displayed.
  const summary = merged.reduce(
    (acc, m) => {
      acc.totalPriorCharges += m.charges;
      acc.totalPriorPayments += m.payments;
      return acc;
    },
    { totalPriorCharges: 0, totalPriorPayments: 0 },
  );
  const netCarryIn = summary.totalPriorPayments - summary.totalPriorCharges;
  const driftCount = merged.filter((m) => m.hasDrift).length;

  return (
    <TooltipProvider>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-2 transition-colors">
          <ChevronRight
            className={cn(
              "h-3 w-3 transition-transform duration-200",
              isOpen && "rotate-90"
            )}
          />
          View History
          {driftCount > 0 && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              {driftCount} drift
            </span>
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="mt-3 border-t border-border/50 pt-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-1.5 font-medium">Month</th>
                  <th className="text-right py-1.5 font-medium">Charged</th>
                  <th className="text-right py-1.5 font-medium">Paid</th>
                  <th className="text-right py-1.5 font-medium">Balance</th>
                </tr>
              </thead>
              <tbody>
                {merged.map((m, idx) => {
                  const runningBalance = merged
                    .slice(0, idx + 1)
                    .reduce((sum, x) => sum + x.netBalance, 0);

                  return (
                    <tr key={m.month} className="border-b border-border/30">
                      <td className="py-1.5">
                        <div className="flex items-center gap-1">
                          <span>{formatShortMonth(m.month)}</span>
                          {m.snap && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-0.5">
                                  <p className="font-semibold">Closed {formatClosedAt(m.snap.closed_at)}</p>
                                  <p>Version {m.snap.version}</p>
                                  {m.snap.close_reason && <p className="text-muted-foreground">{m.snap.close_reason}</p>}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                          {m.hasDrift && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-0.5 max-w-[260px]">
                                  <p className="font-semibold">Drift vs snapshot</p>
                                  {Math.abs(m.driftCharges) > DRIFT_TOLERANCE_VND && (
                                    <p>
                                      Live charges differ by {m.driftCharges > 0 ? '+' : ''}
                                      {formatVND(m.driftCharges)}
                                    </p>
                                  )}
                                  {Math.abs(m.driftPayments) > DRIFT_TOLERANCE_VND && (
                                    <p>
                                      Live payments differ by {m.driftPayments > 0 ? '+' : ''}
                                      {formatVND(m.driftPayments)}
                                    </p>
                                  )}
                                  <p className="text-muted-foreground">
                                    Past sessions/attendance/payments were edited after this month closed.
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td className="text-right text-red-600 dark:text-red-400 tabular-nums">
                        {formatVND(m.charges)}
                      </td>
                      <td className="text-right text-green-600 dark:text-green-400 tabular-nums">
                        {formatVND(m.payments)}
                      </td>
                      <td className={cn(
                        "text-right font-medium tabular-nums",
                        runningBalance > 0 && "text-green-600 dark:text-green-400",
                        runningBalance < 0 && "text-red-600 dark:text-red-400"
                      )}>
                        {runningBalance > 0 ? '+' : ''}{formatVND(runningBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-semibold bg-muted/30">
                  <td className="py-2">Total</td>
                  <td className="text-right text-red-600 dark:text-red-400 tabular-nums">
                    {formatVND(summary.totalPriorCharges)}
                  </td>
                  <td className="text-right text-green-600 dark:text-green-400 tabular-nums">
                    {formatVND(summary.totalPriorPayments)}
                  </td>
                  <td className={cn(
                    "text-right tabular-nums",
                    netCarryIn > 0 && "text-green-600 dark:text-green-400",
                    netCarryIn < 0 && "text-red-600 dark:text-red-400"
                  )}>
                    {netCarryIn > 0 ? '+' : ''}{formatVND(netCarryIn)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {driftCount > 0 && (
              <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>
                  {driftCount} closed month{driftCount === 1 ? "" : "s"} now disagree with a live recompute.
                  This indicates retroactive edits to attendance, sessions, or payments after the month was
                  closed. Snapshot values shown above are the audit truth; live values can be inspected by
                  re-closing the month with a reason.
                </span>
              </p>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}
