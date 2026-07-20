/**
 * MyWorkGallery — teacher-approved work belonging to the student.
 *
 * Shows approved `student_work` rows where the student is either the
 * individual owner OR a member of the team the work was attributed to.
 * Photos render from a signed URL (private bucket); link submissions render
 * as an "Open link" tile.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileImage, MessageSquareHeart, Link2, Users, ExternalLink } from "lucide-react";

export function MyWorkGallery() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return [];

      // Individual work (student_id) OR teamwork the student is a member of.
      const { data: work } = await (supabase as any)
        .from("student_work")
        .select("id, storage_path, external_url, is_teamwork, member_student_ids, teacher_notes, workflow, ocr_text, approved_at, created_at")
        .eq("status", "approved")
        .or(`student_id.eq.${student.id},member_student_ids.cs.{${student.id}}`)
        .order("approved_at", { ascending: false })
        .limit(30);

      const rows = work || [];
      const withUrls = await Promise.all(
        rows.map(async (w: any) => {
          if (!w.storage_path) return { ...w, url: null };
          const { data: signed } = await supabase.storage
            .from("student-work")
            .createSignedUrl(w.storage_path, 3600);
          return { ...w, url: signed?.signedUrl ?? null };
        }),
      );
      return withUrls;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <FileImage className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm font-semibold">No work published yet</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          When your teacher shares your classwork — yours or your team's — it appears here with their notes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((w: any) => (
        <Card key={w.id} className="overflow-hidden rounded-2xl">
          {w.url ? (
            <a href={w.url} target="_blank" rel="noreferrer">
              <img src={w.url} alt="My work" loading="lazy" className="h-44 w-full object-cover" />
            </a>
          ) : w.external_url ? (
            <a
              href={w.external_url}
              target="_blank"
              rel="noreferrer"
              className="h-44 w-full bg-gradient-to-br from-violet-500/10 to-indigo-500/5 flex flex-col items-center justify-center gap-2 hover:from-violet-500/15"
            >
              <Link2 className="h-9 w-9 text-violet-500" />
              <span className="text-xs font-semibold text-violet-600 flex items-center gap-1">
                Open link <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ) : (
            <div className="h-44 w-full bg-muted flex items-center justify-center">
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="text-[10px] uppercase">{w.workflow}</Badge>
                {w.is_teamwork && (
                  <Badge className="bg-cyan-500/15 text-cyan-700 border-cyan-500/30 gap-1 text-[10px]">
                    <Users className="h-3 w-3" />team
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">
                {new Date(w.approved_at || w.created_at).toLocaleDateString()}
              </span>
            </div>
            {w.teacher_notes && (
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <MessageSquareHeart className="h-3.5 w-3.5 text-pink-500 shrink-0 mt-0.5" />
                {w.teacher_notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
