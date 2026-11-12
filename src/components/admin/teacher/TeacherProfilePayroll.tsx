import { useQuery } from "@tanstack/react-query";
import { DurationVarianceNotice } from "@/components/shared/DurationVarianceNotice";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeacherBankingInfo } from "@/components/teacher/TeacherBankingInfo";
import { School, TrendingUp } from "lucide-react";
import { MonthPicker } from "@/components/MonthPicker";
import { payRateTypeOf, sessionPayVnd, type StaffPayRate } from "@/lib/payRate";
import { durationMinutes } from "@/lib/sessionDuration";

interface TeacherProfilePayrollProps {
  teacherId: string;
  selectedMonth: string;
  /** The teacher's whole pay rate, so a per-session teacher is not costed
      as though their fee scaled with the clock. */
  payRate: StaffPayRate;
  onMonthChange?: (month: string) => void;
}

export function TeacherProfilePayroll({ teacherId, selectedMonth, payRate, onMonthChange }: TeacherProfilePayrollProps) {
  const { data: payrollData } = useQuery({
    queryKey: ["teacher-payroll-detail", teacherId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: selectedMonth, teacherId },
      });
      if (error) throw error;
      return data?.payrollData?.[0];
    },
  });

  // Fetch class breakdown summary
  const { data: classBreakdown } = useQuery({
    queryKey: ["teacher-class-breakdown", teacherId, selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(selectedMonth + "-01");
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = nextMonth.toISOString().slice(0, 10);

      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("id, status, classes(id, name)")
        .eq("teacher_id", teacherId)
        .gte("date", monthStart)
        .lt("date", monthEnd)
        .in("status", ["Held", "Scheduled"]);

      if (error) throw error;

      // Group by class
      const classMap = new Map<string, { name: string; held: number; scheduled: number }>();
      
      for (const session of sessions || []) {
        const classId = session.classes?.id;
        const className = session.classes?.name || "Unknown";
        
        if (!classId) continue;
        
        if (!classMap.has(classId)) {
          classMap.set(classId, { name: className, held: 0, scheduled: 0 });
        }
        
        const entry = classMap.get(classId)!;
        if (session.status === "Held") {
          entry.held++;
        } else if (session.status === "Scheduled") {
          entry.scheduled++;
        }
      }

      // Sort by total sessions descending
      return Array.from(classMap.entries())
        .map(([id, data]) => ({ id, ...data, total: data.held + data.scheduled }))
        .sort((a, b) => b.total - a.total);
    },
  });

  const calculateSessionAmount = (session: any) => {
    const minutes = durationMinutes(session.start_time, session.end_time) ?? 0;
    const override = session.rate_override_vnd;
    if (!override) return sessionPayVnd(payRate, minutes);
    // sessions.rate_override_vnd is read inconsistently across the app -
    // as an hourly rate here, as a flat session cost in
    // ClassCalendarEnhanced - and calculate-payroll, which produces the
    // figure actually paid, ignores it entirely. Not settling that here.
    // The override is applied in whatever unit the teacher is paid in,
    // which keeps this screen unchanged for hourly teachers and is the
    // only reading that makes sense for per-session ones.
    return sessionPayVnd(
      {
        pay_rate_type: payRateTypeOf(payRate),
        hourly_rate_vnd: override,
        per_session_rate_vnd: override,
      },
      minutes,
    );
  };

  const totalClasses = classBreakdown?.length || 0;
  const totalSessions = classBreakdown?.reduce((sum, c) => sum + c.total, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Month Picker Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-hec-h2 font-medium text-hec-ink">Payroll Summary</h2>
        {onMonthChange && (
          <MonthPicker value={selectedMonth} onChange={onMonthChange} />
        )}
      </div>

      <TeacherBankingInfo teacherId={teacherId} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projected Total</CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">
              {(payrollData?.totalAmountProjected || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              Based on {payrollData?.sessionsCountProjected || 0} scheduled sessions
            </p>
            <DurationVarianceNotice
              variant="block"
              count={payrollData?.discrepancyCount || 0}
              varianceAmount={payrollData?.varianceAmountProjected}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current (Actual)</CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">
              {(payrollData?.totalAmountActual || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              From {payrollData?.sessionsCountActual || 0} held sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Class Teaching Summary Card */}
      <Card>
        <CardHeader className="border-b border-hec-line">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-hec-md bg-hec-sunken p-2">
                <School className="h-5 w-5 text-hec-ink-soft" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-hec-h2">Class Teaching Summary</CardTitle>
                <CardDescription>Sessions per class this month</CardDescription>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="font-sans text-2xl font-bold tabular-nums text-hec-ink">{totalSessions}</p>
              <p className="whitespace-nowrap text-hec-caption text-hec-ink-soft">across {totalClasses} classes</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {classBreakdown && classBreakdown.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classBreakdown.map((cls, index) => {
                const heldPercent = cls.total > 0 ? (cls.held / cls.total) * 100 : 0;
                return (
                  <div
                    key={cls.id}
                    className="relative rounded-hec-md border border-hec-line bg-hec-surface p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <span className="shrink-0 text-hec-caption text-hec-ink-soft tabular-nums">#{index + 1}</span>
                        <h4 className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-small font-semibold text-hec-ink" title={cls.name}>
                          {cls.name}
                        </h4>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 text-hec-ink">
                        <TrendingUp className="h-3 w-3 text-hec-ink-soft" />
                        <span className="text-lg font-bold tabular-nums">{cls.total}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mb-2 h-2 overflow-hidden rounded-full bg-hec-sunken">
                      <div 
                        className="h-full rounded-full bg-hec-leaf"
                        style={{ width: `${heldPercent}%` }}
                      />
                    </div>
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 text-hec-caption tabular-nums">
                      <span className="font-medium text-hec-leaf">
                        {cls.held} held
                      </span>
                      <span className="text-hec-ink-soft">
                        {cls.scheduled} scheduled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-hec-ink-soft">
              <School className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sessions recorded this month</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-hec-h2">Session Details</CardTitle>
          <CardDescription>Per-session earnings breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          {payrollData?.sessions && payrollData.sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.sessions.map((session: any) => {
                  const amount = calculateSessionAmount(session);
                  return (
                    <TableRow key={session.id}>
                      <TableCell>{new Date(session.date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>
                        {(session.durationMinutes / 60).toFixed(1)}h
                      </TableCell>
                      <TableCell>
                        <Badge variant={session.status === "Held" ? "default" : "secondary"} className={session.status === "Held" ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : ""}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium tabular-nums">
                        {amount.toLocaleString()} ₫
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-hec-ink-soft">No sessions this month</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
