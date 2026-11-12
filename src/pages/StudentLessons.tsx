/**
 * StudentLessons — the student's full lesson history.
 *
 * Lists every published lesson overview for the classes the student is
 * enrolled in, newest first, each linking to the per-lesson detail page
 * with their personal breakdown. RLS scopes rows to the student's classes.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpenCheck, Loader2, NotebookPen, ChevronRight, BookOpen, CalendarDays,
} from "lucide-react";

export default function StudentLessons() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: lessons = [], isLoading } = useQuery<any[]>({
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

  return (
    <Layout title="My Lessons">
      <div className="max-w-3xl mx-auto p-4 md:p-6 pb-24 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <BookOpenCheck className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">My Lessons</h1>
            <p className="text-hec-small text-hec-ink-soft">Every lesson — what we covered, your feedback, and your work.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" /></div>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center space-y-2">
              <BookOpen className="h-10 w-10 mx-auto text-hec-ink-faint" />
              <p className="text-hec-body font-medium text-hec-ink">No lessons yet</p>
              <p className="text-hec-small text-hec-ink-soft max-w-sm mx-auto">
                After each class, your teacher's lesson summary and your personal breakdown will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {lessons.map((l) => (
              <button
                key={l.id}
                onClick={() => navigate(`/student/lessons/${l.id}`)}
                className="min-h-hec-target w-full rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="min-w-0 break-words text-hec-body font-medium text-hec-ink">{l.title || "Lesson"}</p>
                      {l.homework && (
                        <Badge variant="warning">
                          <NotebookPen className="h-3 w-3" />homework
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-hec-caption text-hec-ink-soft">
                      <CalendarDays className="h-3 w-3" />{l.classes?.name} · {l.lesson_date}
                    </p>
                    {l.summary && (
                      <p className="mt-1.5 text-hec-small text-hec-ink-soft line-clamp-2">{l.summary}</p>
                    )}
                    {Array.isArray(l.materials) && l.materials.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <BookOpen className="h-3 w-3 text-hec-ink-soft" />
                        {l.materials.slice(0, 3).map((m: any, i: number) => (
                          <Badge key={i} variant="secondary" className="font-normal">
                            {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-hec-ink-faint shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
