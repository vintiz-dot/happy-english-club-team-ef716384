import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2, Plus, X } from "lucide-react";
import { type CurriculumLesson, curriculumFromText, lessonLabel, levelFromCurriculum, nextLesson, sortLessons } from "@/lib/curriculumLessons";

// The tables are new (20261121150000) and not in the generated types yet.
const db = supabase as any;

/**
 * "What did this lesson cover?" The teacher picks the course book lesson(s);
 * lesson-report-draft reads them and starts the report's objectives from the
 * book's. Suggests the lesson after the one this class covered last time.
 */
export default function LessonPlanPicker({ sessionId, classId, date, canEdit }: { sessionId: string; classId: string; date: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const planKey = ["session-lesson-plan", sessionId];

  // The class's course book, from its curriculum text ("Reach Higher 3A"; otherwise Oxford Discover).
  const book = useQuery({
    queryKey: ["lesson-plan-book", classId],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await db.from("classes").select("curriculum").eq("id", classId).maybeSingle();
      return curriculumFromText(data?.curriculum);
    },
  });
  const curriculum = book.data;

  const lessons = useQuery({
    queryKey: ["curriculum-lessons", curriculum],
    enabled: !!curriculum,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<CurriculumLesson[]> => {
      const { data, error } = await db.from("curriculum_lessons").select("*").eq("curriculum", curriculum);
      if (error) throw error;
      return sortLessons(data ?? []);
    },
  });

  const plan = useQuery({
    queryKey: planKey,
    queryFn: async (): Promise<{ id: string; position: number; lesson: CurriculumLesson }[]> => {
      const { data, error } = await db.from("session_lesson_plans").select("id, position, curriculum_lessons(*)")
        .eq("session_id", sessionId).order("position");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ id: r.id, position: r.position, lesson: r.curriculum_lessons }));
    },
  });

  // The class's level (its curriculum text) and the last lesson it covered before this one.
  const context = useQuery({
    queryKey: ["lesson-plan-context", classId, date],
    queryFn: async () => {
      const [{ data: cls }, { data: prev }] = await Promise.all([
        db.from("classes").select("curriculum").eq("id", classId).maybeSingle(),
        db.from("session_lesson_plans").select("lesson_id, position, sessions!inner(class_id, date)")
          .eq("sessions.class_id", classId).lt("sessions.date", date)
          .order("date", { referencedTable: "sessions", ascending: false }).order("position", { ascending: false }).limit(1),
      ]);
      return { level: levelFromCurriculum(cls?.curriculum), lastId: (prev?.[0]?.lesson_id as string | undefined) ?? null };
    },
  });

  const all = lessons.data ?? [];
  const levels = useMemo(() => [...new Set(all.map((l) => l.level))].sort((a, b) => a - b), [all]);
  const last = all.find((l) => l.id === context.data?.lastId) ?? null;
  const [level, setLevel] = useState<number | null>(null);
  const [pick, setPick] = useState<string>("");
  useEffect(() => {
    if (level !== null || !levels.length || context.isLoading) return;
    setLevel(last?.level ?? context.data?.level ?? (levels.length === 1 ? levels[0] : null));
  }, [levels, last, context.data, context.isLoading, level]);
  const inLevel = all.filter((l) => l.level === level);
  const suggestion = level !== null ? nextLesson(inLevel, last && last.level === level ? last.id : null) : null;
  useEffect(() => { if (!pick && suggestion) setPick(suggestion.id); }, [suggestion, pick]);

  const add = useMutation({
    mutationFn: async (lessonId: string) => {
      const position = (plan.data?.reduce((m, p) => Math.max(m, p.position), 0) ?? 0) + 1;
      // set_by / set_at are the server's (session_lesson_plans_fill).
      const { error } = await db.from("session_lesson_plans").insert({ session_id: sessionId, lesson_id: lessonId, position });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: planKey }); setPick(""); },
    onError: (e: any) => toast.error(e?.code === "23505" ? "That lesson is already listed" : e?.message ?? "Could not save the lesson"),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("session_lesson_plans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: planKey }),
    onError: (e: any) => toast.error(e?.message ?? "Could not remove the lesson"),
  });

  if (lessons.error || plan.error) {
    return <p className="text-sm text-muted-foreground">Course book lessons are not switched on yet. Ask the school's admin to apply the latest database update.</p>;
  }
  if (book.isLoading || lessons.isLoading || plan.isLoading) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>;
  if (!all.length) return <p className="text-sm text-muted-foreground">No course book lessons have been added yet.</p>;

  const chosen = plan.data ?? [];
  return (
    <div className="space-y-3">
      {chosen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Not set. Choose the {curriculum === "reach-higher" ? "Reach Higher" : "Oxford Discover"} lesson you taught, and the report starts from its objectives.
        </p>
      ) : (
        <ul className="space-y-2">
          {chosen.map((p) => (
            <li key={p.id} className="rounded-md border p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium flex items-center gap-2"><BookOpen className="h-4 w-4 shrink-0" />Level {p.lesson.level} · {lessonLabel(p.lesson)}</p>
                {canEdit && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Remove" onClick={() => remove.mutate(p.id)} disabled={remove.isPending}><X className="h-4 w-4" /></Button>
                )}
              </div>
              {p.lesson.big_question && <p className="text-xs text-muted-foreground">Big Question: {p.lesson.big_question}</p>}
              <ul className="mt-1 list-disc pl-5 text-sm">{p.lesson.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
              {(p.lesson.grammar || p.lesson.vocabulary.length > 0) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.lesson.grammar ? `Grammar: ${p.lesson.grammar}. ` : ""}{p.lesson.vocabulary.length ? `Words: ${p.lesson.vocabulary.join(", ")}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={level !== null ? String(level) : ""} onValueChange={(v) => { setLevel(Number(v)); setPick(""); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
            <SelectContent>{levels.map((l) => <SelectItem key={l} value={String(l)}>Level {l}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={pick} onValueChange={setPick} disabled={level === null}>
            <SelectTrigger className="min-w-64 flex-1"><SelectValue placeholder="Choose the lesson" /></SelectTrigger>
            <SelectContent>
              {inLevel.map((l) => (
                <SelectItem key={l.id} value={l.id}>{lessonLabel(l)}{suggestion?.id === l.id ? "  ← next" : ""}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => pick && add.mutate(pick)} disabled={!pick || add.isPending}>
            {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}Add
          </Button>
        </div>
      )}
    </div>
  );
}
