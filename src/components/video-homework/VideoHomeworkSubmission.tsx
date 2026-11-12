/**
 * A child's video homework: record, send, wait for the teacher, read the
 * report. The child never sees an AI draft or a "processing" state that
 * sounds like a machine is judging them - after sending it is simply
 * "with your teacher".
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { soundManager } from "@/lib/soundManager";
import { VideoRecorder } from "./VideoRecorder";
import { VideoReport, type ApprovedReport } from "./VideoReport";
import { SignedVideo } from "./SignedVideo";
import { ShareVideoButton } from "./ShareVideoButton";
import { VIDEO_BUCKET, extFor, videoDb, type RecordedTake } from "@/lib/video/recorder";
import { withRetry } from "@/lib/video/kidVideo";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

interface VideoHomeworkState {
  submission_type: string;
  max_seconds: number;
  title: string;
  prompt: string | null;
  looking_for: { summary: string | null; criteria: string[]; vocabulary: string[] } | null;
  submission: {
    id: string;
    status: "uploaded" | "with_teacher" | "approved" | "returned";
    video_path: string;
    frame_paths: string[];
    attempt: number;
    share_with_class: boolean;
    teacher_note: string | null;
    submitted_at: string;
  } | null;
  report: ApprovedReport | null;
}

export function useVideoHomework(homeworkId: string, studentId: string) {
  return useQuery({
    queryKey: ["video-homework", homeworkId, studentId],
    queryFn: async () => {
      const { data, error } = await videoDb.rpc("get_video_homework_for_student", {
        p_homework: homeworkId,
        p_student: studentId,
      });
      if (error) throw error;
      return data as VideoHomeworkState | null;
    },
    enabled: !!homeworkId && !!studentId,
    // Before the migration is applied the RPC does not exist: treat as "not video".
    retry: false,
  });
}

const strip = (html: string | null) =>
  String(html ?? "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export default function VideoHomeworkSubmission({
  homeworkId,
  studentId,
  onSuccess,
  kid = false,
}: { homeworkId: string; studentId: string; onSuccess?: () => void; kid?: boolean }) {
  const qc = useQueryClient();
  const ivory = useIvory();
  const { data: state, isLoading } = useVideoHomework(homeworkId, studentId);
  const [recording, setRecording] = useState(false);
  const [progress, setProgress] = useState(0);
  const [share, setShare] = useState(true);

  useEffect(() => {
    if (state?.submission) setShare(state.submission.share_with_class);
  }, [state?.submission?.id, state?.submission?.share_with_class]);

  const send = useMutation({
    mutationFn: async (take: RecordedTake) => {
      setProgress(5);
      const stamp = Date.now();
      const folder = `${studentId}/${homeworkId}/${stamp}`;
      const up = async (name: string, blob: Blob, type: string) => {
        const path = `${folder}/${name}`;
        // A dropped connection repeats this one file, not the whole recording.
        // If an attempt reached the server but its answer was lost, the retry finds the
        // file already there (the folder is unique to this take): that is success.
        await withRetry(async () => {
          const { error } = await supabase.storage.from(VIDEO_BUCKET).upload(path, blob, { contentType: type, upsert: false });
          if (error && !/already exists|duplicate/i.test(error.message)) throw new Error(`Upload failed: ${error.message}`);
        });
        return path;
      };

      const videoPath = await up(`video.${extFor(take.videoMime)}`, take.video, take.videoMime);
      setProgress(70);
      const audioPath = take.audio && take.audioMime ? await up(`audio.${extFor(take.audioMime)}`, take.audio, take.audioMime) : null;
      setProgress(80);
      const framePaths: string[] = [];
      for (let i = 0; i < take.frames.length; i++) {
        framePaths.push(await up(`frame-${i + 1}.jpg`, take.frames[i], "image/jpeg"));
      }
      setProgress(88);

      // The row the rest of the app (homework lists, the teacher's grading
      // list) reads. Best-effort: approval creates it if this is refused.
      let homeworkSubmissionId: string | null = null;
      const { data: existing } = await supabase
        .from("homework_submissions")
        .select("id, status")
        .eq("homework_id", homeworkId)
        .eq("student_id", studentId)
        .maybeSingle();
      if (existing?.status !== "graded") {
        const { data: hs } = await supabase
          .from("homework_submissions")
          .upsert({
            id: existing?.id,
            homework_id: homeworkId,
            student_id: studentId,
            status: "submitted",
            submitted_at: new Date().toISOString(),
            assignment_instructions: state?.prompt ?? null,
            submission_text: null,
          })
          .select("id")
          .maybeSingle();
        homeworkSubmissionId = hs?.id ?? existing?.id ?? null;
      }

      const old = state?.submission;
      const { data: vs, error } = await videoDb
        .from("video_submissions")
        .upsert(
          {
            homework_id: homeworkId,
            student_id: studentId,
            // class_id is filled from the homework by the database trigger.
            homework_submission_id: homeworkSubmissionId,
            video_path: videoPath,
            audio_path: audioPath,
            frame_paths: framePaths,
            video_mime: take.videoMime,
            audio_mime: take.audioMime,
            duration_seconds: take.durationSeconds,
            size_bytes: take.video.size,
            pronunciation: take.pronunciation,
            share_with_class: share,
          },
          { onConflict: "homework_id,student_id" },
        )
        .select("id")
        .single();
      if (error) throw error;
      setProgress(95);

      // Start the teacher's draft. If this fails the teacher can start it.
      const { error: fnError } = await supabase.functions.invoke("analyze-video-submission", {
        body: { video_submission_id: vs.id },
      });
      if (fnError) console.warn("analysis did not start:", fnError.message);

      // Tidy away the earlier take's files.
      if (old?.video_path) {
        const prefix = old.video_path.split("/").slice(0, 3).join("/");
        const { data: files } = await supabase.storage.from(VIDEO_BUCKET).list(prefix);
        if (files?.length) {
          await supabase.storage.from(VIDEO_BUCKET).remove(files.map((f) => `${prefix}/${f.name}`));
        }
      }
      setProgress(100);
    },
    onSuccess: () => {
      soundManager.play("questComplete");
      toast.success(kid ? "🎉 Great job! Your video is on its way to your teacher! · Video đã được gửi cho cô giáo!" : "🎉 Your video is on its way to your teacher!");
      setRecording(false);
      qc.invalidateQueries({ queryKey: ["video-homework", homeworkId, studentId] });
      qc.invalidateQueries({ queryKey: ["student-assignments"] });
      qc.invalidateQueries({ queryKey: ["homework-submission", homeworkId, studentId] });
      onSuccess?.();
    },
    onError: (e: any) => {
      toast.error(e?.message || "Your video could not be sent. Please try again.");
    },
    onSettled: () => setProgress(0),
  });

  const toggleShare = useMutation({
    mutationFn: async (value: boolean) => {
      if (!state?.submission) return;
      const { error } = await videoDb.from("video_submissions").update({ share_with_class: value }).eq("id", state.submission.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["video-homework", homeworkId, studentId] }),
    onError: () => toast.error("Could not change that setting"),
  });

  if (isLoading || !state) return null;

  const sub = state.submission;
  const showRecorder = !sub || sub.status === "returned" || recording;
  // The cue card holds the homework itself; the "looking for" list sits above it.
  const cue = strip(state.prompt).slice(0, 300) || state.looking_for?.summary || state.title;

  return (
    <div className={cn("space-y-4", ivory ? "rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1" : "p-4 border rounded-lg")}>
      {sub?.status !== "approved" && state.looking_for?.criteria?.length ? (
        <div className={ivory ? "rounded-hec-md bg-hec-sunken p-3" : "rounded-xl bg-muted/40 p-3"}>
          <p className={ivory ? "mb-1 text-hec-small font-medium text-hec-ink-soft" : "text-xs font-semibold text-muted-foreground mb-1"}>⭐ Your teacher is looking for</p>
          <ul className={ivory ? "space-y-0.5 text-hec-body text-hec-ink" : "text-sm space-y-0.5"}>
            {state.looking_for.criteria.map((c) => <li key={c}>• {c}</li>)}
          </ul>
        </div>
      ) : null}

      {sub?.status === "returned" && sub.teacher_note && (
        <div className={ivory ? "rounded-hec-md border border-hec-line bg-hec-sunken p-3" : "rounded-xl border border-sky-300/60 bg-sky-50 dark:bg-sky-950/30 p-3"}>
          <p className={ivory ? "mb-1 text-hec-small font-medium text-hec-ink-soft" : "text-xs font-semibold text-sky-700 dark:text-sky-300 mb-1"}>👩‍🏫 A note from your teacher</p>
          <p className={ivory ? "text-hec-body text-hec-ink" : "text-sm"}>{sub.teacher_note}</p>
        </div>
      )}

      {sub?.status === "approved" && state.report && <VideoReport report={state.report} />}

      {sub && !showRecorder && (
        <div className="space-y-2">
          <SignedVideo path={sub.video_path} className={ivory ? "w-full rounded-hec-md bg-hec-sunken aspect-video" : "w-full rounded-2xl bg-black aspect-video"} />
          {sub.status === "approved" && (
            <ShareVideoButton path={sub.video_path} title={state.title} className="w-full h-11" />
          )}
          {sub.status !== "approved" && (
            <div className={ivory ? "flex flex-wrap items-center justify-between gap-2 rounded-hec-md border border-hec-leaf/30 bg-hec-leaf-tint p-3" : "flex items-center justify-between gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 p-3"}>
              <p className={ivory ? "min-w-0 text-hec-body text-hec-ink" : kid ? "text-base" : "text-sm"}>📬 Sent! Your teacher will watch it soon.{kid && <span className={ivory ? "block text-hec-small text-hec-ink-soft" : "block text-xs text-muted-foreground"}>Đã gửi! Cô giáo sẽ xem sớm.</span>}</p>
              <Button variant={ivory ? "secondary" : "outline"} size="sm" onClick={() => setRecording(true)}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Record again
              </Button>
            </div>
          )}
        </div>
      )}

      {showRecorder && (
        <VideoRecorder
          maxSeconds={state.max_seconds || 300}
          cueCard={cue}
          vocabulary={state.looking_for?.vocabulary ?? []}
          onUse={(take) => send.mutate(take)}
          busy={send.isPending}
          kid={kid}
        />
      )}
      {send.isPending && <Progress value={progress} className="h-2" />}

      <div className={cn("flex items-center justify-between gap-3 pt-3", ivory ? "border-t border-hec-line" : "border-t")}>
        <Label htmlFor={`share-${homeworkId}`} className={ivory ? "text-hec-body font-normal text-hec-ink" : "text-sm font-normal"}>
          Show my video to my class after my teacher checks it
          <span className={ivory ? "block text-hec-small text-hec-ink-soft" : "block text-xs text-muted-foreground"}>Only your classmates and their families. Never your score.</span>
        </Label>
        <Switch
          id={`share-${homeworkId}`}
          checked={share}
          onCheckedChange={(v) => {
            setShare(v);
            if (sub) toggleShare.mutate(v);
          }}
        />
      </div>
    </div>
  );
}
