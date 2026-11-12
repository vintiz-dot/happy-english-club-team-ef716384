import { GuardDialog } from "@/components/admin/session-guard/GuardDialog";

interface CancelSessionDialogProps {
  session: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Cancel one lesson. This is the "Check before cancelling" dialog: it asks
 * the server what the evidence says, requires a real reason, and for strong
 * evidence the typed lesson date, before anything is changed.
 */
export function CancelSessionDialog({ session, open, onClose, onSuccess }: CancelSessionDialogProps) {
  return <GuardDialog open={open} session={session} op="cancel" onClose={onClose} onDone={() => onSuccess()} />;
}
