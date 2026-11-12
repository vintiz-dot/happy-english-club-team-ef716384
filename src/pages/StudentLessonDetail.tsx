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
import { safeHttpUrl } from "@/lib/safeUrl";
import {
  ArrowLeft, Loader2, BookOpen, NotebookPen, Sparkles, MessageSquareText,
  HelpCircle, AlertTriangle, TrendingUp, Coins, FileImage, Link2, Users,
  ExternalLink, Compass, Star,
} from "lucide-react";

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
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" /></div>
      </Layout>
    );
  }

  const overview = data?.overview;
  if (!overview) {
    return (
      <Layout title="Lesson">
        <div className="max-w-3xl mx-auto p-4 text-center py-16 space-y-3">
          <p className="text-hec-body text-hec-ink-soft">This lesson isn't available.</p>
          <Button variant="outline" onClick={() => navigate("/student/lessons")}>Back to lessons</Button>
        </div>
      </Layout>
    );
  }

  const m = data?.metric;
  const totalPoints = (data?.points || []).reduce((s: number, p: any) => s + (p.points || 0), 0);

  return (
    <Layout title="Lesson">
      <div className="max-w-3xl mx-auto space-y-4">
        <Button variant="quiet" size="sm" className="gap-1.5 -ml-2" onClick={() => navigate("/student/lessons")}>
          <ArrowLeft className="h-4 w-4" />All lessons
        </Button>

        {/* Hero */}
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6">
          <p className="break-words text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
            {overview.classes?.name} · {overview.lesson_date}
          </p>
          <h1 className="mt-1 break-words font-display text-hec-h1 font-medium text-hec-ink">{overview.title || "Lesson"}</h1>
          {m?.cefr_estimate && (
            <Badge variant="brass" className="mt-2">Your level this lesson: {m.cefr_estimate}</Badge>
          )}
        </div>

        {/* Lesson summary + materials + homework */}
        {(overview.summary || (overview.materials?.length ?? 0) > 0 || overview.homework) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-hec-ink-soft" />What we did</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {overview.summary && <p className="text-hec-body text-hec-ink-soft">{overview.summary}</p>}
              {Array.isArray(overview.materials) && overview.materials.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-hec-ink-soft" />
                  {overview.materials.map((mat: any, i: number) => (
                    <Badge key={i} variant="secondary" className="font-normal">
                      {mat.name}{mat.pages ? ` · p.${mat.pages}` : ""}
                    </Badge>
                  ))}
                </div>
              )}
              {overview.homework && (
                <p className="flex items-start gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint px-3 py-2 text-hec-small">
                  <NotebookPen className="h-4 w-4 text-hec-warn shrink-0 mt-0.5" />
                  <span><span className="font-medium text-hec-ink">Homework:</span> <span className="text-hec-ink-soft">{overview.homework}</span></span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Resource photos from the lesson */}
        {(data?.resources?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-hec-ink-soft" />What we used in class
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
                    className="block overflow-hidden rounded-hec-md border border-hec-line shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                  >
                    {r.url ? (
                      <img src={r.url} alt={r.caption || "lesson resource"} loading="lazy" className="h-28 w-full object-cover" />
                    ) : (
                      <div className="h-28 w-full bg-hec-sunken" />
                    )}
                    {r.caption && (
                      <p className="p-2 text-hec-caption text-hec-ink-soft break-words">{r.caption}</p>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-hec-ink-soft" />How you did</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat icon={MessageSquareText} tone="text-hec-ink-soft" value={m.utterance_count ?? 0} label="times you spoke" />
                <Stat icon={HelpCircle} tone="text-hec-ink-soft" value={m.questions_asked ?? 0} label="questions asked" />
                <Stat icon={TrendingUp} tone="text-hec-ink-soft" value={`${Math.round((m.participation_share || 0) * 100)}%`} label="of class talk" />
              </div>
              {m.contribution && (
                <p className="text-hec-body text-hec-ink-soft">{m.contribution}</p>
              )}
              {m.teacher_feedback && (
                <div className="rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-3">
                  <p className="flex items-center gap-1 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                    <Sparkles className="h-3 w-3" />Your teacher says
                  </p>
                  <p className="mt-1 text-hec-body text-hec-ink">{m.teacher_feedback}</p>
                </div>
              )}
              {m.recommendation && (
                <p className="flex items-start gap-2 text-hec-body">
                  <Compass className="h-4 w-4 text-hec-leaf shrink-0 mt-1" />
                  <span><span className="font-medium text-hec-leaf">Try next:</span>{" "}
                  <span className="text-hec-ink-soft">{m.recommendation}</span></span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Points earned this lesson */}
        {(data?.points?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Coins className="h-4 w-4 text-hec-brass" />Points this lesson
                <Badge variant={totalPoints >= 0 ? "success" : "destructive"} className="tabular-nums">
                  {totalPoints > 0 ? `+${totalPoints}` : totalPoints}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {data!.points.map((p: any, i: number) => (
                <div key={i} className="flex items-start gap-2 text-hec-body">
                  <Star className={`mt-1 h-3.5 w-3.5 shrink-0 ${p.points > 0 ? "text-hec-brass fill-current" : "text-hec-danger"}`} />
                  <span className="w-10 shrink-0 font-medium tabular-nums text-hec-ink">{p.points > 0 ? `+${p.points}` : p.points}</span>
                  <span className="min-w-0 break-words text-hec-ink-soft">{p.notes || p.type}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Things to practice (your flagged points) */}
        {(data?.errors?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-hec-warn" />Practice these</CardTitle>
              <CardDescription>Small fixes from this lesson — they're also on your Fix-It flashcards.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data!.errors.map((e: any, i: number) => (
                <div key={i} className="rounded-hec-md border border-hec-line p-3">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="outline" className="capitalize">{e.error_type}</Badge>
                    {e.cefr_topic && <Badge variant="outline">{e.cefr_topic}</Badge>}
                  </div>
                  <p className="text-hec-small text-hec-danger line-through">{e.error_text}</p>
                  <p className="text-hec-small text-hec-leaf">{e.corrected_text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Work artifacts from this lesson */}
        {(data?.work?.length ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileImage className="h-4 w-4 text-hec-ink-soft" />Your work from this lesson</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {data!.work.map((w: any) => (
                  <div key={w.id} className="overflow-hidden rounded-hec-md border border-hec-line">
                    {w.url ? (
                      <a href={w.url} target="_blank" rel="noreferrer"><img src={w.url} alt="work" loading="lazy" className="h-28 w-full object-cover" /></a>
                    ) : w.external_url ? (
                      <a href={safeHttpUrl(w.external_url)} target="_blank" rel="noreferrer" className="flex h-28 min-h-hec-target w-full flex-col items-center justify-center gap-1 bg-hec-sunken hover:bg-hec-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring">
                        <Link2 className="h-6 w-6 text-hec-ink-soft" />
                        <span className="flex items-center gap-0.5 text-hec-caption font-medium text-hec-brass">Open <ExternalLink className="h-3 w-3" /></span>
                      </a>
                    ) : (
                      <div className="flex h-28 w-full items-center justify-center bg-hec-sunken"><FileImage className="h-6 w-6 text-hec-ink-faint" /></div>
                    )}
                    <div className="p-2 space-y-1">
                      {w.is_teamwork && (
                        <Badge variant="secondary"><Users className="h-3 w-3" />team</Badge>
                      )}
                      {w.teacher_notes && <p className="text-hec-caption text-hec-ink-soft line-clamp-3">{w.teacher_notes}</p>}
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
    <div className="rounded-hec-md bg-hec-sunken p-3">
      <Icon className={`h-4 w-4 mx-auto ${tone}`} />
      <p className="mt-0.5 font-sans text-hec-h3 font-medium tabular-nums text-hec-ink">{value}</p>
      <p className="text-hec-caption text-hec-ink-soft">{label}</p>
    </div>
  );
}
