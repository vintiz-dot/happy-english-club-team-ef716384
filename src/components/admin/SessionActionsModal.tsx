import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, Ban, Trash2, Edit, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { EditSessionModal } from "./EditSessionModal";
import { GuardDialog } from "@/components/admin/session-guard/GuardDialog";
import { manageSession } from "@/components/admin/session-guard/api";
import { checkReason, cleanReason, errorText, isSessionRelatedQuery, type GuardOp } from "@/lib/sessionGuard";

interface SessionActionsModalProps {
  session: any;
  onClose: () => void;
  onSuccess: () => void;
}

type Action = "cancel" | "delete" | "uncancel" | "edit" | "change-status" | null;

/**
 * The lesson action menu. Every change that can lose or move money goes
 * through the "Check before cancelling" dialog (GuardDialog): cancel,
 * delete, status to or from Canceled. There is no direct write to
 * `sessions` here any more, and no automatic force-cancel for past Held
 * lessons: a lesson with evidence needs the admin to look and explain.
 */
export const SessionActionsModal = ({ session, onClose, onSuccess }: SessionActionsModalProps) => {
  const qc = useQueryClient();
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const isCanceled = session.status === "Canceled";

  const guard = (op: GuardOp, extra?: { onCancelInstead?: () => void }) => (
    <GuardDialog
      key={op}
      open
      session={session}
      op={op}
      onClose={() => setAction(null)}
      onDone={() => onSuccess()}
      onCancelInstead={extra?.onCancelInstead}
    />
  );

  if (action === "edit") {
    return (
      <EditSessionModal
        session={session}
        onClose={() => setAction(null)}
        onSuccess={onSuccess}
      />
    );
  }
  if (action === "cancel") return guard("cancel");
  if (action === "uncancel") return guard("uncancel");
  if (action === "delete") return guard("delete", { onCancelInstead: () => setAction("cancel") });

  const statusOptions = isCanceled ? ["Scheduled"] : ["Scheduled", "Held", "Canceled"].filter((s) => s !== session.status);
  const reasonCheck = checkReason(reason);

  /** Canceled and un-cancel go to the checked dialog; Scheduled <-> Held is a plain, audited change. */
  const handleChangeStatus = async () => {
    if (!newStatus) return;
    setStatusError(null);
    if (newStatus === "Canceled") {
      setAction("cancel");
      return;
    }
    if (isCanceled && newStatus === "Scheduled") {
      setAction("uncancel");
      return;
    }
    if (!reasonCheck.ok) {
      setStatusError(reasonCheck.message);
      return;
    }
    setProcessing(true);
    const res = await manageSession("change-status", { id: session.id, status: newStatus, reason: cleanReason(reason) });
    setProcessing(false);
    if (!res.ok) {
      setStatusError(errorText(res.error.code, res.error.message));
      return;
    }
    void qc.invalidateQueries({ predicate: (q) => isSessionRelatedQuery(q.queryKey) });
    toast.success(`Session status changed to ${newStatus}. Run Calculate Tuition/Payroll to update financials.`, { duration: 5000 });
    onSuccess();
    onClose();
  };

  if (action === "change-status") {
    const toCanceled = newStatus === "Canceled" || (isCanceled && newStatus === "Scheduled");
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Session Status</DialogTitle>
            <DialogDescription className="break-words">
              {session.classes?.name} - {format(new Date(session.date), "MMM dd, yyyy")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Admin Override</AlertTitle>
              <AlertDescription>
                This will change the session status and may affect payroll and tuition calculations.
                This action is audited.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>Current Status</Label>
              <div>
                <Badge variant={
                  session.status === 'Held' ? 'default' :
                  session.status === 'Canceled' ? 'secondary' :
                  'outline'
                }>
                  {session.status}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sa-new-status">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="sa-new-status" className="min-h-11">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCanceled && (
                <p className="text-xs text-muted-foreground">A cancelled lesson can only be restored to Scheduled.</p>
              )}
              {toCanceled && (
                <p className="text-xs text-muted-foreground">
                  The next screen checks what the system recorded for this lesson and asks for your reason.
                </p>
              )}
            </div>

            {!toCanceled && (
              <div className="space-y-2">
                <Label htmlFor="sa-reason">Reason for Status Change (Required)</Label>
                <Textarea
                  id="sa-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you changing this status?"
                  rows={3}
                  aria-describedby="sa-reason-help"
                  aria-invalid={!!statusError}
                  className="text-base sm:text-sm"
                />
                <p id="sa-reason-help" className="text-xs text-muted-foreground">
                  {reason ? reasonCheck.message : "At least 15 characters."}
                </p>
              </div>
            )}

            {statusError && (
              <p role="alert" className="text-sm font-semibold break-words">{statusError}</p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="min-h-11 flex-1" onClick={onClose} disabled={processing}>
                Keep status
              </Button>
              <Button
                variant="outline"
                className="min-h-11 flex-1"
                onClick={handleChangeStatus}
                disabled={processing || !newStatus || (!toCanceled && !reasonCheck.ok)}
              >
                {processing ? "Processing..." : toCanceled ? "Continue to the check" : "Change Status"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session Actions</DialogTitle>
          <DialogDescription className="break-words">
            {session.classes?.name} - {format(new Date(session.date), "MMM dd, yyyy")} at{" "}
            {session.start_time?.slice(0, 5)}
          </DialogDescription>
          <div className="mt-2">
            <Badge variant={
              session.status === 'Held' ? 'default' :
              session.status === 'Canceled' ? 'secondary' :
              'outline'
            }>
              Current Status: {session.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full min-h-11 justify-start"
            onClick={() => setAction("edit")}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Session Time
          </Button>

          {isCanceled ? (
            <Button
              variant="outline"
              className="w-full min-h-11 justify-start"
              onClick={() => setAction("uncancel")}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Restore (un-cancel) this lesson
            </Button>
          ) : (
            <Button
              variant="outline"
              className="w-full min-h-11 justify-start"
              onClick={() => setAction("cancel")}
            >
              <Ban className="h-4 w-4 mr-2" />
              Cancel Session
            </Button>
          )}

          {(session.status === 'Held' || session.status === 'Canceled') && (
            <Button
              variant="outline"
              className="w-full min-h-11 justify-start"
              onClick={() => setAction("change-status")}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Change Status
              <span className="ml-auto text-xs text-muted-foreground">
                (Admin Override)
              </span>
            </Button>
          )}

          <Button
            variant="outline"
            className="w-full min-h-11 justify-start"
            onClick={() => setAction("delete")}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Session
            <span className="ml-auto text-xs text-muted-foreground">
              (checked first)
            </span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
