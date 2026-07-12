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
import { SectionHeader } from "@/components/quest/SectionHeader";

interface StaffPayroll {
  staff: { id: string; full_name: string; hourly_rate_vnd: number };
  staffType: "teacher" | "ta";
  heldSessions: number;
  scheduledSessions: number;
  totalEarned: number;
  projectedEarnings: number;
  totalProjected: number;
}

export function PayrollTab() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const queryClient = useQueryClient();

  const { data: payrollData, isLoading } = useQuery({
    queryKey: ["admin-payroll", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const monthEnd = dayjs(monthStart).add(1, "month").format("YYYY-MM-DD");

      // Fetch teachers, TAs, sessions, and session_participants in parallel
      const [teachersRes, tasRes, sessionsRes, participantsRes] = await Promise.all([
        supabase
          .from("teachers")
          .select("id, full_name, hourly_rate_vnd, is_active")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("teaching_assistants")
          .select("id, full_name, hourly_rate_vnd, is_active")
          .eq("is_active", true)
          .order("full_name"),
        supabase
          .from("sessions")
          .select(`id, date, start_time, end_time, status, teacher_id, classes!inner(name)`)
          .gte("date", monthStart)
          .lt("date", monthEnd)
          .in("status", ["Held", "Scheduled"])
          .order("date", { ascending: true }),
        supabase
          .from("session_participants")
          .select("session_id, teaching_assistant_id")
          .eq("participant_type", "teaching_assistant"),
      ]);

      const teachers = teachersRes.data || [];
      const tas = tasRes.data || [];
      const allSessions = sessionsRes.data || [];
      const participants = participantsRes.data || [];

      // Group sessions by teacher_id
      const sessionsByTeacher: Record<string, typeof allSessions> = {};
      for (const s of allSessions) {
        if (!sessionsByTeacher[s.teacher_id]) sessionsByTeacher[s.teacher_id] = [];
        sessionsByTeacher[s.teacher_id].push(s);
      }

      // Group session IDs by TA
      const sessionIdsByTA: Record<string, string[]> = {};
      for (const p of participants) {
        if (!sessionIdsByTA[p.teaching_assistant_id]) sessionIdsByTA[p.teaching_assistant_id] = [];
        sessionIdsByTA[p.teaching_assistant_id].push(p.session_id);
      }

      // Map sessions by id for quick lookup
      const sessionsById: Record<string, (typeof allSessions)[0]> = {};
      for (const s of allSessions) sessionsById[s.id] = s;

      const calculateAmount = (sessionsList: typeof allSessions, rate: number) => {
        return sessionsList.reduce((sum, s) => {
          const start = dayjs(`${s.date} ${s.start_time}`);
          const end = dayjs(`${s.date} ${s.end_time}`);
          const hours = end.diff(start, "hour", true);
          return sum + Math.round(hours * rate);
        }, 0);
      };

      const results: StaffPayroll[] = [];

      // Teachers
      for (const teacher of teachers) {
        const sessions = sessionsByTeacher[teacher.id] || [];
        const held = sessions.filter(s => s.status === "Held");
        const scheduled = sessions.filter(s => s.status === "Scheduled");
        const totalHeld = calculateAmount(held, teacher.hourly_rate_vnd);
        const totalScheduled = calculateAmount(scheduled, teacher.hourly_rate_vnd);

        results.push({
          staff: teacher,
          staffType: "teacher",
          heldSessions: held.length,
          scheduledSessions: scheduled.length,
          totalEarned: totalHeld,
          projectedEarnings: totalScheduled,
          totalProjected: totalHeld + totalScheduled,
        });
      }

      // Teaching Assistants
      for (const ta of tas) {
        const taSessionIds = sessionIdsByTA[ta.id] || [];
        const taSessions = taSessionIds
          .map(id => sessionsById[id])
          .filter(Boolean);
        
        if (taSessions.length === 0) continue;

        const held = taSessions.filter(s => s.status === "Held");
        const scheduled = taSessions.filter(s => s.status === "Scheduled");
        const totalHeld = calculateAmount(held, ta.hourly_rate_vnd);
        const totalScheduled = calculateAmount(scheduled, ta.hourly_rate_vnd);

        results.push({
          staff: ta,
          staffType: "ta",
          heldSessions: held.length,
          scheduledSessions: scheduled.length,
          totalEarned: totalHeld,
          projectedEarnings: totalScheduled,
          totalProjected: totalHeld + totalScheduled,
        });
      }

      return results;
    },
  });

  const addToExpendituresMutation = useMutation({
    mutationFn: async () => {
      if (!payrollData) return;
      const items = payrollData.filter(p => p.totalEarned > 0);
      if (items.length === 0) throw new Error("No earned payroll to record");

      const lastDayOfMonth = dayjs(`${selectedMonth}-01`).endOf("month").format("YYYY-MM-DD");

      const rows = items.map(p => ({
        amount: p.totalEarned,
        category: p.staffType === "ta" ? "TA Payroll" : "Teacher Payroll",
        memo: `${p.staff.full_name} – ${selectedMonth}`,
        date: lastDayOfMonth,
      }));

      const { error } = await supabase.from("expenditures").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payroll added to expenditures");
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const exportPayroll = () => {
    const csv = [
      ["Staff", "Type", "Held Sessions", "Scheduled Sessions", "Earned", "Projected", "Total Projected"].join(","),
      ...(payrollData || []).map((p) => [
        p.staff.full_name,
        p.staffType === "ta" ? "TA" : "Teacher",
        p.heldSessions,
        p.scheduledSessions,
        p.totalEarned,
        p.projectedEarnings,
        p.totalProjected,
      ].join(",")),
      ["", "", "", "",
        (payrollData || []).reduce((sum, p) => sum + p.totalEarned, 0),
        (payrollData || []).reduce((sum, p) => sum + p.projectedEarnings, 0),
        (payrollData || []).reduce((sum, p) => sum + p.totalProjected, 0),
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

  if (isLoading) return <div>Loading payroll data...</div>;

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
          <Button onClick={() => addToExpendituresMutation.mutate()} variant="outline" size="sm" disabled={addToExpendituresMutation.isPending || !payrollData?.some(p => p.totalEarned > 0)}>
            <Receipt className="h-4 w-4 mr-2" />
            Add to Expenditures
          </Button>
          <Button onClick={exportPayroll} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
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
      </div>

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
                  <TableHead className="text-center">Held</TableHead>
                  <TableHead className="text-center">Scheduled</TableHead>
                  <TableHead className="text-right">Earned</TableHead>
                  <TableHead className="text-right">Projected</TableHead>
                  <TableHead className="text-right">Total Projected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payrollData.map((payroll) => (
                  <TableRow key={`${payroll.staffType}-${payroll.staff.id}`}>
                    <TableCell className="font-medium">{payroll.staff.full_name}</TableCell>
                    <TableCell>
                      <Badge variant={payroll.staffType === "ta" ? "secondary" : "default"}>
                        {payroll.staffType === "ta" ? "TA" : "Teacher"}
                      </Badge>
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
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
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
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
