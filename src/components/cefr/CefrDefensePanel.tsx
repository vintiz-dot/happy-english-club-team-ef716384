/**
 * CefrDefensePanel — teacher/admin control panel for the Level Defense flow.
 *
 * Set the student's working CEFR level → audit it against the platform's
 * collected evidence (transcripts, errors, vocabulary, history) → or assign
 * an adaptive, CEFR-aligned defense test the student takes to prove it.
 * Everything runs through the cefr-defense edge function; results also land
 * in cefr_assessments so the growth chart tells the whole story.
 */
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, Scale, FileQuestion,
  CheckCircle2, XCircle, Sparkles,
} from "lucide-react";

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];

const invokeDefense = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("cefr-defense", { body });
  if (error) {
    let detail = error.message;
    try {
      const b = await (error as any).context?.json?.();
      if (b?.error) detail = b.error;
    } catch { /* keep default */ }
    throw new Error(detail);
  }
  if (data?.success === false) throw new Error(data.error || "request failed");
  return data;
};

const statusBadge = (status?: string | null) => {
  switch (status) {
    case "supported":
      return <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><ShieldCheck className="h-3 w-3" />Evidence supports</Badge>;
    case "partially_supported":
      return <Badge className="bg-amber-500/15 text-amber-600 gap-1"><ShieldQuestion className="h-3 w-3" />Partially supported</Badge>;
    case "not_supported":
      return <Badge className="bg-red-500/15 text-red-600 gap-1"><ShieldAlert className="h-3 w-3" />Not supported</Badge>;
    case "test_assigned":
      return <Badge className="bg-blue-500/15 text-blue-600 gap-1"><FileQuestion className="h-3 w-3" />Defense test assigned</Badge>;
    case "defended":
      return <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><ShieldCheck className="h-3 w-3" />Level defended</Badge>;
    case "not_defended":
      return <Badge className="bg-red-500/15 text-red-600 gap-1"><ShieldAlert className="h-3 w-3" />Not defended</Badge>;
    default:
      return <Badge variant="secondary" className="gap-1"><ShieldQuestion className="h-3 w-3" />Unverified</Badge>;
  }
};

export function CefrDefensePanel({ studentId, classId }: { studentId: string; classId?: string | null }) {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<string>("");

  const { data: state, isLoading } = useQuery<any>({
    queryKey: ["cefr-defense", studentId],
    queryFn: () => invokeDefense({ action: "get_state", student_id: studentId }),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["cefr-defense", studentId] });
    queryClient.invalidateQueries({ queryKey: ["cefr-growth", studentId] });
  };

  const setLevelMutation = useMutation({
    mutationFn: () =>
      invokeDefense({ action: "set_level", student_id: studentId, class_id: classId ?? null, level }),
    onSuccess: () => { toast.success(`Level set to ${level}`); refresh(); },
    onError: (e: any) => toast.error("Couldn't set level", { description: e.message }),
  });

  const evidenceMutation = useMutation({
    mutationFn: () => invokeDefense({ action: "mine_evidence", student_id: studentId }),
    onSuccess: (d) => { toast.success(`Evidence audit: ${d.verdict?.verdict?.replaceAll("_", " ")}`); refresh(); },
    onError: (e: any) => toast.error("Evidence audit failed", { description: e.message }),
  });

  const testMutation = useMutation({
    mutationFn: () => invokeDefense({ action: "generate_test", student_id: studentId }),
    onSuccess: () => { toast.success("Defense test assigned — the student can take it from their portal"); refresh(); },
    onError: (e: any) => toast.error("Couldn't generate the test", { description: e.message }),
  });

  const claim = state?.claim;
  const verdict = claim?.evidence;
  const tests: any[] = state?.tests || [];
  const latestGraded = tests.find((t) => t.status === "graded");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Scale className="h-4 w-4 text-violet-500" />
              CEFR Level Defense
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Declare a working level, then let the AI audit the evidence — or have the student defend it in an adaptive test.
            </CardDescription>
          </div>
          {claim && (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-violet-600">{claim.claimed_level}</span>
              {statusBadge(claim.status)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin" />Loading…
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder={claim?.claimed_level || "Level…"} />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                size="sm" variant="outline"
                disabled={!level || setLevelMutation.isPending}
                onClick={() => setLevelMutation.mutate()}
              >
                {setLevelMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Set level"}
              </Button>
              {claim && (
                <>
                  <Button
                    size="sm" className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
                    disabled={evidenceMutation.isPending}
                    onClick={() => evidenceMutation.mutate()}
                  >
                    {evidenceMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Auditing…</>
                      : <><Sparkles className="h-3.5 w-3.5" />Audit evidence</>}
                  </Button>
                  <Button
                    size="sm" variant="outline" className="gap-1.5"
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate()}
                  >
                    {testMutation.isPending
                      ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Building test…</>
                      : <><FileQuestion className="h-3.5 w-3.5" />Assign defense test</>}
                  </Button>
                </>
              )}
            </div>

            {/* Evidence verdict */}
            {verdict && (
              <div className="rounded-xl border p-3 space-y-2 text-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Evidence audit</p>
                  <p className="text-xs text-muted-foreground">
                    Recommends <span className="font-bold text-foreground">{verdict.recommended_level}</span>
                    {typeof verdict.confidence === "number" && ` · ${Math.round(verdict.confidence * 100)}% confidence`}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{verdict.rationale}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(verdict.evidence_for || []).length > 0 && (
                    <div className="rounded-lg bg-emerald-500/5 ring-1 ring-emerald-500/20 p-2">
                      <p className="text-[11px] font-bold text-emerald-600 mb-1">Supports the level</p>
                      <ul className="space-y-1">
                        {verdict.evidence_for.map((e: any, i: number) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {e.point} <span className="opacity-60">({e.source})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(verdict.evidence_against || []).length > 0 && (
                    <div className="rounded-lg bg-amber-500/5 ring-1 ring-amber-500/20 p-2">
                      <p className="text-[11px] font-bold text-amber-600 mb-1">Challenges the level</p>
                      <ul className="space-y-1">
                        {verdict.evidence_against.map((e: any, i: number) => (
                          <li key={i} className="text-[11px] text-muted-foreground">• {e.point} <span className="opacity-60">({e.source})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Latest defense-test result */}
            {latestGraded?.result && (
              <div className="rounded-xl border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Defense test result</p>
                  {latestGraded.result.defended ? (
                    <Badge className="bg-emerald-500/15 text-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" />Defended {latestGraded.target_level}</Badge>
                  ) : (
                    <Badge className="bg-red-500/15 text-red-600 gap-1"><XCircle className="h-3 w-3" />Estimate: {latestGraded.result.level_estimate}</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{latestGraded.result.rationale}</p>
                {Array.isArray(latestGraded.result.next_steps) && latestGraded.result.next_steps.length > 0 && (
                  <ul className="space-y-0.5">
                    {latestGraded.result.next_steps.map((s: string, i: number) => (
                      <li key={i} className="text-[11px] text-muted-foreground">→ {s}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tests.some((t) => t.status !== "graded") && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <FileQuestion className="h-3 w-3" />
                A defense test is waiting for the student in their portal ("Defend my level").
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
