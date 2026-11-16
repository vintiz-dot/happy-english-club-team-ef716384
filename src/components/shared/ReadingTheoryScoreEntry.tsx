import { useState, useMemo, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dayjs } from "@/lib/date";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraduationCap, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { getAvatarUrl, getRandomAvatarUrl } from "@/lib/avatars";
import { awardPoints } from "@/lib/pointsHelper";
import { READING_THEORY_CONFIG } from "@/lib/skillConfig";
import { soundManager } from "@/lib/soundManager";
import { useIvory } from "@/hooks/useIvory";

// Ivory: below sm the name takes its own line above the three figures, so it is never cut.
const RT_GRID_IVORY = "grid grid-cols-[3.5rem,5.5rem,3rem] sm:grid-cols-[minmax(0,1fr),5rem,6.25rem,3.75rem] gap-2 px-3";

interface ReadingTheoryScoreEntryProps {
  classId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface StudentScore {
  id: string;
  name: string;
  avatarUrl: string | null;
  currentScore: number;
  newScore: string;
}

export function ReadingTheoryScoreEntry({
  classId,
  open,
  onOpenChange,
  onSuccess,
}: ReadingTheoryScoreEntryProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [studentScores, setStudentScores] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const currentMonth = dayjs().format("YYYY-MM");

  // Fetch enrolled students
  const { data: students, isLoading: studentsLoading, refetch: refetchStudents } = useQuery({
    queryKey: ["reading-theory-students", classId],
    queryFn: async () => {
      const today = dayjs().format("YYYY-MM-DD");
      const { data, error } = await supabase
        .from("enrollments")
        .select(`
          student_id,
          students!inner(
            id,
            full_name,
            avatar_url,
            is_active
          )
        `)
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gt.${today}`);

      if (error) throw error;

      // Handle both array and object cases for students, and deduplicate
      const uniqueStudents = new Map();
      data?.forEach((e: any) => {
        const student = Array.isArray(e.students) ? e.students[0] : e.students;
        if (student && student.is_active && !uniqueStudents.has(student.id)) {
          uniqueStudents.set(student.id, student);
        }
      });

      return Array.from(uniqueStudents.values())
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Fetch current reading theory points for all students
  const { data: currentPoints, isLoading: pointsLoading } = useQuery({
    queryKey: ["reading-theory-current-scores", classId, currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_points")
        .select("student_id, reading_theory_points")
        .eq("class_id", classId)
        .eq("month", currentMonth);

      if (error) throw error;
      
      const pointsMap = new Map<string, number>();
      data?.forEach((p) => {
        pointsMap.set(p.student_id, p.reading_theory_points ?? 0);
      });
      return pointsMap;
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Force refetch students when dialog opens
  useEffect(() => {
    if (open) {
      refetchStudents();
    }
  }, [open, refetchStudents]);

  // Combine students with their current scores
  const studentsWithScores: StudentScore[] = useMemo(() => {
    if (!students) return [];
    return students.map((s: any) => ({
      id: s.id,
      name: s.full_name,
      avatarUrl: s.avatar_url,
      currentScore: currentPoints?.get(s.id) ?? 0,
      newScore: studentScores[s.id] ?? "",
    }));
  }, [students, currentPoints, studentScores]);

  // Calculate which students have changed scores
  const changedStudents = useMemo(() => {
    return studentsWithScores.filter((s) => {
      const newScore = parseInt(s.newScore);
      return !isNaN(newScore) && newScore !== s.currentScore;
    });
  }, [studentsWithScores]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!selectedReason) {
        throw new Error("Please select a reason");
      }

      if (changedStudents.length === 0) {
        throw new Error("No score changes to submit");
      }

      // Process each changed student
      for (const student of changedStudents) {
        const newScore = parseInt(student.newScore);
        const difference = newScore - student.currentScore;

        if (difference !== 0) {
          await awardPoints({
            studentIds: [student.id],
            classId,
            skill: "reading_theory",
            points: difference,
            subTag: selectedReason,
            notes: `Score updated from ${student.currentScore} to ${newScore}`,
          });
        }
      }

      return changedStudents.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard", classId] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      queryClient.invalidateQueries({ queryKey: ["student-points"] });
      queryClient.invalidateQueries({ queryKey: ["point-history"] });
      queryClient.invalidateQueries({ queryKey: ["reading-theory-current-scores", classId] });
      queryClient.invalidateQueries({ queryKey: ["live-assessment-students", classId] });

      soundManager.play("success");
      toast.success(`Updated reading theory scores for ${count} student${count !== 1 ? "s" : ""}`);

      // Reset form
      setStudentScores({});
      setSelectedReason("");
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error: any) => {
      toast.error("Failed to update scores", { description: error.message });
    },
  });

  const handleScoreChange = (studentId: string, value: string) => {
    setStudentScores((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  };

  const getDifference = (currentScore: number, newScoreStr: string) => {
    const newScore = parseInt(newScoreStr);
    if (isNaN(newScore)) return null;
    const diff = newScore - currentScore;
    if (diff === 0) return null;
    return diff;
  };

  const isLoading = studentsLoading || pointsLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className={ivory ? "h-5 w-5 shrink-0 text-hec-ink-soft" : "h-5 w-5 text-teal-600"} />
            Reading Theory Score Entry
          </DialogTitle>
          <DialogDescription>
            Enter the new cumulative scores for students. The difference will be calculated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Reason Selection */}
          <div className="space-y-2">
            <Label htmlFor={ivory ? "rt-reason" : undefined} className={ivory ? "text-hec-small font-semibold text-hec-ink" : "text-base font-semibold"}>Reason *</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger id={ivory ? "rt-reason" : undefined} className="h-12">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {READING_THEORY_CONFIG.subTags.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Students List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className={ivory
              ? `${RT_GRID_IVORY} py-2 bg-hec-sunken border border-b-0 border-hec-line rounded-t-hec-md text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft`
              : "grid grid-cols-[1fr,80px,100px,60px] gap-2 px-2 py-2 bg-muted/50 rounded-t-lg text-sm font-medium text-muted-foreground"}>
              <span className={ivory ? "col-span-3 sm:col-span-1" : undefined}>Student</span>
              <span className="text-center">Current</span>
              <span className="text-center">New Score</span>
              <span className="text-center">Diff</span>
            </div>

            <ScrollArea className={ivory ? "h-[45dvh] border border-hec-line rounded-b-hec-md" : "h-[60vh] border rounded-b-lg"}>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className={ivory ? "h-6 w-6 animate-spin text-hec-ink-faint" : "h-6 w-6 animate-spin text-muted-foreground"} />
                </div>
              ) : studentsWithScores.length === 0 ? (
                <div className={ivory ? "flex items-center justify-center py-8 text-hec-ink-soft" : "flex items-center justify-center py-8 text-muted-foreground"}>
                  No students enrolled in this class
                </div>
              ) : (
                <div className={ivory ? "divide-y divide-hec-line" : "divide-y"}>
                  {studentsWithScores.map((student) => {
                    const diff = getDifference(student.currentScore, student.newScore);
                    return (
                      <div
                        key={student.id}
                        className={ivory ? `${RT_GRID_IVORY} py-3 items-center hover:bg-hec-sunken/60` : "grid grid-cols-[1fr,80px,100px,60px] gap-2 px-2 py-3 items-center hover:bg-accent/30"}
                      >
                        {/* Student Info */}
                        <div className={ivory ? "col-span-3 sm:col-span-1 flex items-start gap-2 min-w-0" : "flex items-center gap-2 min-w-0"}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage
                              src={getAvatarUrl(student.avatarUrl) || getRandomAvatarUrl(student.id)}
                              alt={student.name}
                            />
                            <AvatarFallback className="text-xs">
                              {student.name.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <span className={ivory ? "min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-small font-medium text-hec-ink" : "text-sm font-medium truncate"}>{student.name}</span>
                        </div>

                        {/* Current Score */}
                        <div className={ivory ? "text-center text-hec-small text-hec-ink-soft tabular-nums" : "text-center text-sm text-muted-foreground font-mono"}>
                          {student.currentScore}
                        </div>

                        {/* New Score Input */}
                        <div className="flex justify-center">
                          <Input
                            type="number"
                            value={student.newScore}
                            onChange={(e) => handleScoreChange(student.id, e.target.value)}
                            placeholder={student.currentScore.toString()}
                            className={ivory ? "min-h-hec-target w-20 px-1 text-center tabular-nums" : "h-9 w-20 text-center font-mono"}
                            aria-label={ivory ? `New score for ${student.name}` : undefined}
                            min={0}
                          />
                        </div>

                        {/* Difference */}
                        <div className="text-center">
                          {diff !== null && (
                            <span
                              className={ivory
                                ? `text-hec-small font-semibold tabular-nums ${diff > 0 ? "text-hec-leaf" : "text-hec-danger"}`
                                : `text-sm font-bold ${
                                diff > 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}{diff}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {changedStudents.length > 0 && (
            <div className={ivory ? "p-3 rounded-hec-md border border-hec-line bg-hec-sunken" : "p-3 rounded-lg bg-teal-500/10 border border-teal-500/20"}>
              <span className={ivory ? "text-hec-small text-hec-ink tabular-nums" : "text-sm text-teal-700 dark:text-teal-300"}>
                {changedStudents.length} student{changedStudents.length !== 1 ? "s" : ""} will be updated
              </span>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={() => submitMutation.mutate()}
            disabled={submitMutation.isPending || changedStudents.length === 0 || !selectedReason}
            className={ivory ? "w-full h-12" : "w-full h-12 bg-teal-600 hover:bg-teal-700 text-white"}
          >
            {submitMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
