/**
 * MyWorkGallery — teacher-approved work belonging to the student.
 *
 * Shows approved `student_work` rows where the student is either the
 * individual owner OR a member of the team the work was attributed to.
 * Photos render from a signed URL (private bucket); link submissions render
 * as an "Open link" tile.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { files as fileStore } from "@/lib/files";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileImage, MessageSquareHeart, Link2, Users, ExternalLink, Share2, Check, Clock } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";

type Share = { id: string; source: string; source_id: string; status: "pending" | "approved" | "declined" };

/** Ask to put one piece of work in the class gallery; a teacher approves first. */
function ShareControl({ source, sourceId, share }: { source: "student_work" | "homework"; sourceId: string; share?: Share }) {
  const qc = useQueryClient();
  const done = () => qc.invalidateQueries({ queryKey: ["my-work"] });
  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("request_work_share", { p_source: source, p_source_id: sourceId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sent to your teacher"); done(); },
    onError: (e: any) => toast.error("Could not share", { description: e.message }),
  });
  const withdraw = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("withdraw_work_share", { p_share_id: share!.id });
      if (error) throw error;
    },
    onSuccess: done,
    onError: (e: any) => toast.error("Could not take it back", { description: e.message }),
  });

  if (share?.status === "approved") {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-hec-caption text-hec-ink-soft"><Check className="h-3.5 w-3.5" />Shared with your class</span>
        <Button size="sm" variant="ghost" disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>Stop sharing</Button>
      </div>
    );
  }
  if (share?.status === "pending") {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-hec-caption text-hec-ink-soft"><Clock className="h-3.5 w-3.5" />Waiting for your teacher</span>
        <Button size="sm" variant="ghost" disabled={withdraw.isPending} onClick={() => withdraw.mutate()}>Cancel</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-2">
      {share?.status === "declined" && <span className="text-hec-caption text-hec-ink-soft">Your teacher chose not to share this</span>}
      <Button size="sm" variant="outline" className="ml-auto" disabled={ask.isPending} onClick={() => ask.mutate()}>
        <Share2 className="mr-1 h-3.5 w-3.5" />Share with my class
      </Button>
    </div>
  );
}

export function MyWorkGallery() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return { work: [], homework: [], shares: [] as Share[] };

      // Individual work (student_id) OR teamwork the student is a member of.
      const { data: work } = await (supabase as any)
        .from("student_work")
        .select("id, class_id, storage_path, external_url, is_teamwork, member_student_ids, teacher_notes, workflow, ocr_text, approved_at, created_at")
        .eq("status", "approved")
        .or(`student_id.eq.${student.id},member_student_ids.cs.{${student.id}}`)
        .order("approved_at", { ascending: false })
        .limit(30);

      const { data: shareRows } = await (supabase as any).from("work_shares").select("id, source, source_id, status");
      const { data: hw } = await (supabase as any)
        .from("homework_submissions")
        .select("id, storage_key, file_name, submitted_at, created_at, homeworks(title, class_id)")
        .eq("student_id", student.id)
        .not("storage_key", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      const homework = await Promise.all(
        (hw || []).map(async (h: any) => ({
          ...h,
          url: /\.(jpe?g|png|webp|gif|heic)$/i.test(h.storage_key)
            ? await fileStore.signedUrl("homework", h.storage_key, 3600) : null,
        })),
      );

      const rows = work || [];
      const withUrls = await Promise.all(
        rows.map(async (w: any) => {
          if (!w.storage_path) return { ...w, url: null };
          const signed = { signedUrl: await fileStore.signedUrl("student-work", w.storage_path, 3600) };
          return { ...w, url: signed?.signedUrl ?? null };
        }),
      );
      return { work: withUrls, homework, shares: (shareRows || []) as Share[] };
    },
  });
  const shareOf = (source: string, id: string) => data?.shares.find((x) => x.source === source && x.source_id === id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" />
      </div>
    );
  }

  if (!data?.work.length && !data?.homework.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <FileImage className="h-10 w-10 mx-auto text-hec-ink-faint" />
        <p className="text-hec-body font-medium text-hec-ink">No work published yet</p>
        <p className="text-hec-small text-hec-ink-soft max-w-sm mx-auto">
          When your teacher shares your classwork — yours or your team's — it appears here with their notes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data!.work.map((w: any) => (
        <Card key={w.id} className="overflow-hidden">
          {w.url ? (
            <a href={w.url} target="_blank" rel="noreferrer">
              <img src={w.url} alt="My work" loading="lazy" className="h-44 w-full object-cover" />
            </a>
          ) : w.external_url ? (
            <a
              href={safeHttpUrl(w.external_url)}
              target="_blank"
              rel="noreferrer"
              className="flex h-44 min-h-hec-target w-full flex-col items-center justify-center gap-2 bg-hec-sunken hover:bg-hec-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
            >
              <Link2 className="h-9 w-9 text-hec-ink-soft" />
              <span className="flex items-center gap-1 text-hec-small font-medium text-hec-brass">
                Open link <ExternalLink className="h-3 w-3" />
              </span>
            </a>
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-hec-sunken">
              <FileImage className="h-8 w-8 text-hec-ink-faint" />
            </div>
          )}
          <CardContent className="space-y-2 p-3 pt-3 sm:p-3 sm:pt-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Badge variant="outline" className="uppercase">{w.workflow}</Badge>
                {w.is_teamwork && (
                  <Badge variant="secondary">
                    <Users className="h-3 w-3" />team
                  </Badge>
                )}
              </div>
              <span className="shrink-0 text-hec-caption tabular-nums text-hec-ink-soft">
                {new Date(w.approved_at || w.created_at).toLocaleDateString()}
              </span>
            </div>
            {w.teacher_notes && (
              <p className="flex gap-1.5 text-hec-small text-hec-ink-soft">
                <MessageSquareHeart className="h-3.5 w-3.5 text-hec-ink-soft shrink-0 mt-0.5" />
                {w.teacher_notes}
              </p>
            )}
            {w.class_id !== null && (w.storage_path || w.external_url) && (
              <ShareControl source="student_work" sourceId={w.id} share={shareOf("student_work", w.id)} />
            )}
          </CardContent>
        </Card>
      ))}
      {data!.homework.map((h: any) => (
        <Card key={h.id} className="overflow-hidden">
          {h.url ? (
            <img src={h.url} alt={h.homeworks?.title ?? "Homework"} loading="lazy" className="h-44 w-full object-cover" />
          ) : (
            <div className="flex h-44 w-full items-center justify-center bg-hec-sunken"><FileImage className="h-8 w-8 text-hec-ink-faint" /></div>
          )}
          <CardContent className="space-y-2 p-3 pt-3 sm:p-3 sm:pt-3">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline">Homework</Badge>
              <span className="text-hec-caption tabular-nums text-hec-ink-soft">
                {new Date(h.submitted_at || h.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-hec-small text-hec-ink">{h.homeworks?.title ?? h.file_name}</p>
            <ShareControl source="homework" sourceId={h.id} share={shareOf("homework", h.id)} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
