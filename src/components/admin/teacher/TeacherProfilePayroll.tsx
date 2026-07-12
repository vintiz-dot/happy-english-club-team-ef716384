import { useQuery } from "@tanstack/react-query";
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

interface TeacherProfilePayrollProps {
  teacherId: string;
  selectedMonth: string;
  hourlyRate: number;
  onMonthChange?: (month: string) => void;
}

export function TeacherProfilePayroll({ teacherId, selectedMonth, hourlyRate, onMonthChange }: TeacherProfilePayrollProps) {
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
    const [startHour, startMin] = session.start_time.split(":").map(Number);
    const [endHour, endMin] = session.end_time.split(":").map(Number);
    const durationMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin);
    const hours = durationMinutes / 60;
    return Math.round(hours * (session.rate_override_vnd || hourlyRate));
  };

  const totalClasses = classBreakdown?.length || 0;
  const totalSessions = classBreakdown?.reduce((sum, c) => sum + c.total, 0) || 0;

  return (
    <div className="space-y-4">
      {/* Month Picker Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payroll Summary</h2>
        {onMonthChange && (
          <MonthPicker value={selectedMonth} onChange={onMonthChange} />
        )}
      </div>

      <TeacherBankingInfo teacherId={teacherId} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Projected Total</CardDescription>
            <CardTitle className="text-3xl">
              {(payrollData?.totalAmountProjected || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Based on {payrollData?.sessionsCountProjected || 0} scheduled sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current (Actual)</CardDescription>
            <CardTitle className="text-3xl">
              {(payrollData?.totalAmountActual || 0).toLocaleString()} ₫
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              From {payrollData?.sessionsCountActual || 0} held sessions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Class Teaching Summary Card */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-800/50">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900/30 dark:to-slate-800/30 border-b border-slate-200 dark:border-slate-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                <School className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Class Teaching Summary</CardTitle>
                <CardDescription>Sessions per class this month</CardDescription>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalSessions}</p>
              <p className="text-xs text-muted-foreground">across {totalClasses} classes</p>
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
                    className="group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                        <h4 className="font-semibold text-sm truncate max-w-[120px]" title={cls.name}>
                          {cls.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                        <TrendingUp className="h-3 w-3" />
                        <span className="text-lg font-bold">{cls.total}</span>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-900/30 overflow-hidden mb-2">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${heldPercent}%` }}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        {cls.held} held
                      </span>
                      <span className="text-muted-foreground">
                        {cls.scheduled} scheduled
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <School className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No sessions recorded this month</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session Details</CardTitle>
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
                        <Badge variant={session.status === "Held" ? "default" : "secondary"} className={session.status === "Held" ? "bg-green-500" : ""}>
                          {session.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {amount.toLocaleString()} ₫
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No sessions this month</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
