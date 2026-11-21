/**
 * A child's lesson review quiz: one question at a time, big buttons, English
 * with Vietnamese under it. The database marks it; this only collects answers
 * and shows the result (right answers, explanations, points) afterwards.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { soundManager } from "@/lib/soundManager";
import { fetchLessonQuiz, submitLessonQuiz } from "@/lib/lessonQuizApi";
import {
  isAnswered, piecesFor, resultHeadline, toggleOrderPiece, unansweredCount,
  type LessonQuiz, type QuizAnswers, type QuizQuestion, type QuizSubmission,
} from "@/lib/lessonQuiz";

/** The quiz behind a homework for this child, or null when it is not a review quiz. */
export function useLessonQuiz(homeworkId: string, studentId: string) {
  return useQuery({
    queryKey: ["lesson-quiz", homeworkId, studentId],
    queryFn: () => fetchLessonQuiz(homeworkId, studentId),
    enabled: !!homeworkId && !!studentId,
    // Before the migration is applied the RPC does not exist: treat as "not a quiz".
    retry: false,
  });
}

type Phase = "play" | "result";

export default function LessonQuizPlayer({
  homeworkId, studentId, quiz, onSuccess,
}: { homeworkId: string; studentId: string; quiz: LessonQuiz; onSuccess?: () => void }) {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>(quiz.submission ? "result" : "play");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({});
  const [picked, setPicked] = useState<Record<string, number[]>>({});
  const [result, setResult] = useState<QuizSubmission | null>(quiz.submission);

  const questions = quiz.questions;
  const q = questions[index];
  const last = index === questions.length - 1;

  const send = useMutation({
    mutationFn: () => submitLessonQuiz(homeworkId, studentId, questions, answers),
    onSuccess: (r) => {
      setResult(r);
      setPhase("result");
      soundManager.play("success");
      qc.invalidateQueries({ queryKey: ["lesson-quiz", homeworkId, studentId] });
      qc.invalidateQueries({ queryKey: ["student-assignments", studentId] });
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e?.message || "Could not send your answers. Please try again."),
  });

  const setOrder = (question: QuizQuestion, next: number[]) => {
    setPicked((p) => ({ ...p, [question.id]: next }));
    setAnswers((a) => ({ ...a, [question.id]: piecesFor(question, next) }));
  };

  if (phase === "result" && result) {
    return (
      <QuizResult
        quiz={quiz}
        result={result}
        onRetake={() => {
          setAnswers({});
          setPicked({});
          setIndex(0);
          setPhase("play");
        }}
      />
    );
  }

  const left = unansweredCount(questions, answers);

  return (
    <div className="space-y-4" data-testid="lesson-quiz">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-hec-small text-hec-ink-soft">
          <span>Question {index + 1} of {questions.length}</span>
          <span>Câu {index + 1}/{questions.length}</span>
        </div>
        <Progress value={((index + 1) / questions.length) * 100} />
      </div>

      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 space-y-4">
        <div>
          <p className="break-words text-hec-h3 font-medium text-hec-ink">{q.prompt}</p>
          {q.prompt_vi && <p className="break-words text-hec-body text-hec-ink-soft">{q.prompt_vi}</p>}
        </div>

        {q.kind === "choice" && (
          <div className="grid gap-2">
            {(q.options ?? []).map((o) => {
              const on = answers[q.id] === o;
              return (
                <button
                  key={o}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: o }))}
                  className={cn(
                    "min-h-14 w-full rounded-hec-md border-2 px-4 py-3 text-left text-hec-h3 transition-colors",
                    on ? "border-hec-ink bg-hec-sunken font-medium text-hec-ink" : "border-hec-line bg-hec-surface text-hec-ink hover:border-hec-line-strong",
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}

        {q.kind === "gap" && (
          <Input
            value={typeof answers[q.id] === "string" ? (answers[q.id] as string) : ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            placeholder="Type your answer / Viết câu trả lời"
            className="h-14 text-hec-h3"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Your answer"
          />
        )}

        {q.kind === "order" && (
          <div className="space-y-3">
            <div
              className="flex min-h-14 flex-wrap items-center gap-2 rounded-hec-md border-2 border-dashed border-hec-line-strong p-2"
              aria-label="Your sentence"
            >
              {(picked[q.id] ?? []).length === 0 && (
                <span className="px-2 text-hec-small text-hec-ink-soft">Tap the words in order / Chạm các từ theo thứ tự</span>
              )}
              {(picked[q.id] ?? []).map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setOrder(q, toggleOrderPiece(picked[q.id] ?? [], i))}
                  className="min-h-12 rounded-hec-md border-2 border-hec-ink bg-hec-sunken px-4 text-hec-h3 text-hec-ink"
                >
                  {(q.options ?? [])[i]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(q.options ?? []).map((o, i) => {
                const used = (picked[q.id] ?? []).includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={used}
                    onClick={() => setOrder(q, toggleOrderPiece(picked[q.id] ?? [], i))}
                    className={cn(
                      "min-h-12 rounded-hec-md border-2 px-4 text-hec-h3",
                      used ? "border-hec-line bg-hec-sunken text-hec-ink-soft opacity-40" : "border-hec-line bg-hec-surface text-hec-ink hover:border-hec-line-strong",
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {(picked[q.id] ?? []).length > 0 && (
              <Button variant="quiet" size="sm" onClick={() => setOrder(q, [])}>
                <RotateCcw className="mr-1 h-4 w-4" /> Start again / Làm lại
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="min-h-12" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Back
        </Button>
        {!last ? (
          <Button className="min-h-12 flex-1 text-hec-body" disabled={!isAnswered(q, answers[q.id])} onClick={() => setIndex(index + 1)}>
            Next / Tiếp <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button className="min-h-12 flex-1 text-hec-body" disabled={send.isPending || !isAnswered(q, answers[q.id])} onClick={() => send.mutate()}>
            {send.isPending ? "Checking..." : "Check my answers / Kiểm tra"}
          </Button>
        )}
      </div>
      {last && left > 0 && (
        <p className="text-hec-small text-hec-ink-soft">
          {left} question{left === 1 ? "" : "s"} not answered yet. They count as wrong. / Còn {left} câu chưa trả lời.
        </p>
      )}
    </div>
  );
}

function QuizResult({ quiz, result, onRetake }: { quiz: LessonQuiz; result: QuizSubmission; onRetake: () => void }) {
  const head = resultHeadline(result.score, result.total);
  const byId = new Map(result.results.map((r) => [r.id, r]));
  return (
    <div className="space-y-4" data-testid="lesson-quiz-result">
      <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-5 text-center space-y-1">
        <div className="text-4xl" aria-hidden="true">{"⭐".repeat(head.stars)}</div>
        <p className="text-hec-h2 font-medium text-hec-ink">{result.score} / {result.total}</p>
        <p className="text-hec-h3 text-hec-ink">{head.en}</p>
        <p className="text-hec-body text-hec-ink-soft">{head.vi}</p>
        {result.points_awarded > 0 && (
          <p className="pt-1 text-hec-body font-medium text-hec-ink">
            +{result.points_awarded} points / điểm
          </p>
        )}
      </div>

      <ol className="space-y-3">
        {quiz.questions.map((q, i) => {
          const r = byId.get(q.id);
          if (!r) return null;
          return (
            <li key={q.id} className={cn("rounded-hec-lg border-2 p-3 space-y-1", r.correct ? "border-hec-line bg-hec-surface" : "border-hec-line-strong bg-hec-sunken")}>
              <div className="flex items-start gap-2">
                {r.correct ? <Check className="mt-1 h-5 w-5 shrink-0" aria-label="Correct" /> : <X className="mt-1 h-5 w-5 shrink-0" aria-label="Not correct" />}
                <div className="min-w-0">
                  <p className="break-words text-hec-body font-medium text-hec-ink">{i + 1}. {q.prompt}</p>
                  {q.prompt_vi && <p className="break-words text-hec-small text-hec-ink-soft">{q.prompt_vi}</p>}
                </div>
              </div>
              {!r.correct && (
                <p className="break-words pl-7 text-hec-small text-hec-ink">
                  You wrote: <span className="font-medium">{r.your_answer || "(nothing)"}</span>
                </p>
              )}
              <p className="break-words pl-7 text-hec-small text-hec-ink">
                Answer: <span className="font-medium">{r.answer}</span>
              </p>
              {(r.explain || r.explain_vi) && (
                <div className="pl-7 text-hec-small text-hec-ink-soft">
                  {r.explain && <p className="break-words">{r.explain}</p>}
                  {r.explain_vi && <p className="break-words">{r.explain_vi}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {result.can_retake && (
        <Button variant="outline" className="min-h-12 w-full" onClick={onRetake}>
          <RotateCcw className="mr-2 h-4 w-4" /> Try again to beat your score / Làm lại
        </Button>
      )}
    </div>
  );
}
