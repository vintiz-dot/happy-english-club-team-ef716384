/**
 * The class's board, on the wall.
 *
 * Opened from the Leaderboard tool's class-screen button and the "New
 * window" button: a projector at the front of a room, read from the back
 * of it, by the whole class.
 *
 * It fetches rather than taking entries as props because the overlay
 * outlives whatever opened it and should keep itself current; points
 * awarded mid-lesson appear on the wall without anyone touching the
 * laptop (useClassBoard subscribes to the class's points).
 *
 * The figures are the server's (leaderboard_board with p_wall): the same
 * ranks as every other screen, with classmates shown as a family sees
 * them, because the class is who reads it. It used to rank the rows
 * itself with no ties, and pin the month it opened in.
 */
import { useMemo, useState } from "react";
import { SERVER_KEY_OF } from "@/lib/leaderboard/board";
import type { BoardCategory } from "./types";
import { Loading } from "@/components/ui/loading";
import { useClassBoard } from "@/hooks/useClassBoard";
import { StyledClassBoard } from "./StyledClassBoard";
import { THIS_MONTH } from "./PeriodPicker";

const EMPTY_PENDING = new Map<string, number>();
const EMPTY_SELECTION = new Map<string, { id: string; name: string; avatarUrl?: string | null }>();

export function ProjectedBoard({ classId }: { classId: string }) {
  const [tab, setTab] = useState<BoardCategory["key"] | null>(null);
  const { data, isLoading } = useClassBoard(classId, THIS_MONTH, "staff", {
    wall: true,
    category: tab ? SERVER_KEY_OF[tab] : null,
  });
  const label = useMemo(() => data?.board?.period?.label ?? "", [data]);

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center">
        <Loading message="Bringing up the board" emblem />
      </div>
    );
  }

  return (
    <StyledClassBoard
      board={data?.board ?? null}
      activeCategory={tab}
      onCategoryChange={setTab}
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
