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
import { durationMinutes, formatMinutes, formatSignedMinutes } from "@/lib/sessionDuration";
import {
  checkSessionLength,
  parseWeeklySlots,
  payableExpectedMinutes,
  varianceFromCheck,
} from "@/lib/classSchedule";
import { indexScheduleVersions, scheduleOnDate, type ScheduleVersion } from "@/lib/scheduleHistory";
import { AlertTriangle } from "lucide-react";
import {
  describeRate,
  lengthAffectsPay,
  payRateTypeOf,
  totalPayVnd,
  varianceCostVnd,
  type StaffPayRate,
} from "@/lib/payRate";

interface StaffPayroll {
  staff: {
    id: string;
    full_name: string;
    hourly_rate_vnd: number;
    pay_rate_type?: string | null;
    per_session_rate_vnd?: number | null;
    is_active?: boolean;
  };
  staffType: "teacher" | "ta";
  heldSessions: number;
  scheduledSessions: number;
  totalEarned: number;
  projectedEarnings: number;
  totalProjected: number;
  /**
   * The same month costed at each day's scheduled length — but only for
   * sessions running a length their class never schedules. A session running
   * one of the class's other lengths is costed at what it ran, because it is
   * a reschedule rather than an error and there is no overpayment to report.
   */
  expectedProjected: number;
  /**
   * totalProjected - expectedProjected. Positive = paying over the setting.
   * Always 0 for per-session staff: a long lesson costs them nothing extra,
   * so there is no overpayment to report even when the length is wrong.
   */
  varianceAmount: number;
  varianceMinutes: number;
  mismatchedSessions: {
    id: string;
    date: string;
    className: string;
    actualMinutes: number;
    expectedMinutes: number;
    deltaMinutes: number;
    deltaAmount: number;
  }[];
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
      const [teachersRes, tasRes, sessionsRes, participantsRes, versionsRes] = await Promise.all([
        // Deliberately NOT filtered by is_active. Archiving a teacher must
        // not erase the lessons they already taught this month — with the
        // filter on the query, archiving someone on the 20th silently
        // dropped their first nineteen days out of this screen and out of
        // the CSV. is_active is their status today; this screen is about a
        // month that has already happened. Inactive staff with no sessions
        // are dropped below instead, which is what the filter was for.
        supabase
          .from("teachers")
          .select("id, full_name, hourly_rate_vnd, pay_rate_type, per_session_rate_vnd, is_active")
          .order("full_name"),
        supabase
          .from("teaching_assistants")
          .select("id, full_name, hourly_rate_vnd, pay_rate_type, per_session_rate_vnd, is_active")
          .order("full_name"),
        supabase
          .from("sessions")
          .select(`id, date, start_time, end_time, status, teacher_id, class_id, classes!inner(name, default_session_length_minutes, schedule_template)`)
          .gte("date", monthStart)
          .lt("date", monthEnd)
          .in("status", ["Held", "Scheduled"])
          .order("date", { ascending: true }),
        supabase
          .from("session_participants")
          .select("session_id, teaching_assistant_id")
          .eq("participant_type", "teaching_assistant"),
        // Every class's timetable history, in one read. Fetched whole rather
        // than filtered to the month: a session in July is judged against
        // the version in force in July, which may have started years before.
        supabase
          .from("class_schedule_versions")
          .select("class_id, effective_from, weekly_slots, default_session_length_minutes"),
      ]);

      const teachers = teachersRes.data || [];
      const tas = tasRes.data || [];
      const allSessions = sessionsRes.data || [];
      const participants = participantsRes.data || [];
      const versionsByClass = indexScheduleVersions(
        (versionsRes.data ?? []) as unknown as ScheduleVersion[],
      );

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

      // Uses the shared duration helper rather than a local dayjs diff, so this
      // agrees exactly with calculate-payroll. The two had drifted: that
      // function rolls a non-positive span over midnight, this one produced a
      // negative figure and silently subtracted it from the teacher's pay.
      const calculateAmount = (sessionsList: typeof allSessions, staff: StaffPayRate) =>
        totalPayVnd(
          staff,
          sessionsList.map((s) => durationMinutes(s.start_time, s.end_time) ?? 0),
        );

      /**
       * Each session judged against the weekly slot it belongs to — ON THE
       * DATE IT RAN, not against whatever the class is set to today.
       *
       * This used to read classes.schedule_template, the current timetable.
       * So the day after an admin moved a class from 90 minutes to 120,
       * every ninety-minute lesson already taught turned into a "mismatch":
       * the discrepancy count jumped, the variance column filled with money
       * nobody had overpaid, and "projected at scheduled lengths" re-priced
       * finished months at a length that was never scheduled when they
       * happened. An admin "fixing" those flagged sessions would then have
       * overpaid for real.
       *
       * Cached per (class, version) rather than per class: a month can now
       * legitimately span a timetable change, so one entry per class is no
       * longer enough, and one per session would re-parse the same JSON
       * dozens of times.
       */
      const slotCache = new Map<string, ReturnType<typeof parseWeeklySlots>>();
      const checkOf = (s: (typeof allSessions)[number]) => {
        const classRow = s.classes as any;
        const classId = s.class_id ?? "";
        const resolved = scheduleOnDate(versionsByClass.get(classId), s.date, classRow);
        const key = `${classId}|${resolved.version?.effective_from ?? "current"}`;
        let slots = slotCache.get(key);
        if (!slots) {
          slots = resolved.slots;
          slotCache.set(key, slots);
        }
        return checkSessionLength({
          date: s.date,
          startTime: s.start_time,
          endTime: s.end_time,
          slots,
          classDefaultMinutes:
            resolved.defaultMinutes ?? classRow?.default_session_length_minutes ?? null,
        });
      };

      /**
       * The same sessions costed at the length their day is scheduled for.
       * For per-session staff this comes out equal to calculateAmount, which
       * is correct rather than a coincidence: their pay does not depend on
       * the length, so re-costing at a different length changes nothing.
       */
      const calculateExpectedAmount = (sessionsList: typeof allSessions, staff: StaffPayRate) =>
        totalPayVnd(
          staff,
          sessionsList.map(
            (s) => payableExpectedMinutes(checkOf(s)) ?? (durationMinutes(s.start_time, s.end_time) ?? 0),
          ),
        );

      /**
       * Sessions running a length their class never schedules.
       *
       * Still listed for per-session staff - a lesson running 30 minutes
       * over is a real scheduling problem whoever is teaching it - but
       * deltaAmount comes back 0, because for them it is not a money
       * problem and the screens read deltaAmount to decide whether to show
       * a cost at all.
       */
      const findMismatches = (sessionsList: typeof allSessions, staff: StaffPayRate) =>
        sessionsList.flatMap((s) => {
          const variance = varianceFromCheck(checkOf(s));
          if (!variance) return [];
          return [{
            id: s.id,
            date: s.date,
            className: (s.classes as any)?.name ?? "Class",
            actualMinutes: variance.actualMinutes,
            expectedMinutes: variance.expectedMinutes,
            deltaMinutes: variance.deltaMinutes,
            deltaAmount: varianceCostVnd(staff, variance.deltaMinutes),
          }];
        });

      const results: StaffPayroll[] = [];

      // Teachers
      for (const teacher of teachers) {
        const sessions = sessionsByTeacher[teacher.id] || [];
        // Archived and nothing on the books this month: nothing to pay, and
        // nothing to show. Archived WITH sessions still appears, flagged.
        if (teacher.is_active === false && sessions.length === 0) continue;
        const held = sessions.filter(s => s.status === "Held");
        const scheduled = sessions.filter(s => s.status === "Scheduled");
        const totalHeld = calculateAmount(held, teacher);
        const totalScheduled = calculateAmount(scheduled, teacher);
        const expectedProjected = calculateExpectedAmount(sessions, teacher);
        const mismatched = findMismatches(sessions, teacher);

        results.push({
          staff: teacher,
          staffType: "teacher",
          heldSessions: held.length,
          scheduledSessions: scheduled.length,
          totalEarned: totalHeld,
          projectedEarnings: totalScheduled,
          totalProjected: totalHeld + totalScheduled,
          expectedProjected,
          varianceAmount: totalHeld + totalScheduled - expectedProjected,
          varianceMinutes: mismatched.reduce((n, m) => n + m.deltaMinutes, 0),
          mismatchedSessions: mismatched,
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
        const totalHeld = calculateAmount(held, ta);
        const totalScheduled = calculateAmount(scheduled, ta);
        const expectedProjected = calculateExpectedAmount(taSessions, ta);
        const mismatched = findMismatches(taSessions, ta);

        results.push({
          staff: ta,
          staffType: "ta",
          heldSessions: held.length,
          scheduledSessions: scheduled.length,
          totalEarned: totalHeld,
          projectedEarnings: totalScheduled,
          totalProjected: totalHeld + totalScheduled,
          expectedProjected,
          varianceAmount: totalHeld + totalScheduled - expectedProjected,
          varianceMinutes: mismatched.reduce((n, m) => n + m.deltaMinutes, 0),
          mismatchedSessions: mismatched,
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
        payRateTypeOf(p.staff) === "per_session" ? "Per session" : "Per hour",
        payRateTypeOf(p.staff) === "per_session"
          ? p.staff.per_session_rate_vnd ?? 0
          : p.staff.hourly_rate_vnd,
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
      costsMoney: lengthAffectsPay(p.staff),
    })),
  ) || [];
  const freeMismatches = allMismatches.filter((m) => !m.costsMoney).length;

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
                      ) : !lengthAffectsPay(payroll.staff) ? (
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
