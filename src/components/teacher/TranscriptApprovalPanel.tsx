/**
 * TranscriptApprovalPanel - the teacher's approval step for an analysed
 * lesson (D-26).
 *
 * analyze-transcript leaves a DRAFT that only the class's staff can read:
 * each speaker with a suggested child (low / medium / high confidence), the
 * drafted errors and CEFR estimate, and a draft lesson overview. Nothing
 * reaches a child or a family until the teacher presses Approve, and then
 * only what is chosen here: approve_transcript_analysis publishes it in one
 * transaction. A low suggestion is never pre-selected (src/lib/transcriptReview.ts).
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle2, Loader2, ShieldCheck, Undo2, UserRoundSearch } from "lucide-react";
import {
  CEFR_LEVELS, CONFIDENCE_TEXT, buildAssignments, initialChoices, isAssignable, isLegacyRefusal, reviewState,
  type MetricRow, type SpeakerChoice, type SuggestionRow,
} from "@/lib/transcriptReview";

const UNKNOWN = "__unknown__";
const NO_LEVEL = "__none__";

interface Props {
  transcript: any;
  metrics: MetricRow[];
  suggestions: SuggestionRow[];
  approval: any | null;
  roster: Array<{ id: string; full_name: string }>;
  onChanged: () => void;
}

export default function TranscriptApprovalPanel({ transcript, metrics, suggestions, approval, roster, onChanged }: Props) {
  const state = reviewState(transcript, approval);
  const speakers = useMemo(() => metrics.filter(isAssignable), [metrics]);
  const byMetric = useMemo(() => new Map(suggestions.map((s) => [s.metric_id, s])), [suggestions]);
  const [choices, setChoices] = useState<Record<string, SpeakerChoice>>({});

  // Start again whenever the lesson, its drafts or its approval change.
  const seed = `${transcript?.id}|${metrics.map((m) => `${m.id}:${m.student_id ?? ""}`).join(",")}|${suggestions.length}|${approval?.approved_at ?? ""}|${approval?.withdrawn_at ?? ""}`;
  useEffect(() => {
    setChoices(initialChoices(metrics, suggestions));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  const nameOf = (id: string | null | undefined) => roster.find((r) => r.id === id)?.full_name ?? null;
  const setChoice = (metricId: string, patch: Partial<SpeakerChoice>) =>
    setChoices((c) => ({ ...c, [metricId]: { ...c[metricId], ...patch } }));

  const approveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildAssignments(metrics, suggestions, choices);
      const run = (replace: boolean) =>
        (supabase as any).rpc("approve_transcript_analysis", {
          p_transcript: transcript.id,
          p_assignments: payload,
          p_overview: null,
          p_replace_legacy: replace,
        });
      let { data, error } = await run(false);
      if (error && isLegacyRefusal(error)) {
        const yes = window.confirm(
          "This lesson was shared with families by the earlier automatic analysis, before approval existed.\n\n" +
            "Replace what it shared with what you have chosen here? (A copy of the old rows is kept in the approval record.)",
        );
        if (!yes) return null;
        ({ data, error } = await run(true));
      }
      if (error) throw new Error(error.message);
      return data as { students?: string[]; errors_published?: number; cefr_points?: number } | null;
    },
    onSuccess: (data) => {
      if (!data) return;
      const kids = data.students?.length ?? 0;
      toast.success("Approved and shared", {
        description: `${kids} child${kids === 1 ? "" : "ren"} · ${data.errors_published ?? 0} practice point(s) · ${data.cefr_points ?? 0} level(s). Families now see this lesson.`,
      });
      // Their profiles summarise what was just published.
      for (const sid of data.students ?? []) {
        supabase.functions.invoke("refresh-student-profile", { body: { student_id: sid } }).catch(() => {});
      }
      onChanged();
    },
    onError: (e: any) => toast.error("Couldn't approve", { description: e.message }),
  });

  const withdrawMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("withdraw_transcript_approval", { p_transcript: transcript.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Approval withdrawn", { description: "Families and children no longer see this lesson's results." });
      onChanged();
    },
    onError: (e: any) => toast.error("Couldn't withdraw", { description: e.message }),
  });

  if (state === "processing" || state === "failed") return null;
  const approved = state === "approved";
  const busy = approveMutation.isPending || withdrawMutation.isPending;

  return (
    <Card className={approved ? "border-hec-leaf/30" : "border-hec-brass/40"}>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex flex-wrap items-center gap-2">
              <ShieldCheck className="h-5 w-5 shrink-0 text-hec-ink-soft" />
              Teacher approval
              {approved ? (
                <Badge variant="outline" className="border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">approved and shared</Badge>
              ) : state === "legacy" ? (
                <Badge variant="outline" className="border-hec-warn/30 bg-hec-warn-tint text-hec-warn">shared automatically (before approval existed)</Badge>
              ) : (
                <Badge variant="outline" className="border-hec-brass/40 text-hec-brass">draft - only staff can see it</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {approved
                ? `Approved ${approval?.approved_at ? new Date(approval.approved_at).toLocaleString() : ""}. To change it, adjust below and approve again, or withdraw it.`
                : "Choose who each speaker was. Suggestions are only suggestions: nothing reaches a child or a family until you approve."}
            </CardDescription>
          </div>
          {approved && (
            <Button variant="outline" size="sm" className="gap-2 shrink-0" disabled={busy} onClick={() => withdrawMutation.mutate()}>
              {withdrawMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
              Withdraw approval
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "legacy" && (
          <p className="text-hec-small text-hec-ink-soft">
            This lesson was analysed before teacher approval existed, so its results were shared at once. Re-analyse it to
            get a draft you can review; approving that draft then replaces what was shared.
          </p>
        )}
        {state !== "legacy" && speakers.length === 0 && (
          <p className="text-hec-small text-hec-ink-soft">No children's speech was found in this lesson.</p>
        )}
        {state !== "legacy" && speakers.map((m) => {
          const s = byMetric.get(m.id);
          const c = choices[m.id];
          if (!c) return null;
          const drafted = Array.isArray(s?.draft_errors) ? s!.draft_errors! : [];
          const suggestedName = nameOf(s?.suggested_student_id);
          return (
            <div key={m.id} className="rounded-hec-md border border-hec-line p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 whitespace-normal break-words text-hec-small font-semibold text-hec-ink">"{m.speaker_label}"</span>
                {s ? (
                  <Badge variant="outline" className={s.confidence === "low" ? "text-hec-ink-soft" : s.confidence === "medium" ? "border-hec-warn/30 text-hec-warn" : "border-hec-leaf/30 text-hec-leaf"}>
                    <UserRoundSearch className="mr-1 h-3 w-3" />
                    {s.confidence === "low" || !suggestedName ? "no suggestion" : `suggested: ${suggestedName}`} · {CONFIDENCE_TEXT[s.confidence]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-hec-ink-soft">no suggestion</Badge>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={c.studentId ?? UNKNOWN} onValueChange={(v) => setChoice(m.id, { studentId: v === UNKNOWN ? null : v })} disabled={busy}>
                  <SelectTrigger className="sm:flex-1" aria-label={`Who was "${m.speaker_label}"?`}>
                    <SelectValue placeholder="Who was this?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNKNOWN}>Unknown - don't assign</SelectItem>
                    {roster.map((r) => <SelectItem key={r.id} value={r.id}>{r.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={c.cefrLevel ?? NO_LEVEL} onValueChange={(v) => setChoice(m.id, { cefrLevel: v === NO_LEVEL ? null : v })} disabled={busy || !c.studentId}>
                  <SelectTrigger className="sm:w-44" aria-label={`CEFR level for "${m.speaker_label}"`}>
                    <SelectValue placeholder="CEFR level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LEVEL}>No level</SelectItem>
                    {CEFR_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}{l === s?.cefr_estimate ? " (drafted)" : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {c.studentId && drafted.length > 0 && (
                <ul className="space-y-1">
                  {drafted.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-hec-small">
                      <Checkbox
                        id={`keep-${m.id}-${i}`}
                        checked={c.keepErrors[i] !== false}
                        onCheckedChange={(v) => setChoice(m.id, { keepErrors: c.keepErrors.map((k, x) => (x === i ? v === true : k)) })}
                        disabled={busy}
                        className="mt-1"
                      />
                      <label htmlFor={`keep-${m.id}-${i}`} className="min-w-0">
                        <span className="text-hec-danger line-through">{e.error_text}</span>{" "}
                        <span className="text-hec-leaf">{e.corrected_text}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        {state !== "legacy" && <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button className="w-full gap-2 sm:w-auto" disabled={busy || transcript?.status !== "analyzed"} onClick={() => approveMutation.mutate()}>
            {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {approved ? "Approve again with these choices" : "Approve and share with families"}
          </Button>
          <p className="text-hec-caption text-hec-ink-soft">
            Publishes the lesson summary, and for each child you chose: the kept practice points and the level.
          </p>
        </div>}
      </CardContent>
    </Card>
  );
}
