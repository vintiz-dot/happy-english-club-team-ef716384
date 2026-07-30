/**
 * AIReportDialog — the professional AI reporting window.
 *
 * Packages everything the platform has collected about a student
 * (transcript metrics, error logs, vocabulary bank, OCR'd work samples,
 * attendance, points) and asks the profiling engine for a CEFR estimate,
 * skill matrix, strengths/weaknesses matrix, learning styles and a
 * parent-ready narrative. Reports are stored and can be published to the
 * student/family or printed.
 *
 * Printing: the report renders twice — once inside the dialog (scrollable)
 * and once into a hidden print-only portal attached under <body>
 * (#hec-print-report). @media print rules in index.css hide everything
 * else, so the FULL branded report prints instead of one clipped
 * dialog-viewport of it.
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Brain, Loader2, Sparkles, Printer } from "lucide-react";
// Layout lives in ReportDocument so the dialog, the print copy and the bulk
// PDF exporter can never drift apart.
import { BrandHeader, ReportBody } from "./ReportDocument";

interface Props {
  studentId: string;
  studentName: string;
  classId?: string | null;
  trigger?: React.ReactNode;
}

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
          // Plain overflow scroll — Radix ScrollArea inside a flex dialog
          // sometimes refused to scroll, which cut off the lower sections.
          <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
            <div className="space-y-4 py-2">
              <BrandHeader
                studentName={studentName}
                periodStart={latest?.period_start}
                periodEnd={latest?.period_end}
              />
              <ReportBody report={report} latest={latest} />
            </div>
          </div>
        )}

        {!report && !generateMutation.isPending && (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No report yet for {studentName}. Generate one to build their language profile.
          </div>
        )}
      </DialogContent>

      {/* Hidden print copy — the ONLY element visible on paper. Attached
          under <body> so index.css can hide every sibling during print. */}
      {report &&
        createPortal(
          <div id="hec-print-report" className="hidden bg-white text-black p-2">
            <div className="space-y-4">
              <BrandHeader
                studentName={studentName}
                periodStart={latest?.period_start}
                periodEnd={latest?.period_end}
              />
              <ReportBody report={report} latest={latest} />
              <p className="text-[10px] text-center print-muted">
                Generated by Happy English Club · hanoienglish.com · {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>,
          document.body,
        )}
    </Dialog>
  );
}
