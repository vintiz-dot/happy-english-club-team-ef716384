/**
 * After the assistant sets something up, this stays at the top of every
 * admin page until the admin who confirmed it says it looks right or
 * undoes it: the "check it, then finish it" step, with the nudges for
 * whatever is left to click.
 *
 * Shows nothing - rather than an error - when the AI actions migration has
 * not been applied yet.
 */
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bot, Check, Loader2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { AI_ACTIONS_KEY, listAiActions, markAiActionReviewed, undoAiAction } from "@/lib/aiActions";

export function AiActionBanner() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [working, setWorking] = useState<"review" | "undo" | null>(null);

  const { data } = useQuery({
    queryKey: [...AI_ACTIONS_KEY, "list"],
    queryFn: () => listAiActions(50),
    enabled: !!user && role === "admin",
    retry: false,
    staleTime: 30_000,
  });

  const waiting = (data ?? []).filter((a) => a.created_by_me && a.status === "applied" && !a.reviewed_at);
  const action = waiting[0];
  if (!action) return null;

  const onStudentPage = action.student_id && location.pathname === `/students/${action.student_id}`;

  const looksRight = async () => {
    setWorking("review");
    try {
      await markAiActionReviewed(action.id);
      await queryClient.invalidateQueries({ queryKey: AI_ACTIONS_KEY });
    } catch (e: any) {
      toast.error(e.message || "Could not save that");
    } finally {
      setWorking(null);
    }
  };

  const undo = async () => {
    setWorking("undo");
    try {
      const r = await undoAiAction(action.id);
      if (r.ok) {
        toast.success("Undone. Everything the assistant set up has been taken back.");
        await queryClient.invalidateQueries();
        if (r.student_removed && r.open_path) navigate(r.open_path);
      } else {
        toast.error(`Not undone: ${(r.reasons ?? []).join(" ")}`, { duration: 12_000 });
      }
    } catch (e: any) {
      toast.error(e.message || "Could not undo");
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="mb-6 rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-hec-ink shadow-hec-1">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-hec-md bg-hec-sunken text-hec-ink-soft">
          <Bot className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-hec-body font-semibold text-hec-ink">Set up by the assistant. Check it looks right.</p>
          <ul className="list-disc space-y-1 pl-5 text-hec-small text-hec-ink">
            {action.summary.map((line) => (
              <li key={line} className="break-words">{line}</li>
            ))}
          </ul>
          {action.nudges.length > 0 && (
            <div className="space-y-1 text-hec-caption text-hec-ink-soft">
              <p className="font-medium text-hec-ink">To finish:</p>
              {action.nudges.map((n) => (
                <p key={n}>→ {n}</p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={looksRight} disabled={!!working}>
              {working === "review" ? <Loader2 className="animate-spin" aria-hidden /> : <Check aria-hidden />}
              Looks right
            </Button>
            <Button size="sm" variant="outline" onClick={undo} disabled={!!working}>
              {working === "undo" ? <Loader2 className="animate-spin" aria-hidden /> : <Undo2 aria-hidden />}
              Undo all of it
            </Button>
            {action.student_exists && !onStudentPage && (
              <Button size="sm" variant="ghost" onClick={() => navigate(`/students/${action.student_id}`)}>
                Open the student
              </Button>
            )}
            {waiting.length > 1 && (
              <Button size="sm" variant="link" onClick={() => navigate("/admin?tab=ai-actions")}>
                {waiting.length - 1} more to check
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
