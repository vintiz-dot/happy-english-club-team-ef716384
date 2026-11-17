/**
 * The class board, as a student or their family sees it.
 *
 * The data comes from the class-leaderboard edge function, which decides
 * whether this viewer may see the class and returns the same calculation
 * the teacher's screen renders (leaderboard_json), with classmates kept to
 * a name, an avatar and points. Ranks, ties, the level, the climber and
 * the streak are the server's; nothing is ranked here.
 *
 * What is genuinely different for a student stays different: no
 * selection, no point controls, no economy actions.
 */
import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { StudentAnalyticsModal } from "@/components/student/StudentAnalyticsModal";
import { type BoardEntry } from "@/components/shared/PodiumBoard";
import { StyledClassBoard } from "@/components/leaderboard/StyledClassBoard";
import { PeriodPicker, THIS_MONTH } from "@/components/leaderboard/PeriodPicker";
import { useClassMonitor } from "@/hooks/useClassMonitor";
import { BeforeJoinedError, NoTermError, useClassBoard } from "@/hooks/useClassBoard";
import { hanoiToday, type PeriodChoice } from "@/lib/leaderboard/board";

interface StudentClassLeaderboardProps {
  classId: string;
  className?: string;
  currentStudentId?: string;
}

const EMPTY_SELECTION = new Map<
  string,
  { id: string; name: string; avatarUrl?: string | null }
>();
const EMPTY_PENDING = new Map<string, number>();

const ordinal = (n: number) => {
  const r = n % 100;
  if (r >= 11 && r <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
};

export function StudentClassLeaderboard({
  classId,
  className,
  currentStudentId,
}: StudentClassLeaderboardProps) {
  const [period, setPeriod] = useState<PeriodChoice>(THIS_MONTH);
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
    level?: BoardEntry["level"];
    allTime?: number | null;
  } | null>(null);

  const { data: monitorStudentId } = useClassMonitor(classId);
  const { data, isLoading, error } = useClassBoard(classId, period, "family");
  const board = data?.board ?? null;

  // The function tells us who the viewer is; the prop is a fallback for
  // callers that already know (a parent looking at one of their children).
  const viewerStudentId = currentStudentId ?? data?.currentStudentId ?? undefined;
  const self = useMemo(
    // A family with two children in one class has both marked is_self: the
    // child this page is for comes first.
    () => (viewerStudentId ? board?.rows.find((r) => r.student_id === viewerStudentId) : null)
      ?? board?.rows.find((r) => r.is_self) ?? null,
    [board, viewerStudentId],
  );
  const month = (board?.period?.kind === "month" ? board.period.from : hanoiToday()).slice(0, 7);

  return (
    <div className="relative overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pb-3 pt-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-2 pt-2">
          <Trophy className="mt-1 h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
          <h3 className="min-w-0 whitespace-normal break-words font-display text-hec-h2 font-medium text-hec-ink">
            {className || "Leaderboard"}
          </h3>
        </div>
        {/* An older class-leaderboard only knows months: offer nothing else. */}
        {!data?.legacy && <PeriodPicker value={period} onChange={setPeriod} />}
      </div>

      {self?.centre && (
        <p className="px-4 pb-2 text-hec-small text-hec-ink-soft sm:px-6">
          {ordinal(self.centre.rank)} of {self.centre.of} in the whole school{board?.period?.label ? ` · ${board.period.label}` : ""}
        </p>
      )}

      {isLoading ? (
        <div className="grid min-h-[260px] place-items-center p-8 text-hec-small text-hec-ink-soft">
          Counting up the points…
        </div>
      ) : error ? (
        <div className="grid min-h-[260px] place-items-center p-8 text-center text-hec-small text-hec-ink-soft">
          {error instanceof NoTermError
            ? "No term has been set for that date yet."
            : error instanceof BeforeJoinedError
              ? "This board is from before you joined the class."
              : "This board could not be loaded right now."}
        </div>
      ) : (
        <StyledClassBoard
          board={board}
          classId={classId}
          periodLabel={board?.period?.label ?? ""}
          currentStudentId={viewerStudentId}
          canManagePoints={false}
          isEconomyMode={false}
          economyCash={undefined}
          pendingByStudent={EMPTY_PENDING}
          selectedStudents={EMPTY_SELECTION}
          monitorStudentId={monitorStudentId}
          onToggleSelect={() => {}}
          onOpenAnalytics={(entry) =>
            setAnalyticsStudent({
              id: entry.student_id,
              name: entry.students?.full_name || "",
              avatarUrl: entry.students?.avatar_url,
              totalPoints: entry.total_points,
              homeworkPoints: entry.homework_points,
              participationPoints: entry.participation_points,
              readingTheoryPoints: entry.reading_theory_points,
              vocabularyQuizPoints: entry.vocabulary_quiz_points ?? 0,
              rank: entry.rank,
              level: entry.level ?? null,
              allTime: entry.all_time ?? null,
            })
          }
        />
      )}

      <StudentAnalyticsModal
        open={!!analyticsStudent}
        onOpenChange={(open) => !open && setAnalyticsStudent(null)}
        student={analyticsStudent}
        classId={classId}
        selectedMonth={month}
      />
    </div>
  );
}
