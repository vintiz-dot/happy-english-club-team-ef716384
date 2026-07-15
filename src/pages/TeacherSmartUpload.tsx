/**
 * TeacherSmartUpload — the OCR ingestion cockpit.
 *
 * Workflow 1 (Student Work): photograph physical work → Google Cloud Vision
 * reads it → the student is auto-identified from the page → the file is
 * routed to their directory → teacher reviews/approves with notes → the
 * student sees it on their profile.
 *
 * Workflow 2 (Vocab Scan): photograph a handwritten vocabulary page →
 * Vision extracts [word, meaning, example] → grammar is validated → Google
 * Custom Search fetches 2-3 images per word → new words land in the
 * student's personal word bank with points auto-awarded.
 */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ScanText, BookMarked, UploadCloud, Loader2, CheckCircle2, XCircle,
  Sparkles, User, ImageIcon, AlertTriangle, Eye, Check, ChevronsUpDown,
} from "lucide-react";

interface ClassOption { id: string; name: string }
interface StudentOption { id: string; full_name: string }

/**
 * Searchable student picker for the review queue. A plain <Select> is
 * unusable at 200+ students and was previously fed an empty list; this
 * combobox filters by name as you type and always reflects the full roster.
 */
function AssignStudentCombobox({
  students, value, onChange,
}: {
  students: StudentOption[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = students.find((s) => s.id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-8 w-full justify-between text-xs font-normal"
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.full_name : "Assign student…"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search students…" className="h-9" />
          <CommandList>
            <CommandEmpty>
              {students.length === 0 ? "Loading roster…" : "No student found."}
            </CommandEmpty>
            <CommandGroup>
              {students.map((s) => (
                <CommandItem
                  key={s.id}
                  value={s.full_name}
                  onSelect={() => { onChange(s.id); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === s.id ? "opacity-100" : "opacity-0")} />
                  {s.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

interface UploadJob {
  fileName: string;
  status: "uploading" | "processing" | "done" | "failed";
  message?: string;
  vocabResult?: any;
}

function useTeacherClasses(userId?: string) {
  return useQuery<ClassOption[]>({
    queryKey: ["smart-upload-classes", userId],
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
      // Admins see every active class.
      const { data } = await supabase
        .from("classes").select("id, name").eq("is_active", true).order("name");
      return data || [];
    },
  });
}

export default function TeacherSmartUpload() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [classId, setClassId] = useState<string>("");
  const [studentId, setStudentId] = useState<string>("");
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [reviewStudent, setReviewStudent] = useState<Record<string, string>>({});

  const { data: classes = [] } = useTeacherClasses(user?.id);

  const { data: students = [] } = useQuery<StudentOption[]>({
    queryKey: ["smart-upload-students", classId],
    enabled: !!classId,
    queryFn: async () => {
      // enrollments has no `status` column — "currently enrolled" means
      // end_date is null or still in the future, same pattern used
      // everywhere else in the app (ClassLeaderboardShared, OverviewStats, …).
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("enrollments")
        .select("students(id, full_name)")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (error) {
        console.error("smart-upload roster fetch failed:", error.message);
        toast.error("Couldn't load this class's roster", { description: error.message });
        return [];
      }
      return ((data || []) as any[])
        .map((r: any) => r.students)
        .filter(Boolean)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    },
  });

  // ── Review queue: everything OCR'd and waiting on the teacher ──────────
  const { data: reviewQueue = [], refetch: refetchQueue } = useQuery<any[]>({
    queryKey: ["student-work-review", user?.id],
    enabled: !!user?.id,
    refetchInterval: 15_000, // pipeline results appear without a reload
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_work")
        .select("*")
        .in("status", ["needs_review", "processing", "failed"])
        .order("created_at", { ascending: false })
        .limit(40);
      return data || [];
    },
  });

  // Assignment pool for the review queue. Deliberately NOT tied to the class
  // picker at the top of the page: a reviewer often has no class selected,
  // and low-confidence / "general" matches can belong to any student. Loads
  // the full active roster so the assign combobox always has options.
  const { data: assignableStudents = [] } = useQuery<StudentOption[]>({
    queryKey: ["smart-upload-assignable-students"],
    enabled: reviewQueue.some((w) => w.status === "needs_review"),
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      return (data || []) as StudentOption[];
    },
  });

  const signedUrls = useQuery<Record<string, string>>({
    queryKey: ["student-work-urls", reviewQueue.map((w) => w.id).join(",")],
    enabled: reviewQueue.length > 0,
    queryFn: async () => {
      const out: Record<string, string> = {};
      await Promise.all(
        reviewQueue.map(async (w) => {
          const { data } = await supabase.storage
            .from("student-work")
            .createSignedUrl(w.storage_path, 3600);
          if (data?.signedUrl) out[w.id] = data.signedUrl;
        }),
      );
      return out;
    },
  });

  const updateJob = (fileName: string, patch: Partial<UploadJob>) =>
    setJobs((prev) => prev.map((j) => (j.fileName === fileName ? { ...j, ...patch } : j)));

  // ── Upload + pipeline invocation ───────────────────────────────────────
  const runPipeline = async (files: FileList, workflow: "general" | "vocab") => {
    if (!user) return;
    if (!classId) { toast.error("Choose a class first"); return; }
    if (workflow === "vocab" && !studentId) { toast.error("Choose the student whose vocab page this is"); return; }

    for (const file of Array.from(files)) {
      setJobs((prev) => [...prev, { fileName: file.name, status: "uploading" }]);
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `incoming/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("student-work")
          .upload(path, file, { contentType: file.type || "image/jpeg" });
        if (upErr) throw upErr;

        const { data: row, error: insErr } = await (supabase as any)
          .from("student_work")
          .insert({
            uploaded_by: user.id,
            class_id: classId,
            student_id: workflow === "vocab" ? studentId : null,
            storage_path: path,
            original_filename: file.name,
            mime_type: file.type,
            workflow,
            status: "processing",
          })
          .select("id")
          .single();
        if (insErr) throw insErr;

        updateJob(file.name, { status: "processing", message: "Reading with Cloud Vision…" });

        const fn = workflow === "vocab" ? "ocr-vocab-scan" : "ocr-student-work";
        const { data: result, error: fnErr } = await supabase.functions.invoke(fn, {
          body:
            workflow === "vocab"
              ? { work_id: row.id, student_id: studentId, class_id: classId }
              : { work_id: row.id },
        });
        if (fnErr) throw fnErr;
        if (result?.success === false) throw new Error(result.error || "pipeline failed");

        if (workflow === "vocab") {
          const added = (result.words || []).filter((w: any) => w.status === "added" || w.status === "corrected");
          updateJob(file.name, {
            status: "done",
            message: `${added.length} word(s) added, +${result.points_awarded} pts`,
            vocabResult: result,
          });
          toast.success(`${file.name}: ${added.length} words added to the word bank`, {
            description: `+${result.points_awarded} points awarded automatically`,
          });
        } else {
          updateJob(file.name, {
            status: "done",
            message: result.detected_student_name
              ? `Matched: ${result.detected_student_name} (${Math.round((result.match_confidence || 0) * 100)}%)`
              : "No confident match — assign the student below",
          });
        }
      } catch (err: any) {
        console.error("smart-upload pipeline error:", err);
        updateJob(file.name, { status: "failed", message: err.message });
        toast.error(`${file.name} failed`, { description: err.message });
      }
    }
    refetchQueue();
    queryClient.invalidateQueries({ queryKey: ["student-work-review"] });
  };

  // ── AI feedback: image + student journey context → personalized note ──
  const [feedbackForId, setFeedbackForId] = useState<string | null>(null);
  const feedbackMutation = useMutation({
    mutationFn: async (work: any) => {
      const chosenStudent = reviewStudent[work.id] || work.student_id;
      if (!chosenStudent) throw new Error("Assign a student first — feedback is personalized to their journey");
      setFeedbackForId(work.id);
      const { data, error } = await supabase.functions.invoke("generate-work-feedback", {
        body: { work_id: work.id, student_id: chosenStudent },
      });
      if (error) throw error;
      if (data?.success === false) throw new Error(data.error || "feedback generation failed");
      return { workId: work.id, feedback: data.feedback as string, celebrated: data.celebrated as string | null };
    },
    onSuccess: ({ workId, feedback, celebrated }) => {
      setReviewNotes((p) => ({ ...p, [workId]: feedback }));
      toast.success("AI feedback drafted — edit freely before approving", {
        description: celebrated ? `Celebrates progress on: ${celebrated}` : undefined,
      });
    },
    onError: (e: any) => toast.error("AI feedback failed", { description: e.message }),
    onSettled: () => setFeedbackForId(null),
  });

  // ── Review actions ─────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: async ({ work, decision }: { work: any; decision: "approved" | "rejected" }) => {
      const chosenStudent = reviewStudent[work.id] || work.student_id;
      if (decision === "approved" && !chosenStudent) {
        throw new Error("Assign a student before approving");
      }
      const { error } = await (supabase as any)
        .from("student_work")
        .update({
          status: decision,
          student_id: chosenStudent,
          // Falls back to the AI draft shown in the box when untouched.
          teacher_notes: reviewNotes[work.id] ?? work.teacher_notes ?? work.ai_feedback,
          approved_by: user?.id,
          approved_at: decision === "approved" ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", work.id);
      if (error) throw error;
      return decision;
    },
    onSuccess: (decision, { work }) => {
      toast.success(decision === "approved" ? "Approved — now visible on the student's profile" : "Rejected");
      refetchQueue();
      // Approved work is new journey evidence — refresh the living profile
      // in the background (fire-and-forget).
      if (decision === "approved") {
        const sid = reviewStudent[work.id] || work.student_id;
        if (sid) {
          supabase.functions
            .invoke("refresh-student-profile", { body: { student_id: sid } })
            .catch(() => {});
        }
      }
    },
    onError: (e: any) => toast.error("Review failed", { description: e.message }),
  });

  const activeJobs = useMemo(() => jobs.slice(-8).reverse(), [jobs]);

  return (
    <Layout title="Smart Upload">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
            <ScanText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Smart Upload</h1>
            <p className="text-sm text-muted-foreground">
              Photograph student work — Cloud Vision reads it, routes it, and indexes it for reports.
            </p>
          </div>
        </div>

        {/* Context pickers */}
        <Card>
          <CardContent className="pt-6 flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Class</p>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                Student <span className="font-normal">(required for vocab scans)</span>
              </p>
              <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Auto-detect from the page" /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="general">
          <TabsList className="grid grid-cols-2 w-full md:w-96">
            <TabsTrigger value="general" className="gap-1.5">
              <ScanText className="h-4 w-4" />Student Work
            </TabsTrigger>
            <TabsTrigger value="vocab" className="gap-1.5">
              <BookMarked className="h-4 w-4" />Vocab Scan
            </TabsTrigger>
          </TabsList>

          {(["general", "vocab"] as const).map((workflow) => {
            const disabledReason = !classId
              ? "Select a class above first"
              : workflow === "vocab" && !studentId
                ? "Select a student above first — vocab scans need to know whose word bank to update"
                : null;
            const isDisabled = !!disabledReason;

            return (
              <TabsContent key={workflow} value={workflow}>
                <label
                  className={cn(
                    "mt-2 flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-3xl p-10 transition-colors",
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "cursor-pointer hover:border-violet-400 hover:bg-violet-500/5",
                  )}
                  onClick={(e) => {
                    // A disabled <input> silently swallows the click — surface
                    // *why* instead of leaving the box looking broken.
                    if (isDisabled) {
                      e.preventDefault();
                      toast.error(disabledReason!);
                    }
                  }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    className="hidden"
                    disabled={isDisabled}
                    onChange={(e) => {
                      if (e.target.files?.length) runPipeline(e.target.files, workflow);
                      e.target.value = "";
                    }}
                  />
                  <UploadCloud className={cn("h-10 w-10", isDisabled ? "text-muted-foreground" : "text-violet-500")} />
                  <div className="text-center">
                    <p className="font-semibold">
                      {workflow === "vocab" ? "Upload handwritten vocabulary pages" : "Upload photos of student work"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {workflow === "vocab"
                        ? "Words, meanings & example sentences are extracted, validated, illustrated and saved — points awarded automatically."
                        : "The student's name is detected on the page and the file is routed to their folder for your approval."}
                    </p>
                    {disabledReason && (
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2 flex items-center justify-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{disabledReason}
                      </p>
                    )}
                  </div>
                </label>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Live pipeline progress */}
        <AnimatePresence>
          {activeJobs.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-500" />Pipeline activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {activeJobs.map((j, i) => (
                    <div key={`${j.fileName}-${i}`} className="flex items-center gap-3 text-sm">
                      {j.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      ) : j.status === "failed" ? (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      ) : (
                        <Loader2 className="h-4 w-4 animate-spin text-violet-500 shrink-0" />
                      )}
                      <span className="font-medium truncate max-w-[180px]">{j.fileName}</span>
                      <span className="text-muted-foreground text-xs truncate">{j.message}</span>
                    </div>
                  ))}
                  {/* Vocab word chips from the most recent scans */}
                  {activeJobs.filter((j) => j.vocabResult).map((j, i) => (
                    <div key={`words-${i}`} className="flex flex-wrap gap-1.5 pt-1">
                      {(j.vocabResult.words || []).map((w: any, k: number) => (
                        <Badge
                          key={k}
                          variant="outline"
                          className={
                            w.status === "added" ? "border-emerald-500/40 text-emerald-600"
                            : w.status === "corrected" ? "border-amber-500/40 text-amber-600"
                            : w.status === "duplicate" ? "border-muted text-muted-foreground line-through"
                            : "border-red-500/40 text-red-500"
                          }
                          title={w.status === "corrected" ? `Corrected: ${w.corrected_example}` : w.meaning}
                        >
                          {w.word}
                          {w.images?.length > 0 && <ImageIcon className="h-3 w-3 ml-1" />}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Review & approve queue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Eye className="h-4 w-4 text-violet-500" />
              Review queue
              {reviewQueue.length > 0 && <Badge variant="secondary">{reviewQueue.length}</Badge>}
            </CardTitle>
            <CardDescription>
              Approve to publish onto the student's profile (with your notes). Unmatched pages can be assigned manually.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reviewQueue.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nothing waiting for review. Uploaded work appears here seconds after OCR completes.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {reviewQueue.map((w) => (
                  <div key={w.id} className="border rounded-2xl p-3 space-y-2 bg-card">
                    <div className="flex items-start gap-3">
                      {signedUrls.data?.[w.id] ? (
                        <a href={signedUrls.data[w.id]} target="_blank" rel="noreferrer" className="shrink-0">
                          <img
                            src={signedUrls.data[w.id]}
                            alt={w.original_filename || "student work"}
                            className="h-20 w-20 object-cover rounded-xl border"
                          />
                        </a>
                      ) : (
                        <div className="h-20 w-20 rounded-xl border bg-muted flex items-center justify-center shrink-0">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] uppercase">{w.workflow}</Badge>
                          {w.status === "processing" && (
                            <Badge className="bg-violet-500/15 text-violet-600 border-violet-500/30 gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />OCR running
                            </Badge>
                          )}
                          {w.status === "failed" && (
                            <Badge className="bg-red-500/15 text-red-600 border-red-500/30 gap-1">
                              <AlertTriangle className="h-3 w-3" />{w.error_message?.slice(0, 40) || "failed"}
                            </Badge>
                          )}
                          {w.detected_student_name && (
                            <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1">
                              <User className="h-3 w-3" />
                              {w.detected_student_name} · {Math.round((w.match_confidence || 0) * 100)}%
                            </Badge>
                          )}
                        </div>
                        {w.ocr_text && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3" title={w.ocr_text}>
                            {w.ocr_text}
                          </p>
                        )}
                      </div>
                    </div>

                    {w.status === "needs_review" && (
                      <>
                        <AssignStudentCombobox
                          students={assignableStudents}
                          value={reviewStudent[w.id] || w.student_id || ""}
                          onChange={(id) => setReviewStudent((p) => ({ ...p, [w.id]: id }))}
                        />
                        <div className="relative">
                          <Textarea
                            placeholder="Teacher notes for the student — or let AI draft them…"
                            className="min-h-[64px] text-xs pr-9"
                            value={reviewNotes[w.id] ?? w.ai_feedback ?? ""}
                            onChange={(e) => setReviewNotes((p) => ({ ...p, [w.id]: e.target.value }))}
                          />
                          <button
                            type="button"
                            title="Draft personalized feedback with AI (uses the image + this student's learning journey)"
                            disabled={feedbackMutation.isPending}
                            onClick={() => feedbackMutation.mutate(w)}
                            className="absolute top-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-lg text-white bg-gradient-to-br from-violet-500 to-indigo-600 shadow-[0_3px_10px_-3px_rgba(139,92,246,0.7)] transition-transform hover:scale-110 active:scale-95 disabled:opacity-50"
                          >
                            {feedbackForId === w.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ work: w, decision: "approved" })}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />Approve & publish
                          </Button>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1 text-red-600 hover:text-red-700"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ work: w, decision: "rejected" })}
                          >
                            <XCircle className="h-3.5 w-3.5" />Reject
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
