/**
 * StudentLessons — the student's full lesson history.
 *
 * Lists every published lesson overview for the classes the student is
 * enrolled in, newest first, each linking to the per-lesson detail page
 * with their personal breakdown. RLS scopes rows to the student's classes.
 *
 * Rendered as a timeline; each lesson opens with Carry (its title travels to
 * the lesson page). Early and young bands get larger targets, short words with
 * the Vietnamese beneath, and Pip on the empty state; teen gets no mascot.
 */
import { useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgeBand } from "@/hooks/useAgeBand";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Arrive } from "@/components/fx/Arrive";
import { carry, useCarryNavigate } from "@/components/fx/Carry";
import { pressable } from "@/components/fx/PaperPress";
import { MascotCompanion } from "@/components/student/MascotCompanion";
import { BiText } from "@/components/student/lessons/BiText";
import { Rise } from "@/components/student/lessons/Rise";
import { studentLessonsCopy } from "@/lib/copy/studentLessons";
import { cn } from "@/lib/utils";
import {
  BookOpenCheck, Loader2, NotebookPen, ChevronRight, BookOpen, CalendarDays, ClipboardList,
} from "lucide-react";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export default function StudentLessons() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const carryNavigate = useCarryNavigate();
  const { band } = useAgeBand();
  const little = band === "early" || band === "young";
  const [carrying, setCarrying] = useState<string | null>(null);

  const { data: lessons = [], isLoading, isError } = useQuery<any[]>({
    queryKey: ["student-lessons-all", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return [];
      const today = new Date().toISOString().slice(0, 10);
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("class_id")
        .eq("student_id", student.id)
        .or(`end_date.is.null,end_date.gte.${today}`);
      const classIds = [...new Set((enrollments || []).map((e: any) => e.class_id))];
      if (!classIds.length) return [];

      const { data } = await (supabase as any)
        .from("lesson_overviews")
        .select("id, title, lesson_date, summary, materials, homework, classes(name)")
        .in("class_id", classIds)
        .order("lesson_date", { ascending: false })
        .limit(60);
      return data || [];
    },
  });

  // Carry: only the pressed lesson's title holds the view-transition name, so one thing travels.
  const openLesson = (id: string) => {
    flushSync(() => setCarrying(id));
    carryNavigate(`/student/lessons/${id}`);
  };

  return (
    <Layout title="My Lessons">
      <Arrive scope="student-lessons" userId={user?.id} className="max-w-3xl mx-auto space-y-5">
        <Rise index={0}>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
              <BookOpenCheck className="h-6 w-6 text-hec-ink-soft" aria-hidden />
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-hec-h1 font-medium text-hec-ink [[data-hec-scale=young]_&]:font-bold">
                <BiText k="lessons.title" />
              </h1>
              <p className="text-hec-small text-hec-ink-soft">
                {little ? <BiText k="lessons.subtitleShort" /> : studentLessonsCopy["lessons.subtitle"].en}
              </p>
            </div>
          </div>
        </Rise>

        <Rise index={1}>
          <button
            type="button"
            onClick={() => navigate("/student/lesson-reports")}
            className={cn(
              "flex min-h-hec-target w-full items-center gap-3 rounded-hec-lg border border-hec-brass/40 bg-hec-surface p-4 text-left shadow-hec-1",
              pressable, FOCUS,
            )}
          >
            <ClipboardList className="h-5 w-5 shrink-0 text-hec-brass" aria-hidden />
            {little ? (
              <span className="min-w-0 flex-1 text-hec-body font-medium text-hec-ink"><BiText k="lessons.reportsShort" /></span>
            ) : (
              <span className="min-w-0 flex-1">
                <span className="block text-hec-body font-medium text-hec-ink">{studentLessonsCopy["lessons.reports"].en}</span>
                <span lang="vi" className="block text-hec-small text-hec-ink-soft">Báo cáo buổi học: hôm nay con học gì</span>
              </span>
            )}
            <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint" aria-hidden />
          </button>
        </Rise>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" aria-label="Loading" /></div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="mx-auto max-w-sm text-hec-body text-hec-ink-soft"><BiText k="lessons.error" /></p>
            </CardContent>
          </Card>
        ) : lessons.length === 0 ? (
          <Rise index={2}>
            <Card>
              <CardContent className="py-14 text-center space-y-3">
                {little ? (
                  <div className="flex justify-center"><MascotCompanion pendingHomework={null} silent /></div>
                ) : band === "teen" ? null : (
                  <BookOpen className="h-10 w-10 mx-auto text-hec-ink-faint" aria-hidden />
                )}
                <p className="text-hec-body font-medium text-hec-ink"><BiText k="lessons.empty" /></p>
                <p className="text-hec-small text-hec-ink-soft max-w-sm mx-auto">
                  {little ? <BiText k="lessons.emptyShort" /> : studentLessonsCopy["lessons.emptyHelp"].en}
                </p>
              </CardContent>
            </Card>
          </Rise>
        ) : (
          <ol className="relative ml-2 space-y-3 border-l border-hec-line pl-5">
            {lessons.map((l, i) => (
              <li key={l.id} className="relative">
                <span aria-hidden className="absolute -left-[26px] top-6 h-2.5 w-2.5 rounded-full border border-hec-brass bg-hec-surface" />
                <Rise index={i + 2}>
                  <button
                    type="button"
                    onClick={() => openLesson(l.id)}
                    className={cn(
                      "min-h-hec-target w-full rounded-hec-lg border border-hec-line bg-hec-surface text-left shadow-hec-1",
                      little ? "p-5" : "p-4",
                      pressable, FOCUS,
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p
                            style={carrying === l.id ? { viewTransitionName: carry(`lesson-${l.id}`) } : undefined}
                            className="min-w-0 break-words text-hec-body font-medium text-hec-ink"
                          >
                            {l.title || "Lesson"}
                          </p>
                          {l.homework && (
                            <Badge variant="warning">
                              {band !== "teen" && <NotebookPen className="h-3 w-3" aria-hidden />}
                              {little ? <BiText k="lessons.homework" /> : "homework"}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 text-hec-caption text-hec-ink-soft">
                          <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                          <span className="min-w-0 break-words">{l.classes?.name} · {l.lesson_date}</span>
                        </p>
                        {l.summary && (
                          <p className="mt-1.5 break-words text-hec-small text-hec-ink-soft">{l.summary}</p>
                        )}
                        {Array.isArray(l.materials) && l.materials.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1.5">
                            <BookOpen className="h-3 w-3 text-hec-ink-soft" aria-hidden />
                            {l.materials.map((m: any, k: number) => (
                              <Badge key={k} variant="secondary" className="max-w-full whitespace-normal break-words font-normal">
                                {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-hec-ink-faint shrink-0" aria-hidden />
                    </div>
                  </button>
                </Rise>
              </li>
            ))}
          </ol>
        )}
      </Arrive>
    </Layout>
  );
}
