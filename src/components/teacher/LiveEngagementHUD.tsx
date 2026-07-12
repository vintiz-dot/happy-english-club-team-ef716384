/**
 * LiveEngagementHUD — real-time class engagement telemetry.
 *
 * Subscribes to today's point_transactions and attendance over Supabase
 * Realtime and renders a low-latency HUD: per-student engagement chips
 * colored by recency (who hasn't participated lately), today's point
 * totals, attendance state, and an engagement-balance meter. Every chip
 * opens the StudentActionPopover for zero-reload micro-actions.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StudentActionPopover } from "@/components/shared/StudentActionPopover";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Activity, Radio, MoonStar } from "lucide-react";

interface Props {
  classId: string;
  canManagePoints?: boolean;
  onViewHistory?: (studentId: string, studentName: string) => void;
}

interface HudStudent {
  id: string;
  name: string;
  pointsToday: number;
  lastActivityAt: string | null;
  attendance: string | null;
}

const QUIET_MINUTES = 10;

function minutesSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

export function LiveEngagementHUD({ classId, canManagePoints = true, onViewHistory }: Props) {
  const queryClient = useQueryClient();
  const [, forceTick] = useState(0);

  // Recency colors need a clock even without new events.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const { data: students = [] } = useQuery<HudStudent[]>({
    queryKey: ["live-hud", classId],
    enabled: !!classId,
    refetchInterval: 60_000, // realtime handles the fast path; this is the safety net
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);

      // `as any`: keeps tsc from exploding on deeply-instantiated builder
      // types inside Promise.all (same pattern as useVocabularyStore).
      const [{ data: enrollRows }, { data: txns }, { data: session }] = (await Promise.all([
        (supabase as any)
          .from("enrollments")
          .select("students(id, full_name)")
          .eq("class_id", classId)
          .eq("status", "active"),
        (supabase as any)
          .from("point_transactions")
          .select("student_id, points, created_at")
          .eq("class_id", classId)
          .eq("date", today),
        (supabase as any)
          .from("sessions")
          .select("id")
          .eq("class_id", classId)
          .eq("date", today)
          .maybeSingle(),
      ])) as Array<{ data: any }>;

      let attendanceMap = new Map<string, string>();
      if (session?.id) {
        const { data: att } = await supabase
          .from("attendance")
          .select("student_id, status")
          .eq("session_id", session.id);
        attendanceMap = new Map((att || []).map((a: any) => [a.student_id, a.status]));
      }

      const byStudent = new Map<string, { points: number; last: string | null }>();
      for (const t of txns || []) {
        const cur = byStudent.get(t.student_id) || { points: 0, last: null };
        cur.points += t.points || 0;
        if (!cur.last || (t.created_at && t.created_at > cur.last)) cur.last = t.created_at;
        byStudent.set(t.student_id, cur);
      }

      return (enrollRows || [])
        .map((r: any) => r.students)
        .filter(Boolean)
        .map((s: any) => ({
          id: s.id,
          name: s.full_name,
          pointsToday: byStudent.get(s.id)?.points ?? 0,
          lastActivityAt: byStudent.get(s.id)?.last ?? null,
          attendance: attendanceMap.get(s.id) ?? null,
        }))
        .sort((a: HudStudent, b: HudStudent) => a.name.localeCompare(b.name));
    },
  });

  // Realtime: any point/attendance event in this class refreshes the HUD.
  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel(`hud-${classId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "point_transactions", filter: `class_id=eq.${classId}` },
        () => queryClient.invalidateQueries({ queryKey: ["live-hud", classId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "attendance" },
        () => queryClient.invalidateQueries({ queryKey: ["live-hud", classId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, queryClient]);

  const { active, quiet, balance } = useMemo(() => {
    const present = students.filter((s) => (s.attendance || "").toLowerCase() !== "absent");
    const engaged = present.filter((s) => {
      const m = minutesSince(s.lastActivityAt);
      return m !== null && m <= QUIET_MINUTES;
    });
    const quietOnes = present.filter((s) => {
      const m = minutesSince(s.lastActivityAt);
      return m === null || m > QUIET_MINUTES;
    });
    return {
      active: engaged,
      quiet: quietOnes,
      balance: present.length ? engaged.length / present.length : 0,
    };
  }, [students]);

  if (!students.length) return null;

  return (
    <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.03] to-blue-500/[0.03]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
            Live engagement
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-xs">
              <Activity className="h-3 w-3 text-emerald-500" />{active.length} active
            </Badge>
            {quiet.length > 0 && (
              <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-500/40">
                <MoonStar className="h-3 w-3" />{quiet.length} quiet
              </Badge>
            )}
          </div>
        </div>
        {/* Engagement balance meter */}
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
          <motion.div
            animate={{ width: `${Math.round(balance * 100)}%` }}
            transition={{ duration: 0.6 }}
            className={cn(
              "h-full rounded-full",
              balance >= 0.7 ? "bg-emerald-500" : balance >= 0.4 ? "bg-amber-400" : "bg-red-400",
            )}
          />
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="flex flex-wrap gap-1.5">
          {students.map((s) => {
            const mins = minutesSince(s.lastActivityAt);
            const isAbsent = (s.attendance || "").toLowerCase() === "absent";
            const recency =
              isAbsent ? "absent"
              : mins === null ? "none"
              : mins <= 5 ? "hot"
              : mins <= QUIET_MINUTES ? "warm"
              : "cold";
            const chip = (
              <button
                className={cn(
                  "flex items-center gap-1.5 rounded-full border pl-1.5 pr-2.5 py-1 text-xs font-medium transition-all hover:shadow-sm",
                  recency === "hot" && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                  recency === "warm" && "border-cyan-500/40 bg-cyan-500/5",
                  recency === "cold" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  recency === "none" && "border-dashed border-muted-foreground/40 text-muted-foreground",
                  recency === "absent" && "border-muted bg-muted/40 text-muted-foreground/60 line-through",
                )}
                title={
                  isAbsent ? "Absent today"
                  : mins === null ? "No activity yet this lesson"
                  : `Last engaged ${mins} min ago · ${s.pointsToday} pts today`
                }
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full shrink-0",
                    recency === "hot" && "bg-emerald-500",
                    recency === "warm" && "bg-cyan-400",
                    recency === "cold" && "bg-amber-500",
                    (recency === "none" || recency === "absent") && "bg-muted-foreground/40",
                  )}
                />
                {s.name.split(" ").slice(-1)[0]}
                {s.pointsToday !== 0 && (
                  <span className={cn("font-bold", s.pointsToday > 0 ? "text-emerald-600" : "text-red-500")}>
                    {s.pointsToday > 0 ? `+${s.pointsToday}` : s.pointsToday}
                  </span>
                )}
              </button>
            );
            return (
              <StudentActionPopover
                key={s.id}
                studentId={s.id}
                studentName={s.name}
                classId={classId}
                canManagePoints={canManagePoints}
                onViewHistory={() => onViewHistory?.(s.id, s.name)}
              >
                {chip}
              </StudentActionPopover>
            );
          })}
        </div>
        {quiet.length > 0 && (
          <p className="text-[11px] text-amber-600 mt-2 flex items-center gap-1.5">
            <Radio className="h-3 w-3" />
            Haven't engaged in {QUIET_MINUTES}+ min: {quiet.map((s) => s.name.split(" ").slice(-1)[0]).join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
