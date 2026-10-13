/**
 * The one place that decides which leaderboard a class sees.
 *
 * Both board wrappers — ClassLeaderboardShared for staff and
 * StudentClassLeaderboard for students — render this instead of
 * PodiumBoard directly, so all eight mounts honour the class's choice
 * without eight separate changes.
 *
 * Two things make it fall back to the classic board, and both are
 * deliberate:
 *
 *  - The class chose "podium". Obviously.
 *  - The screen is too narrow. The three new boards are fixed 1920x1080
 *    canvases scaled to fit, so on a phone the whole design shrinks
 *    rather than reflowing, and a 54px heading becomes unreadable. Most
 *    students check their points on a phone, so below roughly a tablet
 *    they get the classic board, which was built responsive. Nobody is
 *    shown a projector layout they cannot read.
 *
 * The classic board also keeps every interaction the staff wrappers
 * depend on — selection, bulk points, economy, analytics. The three new
 * ones are display boards: they show, they do not edit. That is why the
 * staff surfaces fall back whenever points are being managed, rather
 * than growing a second, half-working set of controls.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Loading } from "@/components/ui/loading";
import { useIsMobile } from "@/hooks/use-mobile";
import { PodiumBoard, type PodiumBoardProps } from "@/components/shared/PodiumBoard";
import { BoardFrame } from "./BoardFrame";
import { useBoardExtras, useBoardRows } from "./useBoardData";
import { useClassBoardStyle } from "./useClassBoardStyle";
import { isDisplayBoard, type BoardCategory, type BoardStyle, type BoardViewProps } from "./types";

// Each style carries its own fonts and a few hundred lines of decoration.
// Loading all three into every bundle that shows a leaderboard would make
// every student pay for two boards they will never see.
const StarBoard = lazy(() =>
  import("./StarBoard").then((m) => ({ default: m.StarBoard })),
);
const HighScores = lazy(() =>
  import("./HighScores").then((m) => ({ default: m.HighScores })),
);
const NightLeague = lazy(() =>
  import("./NightLeague").then((m) => ({ default: m.NightLeague })),
);

const VIEWS: Partial<Record<BoardStyle, React.ComponentType<BoardViewProps>>> = {
  star: StarBoard,
  arcade: HighScores,
  night: NightLeague,
};

export interface StyledClassBoardProps extends PodiumBoardProps {
  /** e.g. "October 2026". Shown in the board header. */
  periodLabel?: string;
  className?: string;
  /** Force the classic board regardless of the class setting. */
  forceClassic?: boolean;
  /** Fills its container instead of sitting in the page flow. */
  fullscreen?: boolean;
  /** False for students, whose RLS does not reach the point ledger. */
  canReadLedger?: boolean;
}

export function StyledClassBoard({
  periodLabel = "",
  className,
  forceClassic = false,
  fullscreen = false,
  canReadLedger = true,
  ...board
}: StyledClassBoardProps) {
  const { data: info } = useClassBoardStyle(board.classId);
  const isMobile = useIsMobile();

  const [activeCategory, setActiveCategory] = useState<BoardCategory["key"] | null>(null);
  const [revealKey, setRevealKey] = useState(0);

  const rows = useBoardRows(board.entries, activeCategory, {
    monitorStudentId: board.monitorStudentId,
    currentStudentId: board.currentStudentId,
  });
  const extras = useBoardExtras(board.classId, rows, canReadLedger);

  const prefersReduced = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const chosen = info?.style ?? "podium";
  const View = VIEWS[chosen];

  // Anything that is not a display board, cannot be read at this size, or
  // has no view registered falls back. The classic board is always correct.
  if (forceClassic || isMobile || !isDisplayBoard(chosen) || !View) {
    return <PodiumBoard {...board} />;
  }

  return (
    <BoardFrame style={chosen} className={className} fullscreen={fullscreen}>
      <Suspense fallback={<Loading message="Opening the board" emblem />}>
        <View
          // A changing key restarts the entrance animation, which is what
          // the Reveal button is for.
          key={revealKey}
          // The class's own name: what every board wants in its heading.
          title={info?.name || "Leaderboard"}
          periodLabel={periodLabel}
          rows={rows}
          extras={extras}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          revealKey={revealKey}
          onReveal={() => setRevealKey((k) => k + 1)}
          motion={!prefersReduced}
        />
      </Suspense>
    </BoardFrame>
  );
}
