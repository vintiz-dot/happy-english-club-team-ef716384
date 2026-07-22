/**
 * TeacherTranscripts — end-of-lesson transcript ingestion + instant insights.
 *
 * Paste or upload the class transcript (Zoom/Teams VTT, SRT, or plain
 * "Name: line" text). It is analyzed immediately: per-student talk share,
 * questions, vocabulary richness, CEFR estimates, flagged errors (which
 * auto-feed each student's spaced-repetition deck) and a lesson summary —
 * ready for teacher and admin the moment analysis completes.
 */
import { useRef, useState } from "react";
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
import { toast } from "sonner";
import { motion } from "framer-motion";
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
  const [audioProgress, setAudioProgress] = useState<{ stage: "uploading" | "transcribing" | "analyzing"; fileName: string } | null>(null);

  const { data: classes = [] } = useMyClasses(user?.id);

  const { data: transcripts = [] } = useQuery<any[]>({
    queryKey: ["class-transcripts", classId],
    enabled: !!classId,
    refetchInterval: (q) =>
      (q.state.data as any[] | undefined)?.some((t) => t.status === "processing") ? 4000 : false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("class_transcripts")
        .select("id, title, transcript_date, status, summary, error_message, source_format, created_at, title_covered, title_evidence, title_note, analysis")
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

      // Fire the analysis — the list will live-update to "analyzed".
      const { data: result, error: fnErr } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: row.id },
      });
      if (fnErr) throw new Error(await describeFnError(fnErr));
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      return { id: row.id, result };
    },
    onSuccess: ({ id, result }) => {
      toast.success("Transcript analyzed", {
        description: `${result.matched_students} students matched · ${result.errors_logged} errors logged · ${result.points_suggested ?? 0} point awards deciphered`,
      });
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
      setAudioProgress({ stage: "transcribing", fileName: file.name });
      const { data: tRes, error: tErr } = await supabase.functions.invoke("transcribe-lesson-audio", {
        body: { transcript_id: row.id },
      });
      if (tErr) throw new Error(await describeFnError(tErr));
      if (tRes?.success === false) throw new Error(tRes.error || "transcription failed");

      setAudioProgress({ stage: "analyzing", fileName: file.name });
      const { data: aRes, error: aErr } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: row.id },
      });
      if (aErr) throw new Error(await describeFnError(aErr));
      if (aRes?.success === false) throw new Error(aRes.error || "analysis failed");

      return { id: row.id, result: { ...aRes, duration_seconds: tRes?.duration_seconds } };
    },
    onSuccess: ({ id, result }) => {
      const mins = result.duration_seconds ? Math.round(result.duration_seconds / 60) : null;
      toast.success("Recording transcribed & analyzed", {
        description: `${mins ? `${mins} min · ` : ""}${result.matched_students} students matched · ${result.errors_logged} errors logged · ${result.points_suggested ?? 0} point awards deciphered`,
      });
      setTitle("");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
    onError: (e: any) => toast.error("Audio transcription failed", { description: e.message }),
    onSettled: () => setAudioProgress(null),
  });

  // Re-run analysis on an already-stored transcript — no re-paste needed.
  // Fixes transcripts analyzed before the roster-matching bug fix (a
  // fabricated enrollments.status filter silently matched zero students).
  const reanalyzeMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      const { data: result, error } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: transcriptId },
      });
      if (error) throw new Error(await describeFnError(error));
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      return result;
    },
    onSuccess: (result) => {
      toast.success("Re-analyzed", {
        description: `${result.matched_students} students matched · ${result.errors_logged} errors logged · ${result.points_suggested ?? 0} point awards deciphered`,
      });
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-metrics", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-errors", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-point-suggestions", selectedId] });
    },
    onError: (e: any) => toast.error("Re-analysis failed", { description: e.message }),
  });

  // Retry transcription for an audio-sourced transcript — the recording is
  // still in the class-recordings bucket, so a failed (or platform-killed,
  // stuck-"processing") run can be re-fired without re-uploading anything.
  const retryTranscriptionMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      await (supabase as any)
        .from("class_transcripts")
        .update({ status: "processing", error_message: null })
        .eq("id", transcriptId);
      const { data: tRes, error: tErr } = await supabase.functions.invoke("transcribe-lesson-audio", {
        body: { transcript_id: transcriptId },
      });
      if (tErr) throw new Error(await describeFnError(tErr));
      if (tRes?.success === false) throw new Error(tRes.error || "transcription failed");

      // Analysis is a separate request (own time budget) — see the function.
      const { data: aRes, error: aErr } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: transcriptId },
      });
      if (aErr) throw new Error(await describeFnError(aErr));
      if (aRes?.success === false) throw new Error(aRes.error || "analysis failed");
      return aRes;
    },
    onSuccess: (result) => {
      toast.success("Recording transcribed & analyzed", {
        description: `${result.matched_students} students matched · ${result.errors_logged} errors logged · ${result.points_suggested ?? 0} point awards deciphered`,
      });
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-metrics", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-errors", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-point-suggestions", selectedId] });
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
    setOvDraft({
      summary: overview?.summary ?? selected?.summary ?? "",
      homework: overview?.homework ?? "",
      materials: Array.isArray(overview?.materials)
        ? overview.materials.map((m: any) => ({ name: m?.name ?? "", pages: m?.pages ?? "" }))
        : [],
    });
    setEditingOverview(true);
  };

  const saveOverviewMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("No lesson selected");
      const materials = ovDraft.materials
        .map((m) => ({ name: m.name.trim(), pages: m.pages.trim() || null }))
        .filter((m) => m.name);
      const payload = {
        transcript_id: selected.id,
        class_id: classId,
        lesson_date: selected.transcript_date,
        title: selected.title ?? null,
        summary: ovDraft.summary.trim() || null,
        homework: ovDraft.homework.trim() || null,
        materials,
        edited_by_teacher: true,
        updated_at: new Date().toISOString(),
      };
      const { error } = await (supabase as any)
        .from("lesson_overviews")
        .upsert(payload, { onConflict: "transcript_id" });
      if (error) throw error;

      // Keep the teacher-facing transcript summary in step with the one
      // students read, so the two never disagree.
      await (supabase as any)
        .from("class_transcripts")
        .update({ summary: ovDraft.summary.trim() || null })
        .eq("id", selected.id);
    },
    onSuccess: () => {
      toast.success("Lesson updated — students see your version");
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

  // Manually attribute an unmatched speaker to a student. Beyond fixing this
  // lesson's stats, it backfills the analysis that was skipped for the
  // unmatched speaker (errors → SRS cards, CEFR point) and remembers the
  // label for this class so future transcripts resolve it automatically.
  const assignSpeakerMutation = useMutation({
    mutationFn: async ({ metric, studentId: sid }: { metric: any; studentId: string }) => {
      if (!user) throw new Error("Not authenticated");

      const { error: updErr } = await (supabase as any)
        .from("transcript_speaker_metrics")
        .update({ student_id: sid })
        .eq("id", metric.id);
      if (updErr) throw updErr;

      // Remember the correction for this class (idempotent).
      const norm = String(metric.speaker_label || "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
      if (norm) {
        await (supabase as any).from("class_speaker_aliases").upsert(
          { class_id: classId, speaker_label: norm, student_id: sid, created_by: user.id },
          { onConflict: "class_id,speaker_label" },
        );
      }

      // Backfill what the pipeline skipped because the speaker was unmatched.
      const ai = (selected?.analysis?.students || []).find(
        (s: any) => String(s.name || "").trim().toLowerCase() === String(metric.speaker_label || "").trim().toLowerCase(),
      );
      let backfilled = 0;
      if (ai) {
        for (const err of ai.errors ?? []) {
          if (!err?.error_text || !err?.corrected_text) continue;
          const { data: errRow } = await (supabase as any)
            .from("student_error_log")
            .insert({
              student_id: sid,
              class_id: classId,
              source: "transcript",
              source_id: selected.id,
              error_text: String(err.error_text).slice(0, 500),
              corrected_text: String(err.corrected_text).slice(0, 500),
              error_type: ["grammar", "vocabulary", "pronunciation", "spelling", "syntax", "other"].includes(err.error_type)
                ? err.error_type : "grammar",
              cefr_topic: err.cefr_topic ? String(err.cefr_topic).slice(0, 80) : null,
              created_by: user.id,
            })
            .select("id").single();
          if (errRow) {
            backfilled++;
            await (supabase as any).from("srs_cards").insert({
              student_id: sid,
              source: "error",
              error_log_id: errRow.id,
              front: `Fix this sentence:\n"${String(err.error_text).slice(0, 300)}"`,
              back: String(err.corrected_text).slice(0, 300),
              hint: err.cefr_topic ? `Topic: ${err.cefr_topic}` : null,
            });
          }
        }
        const CEFR_SCORE: Record<string, number> = {
          "Pre-A1": 0, A1: 1, "A1+": 1.5, A2: 2, "A2+": 2.5, B1: 3, "B1+": 3.5, B2: 4, "B2+": 4.5,
        };
        if (ai.cefr_estimate && CEFR_SCORE[ai.cefr_estimate] !== undefined) {
          await (supabase as any).from("cefr_assessments").insert({
            student_id: sid,
            class_id: classId,
            source: "transcript",
            level: ai.cefr_estimate,
            level_score: CEFR_SCORE[ai.cefr_estimate],
            evidence: ai.evidence ? String(ai.evidence).slice(0, 500) : null,
            assessed_at: selected.transcript_date,
            source_id: selected.id,
            created_by: user.id,
          });
        }
      }

      // Refresh that student's living profile with the newly-linked evidence.
      supabase.functions.invoke("refresh-student-profile", { body: { student_id: sid } }).catch(() => {});
      return backfilled;
    },
    onSuccess: (backfilled) => {
      toast.success("Speaker assigned", {
        description: backfilled > 0
          ? `${backfilled} flagged point${backfilled === 1 ? "" : "s"} added to their record — and I'll remember this name next time`
          : "I'll remember this name for future transcripts in this class",
      });
      queryClient.invalidateQueries({ queryKey: ["transcript-metrics", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-errors", selectedId] });
    },
    onError: (e: any) => toast.error("Couldn't assign speaker", { description: e.message }),
  });

  // Roster for manual speaker assignment.
  const { data: classRoster = [] } = useQuery<any[]>({
    queryKey: ["transcript-class-roster", classId],
    enabled: !!classId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await (supabase as any)
        .from("enrollments")
        .select("students(id, full_name)")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      return ((data || []) as any[])
        .map((r) => r.students)
        .filter(Boolean)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
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
    queryClient.invalidateQueries({ queryKey: ["class-leaderboard"] });
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
  // A run killed by the platform time limit never reaches its catch block, so
  // the row keeps status "processing" forever. Anything still processing after
  // this long is stalled, not working — surface it so the retry is obvious.
  const STALLED_AFTER_MS = 10 * 60 * 1000;
  const isStalled = (t: any) =>
    t?.status === "processing" && Date.now() - new Date(t.created_at).getTime() > STALLED_AFTER_MS;
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
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md">
            <AudioLines className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Transcript Insights</h1>
            <p className="text-sm text-muted-foreground">
              Upload the lesson transcript — or the raw recording — and engagement, CEFR signals,
              flagged errors, and point awards are extracted instantly.
            </p>
          </div>
        </div>

        {/* Upload panel */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSelectedId(null); }}>
                <SelectTrigger className="md:w-64"><SelectValue placeholder="Select class" /></SelectTrigger>
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
              <div className="flex items-center gap-2 text-xs text-cyan-700 dark:text-cyan-300 rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/25 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                <span className="truncate">
                  {audioProgress.stage === "uploading"
                    ? `Uploading ${audioProgress.fileName}…`
                    : audioProgress.stage === "transcribing"
                      ? `Transcribing "${audioProgress.fileName}" with Whisper — long recordings can take a minute or two…`
                      : `Analyzing the lesson — engagement, feedback and point awards…`}
                </span>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground -mt-1">
              Recordings up to 25MB (roughly 45–60 min at typical voice-memo quality). Longer lessons:
              split into two recordings and upload each separately.
            </p>

            <Textarea
              placeholder={"Lesson plan / notes (optional but recommended)…\n\nTarget vocabulary, book & pages, the activities you ran. This is fed to the transcriber so names and terms come out right, and to the analyzer so it judges the lesson against what you planned."}
              value={lessonContext}
              onChange={(e) => setLessonContext(e.target.value)}
              className="min-h-[72px] text-xs"
            />

            <Textarea
              placeholder={'Paste the transcript here…\n\nWorks with raw classroom-recorder transcripts (no speaker labels needed — students are identified from names called out in class), or labeled formats: Zoom/Teams WebVTT, SRT, "Anna: I go to the park yesterday"'}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="min-h-[120px] font-mono text-xs"
            />
            <Button
              className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white"
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
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />Lessons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {transcripts.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {classId ? "No transcripts yet for this class." : "Choose a class to see its transcripts."}
                </p>
              )}
              {transcripts.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left rounded-xl border p-2.5 transition-colors hover:bg-muted/50
                    ${selectedId === t.id ? "border-blue-500/50 bg-blue-500/5" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{t.title || "Untitled lesson"}</p>
                    {isStalled(t) ? (
                      <span title="This run was cut off — open it and hit Retry">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                      </span>
                    ) : t.status === "processing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                    ) : t.status === "failed" ? (
                      <span title={t.error_message || "Analysis failed"}>
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      </span>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">ready</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{t.transcript_date}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Insights dashboard */}
          <div className="space-y-4 min-w-0">
            {!selected ? (
              <Card>
                <CardContent className="py-16 text-center text-sm text-muted-foreground">
                  Select a lesson to see its engagement dashboard.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Stalled run — killed before it could record an error */}
                {isStalled(selected) && (
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />This run was cut off
                    </p>
                    <p className="text-xs text-muted-foreground">
                      It's been processing for over 10 minutes, which means the job hit the
                      platform's time limit before it could finish or record an error. Your
                      recording is safe in storage —{" "}
                      {selected.source_format === "audio" ? "hit Retry transcription" : "hit Re-analyze"} to run it again.
                    </p>
                  </div>
                )}

                {/* Full failure reason — no more hunting in a hover tooltip */}
                {selected.status === "failed" && (
                  <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-3 space-y-1.5">
                    <p className="text-sm font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      {selected.source_format === "audio" ? "Transcription failed" : "Analysis failed"}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">
                      {selected.error_message || "No error detail was recorded — the function may have been cut off by a platform time limit (common for recordings near the 25MB cap). Retrying often succeeds."}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  {selected.source_format === "audio" && selected.status !== "analyzed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
                      disabled={retryTranscriptionMutation.isPending}
                      onClick={() => retryTranscriptionMutation.mutate(selected.id)}
                      title="Re-run Whisper transcription from the stored recording — no re-upload needed"
                    >
                      {retryTranscriptionMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Mic className="h-3.5 w-3.5" />
                      )}
                      Retry transcription
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={reanalyzeMutation.isPending || selected.status === "processing"}
                    onClick={() => reanalyzeMutation.mutate(selected.id)}
                    title="Re-run analysis on the stored transcript text — useful after a matching fix or if 0 students matched"
                  >
                    {reanalyzeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Re-analyze
                  </Button>
                </div>

                {selected.summary && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                          <Sparkles className="h-4 w-4 text-blue-500" />Lesson summary
                          {overview && (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                              shared with students
                            </Badge>
                          )}
                          {overview?.edited_by_teacher && (
                            <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-500/40">
                              your edit
                            </Badge>
                          )}
                        </CardTitle>
                        {!editingOverview && (
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs shrink-0" onClick={startEditOverview}>
                            <Pencil className="h-3 w-3" />Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                      {editingOverview ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Summary</p>
                            <Textarea
                              value={ovDraft.summary}
                              onChange={(e) => setOvDraft((d) => ({ ...d, summary: e.target.value }))}
                              className="min-h-[100px] text-sm"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Materials used</p>
                            <div className="space-y-1.5">
                              {ovDraft.materials.map((m, i) => (
                                <div key={i} className="flex gap-1.5">
                                  <Input
                                    placeholder="Book / handout"
                                    value={m.name}
                                    onChange={(e) => setOvDraft((d) => {
                                      const next = [...d.materials];
                                      next[i] = { ...next[i], name: e.target.value };
                                      return { ...d, materials: next };
                                    })}
                                    className="flex-1 h-8 text-xs"
                                  />
                                  <Input
                                    placeholder="Pages"
                                    value={m.pages}
                                    onChange={(e) => setOvDraft((d) => {
                                      const next = [...d.materials];
                                      next[i] = { ...next[i], pages: e.target.value };
                                      return { ...d, materials: next };
                                    })}
                                    className="w-24 h-8 text-xs"
                                  />
                                  <Button
                                    variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground"
                                    onClick={() => setOvDraft((d) => ({ ...d, materials: d.materials.filter((_, x) => x !== i) }))}
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                              <Button
                                variant="outline" size="sm" className="h-7 text-xs gap-1"
                                onClick={() => setOvDraft((d) => ({ ...d, materials: [...d.materials, { name: "", pages: "" }] }))}
                              >
                                <BookOpen className="h-3 w-3" />Add material
                              </Button>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Homework</p>
                            <Textarea
                              placeholder="No homework assigned"
                              value={ovDraft.homework}
                              onChange={(e) => setOvDraft((d) => ({ ...d, homework: e.target.value }))}
                              className="min-h-[56px] text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm" className="gap-1.5"
                              disabled={saveOverviewMutation.isPending}
                              onClick={() => saveOverviewMutation.mutate()}
                            >
                              {saveOverviewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setEditingOverview(false)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                      <>
                      <p className="text-sm leading-relaxed text-muted-foreground">{overview?.summary ?? selected.summary}</p>

                      {/* Did the lesson actually cover its title? */}
                      {selected.title_covered !== null && selected.title_covered !== undefined && (
                        <div className={`rounded-xl px-3 py-2 ring-1 ${
                          selected.title_covered
                            ? "bg-emerald-500/5 ring-emerald-500/25"
                            : "bg-amber-500/5 ring-amber-500/25"
                        }`}>
                          <p className={`text-xs font-bold flex items-center gap-1.5 ${
                            selected.title_covered ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                          }`}>
                            {selected.title_covered ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                            {selected.title_covered ? "Lesson title covered" : "Title not clearly covered"}
                            {selected.title && <span className="font-normal text-muted-foreground">— "{selected.title}"</span>}
                          </p>
                          {selected.title_note && (
                            <p className="text-xs text-muted-foreground mt-1">{selected.title_note}</p>
                          )}
                          {Array.isArray(selected.title_evidence) && selected.title_evidence.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {selected.title_evidence.map((q: string, i: number) => (
                                <li key={i} className="text-[11px] text-muted-foreground italic">"{q}"</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                      {Array.isArray(overview?.materials) && overview.materials.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                          {overview.materials.map((m: any, i: number) => (
                            <Badge key={i} variant="secondary" className="font-normal text-xs">
                              {m.name}{m.pages ? ` · p.${m.pages}` : ""}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {overview?.homework && (
                        <p className="text-xs flex items-start gap-1.5">
                          <NotebookPen className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <span className="font-semibold">Homework:</span>{" "}
                            <span className="text-muted-foreground">{overview.homework}</span>
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
                        <CardTitle className="text-sm flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-500" />
                          Lesson report
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          A grounded, chronological account built from the whole transcript — quotes are verbatim.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        {Array.isArray(lr.objectives) && lr.objectives.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <ListChecks className="h-3.5 w-3.5 text-emerald-500" /> Objectives worked on
                            </p>
                            <ul className="space-y-1">
                              {lr.objectives.map((o: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                  <span className="text-emerald-500 mt-0.5">•</span>
                                  <span>{o}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.chronology) && lr.chronology.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <Clock className="h-3.5 w-3.5 text-blue-500" /> How the lesson unfolded
                            </p>
                            <ol className="relative space-y-2 border-l border-border/60 pl-4">
                              {lr.chronology.map((c: any, i: number) => (
                                <li key={i} className="relative">
                                  <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-blue-500/70 ring-2 ring-background" />
                                  <p className="font-semibold text-foreground/90">{c.phase}</p>
                                  <p className="text-muted-foreground text-[13px] leading-relaxed">{c.detail}</p>
                                </li>
                              ))}
                            </ol>
                          </section>
                        )}

                        {Array.isArray(lr.engagement) && lr.engagement.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <MessageSquareText className="h-3.5 w-3.5 text-violet-500" /> Student moments
                            </p>
                            <ul className="space-y-2">
                              {lr.engagement.map((e: any, i: number) => (
                                <li key={i} className="rounded-lg bg-muted/40 px-3 py-2 ring-1 ring-border/50">
                                  <p className="text-[13px] italic text-foreground/90">
                                    "{e.quote}"
                                    {e.student && (
                                      <span className="not-italic font-semibold text-muted-foreground"> — {e.student}</span>
                                    )}
                                  </p>
                                  {e.note && <p className="text-xs text-muted-foreground mt-0.5">{e.note}</p>}
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.misconceptions) && lr.misconceptions.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Misconceptions & confusions
                            </p>
                            <ul className="space-y-1">
                              {lr.misconceptions.map((m: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                  <span className="text-amber-500 mt-0.5">•</span>
                                  <span>{m}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {Array.isArray(lr.interventions) && lr.interventions.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <Lightbulb className="h-3.5 w-3.5 text-yellow-500" /> Teacher feedback & interventions
                            </p>
                            <ul className="space-y-1">
                              {lr.interventions.map((it: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                  <span className="text-yellow-500 mt-0.5">•</span>
                                  <span>{it}</span>
                                </li>
                              ))}
                            </ul>
                          </section>
                        )}

                        {lr.general_understanding && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <GraduationCap className="h-3.5 w-3.5 text-teal-500" /> General understanding
                            </p>
                            <p className="text-muted-foreground text-[13px] leading-relaxed">{lr.general_understanding}</p>
                          </section>
                        )}

                        {Array.isArray(lr.next_steps) && lr.next_steps.length > 0 && (
                          <section>
                            <p className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground mb-1.5">
                              <ArrowRight className="h-3.5 w-3.5 text-pink-500" /> Next steps
                            </p>
                            <ul className="space-y-1">
                              {lr.next_steps.map((n: string, i: number) => (
                                <li key={i} className="flex items-start gap-1.5 text-muted-foreground">
                                  <span className="text-pink-500 mt-0.5">→</span>
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
                        <CardTitle className="text-sm flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-pink-500" />
                          Resources used
                          {resources.length > 0 && <Badge variant="secondary">{resources.length}</Badge>}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
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
                        <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors hover:bg-muted ${resourceUploading ? "opacity-50 pointer-events-none" : ""}`}>
                          {resourceUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                          Add photos
                        </span>
                      </label>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {resources.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No resource photos yet — add the pages or handouts you used and they'll appear on every student's lesson page.
                      </p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {resources.map((r) => (
                          <div key={r.id} className="relative group rounded-xl border overflow-hidden">
                            {r.url ? (
                              <a href={r.url} target="_blank" rel="noreferrer">
                                <img src={r.url} alt={r.caption || "resource"} loading="lazy" className="h-24 w-full object-cover" />
                              </a>
                            ) : (
                              <div className="h-24 w-full bg-muted flex items-center justify-center">
                                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <button
                              onClick={() => deleteResourceMutation.mutate(r)}
                              className="absolute top-1 right-1 rounded-md bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Deciphered point awards — teacher reviews, then applies */}
                {pointSuggestions.length > 0 && (
                  <Card className="border-amber-500/25">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Coins className="h-4 w-4 text-amber-500" />
                            Points called out in class
                            <Badge variant="secondary">
                              {pointSuggestions.filter((s) => s.status === "suggested").length} pending
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-1">
                            Awards the teacher announced during the lesson. Only students marked
                            present that day are eligible — nothing is granted until you apply it.
                          </CardDescription>
                        </div>
                        {eligibleSuggestions.length > 0 && (
                          <Button
                            size="sm"
                            className="gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                            disabled={applyAllMutation.isPending}
                            onClick={() => applyAllMutation.mutate()}
                          >
                            {applyAllMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3.5 w-3.5" />
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
                            className={`rounded-xl border p-2.5 flex items-start gap-3 ${
                              s.status === "applied" ? "opacity-70 bg-emerald-500/5 border-emerald-500/25"
                              : s.status === "dismissed" ? "opacity-45"
                              : "bg-card"
                            }`}
                          >
                            <span
                              className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${
                                s.points > 0
                                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {s.points > 0 ? `+${s.points}` : s.points}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold">
                                  {s.students?.full_name || (
                                    <span className="text-muted-foreground">“{s.speaker_label}” — not on roster</span>
                                  )}
                                </span>
                                {attended(s) ? (
                                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/40">
                                    {s.attendance_status}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/40 gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {s.attendance_status === "no_session" ? "no session that day" : s.attendance_status}
                                  </Badge>
                                )}
                                {s.status === "applied" && (
                                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-600 border-emerald-500/30">applied</Badge>
                                )}
                                {s.status === "dismissed" && (
                                  <Badge variant="outline" className="text-[10px]">dismissed</Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground italic mt-0.5 truncate" title={s.quote}>
                                “{s.quote}”{s.reason ? ` — ${s.reason}` : ""}
                              </p>
                            </div>
                            {isPending && (
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                  disabled={!canApply || applyMutation.isPending}
                                  title={!s.student_id ? "No roster match" : !canApply ? "Student wasn't present" : "Create the point transaction"}
                                  onClick={() => applyMutation.mutate(s)}
                                >
                                  <CheckCircle2 className="h-3 w-3" />Apply
                                </Button>
                                <Button
                                  size="sm" variant="ghost"
                                  className="h-7 gap-1 text-xs text-muted-foreground"
                                  disabled={dismissMutation.isPending}
                                  onClick={() => dismissMutation.mutate(s)}
                                >
                                  <XCircle className="h-3 w-3" />
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
                    <CardTitle className="text-sm flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-blue-500" />Engagement balance
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Share of student talk. Quiet students stand out immediately.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {studentMetrics.map((m, i) => {
                      const share = m.participation_share || 0;
                      const isQuiet = share < 0.5 / Math.max(studentMetrics.length, 1);
                      return (
                        <motion.div
                          key={m.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3"
                        >
                          <span className="w-32 truncate text-sm font-medium shrink-0">
                            {m.students?.full_name || m.speaker_label}
                          </span>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${(share / maxShare) * 100}%` }}
                              transition={{ duration: 0.5, delay: i * 0.04 }}
                              className={`h-full rounded-full ${isQuiet ? "bg-amber-400" : "bg-gradient-to-r from-cyan-500 to-blue-500"}`}
                            />
                          </div>
                          <span className="w-12 text-right text-xs text-muted-foreground shrink-0">
                            {Math.round(share * 100)}%
                          </span>
                          {m.cefr_estimate && (
                            <Badge variant="outline" className={`shrink-0 text-[10px] ${CEFR_COLORS[m.cefr_estimate] || ""}`}>
                              {m.cefr_estimate}
                            </Badge>
                          )}
                        </motion.div>
                      );
                    })}
                    {studentMetrics.length === 0 && (
                      <p className="text-xs text-muted-foreground py-3">No student speech matched in this transcript.</p>
                    )}
                    {unknownPct > 0 && (
                      <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1.5">
                        <HelpCircle className="h-3 w-3 shrink-0" />
                        {unknownPct}% of the audio couldn't be attributed to a specific speaker
                        (overlapping voices / mono recorder) and is excluded from these shares.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Per-student stat cards */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {studentMetrics.map((m) => (
                    <Card key={`card-${m.id}`}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm truncate">{m.students?.full_name || m.speaker_label}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            {m.edited_by_teacher && (
                              <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-500/40">edited</Badge>
                            )}
                            {m.cefr_estimate && (
                              <Badge variant="outline" className={CEFR_COLORS[m.cefr_estimate] || ""}>
                                {m.cefr_estimate}
                              </Badge>
                            )}
                            {editingMetricId !== m.id && (
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                title="Correct this feedback"
                                onClick={() => {
                                  setMetricDraft({
                                    contribution: m.contribution ?? "",
                                    teacher_feedback: m.teacher_feedback ?? "",
                                    recommendation: m.recommendation ?? "",
                                  });
                                  setEditingMetricId(m.id);
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Couldn't be matched to the roster — let the teacher say who it was */}
                        {!m.student_id && (
                          <div className="rounded-lg bg-amber-500/5 ring-1 ring-amber-500/25 p-2 space-y-1.5">
                            <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              "{m.speaker_label}" isn't on the roster — who was this?
                            </p>
                            <Select
                              onValueChange={(sid) => assignSpeakerMutation.mutate({ metric: m, studentId: sid })}
                              disabled={assignSpeakerMutation.isPending}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Assign to a student…" />
                              </SelectTrigger>
                              <SelectContent>
                                {classRoster.map((s: any) => (
                                  <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="rounded-xl bg-muted/50 p-2">
                            <MessageSquareText className="h-3.5 w-3.5 mx-auto text-blue-500" />
                            <p className="text-sm font-bold mt-0.5">{m.utterance_count}</p>
                            <p className="text-[10px] text-muted-foreground">turns</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-2">
                            <HelpCircle className="h-3.5 w-3.5 mx-auto text-violet-500" />
                            <p className="text-sm font-bold mt-0.5">{m.questions_asked}</p>
                            <p className="text-[10px] text-muted-foreground">questions</p>
                          </div>
                          <div className="rounded-xl bg-muted/50 p-2">
                            <AlertTriangle className="h-3.5 w-3.5 mx-auto text-amber-500" />
                            <p className="text-sm font-bold mt-0.5">{m.errors_count}</p>
                            <p className="text-[10px] text-muted-foreground">errors</p>
                          </div>
                        </div>
                        {Array.isArray(m.highlights) && m.highlights.length > 0 && (
                          <div className="pt-1 space-y-1">
                            {m.highlights.map((h: string, i: number) => (
                              <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                                <Star className="h-3 w-3 text-amber-400 shrink-0 mt-0.5" />{h}
                              </p>
                            ))}
                          </div>
                        )}

                        {/* AI lesson coaching: contribution, feedback, next step */}
                        {editingMetricId === m.id ? (
                          <div className="space-y-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Contribution</p>
                              <Textarea
                                value={metricDraft.contribution}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, contribution: e.target.value }))}
                                className="min-h-[56px] text-xs"
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Teacher feedback</p>
                              <Textarea
                                value={metricDraft.teacher_feedback}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, teacher_feedback: e.target.value }))}
                                className="min-h-[64px] text-xs"
                              />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Next step</p>
                              <Textarea
                                value={metricDraft.recommendation}
                                onChange={(e) => setMetricDraft((d) => ({ ...d, recommendation: e.target.value }))}
                                className="min-h-[44px] text-xs"
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm" className="h-7 text-xs gap-1"
                                disabled={saveMetricMutation.isPending}
                                onClick={() => saveMetricMutation.mutate(m.id)}
                              >
                                {saveMetricMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                Save
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingMetricId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                        <>
                        {m.contribution && (
                          <p className="text-xs text-muted-foreground pt-1">
                            <span className="font-semibold text-foreground">Contribution:</span> {m.contribution}
                          </p>
                        )}
                        {m.teacher_feedback && (
                          <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 ring-1 ring-blue-500/20 px-2.5 py-2">
                            <p className="text-[10px] uppercase tracking-wide font-bold text-blue-600 dark:text-blue-300 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />Teacher feedback
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{m.teacher_feedback}</p>
                          </div>
                        )}
                        {m.recommendation && (
                          <p className="text-xs pt-0.5">
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Next step:</span>{" "}
                            <span className="text-muted-foreground">{m.recommendation}</span>
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
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Flagged errors → flashcards
                        <Badge variant="secondary">{errors.length}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Each error was logged and turned into a spaced-repetition card on the student's deck.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="max-h-72">
                        <div className="space-y-2 pr-3">
                          {errors.map((e) => (
                            <div key={e.id} className="rounded-xl border p-2.5 text-sm">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-xs">{e.students?.full_name}</span>
                                <Badge variant="outline" className="text-[10px] capitalize">{e.error_type}</Badge>
                                {e.cefr_topic && (
                                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/40">
                                    {e.cefr_topic}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-red-500/90 line-through text-xs mt-1">{e.error_text}</p>
                              <p className="text-emerald-600 text-xs">{e.corrected_text}</p>
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
