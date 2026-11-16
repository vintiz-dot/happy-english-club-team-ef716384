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
import { teacherPayrollView } from "@/lib/teacherPayrollView";

interface TeacherProfilePayrollProps {
  teacherId: string;
  selectedMonth: string;
  onMonthChange?: (month: string) => void;
}

/**
 * The admin's view of one teacher's month. Every figure is calculate-payroll's
 * (through teacherPayrollView): this used to price each lesson itself at the
 * teacher row's rate of today, applying sessions.rate_override_vnd that the
 * function - and so the actual pay - ignores, and read a `sessions` field the
 * function does not return, so its table was always empty. The class summary
 * is grouped from the same response, so it counts exactly the lessons paid.
 */
export function TeacherProfilePayroll({ teacherId, selectedMonth, onMonthChange }: TeacherProfilePayrollProps) {
  const { data: payrollData } = useQuery({
    queryKey: ["teacher-payroll-detail", teacherId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: selectedMonth, teacherId },
      });
      if (error) throw error;
      return teacherPayrollView(data, teacherId);
    },
  });

  const classBreakdown = payrollData?.classes;
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
              {(payrollData?.projectedTotal || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              Based on {(payrollData?.heldSessions || 0) + (payrollData?.scheduledSessions || 0)} scheduled sessions
            </p>
            <DurationVarianceNotice
              variant="block"
              count={payrollData?.discrepancyCount || 0}
              varianceAmount={payrollData?.varianceAmount}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current (Actual)</CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-3xl font-semibold tabular-nums text-hec-ink">
              {(payrollData?.earned || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              From {payrollData?.heldSessions || 0} held sessions
            </p>
            {payrollData?.closed && (
              <p className="text-hec-small text-hec-ink-soft">
                Month closed: this is what it was paid at. Corrections since are on the Payroll tab.
              </p>
            )}
            {payrollData?.monthLocked && !payrollData.closed && (
              <p className="text-hec-small text-hec-ink-soft">
                Month closed with no line for this teacher: this figure is calculated now, not what was paid.
              </p>
            )}
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
          {payrollData && payrollData.sessions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-2 sm:px-4">Date</TableHead>
                  <TableHead className="px-2 sm:px-4">Time</TableHead>
                  <TableHead className="px-2 sm:px-4">Duration</TableHead>
                  <TableHead className="px-2 sm:px-4">Status</TableHead>
                  <TableHead className="px-2 sm:px-4 text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.sessions.map((session) => {
                  const amount = session.amount;
                  return (
                    <TableRow key={session.id}>
                      <TableCell className="px-2 sm:px-4">{new Date(session.date).toLocaleDateString()}</TableCell>
                      <TableCell className="px-2 sm:px-4">
                        {session.startTime.slice(0, 5)} - {session.endTime.slice(0, 5)}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        {session.minutes === null ? "—" : `${(session.minutes / 60).toFixed(1)}h`}
                      </TableCell>
                      <TableCell className="px-2 sm:px-4">
                        <Badge variant={session.status === "Held" ? "default" : "secondary"} className={session.status === "Held" ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : ""}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-2 sm:px-4 whitespace-nowrap text-right font-medium tabular-nums">
                        {amount === null
                          ? <span title="Figure unavailable"><span aria-hidden="true">—</span><span className="sr-only">Figure unavailable</span></span>
                          : `${amount.toLocaleString()} ₫`}
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
