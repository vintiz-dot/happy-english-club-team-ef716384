/**
 * The teacher's review of one video. The AI's draft is a starting point:
 * every score, word of feedback and knowledge gap is editable, the evidence
 * timestamps jump the video to the moment, and nothing reaches the family
 * until "Approve & send".
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, RefreshCw, Send, Undo2, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { SignedVideo } from "./SignedVideo";
import { videoDb } from "@/lib/video/recorder";
import {
  CRITERION_MAX,
  VIDEO_GRADE_BANDS,
  formatTimestamp,
  gradeForScore,
  normalizeRubric,
  weightedScore,
  type CriterionScore,
} from "@/lib/videoHomework";

interface Gap {
  error_type: string;
  error_text: string;
  corrected_text: string;
  cefr_topic: string;
  severity: number;
  keep: boolean;
}

const STAGES: Record<string, string> = {
  queued: "Waiting to start",
  transcribing: "Listening to the video",
  watching: "Watching the video",
  scoring: "Writing the draft report",
};

export function VideoReviewPanel({
  videoSubmissionId,
  homeworkId,
  studentId,
  onDone,
}: {
  videoSubmissionId?: string;
  homeworkId?: string;
  studentId?: string;
  onDone?: () => void;
}) {
  const qc = useQueryClient();
  const player = useRef<HTMLVideoElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["video-review", videoSubmissionId, homeworkId, studentId],
    queryFn: async () => {
      let q = videoDb
        .from("video_submissions")
        .select("*, students(full_name), homeworks(id, title, body, due_date)");
      q = videoSubmissionId ? q.eq("id", videoSubmissionId) : q.eq("homework_id", homeworkId).eq("student_id", studentId);
      const { data: v, error } = await q.maybeSingle();
      if (error) throw error;
      if (!v) return null;
      const [{ data: a }, { data: r }] = await Promise.all([
        videoDb.from("video_analyses").select("*").eq("video_submission_id", v.id).maybeSingle(),
        videoDb.from("video_homework_rubrics").select("*").eq("homework_id", v.homework_id).maybeSingle(),
      ]);
      return { v, a, r };
    },
    enabled: !!videoSubmissionId || (!!homeworkId && !!studentId),
    refetchInterval: (query: any) => {
      const st = query.state.data?.v?.status;
      return st === "processing" || st === "uploaded" ? 5000 : false;
    },
  });

  const v = data?.v;
  const a = data?.a;
  const criteria = useMemo(() => normalizeRubric(data?.r?.criteria), [data?.r?.criteria]);

  const [scores, setScores] = useState<CriterionScore[]>([]);
  const [grade, setGrade] = useState("");
  const [gradeTouched, setGradeTouched] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [awardPoints, setAwardPoints] = useState(true);
  const [returnNote, setReturnNote] = useState("");
  const [showReturn, setShowReturn] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  // Load the draft (or the approved version) into the form once per analysis.
  const loadedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!a) return;
    const stamp = `${a.video_submission_id}:${a.updated_at}`;
    if (loadedFor.current === stamp) return;
    loadedFor.current = stamp;
    const byKey = new Map<string, CriterionScore>((a.criteria_scores ?? []).map((s: CriterionScore) => [s.key, s]));
    setScores(criteria.map((c) => ({ key: c.key, label: c.label, max: CRITERION_MAX, score: 0, evidence: [], comment: "", ...(byKey.get(c.key) ?? {}) })));
    const approved = !!a.approved_at;
    setFeedback((approved ? a.final_feedback_student : a.feedback_student) ?? "");
    setParentNote((approved ? a.final_feedback_parent : a.feedback_parent) ?? "");
    setGrade((approved ? a.final_grade : a.suggested_grade) ?? "");
    setGradeTouched(approved);
    const source = (approved ? a.final_gaps : a.gaps) ?? [];
    setGaps(source.map((g: any) => ({
      error_type: g.error_type ?? "other",
      error_text: g.error_text ?? "",
      corrected_text: g.corrected_text ?? "",
      cefr_topic: g.cefr_topic ?? "",
      severity: Number(g.severity) || 1,
      keep: true,
    })));
  }, [a, criteria]);

  const score = useMemo(() => weightedScore(criteria, scores), [criteria, scores]);
  useEffect(() => {
    if (!gradeTouched && scores.length) setGrade(gradeForScore(score));
  }, [score, gradeTouched, scores.length]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["video-review"] });
    qc.invalidateQueries({ queryKey: ["video-review-queue"] });
    qc.invalidateQueries({ queryKey: ["homework-videos"] });
    qc.invalidateQueries({ queryKey: ["homework-submissions"] });
    qc.invalidateQueries({ queryKey: ["class-leaderboard"] });
  };

  const rerun = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("analyze-video-submission", { body: { video_submission_id: v.id } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Started a new draft");
      invalidate();
    },
    onError: (e: any) =>
      toast.error(
        e?.name === "FunctionsFetchError" || /failed to send/i.test(String(e?.message))
          ? "The AI service is not reachable - it may not be switched on yet. You can grade this video yourself."
          : e?.message || "Could not start the analysis",
      ),
  });

  const approve = useMutation({
    mutationFn: async () => {
      // The teacher's criterion scores are part of what the family sees.
      const { error: saveError } = await videoDb
        .from("video_analyses")
        .upsert(
          { video_submission_id: v.id, criteria_scores: scores, updated_at: new Date().toISOString() },
          { onConflict: "video_submission_id" },
        );
      if (saveError) throw saveError;
      const kept = gaps.filter((g) => g.keep && g.error_text.trim()).map(({ keep: _k, ...g }) => g);
      const { error } = await videoDb.rpc("approve_video_feedback", {
        p_video_submission: v.id,
        p_score: score,
        p_grade: grade,
        p_feedback_student: feedback.trim(),
        p_feedback_parent: parentNote.trim() || null,
        p_gaps: kept,
        p_award_points: awardPoints,
      });
      if (error) throw error;
      // Fold the new evidence into the child's learning profile. Best-effort.
      supabase.functions.invoke("refresh-student-profile", { body: { student_id: v.student_id } }).catch(() => null);
    },
    onSuccess: () => {
      toast.success("Approved - the report is now with the family");
      invalidate();
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message || "Could not approve"),
  });

  const sendBack = useMutation({
    mutationFn: async () => {
      const { error } = await videoDb.rpc("return_video_for_rerecord", { p_video_submission: v.id, p_note: returnNote.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sent back with your note");
      setShowReturn(false);
      invalidate();
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message || "Could not send it back"),
  });

  const seek = (t: number | null | undefined) => {
    if (t === null || t === undefined || !player.current) return;
    player.current.currentTime = Math.max(0, t - 0.5);
    void player.current.play().catch(() => null);
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  }
  if (!v) {
    return <p className="text-sm text-muted-foreground py-4">This child has not sent a video yet.</p>;
  }

  // "uploaded" means the browser asked for a draft; if nothing has picked it
  // up a minute and a half later, the request never arrived. Say so rather
  // than spin for ever.
  const stalled =
    v.status === "uploaded" && !a && Date.now() - new Date(v.updated_at ?? v.submitted_at).getTime() > 90_000;
  const working = v.status === "processing" || (v.status === "uploaded" && !a && !stalled);
  const pron = v.pronunciation;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold">{v.students?.full_name}</span>
        <Badge variant="outline">{v.homeworks?.title}</Badge>
        {v.attempt > 1 && <Badge variant="secondary">Take {v.attempt}</Badge>}
        {v.status === "approved" && <Badge className="bg-emerald-600">Approved</Badge>}
        {v.status === "returned" && <Badge variant="secondary">Sent back</Badge>}
      </div>

      <SignedVideo ref={player} path={v.video_path} posterPath={v.frame_paths?.[0]} className="w-full rounded-xl bg-black aspect-video" />

      {working && (
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          {STAGES[v.processing_stage] ?? "Preparing the draft"}… you can watch the video meanwhile.
          {v.status === "uploaded" && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
              Start now
            </Button>
          )}
        </div>
      )}

      {stalled && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="flex-1">The AI draft has not started. You can grade it yourself below, or try again.</span>
          <Button size="sm" variant="outline" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
            {rerun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Start now"}
          </Button>
        </div>
      )}

      {v.duration_seconds != null ? (
        <p className="text-xs text-muted-foreground">
          Recorded length {formatTimestamp(Number(v.duration_seconds))}
          {v.video_mime ? ` · ${v.video_mime}` : ""}
        </p>
      ) : null}

      {v.status === "failed" && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
          <div className="flex-1">
            The AI draft could not be made: {v.error || "unknown error"}. You can still grade it yourself below, or try again.
          </div>
          <Button size="sm" variant="outline" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {a?.teacher_attention && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <span>{a.teacher_attention}</span>
        </div>
      )}

      {(a || v.status === "failed") && (
        <>
          {/* Scores */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" /> Scores {a && !a.approved_at && <span className="text-xs font-normal text-muted-foreground">(AI draft - adjust freely)</span>}
              </Label>
              <span className="text-lg font-bold">{score}<span className="text-xs text-muted-foreground">/100</span></span>
            </div>
            {(scores.length ? scores : criteria.map((c) => ({ key: c.key, label: c.label, score: 0, max: CRITERION_MAX } as CriterionScore))).map((s, i) => (
              <div key={s.key} className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: CRITERION_MAX + 1 }, (_, n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setScores((prev) => {
                          const base = prev.length ? prev : criteria.map((c) => ({ key: c.key, label: c.label, score: 0, max: CRITERION_MAX } as CriterionScore));
                          return base.map((x, j) => (j === i ? { ...x, score: n } : x));
                        })}
                        className={`h-7 w-7 rounded-md text-xs font-semibold border ${s.score === n ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                {s.comment && <p className="text-xs text-muted-foreground">{s.comment}</p>}
                {s.evidence && s.evidence.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {s.evidence.map((e, k) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => seek(e.t)}
                        className="text-left text-xs rounded-md bg-muted px-2 py-1 hover:bg-muted/70"
                        title={e.t !== null ? "Jump to this moment" : undefined}
                      >
                        {e.t !== null && <span className="font-mono text-primary mr-1">{formatTimestamp(e.t)}</span>}
                        “{e.quote}”
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Pronunciation, measured */}
          {pron && (
            <div className="rounded-lg border p-3 space-y-2">
              <Label className="text-sm font-semibold">Pronunciation (Azure, measured while recording)</Label>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Accuracy", pron.accuracy], ["Fluency", pron.fluency], ["Rhythm", pron.prosody]].map(([label, val]) => (
                  <div key={label as string} className="rounded-md bg-muted/50 py-1.5">
                    <div className="text-base font-bold">{val ?? "-"}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>
              {pron.weak_words?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Harder words: {pron.weak_words.map((w: any) => w.word).join(", ")}
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">Less reliable for young children's voices - trust your ears first.</p>
            </div>
          )}

          {/* Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Grade</Label>
              <Select value={grade} onValueChange={(val) => { setGrade(val); setGradeTouched(true); }}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Choose a grade" /></SelectTrigger>
                <SelectContent>
                  {VIDEO_GRADE_BANDS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm sm:pt-7">
              <Checkbox checked={awardPoints} onCheckedChange={(c) => setAwardPoints(c === true)} />
              Award {score} homework points
            </label>
          </div>

          {/* Words for the family */}
          <div className="space-y-1.5">
            <Label className="text-sm">Feedback for the child</Label>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={4} className="text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Note for the parent (Vietnamese)</Label>
            <Textarea value={parentNote} onChange={(e) => setParentNote(e.target.value)} rows={3} className="text-sm" />
          </div>

          {/* Knowledge gaps */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Knowledge gaps to track</Label>
            <p className="text-xs text-muted-foreground">Ticked items go into the child's error log and become practice cards.</p>
            {gaps.length === 0 && <p className="text-xs text-muted-foreground">None suggested.</p>}
            {gaps.map((g, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border p-2">
                <Checkbox
                  className="mt-2"
                  checked={g.keep}
                  onCheckedChange={(c) => setGaps((prev) => prev.map((x, j) => (j === i ? { ...x, keep: c === true } : x)))}
                />
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  <Input value={g.error_text} onChange={(e) => setGaps((p) => p.map((x, j) => (j === i ? { ...x, error_text: e.target.value } : x)))} placeholder="What was said" className="h-8 text-xs" />
                  <Input value={g.corrected_text} onChange={(e) => setGaps((p) => p.map((x, j) => (j === i ? { ...x, corrected_text: e.target.value } : x)))} placeholder="Correct form / tip" className="h-8 text-xs" />
                  <div className="sm:col-span-2 flex gap-1.5 text-[11px] text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">{g.error_type}</Badge>
                    {g.cefr_topic && <span>{g.cefr_topic}</span>}
                  </div>
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGaps((p) => [...p, { error_type: "grammar", error_text: "", corrected_text: "", cefr_topic: "", severity: 1, keep: true }])}
            >
              + Add a gap
            </Button>
          </div>

          {/* Transcript */}
          {a?.transcript_segments?.length > 0 && (
            <div className="rounded-lg border">
              <button type="button" onClick={() => setShowTranscript((s) => !s)} className="flex w-full items-center justify-between p-2.5 text-sm font-medium">
                Transcript
                <ChevronDown className={`h-4 w-4 transition-transform ${showTranscript ? "rotate-180" : ""}`} />
              </button>
              {showTranscript && (
                <div className="max-h-56 overflow-y-auto px-2.5 pb-2.5 space-y-1">
                  {a.transcript_segments.map((s: any, i: number) => (
                    <button key={i} type="button" onClick={() => seek(s.start)} className="block w-full text-left text-xs hover:bg-muted rounded px-1 py-0.5">
                      <span className="font-mono text-primary mr-1.5">{formatTimestamp(s.start)}</span>{s.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {a?.visual_notes?.summary && (
            <p className="text-xs text-muted-foreground"><span className="font-medium">On screen:</span> {a.visual_notes.summary}</p>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <Button
              className="h-11 flex-1 font-semibold"
              onClick={() => approve.mutate()}
              disabled={approve.isPending || !grade || !feedback.trim()}
            >
              {approve.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              {v.status === "approved" ? "Update & re-send" : "Approve & send to family"}
            </Button>
            {v.status !== "approved" && (
              <Button variant="outline" className="h-11" onClick={() => setShowReturn((s) => !s)}>
                <Undo2 className="h-4 w-4 mr-2" /> Ask to re-record
              </Button>
            )}
            {a && v.status !== "approved" && (
              <Button variant="ghost" className="h-11" onClick={() => rerun.mutate()} disabled={rerun.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" /> New draft
              </Button>
            )}
          </div>
          {showReturn && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm">A kind note for the child (they will see this)</Label>
              <Textarea
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={2}
                placeholder="e.g. I couldn't hear you clearly - try again somewhere quieter!"
              />
              <Button size="sm" onClick={() => sendBack.mutate()} disabled={sendBack.isPending || !returnNote.trim()}>
                Send back
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
