/**
 * Every award one child got, for their family (and staff): when, which
 * class, what for, how many points, and which tab it counts under.
 *
 * Read through `student_points_history` (20261117120000), which lets a
 * family see only their own children and a teacher only the rows of the
 * classes they teach. The period's dates come from the server too
 * (`leaderboard_period`), so a week here is the same Monday-to-Sunday as
 * on the boards.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PeriodPicker, THIS_MONTH } from "@/components/leaderboard/PeriodPicker";
import { BOARD_CATEGORIES } from "@/components/leaderboard/types";
import { BOARD_KEY_OF, periodKey, type PeriodChoice, type ServerCategory } from "@/lib/leaderboard/board";

interface HistoryRow {
  id: string;
  date: string;
  class_id: string;
  class_name: string;
  category: ServerCategory;
  points: number;
  note: string | null;
  homework_title: string | null;
}

const labelOf = (c: ServerCategory) =>
  BOARD_CATEGORIES.find((b) => b.key === BOARD_KEY_OF[c])?.label ?? "Points";

export function PointsHistoryDialog({
  studentId,
  studentName,
  open,
  onOpenChange,
}: {
  studentId: string;
  studentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [period, setPeriod] = useState<PeriodChoice>(THIS_MONTH);

  const { data, isLoading, error } = useQuery({
    queryKey: ["points-history", studentId, periodKey(period)],
    enabled: open && !!studentId,
    queryFn: async () => {
      const { data: per, error: perError } = await supabase.rpc("leaderboard_period" as never, {
        p_kind: period.kind, p_anchor: period.anchor,
      } as never);
      if (perError) throw perError;
      type Per = { from_date: string; to_date: string; label: string };
      const raw = per as unknown as Per[] | Per | null;
      const p = Array.isArray(raw) ? raw[0] ?? null : raw;
      if (!p) throw new Error("No such period");
      const { data: rows, error: rowsError } = await supabase.rpc("student_points_history" as never, {
        p_student: studentId, p_from: p.from_date, p_to: p.to_date,
      } as never);
      if (rowsError) throw rowsError;
      const h = rows as unknown as { rows: HistoryRow[]; total: number; count: number; truncated: boolean };
      return { label: p.label, rows: h?.rows ?? [], total: Number(h?.total ?? 0), count: Number(h?.count ?? 0), truncated: !!h?.truncated };
    },
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{studentName}'s points</DialogTitle>
          <DialogDescription>Every award, newest first.</DialogDescription>
        </DialogHeader>
        <PeriodPicker value={period} onChange={setPeriod} />
        {isLoading ? (
          <p className="py-8 text-center text-hec-small text-hec-ink-soft">Loading…</p>
        ) : error ? (
          <p className="py-8 text-center text-hec-small text-hec-ink-soft">The history could not be loaded right now.</p>
        ) : (data?.rows ?? []).length === 0 ? (
          <p className="py-8 text-center text-hec-small text-hec-ink-soft">No points in {data?.label ?? "this period"}.</p>
        ) : (
          <>
            <p className="text-hec-small tabular-nums text-hec-ink-soft">
              {data!.label}: <span className="font-semibold text-hec-ink">{data!.total}</span> points from {data!.count} awards
              {data!.truncated ? ` (the newest ${data!.rows.length} are listed)` : ""}
            </p>
            <ul className="divide-y divide-hec-line rounded-hec-md border border-hec-line">
              {data!.rows.map((r) => (
                <li key={r.id} className="flex items-start gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-normal break-words text-hec-small text-hec-ink">
                      {r.homework_title || r.note || labelOf(r.category)}
                    </p>
                    <p className="text-hec-caption tabular-nums text-hec-ink-soft">
                      {r.date} · {r.class_name} · {labelOf(r.category)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-hec-small font-semibold tabular-nums ${r.points < 0 ? "text-hec-warn" : "text-hec-ink"}`}
                  >
                    {r.points > 0 ? `+${r.points}` : r.points}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
