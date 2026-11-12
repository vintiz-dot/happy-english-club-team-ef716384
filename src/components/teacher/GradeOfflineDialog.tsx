import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueryClient } from "@tanstack/react-query";
import { useIvory } from "@/hooks/useIvory";

interface Student {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface GradeOfflineDialogProps {
  homeworkId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function GradeOfflineDialog({ homeworkId, isOpen, onClose, onSuccess }: GradeOfflineDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [grade, setGrade] = useState("");
  const [points, setPoints] = useState("");
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // Opened from AssignmentUpload, which also renders on "/" (not yet in the
  // system): off-scope the old classes stay exactly as they were.
  const ivory = useIvory();

  useEffect(() => {
    if (homeworkId && isOpen) {
      loadStudentsWithoutSubmission();
    }
  }, [homeworkId, isOpen]);

  const loadStudentsWithoutSubmission = async () => {
    if (!homeworkId) return;

    setLoading(true);
    try {
      // Get homework details including class_id
      const { data: homework, error: hwError } = await supabase
        .from("homeworks")
        .select("class_id")
        .eq("id", homeworkId)
        .single();

      if (hwError) throw hwError;

      // Get all enrolled students in the class
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("student_id, students(id, full_name, avatar_url)")
        .eq("class_id", homework.class_id)
        .is("end_date", null);

      if (enrollError) throw enrollError;

      // Get all students who have submitted
      const { data: submissions, error: subError } = await supabase
        .from("homework_submissions")
        .select("student_id")
        .eq("homework_id", homeworkId);

      if (subError) throw subError;

      const submittedStudentIds = new Set(submissions?.map((s) => s.student_id) || []);

      // Deduplicate by student_id and filter out already-submitted
      const seen = new Set<string>();
      const studentsWithoutSubmission: Student[] = [];
      for (const e of enrollments || []) {
        const s = e.students as unknown as Student | null;
        if (s && !submittedStudentIds.has(s.id) && !seen.has(s.id)) {
          seen.add(s.id);
          studentsWithoutSubmission.push(s);
        }
      }

      setStudents(studentsWithoutSubmission);
    } catch (error: any) {
      toast({
        title: "Error loading students",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGrade = async () => {
    if (!selectedStudent || !homeworkId) {
      toast({
        title: "Missing information",
        description: "Please select a student",
        variant: "destructive",
      });
      return;
    }

    if (!grade) {
      toast({
        title: "Missing grade",
        description: "Please provide a grade",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Create or update homework submission with grade
      const { error: submissionError } = await supabase.from("homework_submissions").upsert({
        homework_id: homeworkId,
        student_id: selectedStudent.id,
        status: "graded",
        grade: grade,
        teacher_feedback: feedback || null,
        graded_at: new Date().toISOString(),
        submission_text: "Graded offline",
      });

      if (submissionError) throw submissionError;

      // Update student points if provided
      const pointsValue = Number(points);
      if (Number.isFinite(pointsValue) && pointsValue >= -100 && pointsValue <= 100) {

        // One award per child per homework, through the one function
        // that knows that (20261023090000). This used to be a blind
        // insert, here and in two other components, so correcting a
        // grade from 6 to 8 left the child holding both. The function
        // also resolves the class and the due-date month, which all
        // three copies were doing for themselves.
        const { error: pointsError } = await supabase.rpc("award_homework_points", {
          p_student: selectedStudent.id,
          p_homework: homeworkId,
          p_points: pointsValue,
          p_grade: grade,
        });

        if (pointsError) throw pointsError;
      }

      toast({
        title: "Success",
        description: `Offline grade submitted for ${selectedStudent.full_name}`,
      });

      // Invalidate leaderboard queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-leader"] });

      // Reset form and reload students
      setSelectedStudent(null);
      setGrade("");
      setPoints("");
      setFeedback("");
      loadStudentsWithoutSubmission();
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error submitting grade",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedStudent(null);
    setGrade("");
    setPoints("");
    setFeedback("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={ivory ? "max-w-lg overflow-hidden flex flex-col gap-0 p-0" : "w-[calc(100vw-2rem)] max-w-lg max-h-[85vh] overflow-hidden flex flex-col p-0"}>
        {/* ---- HEADER ---- */}
        <div className={ivory ? "shrink-0 border-b border-hec-line px-4 pb-3 pt-6 sm:px-6" : "px-4 pt-5 pb-3 sm:px-6 border-b shrink-0"}>
          <DialogHeader>
            {selectedStudent ? (
              <div className={ivory ? "flex items-start gap-2" : "flex items-center gap-2"}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={ivory ? "shrink-0 p-0" : "h-8 w-8 p-0 shrink-0"}
                  onClick={() => setSelectedStudent(null)}
                  aria-label={ivory ? "Back to the students" : undefined}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className={ivory ? "min-w-0 flex-1" : "min-w-0"}>
                  <DialogTitle className={ivory ? undefined : "text-base truncate"}>Grade Offline</DialogTitle>
                  <DialogDescription className={ivory ? "whitespace-normal break-words hyphens-none text-balance" : "truncate"}>{selectedStudent.full_name}</DialogDescription>
                </div>
              </div>
            ) : (
              <>
                <DialogTitle>Grade Offline Submissions</DialogTitle>
                <DialogDescription>Grade students who submitted their work offline</DialogDescription>
              </>
            )}
          </DialogHeader>
        </div>

        {/* ---- SCROLLABLE CONTENT ---- */}
        <div className={ivory ? "flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6" : "flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6"}>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={ivory ? "h-8 w-8 animate-spin text-hec-ink-faint" : "h-8 w-8 animate-spin"} />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <p className={ivory ? "text-hec-small text-hec-ink-soft" : "text-muted-foreground text-sm"}>All students have submitted online! 🎉</p>
            </div>
          ) : !selectedStudent ? (
            /* ===== STUDENT PICKER ===== */
            <div className="space-y-2">
              <Label className={ivory ? "text-hec-small font-semibold text-hec-ink" : "text-sm font-semibold"}>Select Student</Label>
              <div className="space-y-2">
                {students.map((student) => ivory ? (
                  // A real button (keyboard, focus ring); same handler as the old card.
                  <button
                    key={student.id}
                    type="button"
                    className="flex min-h-hec-target w-full items-start gap-3 rounded-hec-lg border border-hec-line bg-hec-surface p-3 text-left shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hec-sunken">
                      <GraduationCap className="h-5 w-5 text-hec-ink-soft" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{student.full_name}</p>
                      <Badge variant="outline">
                        No submission
                      </Badge>
                    </div>
                  </button>
                ) : (
                  <Card
                    key={student.id}
                    className="p-3 cursor-pointer transition-all hover:shadow-md active:scale-[0.98] border-muted"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{student.full_name}</p>
                        <Badge variant="outline" className="text-[10px]">
                          No submission
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* ===== GRADING FORM ===== */
            <div className="space-y-4">
              <div className={ivory ? "rounded-hec-md bg-hec-sunken p-3" : "bg-primary/5 p-3 rounded-lg"}>
                <p className={ivory ? "whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink" : "font-medium text-sm"}>Grading: {selectedStudent.full_name}</p>
              </div>

              <div className={ivory ? "space-y-2" : "space-y-1.5"}>
                <Label htmlFor="offline-grade" className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-sm"}>Grade *</Label>
                <Input
                  id="offline-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., A, B+, 95/100"
                  className={ivory ? undefined : "h-10"}
                />
              </div>

              <div className={ivory ? "space-y-2" : "space-y-1.5"}>
                <Label htmlFor="offline-points" className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-sm"}>Points (-100 to 100)</Label>
                <Input
                  id="offline-points"
                  type="number"
                  inputMode="numeric"
                  min="-100"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Optional leaderboard points"
                  className={ivory ? "tabular-nums" : "h-10"}
                />
              </div>

              <div className={ivory ? "space-y-2" : "space-y-1.5"}>
                <Label htmlFor="offline-feedback" className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-sm"}>Teacher Feedback</Label>
                <Textarea
                  id="offline-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback for the student..."
                  rows={3}
                  className={ivory ? undefined : "text-sm"}
                />
              </div>

              <div className={ivory ? "flex flex-col gap-3 pt-2 pb-1 sm:flex-row" : "flex gap-2 pt-2 pb-1"}>
                <Button onClick={handleSubmitGrade} disabled={submitting} className={ivory ? "flex-1" : "flex-1 h-11 font-semibold"}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Grade
                </Button>
                <Button onClick={() => setSelectedStudent(null)} variant="outline" disabled={submitting} className={ivory ? undefined : "h-11"}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
