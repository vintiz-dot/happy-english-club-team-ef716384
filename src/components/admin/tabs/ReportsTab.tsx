import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, XCircle, TrendingDown, UserX, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { monthKey } from "@/lib/date";
import { formatVND } from "@/lib/invoice/formatter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDetailsTable } from "./PaymentDetailsTable";
import { FamilyPaymentActivityLog } from "@/components/admin/FamilyPaymentActivityLog";
import { PageHero } from "@/components/quest/PageHero";

const ReportsTab = () => {
  const [selectedMonth, setSelectedMonth] = useState(monthKey());

  const getMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = -6; i <= 2; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      options.push({ value: ym, label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) });
    }
    return options;
  };

  // Cancelled sessions & lost profit
  const { data: lostRevenue } = useQuery({
    queryKey: ["lost-revenue", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: cancelledSessions, error } = await supabase
        .from("sessions")
        .select(`id, date, start_time, end_time, class_id, classes(id, name, session_rate_vnd), teachers(id, hourly_rate_vnd)`)
        .eq("status", "Canceled")
        .gte("date", monthStart)
        .lt("date", monthEnd);

      if (error) throw error;
      if (!cancelledSessions?.length) return { lostProfit: 0, lostTuition: 0, savedPayroll: 0, sessionCount: 0 };

      const classIds = [...new Set(cancelledSessions.map(s => s.class_id))];
      const { data: allEnrollments } = await supabase
        .from("enrollments")
        .select("class_id, student_id, start_date, end_date")
        .in("class_id", classIds);

      let totalLostTuition = 0;
      let totalLostPayroll = 0;

      for (const session of cancelledSessions) {
        const [startHr, startMin] = session.start_time.split(':').map(Number);
        const [endHr, endMin] = session.end_time.split(':').map(Number);
        const hours = ((endHr * 60 + endMin) - (startHr * 60 + startMin)) / 60;

        const studentCount = (allEnrollments || []).filter(e =>
          e.class_id === session.class_id &&
          e.start_date <= session.date &&
          (!e.end_date || e.end_date >= session.date)
        ).length;

        const sessionRate = (session.classes as any)?.session_rate_vnd || 0;
        const teacherHourlyRate = (session.teachers as any)?.hourly_rate_vnd || 0;

        totalLostTuition += sessionRate * studentCount;
        totalLostPayroll += teacherHourlyRate * hours;
      }

      return {
        lostProfit: totalLostTuition - totalLostPayroll,
        lostTuition: totalLostTuition,
        savedPayroll: totalLostPayroll,
        sessionCount: cancelledSessions.length,
      };
    },
  });

  // Excused absences
  const { data: excusedData } = useQuery({
    queryKey: ["excused-absences", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: excused, error } = await supabase
        .from("attendance")
        .select(`id, status, students(id, full_name), sessions!inner(id, date, start_time, end_time, class_id, classes(id, name, session_rate_vnd))`)
        .eq("status", "Excused")
        .gte("sessions.date", monthStart)
        .lt("sessions.date", monthEnd);

      if (error) throw error;

      const rows = (excused || []).map((a: any) => ({
        id: a.id,
        studentName: a.students?.full_name || "Unknown",
        className: a.sessions?.classes?.name || "Unknown",
        date: a.sessions?.date,
        rate: a.sessions?.classes?.session_rate_vnd || 0,
      }));

      rows.sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""));
      const totalLoss = rows.reduce((sum: number, r: any) => sum + r.rate, 0);
      return { rows, totalLoss, count: rows.length };
    },
  });

  // Class finance - BULK queries instead of per-class waterfall
  const { data: classFinance } = useQuery({
    queryKey: ["class-finance", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const [classesRes, sessionsRes, enrollmentsRes, invoicesRes] = await Promise.all([
        supabase.from("classes").select("id, name, session_rate_vnd").eq("is_active", true),
        supabase
          .from("sessions")
          .select("id, class_id, teacher_id, start_time, end_time, rate_override_vnd, status, teachers(hourly_rate_vnd)")
          .in("status", ["Scheduled", "Held"])
          .gte("date", monthStart)
          .lt("date", monthEnd),
        supabase
          .from("enrollments")
          .select("student_id, class_id")
          .lte("start_date", monthEnd)
          .or(`end_date.is.null,end_date.gte.${monthStart}`),
        supabase
          .from("invoices")
          .select("class_breakdown, student_id")
          .eq("month", selectedMonth),
      ]);

      const classes = classesRes.data || [];
      const sessions = sessionsRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const invoices = invoicesRes.data || [];

      const sessionsByClass: Record<string, typeof sessions> = {};
      for (const s of sessions) {
        if (!sessionsByClass[s.class_id]) sessionsByClass[s.class_id] = [];
        sessionsByClass[s.class_id].push(s);
      }

      const enrollmentsByClass: Record<string, Set<string>> = {};
      for (const e of enrollments) {
        if (!enrollmentsByClass[e.class_id]) enrollmentsByClass[e.class_id] = new Set();
        enrollmentsByClass[e.class_id].add(e.student_id);
      }

      const invoicesByStudent: Record<string, typeof invoices> = {};
      for (const inv of invoices) {
        if (!invoicesByStudent[inv.student_id]) invoicesByStudent[inv.student_id] = [];
        invoicesByStudent[inv.student_id].push(inv);
      }

      return classes.map((cls) => {
        const classSessions = sessionsByClass[cls.id] || [];
        const classEnrollments = enrollmentsByClass[cls.id] || new Set();
        const studentCount = classEnrollments.size;

        let grossTuition = 0;
        let netTuition = 0;
        for (const sid of classEnrollments) {
          const studentInvoices = invoicesByStudent[sid] || [];
          for (const inv of studentInvoices) {
            const breakdown = inv.class_breakdown as Array<{ class_id: string; amount_vnd: number; net_amount_vnd?: number }> | null;
            const entry = breakdown?.find((c) => c.class_id === cls.id);
            if (entry) {
              grossTuition += entry.amount_vnd || 0;
              netTuition += entry.net_amount_vnd ?? entry.amount_vnd ?? 0;
            }
          }
        }

        let payroll = 0;
        for (const session of classSessions) {
          const [startHr, startMin] = session.start_time.split(':').map(Number);
          const [endHr, endMin] = session.end_time.split(':').map(Number);
          const hours = ((endHr * 60 + endMin) - (startHr * 60 + startMin)) / 60;
          const rate = (session.teachers as any)?.hourly_rate_vnd || 0;
          payroll += hours * rate;
        }

        const discounts = grossTuition - netTuition;
        const net = netTuition - payroll;

        return {
          id: cls.id,
          name: cls.name,
          sessionCount: classSessions.length,
          studentCount,
          grossTuition: Math.round(grossTuition),
          discounts: Math.round(discounts),
          tuition: Math.round(netTuition),
          payroll: Math.round(payroll),
          net: Math.round(net),
        };
      });
    },
  });

  const totalGrossTuition = classFinance?.reduce((sum, c) => sum + c.grossTuition, 0) || 0;
  const totalDiscounts = classFinance?.reduce((sum, c) => sum + c.discounts, 0) || 0;
  const totalTuition = classFinance?.reduce((sum, c) => sum + c.tuition, 0) || 0;
  const totalPayroll = classFinance?.reduce((sum, c) => sum + c.payroll, 0) || 0;
  const totalNet = classFinance?.reduce((sum, c) => sum + c.net, 0) || 0;

  const exportClassFinanceCSV = () => {
    if (!classFinance || classFinance.length === 0) return;
    const csv = [
      ["Class", "Sessions", "Students", "Gross Tuition", "Discounts", "Net Tuition", "Payroll", "Profit"].join(","),
      ...classFinance.map(c => [
        `"${c.name}"`,
        c.sessionCount,
        c.studentCount,
        c.grossTuition,
        c.discounts,
        c.tuition,
        c.payroll,
        c.net,
      ].join(",")),
      ["TOTAL", "-", "-", totalGrossTuition, totalDiscounts, totalTuition, totalPayroll, totalNet].join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `class-finance-${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Reports"
        title="Operational Reports"
        subtitle="Cancelled sessions, excused absences, payments, and class P&L."
        variant="glacier"
      />

      {/* Month Selector */}
      <div className="flex items-center gap-4">
        <label className="type-micro font-medium">Select Month:</label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {getMonthOptions().map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cancelled Sessions & Lost Profit */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Cancelled Sessions
            </CardTitle>
            <CardDescription>
              Total sessions cancelled in {getMonthOptions().find(o => o.value === selectedMonth)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-destructive">{lostRevenue?.sessionCount || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/30 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              Lost Profit
            </CardTitle>
            <CardDescription>Potential profit lost from cancelled sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-orange-600">{formatVND(lostRevenue?.lostProfit || 0)}</div>
            <div className="text-sm text-muted-foreground mt-2 space-y-1">
              <p>Lost Tuition: {formatVND(lostRevenue?.lostTuition || 0)}</p>
              <p>Saved Payroll: {formatVND(lostRevenue?.savedPayroll || 0)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Excused Absences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-amber-600" />
            Excused Absences
          </CardTitle>
          <CardDescription>
            Students excused — tuition lost: {formatVND(excusedData?.totalLoss || 0)} ({excusedData?.count || 0} absences)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {excusedData?.rows && excusedData.rows.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Tuition Lost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {excusedData.rows.map((row: any) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.date}</TableCell>
                    <TableCell className="font-medium">{row.studentName}</TableCell>
                    <TableCell>{row.className}</TableCell>
                    <TableCell className="text-right text-amber-600 font-medium">{formatVND(row.rate)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50 font-bold">
                  <TableCell colSpan={3}>TOTAL</TableCell>
                  <TableCell className="text-right text-amber-600">{formatVND(excusedData.totalLoss)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No excused absences this month.</p>
          )}
        </CardContent>
      </Card>

      {/* Family Payment Activity Log */}
      <FamilyPaymentActivityLog selectedMonth={selectedMonth} />

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Payment Details
          </CardTitle>
          <CardDescription>
            All payments for {getMonthOptions().find(o => o.value === selectedMonth)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentDetailsTable selectedMonth={selectedMonth} />
        </CardContent>
      </Card>

      {/* Class Finance Report */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Class Finance Report
              </CardTitle>
              <CardDescription>
                Financial breakdown by class for {getMonthOptions().find(o => o.value === selectedMonth)?.label}
              </CardDescription>
            </div>
            <Button onClick={exportClassFinanceCSV} variant="outline" size="sm" disabled={!classFinance?.length}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Students</TableHead>
                <TableHead className="text-right">Gross Tuition</TableHead>
                <TableHead className="text-right">Discounts</TableHead>
                <TableHead className="text-right">Net Tuition</TableHead>
                <TableHead className="text-right">Payroll</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classFinance?.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">{cls.name}</TableCell>
                  <TableCell className="text-right">{cls.sessionCount}</TableCell>
                  <TableCell className="text-right">{cls.studentCount}</TableCell>
                  <TableCell className="text-right">{formatVND(cls.grossTuition)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {cls.discounts > 0 ? `-${formatVND(cls.discounts)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatVND(cls.tuition)}</TableCell>
                  <TableCell className="text-right">{formatVND(cls.payroll)}</TableCell>
                  <TableCell className={`text-right font-semibold ${cls.net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatVND(cls.net)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">{formatVND(totalGrossTuition)}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {totalDiscounts > 0 ? `-${formatVND(totalDiscounts)}` : '-'}
                </TableCell>
                <TableCell className="text-right">{formatVND(totalTuition)}</TableCell>
                <TableCell className="text-right">{formatVND(totalPayroll)}</TableCell>
                <TableCell className={`text-right ${totalNet >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                  {formatVND(totalNet)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsTab;
