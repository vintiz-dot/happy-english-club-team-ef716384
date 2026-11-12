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
import { useIvory } from "@/hooks/useIvory";
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

// Rendered on the staff student page (not flipped yet) and, later, everywhere: `ivory` picks the class set.
const BADGE_TONES = {
  old: {
    good: "bg-emerald-500/15 text-emerald-600 gap-1",
    warn: "bg-amber-500/15 text-amber-600 gap-1",
    bad: "bg-red-500/15 text-red-600 gap-1",
    info: "bg-blue-500/15 text-blue-600 gap-1",
  },
  ivory: {
    good: "gap-1 border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
    warn: "gap-1 border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
    bad: "gap-1 border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
    info: "gap-1 border-hec-line bg-hec-sunken text-hec-ink-soft",
  },
};

const statusBadge = (status: string | null | undefined, ivory: boolean) => {
  const T = ivory ? BADGE_TONES.ivory : BADGE_TONES.old;
  switch (status) {
    case "supported":
      return <Badge className={T.good}><ShieldCheck className="h-3 w-3" />Evidence supports</Badge>;
    case "partially_supported":
      return <Badge className={T.warn}><ShieldQuestion className="h-3 w-3" />Partially supported</Badge>;
    case "not_supported":
      return <Badge className={T.bad}><ShieldAlert className="h-3 w-3" />Not supported</Badge>;
    case "test_assigned":
      return <Badge className={T.info}><FileQuestion className="h-3 w-3" />Defense test assigned</Badge>;
    case "defended":
      return <Badge className={T.good}><ShieldCheck className="h-3 w-3" />Level defended</Badge>;
    case "not_defended":
      return <Badge className={T.bad}><ShieldAlert className="h-3 w-3" />Not defended</Badge>;
    default:
      return <Badge variant="secondary" className="gap-1"><ShieldQuestion className="h-3 w-3" />Unverified</Badge>;
  }
};

export function CefrDefensePanel({ studentId, classId }: { studentId: string; classId?: string | null }) {
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const [level, setLevel] = useState<string>("");
  const k = ivory
    ? {
        icon: "h-4 w-4 text-hec-ink-soft",
        level: "font-display text-hec-h1 font-medium text-hec-brass",
        audit: "gap-1.5",
        box: "rounded-hec-md border border-hec-line p-3 space-y-2 text-hec-small",
        label: "text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft",
        muted: "text-hec-small text-hec-ink-soft",
        body: "text-hec-small text-hec-ink-soft",
        strong: "font-semibold text-hec-ink",
        forBox: "rounded-hec-sm border border-hec-leaf/30 bg-hec-leaf-tint p-3",
        forTitle: "mb-1 text-hec-caption font-medium text-hec-leaf",
        againstBox: "rounded-hec-sm border border-hec-warn/30 bg-hec-warn-tint p-3",
        againstTitle: "mb-1 text-hec-caption font-medium text-hec-warn",
        item: "text-hec-caption text-hec-ink-soft",
        wait: "flex items-center gap-1.5 text-hec-caption text-hec-ink-soft",
      }
    : {
        icon: "h-4 w-4 text-violet-500",
        level: "text-2xl font-black text-violet-600",
        audit: "gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white",
        box: "rounded-xl border p-3 space-y-2 text-sm",
        label: "font-semibold text-xs uppercase tracking-wide text-muted-foreground",
        muted: "text-xs text-muted-foreground",
        body: "text-xs text-muted-foreground leading-relaxed",
        strong: "font-bold text-foreground",
        forBox: "rounded-lg bg-emerald-500/5 ring-1 ring-emerald-500/20 p-2",
        forTitle: "text-[11px] font-bold text-emerald-600 mb-1",
        againstBox: "rounded-lg bg-amber-500/5 ring-1 ring-amber-500/20 p-2",
        againstTitle: "text-[11px] font-bold text-amber-600 mb-1",
        item: "text-[11px] text-muted-foreground",
        wait: "text-[11px] text-muted-foreground flex items-center gap-1.5",
      };

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
              <Scale className={k.icon} />
              CEFR Level Defense
            </CardTitle>
            <CardDescription className={ivory ? "mt-1 text-hec-small" : "text-xs mt-1"}>
              Declare a working level, then let the AI audit the evidence — or have the student defend it in an adaptive test.
            </CardDescription>
          </div>
          {claim && (
            <div className="flex items-center gap-2">
              <span className={k.level}>{claim.claimed_level}</span>
              {statusBadge(claim.status, ivory)}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className={ivory ? "flex items-center gap-2 py-2 text-hec-small text-hec-ink-soft" : "flex items-center gap-2 text-sm text-muted-foreground py-2"}>
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
                    size="sm" className={k.audit}
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
              <div className={k.box}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className={k.label}>Evidence audit</p>
                  <p className={k.muted}>
                    Recommends <span className={k.strong}>{verdict.recommended_level}</span>
                    {typeof verdict.confidence === "number" && ` · ${Math.round(verdict.confidence * 100)}% confidence`}
                  </p>
                </div>
                <p className={k.body}>{verdict.rationale}</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {(verdict.evidence_for || []).length > 0 && (
                    <div className={k.forBox}>
                      <p className={k.forTitle}>Supports the level</p>
                      <ul className="space-y-1">
                        {verdict.evidence_for.map((e: any, i: number) => (
                          <li key={i} className={k.item}>• {e.point} <span className="opacity-60">({e.source})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(verdict.evidence_against || []).length > 0 && (
                    <div className={k.againstBox}>
                      <p className={k.againstTitle}>Challenges the level</p>
                      <ul className="space-y-1">
                        {verdict.evidence_against.map((e: any, i: number) => (
                          <li key={i} className={k.item}>• {e.point} <span className="opacity-60">({e.source})</span></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Latest defense-test result */}
            {latestGraded?.result && (
              <div className={k.box}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={k.label}>Defense test result</p>
                  {latestGraded.result.defended ? (
                    <Badge className={BADGE_TONES[ivory ? "ivory" : "old"].good}><CheckCircle2 className="h-3 w-3" />Defended {latestGraded.target_level}</Badge>
                  ) : (
                    <Badge className={BADGE_TONES[ivory ? "ivory" : "old"].bad}><XCircle className="h-3 w-3" />Estimate: {latestGraded.result.level_estimate}</Badge>
                  )}
                </div>
                <p className={k.body}>{latestGraded.result.rationale}</p>
                {Array.isArray(latestGraded.result.next_steps) && latestGraded.result.next_steps.length > 0 && (
                  <ul className="space-y-0.5">
                    {latestGraded.result.next_steps.map((s: string, i: number) => (
                      <li key={i} className={k.item}>→ {s}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tests.some((t) => t.status !== "graded") && (
              <p className={k.wait}>
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
