import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface EnrollStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  existingClassIds: string[];
  onSuccess: () => void;
}

export function EnrollStudentDialog({
  open,
  onOpenChange,
  studentId,
  existingClassIds,
  onSuccess,
}: EnrollStudentDialogProps) {
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [submitting, setSubmitting] = useState(false);

  const { data: classes } = useQuery({
    queryKey: ["active-classes-for-enroll"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const availableClasses = classes?.filter(
    (c) => !existingClassIds.includes(c.id)
  );

  // D4 step 3B (G-13): enrolling is a checked change made as the signed-in
  // admin. From today on it is tier 0 (no dialog, one row written); a start
  // date in a month already taught opens the reason dialog.
  const enrolled = () => {
    toast.success("Student enrolled successfully");
    onSuccess();
    onOpenChange(false);
    setClassId("");
  };
  const money = useMoneyInput(enrolled);

  const handleSubmit = async () => {
    if (!classId || !startDate) {
      toast.error("Please select a class and start date");
      return;
    }
    setSubmitting(true);
    try {
      const r = await money.run({
        entity: "enrollment",
        op: "enroll",
        args: { student_id: studentId, class_id: classId, start_date: startDate },
      });
      if (r.status === "done") enrolled();
      else if (r.status === "refused") toast.error(r.message);
    } catch (err: any) {
      toast.error(err.message || "Failed to enroll student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enroll in Class</DialogTitle>
          <DialogDescription>
            Select a class and start date for this student.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableClasses?.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Already enrolled in all active classes.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || !classId}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enroll
          </Button>
        </DialogFooter>
      </DialogContent>
      <MoneyInputDialog guard={money.guard} subject={classes?.find((c) => c.id === classId)?.name} />
    </Dialog>
  );
}
