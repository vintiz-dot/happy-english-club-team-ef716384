/**
 * The class board, as a student sees it.
 *
 * This used to be a second, independent leaderboard — its own podium, its
 * own rank colours, its own row layout, ~450 lines of it. It drifted from
 * the teacher's board constantly: a child and their teacher would look at
 * the same class on two screens and see two different designs, and only
 * one of them ever got a fix.
 *
 * Both now render PodiumBoard. What is genuinely different for a student
 * stays different: no selection, no point controls, no economy actions,
 * and the data comes from the class-leaderboard edge function, which
 * decides for itself whether this viewer is allowed to see the class.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudentAnalyticsModal } from "@/components/student/StudentAnalyticsModal";
import { PodiumBoard, type BoardEntry } from "@/components/shared/PodiumBoard";
import { useClassMonitor } from "@/hooks/useClassMonitor";

interface StudentClassLeaderboardProps {
  classId: string;
  className?: string;
  currentStudentId?: string;
}

interface EdgeEntry {
  student_id: string;
  student_name: string;
  avatar_url: string | null;
  participation_points: number;
  homework_points: number;
  /** Added later than the rest of the payload; absent on older deploys. */
  reading_theory_points?: number;
  total_points: number;
  is_current_user: boolean;
  rank: number;
}

const EMPTY_SELECTION = new Map<
  string,
  { id: string; name: string; avatarUrl?: string | null }
>();
const EMPTY_PENDING = new Map<string, number>();

export function StudentClassLeaderboard({
  classId,
  className,
  currentStudentId,
}: StudentClassLeaderboardProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [analyticsStudent, setAnalyticsStudent] = useState<{
    id: string;
    name: string;
    avatarUrl?: string | null;
    totalPoints: number;
    homeworkPoints: number;
    participationPoints: number;
    readingTheoryPoints: number;
    rank: number;
  } | null>(null);

  const { data: monitorStudentId } = useClassMonitor(classId);

  const { data, isLoading, error } = useQuery({
    queryKey: ["student-class-leaderboard", classId, selectedMonth],
    queryFn: async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("class-leaderboard", {
        body: { classId, month: selectedMonth },
      });
      if (response.error) throw response.error;
      return response.data as {
        leaderboard: EdgeEntry[];
        currentStudentId: string | null;
      };
    },
  });

  const entries: BoardEntry[] = useMemo(
    () =>
      (data?.leaderboard ?? []).map((e) => ({
        id: `${classId}-${e.student_id}`,
        student_id: e.student_id,
        rank: e.rank,
        total_points: e.total_points,
        homework_points: e.homework_points,
        participation_points: e.participation_points,
        reading_theory_points: e.reading_theory_points ?? 0,
        students: { full_name: e.student_name, avatar_url: e.avatar_url },
      })),
    [data, classId],
  );

  // The function tells us who the viewer is; the prop is a fallback for
  // callers that already know (a parent looking at one of their children).
  const viewerStudentId = currentStudentId ?? data?.currentStudentId ?? undefined;

  return (
    <div className="studio-surface relative overflow-hidden rounded-3xl border border-studio shadow-studio">
      <div className="flex items-center justify-between gap-2 px-3 pb-2 pt-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Trophy
            className="h-5 w-5 shrink-0 text-[hsl(var(--studio-butter-ink))]"
            aria-hidden
          />
          <h3 className="studio-title truncate text-xl">{className || "Leaderboard"}</h3>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-9 w-[140px] shrink-0 rounded-full border-studio bg-studio-card text-xs font-semibold text-ink focus:ring-0 focus:ring-offset-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const month = date.toISOString().slice(0, 7);
              return (
                <SelectItem key={month} value={month}>
                  {date.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid min-h-[260px] place-items-center p-8 text-sm text-ink-soft">
          Counting up this month's points…
        </div>
      ) : error ? (
        <div className="grid min-h-[260px] place-items-center p-8 text-center text-sm text-ink-soft">
          This board could not be loaded right now.
        </div>
      ) : (
        <PodiumBoard
          entries={entries}
          classId={classId}
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
              rank: entry.rank,
            })
          }
        />
      )}

      <StudentAnalyticsModal
        open={!!analyticsStudent}
        onOpenChange={(open) => !open && setAnalyticsStudent(null)}
        student={analyticsStudent}
        classId={classId}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
