/**
 * A lesson review quiz is marked by the database, so a teacher has nothing to
 * grade: this shows the child's score, attempts and points, read-only.
 */
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseQuizGrade } from "@/lib/lessonQuiz";

export function QuizResultReadOnly({
  submission, studentName, onBack,
}: { submission: any; studentName?: string; onBack: () => void }) {
  const grade = parseQuizGrade(submission?.grade);
  let info: { attempts?: number; points?: number } = {};
  try {
    if (submission?.submission_text) info = JSON.parse(submission.submission_text);
  } catch {
    /* not JSON: show the grade alone */
  }
  return (
    <div className="space-y-4">
      <Button variant="quiet" size="sm" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to the list
      </Button>
      <div className="space-y-1 rounded-hec-lg border border-hec-line bg-hec-surface p-4">
        <p className="break-words text-hec-body font-medium text-hec-ink">{studentName ?? "Student"}</p>
        {grade ? (
          <>
            <p className="text-hec-h2 font-medium tabular-nums text-hec-ink">{grade.score} / {grade.total}</p>
            <p className="text-hec-small text-hec-ink-soft">
              {info.attempts ?? 1} attempt{(info.attempts ?? 1) === 1 ? "" : "s"}
              {typeof info.points === "number" ? `, ${info.points} points` : ""}
            </p>
          </>
        ) : (
          <p className="text-hec-small text-hec-ink-soft">Not taken yet.</p>
        )}
        <p className="pt-2 text-hec-caption text-hec-ink-soft">
          This quiz is marked automatically from the lesson report. There is nothing to grade.
        </p>
      </div>
    </div>
  );
}
