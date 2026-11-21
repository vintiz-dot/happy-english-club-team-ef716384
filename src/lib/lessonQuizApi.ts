/** The two RPCs behind the review quiz. Not in the generated Supabase types, so the client is cast here. */
import { supabase } from "@/integrations/supabase/client";
import { answersPayload, type LessonQuiz, type QuizAnswers, type QuizQuestion, type QuizSubmission } from "./lessonQuiz";

const quizDb = supabase as any;

export async function fetchLessonQuiz(homeworkId: string, studentId: string): Promise<LessonQuiz | null> {
  const { data, error } = await quizDb.rpc("get_lesson_review_quiz", { p_homework: homeworkId, p_student: studentId });
  if (error) throw error;
  return (data ?? null) as LessonQuiz | null;
}

export async function submitLessonQuiz(
  homeworkId: string,
  studentId: string,
  questions: QuizQuestion[],
  answers: QuizAnswers,
): Promise<QuizSubmission & { improved: boolean; best_score: number }> {
  const { data, error } = await quizDb.rpc("submit_lesson_review", {
    p_homework: homeworkId,
    p_student: studentId,
    p_answers: answersPayload(questions, answers),
  });
  if (error) throw error;
  return data;
}
