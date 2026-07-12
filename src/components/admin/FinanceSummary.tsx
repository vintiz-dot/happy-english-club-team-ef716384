import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Wallet,
  Skull,
  CheckCircle,
  Lock,
  AlertTriangle,
  Eye,
  EyeOff,
} from "lucide-react";
import { useFinanceOverview, LOST_REVENUE_THRESHOLD_VND, FinanceMetrics } from "@/hooks/useFinanceOverview";
import { useEarliestFinanceMonth } from "@/hooks/useEarliestFinanceMonth";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";

function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(amount);
}

function formatClosedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function FinanceSummary() {
  const { data: earliestMonth } = useEarliestFinanceMonth();
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [showLiveOnClosed, setShowLiveOnClosed] = useState(false);

  const { data, isLoading } = useFinanceOverview(selectedMonth);

  // Pick the metrics set to display:
  //   - Open month: always live.
  //   - Closed month: snapshot by default; admin can toggle to inspect live.
  const displayed: FinanceMetrics = data
    ? data.isClosed && data.snapshot && !showLiveOnClosed
      ? data.snapshot
      : data.live
    : ({
        totalExpectedRevenue: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        lostRevenueCount: 0,
        lostRevenueVnd: 0,
        grossTuition: 0,
        totalDiscounts: 0,
        totalTuitionThisMonth: 0,
        collectionRate: 0,
        studentCount: 0,
      } as FinanceMetrics);

  const showingMode = data?.isClosed
    ? showLiveOnClosed
      ? "live"
      : "snapshot"
    : "live";

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Finance Summary
              {data?.isClosed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 border-emerald-300 text-emerald-700 dark:text-emerald-300">
                      <Lock className="h-3 w-3" />
                      Closed
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      All {displayed.studentCount} students snapshotted. Closed{" "}
                      {data.closedAt ? formatClosedDate(data.closedAt) : "—"}.
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
              {data?.drift?.hasMaterialDrift && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="gap-1 border-amber-300 text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" />
                      Drift
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs space-y-1 max-w-[260px]">
                      <p className="font-semibold">Live recompute differs from snapshot</p>
                      {Math.abs(data.drift.revenueDelta) > 0 && (
                        <p>Revenue: {data.drift.revenueDelta > 0 ? "+" : ""}{formatVND(data.drift.revenueDelta)}</p>
                      )}
                      {Math.abs(data.drift.collectedDelta) > 0 && (
                        <p>Collected: {data.drift.collectedDelta > 0 ? "+" : ""}{formatVND(data.drift.collectedDelta)}</p>
                      )}
                      <p className="text-muted-foreground">
                        Sessions/attendance/payments were edited after this month closed.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {showingMode === "snapshot"
                ? "Showing audit-grade snapshot. Toggle to live to inspect drift."
                : "Showing live values — every session add/cancel is reflected immediately."}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {data?.isClosed && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setShowLiveOnClosed((v) => !v)}
              >
                {showLiveOnClosed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showLiveOnClosed ? "Show snapshot" : "Show live"}
              </Button>
            )}
            <MonthPicker
              value={selectedMonth}
              onChange={setSelectedMonth}
              minMonth={earliestMonth}
              maxMonth={dayjs().add(2, "month").format("YYYY-MM")}
            />
          </div>
        </div>

        {/* Core 4 metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            icon={DollarSign}
            label="Total Expected Revenue"
            value={isLoading ? "—" : formatVND(displayed.totalExpectedRevenue)}
            sub={
              isLoading
                ? undefined
                : `${displayed.studentCount} student${displayed.studentCount === 1 ? "" : "s"} • includes carry-in`
            }
            tone="primary"
          />
          <MetricCard
            icon={CheckCircle}
            label="Total Collected"
            value={isLoading ? "—" : formatVND(displayed.totalCollected)}
            sub={isLoading ? undefined : `${displayed.collectionRate}% of expected`}
            tone="emerald"
          />
          <MetricCard
            icon={Wallet}
            label="Total Outstanding"
            value={isLoading ? "—" : formatVND(displayed.totalOutstanding)}
            sub="Expected − Collected"
            tone="amber"
          />
          <MetricCard
            icon={Skull}
            label="Lost Revenues"
            value={
              isLoading
                ? "—"
                : `${displayed.lostRevenueCount} student${displayed.lostRevenueCount === 1 ? "" : "s"}`
            }
            sub={isLoading ? undefined : `${formatVND(displayed.lostRevenueVnd)} • debt > ${formatVND(LOST_REVENUE_THRESHOLD_VND)}`}
            tone="destructive"
          />
        </div>

        {/* Secondary: costs + net */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Billed (this month)</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatVND(displayed.totalTuitionThisMonth)}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <p>Gross: {isLoading ? "..." : formatVND(displayed.grossTuition)}</p>
                <p>Discounts: {isLoading ? "..." : `−${formatVND(displayed.totalDiscounts)}`}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Teacher Salary</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatVND(data?.totalSalaryActual ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected: {isLoading ? "..." : formatVND(data?.totalSalaryProjected ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expenditures & Excused</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : formatVND((data?.totalExpenditures ?? 0) + (data?.excusedLoss ?? 0))}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                <p>Operating: {isLoading ? "..." : formatVND(data?.totalExpenditures ?? 0)}</p>
                <p className="text-amber-600">
                  Excused loss: {isLoading ? "..." : formatVND(data?.excusedLoss ?? 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  (data?.netActual ?? 0) < 0 ? "text-destructive" : "text-emerald-600"
                }`}
              >
                {isLoading ? "..." : formatVND(data?.netActual ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected: {isLoading ? "..." : formatVND(data?.netProjected ?? 0)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone: "primary" | "emerald" | "amber" | "destructive";
}) {
  const toneClasses: Record<string, string> = {
    primary: "from-primary/15 to-primary/5 text-primary",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
    amber: "from-amber-500/15 to-amber-500/5 text-amber-600 dark:text-amber-400",
    destructive: "from-red-500/15 to-red-500/5 text-red-600 dark:text-red-400",
  };
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none ${toneClasses[tone].split(" ").slice(0, 2).join(" ")}`} />
      <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${toneClasses[tone].split(" ").slice(2).join(" ")}`} />
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}
