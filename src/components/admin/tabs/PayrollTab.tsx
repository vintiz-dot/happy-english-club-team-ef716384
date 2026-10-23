import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Download, Receipt } from "lucide-react";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHero } from "@/components/quest/PageHero";
import { PayrollMonthLock } from "@/components/admin/payroll/PayrollMonthLock";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { formatMinutes, formatSignedMinutes } from "@/lib/sessionDuration";
import { AlertTriangle } from "lucide-react";
import { describeRate, effectiveRateVnd } from "@/lib/payRate";
import { canBookPayroll } from "@/lib/payrollCalculation";
import { payrollRows } from "@/lib/payrollRows";

/**
 * WHERE THE NUMBERS COME FROM.
 *
 * calculate-payroll, and nowhere else. This screen used to recompute the
 * entire month itself - resolving rates per session, judging each session
 * against the timetable in force on its date, totalling it - alongside
 * the edge function doing the same thing from the same tables. They
 * drifted three times, and each time this copy was the one that was wrong
 * in the direction of overpaying: a duration that went negative across
 * midnight, a month priced at today's rate after pay became
 * effective-dated, and assistants paid for lessons they were marked
 * absent for.
 *
 * None of that was a hard bug to make. It was the same bug each time -
 * two implementations of one rule, one of them updated. So the second
 * implementation is gone. @/lib/payrollRows renames the function's answer
 * into the rows below and does arithmetic on figures it has already
 * decided; it prices nothing.
 *
 * ONE THING THIS SCREEN STILL NEEDS DIFFERENTLY. For a closed month the
 * function reports what the month was CLOSED at, which is right for the
 * dashboard. PayrollMonthLock, directly below, compares what this screen
 * shows against those same stored lines to find corrections worth
 * carrying into the next month - so it needs the figures as they
 * recompute now. payrollRows takes those from the function's `live`
 * block, which is why the lock panel keeps working.
 */
export function PayrollTab() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const queryClient = useQueryClient();

  const { data: period, isSuccess: periodLoaded } = useQuery({
    queryKey: ["payroll-period", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.from("payroll_periods")
        .select("month, status, locked_at, locked_by, reopened_at, reopen_reason")
        .eq("month", selectedMonth).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const bookingAllowed = canBookPayroll(period?.status, periodLoaded);

  const { data: payrollData, isLoading, error: payrollError } = useQuery({
    queryKey: ["admin-payroll", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: selectedMonth },
      });
      if (error) throw error;
      // A 200 carrying an error field: the function answered, and what it
      // answered was that it could not work the month out.
      if (data?.error) throw new Error(data.error);
      return payrollRows(data?.payrollData);
    },
  });

  const addToExpendituresMutation = useMutation({
    mutationFn: async () => {
      // Re-read on click: another admin may have closed the month since render.
      const { data: currentPeriod, error: periodError } = await supabase.from("payroll_periods")
        .select("status").eq("month", selectedMonth).maybeSingle();
      if (periodError) throw periodError;
      if (!canBookPayroll(currentPeriod?.status, true)) {
        throw new Error("Payroll is closed. Reopen the month before changing its expenditures.");
      }
      if (!payrollData) return;
      const items = payrollData.filter(p => p.totalEarned > 0);
      if (items.length === 0) throw new Error("No earned payroll to record");

      const lastDayOfMonth = dayjs(`${selectedMonth}-01`).endOf("month").format("YYYY-MM-DD");

      const rows = items.map(p => ({
        amount: p.totalEarned,
        category: p.staffType === "ta" ? "TA Payroll" : "Teacher Payroll",
        memo: `${p.staff.full_name} – ${selectedMonth}`,
        date: lastDayOfMonth,
        // What this row is, so booking it twice updates it instead of
        // charging the school twice. source_kind + source_key carry a
        // unique constraint (20261021092000); hand-entered expenditures
        // leave both NULL and stay freely repeatable, because a UNIQUE
        // constraint treats NULLs as distinct.
        source_kind: "payroll",
        source_key: `${selectedMonth}:${p.staffType === "ta" ? "assistant" : "teacher"}:${p.staff.id}`,
      }));

      const { error } = await supabase
        .from("expenditures")
        .upsert(rows, { onConflict: "source_kind,source_key", ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll booked to expenditures");
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportPayroll = () => {
    const csv = [
      ["Staff", "Type", "Status", "Paid", "Rate (VND)", "Held Sessions", "Scheduled Sessions", "Earned", "Projected", "Total Projected", "At Class Settings", "Variance", "Mismatched Sessions"].join(","),
      ...(payrollData || []).map((p) => [
        p.staff.full_name,
        p.staffType === "ta" ? "TA" : "Teacher",
        p.staff.is_active === false ? "Archived" : "Active",
        // The basis that applied in this month, not the one on the staff
        // row today - the money in the columns beside it is dated.
        p.payBasisInMonth,
        effectiveRateVnd(p.staff),
        p.heldSessions,
        p.scheduledSessions,
        p.totalEarned,
        p.projectedEarnings,
        p.totalProjected,
        p.expectedProjected,
        p.varianceAmount,
        p.mismatchedSessions.length,
      ].join(",")),
      ["", "", "", "", "", "", "",
        (payrollData || []).reduce((sum, p) => sum + p.totalEarned, 0),
        (payrollData || []).reduce((sum, p) => sum + p.projectedEarnings, 0),
        (payrollData || []).reduce((sum, p) => sum + p.totalProjected, 0),
        (payrollData || []).reduce((sum, p) => sum + p.expectedProjected, 0),
        (payrollData || []).reduce((sum, p) => sum + p.varianceAmount, 0),
        (payrollData || []).reduce((sum, p) => sum + p.mismatchedSessions.length, 0),
      ].join(",")
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-payroll-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const monthOptions = Array.from({ length: 6 }, (_, i) => {
    const month = dayjs().subtract(i, "month");
    return { value: month.format("YYYY-MM"), label: month.format("MMMM YYYY") };
  });

  const grandTotalEarned = payrollData?.reduce((sum, p) => sum + p.totalEarned, 0) || 0;
  const grandTotalProjected = payrollData?.reduce((sum, p) => sum + p.totalProjected, 0) || 0;
  const grandTotalExpected = payrollData?.reduce((sum, p) => sum + p.expectedProjected, 0) || 0;
  const grandVariance = grandTotalProjected - grandTotalExpected;
  const allMismatches = payrollData?.flatMap((p) =>
    p.mismatchedSessions.map((m) => ({
      ...m,
      staffName: p.staff.full_name,
      // Whether this particular mismatch costs anything depends on how the
      // person teaching it is paid, not on the session.
      costsMoney: p.lengthCostsMoney,
    })),
  ) || [];
  const freeMismatches = allMismatches.filter((m) => !m.costsMoney).length;

  if (isLoading) return <div>Loading payroll data...</div>;

  // Every figure on this screen now comes from one call, so a failed call
  // has to say so. Rendering the empty state instead would tell an admin
  // that nobody worked this month.
  if (payrollError) {
    return (
      <Card className="border-destructive/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Payroll could not be calculated
          </CardTitle>
          <CardDescription>
            {payrollError instanceof Error ? payrollError.message : "The payroll service did not answer."}
            {" "}No figures are shown rather than figures that might be wrong.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="People"
        title="Payroll"
        subtitle="Earned vs projected pay for teachers and assistants."
        variant="mint"
      />

      <SectionHeader title="This Month" subtitle={dayjs(selectedMonth).format("MMMM YYYY")} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button onClick={() => addToExpendituresMutation.mutate()} variant="outline" size="sm" disabled={!bookingAllowed || addToExpendituresMutation.isPending || !payrollData?.some(p => p.totalEarned > 0)}>
            <Receipt className="h-4 w-4 mr-2" />
            Add to Expenditures
          </Button>
          <Button onClick={exportPayroll} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <PayrollMonthLock
        month={selectedMonth}
        live={(payrollData ?? []).map((p) => ({
          id: p.staff.id,
          staffType: p.staffType,
          name: p.staff.full_name,
          totalEarned: p.totalEarned,
        }))}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Earned (Held Sessions)</CardDescription>
            <CardTitle className="text-3xl">{grandTotalEarned.toLocaleString()} ₫</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Projected (Held + Scheduled)</CardDescription>
            <CardTitle className="text-3xl text-primary">{grandTotalProjected.toLocaleString()} ₫</CardTitle>
          </CardHeader>
        </Card>
        {/* The same month with every wrong-length session re-costed at the
            length its day is scheduled for. When this differs from Projected,
            a session runs a length its class never holds, and either the
            times or the weekly schedule is wrong. */}
        <Card className={grandVariance !== 0 ? "border-warning/60" : undefined}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              {grandVariance !== 0 && <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
              Projected at scheduled lengths
            </CardDescription>
            <CardTitle className="text-3xl">{grandTotalExpected.toLocaleString()} ₫</CardTitle>
            {grandVariance !== 0 && (
              <p className="pt-1 text-xs font-medium text-warning">
                {grandVariance > 0 ? "+" : "−"}
                {Math.abs(grandVariance).toLocaleString()} ₫ against the scheduled lengths
              </p>
            )}
          </CardHeader>
        </Card>
      </div>

      {allMismatches.length > 0 && (
        <Card className="border-warning/60 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {allMismatches.length} session{allMismatches.length === 1 ? "" : "s"} do not match their
              class length
            </CardTitle>
            <CardDescription>
              {grandVariance !== 0 ? (
                <>
                  For staff paid by the hour these change this month's total by{" "}
                  <strong className="text-foreground">
                    {grandVariance > 0 ? "+" : "−"}
                    {Math.abs(grandVariance).toLocaleString()} ₫
                  </strong>
                  .{" "}
                </>
              ) : null}
              {freeMismatches > 0 && (
                <>
                  {freeMismatches === allMismatches.length ? "These" : `${freeMismatches} of these`}{" "}
                  cost nothing extra — that staff member is paid per session — but the
                  times still disagree with the schedule.{" "}
                </>
              )}
              Either the session times or the class setting is wrong.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 space-y-1 overflow-y-auto">
              {allMismatches.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background/70 px-3 py-1.5 text-xs"
                >
                  <span className="font-medium">
                    {dayjs(m.date).format("ddd D MMM")} · {m.className}
                  </span>
                  <span className="text-muted-foreground">{m.staffName}</span>
                  <span className="tabular-nums">
                    {formatMinutes(m.actualMinutes)} vs {formatMinutes(m.expectedMinutes)} set
                  </span>
                  <span className="font-semibold tabular-nums text-warning">
                    {formatSignedMinutes(m.deltaMinutes)}
                    {/* No money shown for per-session staff: "+0 ₫" would
                        read as a rounding artefact rather than as "the
                        length does not change what this costs". */}
                    {m.costsMoney ? (
                      <>
                        {" · "}
                        {m.deltaAmount > 0 ? "+" : "−"}
                        {Math.abs(m.deltaAmount).toLocaleString()} ₫
                      </>
                    ) : (
                      <span className="font-normal text-muted-foreground"> · no cost</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Staff Payroll Summary</CardTitle>
          <CardDescription>Payroll for {dayjs(selectedMonth).format("MMMM YYYY")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!payrollData || payrollData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No payroll data available</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead className="text-center">Held</TableHead>
                  <TableHead className="text-center">Scheduled</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Projected</TableHead>
                  <TableHead className="text-right">Total Projected</TableHead>
                  <TableHead className="text-right">vs schedule</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.map((payroll) => (
                  <TableRow key={`${payroll.staffType}-${payroll.staff.id}`}>
                    <TableCell className="font-medium">
                      {payroll.staff.full_name}
                      {payroll.staff.is_active === false && (
                        <Badge variant="outline" className="ml-2 text-[10px] font-normal">
                          Archived
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={payroll.staffType === "ta" ? "secondary" : "default"}>
                        {payroll.staffType === "ta" ? "TA" : "Teacher"}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground tabular-nums">
                      {describeRate(payroll.staff)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="default">{payroll.heldSessions}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{payroll.scheduledSessions}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{payroll.totalEarned.toLocaleString()} ₫</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      +{payroll.projectedEarnings.toLocaleString()} ₫
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {payroll.totalProjected.toLocaleString()} ₫
                    </TableCell>
                    <TableCell className="text-right">
                      {payroll.mismatchedSessions.length === 0 ? (
                        <span className="text-xs text-muted-foreground">matches</span>
                      ) : !payroll.lengthCostsMoney ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          title={`${payroll.mismatchedSessions.length} session(s) differ from the configured class length, but this person is paid per session so the pay is unaffected`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {payroll.mismatchedSessions.length} off-length
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-semibold text-warning"
                          title={`${payroll.mismatchedSessions.length} session(s) differ from the configured class length`}
                        >
                          <AlertTriangle className="h-3 w-3" />
                          {payroll.varianceAmount > 0 ? "+" : "−"}
                          {Math.abs(payroll.varianceAmount).toLocaleString()} ₫
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={3}>Total</TableCell>
                  <TableCell className="text-center">
                    {payrollData.reduce((sum, p) => sum + p.heldSessions, 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    {payrollData.reduce((sum, p) => sum + p.scheduledSessions, 0)}
                  </TableCell>
                  <TableCell className="text-right">{grandTotalEarned.toLocaleString()} ₫</TableCell>
                  <TableCell className="text-right">
                    +{(grandTotalProjected - grandTotalEarned).toLocaleString()} ₫
                  </TableCell>
                  <TableCell className="text-right">{grandTotalProjected.toLocaleString()} ₫</TableCell>
                  <TableCell className="text-right">
                    {grandVariance === 0 ? (
                      <span className="text-xs font-normal text-muted-foreground">matches</span>
                    ) : (
                      <span className="text-warning">
                        {grandVariance > 0 ? "+" : "−"}
                        {Math.abs(grandVariance).toLocaleString()} ₫
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
