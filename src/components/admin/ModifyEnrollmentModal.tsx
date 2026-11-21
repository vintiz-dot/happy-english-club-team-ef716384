import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowRightLeft, Pause, StopCircle, Settings } from "lucide-react";
import { format } from "date-fns";
import { rpcErrorText } from "@/lib/moneyGuard";
import { INPUT_TEXT } from "@/lib/moneyInputs";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";
import type { MoneyRequest } from "@/components/admin/money-guard/useMoneyChange";
import { formatVND } from "@/lib/money";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface ModifyEnrollmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: {
    id: string;
    student_id: string;
    class_id: string;
    start_date: string;
    end_date: string | null;
    students: {
      full_name: string;
    };
    classes: {
      name: string;
    };
  };
}

export function ModifyEnrollmentModal({
  open,
  onOpenChange,
  enrollment,
}: ModifyEnrollmentModalProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("transfer");
  
  // Transfer state
  const [newClassId, setNewClassId] = useState("");
  const [transferDate, setTransferDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  
  // Pause state
  const [pauseFrom, setPauseFrom] = useState(format(new Date(), "yyyy-MM-dd"));
  const [pauseTo, setPauseTo] = useState("");
  const [pauseMemo, setPauseMemo] = useState("");
  
  // End state
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // Settings state
  const [allowedDays, setAllowedDays] = useState<number[]>([]);
  const [rateOverride, setRateOverride] = useState<string>("");
  const [daysFrom, setDaysFrom] = useState(format(new Date(), "yyyy-MM-dd"));

  // Fetch current enrollment details
  const { data: enrollmentDetails } = useQuery({
    queryKey: ["enrollment-details", enrollment.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enrollments")
        .select("allowed_days, rate_override_vnd")
        .eq("id", enrollment.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch class schedule to get available days
  const { data: classSchedule } = useQuery({
    queryKey: ["class-schedule", enrollment.class_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("schedule_template, session_rate_vnd")
        .eq("id", enrollment.class_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Parse schedule template to get class days
  const classDays: number[] = classSchedule?.schedule_template
    ? ((classSchedule.schedule_template as any)?.weeklySlots || []).map((s: any) => s.dayOfWeek)
    : [];

  // Initialize settings state when data loads
  useEffect(() => {
    if (enrollmentDetails) {
      setAllowedDays(enrollmentDetails.allowed_days || classDays);
      setRateOverride(enrollmentDetails.rate_override_vnd?.toString() || "");
    }
  }, [enrollmentDetails, classDays.join(",")]);

  // Fetch available classes for transfer
  const { data: availableClasses } = useQuery({
    queryKey: ["available-classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .neq("id", enrollment.class_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: open,
  });


  // D4 step 3B (G-13, G-14): every change here goes through the checked
  // path as the signed-in admin (money_change_preview -> money_change_checked).
  // The server works out which billed months the change reaches. From this
  // month on that is nothing: the change is made at once and one row records
  // it. When it reaches a billed month the dialog asks for a reason first.
  // Steps still to run after the one in hand (a rate, then weekdays).
  const steps = useRef<Array<() => Promise<MoneyRequest | null>>>([]);
  const finished = useRef<() => void>(() => {});

  const recalc = async (months: string[]) => {
    for (const month of [...new Set(months)]) {
      await supabase.functions.invoke("calculate-tuition", { body: { studentId: enrollment.student_id, month } });
    }
  };
  const monthAfter = (date: string) => format(new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)), 1), "yyyy-MM");

  /** The enrolment of this child in this class that covers a date (a dated change may have split it). */
  const enrollmentOn = async (date: string): Promise<string> => {
    const { data } = await supabase
      .from("enrollments")
      .select("id, start_date, end_date")
      .eq("student_id", enrollment.student_id)
      .eq("class_id", enrollment.class_id)
      .lte("start_date", date)
      .order("start_date", { ascending: false });
    return (data ?? []).find((e) => !e.end_date || e.end_date >= date)?.id ?? enrollment.id;
  };

  const runNext = async (): Promise<"done" | "waiting" | "stopped"> => {
    while (steps.current.length > 0) {
      const request = await steps.current.shift()!();
      if (!request) continue;
      const r = await money.run(request);
      if (r.status === "dialog") return "waiting";     // the dialog's confirmation calls runNext again
      if (r.status === "refused") {
        steps.current = [];
        toast.error(r.message);
        return "stopped";
      }
    }
    finished.current();
    return "done";
  };
  const money = useMoneyInput(() => {
    void runNext();
  });

  const start = async (list: Array<() => Promise<MoneyRequest | null>>, done: () => void | Promise<void>,
    failed: (error: any) => void) => {
    steps.current = list;
    finished.current = () => { void done(); };
    setWorking(true);
    try {
      await runNext();
    } catch (error: any) {
      failed(error);        // the server's sentence, never a raw code (rpcErrorText)
    } finally {
      setWorking(false);
    }
  };
  const [working, setWorking] = useState(false);

  const afterChange = async (message: string, months: string[], keys: string[]) => {
    try {
      await recalc(months);
    } catch {
      // the change is made; the bills are worked out the next time they are opened
    }
    toast.success(message);
    for (const k of keys) queryClient.invalidateQueries({ queryKey: [k] });
    onOpenChange(false);
  };

  const transfer = () => start([async () => ({
    entity: "enrollment",
    op: "transfer",
    args: { student_id: enrollment.student_id, old_class_id: enrollment.class_id, new_class_id: newClassId, effective_date: transferDate },
  })], () => afterChange("Transferred successfully.", [transferDate.slice(0, 7), monthAfter(transferDate)],
    ["student-enrollments", "class-enrollments", "student-tuition"]),
    (error) => toast.error(rpcErrorText(error, "Failed to transfer enrollment")));

  const pause = () => start([async () => ({
    entity: "enrollment",
    op: "pause",
    args: { student_id: enrollment.student_id, class_id: enrollment.class_id, from: pauseFrom, to: pauseTo, memo: pauseMemo || null },
  })], () => afterChange("Paused successfully. The lessons in that window are Excused.", [pauseFrom.slice(0, 7)],
    ["student-enrollments", "student-tuition", "pause-windows"]),
    (error) => toast.error(rpcErrorText(error, "Failed to pause enrollment")));

  const end = () => start([async () => ({
    entity: "enrollment",
    op: "end",
    args: { student_id: enrollment.student_id, class_id: enrollment.class_id, end_date: endDate },
  })], () => afterChange("Ended successfully.", [endDate.slice(0, 7)], ["student-enrollments", "class-enrollments", "student-tuition"]),
    (error) => toast.error(rpcErrorText(error, "Failed to end enrollment")));

  const settingsFailed = (error: any) => toast.error(rpcErrorText(error, "Failed to update settings"));

  const settingsChanges = () => {
    // Determine if allowed_days should be null (all days) or specific days
    const sortedAllowed = [...allowedDays].sort((a, b) => a - b);
    const sortedClassDays = [...classDays].sort((a, b) => a - b);
    const isAllDays = sortedAllowed.length === sortedClassDays.length &&
      sortedAllowed.every((d, i) => d === sortedClassDays[i]);
    const oldDays = [...(enrollmentDetails?.allowed_days || classDays)].sort((a, b) => a - b);
    const daysChanged = oldDays.join(",") !== sortedAllowed.join(",");
    const newRate = rateOverride ? parseInt(rateOverride) : null;
    const rateChanged = newRate !== (enrollmentDetails?.rate_override_vnd ?? null);
    return { sortedAllowed, isAllDays, daysChanged, newRate, rateChanged };
  };

  /** The default: rate and weekdays change FROM THE DATE. The past keeps what it was charged. */
  const saveSettings = () => {
    const { sortedAllowed, isAllDays, daysChanged, newRate, rateChanged } = settingsChanges();
    const list: Array<() => Promise<MoneyRequest | null>> = [];
    if (rateChanged) {
      list.push(async () => ({
        entity: "enrollment",
        op: "set_terms_from",
        args: { enrollment_id: await enrollmentOn(daysFrom), terms: { rate_override_vnd: newRate }, effective_date: daysFrom },
      }));
    }
    if (daysChanged) {
      list.push(async () => ({
        entity: "enrollment",
        op: "set_days",
        args: { enrollment_id: await enrollmentOn(daysFrom), allowed_days: isAllDays ? [] : sortedAllowed, effective_date: daysFrom },
      }));
    }
    if (list.length === 0) {
      toast.message("Nothing was changed");
      return;
    }
    void start(list, () => afterChange("Enrollment settings updated", [daysFrom.slice(0, 7)],
      ["student-enrollments", "enrollment-details", "student-tuition", "class-enrollments"]), settingsFailed);
  };

  /** The second button: the rate was wrong all along. Reaches every month of the enrolment. */
  const correctRate = () => {
    const { newRate, rateChanged } = settingsChanges();
    if (!rateChanged) {
      toast.message("The rate is the same as before");
      return;
    }
    void start([async () => ({
      entity: "enrollment",
      op: "set_rate",
      args: { enrollment_id: enrollment.id, rate_override_vnd: newRate },
    })], () => afterChange("Rate corrected for the whole enrollment", [format(new Date(), "yyyy-MM")],
      ["student-enrollments", "enrollment-details", "student-tuition", "class-enrollments"]), settingsFailed);
  };

  const handleConfirm = () => {
    if (activeTab === "transfer") {
      void transfer();
    } else if (activeTab === "pause") {
      void pause();
    } else if (activeTab === "end") {
      void end();
    } else if (activeTab === "settings") {
      saveSettings();
    }
  };

  const handleDayToggle = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const isPending = working || money.running || money.guard.busy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modify Enrollment</DialogTitle>
          <DialogDescription>
            {enrollment.students.full_name} in {enrollment.classes.name}
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Every change needs a date.</strong> Lessons before it keep their marks and
            enrollment; only lessons from that date on change.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="transfer">
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer
            </TabsTrigger>
            <TabsTrigger value="pause">
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </TabsTrigger>
            <TabsTrigger value="end">
              <StopCircle className="h-4 w-4 mr-2" />
              End
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transfer" className="space-y-4">
            <div className="space-y-2">
              <Label>New Class *</Label>
              <Select value={newClassId} onValueChange={setNewClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Effective Date *</Label>
              <Input
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                First lesson in the new class. The old class ends the day before; its past marks are kept.
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!newClassId || !transferDate || isPending}
              className="w-full"
            >
              {isPending ? "Processing..." : "Confirm Transfer"}
            </Button>
          </TabsContent>

          <TabsContent value="pause" className="space-y-4">
            <div className="space-y-2">
              <Label>Pause From *</Label>
              <Input
                type="date"
                value={pauseFrom}
                onChange={(e) => setPauseFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Pause To *</Label>
              <Input
                type="date"
                value={pauseTo}
                onChange={(e) => setPauseTo(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Memo (Optional)</Label>
              <Textarea
                value={pauseMemo}
                onChange={(e) => setPauseMemo(e.target.value)}
                placeholder="Reason for pause..."
                rows={3}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Sessions in this window will be marked as Excused. Enrollment dates stay unchanged.
            </p>

            <Button
              onClick={handleConfirm}
              disabled={!pauseFrom || !pauseTo || isPending}
              className="w-full"
            >
              {isPending ? "Processing..." : "Confirm Pause"}
            </Button>
          </TabsContent>

          <TabsContent value="end" className="space-y-4">
            <div className="space-y-2">
              <Label>Last day in this class *</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Marks up to this day are kept. After it, only automatic placeholder marks are removed; marks a teacher made stay.
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={!endDate || isPending}
              variant="destructive"
              className="w-full"
            >
              {isPending ? "Processing..." : "Confirm End Enrollment"}
            </Button>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-2">
              <Label>Days Attending</Label>
              <p className="text-sm text-muted-foreground">
                Select which days the student attends. Only selected days will be billed.
              </p>
              <div className="flex flex-wrap gap-3 mt-2">
                {classDays.length > 0 ? (
                  classDays.map((day) => (
                    <label
                      key={day}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <Checkbox
                        checked={allowedDays.includes(day)}
                        onCheckedChange={() => handleDayToggle(day)}
                      />
                      <span>{DAY_NAMES[day]}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No schedule found for this class
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Changes apply from *</Label>
              <Input type="date" value={daysFrom} onChange={(e) => setDaysFrom(e.target.value)} />
              <p className="text-sm text-muted-foreground">
                Lessons before this date keep the old days and the old rate. Only lessons from this date on follow the new ones.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custom Session Rate (VND)</Label>
              <Input
                type="number"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                placeholder={classSchedule?.session_rate_vnd ? formatVND(classSchedule.session_rate_vnd) : "Default rate"}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use class default rate
                {classSchedule?.session_rate_vnd && 
                  ` (${formatVND(classSchedule.session_rate_vnd)})`
                }
              </p>
            </div>

            <Button
              onClick={handleConfirm}
              disabled={allowedDays.length === 0 || !daysFrom || isPending}
              className="w-full"
            >
              {isPending ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              onClick={correctRate}
              disabled={isPending}
              variant="outline"
              className="w-full whitespace-normal h-auto min-h-10"
            >
              {INPUT_TEXT.wholeEnrollment} (rate)
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
      <MoneyInputDialog
        guard={money.guard}
        subject={`${enrollment.students.full_name} - ${enrollment.classes.name}`}
        names={{ [enrollment.student_id]: enrollment.students.full_name }}
      />
    </Dialog>
  );
}
