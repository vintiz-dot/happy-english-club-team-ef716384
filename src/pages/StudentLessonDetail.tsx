/**
 * StudentLessonDetail — everything about THIS student for one lesson.
 *
 * Keyed by a lesson_overviews id. Aggregates the student's own data for
 * that lesson: the shared overview (summary, materials, homework), their
 * personal participation from the transcript (contribution, teacher
 * feedback, next step, CEFR, talk share, questions), the grammar/vocab
 * points flagged for them, the points they earned that day, and any work
 * artifacts (theirs or their team's) from that lesson. RLS guarantees a
 * student only ever sees their own rows.
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Loader2, BookOpen, NotebookPen, Sparkles, MessageSquareText,
  HelpCircle, AlertTriangle, TrendingUp, Coins, FileImage, Link2, Users,
  ExternalLink, Compass, Star,
} from "lucide-react";

const CEFR_COLORS: Record<string, string> = {
  "Pre-A1": "bg-slate-500/15 text-slate-600 border-slate-500/30",
  A1: "bg-sky-500/15 text-sky-600 border-sky-500/30",
  "A1+": "bg-sky-500/15 text-sky-700 border-sky-500/30",
  A2: "bg-teal-500/15 text-teal-600 border-teal-500/30",
  "A2+": "bg-teal-500/15 text-teal-700 border-teal-500/30",
  B1: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  "B1+": "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  B2: "bg-violet-500/15 text-violet-600 border-violet-500/30",
};

export default function StudentLessonDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["student-lesson-detail", id, user?.id],
    enabled: !!id && !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id, full_name").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return null;

      const { data: overview } = await (supabase as any)
        .from("lesson_overviews")
        .select("*, classes(name)")
        .eq("id", id)
        .maybeSingle();
      if (!overview) return { student, overview: null };

      const [metricsRes, errorsRes, pointsRes, workRes, resourcesRes] = await Promise.all([
        overview.transcript_id
          ? (supabase as any)
              .from("transcript_speaker_metrics")
              .select("*")
              .eq("transcript_id", overview.transcript_id)
              .eq("student_id", student.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        overview.transcript_id
          ? (supabase as any)
              .from("student_error_log")
              .select("error_text, corrected_text, error_type, cefr_topic")
              .eq("source", "transcript")
              .eq("source_id", overview.transcript_id)
              .eq("student_id", student.id)
          : Promise.resolve({ data: [] }),
        (supabase as any)
          .from("point_transactions")
          .select("points, type, notes")
          .eq("student_id", student.id)
          .eq("class_id", overview.class_id)
          .eq("date", overview.lesson_date),
        (supabase as any)
          .from("student_work")
          .select("id, storage_path, external_url, is_teamwork, teacher_notes, workflow, approved_at, created_at")
          .eq("status", "approved")
          .eq("class_id", overview.class_id)
          .or(`student_id.eq.${student.id},member_student_ids.cs.{${student.id}}`)
          .gte("created_at", `${overview.lesson_date}T00:00:00`)
          .lte("created_at", `${overview.lesson_date}T23:59:59`),
        overview.transcript_id
          ? (supabase as any)
              .from("lesson_resources")
              .select("id, storage_path, caption")
              .eq("transcript_id", overview.transcript_id)
              .order("created_at", { ascending: true })
          : Promise.resolve({ data: [] }),
      ]);

      // Signed URLs for the resource images the teacher attached.
      const resources = await Promise.all(
        (((resourcesRes as any).data as any[]) || []).map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("lesson-resources").createSignedUrl(r.storage_path, 3600);
          return { ...r, url: signed?.signedUrl ?? null };
        }),
      );

      // Signed URLs for any photo artifacts.
      const workRows = (workRes.data as any[]) || [];
      const work = await Promise.all(
        workRows.map(async (w) => {
          if (!w.storage_path) return { ...w, url: null };
          const { data: signed } = await supabase.storage
            .from("student-work").createSignedUrl(w.storage_path, 3600);
          return { ...w, url: signed?.signedUrl ?? null };
        }),
      );

      return {
        student,
        overview,
        metric: metricsRes.data,
        errors: (errorsRes.data as any[]) || [],
        points: (pointsRes.data as any[]) || [],
        work,
        resources,
      };
    },
  });

  if (isLoading) {
    return (
      <Layout title="Lesson">
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </Layout>
    );
  }

  const overview = data?.overview;
  if (!overview) {
    return (
      <Layout title="Lesson">
        <div className="max-w-3xl mx-auto p-4 text-center py-16 space-y-3">
          <p className="text-muted-foreground">This lesson isn't available.</p>
          <Button variant="outline" onClick={() => navigate("/student/lessons")}>Back to lessons</Button>
        </div>
      </Layout>
    );
  }

  const m = data?.metric;
  const totalPoints = (data?.points || []).reduce((s: number, p: any) => s + (p.points || 0), 0);

  return (
    <Layout title="Lesson">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/student/lessons")}>
          <ArrowLeft className="h-4 w-4" />All lessons
        </Button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-aurora hero-sheen p-5 sm:p-7 text-white shadow-q3">
          <div className="nova-grid-light absolute inset-0 pointer-events-none" />
          <div className="relative">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70">
              {overview.classes?.name} · {overview.lesson_date}
            </p>
            <h1 className="type-h1 text-white mt-1 drop-shadow-sm">{overview.title || "Lesson"}</h1>
            {m?.cefr_estimate && (
              <Badge className="mt-2 bg-white/20 text-white border-white/30">Your level this lesson: {m.cefr_estimate}</Badge>
            )}
          </div>
        </div>

        {/* Lesson summary + materials + homework */}
        {(overview.summary || (overview.materials?.length ?? 0) > 0 || overview.homework) && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" />What we did</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {overview.summary && <p className="text-sm leading-relaxed text-muted-foreground">{overview.summary}</p>}
              {Array.isArray(overview.materials) && overview.materials.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                  {overview.materials.map((mat: any, i: number) => (
                    <Badge key={i} variant="secondary" className="font-normal text-xs">
                      {mat.name}{mat.pages ? ` · p.${mat.pages}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
              {overview.homework && (
                <p className="text-xs flex items-start gap-1.5 rounded-lg bg-amber-500/10 ring-1 ring-amber-500/25 px-2.5 py-2">
                  <NotebookPen className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span><span className="font-semibold">Homework:</span> <span className="text-muted-foreground">{overview.homework}</span></span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resource photos from the lesson */}
        {(data?.resources?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-pink-500" />What we used in class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data!.resources.map((r: any) => (
                  <a
                    key={r.id}
                    href={r.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border overflow-hidden block hover:shadow-md transition-shadow"
                  >
                    {r.url ? (
                      <img src={r.url} alt={r.caption || "lesson resource"} loading="lazy" className="h-28 w-full object-cover" />
                    ) : (
                      <div className="h-28 w-full bg-muted" />
                    )}
                    {r.caption && (
                      <p className="text-[11px] text-muted-foreground p-1.5 truncate">{r.caption}</p>
                    )}
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Your participation */}
        {m && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-cyan-500" />How you did</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={MessageSquareText} tone="text-blue-500" value={m.utterance_count ?? 0} label="times you spoke" />
                <Stat icon={HelpCircle} tone="text-violet-500" value={m.questions_asked ?? 0} label="questions asked" />
                <Stat icon={TrendingUp} tone="text-emerald-500" value={`${Math.round((m.participation_share || 0) * 100)}%`} label="of class talk" />
              </div>
              {m.contribution && (
                <p className="text-sm text-muted-foreground">{m.contribution}</p>
              )}
              {m.teacher_feedback && (
                <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 ring-1 ring-blue-500/20 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />Your teacher says
                  </p>
                  <p className="text-sm text-foreground mt-0.5">{m.teacher_feedback}</p>
                </div>
              )}
              {m.recommendation && (
                <p className="text-sm flex items-start gap-1.5">
                  <Compass className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span><span className="font-semibold text-emerald-600 dark:text-emerald-400">Try next:</span>{" "}
                  <span className="text-muted-foreground">{m.recommendation}</span></span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Points earned this lesson */}
        {(data?.points?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />Points this lesson
                <Badge className={totalPoints >= 0 ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" : "bg-rose-500/15 text-rose-600 border-rose-500/30"}>
                  {totalPoints > 0 ? `+${totalPoints}` : totalPoints}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data!.points.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Star className={`h-3.5 w-3.5 shrink-0 ${p.points > 0 ? "text-amber-400 fill-amber-400" : "text-rose-400"}`} />
                  <span className="font-semibold tabular-nums w-8">{p.points > 0 ? `+${p.points}` : p.points}</span>
                  <span className="text-muted-foreground truncate">{p.notes || p.type}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Things to practice (your flagged points) */}
        {(data?.errors?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-orange-500" />Practice these</CardTitle>
              <CardDescription className="text-xs">Small fixes from this lesson — they're also on your Fix-It flashcards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data!.errors.map((e: any, i: number) => (
                <div key={i} className="rounded-xl border p-2.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="text-[10px] capitalize">{e.error_type}</Badge>
                    {e.cefr_topic && <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/40">{e.cefr_topic}</Badge>}
                  </div>
                  <p className="text-xs text-rose-500/90 line-through">{e.error_text}</p>
                  <p className="text-xs text-emerald-600">{e.corrected_text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Work artifacts from this lesson */}
        {(data?.work?.length ?? 0) > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><FileImage className="h-4 w-4 text-pink-500" />Your work from this lesson</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data!.work.map((w: any) => (
                  <div key={w.id} className="rounded-xl border overflow-hidden">
                    {w.url ? (
                      <a href={w.url} target="_blank" rel="noreferrer"><img src={w.url} alt="work" loading="lazy" className="h-28 w-full object-cover" /></a>
                    ) : w.external_url ? (
                      <a href={w.external_url} target="_blank" rel="noreferrer" className="h-28 w-full flex flex-col items-center justify-center gap-1 bg-violet-500/5 hover:bg-violet-500/10">
                        <Link2 className="h-6 w-6 text-violet-500" />
                        <span className="text-[10px] font-semibold text-violet-600 flex items-center gap-0.5">Open <ExternalLink className="h-3 w-3" /></span>
                      </a>
                    ) : (
                      <div className="h-28 w-full bg-muted flex items-center justify-center"><FileImage className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                    <div className="p-2 space-y-1">
                      {w.is_teamwork && (
                        <Badge className="bg-cyan-500/15 text-cyan-700 border-cyan-500/30 gap-1 text-[9px]"><Users className="h-2.5 w-2.5" />team</Badge>
                      )}
                      {w.teacher_notes && <p className="text-[11px] text-muted-foreground line-clamp-3">{w.teacher_notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

function Stat({ icon: Icon, tone, value, label }: { icon: any; tone: string; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5">
      <Icon className={`h-4 w-4 mx-auto ${tone}`} />
      <p className="text-lg font-bold mt-0.5 tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
    </div>
  );
}
