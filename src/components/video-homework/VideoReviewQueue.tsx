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
      className="flex min-h-hec-target w-full flex-wrap items-start gap-2 rounded-hec-md border border-hec-line bg-hec-surface p-3 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
    >
      <div className="min-w-0 flex-1 basis-40">
        <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{v.students?.full_name}</p>
        <p className="break-words text-hec-small text-hec-ink-soft tabular-nums">
          {v.homeworks?.title} · {dayjs(v.submitted_at).format("MMM D, h:mm A")}
          {v.attempt > 1 ? ` · take ${v.attempt}` : ""}
        </p>
      </div>
      {analysis?.teacher_attention && <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-hec-warn" role="img" aria-label="Needs your attention" />}
      {v.status === "ready_for_review" && <Badge variant="warning" className="shrink-0 tabular-nums">Draft {analysis?.overall_score ?? ""}</Badge>}
      {(v.status === "processing" || v.status === "uploaded") && (
        <Badge variant="secondary" className="shrink-0 gap-1"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Drafting</Badge>
      )}
      {v.status === "failed" && <Badge variant="destructive" className="shrink-0">Needs you</Badge>}
      {v.status === "approved" && <Badge variant="success" className="shrink-0 gap-1"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Sent</Badge>}
      {v.status === "returned" && <Badge variant="outline" className="shrink-0">Sent back</Badge>}
    </button>
  );
}

export function VideoReviewDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto">
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2">
          <Video className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden="true" /> Videos to review
          {data.length > 0 && <Badge variant="secondary" className="font-sans tabular-nums">{data.length}</Badge>}
        </CardTitle>
        <CardDescription>AI drafts are ready to check. Nothing reaches families until you approve.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <div className="flex items-center gap-2 text-hec-small text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</div>
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
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Videos for this homework</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center gap-2 text-hec-small text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</div>
        ) : data.length === 0 ? (
          <p className="py-4 text-hec-body text-hec-ink-soft">No videos yet.</p>
        ) : (
          <div className="space-y-2">{data.map((v) => <VideoRow key={v.id} v={v} onOpen={() => setOpen(v.id)} />)}</div>
        )}
        <VideoReviewDialog id={open} onClose={() => setOpen(null)} />
      </DialogContent>
    </Dialog>
  );
}
