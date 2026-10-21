/**
 * The school-wide operational reports: cancelled sessions and the profit
 * lost to them, excused absences, family payment activity, and class P&L.
 *
 * Lifted out of ReportsTab unchanged when that page gained the per-student
 * audit. Two reasons it is a separate file rather than a second block on
 * one page: these are school-wide questions and the audit is a per-person
 * one, which are different jobs; and as its own component inside a tab it
 * only mounts when looked at, so its three month-wide queries no longer
 * run every time somebody opens Reports to check one student.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, XCircle, TrendingDown, UserX, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { sessionPayVnd } from "@/lib/payRate";
import { durationMinutes } from "@/lib/sessionDuration";
import { splitPayrollByClass } from "@/lib/finance/classPayroll";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { monthKey } from "@/lib/date";
import { formatVND } from "@/lib/invoice/formatter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentDetailsTable } from "@/components/admin/tabs/PaymentDetailsTable";
import { FamilyPaymentActivityLog } from "@/components/admin/FamilyPaymentActivityLog";
import { BulkReportExport } from "@/components/reports/BulkReportExport";

const OperationalReports = () => {
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
        .select(`id, date, start_time, end_time, class_id, classes(id, name, session_rate_vnd), teachers(id, hourly_rate_vnd, pay_rate_type, per_session_rate_vnd)`)
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
        // durationMinutes, not a hand-rolled subtraction: the inline version
        // goes negative across midnight and would turn saved payroll into a
        // charge.
        const minutes = durationMinutes(session.start_time, session.end_time) ?? 0;

        const studentCount = (allEnrollments || []).filter(e =>
          e.class_id === session.class_id &&
          e.start_date <= session.date &&
          (!e.end_date || e.end_date >= session.date)
        ).length;

        const sessionRate = (session.classes as any)?.session_rate_vnd || 0;

        totalLostTuition += sessionRate * studentCount;
        // A cancelled lesson saves a per-session teacher's whole fee, not a
        // pro-rated slice of an hourly rate they are not on.
        totalLostPayroll += sessionPayVnd(session.teachers as any, minutes);
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

  // Class finance - BULK queries instead of per-class waterfall.
  //
  // WHAT A CLASS COSTS, as of 21 Oct 2026. Two things were missing and
  // both of them flattered every class:
  //
  //   Teaching assistants. Pay was priced here from the session's teacher
  //   alone, so a class with a TA in every lesson showed none of that
  //   cost - while the Payroll tab paid it and the expenditure booking
  //   charged the school for it. Pay now comes from calculate-payroll,
  //   which covers both and prices each session at the rate that applied
  //   on its own date (staff_pay_rates), rather than at whatever the
  //   teacher row happens to say when the report is opened.
  //
  //   Rent, electricity and the rest. A class also consumes the standing
  //   costs of the school. Those are split across the classes that ran,
  //   by session count, in SQL - see 20261021097000. The arithmetic is
  //   not repeated here: the same split has to be reproducible when the
  //   month is closed, and two copies would become two answers.
  const { data: classFinance } = useQuery({
    queryKey: ["class-finance", selectedMonth],
    queryFn: async () => {
      const monthStart = `${selectedMonth}-01`;
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      const monthEnd = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01`;

      const [classesRes, sessionsRes, enrollmentsRes, invoicesRes, payrollRes, overheadRes, poolRes, periodRes] = await Promise.all([
        // No is_active filter. A class archived since the month ran
        // still held its lessons and still used the room; dropping it
        // would hand its share of the rent to the classes still open.
        // Dormant active classes are filtered out further down instead.
        supabase.from("classes").select("id, name, session_rate_vnd, is_active"),
        supabase
          .from("sessions")
          .select("id, class_id, teacher_id, start_time, end_time, rate_override_vnd, status, teachers(hourly_rate_vnd, pay_rate_type, per_session_rate_vnd)")
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
        supabase.functions.invoke("calculate-payroll", { body: { month: selectedMonth } }),
        // Cast on purpose: src/integrations/supabase/types.ts is
        // regenerated from the live database by the other agent working
        // on this repo, and a regeneration that lands before the
        // migration does would drop these two names and break the build.
        supabase.rpc("class_overhead_for_month" as never, { p_month: selectedMonth } as never),
        supabase.rpc("class_overhead_pool" as never, { p_month: selectedMonth } as never),
        supabase.from("payroll_periods").select("status").eq("month", selectedMonth).maybeSingle(),
      ]);

      const classes = classesRes.data || [];
      const sessions = sessionsRes.data || [];
      const enrollments = enrollmentsRes.data || [];
      const invoices = invoicesRes.data || [];
      const locked = (periodRes.data as { status?: string } | null)?.status === "locked";

      // Pay, per class, from the function that owns pricing. If it cannot
      // be reached the report still renders - from the old per-session
      // estimate - and says so, rather than showing a confident wrong
      // number or an empty page.
      const payrollRows = (payrollRes as { data?: { payrollData?: unknown[] } }).data?.payrollData;
      const payrollEstimated = !!payrollRes.error || !Array.isArray(payrollRows);
      const paySplit = payrollEstimated
        ? null
        : splitPayrollByClass(payrollRows as Parameters<typeof splitPayrollByClass>[0], { locked });

      // Standing costs, split in SQL. Unavailable until 20261021097000 is
      // applied, which is a state worth naming rather than showing as a
      // row of zeros that reads as "there is no rent".
      const overheadRows = (overheadRes.data ?? []) as Array<{
        class_id: string;
        share_vnd: number | string;
        sessions_count: number;
        frozen: boolean;
      }>;
      const overheadUnavailable = !!overheadRes.error;
      const overheadByClass = new Map<string, number>(
        overheadRows.map((r) => [r.class_id, Number(r.share_vnd ?? 0)]),
      );
      const overheadFrozen = overheadRows.some((r) => r.frozen);
      const overheadPool = Number(poolRes.error ? 0 : (poolRes.data ?? 0));

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

      const rows = classes.map((cls) => {
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

        let payroll: number;
        if (paySplit) {
          payroll = paySplit.byClass.get(cls.id) ?? 0;
        } else {
          payroll = 0;
          for (const session of classSessions) {
            const minutes = durationMinutes(session.start_time, session.end_time) ?? 0;
            payroll += sessionPayVnd(session.teachers as any, minutes);
          }
        }

        const overhead = overheadByClass.get(cls.id) ?? 0;
        const discounts = grossTuition - netTuition;
        const net = netTuition - payroll - overhead;

        return {
          id: cls.id,
          name: cls.name,
          isActive: cls.is_active !== false,
          sessionCount: classSessions.length,
          studentCount,
          grossTuition: Math.round(grossTuition),
          discounts: Math.round(discounts),
          tuition: Math.round(netTuition),
          payroll: Math.round(payroll),
          overhead: Math.round(overhead),
          net: Math.round(net),
        };
      })
        // An archived class appears only for the months it actually ran.
        // An active one appears even when it ran nothing, as before.
        .filter((row) => row.isActive || row.sessionCount > 0);

      return {
        rows,
        locked,
        payrollEstimated,
        overheadUnavailable,
        overheadFrozen,
        overheadPool,
        overheadAllocated: [...overheadByClass.values()].reduce((n, v) => n + v, 0),
        unattributedPayroll: paySplit?.unattributed ?? 0,
      };
    },
  });

  const classRows = classFinance?.rows ?? [];
  const totalGrossTuition = classRows.reduce((sum, c) => sum + c.grossTuition, 0);
  const totalDiscounts = classRows.reduce((sum, c) => sum + c.discounts, 0);
  const totalTuition = classRows.reduce((sum, c) => sum + c.tuition, 0);
  const totalPayroll = classRows.reduce((sum, c) => sum + c.payroll, 0);
  const totalOverhead = classRows.reduce((sum, c) => sum + c.overhead, 0);
  const totalNet = classRows.reduce((sum, c) => sum + c.net, 0);
  // Standing costs that belong to the month but are not in the column
  // above. Measured against the DISPLAYED total, not against the full
  // RPC result: a share belonging to a class the table filtered out would
  // otherwise count as allocated and disappear with no warning. Named
  // rather than dropped, so the Expenditures page and this table never
  // differ without saying why.
  const unallocatedOverhead = Math.max(0, (classFinance?.overheadPool ?? 0) - totalOverhead);

  const exportClassFinanceCSV = () => {
    if (classRows.length === 0) return;
    const csv = [
      ["Class", "Status", "Sessions", "Students", "Gross Tuition", "Discounts", "Net Tuition", "Payroll", "Overhead", "Profit"].join(","),
      ...classRows.map(c => [
        `"${c.name}"`,
        c.isActive ? "Active" : "Archived",
        c.sessionCount,
        c.studentCount,
        c.grossTuition,
        c.discounts,
        c.tuition,
        c.payroll,
        c.overhead,
        c.net,
      ].join(",")),
      ["TOTAL", "-", "-", "-", totalGrossTuition, totalDiscounts, totalTuition, totalPayroll, totalOverhead, totalNet].join(","),
      ...(unallocatedOverhead > 0
        ? [["UNALLOCATED OVERHEAD", "-", "-", "-", "", "", "", "", unallocatedOverhead, ""].join(",")]
        : []),
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
      {/* Student progress reports — pick a class and students, export PDFs. */}
      <BulkReportExport />

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
                {classFinance?.overheadFrozen
                  ? " \u00b7 overhead frozen at what this month was closed at"
                  : ""}
              </CardDescription>
              {classFinance?.overheadUnavailable && (
                <p className="text-xs text-amber-600 mt-1">
                  Standing costs are not included: the class-overhead migration has not been applied yet.
                </p>
              )}
              {classFinance?.payrollEstimated && (
                <p className="text-xs text-amber-600 mt-1">
                  Payroll could not be loaded, so these figures are estimated from teacher rates and leave
                  out teaching assistants.
                </p>
              )}
              {(classFinance?.unattributedPayroll ?? 0) !== 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatVND(classFinance?.unattributedPayroll ?? 0)} of pay belongs to no class and is not
                  in the rows below.
                </p>
              )}
              {unallocatedOverhead > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {formatVND(unallocatedOverhead)} of standing costs is not in the Overhead column — either no
                  class ran this month, or it belongs to a class not listed above.
                </p>
              )}
              {/* The bottom line here is structurally higher than the
                  Finance Summary's net, and saying so beats letting
                  someone discover it by subtraction. */}
              <p className="text-xs text-muted-foreground mt-1">
                Overhead covers recurring costs marked “share across classes”. One-off spend is not shared,
                so this TOTAL is higher than Net Profit on the Finance tab by whatever else was spent.
                {!classFinance?.locked &&
                  " An open month prices every scheduled session; the Finance tab's actual figure counts only lessons already held."}
              </p>
            </div>
            <Button onClick={exportClassFinanceCSV} variant="outline" size="sm" disabled={!classRows.length}>
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
                <TableHead className="text-right">Overhead</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classRows.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell className="font-medium">
                    {cls.name}
                    {!cls.isActive && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">archived</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{cls.sessionCount}</TableCell>
                  <TableCell className="text-right">{cls.studentCount}</TableCell>
                  <TableCell className="text-right">{formatVND(cls.grossTuition)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {cls.discounts > 0 ? `-${formatVND(cls.discounts)}` : '-'}
                  </TableCell>
                  <TableCell className="text-right font-medium">{formatVND(cls.tuition)}</TableCell>
                  <TableCell className="text-right">{formatVND(cls.payroll)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {cls.overhead > 0 ? formatVND(cls.overhead) : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${cls.net >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {formatVND(cls.net)}
                  </TableCell>
                </TableRow>
              ))}
              {/* Nine cells, matching the nine headers. Count them when
                  adding a column: an extra one here shifts every total
                  under the wrong heading and the rows above still look
                  right, so it reads as the totals contradicting them. */}
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
                <TableCell className="text-right text-muted-foreground">
                  {totalOverhead > 0 ? formatVND(totalOverhead) : '-'}
                </TableCell>
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

export default OperationalReports;
