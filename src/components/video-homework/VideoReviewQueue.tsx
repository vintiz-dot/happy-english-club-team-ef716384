/**
 * Videos waiting for this teacher, across their classes. Row policies keep
 * it to classes they teach. One tap opens the review.
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { dayjs } from "@/lib/date";
import { videoDb } from "@/lib/video/recorder";
import { VideoReviewPanel } from "./VideoReviewPanel";

export function useVideoQueue(filter?: { homeworkId?: string }) {
  return useQuery({
    queryKey: ["video-review-queue", filter?.homeworkId ?? "all"],
    queryFn: async () => {
      let q = videoDb
        .from("video_submissions")
        .select("id, status, processing_stage, submitted_at, attempt, students(full_name), homeworks(title), video_analyses(overall_score, teacher_attention)")
        .order("submitted_at", { ascending: true });
      q = filter?.homeworkId ? q.eq("homework_id", filter.homeworkId) : q.in("status", ["uploaded", "processing", "ready_for_review", "failed"]);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
    refetchInterval: 30_000,
    retry: false,
  });
}

export function VideoRow({ v, onOpen }: { v: any; onOpen: () => void }) {
  const analysis = Array.isArray(v.video_analyses) ? v.video_analyses[0] : v.video_analyses;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 rounded-xl border p-3 hover:bg-muted/50 transition-colors"
    >
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">{v.students?.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">
          {v.homeworks?.title} · {dayjs(v.submitted_at).format("MMM D, h:mm A")}
          {v.attempt > 1 ? ` · take ${v.attempt}` : ""}
        </p>
      </div>
      {analysis?.teacher_attention && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
      {v.status === "ready_for_review" && <Badge>Draft {analysis?.overall_score ?? ""}</Badge>}
      {(v.status === "processing" || v.status === "uploaded") && (
        <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Drafting</Badge>
      )}
      {v.status === "failed" && <Badge variant="destructive">Needs you</Badge>}
      {v.status === "approved" && <Badge className="bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> Sent</Badge>}
      {v.status === "returned" && <Badge variant="outline">Sent back</Badge>}
    </button>
  );
}

export function VideoReviewDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review video</DialogTitle>
        </DialogHeader>
        {id && <VideoReviewPanel videoSubmissionId={id} onDone={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

export function VideoReviewQueue() {
  const { data = [], isLoading, isError } = useVideoQueue();
  const [open, setOpen] = useState<string | null>(null);
  // Before the migration is applied the table does not exist: show nothing.
  if (isError || (!isLoading && data.length === 0)) return null;

  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Video className="h-5 w-5" /> Videos to review
          {data.length > 0 && <Badge variant="secondary">{data.length}</Badge>}
        </CardTitle>
        <CardDescription>AI drafts are ready to check. Nothing reaches families until you approve.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          data.map((v) => <VideoRow key={v.id} v={v} onOpen={() => setOpen(v.id)} />)
        )}
      </CardContent>
      <VideoReviewDialog id={open} onClose={() => setOpen(null)} />
    </Card>
  );
}

/** Every video sent for one homework, for the assignment's "Review videos" button. */
export function HomeworkVideosDialog({ homeworkId, onClose }: { homeworkId: string | null; onClose: () => void }) {
  const { data = [], isLoading } = useVideoQueue({ homeworkId: homeworkId ?? undefined });
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Dialog open={!!homeworkId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Videos for this homework</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No videos yet.</p>
        ) : (
          <div className="space-y-2">{data.map((v) => <VideoRow key={v.id} v={v} onOpen={() => setOpen(v.id)} />)}</div>
        )}
        <VideoReviewDialog id={open} onClose={() => setOpen(null)} />
      </DialogContent>
    </Dialog>
  );
}
