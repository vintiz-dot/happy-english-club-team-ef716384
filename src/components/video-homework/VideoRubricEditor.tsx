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

const list = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

export function VideoRubricEditor({ homeworkId, onClose }: { homeworkId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
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
      // The teacher asked for a new draft: it replaces the current rubric,
      // an approved one included (it goes back to draft for them to check).
      const { data, error } = await supabase.functions.invoke("video-rubric", {
        body: { homework_id: homeworkId, grade_band: gradeBand || undefined, redo: true },
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
      <DialogContent className="max-h-[85dvh] w-[calc(100vw-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Video rubric
            {rubric?.status === "approved" ? (
              <Badge variant="success" className="gap-1 font-sans"><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Approved</Badge>
            ) : rubric ? <Badge variant="secondary" className="font-sans">Draft</Badge> : null}
          </DialogTitle>
          <DialogDescription>What each video is scored on. Children see the labels; never the weights.</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center gap-2 text-hec-small text-hec-ink-soft"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="rubric-grade" className="text-hec-small font-medium text-hec-ink">Grade (helps the AI pitch it)</Label>
                <Input id="rubric-grade" value={gradeBand} onChange={(e) => setGradeBand(e.target.value)} placeholder="e.g. Grade 3" className="text-hec-body" />
              </div>
              <Button variant="outline" className="min-h-hec-target w-full sm:w-auto" onClick={() => {
                if (rubric?.status === "approved" && !window.confirm("Replace the approved rubric with a new AI draft? You will need to approve it again.")) return;
                draft.mutate();
              }} disabled={draft.isPending}>
                {draft.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
                {rubric ? "Redraft with AI" : "Draft with AI"}
              </Button>
            </div>

            {criteria.map((c, i) => (
              <div key={i} className="space-y-2 rounded-hec-md border border-hec-line p-3">
                {/* Below sm the label takes its own line (beside the weight and remove it was 123 px and cut). */}
                <div className="flex flex-wrap gap-2">
                  <Input value={c.label} onChange={(e) => set(i, { label: e.target.value })} placeholder="Label" aria-label="Criterion label" className="min-w-0 flex-1 basis-full text-hec-body font-medium sm:basis-0" />
                  <select
                    value={c.weight}
                    onChange={(e) => set(i, { weight: Number(e.target.value) })}
                    className="min-h-hec-target shrink-0 rounded-hec-md border border-hec-line-strong bg-hec-raised px-2 text-hec-body text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                    aria-label="Weight"
                  >
                    <option value={1}>×1</option>
                    <option value={2}>×2</option>
                    <option value={3}>×3</option>
                  </select>
                  <Button variant="ghost" size="icon" className="min-h-hec-target min-w-hec-target shrink-0 text-hec-danger hover:bg-hec-danger-tint hover:text-hec-danger" onClick={() => setCriteria((p) => p.filter((_, j) => j !== i))} disabled={criteria.length <= 2} aria-label={`Remove ${c.label || "this criterion"}`}>
                    <Trash2 className="h-5 w-5" aria-hidden="true" />
                  </Button>
                </div>
                <Textarea value={c.description} onChange={(e) => set(i, { description: e.target.value })} rows={2} placeholder="What a 4/4 looks like" aria-label="What a 4/4 looks like" className="text-hec-body" />
              </div>
            ))}
            {criteria.length < 6 && (
              <Button variant="ghost" size="sm" className="min-h-hec-target" onClick={() => setCriteria((p) => [...p, { key: `c${p.length + 1}`, label: "", description: "", weight: 1 }])}>
                <Plus className="h-4 w-4" aria-hidden="true" /> Add a criterion
              </Button>
            )}

            <div className="space-y-2">
              <Label htmlFor="rubric-vocab" className="text-hec-small font-medium text-hec-ink">Target words (comma-separated)</Label>
              <Input id="rubric-vocab" value={vocab} onChange={(e) => setVocab(e.target.value)} className="text-hec-body" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubric-grammar" className="text-hec-small font-medium text-hec-ink">Target grammar (comma-separated)</Label>
              <Input id="rubric-grammar" value={grammar} onChange={(e) => setGrammar(e.target.value)} className="text-hec-body" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rubric-kid" className="text-hec-small font-medium text-hec-ink">For the child: "Your teacher is looking for…"</Label>
              <Textarea id="rubric-kid" value={kidSummary} onChange={(e) => setKidSummary(e.target.value)} rows={2} className="text-hec-body" />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" className="min-h-hec-target flex-1" onClick={() => save.mutate(false)} disabled={save.isPending}>Save draft</Button>
              <Button className="min-h-hec-target flex-1" onClick={() => save.mutate(true)} disabled={save.isPending}>Approve rubric</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
