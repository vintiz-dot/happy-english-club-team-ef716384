/**
 * TeacherTranscripts — end-of-lesson transcript ingestion + instant insights.
 *
 * Paste or upload the class transcript (Zoom/Teams VTT, SRT, or plain
 * "Name: line" text). It is analyzed at once into a DRAFT only the class's
 * staff can see: talk share, questions, vocabulary richness, a suggested
 * child per speaker (low / medium / high confidence), drafted errors and CEFR
 * estimates, and a draft lesson summary. Nothing reaches a child or a family
 * until the teacher approves in the "Teacher approval" panel
 * (TranscriptApprovalPanel -> approve_transcript_analysis), and then only
 * what the teacher chose (D-26, docs/evidence/FIX-analyze-transcript.md).
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { motion } from "framer-motion";
import TranscriptApprovalPanel from "@/components/teacher/TranscriptApprovalPanel";
import { reviewState } from "@/lib/transcriptReview";
import {
  AudioLines, Loader2, UploadCloud, Sparkles, MessageSquareText,
  HelpCircle, AlertTriangle, Star, FileText, TrendingUp,
  Coins, CheckCircle2, XCircle, Mic, BookOpen, NotebookPen, Image as ImageIcon, Pencil,
  ListChecks, Clock, Lightbulb, ArrowRight, GraduationCap,
} from "lucide-react";

// Whisper (whisper-1) hard-caps uploads at 25MB. Checked client-side first
// (small margin for multipart overhead) so a too-large file is rejected
// instantly instead of after a slow upload; transcribe-lesson-audio
// re-checks server-side too.
const AUDIO_MAX_BYTES = 24_500_000;

/**
 * supabase-js wraps a non-2xx edge-function response in FunctionsHttpError
 * whose .message is just "Edge Function returned a non-2xx status code" —
 * the REAL reason is in the unread Response at error.context. Unwrap it so
 * toasts show what actually went wrong.
 */
async function describeFnError(error: any): Promise<string> {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* body wasn't JSON or already consumed */ }
  try {
    const text = await error?.context?.text?.();
    if (text) return text.slice(0, 300);
  } catch { /* ignore */ }
  return error?.message || "Unknown error";
}

interface ClassOption { id: string; name: string }

function useMyClasses(userId?: string) {
  return useQuery<ClassOption[]>({
    queryKey: ["transcript-classes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: teacher } = await supabase
        .from("teachers").select("id").eq("user_id", userId!).maybeSingle();
      if (teacher) {
        const { data } = await supabase
          .from("sessions")
          .select("class_id, classes!inner(id, name)")
          .eq("teacher_id", teacher.id);
        const map = new Map<string, ClassOption>();
        data?.forEach((s: any) => {
          const c = Array.isArray(s.classes) ? s.classes[0] : s.classes;
          if (c) map.set(c.id, c);
        });
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
      }
      const { data } = await supabase
        .from("classes").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });
}

// A CEFR estimate is a level: the system's brass level badge (DS s.15). The words carry the level; the old
// per-level tints (sky / teal / emerald / violet at 15 %) failed 4.5:1 on the ivory surfaces.
const CEFR_LEVEL_BADGE = "border-hec-brass/40 bg-transparent text-hec-brass";
const CEFR_COLORS: Record<string, string> = {
  "Pre-A1": CEFR_LEVEL_BADGE,
  A1: CEFR_LEVEL_BADGE,
  "A1+": CEFR_LEVEL_BADGE,
  A2: CEFR_LEVEL_BADGE,
  "A2+": CEFR_LEVEL_BADGE,
  B1: CEFR_LEVEL_BADGE,
  "B1+": CEFR_LEVEL_BADGE,
  B2: CEFR_LEVEL_BADGE,
};

export default function TeacherTranscripts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState("");
  const [title, setTitle] = useState("");
  const [rawText, setRawText] = useState("");
  const [lessonContext, setLessonContext] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const [audioProgress, setAudioProgress] = useState<{ stage: "uploading" | "transcribing" | "diarizing" | "analyzing"; fileName: string } | null>(null);

  const { data: classes = [] } = useMyClasses(user?.id);

  const { data: transcripts = [] } = useQuery<any[]>({
    queryKey: ["class-transcripts", classId],
    enabled: !!classId,
    refetchInterval: (q) =>
      (q.state.data as any[] | undefined)?.some((t) => t.status === "processing") ? 4000 : false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("class_transcripts")
        .select("id, title, transcript_date, status, summary, error_message, source_format, created_at, title_covered, title_evidence, title_note, analysis, overview_draft, analyzed_at, processing_stage, processing_started_at")
        .eq("class_id", classId)
        .order("created_at", { ascending: false })
        .limit(25);
      return data || [];
    },
  });

  const { data: metrics = [] } = useQuery<any[]>({
    queryKey: ["transcript-metrics", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("transcript_speaker_metrics")
        .select("*, students(full_name)")
        .eq("transcript_id", selectedId)
        .order("word_count", { ascending: false });
      return data || [];
    },
  });

  // The draft's suggestions (staff-only) and the approval record, if any.
  const { data: suggestions = [] } = useQuery<any[]>({
    queryKey: ["transcript-suggestions", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("transcript_speaker_suggestions")
        .select("metric_id, suggested_student_id, confidence, basis, labels_from_model, draft_errors, cefr_estimate")
        .eq("transcript_id", selectedId);
      return data || [];
    },
  });

  const { data: approval = null } = useQuery<any>({
    queryKey: ["transcript-approval", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("transcript_approvals")
        .select("transcript_id, approved_at, approved_by, withdrawn_at, analyzed_at, assignments")
        .eq("transcript_id", selectedId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // What 20261117100100 took back from families for an older lesson (staff-only).
  // Before that file is pasted the table does not exist: no hold.
  const { data: legacyHold = null } = useQuery<any>({
    queryKey: ["transcript-legacy-hold", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("transcript_legacy_holds")
        .select("transcript_id, held_at")
        .eq("transcript_id", selectedId)
        .maybeSingle();
      return error ? null : data ?? null;
    },
  });

  // Published errors only (the approval writes them).
  const { data: errors = [] } = useQuery<any[]>({
    queryKey: ["transcript-errors", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_error_log")
        .select("*, students(full_name)")
        .eq("source", "transcript")
        .eq("source_id", selectedId)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  // Images of materials used in the lesson — pushed to enrolled students.
  const { data: resources = [] } = useQuery<any[]>({
    queryKey: ["lesson-resources", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lesson_resources")
        .select("*")
        .eq("transcript_id", selectedId)
        .order("created_at", { ascending: true });
      const rows = (data as any[]) || [];
      return Promise.all(
        rows.map(async (r) => {
          const { data: signed } = await supabase.storage
            .from("lesson-resources").createSignedUrl(r.storage_path, 3600);
          return { ...r, url: signed?.signedUrl ?? null };
        }),
      );
    },
  });

  // Student-safe lesson overview (summary, materials/pages, homework).
  const { data: overview } = useQuery<any>({
    queryKey: ["lesson-overview", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("lesson_overviews")
        .select("*")
        .eq("transcript_id", selectedId)
        .maybeSingle();
      return data ?? null;
    },
  });

  // Teacher-announced awards deciphered from the transcript ("5 stars Kiki!").
  const { data: pointSuggestions = [] } = useQuery<any[]>({
    queryKey: ["transcript-point-suggestions", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("transcript_point_suggestions")
        .select("*, students(full_name)")
        .eq("transcript_id", selectedId)
        .order("created_at", { ascending: true });
      return data || [];
    },
  });

  // The transcribe/analyze functions now answer immediately and work in the
  // BACKGROUND — a long recording used to outlive the synchronous request
  // window and get killed mid-flight, stranding the row in "processing".
  // Progress and errors land on the class_transcripts row; this polls it.
  const POLL_EVERY_MS = 5000;
  const POLL_TIMEOUT_MS = 30 * 60 * 1000;
  const pollTranscript = async (
    id: string,
    onStage?: (stage: string | null) => void,
  ): Promise<any> => {
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let lastStage: string | null = null;
    while (Date.now() < deadline) {
      const { data: row } = await (supabase as any)
        .from("class_transcripts")
        .select("id, status, processing_stage, error_message, summary")
        .eq("id", id)
        .maybeSingle();
      if (row) {
        if (row.processing_stage !== lastStage) {
          lastStage = row.processing_stage;
          onStage?.(lastStage);
        }
        if (row.status === "failed") throw new Error(row.error_message || "Processing failed");
        if (row.status !== "processing") return row;
      }
      await new Promise((r) => setTimeout(r, POLL_EVERY_MS));
    }
    throw new Error(
      "Still processing after 30 minutes — the run looks stalled. If the row stays stuck, use Re-analyze.",
    );
  };

  // Counts for the success toast (the background run can't return them in
  // the HTTP response the way the old synchronous call did).
  // Nothing is published by the analysis: count what the draft suggests.
  const fetchAnalyzedCounts = async (id: string) => {
    const { count: suggested } = await (supabase as any)
      .from("transcript_speaker_suggestions")
      .select("metric_id", { count: "exact", head: true })
      .eq("transcript_id", id)
      .not("suggested_student_id", "is", null);
    return { suggested: suggested ?? 0 };
  };
  const draftReadyText = (c: { suggested: number }) =>
    `${c.suggested} speaker${c.suggested === 1 ? "" : "s"} with a suggested child · review and approve to share it with families`;
  const invalidateLesson = (id: string | null) => {
    queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    for (const k of ["transcript-metrics", "transcript-errors", "transcript-point-suggestions", "transcript-suggestions", "transcript-approval", "transcript-legacy-hold", "lesson-overview"]) {
      queryClient.invalidateQueries({ queryKey: [k, id] });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      if (!classId) throw new Error("Choose a class");
      const text = rawText.trim();
      if (text.length < 40) throw new Error("Transcript looks empty — paste or upload the lesson transcript");

      const format = text.startsWith("WEBVTT") ? "vtt" : /^\d+\s*\n\d{2}:\d{2}/.test(text) ? "srt" : "paste";
      const { data: row, error } = await (supabase as any)
        .from("class_transcripts")
        .insert({
          class_id: classId,
          uploaded_by: user.id,
          title: title.trim() || `Lesson ${new Date().toLocaleDateString()}`,
          lesson_context: lessonContext.trim() || null,
          source_format: format,
          raw_text: text,
          status: "processing",
        })
        .select("id")
        .single();
      if (error) throw error;

      // Queue the analysis and poll — the list live-updates alongside.
      const { data: result, error: fnErr } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: row.id, background: true },
      });
      if (fnErr) throw new Error(await describeFnError(fnErr));
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      await pollTranscript(row.id);
      const counts = await fetchAnalyzedCounts(row.id);
      return { id: row.id, counts };
    },
    onSuccess: ({ id, counts }) => {
      toast.success("Draft ready", { description: draftReadyText(counts) });
      setRawText("");
      setTitle("");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
    onError: (e: any) => toast.error("Analysis failed", { description: e.message }),
  });

  // Upload the raw class RECORDING — Whisper transcribes it (with real
  // timestamps), an LLM maps each timestamped segment to a roster speaker,
  // and the labeled transcript then runs through the exact same analysis
  // pipeline as a pasted transcript (transcribe-lesson-audio delegates to
  // analyze-transcript once diarization is done).
  const audioUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error("Not authenticated");
      if (!classId) throw new Error("Choose a class first");
      if (file.size > AUDIO_MAX_BYTES) {
        throw new Error(
          `This file is ${(file.size / 1_000_000).toFixed(1)}MB — Whisper's limit is 25MB. ` +
            `Trim the recording or split the lesson into two uploads.`,
        );
      }

      setAudioProgress({ stage: "uploading", fileName: file.name });
      const ext = file.name.split(".").pop() || "mp3";
      const path = `${classId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("class-recordings")
        .upload(path, file, { contentType: file.type || "audio/mpeg" });
      if (upErr) throw upErr;

      const { data: row, error: insErr } = await (supabase as any)
        .from("class_transcripts")
        .insert({
          class_id: classId,
          uploaded_by: user.id,
          title: title.trim() || `Lesson ${new Date().toLocaleDateString()}`,
          lesson_context: lessonContext.trim() || null,
          source_format: "audio",
          raw_text: "[Audio uploaded — transcribing…]",
          audio_storage_path: path,
          audio_mime_type: file.type || "audio/mpeg",
          status: "processing",
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      // Two separate calls on purpose — transcription and analysis each get
      // their own edge-function time budget (a combined run used to be killed
      // mid-flight on long lessons and stranded the row in "processing").
      // Queue the pipeline. The function responds in milliseconds and does
      // Whisper → diarization → analysis in the background — a long
      // recording no longer races the request window. Poll for progress.
      setAudioProgress({ stage: "transcribing", fileName: file.name });
      const { data: tRes, error: tErr } = await supabase.functions.invoke("transcribe-lesson-audio", {
        body: { transcript_id: row.id },
      });
      if (tErr) throw new Error(await describeFnError(tErr));
      if (tRes?.success === false) throw new Error(tRes.error || "could not start transcription");

      await pollTranscript(row.id, (stage) => {
        if (stage === "transcribing" || stage === "diarizing" || stage === "analyzing") {
          setAudioProgress({ stage, fileName: file.name });
        }
      });
      const counts = await fetchAnalyzedCounts(row.id);
      return { id: row.id, counts };
    },
    onSuccess: ({ id, counts }) => {
      toast.success("Recording transcribed - draft ready", { description: draftReadyText(counts) });
      setTitle("");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
    onError: (e: any) => toast.error("Lesson audio processing failed", { description: e.message }),
    onSettled: () => setAudioProgress(null),
  });

  // Re-run analysis on an already-stored transcript — no re-paste needed.
  // Fixes transcripts analyzed before the roster-matching bug fix (a
  // fabricated enrollments.status filter silently matched zero students).
  const reanalyzeMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      const { data: result, error } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: transcriptId, background: true },
      });
      if (error) throw new Error(await describeFnError(error));
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      await pollTranscript(transcriptId);
      return fetchAnalyzedCounts(transcriptId);
    },
    onSuccess: (counts) => {
      toast.success("Re-analyzed - new draft ready", { description: draftReadyText(counts) });
      invalidateLesson(selectedId);
    },
    onError: (e: any) => toast.error("Re-analysis failed", { description: e.message }),
  });

  // Retry transcription for an audio-sourced transcript — the recording is
  // still in the class-recordings bucket, so a failed (or platform-killed,
  // stuck-"processing") run can be re-fired without re-uploading anything.
  const retryTranscriptionMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      // The function stamps the run itself; it chains analysis server-side.
      const { data: tRes, error: tErr } = await supabase.functions.invoke("transcribe-lesson-audio", {
        body: { transcript_id: transcriptId },
      });
      if (tErr) throw new Error(await describeFnError(tErr));
      if (tRes?.success === false) throw new Error(tRes.error || "transcription failed");
      await pollTranscript(transcriptId);
      return fetchAnalyzedCounts(transcriptId);
    },
    onSuccess: (counts) => {
      toast.success("Recording transcribed - draft ready", { description: draftReadyText(counts) });
      invalidateLesson(selectedId);
    },
    onError: (e: any) => {
      toast.error("Retry failed", { description: e.message });
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
  });

  // ── Correcting the AI's output ────────────────────────────────────────
  // The analysis is a first draft; the teacher has the final say. Saving
  // sets edited_by_teacher so a later re-analysis won't overwrite it.
  const [editingOverview, setEditingOverview] = useState(false);
  const [ovDraft, setOvDraft] = useState<{ summary: string; homework: string; materials: { name: string; pages: string }[] }>({
    summary: "", homework: "", materials: [],
  });

  const startEditOverview = () => {
    const ov = shownOverview;
    setOvDraft({
      summary: ov?.summary ?? selected?.summary ?? "",
      homework: ov?.homework ?? "",
      materials: Array.isArray(ov?.materials)
        ? ov.materials.map((m: any) => ({ name: m?.name ?? "", pages: m?.pages ?? "" }))
        : [],
    });
    setEditingOverview(true);
  };

  // The edit goes to the DRAFT (class_transcripts.overview_draft, staff-only).
  // Families see it when the teacher approves the lesson.
  const saveOverviewMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No lesson selected");
      const materials = ovDraft.materials
        .map((m) => ({ name: m.name.trim(), pages: m.pages.trim() || null }))
        .filter((m) => m.name);
      const draft = {
        summary: ovDraft.summary.trim() || null,
        homework: ovDraft.homework.trim() || null,
        materials,
        edited_by_teacher: true,
      };
      const { error } = await (supabase as any)
        .from("class_transcripts")
        .update({ overview_draft: draft, summary: draft.summary })
        .eq("id", selected.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved to the draft", { description: "Approve the lesson to share your version with families." });
      setEditingOverview(false);
      queryClient.invalidateQueries({ queryKey: ["lesson-overview", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
    onError: (e: any) => toast.error("Couldn't save", { description: e.message }),
  });

  // Per-student feedback corrections.
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [metricDraft, setMetricDraft] = useState<{ contribution: string; teacher_feedback: string; recommendation: string }>({
    contribution: "", teacher_feedback: "", recommendation: "",
  });

  const saveMetricMutation = useMutation({
    mutationFn: async (metricId: string) => {
      const { error } = await (supabase as any)
        .from("transcript_speaker_metrics")
        .update({
          contribution: metricDraft.contribution.trim() || null,
          teacher_feedback: metricDraft.teacher_feedback.trim() || null,
          recommendation: metricDraft.recommendation.trim() || null,
          edited_by_teacher: true,
        })
        .eq("id", metricId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Feedback updated");
      setEditingMetricId(null);
      queryClient.invalidateQueries({ queryKey: ["transcript-metrics", selectedId] });
    },
    onError: (e: any) => toast.error("Couldn't save feedback", { description: e.message }),
  });

  // Upload images of the materials used in this lesson. They're pushed to
  // every enrolled student inside the lesson content.
  const [resourceUploading, setResourceUploading] = useState(false);
  const uploadResources = async (files: FileList) => {
    if (!user || !selected) return;
    setResourceUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() || "jpg";
        // Path starts with class_id so the storage policy can map the object
        // back to its class for enrolled-student reads.
        const path = `${classId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("lesson-resources")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;
        const { error: insErr } = await (supabase as any).from("lesson_resources").insert({
          transcript_id: selected.id,
          class_id: classId,
          storage_path: path,
          caption: file.name.replace(/\.[^.]+$/, "").slice(0, 120),
          uploaded_by: user.id,
        });
        if (insErr) throw insErr;
      }
      toast.success("Resources added — students can see them in this lesson");
      queryClient.invalidateQueries({ queryKey: ["lesson-resources", selectedId] });
    } catch (e: any) {
      toast.error("Couldn't add resource", { description: e.message });
    } finally {
      setResourceUploading(false);
    }
  };

  const deleteResourceMutation = useMutation({
    mutationFn: async (r: any) => {
      await supabase.storage.from("lesson-resources").remove([r.storage_path]);
      const { error } = await (supabase as any).from("lesson_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-resources", selectedId] }),
    onError: (e: any) => toast.error("Couldn't remove", { description: e.message }),
  });

  // Choosing who a speaker was is the approval panel's job now
  // (TranscriptApprovalPanel): a direct write of student_id is refused by the
  // database, and the old backfill published errors and a level at once.

  // Roster for manual speaker assignment.
  // The approval panel offers the children enrolled ON THE LESSON'S DATE,
  // which is what approve_transcript_analysis accepts (review N-3); a child
  // who has left since still appears for their old lessons.
  const { data: lessonEnrollments = [] } = useQuery<any[]>({
    queryKey: ["transcript-lesson-enrollments", classId],
    enabled: !!classId,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("enrollments")
        .select("start_date, end_date, students(id, full_name)")
        .eq("class_id", classId);
      return (data || []) as any[];
    },
  });

  // Apply a deciphered award: create the real point transaction, then mark
  // the suggestion applied (with a back-reference for audit).
  const applySuggestion = async (s: any) => {
    if (!user) throw new Error("Not authenticated");
    if (!s.student_id) throw new Error("No matched student — this name wasn't found on the roster");
    const { data: txn, error: txnErr } = await (supabase as any)
      .from("point_transactions")
      .insert({
        student_id: s.student_id,
        class_id: s.class_id,
        points: s.points,
        type: "participation",
        date: selected?.transcript_date ?? new Date().toISOString().slice(0, 10),
        created_by: user.id,
        notes: `In-class award (from transcript): "${s.quote}"`,
      })
      .select("id")
      .single();
    if (txnErr) throw txnErr;
    const { error: updErr } = await (supabase as any)
      .from("transcript_point_suggestions")
      .update({
        status: "applied",
        applied_by: user.id,
        applied_at: new Date().toISOString(),
        point_transaction_ref: txn.id,
      })
      .eq("id", s.id);
    if (updErr) throw updErr;
  };

  const invalidateSuggestions = () => {
    queryClient.invalidateQueries({ queryKey: ["transcript-point-suggestions", selectedId] });
    queryClient.invalidateQueries({ queryKey: ["class-board"] });
    queryClient.invalidateQueries({ queryKey: ["student-points"] });
    queryClient.invalidateQueries({ queryKey: ["point-history"] });
  };

  const applyMutation = useMutation({
    mutationFn: applySuggestion,
    onSuccess: (_d, s: any) => {
      toast.success(`${s.points > 0 ? "+" : ""}${s.points} points → ${s.students?.full_name || s.speaker_label}`);
      invalidateSuggestions();
    },
    onError: (e: any) => toast.error("Couldn't apply award", { description: e.message }),
  });

  const dismissMutation = useMutation({
    mutationFn: async (s: any) => {
      const { error } = await (supabase as any)
        .from("transcript_point_suggestions")
        .update({ status: "dismissed" })
        .eq("id", s.id);
      if (error) throw error;
    },
    onSuccess: () => invalidateSuggestions(),
    onError: (e: any) => toast.error("Couldn't dismiss", { description: e.message }),
  });

  const attended = (s: any) => s.attendance_status === "Present" || s.attendance_status === "Late";
  const eligibleSuggestions = pointSuggestions.filter(
    (s) => s.status === "suggested" && s.student_id && attended(s),
  );

  const applyAllMutation = useMutation({
    mutationFn: async () => {
      let ok = 0;
      for (const s of eligibleSuggestions) {
        try { await applySuggestion(s); ok++; } catch { /* keep going */ }
      }
      return ok;
    },
    onSuccess: (ok) => {
      toast.success(`Applied ${ok} award${ok === 1 ? "" : "s"} to present students`);
      invalidateSuggestions();
    },
  });

  const selected = transcripts.find((t) => t.id === selectedId);
  const review = reviewState(selected, approval);
  const isApproved = review === "approved";
  const lessonRoster = useMemo(() => {
    const day = String(selected?.transcript_date ?? "").slice(0, 10);
    const seen = new Map<string, { id: string; full_name: string }>();
    for (const e of lessonEnrollments) {
      const s = e?.students;
      if (!s?.id || !day) continue;
      if (e.start_date && String(e.start_date) > day) continue;
      if (e.end_date && String(e.end_date) < day) continue;
      seen.set(s.id, { id: s.id, full_name: s.full_name });
    }
    return [...seen.values()].sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [lessonEnrollments, selected?.transcript_date]);
  // What the teacher reviews: the draft overview, or (an older lesson) the published one.
  const shownOverview: any = selected?.overview_draft ?? overview ?? null;
  const overviewChangedSinceApproval = isApproved && !!overview && !!selected?.overview_draft
    && (String(overview.summary ?? "") !== String(selected.overview_draft.summary ?? "")
      || String(overview.homework ?? "") !== String(selected.overview_draft.homework ?? "")
      || JSON.stringify(overview.materials ?? []) !== JSON.stringify(selected.overview_draft.materials ?? []));
  // A run killed by the platform never reaches its catch block, so the row
  // keeps status "processing" forever. The pipeline is background now and a
  // 90-minute recording legitimately takes ~10 minutes end to end, so only
  // call it stalled well past that. processing_started_at (stamped on every
  // run/retry) beats created_at, which lies for retried rows.
  const STALLED_AFTER_MS = 20 * 60 * 1000;
  const isStalled = (t: any) =>
    t?.status === "processing" &&
    Date.now() - new Date(t.processing_started_at || t.created_at).getTime() > STALLED_AFTER_MS;
  const isUnknownRow = (m: any) => (m.speaker_label || "").trim().toLowerCase() === "unknown";
  const studentMetrics = metrics.filter((m) => !m.is_teacher && !isUnknownRow(m));
  const maxShare = Math.max(...studentMetrics.map((m) => m.participation_share || 0), 0.0001);
  // Honest signal about mono-recorder limits: how much audio couldn't be
  // attributed to a specific person (excluded from all engagement math).
  const totalTranscriptWords = metrics.reduce((s, m) => s + (m.word_count || 0), 0);
  const unknownWords = metrics.filter(isUnknownRow).reduce((s, m) => s + (m.word_count || 0), 0);
  const unknownPct = totalTranscriptWords > 0 ? Math.round((unknownWords / totalTranscriptWords) * 100) : 0;

  return (
    <Layout title="Transcript Insights">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 rounded-hec-lg bg-hec-sunken flex items-center justify-center">
            <AudioLines className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Transcript Insights</h1>
            <p className="text-hec-small text-hec-ink-soft">
              Upload the lesson transcript — or the raw recording — and engagement, CEFR signals,
              flagged errors and point awards are drafted for you. Nothing reaches families until you approve.
            </p>
          </div>
        </div>

        {/* Upload panel */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSelectedId(null); }}>
                <SelectTrigger className="md:w-64" aria-label="Class"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input
                placeholder="Lesson title (optional)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="md:flex-1"
              />
              <input
                ref={fileRef}
                type="file"
                accept=".vtt,.srt,.txt"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setRawText(await f.text());
                  e.target.value = "";
                }}
              />
              <Button variant="outline" className="gap-2" onClick={() => fileRef.current?.click()}>
                <UploadCloud className="h-4 w-4" />.vtt / .txt
              </Button>
              <input
                ref={audioFileRef}
                type="file"
                accept="audio/*,.m4a,.mp3,.wav,.webm,.mp4,.mpga,.mpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) audioUploadMutation.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                className="gap-2"
                disabled={!classId || audioUploadMutation.isPending}
                onClick={() => audioFileRef.current?.click()}
                title={!classId ? "Choose a class first" : "Upload the raw class recording — Whisper transcribes it"}
              >
                {audioUploadMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
                Upload recording
              </Button>
            </div>

            {audioProgress && (
              <div className="flex items-center gap-2 rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-2 text-hec-small text-hec-ink">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span className="truncate">
                  {audioProgress.stage === "uploading"
                    ? `Uploading ${audioProgress.fileName}…`
                    : audioProgress.stage === "transcribing"
                      ? `Transcribing "${audioProgress.fileName}" with Whisper — a full lesson can take several minutes. You can leave this page; processing continues on the server.`
                      : audioProgress.stage === "diarizing"
                        ? `Identifying who said what — matching voices to your roster…`
                        : `Analyzing the lesson — engagement, feedback and point awards…`}
                </span>
              </div>
            )}
            <p className="text-hec-caption text-hec-ink-soft -mt-1">
              Recordings up to 25MB (roughly 45–60 min at typical voice-memo quality). Longer lessons:
              split into two recordings and upload each separately.
            </p>

            <Textarea
              placeholder={"Lesson plan / notes (optional but recommended)…\n\nTarget vocabulary, book & pages, the activities you ran. This is fed to the transcriber so names and terms come out right, and to the analyzer so it judges the lesson against what you planned."}
              value={lessonContext}
              onChange={(e) => setLessonContext(e.target.value)}
              className="min-h-[72px]"
            />

            <Textarea
              placeholder={'Paste the transcript here…\n\nWorks with raw classroom-recorder transcripts (no speaker labels needed — students are identified from names called out in class), or labeled formats: Zoom/Teams WebVTT, SRT, "Anna: I go to the park yesterday"'}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[120px] font-mono"
            />
            <Button
              className="w-full gap-2 sm:w-auto"
              disabled={uploadMutation.isPending || !classId || rawText.trim().length < 40}
              onClick={() => uploadMutation.mutate()}
            >
              {uploadMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Analyzing…</>
              ) : (
                <><Sparkles className="h-4 w-4" />Analyze transcript</>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-[280px_1fr] gap-4">
          {/* Transcript list */}
          <Card className="h-fit">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 shrink-0 text-hec-ink-soft" />Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transcripts.length === 0 && (
                <p className="text-hec-small text-hec-ink-soft py-4 text-center">
                  {classId ? "No transcripts yet for this class." : "Choose a class to see its transcripts."}
                </p>
              )}
              {transcripts.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  aria-current={selectedId === t.id ? "true" : undefined}
                  className={`w-full min-h-hec-target text-left rounded-hec-md border p-3 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring
                    ${selectedId === t.id ? "border-hec-brass bg-hec-sunken" : "border-hec-line"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 text-hec-small font-medium text-hec-ink truncate">{t.title || "Untitled lesson"}</p>
                    {isStalled(t) ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <AlertTriangle className="h-4 w-4 text-hec-warn shrink-0" aria-hidden="true" />
                            <span className="sr-only">This run was cut off — open it and hit Retry</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>This run was cut off — open it and hit Retry</TooltipContent>
                      </Tooltip>
                    ) : t.status === "processing" ? (
                      <Loader2 className="h-4 w-4 animate-spin text-hec-ink-soft shrink-0" />
                    ) : t.status === "failed" ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <AlertTriangle className="h-4 w-4 text-hec-danger shrink-0" aria-hidden="true" />
                            <span className="sr-only">{t.error_message || "Analysis failed"}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">{t.error_message || "Analysis failed"}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" className="shrink-0 border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">ready</Badge>
                    )}
                  </div>
                  <p className="text-hec-caption text-hec-ink-soft mt-1 tabular-nums">{t.transcript_date}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Insights dashboard */}
          <div className="space-y-4 min-w-0">
            {!selected ? (
              <Card>
                <CardContent className="py-16 text-center text-hec-small text-hec-ink-soft">
                  Select a lesson to see its engagement dashboard.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stalled run — killed before it could record an error */}
                {isStalled(selected) && (
                  <div className="rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint p-3 space-y-2">
                    <p className="text-hec-small font-semibold text-hec-warn flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />This run was cut off
                    </p>
                    <p className="text-hec-small text-hec-ink-soft">
                      It's been processing for over 10 minutes, which means the job hit the
                      platform's time limit before it could finish or record an error. Your
                      recording is safe in storage —{" "}
                      {selected.source_format === "audio" ? "hit Retry transcription" : "hit Re-analyze"} to run it again.
                    </p>
                  </div>
                )}

                {/* Full failure reason — no more hunting in a hover tooltip */}
                {selected.status === "failed" && (
                  <div className="rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-3 space-y-2">
                    <p className="text-hec-small font-semibold text-hec-danger flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {selected.source_format === "audio" ? "Transcription failed" : "Analysis failed"}
                    </p>
                    <p className="text-hec-small text-hec-ink-soft break-words">
                      {selected.error_message || "No error detail was recorded — the function may have been cut off by a platform time limit (common for recordings near the 25MB cap). Retrying often succeeds."}
                    </p>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {selected.source_format === "audio" && selected.status !== "analyzed" && (
                    <Tooltip>
                    <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={retryTranscriptionMutation.isPending || isApproved}
                      onClick={() => retryTranscriptionMutation.mutate(selected.id)}
                    >
                      {retryTranscriptionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                      Retry transcription
                    </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {isApproved
                        ? "This lesson is approved and shared — withdraw the approval first to transcribe it again"
                        : "Re-run Whisper transcription from the stored recording — no re-upload needed"}
                    </TooltipContent>
                    </Tooltip>
                  )}
                  <Tooltip>
                  <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={reanalyzeMutation.isPending || selected.status === "processing" || isApproved}
                    onClick={() => reanalyzeMutation.mutate(selected.id)}
                  >
                    {reanalyzeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Re-analyze
                  </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isApproved
                      ? "This lesson is approved and shared — withdraw the approval first to analyse it again"
                      : "Re-run analysis on the stored transcript text — makes a new draft for you to review"}
                  </TooltipContent>
                  </Tooltip>
                </div>

                {/* The approval step: nothing below reaches a child or a family until it is done. */}
                <TranscriptApprovalPanel
                  transcript={selected}
                  metrics={metrics}
                  suggestions={suggestions}
                  approval={approval}
                  hold={legacyHold}
                  roster={lessonRoster}
                  onChanged={() => {
                    invalidateLesson(selectedId);
                    queryClient.invalidateQueries({ queryKey: ["class-speaker-aliases", classId] });
                  }}
                />

                {selected.summary && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="flex flex-wrap items-center gap-2">
                          <Sparkles className="h-5 w-5 shrink-0 text-hec-ink-soft" />Lesson summary
                          {overview ? (
                            <Badge variant="outline" className="border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">
                              shared with students
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-hec-brass/40 text-hec-brass">
                              draft - not shared yet
                            </Badge>
                          )}
                          {overviewChangedSinceApproval && (
                            <Badge variant="outline" className="border-hec-warn/30 bg-hec-warn-tint text-hec-warn">
                              edited since approval - approve again to share
                            </Badge>
                          )}
                          {shownOverview?.edited_by_teacher && (
                            <Badge variant="outline" className="text-hec-ink-soft">
                              your edit
                            </Badge>
                          )}
                        </CardTitle>
                        {!editingOverview && (
                          <Button variant="ghost" size="sm" className="gap-2 shrink-0" onClick={startEditOverview}>
                            <Pencil className="h-4 w-4" />Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {editingOverview ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-hec-small font-medium text-hec-ink mb-2">Summary</p>
                            <Textarea
                              aria-label="Summary"
                              value={ovDraft.summary}
                              onChange={(e) => setOvDraft((d) => ({ ...d, summary: e.target.value }))}
                              className="min-h-[100px]"
                            />
                          </div>
                          <div>
                            <p className="text-hec-small font-medium text-hec-ink mb-2">Materials used</p>
                            <div className="space-y-2">
                              {ovDraft.materials.map((m, i) => (
                                <div key={i} className="flex flex-wrap gap-2">
                                  <Input
                                    placeholder="Book / handout"
                                    value={m.name}
                                    onChange={(e) => setOvDraft((d) => {
                                      const next = [...d.materials];
                                      next[i] = { ...next[i], name: e.target.value };
                                      return { ...d, materials: next };
                                    })}
                                    className="min-w-0 flex-1 basis-40"
                                  />
                                  <Input
                                    placeholder="Pages"
                                    value={m.pages}
                                    onChange={(e) => setOvDraft((d) => {
                                      const next = [...d.materials];
                                      next[i] = { ...next[i], pages: e.target.value };
                                      return { ...d, materials: next };
                                    })}
                                    className="w-24"
                                  />
                                  <Button
                                    variant="ghost" size="icon" className="shrink-0 text-hec-ink-soft"
                                    aria-label="Remove this material"
                                    onClick={() => setOvDraft((d) => ({ ...d, materials: d.materials.filter((_, x) => x !== i) }))}
                                  >
                                    <XCircle className="h-5 w-5" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline" size="sm" className="gap-2"
                                onClick={() => setOvDraft((d) => ({ ...d, materials: [...d.materials, { name: "", pages: "" }] }))}
                              >
                                <BookOpen className="h-4 w-4" />Add material
                              </Button>
                            </div>
                          </div>
                          <div>
                            <p className="text-hec-small font-medium text-hec-ink mb-2">Homework</p>
                            <Textarea
                              placeholder="No homework assigned"
                              value={ovDraft.homework}
                              onChange={(e) => setOvDraft((d) => ({ ...d, homework: e.target.value }))}
                              className="min-h-[56px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm" className="gap-2"
                              disabled={saveOverviewMutation.isPending}
                              onClick={() => saveOverviewMutation.mutate()}
                            >
                              {saveOverviewMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingOverview(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                      <>
                      <p className="text-hec-body text-hec-ink-soft">{shownOverview?.summary ?? selected.summary}</p>

                      {/* Did the lesson actually cover its title? */}
                      {selected.title_covered !== null && selected.title_covered !== undefined && (
                        <div className={`rounded-hec-md border px-3 py-2 ${
                          selected.title_covered
                            ? "border-hec-leaf/30 bg-hec-leaf-tint"
                            : "border-hec-warn/30 bg-hec-warn-tint"
                        }`}>
                          <p className={`text-hec-small font-semibold flex flex-wrap items-center gap-2 ${
                            selected.title_covered ? "text-hec-leaf" : "text-hec-warn"
                          }`}>
                            {selected.title_covered ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                            {selected.title_covered ? "Lesson title covered" : "Title not clearly covered"}
                            {selected.title && <span className="font-normal text-hec-ink-soft">— "{selected.title}"</span>}
                          </p>
                          {selected.title_note && (
                            <p className="text-hec-small text-hec-ink-soft mt-1">{selected.title_note}</p>
                          )}
                          {Array.isArray(selected.title_evidence) && selected.title_evidence.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {selected.title_evidence.map((q: string, i: number) => (
                                <li key={i} className="text-hec-caption text-hec-ink-soft italic">"{q}"</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {Array.isArray(shownOverview?.materials) && shownOverview.materials.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <BookOpen className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                          {shownOverview.materials.map((m: any, i: number) => (
                            <Badge key={i} variant="secondary" className="font-normal">
                              {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {shownOverview?.homework && (
                        <p className="text-hec-small flex items-start gap-2">
                          <NotebookPen className="h-4 w-4 text-hec-ink-soft shrink-0 mt-1" />
                          <span>
                            <span className="font-semibold text-hec-ink">Homework:</span>{" "}
                            <span className="text-hec-ink-soft">{shownOverview.homework}</span>
                          </span>
                        </p>
                      )}
                      </>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Structured lesson report — grounded, chronological, from the
                    whole transcript (the shape of a good teacher's notes). */}
                {(() => {
                  const lr = selected.analysis?.lesson_report;
                  if (!lr) return null;
                  const hasAny =
                    (lr.objectives?.length ?? 0) +
                      (lr.chronology?.length ?? 0) +
                      (lr.engagement?.length ?? 0) +
                      (lr.misconceptions?.length ?? 0) +
                      (lr.interventions?.length ?? 0) +
                      (lr.next_steps?.length ?? 0) >
                    0 || !!lr.general_understanding;
                  if (!hasAny) return null;
                  return (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                          Lesson report
                        </CardTitle>
                        <CardDescription className="mt-1">
                          A grounded, chronological account built from the whole transcript — quotes are verbatim.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 text-hec-small">
                        {Array.isArray(lr.objectives) && lr.objectives.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <ListChecks className="h-4 w-4 shrink-0 text-hec-ink-soft" /> Objectives worked on
                            </p>
                            <ul className="space-y-1">
                              {lr.objectives.map((o: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-hec-ink-soft">
                                  <span className="text-hec-ink-faint" aria-hidden="true">•</span>
                                  <span>{o}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.chronology) && lr.chronology.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <Clock className="h-4 w-4 shrink-0 text-hec-ink-soft" /> How the lesson unfolded
                            </p>
                            <ol className="relative space-y-3 border-l border-hec-line pl-4">
                              {lr.chronology.map((c: any, i: number) => (
                                <li key={i} className="relative">
                                  <span className="absolute -left-[21px] top-2 h-2 w-2 rounded-full bg-hec-brass ring-2 ring-hec-surface" />
                                  <p className="font-semibold text-hec-ink">{c.phase}</p>
                                  <p className="text-hec-ink-soft text-hec-small">{c.detail}</p>
                                </li>
                              ))}
                            </ol>
                          </section>
                        )}

                        {Array.isArray(lr.engagement) && lr.engagement.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <MessageSquareText className="h-4 w-4 shrink-0 text-hec-ink-soft" /> Student moments
                            </p>
                            <ul className="space-y-2">
                              {lr.engagement.map((e: any, i: number) => (
                                <li key={i} className="rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-2">
                                  <p className="text-hec-small italic text-hec-ink">
                                    "{e.quote}"
                                    {e.student && (
                                      <span className="not-italic font-semibold text-hec-ink-soft"> — {e.student}</span>
                                    )}
                                  </p>
                                  {e.note && <p className="text-hec-small text-hec-ink-soft mt-1">{e.note}</p>}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.misconceptions) && lr.misconceptions.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <AlertTriangle className="h-4 w-4 shrink-0 text-hec-warn" /> Misconceptions & confusions
                            </p>
                            <ul className="space-y-1">
                              {lr.misconceptions.map((m: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-hec-ink-soft">
                                  <span className="text-hec-warn" aria-hidden="true">•</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.interventions) && lr.interventions.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <Lightbulb className="h-4 w-4 shrink-0 text-hec-ink-soft" /> Teacher feedback & interventions
                            </p>
                            <ul className="space-y-1">
                              {lr.interventions.map((it: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-hec-ink-soft">
                                  <span className="text-hec-ink-faint" aria-hidden="true">•</span>
                                  <span>{it}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {lr.general_understanding && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <GraduationCap className="h-4 w-4 shrink-0 text-hec-ink-soft" /> General understanding
                            </p>
                            <p className="text-hec-ink-soft text-hec-small">{lr.general_understanding}</p>
                          </section>
                        )}

                        {Array.isArray(lr.next_steps) && lr.next_steps.length > 0 && (
                          <section>
                            <p className="text-hec-small font-semibold flex items-center gap-2 text-hec-ink mb-2">
                              <ArrowRight className="h-4 w-4 shrink-0 text-hec-ink-soft" /> Next steps
                            </p>
                            <ul className="space-y-1">
                              {lr.next_steps.map((n: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-hec-ink-soft">
                                  <span className="text-hec-ink-faint" aria-hidden="true">→</span>
                                  <span>{n}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}
                      </CardContent>
                    </Card>
                  );
                })()}

                {/* Resource images — pushed into what students see */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                          <ImageIcon className="h-5 w-5 shrink-0 text-hec-ink-soft" />
                          Resources used
                          {resources.length > 0 && <Badge variant="secondary" className="tabular-nums">{resources.length}</Badge>}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          Photos of the book pages, handouts or board work from this lesson.
                          Students see these inside the lesson.
                        </CardDescription>
                      </div>
                      <label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          capture="environment"
                          className="hidden"
                          disabled={resourceUploading}
                          onChange={(e) => {
                            if (e.target.files?.length) uploadResources(e.target.files);
                            e.target.value = "";
                          }}
                        />
                        <span className={`inline-flex min-h-hec-target items-center gap-2 rounded-hec-md border border-hec-line-strong bg-hec-raised px-4 text-hec-body font-medium text-hec-ink cursor-pointer transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken ${resourceUploading ? "opacity-50 pointer-events-none" : ""}`}>
                          {resourceUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                          Add photos
                        </span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {resources.length === 0 ? (
                      <p className="text-hec-small text-hec-ink-soft py-2">
                        No resource photos yet — add the pages or handouts you used and they'll appear on every student's lesson page.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {resources.map((r) => (
                          <div key={r.id} className="relative group rounded-hec-md border border-hec-line overflow-hidden">
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noreferrer">
                                <img src={r.url} alt={r.caption || "resource"} loading="lazy" className="h-24 w-full object-cover" />
                              </a>
                            ) : (
                              <div className="h-24 w-full bg-hec-sunken flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-hec-ink-faint" />
                              </div>
                            )}
                            <Tooltip>
                            <TooltipTrigger asChild>
                            <button
                              onClick={() => deleteResourceMutation.mutate(r)}
                              className="absolute top-1 right-1 flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md bg-hec-raised text-hec-danger shadow-hec-1 opacity-0 transition-opacity duration-hec-1 ease-hec group-hover:opacity-100 group-focus-within:opacity-100 hover:bg-hec-danger-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                              aria-label="Remove"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                            </TooltipTrigger>
                            <TooltipContent>Remove</TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deciphered point awards — teacher reviews, then applies */}
                {pointSuggestions.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <CardTitle className="flex flex-wrap items-center gap-2">
                            <Coins className="h-5 w-5 shrink-0 text-hec-brass" />
                            Points called out in class
                            <Badge variant="secondary" className="tabular-nums">
                              {pointSuggestions.filter((s) => s.status === "suggested").length} pending
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Awards the teacher announced during the lesson. Only students marked
                            present that day are eligible — nothing is granted until you apply it.
                          </CardDescription>
                        </div>
                        {eligibleSuggestions.length > 0 && (
                          <Button
                            size="sm"
                            className="w-full gap-2 sm:w-auto"
                            disabled={applyAllMutation.isPending}
                            onClick={() => applyAllMutation.mutate()}
                          >
                            {applyAllMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            Apply all present ({eligibleSuggestions.length})
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {pointSuggestions.map((s) => {
                        const isPending = s.status === "suggested";
                        const canApply = isPending && s.student_id && s.attendance_status !== "Absent" && s.attendance_status !== "Excused";
                        return (
                          <div
                            key={s.id}
                            className={`rounded-hec-md border p-3 flex flex-wrap items-start gap-3 ${
                              s.status === "applied" ? "border-hec-leaf/30 bg-hec-leaf-tint"
                              : s.status === "dismissed" ? "border-dashed border-hec-line bg-hec-sunken"
                              : "border-hec-line bg-hec-surface"
                            }`}
                          >
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-hec-sm px-2 py-1 text-hec-small font-semibold tabular-nums ${
                                s.points > 0
                                  ? "bg-hec-leaf-tint text-hec-leaf"
                                  : "bg-hec-danger-tint text-hec-danger"
                              }`}
                            >
                              {s.points > 0 ? `+${s.points}` : s.points}
                            </span>
                            <div className="min-w-0 flex-1 basis-48">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="min-w-0 whitespace-normal break-words text-hec-small font-semibold text-hec-ink">
                                  {s.students?.full_name || (
                                    <span className="text-hec-ink-soft">“{s.speaker_label}” — not on roster</span>
                                  )}
                                </span>
                                {attended(s) ? (
                                  <Badge variant="outline" className="border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">
                                    {s.attendance_status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="gap-1 border-hec-warn/30 bg-hec-warn-tint text-hec-warn">
                                    <AlertTriangle className="h-3 w-3" />
                                    {s.attendance_status === "no_session" ? "no session that day" : s.attendance_status}
                                  </Badge>
                                )}
                                {s.status === "applied" && (
                                  <Badge className="border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">applied</Badge>
                                )}
                                {s.status === "dismissed" && (
                                  <Badge variant="outline" className="text-hec-ink-soft">dismissed</Badge>
                                )}
                              </div>
                              <p className="text-hec-small text-hec-ink-soft italic mt-1 truncate" title={s.quote}>
                                “{s.quote}”{s.reason ? ` — ${s.reason}` : ""}
                              </p>
                            </div>
                            {isPending && (
                              <div className="flex gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-2"
                                  disabled={!canApply || applyMutation.isPending}
                                  title={!s.student_id ? "No roster match" : !canApply ? "Student wasn't present" : "Create the point transaction"}
                                  onClick={() => applyMutation.mutate(s)}
                                >
                                  <CheckCircle2 className="h-4 w-4" />Apply
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  className="text-hec-ink-soft"
                                  aria-label="Dismiss"
                                  disabled={dismissMutation.isPending}
                                  onClick={() => dismissMutation.mutate(s)}
                                >
                                  <XCircle className="h-5 w-5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Talk-share / engagement balance */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 shrink-0 text-hec-ink-soft" />Engagement balance
                    </CardTitle>
                    <CardDescription>
                      Share of student talk. Quiet students stand out immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {studentMetrics.map((m, i) => {
                      const share = m.participation_share || 0;
                      const isQuiet = share < 0.5 / Math.max(studentMetrics.length, 1);
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1"
                        >
                          <span className="w-full shrink-0 whitespace-normal break-words text-hec-small font-medium text-hec-ink sm:w-40">
                            {m.students?.full_name || m.speaker_label}
                          </span>
                          <div className="min-w-0 flex-1 h-2 rounded-full bg-hec-sunken overflow-hidden">
                            <motion.div
                              initial={false}
                              animate={{ width: `${(share / maxShare) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.04 }}
                              className={`h-full rounded-full ${isQuiet ? "bg-hec-warn" : "bg-hec-brass"}`}
                            />
                          </div>
                          <span className="w-12 shrink-0 text-right text-hec-small text-hec-ink-soft tabular-nums">
                            {Math.round(share * 100)}%
                          </span>
                          {m.cefr_estimate && (
                            <Badge variant="outline" className={`shrink-0 ${CEFR_COLORS[m.cefr_estimate] || ""}`}>
                              {m.cefr_estimate}
                            </Badge>
                          )}
                        </motion.div>
                      );
                    })}
                    {studentMetrics.length === 0 && (
                      <p className="text-hec-small text-hec-ink-soft py-3">No student speech matched in this transcript.</p>
                    )}
                    {unknownPct > 0 && (
                      <p className="text-hec-caption text-hec-ink-soft pt-1 flex items-start gap-2">
                        <HelpCircle className="h-4 w-4 shrink-0" />
                        {unknownPct}% of the audio couldn't be attributed to a specific speaker
                        (overlapping voices / mono recorder) and is excluded from these shares.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Per-student stat cards */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {studentMetrics.map((m) => (
                    <Card key={`card-${m.id}`}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="min-w-0 flex-1 basis-40 whitespace-normal break-words text-hec-body font-semibold text-hec-ink">{m.students?.full_name || m.speaker_label}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.edited_by_teacher && (
                              <Badge variant="outline" className="text-hec-ink-soft">edited</Badge>
                            )}
                            {m.cefr_estimate && (
                              <Badge variant="outline" className={CEFR_COLORS[m.cefr_estimate] || ""}>
                                {m.cefr_estimate}
                              </Badge>
                            )}
                            {editingMetricId !== m.id && (
                              <Tooltip>
                              <TooltipTrigger asChild>
                              <Button
                                variant="ghost" size="icon" className="text-hec-ink-soft"
                                aria-label="Correct this feedback"
                                onClick={() => {
                                  setMetricDraft({
                                    contribution: m.contribution ?? "",
                                    teacher_feedback: m.teacher_feedback ?? "",
                                    recommendation: m.recommendation ?? "",
                                  });
                                  setEditingMetricId(m.id);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              </TooltipTrigger>
                              <TooltipContent>Correct this feedback</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>

                        {/* Not linked to a child yet: that is chosen in Teacher approval */}
                        {!m.student_id && (
                          <p className="text-hec-caption text-hec-ink-soft flex items-start gap-2">
                            <HelpCircle className="h-4 w-4 shrink-0" />
                            Not linked to a child yet - choose who this was in Teacher approval. Only staff see this card until then.
                          </p>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-hec-md bg-hec-sunken p-2">
                            <MessageSquareText className="h-4 w-4 mx-auto text-hec-ink-soft" />
                            <p className="text-hec-body font-semibold text-hec-ink tabular-nums mt-1">{m.utterance_count}</p>
                            <p className="text-hec-caption text-hec-ink-soft">turns</p>
                          </div>
                          <div className="rounded-hec-md bg-hec-sunken p-2">
                            <HelpCircle className="h-4 w-4 mx-auto text-hec-ink-soft" />
                            <p className="text-hec-body font-semibold text-hec-ink tabular-nums mt-1">{m.questions_asked}</p>
                            <p className="text-hec-caption text-hec-ink-soft">questions</p>
                          </div>
                          <div className="rounded-hec-md bg-hec-sunken p-2">
                            <AlertTriangle className="h-4 w-4 mx-auto text-hec-ink-soft" />
                            <p className="text-hec-body font-semibold text-hec-ink tabular-nums mt-1">{m.errors_count}</p>
                            <p className="text-hec-caption text-hec-ink-soft">errors</p>
                          </div>
                        </div>
                        {Array.isArray(m.highlights) && m.highlights.length > 0 && (
                          <div className="pt-1 space-y-1">
                            {m.highlights.map((h: string, i: number) => (
                              <p key={i} className="text-hec-small text-hec-ink-soft flex gap-2">
                                <Star className="h-4 w-4 text-hec-brass shrink-0 mt-1" />{h}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* AI lesson coaching: contribution, feedback, next step */}
                        {editingMetricId === m.id ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft mb-1">Contribution</p>
                              <Textarea
                                aria-label="Contribution"
                                value={metricDraft.contribution}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, contribution: e.target.value }))}
                                className="min-h-[56px]"
                              />
                            </div>
                            <div>
                              <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft mb-1">Teacher feedback</p>
                              <Textarea
                                aria-label="Teacher feedback"
                                value={metricDraft.teacher_feedback}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, teacher_feedback: e.target.value }))}
                                className="min-h-[64px]"
                              />
                            </div>
                            <div>
                              <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft mb-1">Next step</p>
                              <Textarea
                                aria-label="Next step"
                                value={metricDraft.recommendation}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, recommendation: e.target.value }))}
                                className="min-h-[44px]"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm" className="gap-2"
                                disabled={saveMetricMutation.isPending}
                                onClick={() => saveMetricMutation.mutate(m.id)}
                              >
                                {saveMetricMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                Save
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setEditingMetricId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                        <>
                        {m.contribution && (
                          <p className="text-hec-small text-hec-ink-soft pt-1">
                            <span className="font-semibold text-hec-ink">Contribution:</span> {m.contribution}
                          </p>
                        )}
                        {m.teacher_feedback && (
                          <div className="rounded-hec-md border border-hec-line bg-hec-sunken px-3 py-2">
                            <p className="text-hec-caption uppercase tracking-wider font-medium text-hec-ink-soft flex items-center gap-1">
                              <Sparkles className="h-4 w-4" />Teacher feedback
                            </p>
                            <p className="text-hec-small text-hec-ink mt-1">{m.teacher_feedback}</p>
                          </div>
                        )}
                        {m.recommendation && (
                          <p className="text-hec-small pt-1">
                            <span className="font-semibold text-hec-ink">Next step:</span>{" "}
                            <span className="text-hec-ink-soft">{m.recommendation}</span>
                          </p>
                        )}
                        </>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Flagged errors */}
                {errors.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="flex flex-wrap items-center gap-2">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-hec-warn" />
                        Flagged errors → flashcards
                        <Badge variant="secondary" className="tabular-nums">{errors.length}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Published when you approved the lesson: each kept error is on the child's record with a practice card.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-72">
                        <div className="space-y-2 pr-3">
                          {errors.map((e) => (
                            <div key={e.id} className="rounded-hec-md border border-hec-line p-3 text-hec-small">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="min-w-0 whitespace-normal break-words font-medium text-hec-ink">{e.students?.full_name}</span>
                                <Badge variant="outline" className="capitalize">{e.error_type}</Badge>
                                {e.cefr_topic && (
                                  <Badge variant="outline" className="text-hec-ink-soft">
                                    {e.cefr_topic}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-hec-danger line-through mt-1">{e.error_text}</p>
                              <p className="text-hec-leaf">{e.corrected_text}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
