/**
 * The rubric for one video homework. The AI drafts it from the prompt; the
 * teacher edits and approves it. Videos are judged against the approved
 * version (until then the draft is used and the teacher is warned).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Plus, Sparkles, Trash2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { videoDb } from "@/lib/video/recorder";
import { DEFAULT_CRITERIA, normalizeRubric, type RubricCriterion } from "@/lib/videoHomework";
import { useIvory } from "@/hooks/useIvory";

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function VideoRubricEditor({ homeworkId, onClose }: { homeworkId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  // Opened from AssignmentUpload, which also renders on "/" (not yet in the
  // system): off-scope the old classes stay exactly as they were.
  const ivory = useIvory();
  const [criteria, setCriteria] = useState<RubricCriterion[]>([]);
  const [vocab, setVocab] = useState("");
  const [grammar, setGrammar] = useState("");
  const [kidSummary, setKidSummary] = useState("");
  const [gradeBand, setGradeBand] = useState("");

  const { data: rubric, isLoading } = useQuery({
    queryKey: ["video-rubric", homeworkId],
    queryFn: async () => {
      const { data, error } = await videoDb.from("video_homework_rubrics").select("*").eq("homework_id", homeworkId).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!homeworkId,
  });

  useEffect(() => {
    if (!homeworkId) return;
    setCriteria(rubric ? normalizeRubric(rubric.criteria) : DEFAULT_CRITERIA.map((c) => ({ ...c })));
    setVocab((rubric?.target_vocabulary ?? []).join(", "));
    setGrammar((rubric?.target_grammar ?? []).join(", "));
    setKidSummary(rubric?.kid_summary ?? "");
    setGradeBand(rubric?.grade_band ?? "");
  }, [rubric, homeworkId]);

  const draft = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("video-rubric", {
        body: { homework_id: homeworkId, grade_band: gradeBand || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Draft rubric ready - check it, then approve");
      qc.invalidateQueries({ queryKey: ["video-rubric", homeworkId] });
    },
    onError: (e: any) => toast.error(e?.message || "Could not draft a rubric"),
  });

  const save = useMutation({
    mutationFn: async (approve: boolean) => {
      const clean = normalizeRubric(criteria);
      const { error } = await videoDb.from("video_homework_rubrics").upsert(
        {
          homework_id: homeworkId,
          criteria: clean,
          target_vocabulary: list(vocab).slice(0, 20),
          target_grammar: list(grammar).slice(0, 10),
          kid_summary: kidSummary.trim() || null,
          grade_band: gradeBand.trim() || null,
          status: approve ? "approved" : "draft",
          approved_by: approve ? user?.id : null,
          approved_at: approve ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "homework_id" },
      );
      if (error) throw error;
    },
    onSuccess: (_d, approve) => {
      toast.success(approve ? "Rubric approved" : "Saved as draft");
      qc.invalidateQueries({ queryKey: ["video-rubric", homeworkId] });
      if (approve) onClose();
    },
    onError: (e: any) => toast.error(e?.message || "Could not save"),
  });

  const set = (i: number, patch: Partial<RubricCriterion>) =>
    setCriteria((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  return (
    <Dialog open={!!homeworkId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={ivory ? "max-w-xl" : "w-[calc(100vw-2rem)] max-w-xl max-h-[90vh] overflow-y-auto"}>
        <DialogHeader>
          <DialogTitle className={ivory ? "flex flex-wrap items-center gap-2" : "flex items-center gap-2"}>
            Video rubric
            {rubric?.status === "approved" ? (
              <Badge className={ivory ? "gap-1 border-hec-leaf/30 bg-hec-leaf-tint font-sans text-hec-leaf" : "bg-emerald-600 gap-1"}><CheckCircle2 className="h-3 w-3" /> Approved</Badge>
            ) : rubric ? <Badge variant="secondary" className={ivory ? "font-sans" : undefined}>Draft</Badge> : null}
          </DialogTitle>
          <DialogDescription>What each video is scored on. Children see the labels; never the weights.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className={ivory ? "flex items-center gap-2 text-hec-small text-hec-ink-soft" : "flex items-center gap-2 text-sm text-muted-foreground"}><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className={ivory ? "flex flex-col gap-2 sm:flex-row sm:items-end" : "flex gap-2 items-end"}>
              <div className={ivory ? "min-w-0 flex-1 space-y-2" : "flex-1 space-y-1"}>
                <Label htmlFor={ivory ? "rubric-grade-band" : undefined} className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-xs"}>Grade (helps the AI pitch it)</Label>
                <Input id={ivory ? "rubric-grade-band" : undefined} value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} placeholder="e.g. Grade 3" className={ivory ? undefined : "h-9"} />
              </div>
              <Button variant="outline" onClick={() => draft.mutate()} disabled={draft.isPending}>
                {draft.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
                {rubric ? "Redraft with AI" : "Draft with AI"}
              </Button>
            </div>

            {criteria.map((c, i) => (
              <div key={i} className={ivory ? "space-y-2 rounded-hec-md border border-hec-line p-3" : "rounded-lg border p-3 space-y-2"}>
                <div className={ivory ? "flex flex-wrap gap-2" : "flex gap-2"}>
                  <Input value={c.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Label" aria-label={ivory ? "Criterion label" : undefined} className={ivory ? "min-w-0 flex-1 basis-full font-medium sm:basis-0" : "h-9 font-medium"} />
                  <select
                    value={c.weight}
                    onChange={(e) => set(i, { weight: Number(e.target.value) })}
                    className={ivory ? "min-h-hec-target shrink-0 rounded-hec-md border border-hec-line-strong bg-hec-raised px-2 font-sans text-hec-body tabular-nums text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "h-9 rounded-md border bg-background px-2 text-sm"}
                    aria-label="Weight"
                  >
                    <option value={1}>×1</option>
                    <option value={2}>×2</option>
                    <option value={3}>×3</option>
                  </select>
                  <Button variant="ghost" size="icon" className={ivory ? "shrink-0" : "h-9 w-9 shrink-0"} aria-label={ivory ? "Remove this criterion" : undefined} onClick={() => setCriteria((p) => p.filter((_, j) => j !== i))} disabled={criteria.length <= 2}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Textarea value={c.description} onChange={(e) => set(i, { description: e.target.value })} rows={2} placeholder="What a 4/4 looks like" aria-label={ivory ? "What a 4/4 looks like" : undefined} className={ivory ? undefined : "text-sm"} />
              </div>
            ))}
            {criteria.length < 6 && (
              <Button variant="ghost" size="sm" onClick={() => setCriteria((p) => [...p, { key: `c${p.length + 1}`, label: "", description: "", weight: 1 }])}>
                <Plus className="h-4 w-4 mr-1" /> Add a criterion
              </Button>
            )}

            <div className={ivory ? "space-y-2" : "space-y-1"}>
              <Label htmlFor={ivory ? "rubric-vocab" : undefined} className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-xs"}>Target words (comma-separated)</Label>
              <Input id={ivory ? "rubric-vocab" : undefined} value={vocab} onChange={(e) => setVocab(e.target.value)} className={ivory ? undefined : "h-9"} />
            </div>
            <div className={ivory ? "space-y-2" : "space-y-1"}>
              <Label htmlFor={ivory ? "rubric-grammar" : undefined} className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-xs"}>Target grammar (comma-separated)</Label>
              <Input id={ivory ? "rubric-grammar" : undefined} value={grammar} onChange={(e) => setGrammar(e.target.value)} className={ivory ? undefined : "h-9"} />
            </div>
            <div className={ivory ? "space-y-2" : "space-y-1"}>
              <Label htmlFor={ivory ? "rubric-kid" : undefined} className={ivory ? "text-hec-small font-medium text-hec-ink" : "text-xs"}>For the child: "Your teacher is looking for…"</Label>
              <Textarea id={ivory ? "rubric-kid" : undefined} value={kidSummary} onChange={(e) => setKidSummary(e.target.value)} rows={2} className={ivory ? undefined : "text-sm"} />
            </div>

            <div className={ivory ? "flex flex-col-reverse gap-3 sm:flex-row" : "flex gap-2"}>
              <Button variant="outline" className="flex-1" onClick={() => save.mutate(false)} disabled={save.isPending}>Save draft</Button>
              <Button className="flex-1" onClick={() => save.mutate(true)} disabled={save.isPending}>Approve rubric</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
