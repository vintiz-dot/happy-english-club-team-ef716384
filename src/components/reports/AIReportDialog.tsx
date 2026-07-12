/**
 * AIReportDialog — the professional AI reporting window.
 *
 * Packages everything the platform has collected about a student
 * (transcript metrics, error logs, vocabulary bank, OCR'd work samples,
 * attendance, points) and asks the profiling engine for a CEFR estimate,
 * skill matrix, strengths/weaknesses matrix, learning styles and a
 * parent-ready narrative. Reports are stored and can be published to the
 * student/family or printed.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Brain, Loader2, Sparkles, Printer, TrendingUp, TrendingDown, Compass, ListChecks,
} from "lucide-react";

interface Props {
  studentId: string;
  studentName: string;
  classId?: string | null;
  trigger?: React.ReactNode;
}

const SKILLS = ["speaking", "listening", "reading", "writing", "grammar", "vocabulary"] as const;

export function AIReportDialog({ studentId, studentName, classId, trigger }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: reports = [] } = useQuery<any[]>({
    queryKey: ["student-reports", studentId],
    enabled: open,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("student_reports")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const latest = reports.find((r) => r.status === "ready");

  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const periodEnd = new Date().toISOString().slice(0, 10);
      const periodStart = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
      const { data: row, error } = await (supabase as any)
        .from("student_reports")
        .insert({
          student_id: studentId,
          class_id: classId ?? null,
          generated_by: user.id,
          period_start: periodStart,
          period_end: periodEnd,
          status: "generating",
        })
        .select("id")
        .single();
      if (error) throw error;

      const { data: result, error: fnErr } = await supabase.functions.invoke("generate-student-report", {
        body: { report_id: row.id },
      });
      if (fnErr) throw fnErr;
      if (result?.success === false) throw new Error(result.error || "generation failed");
      return result;
    },
    onSuccess: () => {
      toast.success("Report generated");
      queryClient.invalidateQueries({ queryKey: ["student-reports", studentId] });
      queryClient.invalidateQueries({ queryKey: ["cefr-growth", studentId] });
    },
    onError: (e: any) => toast.error("Report failed", { description: e.message }),
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await (supabase as any)
        .from("student_reports")
        .update({ published })
        .eq("id", id);
      if (error) throw error;
      return published;
    },
    onSuccess: (published) => {
      toast.success(published ? "Published — visible to the student/family" : "Unpublished");
      queryClient.invalidateQueries({ queryKey: ["student-reports", studentId] });
    },
  });

  const report = latest?.report;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <span onClick={() => setOpen(true)}>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <Brain className="h-4 w-4 text-violet-500" />AI Report
          </Button>
        )}
      </span>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-violet-500" />
            AI Progress Report — {studentName}
          </DialogTitle>
          <DialogDescription>
            Evidence-based profile built from transcripts, error logs, vocabulary, work samples and attendance (last 90 days).
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate()}
          >
            {generateMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Profiling…</>
            ) : (
              <><Sparkles className="h-4 w-4" />{latest ? "Regenerate" : "Generate report"}</>
            )}
          </Button>
          {latest && (
            <>
              <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />Print
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Visible to student</span>
                <Switch
                  checked={!!latest.published}
                  onCheckedChange={(v) => publishMutation.mutate({ id: latest.id, published: v })}
                />
              </div>
            </>
          )}
        </div>

        {report && (
          <ScrollArea className="flex-1 min-h-0 -mx-2 px-2">
            <div className="space-y-4 py-2 print:text-black">
              {/* CEFR headline */}
              {report.cefr && (
                <div className="rounded-2xl border bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-4 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center text-xl font-black shadow-md shrink-0">
                    {report.cefr.level}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      Estimated CEFR level
                      {typeof report.cefr.confidence === "number" && (
                        <span className="text-muted-foreground font-normal">
                          {" "}· {Math.round(report.cefr.confidence * 100)}% confidence
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{report.cefr.rationale}</p>
                  </div>
                </div>
              )}

              {/* Skill matrix */}
              {report.skill_matrix && (
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-bold mb-3 flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-violet-500" />Skill matrix
                  </p>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {SKILLS.map((skill) => {
                      const s = report.skill_matrix[skill];
                      if (!s) return null;
                      return (
                        <div key={skill}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-semibold capitalize">{skill}</span>
                            <span className="text-muted-foreground">{s.score}/5</span>
                          </div>
                          <Progress value={(s.score / 5) * 100} className="h-1.5" />
                          {s.note && <p className="text-[11px] text-muted-foreground mt-1">{s.note}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths / weaknesses matrix */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" />Strengths
                  </p>
                  <div className="space-y-2">
                    {(report.strengths || []).map((s: any, i: number) => (
                      <div key={i}>
                        <p className="text-sm font-semibold">{s.area}</p>
                        <p className="text-xs text-muted-foreground">{s.evidence}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
                  <p className="text-sm font-bold text-amber-600 flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4" />Growth areas
                  </p>
                  <div className="space-y-2">
                    {(report.weaknesses || []).map((w: any, i: number) => (
                      <div key={i}>
                        <p className="text-sm font-semibold">{w.area}</p>
                        <p className="text-xs text-muted-foreground">{w.evidence}</p>
                        {w.recommendation && (
                          <p className="text-xs text-amber-600 mt-0.5">→ {w.recommendation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Learning styles + recommendations */}
              {(report.learning_styles?.length || report.recommendations?.length) && (
                <div className="rounded-2xl border p-4 space-y-3">
                  {report.learning_styles?.length > 0 && (
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2 mb-1.5">
                        <Compass className="h-4 w-4 text-blue-500" />Learning styles
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {report.learning_styles.map((l: string, i: number) => (
                          <Badge key={i} variant="secondary" className="font-normal">{l}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {report.recommendations?.length > 0 && (
                    <div>
                      <p className="text-sm font-bold mb-1.5">Next steps for the teacher</p>
                      <ul className="space-y-1">
                        {report.recommendations.map((r: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground flex gap-2">
                            <span className="text-violet-500 font-bold shrink-0">{i + 1}.</span>{r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Narrative */}
              {latest.narrative && (
                <div className="rounded-2xl border p-4">
                  <p className="text-sm font-bold mb-2">Report narrative</p>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
                    {latest.narrative}
                  </p>
                </div>
              )}

              {latest.source_counts && (
                <p className="text-[11px] text-muted-foreground text-center">
                  Evidence: {latest.source_counts.transcript_metrics} transcript metrics ·{" "}
                  {latest.source_counts.logged_errors} errors · {latest.source_counts.vocab_words} words ·{" "}
                  {latest.source_counts.approved_work_samples} work samples ·{" "}
                  {latest.source_counts.attendance_records} attendance records
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        {!report && !generateMutation.isPending && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No report yet for {studentName}. Generate one to build their language profile.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
