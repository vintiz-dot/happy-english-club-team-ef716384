/**
 * Everything the assistant has set up, kept apart from the general
 * Activity log: who confirmed it, what they typed, what was done, and one
 * click to undo it. Undo refuses, and says why, once a person has done
 * something that depends on it.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Loader2, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AI_ACTIONS_KEY, listAiActions, undoAiAction, type AiActionRow } from "@/lib/aiActions";

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default function AiActionsTab() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [undoing, setUndoing] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Record<string, string[]>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: [...AI_ACTIONS_KEY, "list"],
    queryFn: () => listAiActions(200),
    retry: false,
  });

  const undo = async (a: AiActionRow) => {
    setUndoing(a.id);
    try {
      const r = await undoAiAction(a.id);
      if (r.ok) {
        toast.success("Undone.");
        setBlocked((b) => ({ ...b, [a.id]: [] }));
        await queryClient.invalidateQueries();
      } else {
        setBlocked((b) => ({ ...b, [a.id]: r.reasons ?? ["It could not be undone."] }));
      }
    } catch (e: any) {
      toast.error(e.message || "Could not undo");
    } finally {
      setUndoing(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-hec-ink-soft" aria-hidden />
          AI actions
        </CardTitle>
        <CardDescription>
          What the assistant set up after an admin confirmed it. Undo takes back the whole action, unless someone has
          since done something that depends on it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="flex items-center gap-2 text-hec-small text-hec-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading…
          </p>
        )}
        {error && (
          <p className="text-hec-small text-hec-ink-soft">
            The AI actions log isn't available yet. Its database change needs to be applied first.
          </p>
        )}
        {data && data.length === 0 && <p className="text-hec-small text-hec-ink-soft">Nothing has been set up by the assistant yet.</p>}
        {(data ?? []).map((a) => (
          <div key={a.id} className="space-y-2 rounded-hec-md border border-hec-line bg-hec-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-hec-caption text-hec-ink-soft">
              <span>{when(a.created_at)}</span>
              <span>·</span>
              <span>confirmed by {a.created_by_name}</span>
              {a.status === "undone" ? (
                <Badge variant="secondary">Undone{a.undone_by_name ? ` by ${a.undone_by_name}` : ""}</Badge>
              ) : a.reviewed_at ? (
                <Badge variant="outline">Checked</Badge>
              ) : (
                <Badge variant="warning">Waiting to be checked</Badge>
              )}
            </div>
            <ul className="list-disc space-y-1 pl-5 text-hec-small text-hec-ink">
              {a.summary.map((line) => (
                <li key={line} className={a.status === "undone" ? "break-words text-hec-ink-faint line-through" : "break-words"}>{line}</li>
              ))}
            </ul>
            <p className="break-words text-hec-caption italic text-hec-ink-soft">"{a.instruction}"</p>
            {(blocked[a.id] ?? []).length > 0 && (
              <div className="space-y-1 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint px-3 py-2 text-hec-caption text-hec-ink">
                <p className="font-medium text-hec-warn">Not undone, and nothing was changed:</p>
                {blocked[a.id].map((r) => <p key={r}>• {r}</p>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {a.status === "applied" && (
                <Button size="sm" variant="outline" onClick={() => undo(a)} disabled={undoing !== null}>
                  {undoing === a.id ? <Loader2 className="animate-spin" aria-hidden /> : <Undo2 aria-hidden />}
                  Undo
                </Button>
              )}
              {a.student_exists && a.student_id && (
                <Button size="sm" variant="ghost" onClick={() => navigate(`/students/${a.student_id}`)}>
                  Open the student
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
