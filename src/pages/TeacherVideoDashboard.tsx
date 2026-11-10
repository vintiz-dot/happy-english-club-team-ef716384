/**
 * Video homework progress: every student's videos with the AI draft score
 * and the teacher's final grade, plus the drafts waiting for review.
 * Row policies keep it to classes the viewer teaches (admins see all).
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link2, Loader2, Video } from "lucide-react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { videoDb } from "@/lib/video/recorder";
import { VideoReviewQueue, VideoReviewDialog } from "@/components/video-homework/VideoReviewQueue";

interface Row {
  id: string; status: string; submitted_at: string; student_id: string;
  students: { full_name: string } | null; homeworks: { title: string } | null; classes: { name: string } | null;
  video_analyses: { overall_score: number | null; final_score: number | null; final_grade: string | null } | { overall_score: number | null; final_score: number | null; final_grade: string | null }[] | null;
}

const one = <T,>(x: T | T[] | null): T | null => (Array.isArray(x) ? x[0] ?? null : x);

export default function TeacherVideoDashboard() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["video-dashboard"],
    queryFn: async () => {
      const { data, error } = await videoDb
        .from("video_submissions")
        .select("id, status, submitted_at, student_id, students(full_name), homeworks(title), classes(name), video_analyses(overall_score, final_score, final_grade)")
        .order("submitted_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const students = useMemo(() => {
    const map = new Map<string, { id: string; name: string; className: string; rows: Row[] }>();
    for (const r of data) {
      const s = map.get(r.student_id) ?? { id: r.student_id, name: r.students?.full_name ?? "—", className: r.classes?.name ?? "", rows: [] };
      s.rows.push(r);
      map.set(r.student_id, s);
    }
    const q = search.trim().toLowerCase();
    return [...map.values()]
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.className.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, search]);

  const shareLink = async (studentId: string, name: string) => {
    setLinking(studentId);
    try {
      const { data: existing } = await (supabase as any)
        .from("video_parent_links").select("token").eq("student_id", studentId).is("revoked_at", null).limit(1).maybeSingle();
      let token = existing?.token as string | undefined;
      if (!token) {
        const { data: auth } = await supabase.auth.getUser();
        const { data: created, error } = await (supabase as any)
          .from("video_parent_links").insert({ student_id: studentId, created_by: auth.user?.id }).select("token").single();
        if (error) throw error;
        token = created.token;
      }
      const url = `${window.location.origin}/watch/${token}`;
      await navigator.clipboard.writeText(url).catch(() => {});
      toast({ title: `Parent link for ${name} copied`, description: url });
    } catch (e: any) {
      toast({ title: "Could not make the link", description: e?.message, variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video className="h-6 w-6" /> Video homework progress</h1>
          <p className="text-muted-foreground text-sm">AI draft scores, approved grades, and drafts waiting for you.</p>
        </div>

        <VideoReviewQueue />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Students</CardTitle>
            <CardDescription>"AI" is the draft score; "Final" is what you approved. Parent link opens their child's approved videos without signing in.</CardDescription>
            <Input placeholder="Search student or class" value={search} onChange={(e) => setSearch(e.target.value)} className="mt-2 max-w-sm" />
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
            {!isLoading && students.length === 0 && <p className="text-sm text-muted-foreground">No video homework yet.</p>}
            {students.map((s) => {
              const approved = s.rows.filter((r) => r.status === "approved");
              const finals = approved.map((r) => one(r.video_analyses)?.final_score).filter((n): n is number => typeof n === "number");
              const avg = finals.length ? Math.round(finals.reduce((a, b) => a + b, 0) / finals.length) : null;
              const pending = s.rows.filter((r) => r.status === "ready_for_review").length;
              return (
                <div key={s.id} className="rounded-xl border p-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{s.name}</p>
                    {s.className && <span className="text-xs text-muted-foreground">{s.className}</span>}
                    <Badge variant="secondary">{approved.length}/{s.rows.length} approved</Badge>
                    {avg !== null && <Badge>Avg {avg}</Badge>}
                    {pending > 0 && <Badge variant="outline">{pending} draft{pending > 1 ? "s" : ""} to review</Badge>}
                    <Button size="sm" variant="outline" className="ml-auto gap-1" disabled={linking === s.id} onClick={() => shareLink(s.id, s.name)}>
                      {linking === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />} Parent link
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {s.rows.map((r) => {
                      const a = one(r.video_analyses);
                      return (
                        <button key={r.id} type="button" onClick={() => setOpen(r.id)}
                          className="w-full flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted/50">
                          <span className="min-w-0 flex-1 truncate">{r.homeworks?.title ?? "Video"}</span>
                          <span className="text-xs text-muted-foreground">AI {a?.overall_score ?? "–"}</span>
                          <span className="text-xs">Final {a?.final_score ?? "–"}{a?.final_grade ? ` · ${a.final_grade}` : ""}</span>
                          <Badge variant={r.status === "approved" ? "default" : "outline"} className="text-[10px]">{r.status.replace(/_/g, " ")}</Badge>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
        <VideoReviewDialog id={open} onClose={() => setOpen(null)} />
      </div>
    </Layout>
  );
}
