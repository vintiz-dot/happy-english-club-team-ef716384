import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, X, CheckSquare, Clock, Monitor, ExternalLink } from "lucide-react";
import { useClassBoard, NoTermError } from "@/hooks/useClassBoard";
import { PeriodPicker, THIS_MONTH } from "@/components/leaderboard/PeriodPicker";
import { toBoardEntries } from "@/components/leaderboard/useBoardData";
import { hanoiToday, periodKey, SERVER_KEY_OF, type PeriodChoice } from "@/lib/leaderboard/board";
import type { BoardCategory } from "@/components/leaderboard/types";
import { openClassBoardWindow } from "@/pages/ClassBoardWindow";
import { BoardErrorBoundary } from "@/components/leaderboard/BoardErrorBoundary";
import { useState, useEffect, useMemo, useRef, Suspense } from "react";
import { useToast } from "@/hooks/use-toast";
import { PointHistoryDialog } from "@/components/admin/PointHistoryDialog";
import { BulkPointsDialog } from "@/components/shared/BulkPointsDialog";
import { Button } from "@/components/ui/button";
import { lazyRetry } from "@/lib/lazyRetry";

// Charts (recharts) load only when a student's analytics are opened.
const StudentAnalyticsModal = lazyRetry(() =>
  import("@/components/student/StudentAnalyticsModal").then((m) => ({ default: m.StudentAnalyticsModal })),
);
import { EconomyActions } from "@/components/shared/EconomyActions";
import { type BoardEntry } from "@/components/shared/PodiumBoard";
import { StyledClassBoard } from "@/components/leaderboard/StyledClassBoard";
import { useClassBoardStyle } from "@/components/leaderboard/useClassBoardStyle";
import { isDisplayBoard } from "@/components/leaderboard/types";
import { useClassMonitor } from "@/hooks/useClassMonitor";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

interface ClassLeaderboardSharedProps {
  classId: string;
  currentStudentId?: string;
  canManagePoints?: boolean;
  /**
   * The board is on a screen the class can see (the classroom tools panel,
   * often mirrored to the projector): classmates as a family sees them, no
   * child's attendance streak or lesson count.
   */
  wall?: boolean;
}

interface SelectedStudent {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export function ClassLeaderboardShared({
  classId,
  currentStudentId,
  // Fail closed. This defaulted to true, so any new caller - a parent view, a
  // read-only report - would have been handed award, deduct and bulk-points
  // controls by omission. Every caller that should have them now says so.
  canManagePoints = false,
  wall = false,
}: ClassLeaderboardSharedProps) {
  const ivory = useIvory();
  const [period, setPeriod] = useState<PeriodChoice>(THIS_MONTH);
  const [tab, setTab] = useState<BoardCategory["key"] | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(
    null
  );
  const [selectedStudents, setSelectedStudents] = useState<Map<string, SelectedStudent>>(
    new Map()
  );
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  // The analytics modal (and its charts) is only fetched once a student is opened; stays mounted after so it can animate closed.
  const analyticsEverOpened = useRef(false);
  const [analyticsStudent, setAnalyticsStudent] = useState<{
    id: string;
    name: string;
    avatarUrl?: string | null;
    totalPoints: number;
    homeworkPoints: number;
    participationPoints: number;
    readingTheoryPoints: number;
    vocabularyQuizPoints: number;
    rank: number;
    selectedMonth: string;
    level?: BoardEntry["level"];
    allTime?: number | null;
  } | null>(null);
  if (analyticsStudent) analyticsEverOpened.current = true;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousLeaderboardRef = useRef<any[]>([]);
  const { data: monitorStudentId } = useClassMonitor(classId);

  // The class's chosen board shows here too, so a teacher sees what the
  // children see without leaving the page. The display boards are
  // read-only by design, though, and this screen is also where points get
  // awarded — so when there is something to manage the teacher can drop
  // back to the classic board, which has the selection and bulk controls.
  const { data: classBoardInfo } = useClassBoardStyle(classId);
  const [showClassicBoard, setShowClassicBoard] = useState(false);
  const styleIsDisplay = isDisplayBoard(classBoardInfo?.style ?? "podium");
  const canSwapBoard = styleIsDisplay && canManagePoints;

  // Fetch economy settings for this class
  const { data: classEconomy } = useQuery({
    queryKey: ["class-economy", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("economy_mode, points_to_cash_rate")
        .eq("id", classId)
        .single();
      return data;
    },
  });

  const isEconomyMode = (classEconomy as any)?.economy_mode || false;

  // Fetch cash data when economy mode is on
  const { data: economyCashData } = useQuery({
    queryKey: ["economy-cash-data", classId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("student_id, students!inner(id, cash_on_hand)")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);

      const cashMap = new Map<string, number>();
      (enrollments || []).forEach((e: any) => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        if (student) cashMap.set(student.id, student.cash_on_hand || 0);
      });
      return cashMap;
    },
    enabled: isEconomyMode,
  });

  const { data: pendingTransactions = [] } = useQuery({
    queryKey: ["economy-pending", classId],
    queryFn: async () => {
      const { data } = await supabase
        .from("economy_transactions")
        .select("id, student_id, type, points_impact, cash_impact, note")
        .eq("class_id", classId)
        .eq("status", "pending" as any)
        .order("created_at", { ascending: true });

      const studentIds = [...new Set((data || []).map((t: any) => t.student_id))];
      const { data: students } = await supabase
        .from("students")
        .select("id, full_name")
        .in("id", studentIds);

      const nameMap = new Map((students || []).map((s: any) => [s.id, s.full_name]));

      return (data || []).map((t: any) => ({
        ...t,
        student_name: nameMap.get(t.student_id) || "Unknown",
      }));
    },
    enabled: isEconomyMode && canManagePoints,
  });

  // One calculation on the server (leaderboard_board): who is on the
  // board, ranks with ties, categories, level, climber and streak. This
  // screen used to read enrolments and points itself and rank them, and
  // disagreed with the children's screen on every tie.
  const { data: boardResult, isLoading, error: boardError } = useClassBoard(classId, period, "staff", { wall, category: tab ? SERVER_KEY_OF[tab] : null });
  const serverBoard = boardResult?.board ?? null;
  const leaderboard = useMemo(() => toBoardEntries(serverBoard), [serverBoard]);
  const boardPeriodLabel = serverBoard?.period?.label ?? "";
  // The month the point-history dialog and analytics read.
  const selectedMonth = (serverBoard?.period?.kind === "month" ? serverBoard.period.from : hanoiToday()).slice(0, 7);

  // Rank-change toasts. They compared positions in the list, so a tie
  // announced moves that never happened, and switching month announced
  // every child; now they compare the server's ranks within one period.
  const toastPeriodRef = useRef<string>("");
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;
    const key = periodKey(period);
    if (toastPeriodRef.current !== key) {
      toastPeriodRef.current = key;
      previousLeaderboardRef.current = leaderboard;
      return;
    }

    const previousLeaderboard = previousLeaderboardRef.current;

    if (previousLeaderboard.length > 0) {
      const previousRanks = new Map(
        previousLeaderboard.map((entry: any) => [entry.student_id, entry.rank])
      );

      leaderboard.forEach((entry: any) => {
        const currentRank = entry.rank;
        const previousRank = previousRanks.get(entry.student_id);

        if (previousRank && previousRank !== currentRank) {
          const rankChange = previousRank - currentRank;
          const studentName = entry.students?.full_name || "A student";

          if (rankChange > 0) {
            toast({
              title: "🎉 Rank Improved!",
              description: `${studentName} moved up ${rankChange} ${
                rankChange === 1 ? "position" : "positions"
              } to #${currentRank}`,
              duration: 5000,
            });
          } else {
            toast({
              title: "Rank Changed",
              description: `${studentName} moved to #${currentRank}`,
              duration: 4000,
            });
          }
        }
      });
    }

    previousLeaderboardRef.current = leaderboard;
  }, [leaderboard, toast, period]);

  const toggleStudentSelection = (student: SelectedStudent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedStudents((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(student.id)) newMap.delete(student.id);
      else newMap.set(student.id, student);
      return newMap;
    });
  };

  const selectAll = () => {
    if (!leaderboard) return;
    const allStudents = new Map<string, SelectedStudent>();
    leaderboard.forEach((entry: any) => {
      allStudents.set(entry.student_id, {
        id: entry.student_id,
        name: entry.students?.full_name,
        avatarUrl: entry.students?.avatar_url,
      });
    });
    setSelectedStudents(allStudents);
  };

  const clearSelection = () => setSelectedStudents(new Map());
  const handleBulkSuccess = () => clearSelection();

  if (isLoading) {
    return (
      <div className={ivory ? "flex min-h-[300px] items-center justify-center rounded-hec-lg border border-hec-line bg-hec-surface p-8 text-center text-hec-small text-hec-ink-soft" : "studio-surface flex min-h-[300px] items-center justify-center rounded-3xl border border-studio p-8 text-center text-sm text-ink-soft"}>
        Counting up the points…
      </div>
    );
  }

  const hasSelection = selectedStudents.size > 0;
  const allSelected =
    leaderboard && leaderboard.length > 0 && selectedStudents.size === leaderboard.length;

  const pendingByStudent = new Map<string, number>();
  (pendingTransactions as any[]).forEach((t) => {
    pendingByStudent.set(t.student_id, (pendingByStudent.get(t.student_id) || 0) + 1);
  });

  return (
    <div className={ivory ? "relative min-h-[460px] overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1" : "studio-surface relative min-h-[460px] overflow-hidden rounded-3xl border border-studio shadow-studio"}>
      {/* Controls — month picker + bulk selection toggle */}
      <div className={ivory ? "relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 pb-3 pt-4 sm:px-6" : "relative z-20 flex items-center justify-between gap-2 px-3 pb-2 pt-4 sm:px-6"}>
        <div className="flex min-w-0 items-center gap-2">
          <Trophy
            className={ivory ? "h-5 w-5 shrink-0 text-hec-brass" : "h-5 w-5 shrink-0 text-[hsl(var(--studio-butter-ink))]"}
            aria-hidden
          />
          <h2 className={ivory ? "min-w-0 font-display text-hec-h2 font-medium text-hec-ink" : "studio-title truncate text-xl"}>Leaderboard</h2>
        </div>
        <div className={ivory ? "flex min-w-0 flex-wrap items-center gap-2" : "flex shrink-0 items-center gap-2"}>
          {/* Only offered when there is actually a swap to make: the class
              uses a display board AND this person can award points. */}
          {canSwapBoard && (
            <Button
              size="sm"
              variant="outline"
              aria-label={ivory ? (showClassicBoard ? "Class view" : "Award points") : undefined}
              className="gap-1.5"
              onClick={() => {
                setShowClassicBoard((v) => {
                  if (v) setSelectedStudents(new Map());
                  return !v;
                });
              }}
              title={
                showClassicBoard
                  ? "Show the board your class sees"
                  : "Switch to the board with the awarding controls"
              }
            >
              {showClassicBoard ? (
                <Monitor className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <CheckSquare className="h-3.5 w-3.5" aria-hidden />
              )}
              <span className="hidden sm:inline">
                {showClassicBoard ? "Class view" : "Award points"}
              </span>
            </Button>
          )}
          {canSwapBoard && (
            <Button
              size="sm"
              variant="outline"
              aria-label={ivory ? "New window" : undefined}
              className="gap-1.5"
              onClick={() => openClassBoardWindow(classId)}
              title="Open the class view in its own window for the extended screen"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">New window</span>
            </Button>
          )}
          <PeriodPicker value={period} onChange={setPeriod} monthOnly={!!boardResult?.legacy} />
          {canManagePoints && leaderboard && leaderboard.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={allSelected ? clearSelection : selectAll}
              className={ivory ? "gap-2" : "h-9 rounded-full border-studio bg-studio-card text-ink hover:bg-[hsl(var(--studio-ink)/0.06)] hover:text-ink"}
            >
              <CheckSquare className={ivory ? "h-4 w-4" : "mr-1.5 h-4 w-4"} />
              <span className={ivory ? "text-hec-small" : "text-xs sm:text-sm"}>
                {allSelected ? "Deselect" : "Select all"}
              </span>
            </Button>
          )}
        </div>
      </div>

      <BoardErrorBoundary key={String(showClassicBoard)}>
      {boardError ? (
        <p className="mx-4 mb-4 rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink-soft sm:mx-6">
          {boardError instanceof NoTermError
            ? "No term covers that date. An admin can set term dates in Admin > Overview > Points and leaderboards."
            : "This board could not be loaded right now."}
        </p>
      ) : (
      <StyledClassBoard
        board={serverBoard}
        activeCategory={tab}
        onCategoryChange={setTab}
        periodLabel={boardPeriodLabel}
        forceClassic={showClassicBoard}
        classId={classId}
        currentStudentId={currentStudentId}
        canManagePoints={canManagePoints}
        isEconomyMode={isEconomyMode}
        economyCash={economyCashData}
        pendingByStudent={pendingByStudent}
        selectedStudents={selectedStudents}
        onToggleSelect={(s, e) => toggleStudentSelection(s, e)}
        monitorStudentId={monitorStudentId}
        onOpenAnalytics={(entry) =>
          setAnalyticsStudent({
            id: entry.student_id,
            name: entry.students?.full_name || "",
            avatarUrl: entry.students?.avatar_url,
            totalPoints: entry.total_points,
            homeworkPoints: entry.homework_points || 0,
            participationPoints: entry.participation_points || 0,
            readingTheoryPoints: entry.reading_theory_points || 0,
            vocabularyQuizPoints: entry.vocabulary_quiz_points || 0,
            rank: entry.rank,
            selectedMonth,
            level: entry.level ?? null,
            allTime: entry.all_time ?? null,
          })
        }
      />
      )}
      </BoardErrorBoundary>

      {/* Pending economy requests (only when economy mode + manager) */}
      {isEconomyMode && canManagePoints && (pendingTransactions as any[]).length > 0 && (
        <div className={ivory ? "relative z-10 mx-4 mb-4 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-4 sm:mx-6" : "relative z-10 mx-3 mb-4 rounded-2xl border border-studio bg-studio-card p-4 sm:mx-6"}>
          <h3 className={ivory ? "mb-3 flex items-center gap-2 text-hec-h3 tabular-nums text-hec-ink" : "studio-title mb-3 flex items-center gap-2 text-base"}>
            <Clock className={ivory ? "h-4 w-4 text-hec-warn" : "h-4 w-4"} aria-hidden />
            Pending requests ({(pendingTransactions as any[]).length})
          </h3>
          <EconomyActions
            classId={classId}
            pendingTransactions={pendingTransactions as any[]}
          />
        </div>
      )}

      {/* Floating bulk-action bar */}
      {canManagePoints && hasSelection && (
        <div
          className={
            ivory
              ? "fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-hec-action py-1 pl-4 pr-1 shadow-hec-2 animate-in fade-in"
              : "animate-in slide-in-from-bottom-4 fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full bg-[hsl(var(--studio-ink))] px-4 py-3 shadow-studio-lg"
          }
        >
          <div className={ivory ? "flex items-center gap-2 whitespace-nowrap text-hec-on-action" : "flex items-center gap-2 text-[hsl(var(--studio-card))]"}>
            <Users className="h-4 w-4" aria-hidden />
            <span className={ivory ? "text-hec-small font-semibold tabular-nums" : "text-sm font-semibold"}>{selectedStudents.size} selected</span>
          </div>
          <div className={ivory ? "h-6 w-px bg-hec-on-action/30" : "h-6 w-px bg-[hsl(var(--studio-card)/0.3)]"} />
          <Button
            size="sm"
            onClick={() => setShowBulkDialog(true)}
            className={ivory ? "rounded-full bg-hec-brass-fill text-hec-on-brass hover:bg-hec-brass-fill/90" : "rounded-full bg-[hsl(var(--studio-butter))] text-[hsl(var(--studio-butter-ink))] hover:bg-[hsl(var(--studio-butter))] hover:brightness-105"}
          >
            <Trophy className={ivory ? "h-4 w-4" : "mr-1 h-4 w-4"} aria-hidden />
            Add points
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            aria-label="Clear selection"
            className={ivory ? cn("rounded-full text-hec-on-action hover:bg-hec-on-action/15 hover:text-hec-on-action", FOCUS) : "rounded-full text-[hsl(var(--studio-card))] hover:bg-[hsl(var(--studio-card)/0.15)] hover:text-[hsl(var(--studio-card))]"}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}

      {selectedStudent && (
        <PointHistoryDialog
          studentId={selectedStudent.id}
          classId={classId}
          month={selectedMonth}
          studentName={selectedStudent.name}
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          canDelete={canManagePoints}
        />
      )}

      {canManagePoints && (
        <BulkPointsDialog
          classId={classId}
          selectedStudents={Array.from(selectedStudents.values())}
          open={showBulkDialog}
          onOpenChange={setShowBulkDialog}
          onSuccess={handleBulkSuccess}
        />
      )}

      {analyticsEverOpened.current && (
      <Suspense fallback={null}>
      <StudentAnalyticsModal
        open={!!analyticsStudent}
        onOpenChange={(open) => !open && setAnalyticsStudent(null)}
        student={analyticsStudent}
        classId={classId}
        selectedMonth={analyticsStudent?.selectedMonth || selectedMonth}
        // Staff can open the award list to correct or remove one. This
        // dialog was mounted but nothing ever opened it.
        onManagePoints={
          canManagePoints && analyticsStudent
            ? () => {
                setSelectedStudent({ id: analyticsStudent.id, name: analyticsStudent.name });
                setAnalyticsStudent(null);
              }
            : undefined
        }
      />
      </Suspense>
      )}
    </div>
  );
}
