import { useState, useEffect } from "react";
import { DurationVarianceNotice } from "@/components/shared/DurationVarianceNotice";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Download, TrendingDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TeacherPayrollCalendar from "@/components/teacher/TeacherPayrollCalendar";
import { TeacherBankingInfo } from "@/components/teacher/TeacherBankingInfo";
import { PageLoading } from "@/components/ui/loading";
import { teacherPayrollView, type TeacherPayrollView } from "@/lib/teacherPayrollView";

/** A figure the function decided, or a dash when it did not send one. */
const vnd = (amount: number | null) =>
  amount === null ? "—" : `${amount.toLocaleString()} ₫`;

export default function TeacherPayroll() {
  const queryClient = useQueryClient();
  const [monthStr, setMonthStr] = useState(dayjs().format("YYYY-MM"));
  const [monthDate, setMonthDate] = useState(new Date());
  const currentMonth = dayjs().format("YYYY-MM");
  const { user } = useAuth();

  const month = monthStr;

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ["teacher-payroll", month, user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Only the id, for the banking card and the live-update filter. The
      // rate columns are not read: every figure on this page, Lost Income
      // and the calendar's days included, is calculate-payroll's, priced at
      // the rate in force on each lesson's own date. The function finds the
      // teacher from the sign-in itself; the teacherId sent is ignored for
      // a teacher, so this page cannot ask for anyone else's pay.
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacher) throw new Error("Not a teacher");

      const { data: payrollResult, error: payrollError } = await supabase.functions.invoke("calculate-payroll", {
        body: { month, teacherId: teacher.id },
      });

      if (payrollError) throw payrollError;

      return {
        view: teacherPayrollView(payrollResult, teacher.id) as TeacherPayrollView,
        teacherId: teacher.id,
      };
    },
  });

  // Real-time subscription for sessions changes
  useEffect(() => {
    if (!payrollData?.teacherId) return;

    const channel = supabase
      .channel('teacher-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sessions',
          filter: `teacher_id=eq.${payrollData.teacherId}`,
        },
        () => {
          // Invalidate query when sessions change
          queryClient.invalidateQueries({ queryKey: ["teacher-payroll", month] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [payrollData?.teacherId, month]);

  const prevMonth = () => {
    const newMonth = dayjs(month).subtract(1, "month").format("YYYY-MM");
    setMonthStr(newMonth);
    setMonthDate(dayjs(newMonth).toDate());
  };

  const nextMonth = () => {
    const next = dayjs(month).add(1, "month").format("YYYY-MM");
    if (next <= currentMonth) {
      setMonthStr(next);
      setMonthDate(dayjs(next).toDate());
    }
  };

  const handleMonthChange = (date: Date) => {
    const newMonth = dayjs(date).format("YYYY-MM");
    setMonthStr(newMonth);
    setMonthDate(date);
  };

  const exportPayroll = () => {
    const view = payrollData?.view;
    const sessions = view?.sessions || [];

    // Every column is the function's: the rate is the one each lesson was
    // priced at (blank on a deploy that does not report it yet), not the
    // teacher row's rate of today.
    const csv = [
      ["Date", "Class", "Start Time", "End Time", "Status", "Duration (hrs)", "Paid", "Rate", "Amount"].join(","),
      ...sessions.map((s) => {
        const hours = s.minutes === null ? "" : (s.minutes / 60).toFixed(2);
        return [
          s.date,
          s.className,
          s.startTime,
          s.endTime,
          s.status,
          hours,
          s.payRateType === null ? "" : s.payRateType === "per_session" ? "Per session" : "Per hour",
          s.rateVnd ?? "",
          s.amount ?? "",
        ].join(",");
      }),
      ["", "", "", "", "", "", "", "Held Total", view?.earned ?? 0].join(","),
      ["", "", "", "", "", "", "", "Projected", view?.stillToCome ?? 0].join(","),
      ["", "", "", "", "", "", "", "Total Projected", view?.projectedTotal ?? 0].join(",")
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout title="Payroll">
        <PageLoading message="Loading payroll" />
      </Layout>
    );
  }

  // Every figure is calculate-payroll's, through teacherPayrollView. In a
  // closed month the totals are what the month was paid at.
  const view = payrollData?.view;
  const heldSessionsCount = view?.heldSessions ?? 0;
  const totalHours = view?.totalHours ?? 0;
  const totalEarned = view?.earned ?? 0;
  const totalProjected = view?.projectedTotal ?? 0;
  const projectedEarnings = view?.stillToCome ?? 0;
  const scheduledSessionsCount = view?.scheduledSessions ?? 0;
  const lostIncome = view?.lostIncome ?? null;

  const discrepancyCount = view?.discrepancyCount ?? 0;
  const varianceAmount = view?.varianceAmount ?? 0;

  return (
    <Layout title="Payroll">
      <div className="space-y-6">
        {payrollData?.teacherId && <TeacherBankingInfo teacherId={payrollData.teacherId} />}

        {/* The teacher sees this too: it is their pay that is affected, and
            they are usually the first to know which length is correct. */}
        <DurationVarianceNotice
          variant="block"
          count={discrepancyCount}
          varianceAmount={varianceAmount}
        />

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month" className="min-h-hec-target min-w-hec-target">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[200px] text-center font-display text-hec-h2 font-medium text-hec-ink">
              {dayjs(month).format("MMMM YYYY")}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={nextMonth}
              aria-label="Next month"
              className="min-h-hec-target min-w-hec-target"
              disabled={dayjs(month).add(1, "month").format("YYYY-MM") > currentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={exportPayroll} variant="outline" size="sm" className="min-h-hec-target">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {view?.closed && (
          <p className="text-hec-small text-hec-ink-soft">
            This month is closed: the totals are what it was paid at.
            {!view.perSessionAvailable && " Lessons were corrected after it closed, so per-lesson amounts are not shown."}
          </p>
        )}
        {view?.monthLocked && !view.closed && (
          <p className="text-hec-small text-hec-ink-soft">
            This month is closed, but nothing was recorded for you when it closed: the figures below are calculated now, not what was paid.
          </p>
        )}

        {!view?.found ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-hec-ink-soft">
                Unable to load payroll data for {dayjs(month).format("MMMM YYYY")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Held Sessions</CardDescription>
                  <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">{heldSessionsCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Hours</CardDescription>
                  <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">{totalHours.toFixed(1)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Amount Earned</CardDescription>
                  <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">{totalEarned.toLocaleString()} ₫</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projected Total</CardDescription>
                  <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">
                    {totalProjected.toLocaleString()} ₫
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-hec-small tabular-nums text-hec-ink-soft">
                  +{projectedEarnings.toLocaleString()} ₫ from {scheduledSessionsCount} scheduled
                </CardContent>
              </Card>
              <Card className="border-hec-warn/30 bg-hec-warn-tint">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1 font-medium text-hec-warn">
                    <TrendingDown className="h-3 w-3" />
                    Lost Income
                  </CardDescription>
                  <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">
                    {vnd(lostIncome?.amount ?? null)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-hec-small tabular-nums text-hec-ink-soft">
                  {lostIncome
                    ? `${lostIncome.sessions} cancelled (${lostIncome.quantityLabel || "0 h"})`
                    : "Figure unavailable"}
                </CardContent>
              </Card>
            </div>

            <TeacherPayrollCalendar
              sessions={view.sessions}
              earnedByDate={view.earnedByDate}
              month={monthDate}
              onMonthChange={handleMonthChange}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-hec-h2">Session Details</CardTitle>
                <CardDescription>
                  Sessions during {dayjs(month).format("MMMM YYYY")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="px-2 sm:px-4">Date</TableHead>
                      <TableHead className="px-2 sm:px-4">Class</TableHead>
                      <TableHead className="px-2 sm:px-4">Time</TableHead>
                      <TableHead className="px-2 sm:px-4">Status</TableHead>
                      <TableHead className="px-2 sm:px-4 text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {view.sessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-hec-ink-soft">
                          No sessions scheduled for this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      view.sessions.map((session) => (
                        <TableRow key={session.id} className={session.status === "Scheduled" ? "text-hec-ink-soft" : ""}>
                          <TableCell className="px-2 sm:px-4">
                            {dayjs(session.date).format("MMM D, YYYY")}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 whitespace-normal break-words">{session.className}</TableCell>
                          <TableCell className="px-2 sm:px-4">
                            {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
                          </TableCell>
                          <TableCell className="px-2 sm:px-4">
                            <Badge variant={session.status === "Held" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="px-2 sm:px-4 whitespace-nowrap text-right tabular-nums">
                            {session.amount === null
                              ? <span title="Figure unavailable"><span aria-hidden="true">—</span><span className="sr-only">Figure unavailable</span></span>
                              : `${session.amount.toLocaleString()} ₫`}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
