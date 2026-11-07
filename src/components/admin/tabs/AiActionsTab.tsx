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
          <Bot className="h-5 w-5 text-violet-600" />
          AI actions
        </CardTitle>
        <CardDescription>
          What the assistant set up after an admin confirmed it. Undo takes back the whole action, unless someone has
          since done something that depends on it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </p>
        )}
        {error && (
          <p className="text-sm text-muted-foreground">
            The AI actions log isn't available yet. Its database change needs to be applied first.
          </p>
        )}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">Nothing has been set up by the assistant yet.</p>}
        {(data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{when(a.created_at)}</span>
              <span>·</span>
              <span>confirmed by {a.created_by_name}</span>
              {a.status === "undone" ? (
                <Badge variant="secondary">Undone{a.undone_by_name ? ` by ${a.undone_by_name}` : ""}</Badge>
              ) : a.reviewed_at ? (
                <Badge variant="outline">Checked</Badge>
              ) : (
                <Badge className="bg-violet-600">Waiting to be checked</Badge>
              )}
            </div>
            <ul className="text-sm list-disc pl-5 space-y-0.5">
              {a.summary.map((line) => (
                <li key={line} className={a.status === "undone" ? "line-through text-muted-foreground" : undefined}>{line}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground italic">"{a.instruction}"</p>
            {(blocked[a.id] ?? []).length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-900 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 space-y-0.5">
                <p className="font-medium">Not undone, and nothing was changed:</p>
                {blocked[a.id].map((r) => <p key={r}>• {r}</p>)}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {a.status === "applied" && (
                <Button size="sm" variant="outline" onClick={() => undo(a)} disabled={undoing !== null}>
                  {undoing === a.id ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1.5" />}
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
