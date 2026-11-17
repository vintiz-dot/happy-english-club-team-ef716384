/**
 * "Are you sure?" before a destructive action (DESIGN_SYSTEM s.14), on the
 * existing AlertDialog primitive.
 *
 * The title is a question that names the thing; the description says what
 * will change. Two buttons, each saying what it does: the safe one ("Keep
 * ...") has focus first and is what Escape does; the destructive one runs
 * `onConfirm` - the caller's own handler, unchanged - says what is happening
 * while it runs, and the dialog closes when it has finished.
 */
import { useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDestructiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description: ReactNode;
  keepLabel: string;
  actionLabel: string;
  busyLabel: string;
  onConfirm: () => unknown | Promise<unknown>;
}

export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  keepLabel,
  actionLabel,
  busyLabel,
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch {
      // The handler reports its own failure (a toast); the dialog just closes.
    } finally {
      setBusy(false);
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="break-words">{title}</AlertDialogTitle>
          <AlertDialogDescription className="break-words">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{keepLabel}</AlertDialogCancel>
          <Button
            variant="destructive"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={confirm}
          >
            {busy ? busyLabel : actionLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
