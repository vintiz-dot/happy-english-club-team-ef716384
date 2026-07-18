/**
 * LessonOverviewsCard — recent lessons pushed to the student.
 *
 * After each class transcript is analyzed, the student-safe slice is
 * published to `lesson_overviews` (summary, materials used with pages,
 * assigned homework). This card shows the student the latest lessons for
 * every class they're enrolled in — the transcript itself and other
 * students' analyses are never exposed.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BookOpenCheck, BookOpen, NotebookPen, ChevronDown } from "lucide-react";

export function LessonOverviewsCard({ studentId }: { studentId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: lessons = [] } = useQuery<any[]>({
    queryKey: ["lesson-overviews", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: enrollments } = await (supabase as any)
        .from("enrollments")
        .select("class_id")
        .eq("student_id", studentId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      const classIds = [...new Set((enrollments || []).map((e: any) => e.class_id))];
      if (!classIds.length) return [];

      const { data } = await (supabase as any)
        .from("lesson_overviews")
        .select("*, classes(name)")
        .in("class_id", classIds)
        .order("lesson_date", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  if (!lessons.length) return null;

  return (
    <Card className="glass-lg border-0 shadow-xl rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpenCheck className="h-4 w-4 text-cyan-500" />
          Your recent lessons
        </CardTitle>
        <CardDescription className="text-xs">
          What we covered, the materials we used, and your homework.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {lessons.map((l) => {
          const isOpen = expanded === l.id;
          return (
            <button
              key={l.id}
              onClick={() => setExpanded(isOpen ? null : l.id)}
              className="w-full text-left rounded-xl border bg-card/60 p-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {l.title || "Lesson"}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {l.classes?.name} · {l.lesson_date}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {l.homework && (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                      <NotebookPen className="h-3 w-3" />homework
                    </Badge>
                  )}
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </div>
              </div>

              {isOpen && (
                <div className="mt-2 space-y-2 border-t pt-2">
                  {l.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{l.summary}</p>
                  )}
                  {Array.isArray(l.materials) && l.materials.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                      {l.materials.map((m: any, i: number) => (
                        <Badge key={i} variant="secondary" className="font-normal text-[11px]">
                          {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {l.homework && (
                    <p className="text-xs flex items-start gap-1.5 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25 px-2.5 py-2">
                      <NotebookPen className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-foreground">{l.homework}</span>
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
