import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { files } from "@/lib/files";
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
import { RichTextView } from "@/components/rich-text";
import { useAuth } from "@/hooks/useAuth";
import { VideoReviewPanel } from "@/components/video-homework/VideoReviewPanel";

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

      // One award per child per homework, through the one function that
      // knows that (20261023090000). This used to be a blind insert, here
      // and in two other components, so correcting a grade from 6 to 8
      // left the child holding both.
      if (points !== undefined && points !== null && homework?.classes?.id) {
        const { error: pointsError } = await supabase.rpc("award_homework_points", {
          p_student: targetStudentId,
          p_homework: homeworkId,
          p_points: points,
          p_grade: grade,
        });

        if (pointsError) throw pointsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework-submissions", homeworkId] });
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
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

      // `notes`, not `reason` - point_transactions has no reason column,
      // so this insert was rejected every time and the toast below
      // announced a reversal that never happened.
      const { error: reverseError } = await supabase
        .from("point_transactions")
        .insert({
          student_id: studentId,
          class_id: reward.homeworks?.class_id,
          homework_id: homeworkId,
          homework_title: reward.homeworks?.title,
          points: -5,
          type: "early_submission",
          notes: "Early submission bonus reversed (empty submission)",
          date: effectiveDate,
          month
        });
      if (reverseError) throw reverseError;
    },
    onSuccess: () => {
      toast.success("Early submission bonus reversed (-5 XP)");
      queryClient.invalidateQueries({ queryKey: ["homework-submissions", homeworkId] });
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reverse bonus");
    }
  });

  const downloadFile = async (storageKey: string, fileName: string) => {
    try {
      const data = await files.download("homework", storageKey);

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
      pending: "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
      submitted: "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
      graded: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
      not_submitted: "border-hec-line bg-hec-sunken text-hec-ink-soft",
      Not_Submitted: "border-hec-line bg-hec-sunken text-hec-ink-soft",
    };
    return colors[status] || "border-hec-line bg-hec-sunken text-hec-ink-soft";
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
      <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-2xl flex-col overflow-hidden p-0">
        {/* ---- HEADER ---- */}
        <div className="shrink-0 border-b border-hec-line px-4 pb-3 pt-6 sm:px-6">
          <DialogHeader>
            {view === "grade" ? (
              <>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="min-h-hec-target min-w-hec-target shrink-0 p-0"
                    onClick={() => setView("list")}
                    aria-label="Back to the list of students"
                  >
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <DialogTitle>Grade Assignment</DialogTitle>
                    <DialogDescription className="whitespace-normal break-words hyphens-none text-balance">
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
          {view === "list" ? (
            /* ===== STUDENT LIST VIEW ===== */
            <div className="space-y-3">
              {studentsWithSubmissions.length === 0 ? (
                <p className="py-8 text-center text-hec-body text-hec-ink-soft">No enrolled students</p>
              ) : (
                studentsWithSubmissions.map((item: any) => (
                  <div
                    key={item.student.id}
                    className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{item.student.full_name}</p>
                        {item.submission ? (
                          <p className="text-hec-caption text-hec-ink-soft tabular-nums">
                            Submitted {dayjs(item.submission.submitted_at).format("MMM D, h:mm A")}
                          </p>
                        ) : (
                          <p className="text-hec-caption text-hec-ink-soft">Not submitted</p>
                        )}
                      </div>
                      <Badge variant="outline" className={`${statusColor(item.submission?.status || "not_submitted")} shrink-0`}>
                        {item.submission?.status || "Not Submitted"}
                      </Badge>
                    </div>

                    {item.submission?.submission_text && (
                      <div className="rounded-hec-md bg-hec-sunken p-3">
                        <p className="line-clamp-3 whitespace-pre-wrap break-words text-hec-small text-hec-ink">{item.submission.submission_text}</p>
                      </div>
                    )}

                    {item.submission?.storage_key && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="min-h-hec-target"
                        onClick={() => downloadFile(item.submission.storage_key, item.submission.file_name)}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" />
                        Download
                      </Button>
                    )}

                    {item.submission?.status === "graded" && (
                      <div className="space-y-1 border-t border-hec-line pt-2">
                        <p className="text-hec-small font-medium text-hec-ink">Grade: {item.submission.grade}</p>
                        {item.submission.teacher_feedback && (
                          <p className="line-clamp-2 break-words text-hec-caption text-hec-ink-soft">
                            Feedback: {item.submission.teacher_feedback}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        variant={item.submission?.status === "graded" ? "outline" : "default"}
                        size="sm"
                        className="min-h-hec-target w-full sm:flex-1"
                        onClick={() => openGradeView(item)}
                      >
                        {item.submission?.status === "graded" ? "Update Grade" : "Grade"}
                      </Button>
                      {!item.submission && (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="min-h-hec-target w-full sm:flex-1"
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
          ) : (homework as any)?.submission_type === "video" ? (
            /* ===== VIDEO HOMEWORK: the AI draft, edited and approved ===== */
            <VideoReviewPanel
              homeworkId={homeworkId}
              studentId={selectedSubmission?.student?.id}
              onDone={() => {
                setView("list");
                setSelectedSubmission(null);
              }}
            />
          ) : (
            /* ===== GRADING FORM VIEW ===== */
            <div className="space-y-4">
              {homework?.body && (
                <div className="mb-3 space-y-2 border-b border-hec-line pb-3">
                  <Label className="text-hec-small font-semibold text-hec-ink">Assignment Instructions</Label>
                  <RichTextView
                    className="prose prose-sm max-w-none break-words rounded-hec-md bg-hec-sunken p-3 text-hec-small text-hec-ink-soft [&_p]:text-hec-ink-soft [&_strong]:text-hec-ink [&_em]:text-hec-ink [&_ul]:text-hec-ink-soft [&_ol]:text-hec-ink-soft [&_li]:text-hec-ink-soft"
                    html={homework.body}
                  />
                </div>
              )}

              <div className="mb-3 space-y-2 border-b border-hec-line pb-3">
                <Label className="text-hec-small font-semibold text-hec-ink">Student Submission</Label>
                {selectedSubmission?.submission?.submission_text ? (
                  <RichTextView
                    className="prose prose-sm max-w-none break-words rounded-hec-md border border-hec-line bg-hec-surface p-3 text-hec-small text-hec-ink [&_p]:text-hec-ink [&_strong]:text-hec-ink [&_em]:text-hec-ink [&_ul]:text-hec-ink [&_ol]:text-hec-ink [&_li]:text-hec-ink"
                    html={selectedSubmission.submission.submission_text}
                  />
                ) : (
                  <div className="rounded-hec-md border border-dashed border-hec-line-strong bg-hec-sunken p-3 text-hec-small text-hec-ink-soft">
                    {selectedSubmission?.submission ? "No text submission provided" : "Grading offline submission — no online submission found"}
                  </div>
                )}
                {selectedSubmission?.submission?.storage_key && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 min-h-hec-target"
                    onClick={() => downloadFile(selectedSubmission.submission.storage_key, selectedSubmission.submission.file_name)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Download Attachment
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade" className="text-hec-small font-medium text-hec-ink">Grade</Label>
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
                  <SelectTrigger aria-label="Grade preset">
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
                  className="mt-1 text-hec-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points" className="text-hec-small font-medium text-hec-ink">Points (0-100)</Label>
                <Input
                  id="points"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Max 100 points"
                  className="text-hec-body"
                />
                <p className="text-hec-caption text-hec-ink-soft">
                  Homework points (max 100) for leaderboard
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback" className="text-hec-small font-medium text-hec-ink">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={3}
                  className="text-hec-body"
                />
              </div>

              {/* ---- Action buttons (sticky at bottom of scroll) ---- */}
              <div className="space-y-2 pt-2 pb-1">
                <Button
                  onClick={handleGradeSubmit}
                  disabled={!grade || gradeMutation.isPending}
                  className="min-h-hec-target w-full"
                >
                  Submit Grade
                </Button>

                <Button
                  variant="destructive-quiet"
                  size="sm"
                  className="min-h-hec-target w-full"
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
                  <Undo className="h-4 w-4" aria-hidden="true" />
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
