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
      queryClient.invalidateQueries({ queryKey: ["class-board"] });
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
      <DialogContent className="flex max-h-[85dvh] w-[calc(100vw-2rem)] max-w-lg flex-col overflow-hidden p-0">
        {/* ---- HEADER ---- */}
        <div className="shrink-0 border-b border-hec-line px-4 pb-3 pt-6 sm:px-6">
          <DialogHeader>
            {selectedStudent ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="min-h-hec-target min-w-hec-target shrink-0 p-0"
                  onClick={() => setSelectedStudent(null)}
                  aria-label="Back to the list of students"
                >
                  <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                </Button>
                <div className="min-w-0 flex-1">
                  <DialogTitle>Grade Offline</DialogTitle>
                  <DialogDescription className="whitespace-normal break-words hyphens-none text-balance">{selectedStudent.full_name}</DialogDescription>
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
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-hec-ink-faint" aria-hidden="true" />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-hec-body text-hec-ink-soft">All students have submitted online! 🎉</p>
            </div>
          ) : !selectedStudent ? (
            /* ===== STUDENT PICKER ===== */
            <div className="space-y-2">
              <Label className="text-hec-small font-semibold text-hec-ink">Select Student</Label>
              <div className="space-y-2">
                {students.map((student) => (
                  <Card
                    key={student.id}
                    className="min-h-hec-target cursor-pointer p-3 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hec-sunken">
                        <GraduationCap className="h-5 w-5 text-hec-ink-soft" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{student.full_name}</p>
                        <Badge variant="outline" className="mt-1">
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
              <div className="rounded-hec-md bg-hec-sunken p-3">
                <p className="break-words text-hec-body font-medium text-hec-ink">Grading: {selectedStudent.full_name}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="offline-grade" className="text-hec-small font-medium text-hec-ink">Grade *</Label>
                <Input
                  id="offline-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g., A, B+, 95/100"
                  className="text-hec-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offline-points" className="text-hec-small font-medium text-hec-ink">Points (-100 to 100)</Label>
                <Input
                  id="offline-points"
                  type="number"
                  inputMode="numeric"
                  min="-100"
                  max="100"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="Optional leaderboard points"
                  className="text-hec-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="offline-feedback" className="text-hec-small font-medium text-hec-ink">Teacher Feedback</Label>
                <Textarea
                  id="offline-feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Optional feedback for the student..."
                  rows={3}
                  className="text-hec-body"
                />
              </div>

              <div className="flex flex-col gap-2 pb-1 pt-2 sm:flex-row">
                <Button onClick={handleSubmitGrade} disabled={submitting} className="min-h-hec-target w-full sm:flex-1">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  Submit Grade
                </Button>
                <Button onClick={() => setSelectedStudent(null)} variant="outline" disabled={submitting} className="min-h-hec-target w-full sm:w-auto">
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
