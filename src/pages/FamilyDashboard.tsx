/**
 * FamilyDashboard — the parents' home.
 *
 * Family-role users previously had NO landing page at all (Dashboard.tsx
 * redirected every other role and left family on a blank screen). This
 * gives parents a per-child progress overview — journey summary, CEFR
 * level, points, attendance, latest lessons, homework — plus the HEC
 * assistant for questions in their own words (English or Vietnamese).
 *
 * Every query here runs through the parent's own session, so RLS decides
 * what is visible: their children, and only their children (policies from
 * migration 20260730130000).
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { AssistantChat } from "@/components/chat/AssistantChat";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import {
  Sparkles, GraduationCap, Star, CalendarCheck, BookOpen, NotebookPen,
  TrendingUp, Users, MessageCircleQuestion,
} from "lucide-react";

interface ChildSummary {
  id: string;
  full_name: string;
  avatar_url: string | null;
  cefr: string | null;
  journey: string | null;
  total_points: number;
  attendance: { present: number; total: number };
  lessons: Array<{ lesson_date: string; title: string | null; summary: string | null; homework: string | null }>;
}

function useChildren(userId?: string) {
  return useQuery<ChildSummary[]>({
    queryKey: ["family-children", userId],
    enabled: !!userId,
    queryFn: async () => {
      // RLS: a family user's students select returns exactly their children.
      const { data: kids } = await (supabase as any)
        .from("students")
        .select("id, full_name, avatar_url")
        .eq("is_active", true)
        .order("full_name");
      const children = (kids || []) as any[];
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

      return Promise.all(
        children.map(async (kid): Promise<ChildSummary> => {
          const [profile, points, att, enr] = await Promise.all([
            (supabase as any)
              .from("student_learning_profiles")
              .select("summary, cefr_estimate")
              .eq("student_id", kid.id).maybeSingle(),
            (supabase as any)
              .from("student_points")
              .select("total_points").eq("student_id", kid.id).maybeSingle(),
            (supabase as any)
              .from("attendance")
              .select("status").eq("student_id", kid.id).gte("date", since),
            (supabase as any)
              .from("enrollments").select("class_id").eq("student_id", kid.id),
          ]);

          const classIds = [...new Set(((enr.data || []) as any[]).map((r) => r.class_id))];
          let lessons: ChildSummary["lessons"] = [];
          if (classIds.length) {
            const { data: ov } = await (supabase as any)
              .from("lesson_overviews")
              .select("lesson_date, title, summary, homework")
              .in("class_id", classIds)
              .order("lesson_date", { ascending: false })
              .limit(3);
            lessons = ov || [];
          }

          const attRows = (att.data || []) as any[];
          return {
            id: kid.id,
            full_name: kid.full_name,
            avatar_url: kid.avatar_url,
            cefr: profile.data?.cefr_estimate ?? null,
            journey: profile.data?.summary ?? null,
            total_points: points.data?.total_points ?? 0,
            attendance: {
              present: attRows.filter((a) => a.status === "Present" || a.status === "Late").length,
              total: attRows.length,
            },
            lessons,
          };
        }),
      );
    },
  });
}

export default function FamilyDashboard() {
  const { user } = useAuth();
  const { data: children = [], isLoading } = useChildren(user?.id);

  return (
    <Layout title="Family Dashboard">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero */}
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 flex items-center justify-center shadow-md">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black">Your family at Happy English Club</h1>
            <p className="text-xs text-muted-foreground">
              Progress, lessons and homework for your children — and an assistant for any question.
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">
          {/* Children column */}
          <div className="lg:col-span-3 space-y-4">
            {isLoading && (
              <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading your children…</CardContent></Card>
            )}
            {!isLoading && children.length === 0 && (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No students are linked to your family account yet — please contact the school.
                </CardContent>
              </Card>
            )}
            {children.map((kid, i) => (
              <motion.div
                key={kid.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full p-[2px] bg-gradient-to-br from-violet-500 via-blue-400 to-cyan-400">
                        <Avatar className="h-12 w-12 ring-2 ring-background">
                          <AvatarImage src={kid.avatar_url || undefined} alt={kid.full_name} />
                          <AvatarFallback>
                            {kid.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{kid.full_name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {kid.cefr && (
                            <Badge className="bg-violet-500/15 text-violet-600 gap-1">
                              <GraduationCap className="h-3 w-3" />{kid.cefr}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="gap-1">
                            <Star className="h-3 w-3 text-amber-500" />{kid.total_points} pts
                          </Badge>
                          {kid.attendance.total > 0 && (
                            <Badge variant="secondary" className="gap-1">
                              <CalendarCheck className="h-3 w-3 text-emerald-500" />
                              {kid.attendance.present}/{kid.attendance.total} classes (30d)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {kid.journey && (
                      <div className="rounded-xl bg-muted/40 ring-1 ring-border/50 p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 mb-1">
                          <TrendingUp className="h-3 w-3 text-violet-500" />Learning journey
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{kid.journey}</p>
                      </div>
                    )}
                    {kid.lessons.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-blue-500" />Recent lessons
                        </p>
                        {kid.lessons.map((l, k) => (
                          <div key={k} className="rounded-lg border px-3 py-2">
                            <p className="text-xs font-semibold">
                              {l.title || "Lesson"}{" "}
                              <span className="font-normal text-muted-foreground">· {l.lesson_date}</span>
                            </p>
                            {l.summary && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{l.summary}</p>
                            )}
                            {l.homework && (
                              <p className="text-[11px] mt-1 flex items-start gap-1">
                                <NotebookPen className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">Homework:</span> {l.homework}</span>
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* Assistant column */}
          <div className="lg:col-span-2 lg:sticky lg:top-24">
            <Card className="flex flex-col h-[min(72vh,640px)]">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  Ask about your child
                </CardTitle>
                <CardDescription className="text-xs flex items-center gap-1">
                  <MessageCircleQuestion className="h-3 w-3" />
                  English or Tiếng Việt — it only sees your own children's records.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-0 pt-0">
                <AssistantChat className="h-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
