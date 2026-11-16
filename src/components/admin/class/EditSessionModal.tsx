import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GuardDialog, PayGuardDialog } from "@/components/admin/session-guard/GuardDialog";
import { manageSession } from "@/components/admin/session-guard/api";
import { errorText, type GuardOp } from "@/lib/sessionGuard";
import { payDialogFrom, type PayOp } from "@/lib/lessonPayGuard";

interface EditSessionModalProps {
  session: {
    id: string;
    teacher_id?: string;
    rate_override_vnd?: number | null;
    status?: string;
    notes?: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

const EditSessionModal = ({ session, onClose, onSaved }: EditSessionModalProps) => {
  const [teacherId, setTeacherId] = useState(session.teacher_id || "");
  const [rate, setRate] = useState(session.rate_override_vnd?.toString() || "");
  const [status, setStatus] = useState(session.status || "Scheduled");
  const [notes, setNotes] = useState(session.notes || "");
  const [saving, setSaving] = useState(false);
  // Status into or out of Canceled is a checked change: it opens the guard dialog.
  const [guardOp, setGuardOp] = useState<GuardOp | null>(null);
  // D4 step 3A: the lesson-pay check (a held lesson's teacher; Held <-> Scheduled).
  const [pay, setPay] = useState<{ op: PayOp; args: Record<string, unknown>; resume: boolean } | null>(null);

  const { data: teachers } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async (skipTeacher = false) => {
    const from = session.status || "Scheduled";
    if (from === "Canceled" && status !== "Canceled" && status !== "Scheduled") {
      toast.error("A cancelled lesson can only be restored to Scheduled.");
      return;
    }
    const cancelling = from !== "Canceled" && status === "Canceled";
    const restoring = from === "Canceled" && status === "Scheduled";

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        id: session.id,
        rate_override_vnd: rate ? parseInt(rate) : null,
        notes: notes || null,
      };
      if (!skipTeacher) data.teacher_id = teacherId || null;
      const res = await manageSession("update", data);
      if (!res.ok) {
        // D4 3A: a held lesson's teacher -> the lesson-pay check; nothing was saved yet.
        const d = payDialogFrom(res.error);
        if (d) {
          setPay({ op: d.op, args: d.plan.args ?? { session_id: session.id, teacher_id: teacherId }, resume: true });
          return;
        }
        throw new Error(errorText(res.error.code, res.error.message));
      }
      // D4 3A: Held <-> Scheduled is Change status (update no longer writes
      // the status); the database decides whether it needs the check.
      if (!cancelling && !restoring && status !== from) {
        const sr = await manageSession("change-status", { id: session.id, status });
        if (!sr.ok) {
          const d = payDialogFrom(sr.error);
          if (d) {
            toast.success("Other changes saved. Now check the status change.");
            setPay({ op: d.op, args: d.plan.args ?? { session_id: session.id }, resume: false });
            return;
          }
          throw new Error(errorText(sr.error.code, sr.error.message));
        }
      }
      if (cancelling || restoring) {
        // The other fields are saved; the status itself waits for the check.
        toast.success("Other changes saved. Now check the status change.");
        setGuardOp(cancelling ? "cancel" : "uncancel");
        return;
      }
      toast.success("Session updated successfully");
      onSaved();
    } catch (error: any) {
      console.error("Error updating session:", error);
      toast.error(error.message || "Failed to update session");
    } finally {
      setSaving(false);
    }
  };

  if (pay) {
    return (
      <PayGuardDialog
        open
        session={{ id: session.id }}
        op={pay.op}
        args={pay.args}
        names={Object.fromEntries((teachers ?? []).map((t: any) => [t.id, t.full_name]))}
        onClose={() => setPay(null)}
        onDone={() => {
          const resume = pay.resume;
          setPay(null);
          // the teacher is changed; save the rest (and any status change) without it
          if (resume) void handleSave(true);
          else onSaved();
        }}
      />
    );
  }

  if (guardOp) {
    return (
      <GuardDialog
        open
        session={{ id: session.id }}
        op={guardOp}
        onClose={() => setGuardOp(null)}
        onDone={() => onSaved()}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Session</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Teacher</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                {teachers?.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Scheduled">Scheduled</SelectItem>
                <SelectItem value="Held" disabled={session.status === "Canceled"}>Held</SelectItem>
                <SelectItem value="Canceled">Canceled (checked first)</SelectItem>
                <SelectItem value="Holiday" disabled={session.status === "Canceled"}>Holiday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Price Override (VND) - not used for staff pay</Label>
            <Input
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="Leave empty for default"
            />
          </div>

          <div className="space-y-2">
            <Label>Notes (visible to students)</Label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave(false)} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSessionModal;
