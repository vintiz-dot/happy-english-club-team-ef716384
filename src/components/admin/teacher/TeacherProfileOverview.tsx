import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle2, CalendarClock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TeacherProfileOverviewProps {
  teacherId: string;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
}

export function TeacherProfileOverview({ teacherId, selectedMonth, onMonthChange }: TeacherProfileOverviewProps) {
  const { data: payrollData } = useQuery({
    queryKey: ["teacher-payroll-overview", teacherId, selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month: selectedMonth, teacherId },
      });
      if (error) throw error;
      return data?.payrollData?.[0];
    },
  });

  // Generate month options
  const monthOptions = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    monthOptions.push(d.toISOString().slice(0, 7));
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={selectedMonth} onValueChange={onMonthChange}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Month">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {monthOptions.map((month) => (
              <SelectItem key={month} value={month}>
                {new Date(month + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
              <Calendar className="h-4 w-4" />
              Scheduled Sessions
            </CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums">{payrollData?.sessionsCountProjected || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-hec-caption text-hec-ink-soft">Total sessions planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
              <CheckCircle2 className="h-4 w-4" />
              Held Sessions
            </CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums">{payrollData?.sessionsCountActual || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-hec-caption text-hec-ink-soft">Sessions completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
              <Clock className="h-4 w-4" />
              Scheduled Hours
            </CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums">{payrollData?.totalHoursProjected?.toFixed(1) || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-hec-caption text-hec-ink-soft">Total hours planned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
              <CalendarClock className="h-4 w-4" />
              Held Hours
            </CardDescription>
            <CardTitle className="whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums">{payrollData?.totalHoursActual?.toFixed(1) || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-hec-caption text-hec-ink-soft">Hours completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Summary</CardTitle>
          <CardDescription>
            {new Date(selectedMonth + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 text-hec-ink-soft">Completion Rate:</span>
              <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-hec-ink">
                {payrollData?.sessionsCountProjected
                  ? ((payrollData.sessionsCountActual / payrollData.sessionsCountProjected) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <span className="min-w-0 text-hec-ink-soft">Avg Session Duration:</span>
              <span className="shrink-0 whitespace-nowrap font-medium tabular-nums text-hec-ink">
                {payrollData?.sessionsCountActual
                  ? ((payrollData.totalHoursActual / payrollData.sessionsCountActual) * 60).toFixed(0)
                  : 0}{" "}
                min
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
