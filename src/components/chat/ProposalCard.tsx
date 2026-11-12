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
    <div className="space-y-2 rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-hec-ink shadow-hec-1">
      <p className="flex items-center gap-2 text-hec-caption font-medium text-hec-ink">
        <ClipboardCheck className="h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
        You asked me to:
      </p>
      <ul className="list-disc space-y-1 pl-5 text-hec-small text-hec-ink">
        {proposal.summary.map((line) => (
          <li key={line} className="break-words">{line}</li>
        ))}
      </ul>
      {proposal.warnings.length > 0 && (
        <div className="space-y-1 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint px-3 py-2">
          {proposal.warnings.map((w) => (
            <p key={w} className="flex gap-2 text-hec-caption text-hec-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-hec-warn" aria-hidden />
              {w}
            </p>
          ))}
        </div>
      )}
      <p className="text-hec-caption text-hec-ink-soft">
        Nothing has changed yet. Confirm saves all of it together, and you can undo it in one click.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onConfirm} disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
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
