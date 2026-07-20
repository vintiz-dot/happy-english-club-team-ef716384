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
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
            <BookOpenCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Lessons</h1>
            <p className="text-sm text-muted-foreground">Every lesson — what we covered, your feedback, and your work.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : lessons.length === 0 ? (
          <Card>
            <CardContent className="py-14 text-center space-y-2">
              <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-semibold">No lessons yet</p>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
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
                className="w-full text-left rounded-2xl border bg-card p-4 transition-all hover:shadow-md hover:border-cyan-500/40 lift"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold truncate">{l.title || "Lesson"}</p>
                      {l.homework && (
                        <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                          <NotebookPen className="h-3 w-3" />homework
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" />{l.classes?.name} · {l.lesson_date}
                    </p>
                    {l.summary && (
                      <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{l.summary}</p>
                    )}
                    {Array.isArray(l.materials) && l.materials.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-1.5">
                        <BookOpen className="h-3 w-3 text-blue-500" />
                        {l.materials.slice(0, 3).map((m: any, i: number) => (
                          <Badge key={i} variant="secondary" className="font-normal text-[10px]">
                            {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
