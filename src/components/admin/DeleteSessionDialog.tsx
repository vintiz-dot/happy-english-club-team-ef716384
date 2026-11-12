import { useEffect, useState } from "react";
import { GuardDialog } from "@/components/admin/session-guard/GuardDialog";

interface DeleteSessionDialogProps {
  session: any;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Delete one lesson permanently. A lesson with evidence that it took place
 * cannot be deleted (the server refuses), so the dialog offers "Cancel
 * instead", which keeps the record, rather than ending in a dead end.
 */
export function DeleteSessionDialog({ session, open, onClose, onSuccess }: DeleteSessionDialogProps) {
  const [op, setOp] = useState<"delete" | "cancel">("delete");
  useEffect(() => {
    if (open) setOp("delete");
  }, [open]);
  return (
    <GuardDialog
      key={op}
      open={open}
      session={session}
      op={op}
      onClose={onClose}
      onDone={() => onSuccess()}
      onCancelInstead={op === "delete" ? () => setOp("cancel") : undefined}
    />
  );
}
