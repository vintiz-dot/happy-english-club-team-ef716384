import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { SessionTASelector } from "@/components/admin/SessionTASelector";
import { SessionTimeFields } from "@/components/admin/SessionTimeFields";
import { GuardDialog, PayGuardDialog } from "@/components/admin/session-guard/GuardDialog";
import { manageSession } from "@/components/admin/session-guard/api";
import { errorText } from "@/lib/sessionGuard";
import { payDialogFrom, payOpFromDbError, type PayOp } from "@/lib/lessonPayGuard";

/** What saveRest still has to do after a lesson-pay check (D4 step 3A). */
interface SaveSteps { skipTeacher?: boolean; skipStaff?: boolean }
import { configuredLengths, expectedLengthFor, parseWeeklySlots } from "@/lib/classSchedule";

interface EditSessionModalProps {
  session: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditSessionModal = ({ session, onClose, onSuccess }: EditSessionModalProps) => {
  const [startTime, setStartTime] = useState(session.start_time?.slice(0, 5) || "");
  const [endTime, setEndTime] = useState(session.end_time?.slice(0, 5) || "");
  const [teacherId, setTeacherId] = useState(session.teacher_id || "");
  const [notes, setNotes] = useState(session.notes || "");
  const [selectedTAIds, setSelectedTAIds] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  // D4 step 3A: a held lesson's time, teacher or assistants outside the free
  // week are refused by the database; the lesson-pay check opens, and when it
  // is done the rest of the save continues from `next`.
  const [pay, setPay] = useState<{ op: PayOp; args: Record<string, unknown>; next: SaveSteps | null } | null>(null);

  const { data: teachers } = useQuery({
    queryKey: ["teachers-active-list"],
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

  // The class's weekly pattern, so an edit that drifts from it is caught here
  // rather than in next month's payroll.
  const { data: classRow } = useQuery({
    queryKey: ["class-length", session.class_id],
    enabled: !!session.class_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("default_session_length_minutes, schedule_template")
        .eq("id", session.class_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Resolved against this session's own date, so the Wednesday two-hour slot
  // and the Saturday ninety-minute slot are each judged against themselves.
  const slots = parseWeeklySlots(classRow?.schedule_template);
  const classDefaultMinutes = classRow?.default_session_length_minutes ?? null;
  const expected = expectedLengthFor({
    date: session.date,
    startTime,
    slots,
    classDefaultMinutes,
  });
  const expectedMinutes = expected.minutes;
  const acceptedLengths = configuredLengths(slots, classDefaultMinutes);

  // Load existing session participants (TAs)
  const { data: existingParticipants } = useQuery({
    queryKey: ["session-participants", session.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_participants")
        .select("teaching_assistant_id, attended")
        .eq("session_id", session.id)
        .eq("participant_type", "teaching_assistant");
      if (error) throw error;
      return data || [];
    },
  });

  useEffect(() => {
    if (existingParticipants) {
      setSelectedTAIds(existingParticipants.map(p => p.teaching_assistant_id).filter(Boolean) as string[]);
    }
  }, [existingParticipants]);

  const isPast = new Date(session.date) < new Date();

  const timeChanged =
    startTime !== (session.start_time || "").slice(0, 5) || endTime !== (session.end_time || "").slice(0, 5);
  const moveChange = { date: String(session.date).slice(0, 10), start_time: startTime, end_time: endTime };

  /** Step 1 of Save: a time change goes through the checked "move" dialog first. */
  const handleSave = async () => {
    if (!startTime || !endTime) {
      toast.error("Please provide start and end times");
      return;
    }
    if (endTime <= startTime) {
      toast.error("The end time must be after the start time");
      return;
    }
    if (timeChanged) {
      // A held lesson's time is pay (the lesson-pay check, free in its first
      // week); any other lesson's time is D2's move check, as before.
      if (session.status === "Held") {
        setPay({ op: "retime", args: { session_id: session.id, start_time: `${startTime}:00`, end_time: `${endTime}:00` }, next: {} });
        return;
      }
      setMoveOpen(true);
      return;
    }
    await saveRest();
  };

  /** The assistant list as it will be saved, keeping each one's `attended` (an absence is never undone by a save). */
  const participantsAsSaved = () =>
    selectedTAIds.map((id) => ({
      teaching_assistant_id: id,
      attended: (existingParticipants as any[] | undefined)?.find((p) => p.teaching_assistant_id === id)?.attended !== false,
    }));

  /** Teacher, notes and assistants. Times never go through here. */
  const saveRest = async (steps: SaveSteps = {}) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get old values for audit
      const oldData = {
        start_time: session.start_time,
        end_time: session.end_time,
        teacher_id: session.teacher_id,
        notes: session.notes,
      };

      // Teacher and notes go through manage-session `update` (as the signed-in
      // admin). The lesson's date and times are NOT written here: a time change
      // was already made by the checked "move" step.
      const fields: Record<string, unknown> = {};
      if (!steps.skipTeacher && teacherId && teacherId !== session.teacher_id) fields.teacher_id = teacherId;
      if ((notes || null) !== (session.notes || null)) fields.notes = notes || null;
      if (Object.keys(fields).length > 0) {
        const res = await manageSession("update", { id: session.id, ...fields });
        if (!res.ok) {
          // A held lesson's teacher: the check opens; nothing was saved yet.
          const d = payDialogFrom(res.error);
          if (d) {
            setPay({ op: d.op, args: d.plan.args ?? { session_id: session.id, teacher_id: teacherId }, next: { ...steps, skipTeacher: true } });
            return;
          }
          throw new Error(errorText(res.error.code, res.error.message));
        }
      }
      if (steps.skipStaff) {
        toast.success("Session updated");
        onSuccess();
        onClose();
        return;
      }

      // Update session participants (TAs).
      //
      // A diff, not delete-everything-and-reinsert. Those rows now carry
      // `attended` (20261022090000): an assistant marked absent for this
      // lesson is on the roster but not paid for it, and wiping the row
      // would put the payment back silently, just because somebody
      // opened this dialog and saved an unrelated change.
      //
      // So only the assistants actually removed are deleted, and the
      // ones still selected are upserted with ignoreDuplicates - which
      // leaves an existing row, and its absence, exactly as it was.
      const removal = supabase.from("session_participants")
        .delete()
        .eq("session_id", session.id)
        .eq("participant_type", "teaching_assistant");
      const { error: removeError } = selectedTAIds.length > 0
        ? await removal.not("teaching_assistant_id", "in", `(${selectedTAIds.join(",")})`)
        : await removal;
      // A held lesson's assistants: the check opens with the whole list as it
      // will be saved (each one's absence kept); nothing was changed.
      if (removeError && payOpFromDbError(removeError) === "restaff") {
        setPay({ op: "restaff", args: { session_id: session.id, participants: participantsAsSaved() }, next: { ...steps, skipTeacher: true, skipStaff: true } });
        return;
      }
      if (removeError) throw removeError;

      if (selectedTAIds.length > 0) {
        const participants = selectedTAIds.map(taId => ({
          session_id: session.id,
          participant_type: 'teaching_assistant',
          teaching_assistant_id: taId,
          created_by: user?.id,
        }));
        const { error: addError } = await supabase
          .from("session_participants")
          .upsert(participants, {
            onConflict: "session_id,teaching_assistant_id",
            ignoreDuplicates: true,
          });
        if (addError && payOpFromDbError(addError) === "restaff") {
          setPay({ op: "restaff", args: { session_id: session.id, participants: participantsAsSaved() }, next: { ...steps, skipTeacher: true, skipStaff: true } });
          return;
        }
        if (addError) throw addError;
      }

      // Audit log
      await supabase.from("audit_log").insert({
        entity: "sessions",
        action: "update",
        entity_id: session.id,
        actor_user_id: user?.id,
        diff: {
          before: oldData,
          after: {
            start_time: `${startTime}:00`,
            end_time: `${endTime}:00`,
            teacher_id: teacherId || session.teacher_id,
            notes,
            teaching_assistants: selectedTAIds,
          },
          session_date: session.date,
          class_id: session.class_id,
        },
      });

      toast.success("Session updated");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to update session");
    } finally {
      setProcessing(false);
    }
  };

  // The lesson-pay check (D4 step 3A). Keeping things as they are returns to this form.
  if (pay) {
    return (
      <PayGuardDialog
        open
        session={session}
        op={pay.op}
        args={pay.args}
        names={Object.fromEntries((teachers ?? []).map((t: any) => [t.id, t.full_name]))}
        onClose={() => setPay(null)}
        onDone={() => {
          const next = pay.next;
          setPay(null);
          if (next) void saveRest(next);
        }}
      />
    );
  }

  // A time change is checked first. Keeping the lesson as it is returns to this form.
  if (moveOpen) {
    return (
      <GuardDialog
        open
        session={session}
        op="move"
        change={moveChange}
        onClose={() => setMoveOpen(false)}
        onDone={() => {
          setMoveOpen(false);
          void saveRest();
        }}
        // A lesson that ended more than a week ago is pay even while
        // Scheduled (review S-1): its time is refused here with the money
        // preview, and the lesson-pay check takes over, then the rest saves.
        onPayCheck={(d) => {
          setMoveOpen(false);
          setPay({
            op: d.op,
            args: d.plan.args ?? { session_id: session.id, start_time: `${startTime}:00`, end_time: `${endTime}:00` },
            next: {},
          });
        }}
      />
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Session Time</DialogTitle>
          <DialogDescription>
            {session.classes?.name} - {format(new Date(session.date), "MMM dd, yyyy")}
          </DialogDescription>
        </DialogHeader>

        {isPast && session.status === "Held" && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <p className="font-semibold">Editing Past Held Session</p>
              <p className="mt-1">
                This session is already held. Time changes will affect payroll and tuition calculations.
              </p>
            </div>
          </div>
        )}

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

          <SessionTASelector selectedTAIds={selectedTAIds} onChange={setSelectedTAIds} />

          <SessionTimeFields
            startTime={startTime}
            endTime={endTime}
            onStartChange={setStartTime}
            onEndChange={setEndTime}
            expectedMinutes={expectedMinutes}
            acceptedLengths={acceptedLengths}
            fromWeeklySlot={expected.source === "slot"}
            lengthForStart={(start) =>
              expectedLengthFor({
                date: session.date,
                startTime: start,
                slots,
                classDefaultMinutes,
              }).minutes
            }
            idPrefix="edit-session"
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Session notes..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={processing}>
            {processing ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
