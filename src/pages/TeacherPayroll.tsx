import { useState, useEffect } from "react";
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

      const { data: teacher } = await supabase
        .from("teachers")
        .select("id, hourly_rate_vnd")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!teacher) throw new Error("Not a teacher");

      const { data: payrollResult, error: payrollError } = await supabase.functions.invoke("calculate-payroll", {
        body: { month, teacherId: teacher.id },
      });

      if (payrollError) throw payrollError;

      const teacherPayroll = payrollResult.payrollData?.[0];

      return {
        payrollResult: teacherPayroll,
        hourlyRate: teacher.hourly_rate_vnd,
        teacherId: teacher.id,
      };
    },
  });

  // Fetch lost income from cancelled sessions
  const { data: lostIncome } = useQuery({
    queryKey: ["teacher-lost-income", month, payrollData?.teacherId],
    enabled: !!payrollData?.teacherId,
    queryFn: async () => {
      const monthStart = `${month}-01`;
      const nextMonth = dayjs(month).add(1, "month").format("YYYY-MM");
      const monthEnd = `${nextMonth}-01`;

      const { data: cancelledSessions, error } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, classes(name)")
        .eq("teacher_id", payrollData!.teacherId)
        .eq("status", "Canceled")
        .gte("date", monthStart)
        .lt("date", monthEnd);

      if (error) throw error;

      let totalLostMinutes = 0;
      for (const session of cancelledSessions || []) {
        const [startHr, startMin] = session.start_time.split(':').map(Number);
        const [endHr, endMin] = session.end_time.split(':').map(Number);
        totalLostMinutes += (endHr * 60 + endMin) - (startHr * 60 + startMin);
      }

      const hourlyRate = payrollData?.hourlyRate || 0;
      return {
        totalLostHours: totalLostMinutes / 60,
        totalLostAmount: (totalLostMinutes / 60) * hourlyRate,
        sessionCount: cancelledSessions?.length || 0
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
    const sessions = payrollData?.payrollResult?.sessionDetailsProjected || [];
    const hourlyRate = payrollData?.hourlyRate || 200000;
    const totalEarned = payrollData?.payrollResult?.totalAmountActual || 0;
    const totalProjected = payrollData?.payrollResult?.totalAmountProjected || 0;
    const projectedEarnings = totalProjected - totalEarned;
    
    const csv = [
      ["Date", "Class", "Start Time", "End Time", "Status", "Duration (hrs)", "Rate", "Amount"].join(","),
      ...sessions.map((s: any) => {
        const hours = (s.minutes / 60).toFixed(2);
        return [
          s.date,
          s.classes?.name || 'N/A',
          s.start_time,
          s.end_time,
          s.status,
          hours,
          hourlyRate,
          s.amount
        ].join(",");
      }),
      ["", "", "", "", "", "", "Held Total", totalEarned].join(","),
      ["", "", "", "", "", "", "Projected", projectedEarnings].join(","),
      ["", "", "", "", "", "", "Total Projected", totalProjected].join(",")
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
    return <Layout title="Payroll">Loading...</Layout>;
  }

  const hourlyRate = payrollData?.hourlyRate || 200000;

  // Use edge function data directly
  const heldSessionsCount = payrollData?.payrollResult?.sessionsCountActual || 0;
  const totalHours = payrollData?.payrollResult?.totalHoursActual || 0;
  const totalEarned = payrollData?.payrollResult?.totalAmountActual || 0;
  const totalProjected = payrollData?.payrollResult?.totalAmountProjected || 0;
  const projectedEarnings = totalProjected - totalEarned;
  const scheduledSessionsCount = (payrollData?.payrollResult?.sessionsCountProjected || 0) - heldSessionsCount;

  return (
    <Layout title="Payroll">
      <div className="space-y-6">
        {payrollData?.teacherId && <TeacherBankingInfo teacherId={payrollData.teacherId} />}

        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {dayjs(month).format("MMMM YYYY")}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={nextMonth}
              disabled={dayjs(month).add(1, "month").format("YYYY-MM") > currentMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={exportPayroll} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {!payrollData?.payrollResult ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                Unable to load payroll data for {dayjs(month).format("MMMM YYYY")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Held Sessions</CardDescription>
                  <CardTitle className="text-3xl">{heldSessionsCount}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Hours</CardDescription>
                  <CardTitle className="text-3xl">{totalHours.toFixed(1)}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Amount Earned</CardDescription>
                  <CardTitle className="text-3xl">{totalEarned.toLocaleString()} ₫</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Projected Total</CardDescription>
                  <CardTitle className="text-3xl text-primary">
                    {totalProjected.toLocaleString()} ₫
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  +{projectedEarnings.toLocaleString()} ₫ from {scheduledSessionsCount} scheduled
                </CardContent>
              </Card>
              <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-950/20">
                <CardHeader className="pb-2">
                  <CardDescription className="flex items-center gap-1 text-orange-600">
                    <TrendingDown className="h-3 w-3" />
                    Lost Income
                  </CardDescription>
                  <CardTitle className="text-3xl text-orange-600">
                    {(lostIncome?.totalLostAmount || 0).toLocaleString()} ₫
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {lostIncome?.sessionCount || 0} cancelled ({(lostIncome?.totalLostHours || 0).toFixed(1)} hrs)
                </CardContent>
              </Card>
            </div>

            <TeacherPayrollCalendar
              sessions={payrollData?.payrollResult?.sessionDetailsProjected || []}
              hourlyRate={hourlyRate}
              month={monthDate}
              onMonthChange={handleMonthChange}
            />

            <Card>
              <CardHeader>
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  Sessions during {dayjs(month).format("MMMM YYYY")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payrollData?.payrollResult?.sessionDetailsProjected?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No sessions scheduled for this month
                        </TableCell>
                      </TableRow>
                    ) : (
                      payrollData?.payrollResult?.sessionDetailsProjected?.map((session: any) => (
                        <TableRow key={session.id} className={session.status === "Scheduled" ? "opacity-60" : ""}>
                          <TableCell>
                            {dayjs(session.date).format("MMM D, YYYY")}
                          </TableCell>
                          <TableCell>{session.classes?.name || 'N/A'}</TableCell>
                          <TableCell>
                            {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={session.status === "Held" ? "default" : "secondary"}>
                              {session.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {session.amount.toLocaleString()} ₫
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
