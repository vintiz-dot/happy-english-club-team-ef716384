import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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


  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("modify_enrollment_transfer", {
        p_student_id: enrollment.student_id,
        p_old_class_id: enrollment.class_id,
        p_new_class_id: newClassId,
        p_effective_date: transferDate,
      });
      
      if (error) throw error;
      const result = data as any;
      
      // Trigger tuition recalculation for affected months
      await supabase.functions.invoke("calculate-tuition", {
        body: {
          studentId: enrollment.student_id,
          month: result.effective_month,
        },
      });
      
      await supabase.functions.invoke("calculate-tuition", {
        body: {
          studentId: enrollment.student_id,
          month: result.next_month,
        },
      });
      
      return result;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Transferred successfully. ${data.deleted_future_attendance} attendance rows deleted, ${data.seeded_attendance} new rows created.`
      );
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["class-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to transfer enrollment");
    },
  });

  // Pause mutation
  const pauseMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("pause_enrollment", {
        p_student_id: enrollment.student_id,
        p_class_id: enrollment.class_id,
        p_from_date: pauseFrom,
        p_to_date: pauseTo,
        p_memo: pauseMemo || null,
      });
      
      if (error) throw error;
      const result = data as any;
      
      // Trigger tuition recalculation
      await supabase.functions.invoke("calculate-tuition", {
        body: {
          studentId: enrollment.student_id,
          month: result.effective_month,
        },
      });
      
      return result;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Paused successfully. ${data.excused_attendance} sessions marked as Excused.`
      );
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      queryClient.invalidateQueries({ queryKey: ["pause-windows"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to pause enrollment");
    },
  });

  // End mutation
  const endMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("end_enrollment", {
        p_student_id: enrollment.student_id,
        p_class_id: enrollment.class_id,
        p_end_date: endDate,
      });
      
      if (error) throw error;
      const result = data as any;
      
      // Trigger tuition recalculation
      await supabase.functions.invoke("calculate-tuition", {
        body: {
          studentId: enrollment.student_id,
          month: result.effective_month,
        },
      });
      
      return result;
    },
    onSuccess: (data: any) => {
      toast.success(
        `Ended successfully. ${data.deleted_future_attendance} future attendance rows deleted.`
      );
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to end enrollment");
    },
  });

  // Settings mutation
  const settingsMutation = useMutation({
    mutationFn: async () => {
      // Determine if allowed_days should be null (all days) or specific days
      const sortedAllowed = [...allowedDays].sort((a, b) => a - b);
      const sortedClassDays = [...classDays].sort((a, b) => a - b);
      const isAllDays = sortedAllowed.length === sortedClassDays.length &&
        sortedAllowed.every((d, i) => d === sortedClassDays[i]);

      const oldDays = [...(enrollmentDetails?.allowed_days || classDays)].sort((a, b) => a - b);
      const daysChanged = oldDays.join(",") !== sortedAllowed.join(",");

      const { error } = await supabase
        .from("enrollments")
        .update({
          rate_override_vnd: rateOverride ? parseInt(rateOverride) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", enrollment.id);
      if (error) throw error;

      // Weekdays are date-aware: lessons before `daysFrom` keep the old days.
      if (daysChanged) {
        const { error: daysError } = await supabase.rpc("change_enrollment_days", {
          p_enrollment_id: enrollment.id,
          p_allowed_days: isAllDays ? [] : sortedAllowed,
          p_effective_date: daysFrom,
        });
        if (daysError) throw daysError;
      }

      // Trigger tuition recalculation for current month
      const currentMonth = daysChanged ? daysFrom.slice(0, 7) : format(new Date(), "yyyy-MM");
      await supabase.functions.invoke("calculate-tuition", {
        body: {
          studentId: enrollment.student_id,
          month: currentMonth,
        },
      });

      return { isAllDays };
    },
    onSuccess: () => {
      toast.success("Enrollment settings updated");
      queryClient.invalidateQueries({ queryKey: ["student-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["enrollment-details"] });
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleConfirm = () => {
    if (activeTab === "transfer") {
      transferMutation.mutate();
    } else if (activeTab === "pause") {
      pauseMutation.mutate();
    } else if (activeTab === "end") {
      endMutation.mutate();
    } else if (activeTab === "settings") {
      settingsMutation.mutate();
    }
  };

  const handleDayToggle = (day: number) => {
    setAllowedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const isPending = transferMutation.isPending || pauseMutation.isPending || 
    endMutation.isPending || settingsMutation.isPending;

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
              <Label>Days change from *</Label>
              <Input type="date" value={daysFrom} onChange={(e) => setDaysFrom(e.target.value)} />
              <p className="text-sm text-muted-foreground">
                Lessons before this date keep the old days. Only lessons from this date on follow the new days.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Custom Session Rate (VND)</Label>
              <Input
                type="number"
                value={rateOverride}
                onChange={(e) => setRateOverride(e.target.value)}
                placeholder={classSchedule?.session_rate_vnd?.toLocaleString() || "Default rate"}
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use class default rate
                {classSchedule?.session_rate_vnd && 
                  ` (${classSchedule.session_rate_vnd.toLocaleString()} VND)`
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
