/**
 * BulkReportExport — pick a class, pick students, export their progress
 * reports as PDFs.
 *
 * Two separate jobs, deliberately kept separate because they cost very
 * different things:
 *
 *   GENERATE  calls the AI profiling engine once per student. It is slow and
 *             costs money, so it is opt-in, runs only for students you chose,
 *             and by default skips anyone who already has a report.
 *   EXPORT    renders the stored report to PDF in the browser. Free, fast,
 *             and repeatable.
 *
 * One student exports as a bare .pdf; several export as a single .zip.
 *
 * Every step is per-student fault-isolated: one student failing to generate
 * or render never aborts the batch, and the run reports exactly who failed
 * and why. A half-finished export that silently drops three children from a
 * class of twelve would be worse than an obvious failure.
 */
import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { useQuery } from "@tanstack/react-query";
import { flushSync } from "react-dom";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FileDown, Loader2, Sparkles, CheckCircle2, AlertCircle, Users, FileText,
} from "lucide-react";
import { ReportDocument } from "./ReportDocument";
import {
  nodeToPdfBlob, downloadBlob, safeFileName, A4_CONTENT_WIDTH_PX,
} from "@/lib/reportPdf";

interface RosterStudent {
  id: string;
  full_name: string;
}

interface ReportRow {
  id: string;
  student_id: string;
  report: any;
  narrative: string | null;
  period_start: string | null;
  period_end: string | null;
  source_counts: any;
  created_at: string;
}

type RunState =
  | { phase: "idle" }
  | { phase: "generating" | "exporting"; done: number; total: number; current: string };

interface Props {
  /** When set the class is fixed (teacher viewing one class) and the picker
   *  is hidden. Omit for the admin view, which chooses any class. */
  classId?: string;
  className?: string;
}

export function BulkReportExport({ classId: fixedClassId, className }: Props) {
  const { user } = useAuth();
  const [classId, setClassId] = useState<string>(fixedClassId ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generateMissing, setGenerateMissing] = useState(true);
  const [run, setRun] = useState<RunState>({ phase: "idle" });
  const [failures, setFailures] = useState<{ name: string; reason: string }[]>([]);
  const stageRef = useRef<HTMLDivElement>(null);

  const busy = run.phase !== "idle";

  // ── Classes (admin picker only) ──────────────────────────────────────
  const { data: classes = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["bulk-report-classes"],
    enabled: !fixedClassId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  // ── Roster for the chosen class ──────────────────────────────────────
  const { data: roster = [], isLoading: rosterLoading } = useQuery<RosterStudent[]>({
    queryKey: ["bulk-report-roster", classId],
    enabled: !!classId,
    queryFn: async () => {
      // "Currently enrolled" = no end date, or one still in the future. Same
      // rule the rest of the app uses; enrollments has no status column.
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("enrollments")
        .select("students!inner(id, full_name, is_active)")
        .eq("class_id", classId)
        .or(`end_date.is.null,end_date.gte.${today}`);
      if (error) throw error;
      return ((data || []) as any[])
        .map((e) => e.students)
        .filter((s: any) => s && s.is_active)
        .sort((a: any, b: any) => a.full_name.localeCompare(b.full_name));
    },
  });

  // ── Latest ready report per student, so the UI can show who is covered ─
  const studentIds = useMemo(() => roster.map((s) => s.id), [roster]);
  const { data: reportsByStudent = {}, refetch: refetchReports } = useQuery<Record<string, ReportRow>>({
    queryKey: ["bulk-report-latest", classId, studentIds.join(",")],
    enabled: studentIds.length > 0,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("student_reports")
        .select("id, student_id, report, narrative, period_start, period_end, source_counts, created_at")
        .in("student_id", studentIds)
        .eq("status", "ready")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // First row per student wins — the query is already newest-first.
      const map: Record<string, ReportRow> = {};
      for (const r of (data || []) as ReportRow[]) {
        if (!map[r.student_id]) map[r.student_id] = r;
      }
      return map;
    },
  });

  const selectedStudents = roster.filter((s) => selected.has(s.id));
  const missingCount = selectedStudents.filter((s) => !reportsByStudent[s.id]).length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(roster.map((s) => s.id)));
  const selectNone = () => setSelected(new Set());
  const selectWithReports = () =>
    setSelected(new Set(roster.filter((s) => reportsByStudent[s.id]).map((s) => s.id)));

  /** Generate one report and wait for it. Returns the fresh row or throws. */
  const generateFor = async (student: RosterStudent): Promise<void> => {
    if (!user) throw new Error("not signed in");
    const periodEnd = new Date().toISOString().slice(0, 10);
    const periodStart = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);

    const { data: row, error } = await (supabase as any)
      .from("student_reports")
      .insert({
        student_id: student.id,
        class_id: classId || null,
        generated_by: user.id,
        period_start: periodStart,
        period_end: periodEnd,
        status: "generating",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const { data: result, error: fnErr } = await supabase.functions.invoke(
      "generate-student-report",
      { body: { report_id: row.id } },
    );
    if (fnErr) {
      // invoke() only ever reports a generic "non-2xx"; the real reason is
      // in the body.
      let detail = fnErr.message;
      try {
        const b = await (fnErr as any).context?.json?.();
        if (b?.error) detail = b.error;
      } catch { /* keep the generic message */ }
      throw new Error(detail);
    }
    if (result?.success === false) throw new Error(result.error || "generation failed");
  };

  /**
   * Render one report off-screen and rasterise it.
   *
   * The node must be laid out at a real A4 width and actually attached to the
   * document — html2canvas cannot measure a `display:none` subtree — so the
   * stage sits off the left edge of the viewport instead of being hidden.
   */
  const renderPdf = async (student: RosterStudent, row: ReportRow): Promise<Blob> => {
    const host = document.createElement("div");
    host.style.width = `${A4_CONTENT_WIDTH_PX}px`;
    stageRef.current?.appendChild(host);
    const root = createRoot(host);
    try {
      // flushSync so the DOM exists before html2canvas measures it.
      flushSync(() => {
        root.render(
          <div style={{ width: A4_CONTENT_WIDTH_PX, padding: 24 }}>
            <ReportDocument
              studentName={student.full_name}
              report={row.report}
              latest={row}
            />
          </div>,
        );
      });
      // Let the logo and webfonts settle; a missing logo would otherwise be
      // captured as a broken image.
      await new Promise((r) => setTimeout(r, 120));
      await (document as any).fonts?.ready?.catch?.(() => {});
      return await nodeToPdfBlob(host);
    } finally {
      root.unmount();
      host.remove();
    }
  };

  const start = async () => {
    if (!selectedStudents.length) {
      toast.error("Choose at least one student");
      return;
    }
    setFailures([]);
    const failed: { name: string; reason: string }[] = [];

    // ── Phase 1: generate what is missing (opt-in) ─────────────────────
    if (generateMissing) {
      const todo = selectedStudents.filter((s) => !reportsByStudent[s.id]);
      for (let i = 0; i < todo.length; i++) {
        setRun({ phase: "generating", done: i, total: todo.length, current: todo[i].full_name });
        try {
          await generateFor(todo[i]);
        } catch (e: any) {
          failed.push({ name: todo[i].full_name, reason: e?.message || "generation failed" });
        }
      }
      if (todo.length) await refetchReports();
    }

    // Re-read after generation so newly created reports are included.
    const { data: fresh } = await (supabase as any)
      .from("student_reports")
      .select("id, student_id, report, narrative, period_start, period_end, source_counts, created_at")
      .in("student_id", selectedStudents.map((s) => s.id))
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    const latest: Record<string, ReportRow> = {};
    for (const r of ((fresh || []) as ReportRow[])) {
      if (!latest[r.student_id]) latest[r.student_id] = r;
    }

    // ── Phase 2: render PDFs ───────────────────────────────────────────
    const files: { name: string; blob: Blob }[] = [];
    const exportable = selectedStudents.filter((s) => latest[s.id]?.report);

    for (const s of selectedStudents) {
      if (!latest[s.id]?.report) {
        if (!failed.some((f) => f.name === s.full_name)) {
          failed.push({ name: s.full_name, reason: "no report available to export" });
        }
      }
    }

    for (let i = 0; i < exportable.length; i++) {
      const s = exportable[i];
      setRun({ phase: "exporting", done: i, total: exportable.length, current: s.full_name });
      try {
        const blob = await renderPdf(s, latest[s.id]);
        files.push({ name: `${safeFileName(s.full_name)} - Progress Report.pdf`, blob });
      } catch (e: any) {
        failed.push({ name: s.full_name, reason: e?.message || "could not render the PDF" });
      }
    }

    setRun({ phase: "idle" });
    setFailures(failed);

    if (!files.length) {
      toast.error("Nothing was exported", {
        description: failed[0]?.reason ?? "No reports were available for the selected students.",
      });
      return;
    }

    const className_ = classes.find((c) => c.id === classId)?.name ?? "Class";
    const stamp = new Date().toISOString().slice(0, 10);

    if (files.length === 1) {
      downloadBlob(files[0].blob, files[0].name);
    } else {
      const zip = new JSZip();
      for (const f of files) zip.file(f.name, f.blob);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${safeFileName(className_)} - Reports ${stamp}.zip`);
    }

    toast.success(
      `Exported ${files.length} report${files.length === 1 ? "" : "s"}`,
      failed.length
        ? { description: `${failed.length} could not be included — see the list below.` }
        : undefined,
    );
  };

  const progressPct =
    run.phase === "idle" || run.total === 0 ? 0 : Math.round((run.done / run.total) * 100);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5 text-violet-500" />
          Bulk report export
        </CardTitle>
        <CardDescription>
          Export progress reports as PDFs for a whole class, or just the students you pick. One
          student downloads a PDF; several download as a zip.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Class picker (admin only) */}
        {!fixedClassId && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1.5">Class</p>
            <Select
              value={classId}
              onValueChange={(v) => { setClassId(v); setSelected(new Set()); }}
              disabled={busy}
            >
              <SelectTrigger className="max-w-sm">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Roster */}
        {!classId ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Choose a class to see its students.
          </p>
        ) : rosterLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />Loading the roster…
          </p>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No active students are enrolled in this class.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="gap-1 font-normal">
                <Users className="h-3 w-3" />
                {selected.size} of {roster.length} selected
              </Badge>
              <Button variant="ghost" size="sm" onClick={selectAll} disabled={busy}>All</Button>
              <Button variant="ghost" size="sm" onClick={selectNone} disabled={busy}>None</Button>
              <Button variant="ghost" size="sm" onClick={selectWithReports} disabled={busy}>
                Only those with a report
              </Button>
            </div>

            <div className="rounded-xl border divide-y max-h-[320px] overflow-y-auto">
              {roster.map((s) => {
                const rep = reportsByStudent[s.id];
                return (
                  <label
                    key={s.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                      selected.has(s.id) ? "bg-violet-500/5" : "hover:bg-muted/50",
                      busy && "cursor-not-allowed opacity-70",
                    )}
                  >
                    <Checkbox
                      checked={selected.has(s.id)}
                      onCheckedChange={() => toggle(s.id)}
                      disabled={busy}
                    />
                    <span className="flex-1 min-w-0 text-sm font-medium truncate">{s.full_name}</span>
                    {rep ? (
                      <Badge variant="outline" className="gap-1 font-normal text-[10px] shrink-0">
                        <FileText className="h-3 w-3" />
                        {new Date(rep.created_at).toLocaleDateString()}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="font-normal text-[10px] shrink-0">
                        no report yet
                      </Badge>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Generate toggle */}
            <div className="flex items-start gap-3 rounded-xl border p-3">
              <Switch
                checked={generateMissing}
                onCheckedChange={setGenerateMissing}
                disabled={busy}
                className="mt-0.5"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">Generate reports that are missing first</p>
                <p className="text-xs text-muted-foreground">
                  Runs the AI profiling engine for selected students who have no report yet. This
                  takes roughly half a minute each and uses your OpenAI quota. Students who already
                  have a report are never regenerated.
                  {missingCount > 0 && (
                    <span className="text-amber-600 font-medium">
                      {" "}{missingCount} of your selection {missingCount === 1 ? "has" : "have"} no report yet.
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Progress. Narrowed on run.phase rather than the `busy` alias
                so TypeScript can see done/total exist on this variant. */}
            {run.phase !== "idle" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-500" />
                    {run.phase === "generating" ? "Generating" : "Building PDF"} — {run.current}
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {run.done}/{run.total}
                  </span>
                </div>
                <Progress value={progressPct} className="h-1.5" />
              </div>
            )}

            <Button
              onClick={start}
              disabled={busy || selected.size === 0}
              className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Working…</>
              ) : (
                <>
                  {generateMissing && missingCount > 0
                    ? <Sparkles className="h-4 w-4" />
                    : <FileDown className="h-4 w-4" />}
                  Export {selected.size || ""} report{selected.size === 1 ? "" : "s"}
                </>
              )}
            </Button>

            {/* Outcome */}
            {failures.length > 0 && !busy && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3 space-y-1.5">
                <p className="text-sm font-semibold text-amber-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {failures.length} student{failures.length === 1 ? "" : "s"} not exported
                </p>
                {failures.map((f, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{f.name}</span> — {f.reason}
                  </p>
                ))}
              </div>
            )}

            {!busy && failures.length === 0 && selected.size > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                {selected.size - missingCount} of {selected.size} selected already have a report
                ready to export.
              </p>
            )}
          </>
        )}
      </CardContent>

      {/*
        Off-screen render stage. html2canvas cannot measure a display:none
        subtree, so reports are laid out for real but parked outside the
        viewport. aria-hidden keeps them out of the accessibility tree.
      */}
      <div
        ref={stageRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: A4_CONTENT_WIDTH_PX,
          pointerEvents: "none",
        }}
      />
    </Card>
  );
}
