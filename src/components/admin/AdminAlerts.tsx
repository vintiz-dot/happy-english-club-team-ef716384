import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, DollarSign, BookOpen, UserX, ChevronRight, ClipboardCheck, Scale, MessageSquare, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { formatVND } from "@/lib/money";

interface Alert {
  id: string;
  type: "overdue" | "ungraded" | "attendance";
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  icon: typeof AlertTriangle;
  link?: string;
}

export function AdminAlerts() {
  const { data: alerts, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["admin-alerts"],
    queryFn: async () => {
      const now = dayjs();
      const currentMonth = now.format("YYYY-MM");
      const results: Alert[] = [];

      // 1. Overdue payments: compute net balance across ALL historical invoices per student
      //    Then net within families so sibling overpayments offset debts.
      const [{ data: allInvoices, error: invErr }, { data: allFamilies, error: famErr }] = await Promise.all([
        supabase
          .from("invoices")
          .select("student_id, month, total_amount, recorded_payment, students:student_id(full_name, family_id)")
          .lt("month", currentMonth),
        supabase
          .from("families")
          .select("id, name"),
      ]);

      if (invErr) throw invErr;
      if (famErr) throw famErr;

      const familyNameMap = new Map<string, string>();
      for (const f of allFamilies || []) {
        familyNameMap.set(f.id, f.name);
      }

      // Per-student totals
      const studentTotals = new Map<string, { name: string; familyId: string | null; charged: number; paid: number; months: Set<string> }>();
      for (const inv of allInvoices || []) {
        const student = inv.students as any;
        const name = student?.full_name || "Unknown";
        const familyId = student?.family_id || null;
        const existing = studentTotals.get(inv.student_id);
        if (existing) {
          existing.charged += inv.total_amount || 0;
          existing.paid += inv.recorded_payment || 0;
          existing.months.add(inv.month);
        } else {
          studentTotals.set(inv.student_id, {
            name,
            familyId,
            charged: inv.total_amount || 0,
            paid: inv.recorded_payment || 0,
            months: new Set([inv.month]),
          });
        }
      }

      // Group by family, net balances within each family
      const familyGroups = new Map<string, { students: { id: string; name: string; netDebt: number; months: Set<string> }[]; netBalance: number }>();

      for (const [sid, info] of studentTotals) {
        const netDebt = info.charged - info.paid;
        if (info.familyId) {
          const group = familyGroups.get(info.familyId) || { students: [], netBalance: 0 };
          group.students.push({ id: sid, name: info.name, netDebt, months: info.months });
          group.netBalance += netDebt; // negative if overpaid
          familyGroups.set(info.familyId, group);
        } else {
          // No family — individual alert if they owe
          if (netDebt > 0) {
            results.push({
              id: `overdue-${sid}`,
              type: "overdue",
              severity: info.months.size >= 2 ? "high" : "medium",
              title: `${info.name} — overdue payment`,
              detail: `${formatVND(netDebt)} across ${info.months.size} month(s)`,
              icon: DollarSign,
              link: `/students/${sid}`,
            });
          }
        }
      }

      // Family-level alerts (only when family net balance > 0)
      for (const [familyId, group] of familyGroups) {
        if (group.netBalance <= 0) continue; // balanced or overpaid
        const familyName = familyNameMap.get(familyId) || "Family";
        const owingStudents = group.students.filter((s) => s.netDebt > 0);
        const allMonths = new Set(group.students.flatMap((s) => [...s.months]));
        const detail = owingStudents.length > 0
          ? `${owingStudents.map((s) => s.name).join(", ")} — net ${formatVND(group.netBalance)}`
          : `${formatVND(group.netBalance)} across ${allMonths.size} month(s)`;
        results.push({
          id: `overdue-family-${familyId}`,
          type: "overdue",
          severity: allMonths.size >= 2 ? "high" : "medium",
          title: `${familyName} — overdue payment`,
          detail,
          icon: DollarSign,
          link: `/families/${familyId}`,
        });
      }

      // 2. Ungraded homework submissions (older than 3 days)
      const threeDaysAgo = now.subtract(3, "day").toISOString();
      const { count: ungradedCount, error: ungradedErr } = await supabase
        .from("homework_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "submitted")
        .lt("submitted_at", threeDaysAgo);

      if (ungradedErr) throw ungradedErr;
      if (ungradedCount && ungradedCount > 0) {
        results.push({
          id: "ungraded-hw",
          type: "ungraded",
          severity: ungradedCount >= 10 ? "high" : "medium",
          title: `${ungradedCount} ungraded submission${ungradedCount > 1 ? "s" : ""}`,
          detail: `Submitted more than 3 days ago and waiting for review`,
          icon: BookOpen,
          link: "/admin?tab=assignments",
        });
      }

      // 3. Students with low attendance this month (< 50% of held sessions)
      const monthStart = now.startOf("month").format("YYYY-MM-DD");
      const { data: heldSessions, error: heldErr } = await supabase
        .from("sessions")
        .select("id, class_id")
        .gte("date", monthStart)
        .lte("date", now.format("YYYY-MM-DD"))
        .eq("status", "Held");

      if (heldErr) throw heldErr;
      if (heldSessions && heldSessions.length > 0) {
        const sessionIds = heldSessions.map((s) => s.id);
        const classIds = [...new Set(heldSessions.map((s) => s.class_id))];

        const [enrollmentsRes, attendanceRes] = await Promise.all([
          supabase
            .from("enrollments")
            .select("student_id, class_id, students:student_id(full_name)")
            .in("class_id", classIds)
            .or(`end_date.is.null,end_date.gte.${monthStart}`),
          supabase
            .from("attendance")
            .select("student_id, session_id, status")
            .in("session_id", sessionIds)
            .eq("status", "Present"),
        ]);

        if (enrollmentsRes.error) throw enrollmentsRes.error;
        if (attendanceRes.error) throw attendanceRes.error;

        const sessionsPerClass: Record<string, number> = {};
        for (const s of heldSessions) {
          sessionsPerClass[s.class_id] = (sessionsPerClass[s.class_id] || 0) + 1;
        }

        const presentByStudent: Record<string, number> = {};
        for (const a of attendanceRes.data || []) {
          presentByStudent[a.student_id] = (presentByStudent[a.student_id] || 0) + 1;
        }

        const lowAttendance: { id: string; name: string }[] = [];
        const seen = new Set<string>();
        for (const e of enrollmentsRes.data || []) {
          const totalSessions = sessionsPerClass[e.class_id] || 0;
          if (totalSessions < 3) continue;
          const attended = presentByStudent[e.student_id] || 0;
          const rate = attended / totalSessions;
          if (rate < 0.5 && !seen.has(e.student_id)) {
            seen.add(e.student_id);
            lowAttendance.push({ id: e.student_id, name: (e.students as any)?.full_name || "Unknown" });
          }
        }

        if (lowAttendance.length > 0) {
          // Create individual alerts for up to 3 students, then a summary
          if (lowAttendance.length <= 3) {
            for (const student of lowAttendance) {
              results.push({
                id: `low-att-${student.id}`,
                type: "attendance",
                severity: "medium",
                title: `${student.name} — low attendance`,
                detail: `Below 50% attendance rate this month`,
                icon: UserX,
                link: `/students/${student.id}`,
              });
            }
          } else {
            const names = lowAttendance.slice(0, 3).map((s) => s.name);
            results.push({
              id: "low-attendance",
              type: "attendance",
              severity: "high",
              title: `${lowAttendance.length} students with low attendance`,
              detail: names.join(", ") + ` and ${lowAttendance.length - 3} more`,
              icon: UserX,
              link: "/students",
            });
          }
        }
      }

      const severityOrder = { high: 0, medium: 1, low: 2 };
      results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      return results;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Queues that wait for a person. Each count is read on its own, so one that
  // fails shows as "unavailable" and is never mistaken for zero.
  const { data: queues, refetch: refetchQueues } = useQuery({
    queryKey: ["admin-alerts-queues"],
    queryFn: async () => {
      const db = supabase as any;
      const month = dayjs().format("YYYY-MM");
      const count = async (q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number | null> => {
        try {
          const { count: c, error } = await q;
          return error ? null : (c ?? 0);
        } catch {
          return null;
        }
      };
      const head = { count: "exact" as const, head: true };
      const [review, recon, feedback, enrol] = await Promise.all([
        count(supabase.from("invoices").select("id", head).eq("month", month).eq("confirmation_status", "needs_review")),
        count(db.from("tuition_reconciliation_items").select("id", head).eq("status", "open")),
        count(db.from("reception_feedback").select("id", head).is("approved_at", null)),
        count(supabase.from("enrollment_requests").select("id", head).eq("status", "pending")),
      ]);
      return { month, review, recon, feedback, enrol };
    },
    staleTime: 5 * 60 * 1000,
  });

  const queueRows: { id: string; label: string; count: number | null; icon: typeof AlertTriangle; link: string }[] = queues
    ? [
        { id: "q-review", label: `bills needing review (${dayjs(queues.month + "-01").format("MMMM")})`, count: queues.review, icon: ClipboardCheck, link: `/admin/tuition-review?month=${queues.month}` },
        { id: "q-recon", label: "open audit items (Finance > Audit)", count: queues.recon, icon: Scale, link: "/admin?tab=finance&sub=audit" },
        { id: "q-feedback", label: "unread reception feedback", count: queues.feedback, icon: MessageSquare, link: "/admin?tab=reception" },
        { id: "q-enrol", label: "pending enrollment requests", count: queues.enrol, icon: UserPlus, link: "/admin?tab=students" },
      ]
    : [];
  const queueUnavailable = queueRows.filter((r) => r.count === null);
  const queueOpen = queueRows.filter((r) => r.count !== null && r.count > 0);
  const queuesLoading = !queues;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-hec-ink-soft" aria-hidden /> Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2].map((i) => <div key={i} className="h-11 rounded-hec-md bg-hec-sunken" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-hec-danger" aria-hidden /> Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3">
            <p className="text-hec-small text-hec-ink">Alerts couldn't load. This is not an all-clear.</p>
            <Button variant="outline" size="sm" onClick={() => { refetch(); refetchQueues(); }} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Try again"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const queueBlock = (
    <>
      {queueOpen.map((r) => {
        const Icon = r.icon;
        return (
          <Link
            key={r.id}
            to={r.link}
            className="flex min-h-hec-target items-center gap-3 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
          >
            <Icon aria-hidden className="h-4 w-4 shrink-0 text-hec-warn" />
            <p className="min-w-0 flex-1 break-words text-hec-small font-medium text-hec-ink">
              Review <span className="tabular-nums">{r.count}</span> {r.label}
            </p>
            <ChevronRight className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
          </Link>
        );
      })}
      {queueUnavailable.map((r) => {
        const Icon = r.icon;
        return (
          <div key={r.id} className="flex min-h-hec-target items-center gap-3 rounded-hec-md border border-hec-line bg-hec-sunken p-3">
            <Icon aria-hidden className="h-4 w-4 shrink-0 text-hec-ink-soft" />
            <p className="min-w-0 flex-1 text-hec-small text-hec-ink-soft">Count unavailable: {r.label}</p>
          </div>
        );
      })}
      {queuesLoading && <p className="text-hec-caption text-hec-ink-soft">Checking review queues…</p>}
    </>
  );
  const alertCount = (alerts?.length ?? 0) + queueOpen.length;

  if (!alerts || alerts.length === 0) {
    if (queueOpen.length > 0 || queueUnavailable.length > 0 || queuesLoading) {
      return (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-hec-ink-soft" aria-hidden /> Alerts
              </CardTitle>
              {queueOpen.length > 0 && <Badge variant="destructive" className="tabular-nums">{alertCount}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-2">{queueBlock}</CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-leaf-tint text-hec-leaf">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-hec-small text-hec-ink-soft">All clear — no issues! ✅</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-danger-tint text-hec-danger">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            Alerts
          </CardTitle>
          <Badge variant="destructive" className="tabular-nums">
            {alertCount}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {queueBlock}
        {alerts.map((alert, i) => {
          const Icon = alert.icon;
          const content = (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={cn(
                "flex min-h-hec-target items-start gap-3 rounded-hec-md border p-3 transition-shadow duration-hec-1 ease-hec",
                alert.link && "cursor-pointer hover:shadow-hec-1",
                alert.severity === "high" && "border-hec-danger/30 bg-hec-danger-tint",
                alert.severity === "medium" && "border-hec-warn/30 bg-hec-warn-tint",
                alert.severity === "low" && "border-hec-line bg-hec-sunken",
              )}
            >
              <Icon aria-hidden className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                alert.severity === "high" && "text-hec-danger",
                alert.severity === "medium" && "text-hec-warn",
                alert.severity === "low" && "text-hec-ink-soft",
              )} />
              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-words text-hec-small font-medium text-hec-ink">{alert.title}</p>
                <p className="break-words text-hec-caption tabular-nums text-hec-ink-soft">{alert.detail}</p>
              </div>
              {alert.link && (
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
              )}
            </motion.div>
          );

          if (alert.link) {
            return (
              <Link
                key={alert.id}
                to={alert.link}
                className="block rounded-hec-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              >
                {content}
              </Link>
            );
          }
          return content;
        })}
      </CardContent>
    </Card>
  );
}
