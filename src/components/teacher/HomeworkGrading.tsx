import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Undo, ArrowLeft } from "lucide-react";
import { dayjs } from "@/lib/date";
import { sanitizeHtml } from "@/lib/sanitize";
import { useAuth } from "@/hooks/useAuth";

const GRADE_PRESETS = [
  { label: "⭐ Superstar", value: "Superstar", minPoints: 90, maxPoints: 100 },
  { label: "🌟 Amazing", value: "Amazing", minPoints: 80, maxPoints: 89 },
  { label: "👍 Great Job", value: "Great Job", minPoints: 70, maxPoints: 79 },
  { label: "👌 Good Try", value: "Good Try", minPoints: 60, maxPoints: 69 },
  { label: "💪 Keep Trying", value: "Keep Trying", minPoints: 50, maxPoints: 59 },
  { label: "🤝 Needs Help", value: "Needs Help", minPoints: 0, maxPoints: 49 },
] as const;

interface HomeworkGradingProps {
  homeworkId: string;
  onClose: () => void;
}

export function HomeworkGrading({ homeworkId, onClose }: HomeworkGradingProps) {
  // Single-panel mode: "list" shows students, "grade" shows grading form
  const [view, setView] = useState<"list" | "grade">("list");
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [points, setPoints] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: homework } = useQuery({
    queryKey: ["homework-detail", homeworkId],
    queryFn: async () => {
      const { data, error } = await supabase.from("homeworks").select("*, classes(id)").eq("id", homeworkId).single();

      if (error) throw error;
      return data;
    },
    enabled: !!homeworkId,
  });

  const { data: enrolledStudents } = useQuery({
    queryKey: ["homework-enrolled-students", homework?.classes?.id],
    queryFn: async () => {
      if (!homework?.classes?.id) return [];

      const { data, error } = await supabase
        .from("enrollments")
        .select("student_id, students(id, full_name)")
        .eq("class_id", homework.classes.id)
        .is("end_date", null);

      if (error) throw error;
      // Deduplicate by student_id
      const seen = new Set<string>();
      return (data || []).reduce((acc: any[], e) => {
        const s = e.students;
        if (s && !seen.has((s as any).id)) {
          seen.add((s as any).id);
          acc.push(s);
        }
        return acc;
      }, []);
    },
    enabled: !!homework?.classes?.id,
  });

  const { data: submissions } = useQuery({
    queryKey: ["homework-submissions", homeworkId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homework_submissions")
        .select(
          `
          *,
          students!inner(full_name)
        `,
        )
        .eq("homework_id", homeworkId)
        .order("submitted_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!homeworkId,
  });

  // Combine enrolled students with their submissions
  const studentsWithSubmissions =
    enrolledStudents?.map((student) => {
      const submission = submissions?.find((s) => s.student_id === student.id);
      return { student, submission };
    }) || [];

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, studentId, grade, feedback, points }: any) => {
      let finalSubmissionId = submissionId;

      // If no submission exists, create one
      if (!submissionId && studentId) {
        const { data: newSubmission, error: createError } = await supabase
          .from("homework_submissions")
          .insert({
            homework_id: homeworkId,
            student_id: studentId,
            status: "graded",
            grade,
            teacher_feedback: feedback,
            graded_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (createError) throw createError;
        finalSubmissionId = newSubmission.id;
      } else if (submissionId) {
        // Update existing submission
        const { error } = await supabase
          .from("homework_submissions")
          .update({
            grade,
            teacher_feedback: feedback,
            status: "graded",
            graded_at: new Date().toISOString(),
          })
          .eq("id", submissionId);

        if (error) throw error;
      }

      const targetStudentId =
        studentId ||
        (await supabase.from("homework_submissions").select("student_id").eq("id", finalSubmissionId).single()).data
          ?.student_id;

      // Create point transaction for homework (trigger will update student_points automatically)
      // Use homework due_date for month attribution, not grading date
      if (points !== undefined && points !== null && homework?.classes?.id) {
        const effectiveDate = homework.due_date || new Date().toISOString().split('T')[0];
        const month = effectiveDate.slice(0, 7);

        const { error: pointsError } = await supabase.from("point_transactions").insert({
          student_id: targetStudentId,
          class_id: homework.classes.id,
          homework_id: homeworkId,
          homework_title: homework.title,
          points: points,
          type: 'homework',
          date: effectiveDate,
          month,
          notes: `Homework graded: ${grade}`,
        });

        if (pointsError) throw pointsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework-submissions", homeworkId] });
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      queryClient.invalidateQueries({ queryKey: ["point-breakdown"] });
      queryClient.invalidateQueries({ queryKey: ["available-months"] });
      queryClient.invalidateQueries({ queryKey: ["point-transactions"] });
      toast.success("Grade submitted successfully");
      // Go back to list after grading
      setView("list");
      setSelectedSubmission(null);
      setGrade("");
      setFeedback("");
      setPoints("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to submit grade");
    }
  });

  // Reverse early submission bonus mutation
  const reverseEarlyBonusMutation = useMutation({
    mutationFn: async ({ homeworkId, studentId }: { homeworkId: string; studentId: string }) => {
      const { data: reward } = await supabase
        .from("early_submission_rewards")
        .select("*, homeworks(class_id, due_date, title)")
        .eq("homework_id", homeworkId)
        .eq("student_id", studentId)
        .is("reversed_at", null)
        .maybeSingle();

      if (!reward) throw new Error("No early bonus to reverse");

      await supabase
        .from("early_submission_rewards")
        .update({
          reversed_at: new Date().toISOString(),
          reversed_by: user?.id
        })
        .eq("id", reward.id);

      const effectiveDate = reward.homeworks?.due_date || dayjs().format("YYYY-MM-DD");
      const month = effectiveDate.slice(0, 7);

      await supabase
        .from("point_transactions")
        .insert({
          student_id: studentId,
          class_id: reward.homeworks?.class_id,
          homework_id: homeworkId,
          homework_title: reward.homeworks?.title,
          points: -5,
          type: "early_submission",
          reason: "Early submission bonus reversed (empty submission)",
          date: effectiveDate,
          month
        });
    },
    onSuccess: () => {
      toast.success("Early submission bonus reversed (-5 XP)");
      queryClient.invalidateQueries({ queryKey: ["homework-submissions", homeworkId] });
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reverse bonus");
    }
  });

  const downloadFile = async (storageKey: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("homework").download(storageKey);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error: any) {
      toast.error("Failed to download file");
    }
  };

  const handleGradeSubmit = () => {
    if (!selectedSubmission) return;

    const pointsValue = points !== "" ? Number(points) : undefined;

    gradeMutation.mutate({
      submissionId: selectedSubmission.submission?.id,
      studentId: selectedSubmission.student.id,
      grade,
      feedback,
      points: pointsValue,
    });
  };

  const statusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      submitted: "bg-blue-100 text-blue-800",
      graded: "bg-green-100 text-green-800",
      not_submitted: "bg-gray-100 text-gray-800",
      Not_Submitted: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100";
  };

  const openGradeView = (item: any) => {
    setSelectedSubmission(item);
    setGrade(item.submission?.grade || "");
    setFeedback(item.submission?.teacher_feedback || "");
    setPoints("");
    setView("grade");
  };

  const handleClose = () => {
    setView("list");
    setSelectedSubmission(null);
    setGrade("");
    setFeedback("");
    setPoints("");
    onClose();
  };

  return (
    <Dialog open={!!homeworkId} onOpenChange={handleClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
        {/* ---- HEADER ---- */}
        <div className="px-4 pt-5 pb-3 sm:px-6 border-b shrink-0">
          <DialogHeader>
            {view === "grade" ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 shrink-0"
                    onClick={() => setView("list")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <DialogTitle className="text-base truncate">Grade Assignment</DialogTitle>
                    <DialogDescription className="truncate">
                      {selectedSubmission?.student.full_name}
                      {!selectedSubmission?.submission && " (Offline)"}
                    </DialogDescription>
                  </div>
                </div>
              </>
            ) : (
              <>
                <DialogTitle>Homework Submissions</DialogTitle>
                <DialogDescription>Review and grade student submissions</DialogDescription>
              </>
            )}
          </DialogHeader>
        </div>

        {/* ---- SCROLLABLE CONTENT ---- */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6 -webkit-overflow-scrolling-touch">
          {view === "list" ? (
            /* ===== STUDENT LIST VIEW ===== */
            <div className="space-y-3">
              {studentsWithSubmissions.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No enrolled students</p>
              ) : (
                studentsWithSubmissions.map((item: any) => (
                  <div
                    key={item.student.id}
                    className="border rounded-xl p-3 sm:p-4 space-y-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{item.student.full_name}</p>
                        {item.submission ? (
                          <p className="text-xs text-muted-foreground">
                            Submitted {dayjs(item.submission.submitted_at).format("MMM D, h:mm A")}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not submitted</p>
                        )}
                      </div>
                      <Badge className={`${statusColor(item.submission?.status || "not_submitted")} shrink-0 text-[10px] sm:text-xs`}>
                        {item.submission?.status || "Not Submitted"}
                      </Badge>
                    </div>

                    {item.submission?.submission_text && (
                      <div className="bg-muted/50 p-2.5 rounded-lg">
                        <p className="text-xs sm:text-sm whitespace-pre-wrap line-clamp-3">{item.submission.submission_text}</p>
                      </div>
                    )}

                    {item.submission?.storage_key && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => downloadFile(item.submission.storage_key, item.submission.file_name)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Download
                      </Button>
                    )}

                    {item.submission?.status === "graded" && (
                      <div className="space-y-1 border-t pt-2">
                        <p className="text-xs sm:text-sm font-medium">Grade: {item.submission.grade}</p>
                        {item.submission.teacher_feedback && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Feedback: {item.submission.teacher_feedback}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant={item.submission?.status === "graded" ? "outline" : "default"}
                        size="sm"
                        className="flex-1 h-9 text-xs sm:text-sm"
                        onClick={() => openGradeView(item)}
                      >
                        {item.submission?.status === "graded" ? "Update Grade" : "Grade"}
                      </Button>
                      {!item.submission && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="flex-1 h-9 text-xs sm:text-sm"
                          onClick={() => openGradeView(item)}
                        >
                          Grade Offline
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* ===== GRADING FORM VIEW ===== */
            <div className="space-y-4">
              {homework?.body && (
                <div className="space-y-1.5 pb-3 mb-3 border-b">
                  <Label className="text-sm font-semibold">Assignment Instructions</Label>
                  <div 
                    className="p-3 bg-muted/50 rounded-lg prose prose-sm max-w-none text-xs sm:text-sm [&_p]:text-muted-foreground [&_strong]:text-foreground [&_em]:text-foreground [&_ul]:text-muted-foreground [&_ol]:text-muted-foreground [&_li]:text-muted-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(homework.body) }}
                  />
                </div>
              )}

              <div className="space-y-1.5 pb-3 mb-3 border-b">
                <Label className="text-sm font-semibold">Student Submission</Label>
                {selectedSubmission?.submission?.submission_text ? (
                  <div 
                    className="p-3 bg-background border rounded-lg prose prose-sm max-w-none text-xs sm:text-sm [&_p]:text-foreground [&_strong]:text-foreground [&_em]:text-foreground [&_ul]:text-foreground [&_ol]:text-foreground [&_li]:text-foreground"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(selectedSubmission.submission.submission_text) }}
                  />
                ) : (
                  <div className="p-3 bg-muted/30 border border-dashed rounded-lg text-muted-foreground text-xs sm:text-sm">
                    {selectedSubmission?.submission ? "No text submission provided" : "Grading offline submission — no online submission found"}
                  </div>
                )}
                {selectedSubmission?.submission?.storage_key && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs mt-2"
                    onClick={() => downloadFile(selectedSubmission.submission.storage_key, selectedSubmission.submission.file_name)}
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Download Attachment
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="grade" className="text-sm">Grade</Label>
                <Select
                  value={GRADE_PRESETS.some(p => p.value === grade) ? grade : "__custom"}
                  onValueChange={(val) => {
                    if (val === "__custom") return;
                    const preset = GRADE_PRESETS.find(p => p.value === val);
                    setGrade(val);
                    if (preset && !points) {
                      setPoints(String(preset.minPoints));
                    }
                  }}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select a grade..." />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} ({p.minPoints}-{p.maxPoints} pts)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Or type a custom grade..."
                  className="h-10 mt-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="points" className="text-sm">Points (0-100)</Label>
                <Input
                  id="points"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Max 100 points"
                  className="h-10"
                />
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Homework points (max 100) for leaderboard
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="feedback" className="text-sm">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={3}
                  className="text-sm"
                />
              </div>

              {/* ---- Action buttons (sticky at bottom of scroll) ---- */}
              <div className="space-y-2 pt-2 pb-1">
                <Button
                  onClick={handleGradeSubmit}
                  disabled={!grade || gradeMutation.isPending}
                  className="w-full h-11 font-semibold"
                >
                  Submit Grade
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive h-9 text-xs"
                  onClick={() => {
                    if (selectedSubmission?.student?.id) {
                      reverseEarlyBonusMutation.mutate({
                        homeworkId,
                        studentId: selectedSubmission.student.id
                      });
                    }
                  }}
                  disabled={reverseEarlyBonusMutation.isPending}
                >
                  <Undo className="h-3.5 w-3.5 mr-1.5" />
                  Reverse Early Bonus (-5 XP)
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
