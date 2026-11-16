import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { SessionTASelector } from "@/components/admin/SessionTASelector";
import { SessionTimeFields } from "@/components/admin/SessionTimeFields";
import { addMinutesToTime } from "@/lib/sessionDuration";
import { configuredLengths, expectedLengthFor, parseWeeklySlots } from "@/lib/classSchedule";
import { manageSession } from "@/components/admin/session-guard/api";
import { PayGuardDialog } from "@/components/admin/session-guard/GuardDialog";
import { errorText } from "@/lib/sessionGuard";
import { payDialogFrom, type PayOp } from "@/lib/lessonPayGuard";

interface AddSessionModalProps {
  classId: string;
  date: Date;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddSessionModal = ({ classId, date, open, onClose, onSuccess }: AddSessionModalProps) => {
  const [startTime, setStartTime] = useState("17:30");
  const [endTime, setEndTime] = useState("19:00");
  const [teacherId, setTeacherId] = useState("");
  const [useDefaultTeacher, setUseDefaultTeacher] = useState(true);
  const [rateOverride, setRateOverride] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedTAIds, setSelectedTAIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // D4 step 3A: a lesson that has already started is added through the lesson-pay check.
  const [pay, setPay] = useState<{ op: PayOp; args: Record<string, unknown> } | null>(null);

  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teachers")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");
      
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classData } = useQuery({
    queryKey: ["class", classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select(
          "default_teacher_id, session_rate_vnd, default_session_length_minutes, schedule_template",
        )
        .eq("id", classId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!classId,
  });

  // The length this class runs ON THIS DAY, taken from its weekly slot. A
  // class running 2h on Wednesday and 90m on Saturday fills in the right end
  // time for whichever day this dialog was opened on.
  const slots = parseWeeklySlots(classData?.schedule_template);
  const classDefaultMinutes = classData?.default_session_length_minutes ?? null;
  const expected = expectedLengthFor({
    date: format(date, "yyyy-MM-dd"),
    startTime,
    slots,
    classDefaultMinutes,
  });
  const expectedMinutes = expected.minutes;
  const acceptedLengths = configuredLengths(slots, classDefaultMinutes);

  // Seed the end time from the class length once the class is known, so the
  // dialog opens already consistent rather than with a hardcoded 19:00.
  useEffect(() => {
    if (!expectedMinutes || !startTime) return;
    const next = addMinutesToTime(startTime, expectedMinutes, false);
    if (next) setEndTime(next);
    // Only on load of the class length - afterwards the user is in control.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectedMinutes]);

  // Auto-select default teacher when class data loads
  useEffect(() => {
    if (classData?.default_teacher_id && useDefaultTeacher && !teacherId) {
      setTeacherId(classData.default_teacher_id);
    }
  }, [classData, useDefaultTeacher, teacherId]);

  /** After the lesson exists: its assistants (a new lesson is Scheduled, so this is not a pay change), then close. */
  const finish = async (sessionId: string | null) => {
    if (selectedTAIds.length > 0 && sessionId) {
      const participants = selectedTAIds.map(taId => ({
        session_id: sessionId,
        participant_type: 'teaching_assistant',
        teaching_assistant_id: taId,
      }));
      await supabase.from("session_participants").insert(participants);
    }
    toast.success("Session created successfully");
    onSuccess();
    onClose();
  };

  const handleSubmit = async () => {
    if (!teacherId) {
      toast.error("Please select a teacher");
      return;
    }

    setLoading(true);
    try {
      // D4 step 3A: a lesson is always created Scheduled (the register makes
      // it Held), as the admin. One that has already started is billed to
      // every child enrolled that day, so the server answers 409 with the
      // lesson-pay check instead of creating it; the check creates it.
      const res = await manageSession<{ session?: { id: string } }>("create", {
        class_id: classId,
        date: format(date, "yyyy-MM-dd"),
        start_time: startTime,
        end_time: endTime,
        teacher_id: teacherId,
        rate_override_vnd: rateOverride ? parseInt(rateOverride) : null,
        notes: notes || null,
      });
      if (!res.ok) {
        const d = payDialogFrom(res.error);
        if (d) {
          setPay({ op: d.op, args: d.plan.args ?? {} });
          return;
        }
        throw new Error(errorText(res.error.code, res.error.message));
      }
      await finish(res.data?.session?.id ?? null);
    } catch (error: any) {
      console.error("Error creating session:", error);
      toast.error(error.message || "Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  if (pay) {
    return (
      <PayGuardDialog
        open
        session={{ id: "", date: format(date, "yyyy-MM-dd"), start_time: startTime, end_time: endTime }}
        op={pay.op}
        args={pay.args}
        names={Object.fromEntries((teachers as any[]).map((t: any) => [t.id, t.full_name]))}
        onClose={() => setPay(null)}
        onDone={(s: any) => {
          setPay(null);
          void finish(s?.session?.id ?? null);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Session - {format(date, "MMMM d, yyyy")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                date: format(date, "yyyy-MM-dd"),
                startTime: start,
                slots,
                classDefaultMinutes,
              }).minutes
            }
            idPrefix="add-session"
          />

          <div className="space-y-2">
            <Label htmlFor="teacher">Teacher *</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger>
                <SelectValue placeholder={classData?.default_teacher_id ? "Using default teacher" : "Select teacher"} />
              </SelectTrigger>
              <SelectContent>
                {classData?.default_teacher_id && (
                  <SelectItem value={classData.default_teacher_id}>
                    Default Teacher: {teachers.find(t => t.id === classData.default_teacher_id)?.full_name}
                  </SelectItem>
                )}
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {classData?.default_teacher_id && (
              <p className="text-xs text-muted-foreground">
                Default teacher will be used if not specified
              </p>
            )}
          </div>

          <SessionTASelector selectedTAIds={selectedTAIds} onChange={setSelectedTAIds} />

          <div className="space-y-2">
            <Label htmlFor="rate">Price Override (VND) - not used for staff pay</Label>
            <Input
              id="rate"
              type="number"
              placeholder={`Default: ${classData?.session_rate_vnd?.toLocaleString('vi-VN') || '210,000'} ₫`}
              value={rateOverride}
              onChange={(e) => setRateOverride(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (visible to students)</Label>
            <Textarea
              id="notes"
              placeholder="Optional notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSessionModal;
