/**
 * The class's board, on the wall.
 *
 * Opened from the Leaderboard tool's class-screen button, which is what
 * the three display styles were drawn for: a projector at the front of a
 * room, read from the back of it.
 *
 * It fetches rather than taking entries as props because the overlay
 * outlives whatever opened it and should keep itself current — points
 * awarded mid-lesson appear on the wall without anyone touching the
 * laptop. The realtime subscription is the same one the staff board
 * already uses, filtered to this class.
 *
 * One difference from the staff board's own query, and it is a fix: that
 * one carries three of the four point buckets into the row it builds
 * while displaying the four-bucket total, so its category pills never
 * add up. This carries all four.
 *
 * If the class is set to the classic board, the projection still works —
 * StyledClassBoard falls back and the classic board simply fills the
 * screen.
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loading } from "@/components/ui/loading";
import type { BoardEntry } from "@/components/shared/PodiumBoard";
import { StyledClassBoard } from "./StyledClassBoard";

const EMPTY_PENDING = new Map<string, number>();
const EMPTY_SELECTION = new Map<string, { id: string; name: string; avatarUrl?: string | null }>();

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
}

export function ProjectedBoard({ classId }: { classId: string }) {
  const queryClient = useQueryClient();
  const [month] = useState(() => new Date().toISOString().slice(0, 7));

  const { data: entries, isLoading } = useQuery<BoardEntry[]>({
    queryKey: ["projected-board", classId, month],
    enabled: !!classId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("student_id, students ( id, full_name, avatar_url )")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (enrollError) throw enrollError;

      const { data: points, error: pointsError } = await supabase
        .from("student_points")
        .select("*")
        .eq("class_id", classId)
        .eq("month", month);
      if (pointsError) throw pointsError;

      const byStudent = new Map((points ?? []).map((p) => [p.student_id, p]));

      const rows = (enrollments ?? []).map((e) => {
        const p = byStudent.get(e.student_id);
        return {
          id: p?.id ?? `temp-${e.student_id}`,
          student_id: e.student_id,
          rank: 0,
          total_points: p?.total_points ?? 0,
          homework_points: p?.homework_points ?? 0,
          participation_points: p?.participation_points ?? 0,
          reading_theory_points: p?.reading_theory_points ?? 0,
          // The bucket the staff board forgets. Carried through so the
          // category pills sum to the total shown beside them.
          vocabulary_quiz_points: p?.vocabulary_quiz_points ?? 0,
          students: e.students as unknown as BoardEntry["students"],
        } as BoardEntry;
      });

      rows.sort(
        (a, b) =>
          (b.total_points ?? 0) - (a.total_points ?? 0) ||
          (a.students?.full_name ?? "").localeCompare(b.students?.full_name ?? ""),
      );
      return rows.map((r, i) => ({ ...r, rank: i + 1 }));
    },
  });

  // Keep the wall current while the lesson runs.
  useEffect(() => {
    const channel = supabase
      .channel(`projected-board-${classId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "student_points", filter: `class_id=eq.${classId}` },
        () => queryClient.invalidateQueries({ queryKey: ["projected-board", classId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, queryClient]);

  const label = useMemo(() => monthLabel(month), [month]);

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Loading message="Bringing up the board" emblem />
      </div>
    );
  }

  return (
    <StyledClassBoard
      entries={entries ?? []}
      classId={classId}
      periodLabel={label}
      fullscreen
      canManagePoints={false}
      isEconomyMode={false}
      economyCash={undefined}
      pendingByStudent={EMPTY_PENDING}
      selectedStudents={EMPTY_SELECTION}
      onToggleSelect={() => {}}
      onOpenAnalytics={() => {}}
    />
  );
}
