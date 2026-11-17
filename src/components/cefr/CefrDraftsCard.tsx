/**
 * CefrDraftsCard - CEFR levels an AI suggested, waiting for a teacher.
 *
 * generate-student-report (the AI progress report) and cefr-defense (the
 * evidence audit and the level-defence test) no longer write a level onto
 * the growth chart. They leave a staff-only draft in cefr_assessment_drafts
 * (migration 20261117150000); nothing reaches the child or the family until
 * a teacher approves it here (approve_cefr_draft, optionally with a level of
 * their own) or discards it. The database checks who may decide: an admin,
 * or staff of the draft's class / of a class the child is in.
 *
 * Shown on a student's page (studentId) and on a class page (classId).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react";

const LEVELS = ["Pre-A1", "A1", "A1+", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];

const SOURCE_LABEL: Record<string, string> = {
  ai_report: "AI progress report",
  level_defense_evidence: "Level check (evidence audit)",
  level_defense_test: "Level defence test",
};

interface DraftRow {
  id: string;
  student_id: string;
  class_id: string | null;
  source: string;
  level: string;
  confidence: number | null;
  evidence: string | null;
  assessed_at: string;
  held_row: unknown | null;
  students?: { full_name: string | null } | null;
}

interface Props {
  studentId?: string;
  classId?: string;
}

const rpcError = (error: any) => new Error(error?.message || "request failed");

export function CefrDraftsCard({ studentId, classId }: Props) {
  const queryClient = useQueryClient();
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const key = ["cefr-drafts", studentId ?? null, classId ?? null];

  const { data: drafts = [], isLoading, error } = useQuery<DraftRow[]>({
    queryKey: key,
    enabled: !!(studentId || classId),
    queryFn: async () => {
      let q = (supabase as any)
        .from("cefr_assessment_drafts")
        .select("id, student_id, class_id, source, level, confidence, evidence, assessed_at, held_row, students(full_name)")
        .eq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(50);
      if (studentId) q = q.eq("student_id", studentId);
      if (classId) q = q.eq("class_id", classId);
      const { data, error } = await q;
      if (error) throw rpcError(error);
      return (data || []) as DraftRow[];
    },
  });

  const refresh = (sid: string) => {
    queryClient.invalidateQueries({ queryKey: ["cefr-drafts"] });
    queryClient.invalidateQueries({ queryKey: ["cefr-growth", sid] });
  };

  const approve = useMutation({
    mutationFn: async (d: DraftRow) => {
      const level = chosen[d.id] ?? d.level;
      const { error } = await (supabase as any).rpc("approve_cefr_draft", { p_draft: d.id, p_level: level });
      if (error) throw rpcError(error);
      return { d, level };
    },
    onSuccess: ({ d, level }) => {
      toast.success(`Approved ${level} - now on the growth chart, and visible to the student and family`);
      refresh(d.student_id);
    },
    onError: (e: any) => toast.error("Couldn't approve", { description: e.message }),
  });

  const discard = useMutation({
    mutationFn: async (d: DraftRow) => {
      const { error } = await (supabase as any).rpc("discard_cefr_draft", { p_draft: d.id });
      if (error) throw rpcError(error);
      return d;
    },
    onSuccess: (d) => {
      toast.success("Discarded - nothing was shared");
      refresh(d.student_id);
    },
    onError: (e: any) => toast.error("Couldn't discard", { description: e.message }),
  });

  if (!isLoading && !error && drafts.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-hec-ink-soft" aria-hidden />
          CEFR levels waiting for your approval
        </CardTitle>
        <CardDescription className="text-xs">
          Suggested by the AI. None of these is on the growth chart or shown to the student or family until you approve it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-hec-ink-soft" aria-label="Loading" />}
        {error && <p className="text-hec-small text-hec-danger">Couldn't load the drafts: {(error as Error).message}</p>}
        {drafts.map((d) => {
          const busy = (approve.isPending && approve.variables?.id === d.id) || (discard.isPending && discard.variables?.id === d.id);
          const level = chosen[d.id] ?? d.level;
          return (
            <div key={d.id} className="rounded-hec-md border border-hec-line bg-hec-surface p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-hec-small">
                {!studentId && <span className="font-medium text-hec-ink">{d.students?.full_name ?? "Student"}</span>}
                <Badge variant="outline">{SOURCE_LABEL[d.source] ?? d.source}</Badge>
                <span className="text-hec-ink-soft">{d.assessed_at}</span>
                {d.held_row ? <Badge variant="outline">Taken off the chart until approved</Badge> : null}
              </div>
              <div className="text-hec-small text-hec-ink">
                AI suggests <span className="font-medium">{d.level}</span>
                {typeof d.confidence === "number" && <span className="text-hec-ink-soft"> (confidence {Math.round(d.confidence * 100)}%)</span>}
              </div>
              {d.evidence && <p className="text-hec-small text-hec-ink-soft whitespace-pre-wrap break-words">{d.evidence}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={level} onValueChange={(v) => setChosen((c) => ({ ...c, [d.id]: v }))}>
                  <SelectTrigger className="h-8 w-28" aria-label="Level to approve"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l} value={l}>{l}{l === d.level ? " (AI)" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={busy} onClick={() => approve.mutate(d)}>
                  <CheckCircle2 className="h-4 w-4 mr-1" aria-hidden />Approve {level}
                </Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => discard.mutate(d)}>
                  <XCircle className="h-4 w-4 mr-1" aria-hidden />Discard
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
