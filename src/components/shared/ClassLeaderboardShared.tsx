import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, X, CheckSquare, Clock } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { PointHistoryDialog } from "@/components/admin/PointHistoryDialog";
import { BulkPointsDialog } from "@/components/shared/BulkPointsDialog";
import { Button } from "@/components/ui/button";
import { StudentAnalyticsModal } from "@/components/student/StudentAnalyticsModal";
import { EconomyActions } from "@/components/shared/EconomyActions";
import { ArenaLeaderboard, type ArenaEntry } from "@/components/shared/ArenaLeaderboard";

interface ClassLeaderboardSharedProps {
  classId: string;
  currentStudentId?: string;
  canManagePoints?: boolean;
}

interface SelectedStudent {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export function ClassLeaderboardShared({
  classId,
  currentStudentId,
  canManagePoints = true,
}: ClassLeaderboardSharedProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(
    null
  );
  const [selectedStudents, setSelectedStudents] = useState<Map<string, SelectedStudent>>(
    new Map()
  );
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [analyticsStudent, setAnalyticsStudent] = useState<{
    id: string;
    name: string;
    avatarUrl?: string | null;
    totalPoints: number;
    homeworkPoints: number;
    participationPoints: number;
    readingTheoryPoints: number;
    rank: number;
    selectedMonth: string;
  } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousLeaderboardRef = useRef<any[]>([]);

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

  // Realtime: refetch when student_points changes for this class
  useEffect(() => {
    const channel = supabase
      .channel("student-points-changes-shared")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "student_points",
          filter: `class_id=eq.${classId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["class-leaderboard", classId] });
          queryClient.invalidateQueries({ queryKey: ["monthly-leader", classId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, queryClient]);

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["class-leaderboard", classId, selectedMonth],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (enrollError) throw enrollError;

      const { data: points, error: pointsError } = await supabase
        .from("student_points")
        .select("*")
        .eq("class_id", classId)
        .eq("month", selectedMonth);
      if (pointsError) throw pointsError;

      const pointsMap = new Map(points?.map((p) => [p.student_id, p]) || []);

      const combined =
        enrollments?.map((enrollment) => {
          const studentPoints = pointsMap.get(enrollment.student_id);
          return {
            id: studentPoints?.id || `temp-${enrollment.student_id}`,
            student_id: enrollment.student_id,
            class_id: classId,
            month: selectedMonth,
            homework_points: studentPoints?.homework_points || 0,
            participation_points: studentPoints?.participation_points || 0,
            reading_theory_points: studentPoints?.reading_theory_points || 0,
            total_points: studentPoints?.total_points || 0,
            students: enrollment.students,
          };
        }) || [];

      combined.sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        const nameA = a.students?.full_name || "";
        const nameB = b.students?.full_name || "";
        return nameA.localeCompare(nameB);
      });

      if (combined.length > 0) {
        let currentRank = 1;
        let previousPoints = combined[0].total_points;
        return combined.map((entry, index) => {
          if (entry.total_points !== previousPoints) {
            currentRank = index + 1;
            previousPoints = entry.total_points;
          }
          return { ...entry, rank: currentRank };
        });
      }
      return combined;
    },
  });

  // Rank-change toasts (kept from original behaviour)
  useEffect(() => {
    if (!leaderboard || leaderboard.length === 0) return;

    const previousLeaderboard = previousLeaderboardRef.current;

    if (previousLeaderboard.length > 0) {
      const previousRanks = new Map(
        previousLeaderboard.map((entry: any, index: number) => [entry.student_id, index + 1])
      );

      leaderboard.forEach((entry: any, index: number) => {
        const currentRank = index + 1;
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
  }, [leaderboard, toast]);

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
      <div className="rounded-3xl bg-slate-900 p-8 text-center text-white/60 min-h-[300px] flex items-center justify-center">
        Loading the Arena…
      </div>
    );
  }

  const hasSelection = selectedStudents.size > 0;
  const allSelected =
    leaderboard && leaderboard.length > 0 && selectedStudents.size === leaderboard.length;

  const arenaEntries: ArenaEntry[] = (leaderboard || []) as unknown as ArenaEntry[];
  const pendingByStudent = new Map<string, number>();
  (pendingTransactions as any[]).forEach((t) => {
    pendingByStudent.set(t.student_id, (pendingByStudent.get(t.student_id) || 0) + 1);
  });

  return (
    <div className="relative arena-bg rounded-3xl shadow-2xl overflow-hidden min-h-[460px]">
      {/* Sticky controls bar — month picker + bulk selection toggle */}
      <div className="relative z-20 flex items-center justify-between gap-2 px-3 sm:px-6 pt-4 pb-2">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] sm:min-w-[180px] bg-white/10 border-white/20 text-white text-sm font-semibold backdrop-blur-md hover:bg-white/15">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: 6 }, (_, i) => {
              const date = new Date();
              date.setMonth(date.getMonth() - i);
              const month = date.toISOString().slice(0, 7);
              return (
                <SelectItem key={month} value={month}>
                  {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        {canManagePoints && leaderboard && leaderboard.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={allSelected ? clearSelection : selectAll}
            className="h-9 bg-white/10 border-white/20 text-white hover:bg-white/15"
          >
            <CheckSquare className="h-4 w-4 mr-1.5" />
            <span className="text-xs sm:text-sm">
              {allSelected ? "Deselect" : "Select All"}
            </span>
          </Button>
        )}
      </div>

      <ArenaLeaderboard
        entries={arenaEntries}
        classId={classId}
        currentStudentId={currentStudentId}
        canManagePoints={canManagePoints}
        isEconomyMode={isEconomyMode}
        economyCash={economyCashData}
        pendingByStudent={pendingByStudent}
        selectedStudents={selectedStudents}
        onToggleSelect={(s, e) => toggleStudentSelection(s, e)}
        onOpenAnalytics={(entry) =>
          setAnalyticsStudent({
            id: entry.student_id,
            name: entry.students?.full_name || "",
            avatarUrl: entry.students?.avatar_url,
            totalPoints: entry.total_points,
            homeworkPoints: entry.homework_points || 0,
            participationPoints: entry.participation_points || 0,
            readingTheoryPoints: entry.reading_theory_points || 0,
            rank: entry.rank,
            selectedMonth,
          })
        }
      />

      {/* Pending economy requests (only when economy mode + manager) */}
      {isEconomyMode && canManagePoints && (pendingTransactions as any[]).length > 0 && (
        <div className="relative z-10 mx-3 sm:mx-6 mb-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md p-4">
          <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests ({(pendingTransactions as any[]).length})
          </h3>
          <EconomyActions
            classId={classId}
            pendingTransactions={pendingTransactions as any[]}
          />
        </div>
      )}

      {/* Floating bulk-action bar */}
      {canManagePoints && hasSelection && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 border border-white/20 rounded-full px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-4 w-4" />
            <span className="font-semibold text-sm">{selectedStudents.size} selected</span>
          </div>
          <div className="w-px h-6 bg-white/30" />
          <Button
            size="sm"
            onClick={() => setShowBulkDialog(true)}
            className="bg-blue-500 hover:bg-blue-400"
          >
            <Trophy className="h-4 w-4 mr-1" />
            Add Points
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            className="text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" />
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

      <StudentAnalyticsModal
        open={!!analyticsStudent}
        onOpenChange={(open) => !open && setAnalyticsStudent(null)}
        student={analyticsStudent}
        classId={classId}
        selectedMonth={analyticsStudent?.selectedMonth || selectedMonth}
      />
    </div>
  );
}
