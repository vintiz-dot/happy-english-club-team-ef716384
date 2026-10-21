/**
 * Closing a payroll month, and what to do when a closed one moves.
 *
 * Closing snapshots what each member of staff is owed into payroll_lines,
 * books the cost into expenditures once, and marks the period locked. From
 * then on calculate-payroll reports the stored figures and the database
 * refuses to overwrite them.
 *
 * WHAT A LOCK DOES NOT DO. It does not freeze the month's sessions or its
 * attendance. Correcting attendance after the fact is ordinary work -
 * repair-attendance exists for it - and a lock that turned a routine
 * correction into an administrative appeal would be worked around rather
 * than used. So the inputs stay editable and the FIGURES stop moving. When
 * a correction lands on a closed month this panel shows the difference and
 * offers to carry it into the next open month as an adjustment, which is
 * the ordinary payroll answer: the record of what was actually paid stays
 * true, and the correction is paid when it was found.
 *
 * Reopening is the other route, and deliberately the less convenient one.
 * It is for "we closed the wrong month", not for "September turned out to
 * be 200,000 short" - reopening a month that has been paid rewrites the
 * record of what was paid. It needs a reason, and the reason is kept on
 * the period row as well as in audit_log.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, LockOpen, TriangleAlert, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";

export interface LiveStaffTotal {
  id: string;
  staffType: "teacher" | "ta";
  name: string;
  /** What this month costs if recomputed right now. */
  totalEarned: number;
}

export interface PayrollMonthLockProps {
  month: string;
  live: LiveStaffTotal[];
}

const vnd = (n: number) => `${Math.round(n).toLocaleString()} ₫`;
const signed = (n: number) => `${n > 0 ? "+" : ""}${vnd(n)}`;

/** The month a correction gets paid in: the later of next month and this one. */
function nextOpenMonth(lockedMonth: string): string {
  const after = dayjs(`${lockedMonth}-01`).add(1, "month").format("YYYY-MM");
  const now = dayjs().format("YYYY-MM");
  return after > now ? after : now;
}

export function PayrollMonthLock({ month, live }: PayrollMonthLockProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [showReopen, setShowReopen] = useState(false);

  const { data: period } = useQuery({
    queryKey: ["payroll-period", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("month, status, locked_at, locked_by, reopened_at, reopen_reason")
        .eq("month", month)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const locked = period?.status === "locked";

  const { data: lines = [] } = useQuery({
    queryKey: ["payroll-lines", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_lines")
        .select("teacher_id, assistant_id, staff_name, total_amount_vnd")
        .eq("month", month);
      if (error) throw error;
      return data ?? [];
    },
    enabled: locked,
  });

  const { data: carried = [] } = useQuery({
    queryKey: ["payroll-adjustments-from", month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_adjustments")
        .select("teacher_id, assistant_id, amount_vnd, month")
        .eq("origin_month", month);
      if (error) throw error;
      return data ?? [];
    },
    enabled: locked,
  });

  // What has moved since the month was closed, per person. Anything already
  // carried is netted off, so a difference does not keep being offered
  // after it has been dealt with.
  const drift = useMemo(() => {
    if (!locked) return [];
    const paid = new Map(lines.map((l) => [l.teacher_id ?? l.assistant_id ?? "", l.total_amount_vnd]));
    const done = new Map<string, number>();
    for (const a of carried) {
      const id = a.teacher_id ?? a.assistant_id ?? "";
      done.set(id, (done.get(id) ?? 0) + a.amount_vnd);
    }
    return live
      .map((s) => ({
        ...s,
        paid: paid.get(s.id) ?? 0,
        delta: Math.round(s.totalEarned - (paid.get(s.id) ?? 0) - (done.get(s.id) ?? 0)),
      }))
      .filter((s) => s.delta !== 0);
  }, [locked, lines, carried, live]);

  const invalidate = () => {
    for (const k of ["payroll-period", "payroll-period-status", "payroll-lines", "payroll-adjustments-from", "admin-payroll", "expenditures", "finance-summary", "finance-overview", "class-finance"]) {
      queryClient.invalidateQueries({ queryKey: [k] });
    }
  };

  const act = useMutation({
    mutationFn: async (vars: { action: "close" | "reopen"; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("close-payroll-month", {
        body: { month, action: vars.action, reason: vars.reason },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, vars) => {
      toast.success(
        vars.action === "close"
          ? `${dayjs(`${month}-01`).format("MMMM YYYY")} closed — ${data.lines} line(s), ${vnd(data.totalAmountVnd)}`
          : `${dayjs(`${month}-01`).format("MMMM YYYY")} reopened`,
      );
      setReason("");
      setShowReopen(false);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not update the period"),
  });

  const carry = useMutation({
    mutationFn: async () => {
      const target = nextOpenMonth(month);
      const rows = drift.map((d) => ({
        month: target,
        origin_month: month,
        teacher_id: d.staffType === "teacher" ? d.id : null,
        assistant_id: d.staffType === "ta" ? d.id : null,
        amount_vnd: d.delta,
        reason: `Correction to ${dayjs(`${month}-01`).format("MMM YYYY")} found after close`,
      }));
      const { error } = await supabase.from("payroll_adjustments").insert(rows);
      if (error) throw error;
      return target;
    },
    onSuccess: (target) => {
      toast.success(`Carried into ${dayjs(`${target}-01`).format("MMMM YYYY")}`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Could not carry the correction"),
  });

  const earned = live.reduce((n, s) => n + s.totalEarned, 0);
  const label = dayjs(`${month}-01`).format("MMMM YYYY");

  return (
    <div className="rounded-lg border p-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {locked ? <Lock className="h-4 w-4 text-muted-foreground" /> : <LockOpen className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium">{label}</span>
          <Badge variant={locked ? "secondary" : "outline"}>{locked ? "Closed" : "Open"}</Badge>
          {locked && period?.locked_at && (
            <span className="text-xs text-muted-foreground">
              closed {dayjs(period.locked_at).format("D MMM YYYY")}
            </span>
          )}
          {period?.reopened_at && (
            <span className="text-xs text-muted-foreground">
              · reopened {dayjs(period.reopened_at).format("D MMM")}
              {period.reopen_reason ? `: ${period.reopen_reason}` : ""}
            </span>
          )}
        </div>

        {locked ? (
          <Button variant="outline" size="sm" onClick={() => setShowReopen((v) => !v)} disabled={act.isPending}>
            <LockOpen className="mr-2 h-4 w-4" />
            Reopen
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => act.mutate({ action: "close" })}
            disabled={act.isPending || earned <= 0}
          >
            <Lock className="mr-2 h-4 w-4" />
            {act.isPending ? "Closing…" : `Close ${label}`}
          </Button>
        )}
      </div>

      {!locked && (
        <p className="text-xs text-muted-foreground">
          Closing records {vnd(earned)} against {live.filter((s) => s.totalEarned > 0).length} member(s) of staff,
          books it to expenditures once, and stops these figures changing. Sessions and attendance stay editable.
        </p>
      )}

      {showReopen && locked && (
        <div className="space-y-2 rounded border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            Reopening rewrites the record of what was paid.
          </p>
          <p className="text-xs text-muted-foreground">
            If the month has already gone out, carry the difference into a later month instead — the button below
            does that. Reopen is for a month closed by mistake.
          </p>
          <div>
            <Label htmlFor={`reopen-${month}`} className="text-xs">Reason (required)</Label>
            <Input
              id={`reopen-${month}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Closed the wrong month"
            />
          </div>
          <Button
            size="sm"
            variant="destructive"
            disabled={reason.trim().length < 3 || act.isPending}
            onClick={() => act.mutate({ action: "reopen", reason: reason.trim() })}
          >
            Reopen {label}
          </Button>
        </div>
      )}

      {locked && drift.length > 0 && (
        <div className="space-y-2 rounded border border-amber-500/50 bg-amber-500/10 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold">
            <TriangleAlert className="h-4 w-4 text-amber-600" />
            {drift.length} figure{drift.length === 1 ? " has" : "s have"} moved since this month was closed.
          </p>
          <div className="space-y-0.5">
            {drift.map((d) => (
              <p key={d.id} className="text-xs">
                <span className="font-medium">{d.name}</span> — paid {vnd(d.paid)}, now computes {vnd(d.totalEarned)}
                {" "}(<span className="font-medium">{signed(d.delta)}</span>)
              </p>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {label} keeps what it was paid at. The difference is paid in{" "}
            {dayjs(`${nextOpenMonth(month)}-01`).format("MMMM YYYY")}.
          </p>
          <Button size="sm" variant="outline" disabled={carry.isPending} onClick={() => carry.mutate()}>
            <ArrowRightLeft className="mr-2 h-4 w-4" />
            {carry.isPending ? "Carrying…" : `Carry into ${dayjs(`${nextOpenMonth(month)}-01`).format("MMM YYYY")}`}
          </Button>
        </div>
      )}

      {locked && drift.length === 0 && (
        <p className="text-xs text-muted-foreground">
          The figures below are what this month was closed at. Nothing has moved since.
        </p>
      )}
    </div>
  );
}
