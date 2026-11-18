import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { files } from "@/lib/files";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Star, Undo } from "lucide-react";
import { RichTextView } from "@/components/rich-text";
import { dayjs } from "@/lib/date";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { PagedListControls, usePagedList } from "@/components/shared/PagedListControls";

interface HomeworkGradingListProps {
  statusFilter?: string;
  classFilter?: string;
}

export function HomeworkGradingList({ statusFilter = "all", classFilter = "all" }: HomeworkGradingListProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [grade, setGrade] = useState("");
  const [feedback, setFeedback] = useState("");
  const [points, setPoints] = useState("");
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["all-homework-submissions", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      // Try teacher first
      const { data: teacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      let classIds: string[] = [];

      if (teacher) {
        const { data: teacherSessionsData } = await supabase
          .from("sessions")
          .select("class_id")
          .eq("teacher_id", teacher.id);
        classIds = Array.from(new Set(teacherSessionsData?.map((s) => s.class_id) || []));
      } else {
        // Try TA
        const { data: ta } = await supabase
          .from("teaching_assistants")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!ta) return [];

        const { data: spData } = await supabase
          .from("session_participants")
          .select("sessions!inner(class_id)")
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant");

        classIds = Array.from(new Set((spData || []).map((sp: any) => sp.sessions?.class_id).filter(Boolean)));
      }

      if (classIds.length === 0) return [];

      // Get all submissions for teacher's classes in one query (no need for separate homeworks query)
      const { data } = await supabase
        .from("homework_submissions")
        .select(`
          *,
          students!inner(full_name),
          homeworks!inner(title, class_id, classes!inner(name))
        `)
        .in("homeworks.class_id", classIds)
        .order("submitted_at", { ascending: false })
        .limit(100);

      return data || [];
    },
    enabled: !!user,
  });

  const gradeMutation = useMutation({
    mutationFn: async ({ submissionId, grade, feedback, points }: any) => {
      const { data: submission, error: fetchError } = await supabase
        .from("homework_submissions")
        .select("student_id, homework_id")
        .eq("id", submissionId)
        .single();

      if (fetchError) throw fetchError;

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

      // One award per child per homework, through the one function that
      // knows that (20261023090000). This used to be a blind insert, here
      // and in two other components, so correcting a grade from 6 to 8
      // left the child holding both.
      if (points !== undefined && points !== null) {
        const { error: pointsError } = await supabase.rpc("award_homework_points", {
          p_student: submission.student_id,
          p_homework: submission.homework_id,
          p_points: parseInt(points),
          p_grade: grade,
        });

        if (pointsError) throw pointsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-homework-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });
      toast.success("Grade submitted successfully");
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
      // Get the early submission reward
      const { data: reward } = await supabase
        .from("early_submission_rewards")
        .select("*, homeworks(class_id, due_date, title)")
        .eq("homework_id", homeworkId)
        .eq("student_id", studentId)
        .is("reversed_at", null)
        .maybeSingle();

      if (!reward) throw new Error("No early bonus to reverse");

      // Mark as reversed
      await supabase
        .from("early_submission_rewards")
        .update({ 
          reversed_at: new Date().toISOString(),
          reversed_by: user?.id
        })
        .eq("id", reward.id);

      // Add negative point transaction to cancel the bonus
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
          // `notes`, not `reason` - point_transactions has no reason column,
          // so this insert was rejected every time it ran.
          notes: "Early submission bonus reversed (empty submission)",
          date: effectiveDate,
          month
        });
    },
    onSuccess: () => {
      toast.success("Early submission bonus reversed (-5 XP)");
      queryClient.invalidateQueries({ queryKey: ["all-homework-submissions"] });
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

  const filteredSubmissions = submissions.filter((submission: any) => {
    // Class filter
    if (classFilter && classFilter !== "all") {
      if (submission.homeworks?.class_id !== classFilter) return false;
    }
    // Status filter
    if (statusFilter === "all") return true;
    if (statusFilter === "not_submitted") return !submission.submitted_at;
    if (statusFilter === "submitted") return submission.submitted_at && !submission.grade;
    if (statusFilter === "graded") return submission.grade !== null;
    return true;
  });

  const paged = usePagedList(filteredSubmissions);

  if (isLoading) return <div className="py-8 text-center text-hec-body text-hec-ink-soft">Loading submissions...</div>;

  const getStatusBadge = (submission: any) => {
    if (submission.grade !== null) {
      return <Badge variant="success">✓ Graded</Badge>;
    }
    if (submission.submitted_at) {
      return <Badge variant="warning">⏳ Submitted</Badge>;
    }
    return (
      <Badge variant="secondary">
        ○ Not Submitted
      </Badge>
    );
  };

  if (filteredSubmissions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-hec-sunken">
            <Star className="h-8 w-8 text-hec-ink-faint" aria-hidden="true" />
          </div>
          <p className="mb-1 font-display text-hec-h2 font-medium text-hec-ink">
            {statusFilter === "all" ? "No submissions yet" : `No ${statusFilter.replace("_", " ")} submissions`}
          </p>
          <p className="text-hec-small text-hec-ink-soft">Submissions will appear here once students submit their work</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-3 md:space-y-4">
        {paged.slice.map((submission: any) => {
          const homework = submission.homeworks;

          return (
            <Card key={submission.id} className="long-list-item min-w-0 overflow-hidden">
              <CardHeader className="min-w-0 p-4 pb-3 sm:p-6">
                <div className="flex flex-col gap-3 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden space-y-1">
                      <CardTitle className="flex items-start gap-2 break-words [overflow-wrap:anywhere]">
                        <span className="shrink-0" aria-hidden="true">📚</span>
                        <span className="min-w-0 break-words">{homework?.title}</span>
                      </CardTitle>
                      <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{submission.students?.full_name}</p>
                      <p className="break-words text-hec-small text-hec-ink-soft">Class: {homework?.classes?.name}</p>
                      {submission.submitted_at && (
                        <p className="text-hec-caption text-hec-ink-faint tabular-nums">
                          📅 Submitted {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    {getStatusBadge(submission)}
                    <div className="ml-auto">
                      <HomeworkPdfDownload
                        homework={{ id: homework?.id || submission.homework_id, title: homework?.title || "", body: null, due_date: null, created_at: undefined }}
                        className={homework?.classes?.name}
                        variant="pill-compact"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-3">
                {submission.submission_text && (
                  <div className="rounded-hec-md bg-hec-sunken p-3">
                    <p className="line-clamp-3 whitespace-pre-wrap break-words text-hec-small text-hec-ink">{submission.submission_text}</p>
                  </div>
                )}

                {submission.storage_key && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="min-h-hec-target w-full sm:w-auto"
                    onClick={() => downloadFile(submission.storage_key, submission.file_name)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Attachment
                  </Button>
                )}

                {submission.grade && (
                  <div className="space-y-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-3">
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 fill-current text-hec-leaf" aria-hidden="true" />
                      <p className="text-hec-small font-semibold text-hec-ink">Grade: {submission.grade}</p>
                    </div>
                    {submission.teacher_feedback && (
                      <p className="break-words text-hec-small text-hec-ink-soft">💬 {submission.teacher_feedback}</p>
                    )}
                    <p className="text-hec-caption text-hec-ink-soft tabular-nums">
                      Graded: {format(new Date(submission.graded_at), "MMM d, yyyy")}
                    </p>
                  </div>
                )}

                {!submission.grade && submission.submitted_at && (
                  <Button
                    variant="default"
                    size="lg"
                    className="min-h-hec-target w-full"
                    onClick={() => {
                      setSelectedSubmission(submission);
                      setGrade("");
                      setFeedback("");
                      setPoints("");
                    }}
                  >
                    Grade Submission
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <PagedListControls
        page={paged.page}
        totalPages={paged.totalPages}
        total={paged.total}
        rangeLabel={paged.rangeLabel}
        onPageChange={paged.setPage}
      />

      {selectedSubmission && (
        <Dialog open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
          <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Grade Submission</DialogTitle>
              <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body text-hec-ink-soft">{selectedSubmission.students?.full_name}</p>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              {selectedSubmission?.assignment_instructions && (
                <div className="mb-4 space-y-2 border-b border-hec-line pb-4">
                  <Label className="text-hec-small font-semibold text-hec-ink">Original Assignment Instructions</Label>
                  <RichTextView
                    className="prose prose-sm max-w-none break-words rounded-hec-md bg-hec-sunken p-4 text-hec-ink-soft [&_p]:text-hec-ink-soft [&_strong]:text-hec-ink [&_em]:text-hec-ink [&_ul]:text-hec-ink-soft [&_ol]:text-hec-ink-soft [&_li]:text-hec-ink-soft"
                    html={selectedSubmission.assignment_instructions}
                  />
                </div>
              )}

              {selectedSubmission?.submission_text && (
                <div className="mb-4 space-y-2 border-b border-hec-line pb-4">
                  <Label className="text-hec-small font-semibold text-hec-ink">Student Submission</Label>
                  <RichTextView
                    className="prose prose-sm max-w-none break-words rounded-hec-md border border-hec-line bg-hec-surface p-4 text-hec-ink [&_p]:text-hec-ink [&_strong]:text-hec-ink [&_em]:text-hec-ink [&_ul]:text-hec-ink [&_ol]:text-hec-ink [&_li]:text-hec-ink"
                    html={selectedSubmission.submission_text}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="grade">Grade *</Label>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., A, 95/100, Excellent"
                  className="text-hec-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="points">Points (0-100)</Label>
                <Input
                  id="points"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Max 100 points"
                  className="text-hec-body"
                />
                <p className="text-hec-caption text-hec-ink-soft">⭐ Homework points (max 100) for leaderboard</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback (Optional)</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Provide feedback for the student..."
                  rows={4}
                  className="resize-none text-hec-body"
                />
              </div>

              <div className="space-y-3">
                <Button
                  onClick={() => {
                    if (!grade) {
                      toast.error("Please enter a grade");
                      return;
                    }
                    const pointsValue = points ? parseInt(points) : undefined;
                    if (pointsValue !== undefined && (pointsValue < 0 || pointsValue > 100)) {
                      toast.error("Points must be between 0 and 100");
                      return;
                    }
                    gradeMutation.mutate({
                      submissionId: selectedSubmission.id,
                      grade,
                      feedback,
                      points: pointsValue,
                    });
                  }}
                  disabled={!grade || gradeMutation.isPending}
                  className="min-h-hec-target w-full"
                >
                  {gradeMutation.isPending ? "Submitting..." : "Submit Grade"}
                </Button>

                <Button
                  variant="destructive-quiet"
                  size="sm"
                  className="min-h-hec-target w-full"
                  onClick={() => {
                    reverseEarlyBonusMutation.mutate({
                      homeworkId: selectedSubmission.homework_id,
                      studentId: selectedSubmission.student_id
                    });
                  }}
                  disabled={reverseEarlyBonusMutation.isPending}
                >
                  <Undo className="h-4 w-4 mr-2" />
                  Reverse Early Bonus (-5 XP)
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
