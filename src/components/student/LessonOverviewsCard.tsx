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
import dayjs from "dayjs";
import { BookOpenCheck, BookOpen, NotebookPen, ChevronDown } from "lucide-react";
import { CARD_TITLE, FOCUS } from "@/components/student/nova/ivory";

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
    <Card className="rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
      <CardHeader className="pb-2">
        <CardTitle className={cn(CARD_TITLE, "flex items-center gap-2")}>
          <BookOpenCheck className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
          Your recent lessons
        </CardTitle>
        <CardDescription className="text-hec-small text-hec-ink-soft">
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
              aria-expanded={isOpen}
              className={cn("w-full min-h-hec-target rounded-hec-md border border-hec-line bg-hec-paper p-3 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken", FOCUS)}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-hec-ink">{l.title || "Lesson"}</p>
                  <p className="text-hec-small text-hec-ink-soft">
                    {[l.classes?.name, l.lesson_date && dayjs(l.lesson_date).format("D MMM YYYY")].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {l.homework && (
                    <Badge className="gap-1 border-hec-line bg-hec-sunken text-hec-caption font-medium text-hec-ink-soft shadow-none hover:bg-hec-sunken">
                      <NotebookPen className="h-3 w-3" />homework
                    </Badge>
                  )}
                  <ChevronDown className={cn("h-5 w-5 text-hec-ink-soft transition-transform duration-hec-1 ease-hec", isOpen && "rotate-180")} aria-hidden />
                </div>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-hec-line pt-3">
                  {l.summary && (
                    <p className="text-hec-small text-hec-ink-soft">{l.summary}</p>
                  )}
                  {Array.isArray(l.materials) && l.materials.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-hec-ink-soft" aria-hidden />
                      {l.materials.map((m: any, i: number) => (
                        <Badge key={i} variant="secondary" className="border-hec-line bg-hec-sunken text-hec-caption font-normal text-hec-ink shadow-none">
                          {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {l.homework && (
                    <p className="flex items-start gap-2 rounded-hec-sm bg-hec-sunken px-3 py-2 text-hec-small">
                      <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                      <span className="text-hec-ink">{l.homework}</span>
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
