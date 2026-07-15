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
} from "lucide-react";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: classes = [] } = useMyClasses(user?.id);

  const { data: transcripts = [] } = useQuery<any[]>({
    queryKey: ["class-transcripts", classId],
    enabled: !!classId,
    refetchInterval: (q) =>
      (q.state.data as any[] | undefined)?.some((t) => t.status === "processing") ? 4000 : false,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("class_transcripts")
        .select("id, title, transcript_date, status, summary, error_message, created_at")
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
      if (fnErr) throw fnErr;
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      return { id: row.id, result };
    },
    onSuccess: ({ id, result }) => {
      toast.success("Transcript analyzed", {
        description: `${result.matched_students} students matched · ${result.errors_logged} errors logged to SRS decks`,
      });
      setRawText("");
      setTitle("");
      setSelectedId(id);
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
    },
    onError: (e: any) => toast.error("Analysis failed", { description: e.message }),
  });

  // Re-run analysis on an already-stored transcript — no re-paste needed.
  // Fixes transcripts analyzed before the roster-matching bug fix (a
  // fabricated enrollments.status filter silently matched zero students).
  const reanalyzeMutation = useMutation({
    mutationFn: async (transcriptId: string) => {
      const { data: result, error } = await supabase.functions.invoke("analyze-transcript", {
        body: { transcript_id: transcriptId },
      });
      if (error) throw error;
      if (result?.success === false) throw new Error(result.error || "analysis failed");
      return result;
    },
    onSuccess: (result) => {
      toast.success("Re-analyzed", {
        description: `${result.matched_students} students matched · ${result.errors_logged} errors logged`,
      });
      queryClient.invalidateQueries({ queryKey: ["class-transcripts", classId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-metrics", selectedId] });
      queryClient.invalidateQueries({ queryKey: ["transcript-errors", selectedId] });
    },
    onError: (e: any) => toast.error("Re-analysis failed", { description: e.message }),
  });

  const selected = transcripts.find((t) => t.id === selectedId);
  const studentMetrics = metrics.filter((m) => !m.is_teacher);
  const maxShare = Math.max(...studentMetrics.map((m) => m.participation_share || 0), 0.0001);

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
              Upload the lesson transcript — engagement, CEFR signals and error logs are extracted instantly.
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
            </div>
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
                    {t.status === "processing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
                    ) : t.status === "failed" ? (
                      <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
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
                <div className="flex items-center justify-end">
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
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-blue-500" />Lesson summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">{selected.summary}</p>
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
                  </CardContent>
                </Card>

                {/* Per-student stat cards */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {studentMetrics.map((m) => (
                    <Card key={`card-${m.id}`}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-sm truncate">{m.students?.full_name || m.speaker_label}</p>
                          {m.cefr_estimate && (
                            <Badge variant="outline" className={CEFR_COLORS[m.cefr_estimate] || ""}>
                              {m.cefr_estimate}
                            </Badge>
                          )}
                        </div>
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
