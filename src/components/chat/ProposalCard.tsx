/**
 * The card an admin confirms before the assistant's plan is carried out.
 *
 * Every line on it was written by the database (ai_action_preview), not by
 * the model, so what it says is what Confirm will do.
 */
import { Button } from "@/components/ui/button";
import { AlertTriangle, ClipboardCheck, Loader2 } from "lucide-react";
import type { AiProposal } from "@/lib/aiActions";

interface ProposalCardProps {
  proposal: AiProposal;
  busy: boolean;
  onConfirm: () => void;
  onChange: () => void;
  onCancel: () => void;
}

export function ProposalCard({ proposal, busy, onConfirm, onChange, onCancel }: ProposalCardProps) {
  return (
    <div className="rounded-2xl border border-violet-300/70 bg-violet-50/70 dark:bg-violet-950/30 dark:border-violet-800 p-3 space-y-2">
      <p className="text-xs font-semibold flex items-center gap-1.5">
        <ClipboardCheck className="h-3.5 w-3.5 text-violet-600" />
        You asked me to:
      </p>
      <ul className="text-sm space-y-1 list-disc pl-5">
        {proposal.summary.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      {proposal.warnings.length > 0 && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 ring-1 ring-amber-200 dark:ring-amber-900 px-2.5 py-2 space-y-1">
          {proposal.warnings.map((w) => (
            <p key={w} className="text-xs text-amber-900 dark:text-amber-200 flex gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
              {w}
            </p>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Nothing has changed yet. Confirm saves all of it together, and you can undo it in one click.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm} disabled={busy} className="bg-violet-600 hover:bg-violet-700 text-white">
          {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
          Confirm
        </Button>
        <Button size="sm" variant="outline" onClick={onChange} disabled={busy}>
          Change
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
