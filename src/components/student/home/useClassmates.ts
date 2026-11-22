/**
 * The class as a child sees it: the server's own board for THIS MONTH (the period the class board's own default shows,
 * so the figures match the wall), through the hook the home already used
 * (useClassBoard, audience "family"). A classmate is a name, an avatar and points; ranks and ties are the server's.
 * Nothing is ranked or summed beyond what the server returned except the class total for the youngest band,
 * which is the sum of the all-time points of the rows the board returned.
 */
import { useMemo } from "react";
import { useClassBoard } from "@/hooks/useClassBoard";
import { THIS_MONTH } from "@/components/leaderboard/PeriodPicker";
import type { ServerRow } from "@/lib/leaderboard/board";

export interface Classmate {
  id: string;
  name: string;
  avatarUrl?: string | null;
  points: number;
  rank: number | null;
  gainWeek?: number;
  isSelf: boolean;
}

const pointsOf = (r: ServerRow) => Number(r.points ?? r.total ?? 0) || 0;

export function useClassmates(classId: string | undefined, studentId: string | undefined) {
  const { data, isLoading, error } = useClassBoard(classId, THIS_MONTH, "family");
  return useMemo(() => {
    const rows = data?.board?.rows ?? [];
    const me = data?.currentStudentId ?? studentId;
    const ranked: Classmate[] = rows
      .filter((r) => r.rank !== null && r.rank !== undefined)
      .sort((a, b) => (a.rank as number) - (b.rank as number))
      .map((r) => ({
        id: r.student_id,
        name: r.name,
        avatarUrl: r.avatar_url,
        points: pointsOf(r),
        rank: r.rank,
        gainWeek: r.gain_week,
        isSelf: r.student_id === me || (!!r.is_self && !studentId),
      }));
    const total = rows.reduce((sum, r) => sum + pointsOf(r), 0);
    return {
      loading: isLoading,
      failed: !!error,
      ready: !!data?.board && !error,
      ranked,
      self: ranked.find((r) => r.isSelf) ?? null,
      /** the sum of the points of every child on this month's board */
      classTotal: total,
      podium: ranked.slice(0, 3),
    };
  }, [data, isLoading, error, studentId]);
}
