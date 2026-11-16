import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { INPUT_TEXT } from "@/lib/moneyInputs";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface EditEnrollmentDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: {
    id: string;
    discount_type: string | null;
    discount_value: number | null;
    discount_cadence: string | null;
    classes: {
      name: string;
    };
  };
  studentId: string;
}

export function EditEnrollmentDiscountModal({
  open,
  onOpenChange,
  enrollment,
  studentId,
}: EditEnrollmentDiscountModalProps) {
  const queryClient = useQueryClient();
  const [discountType, setDiscountType] = useState<string>(enrollment.discount_type || "");
  const [discountValue, setDiscountValue] = useState<string>(enrollment.discount_value?.toString() || "");
  const [discountCadence, setDiscountCadence] = useState<string>(enrollment.discount_cadence || "");
  // D4 step 3B (G-14): a discount changes FROM A DATE by default - the months
  // before it keep what they were charged. Today unless the admin picks another day.
  const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState<string>(today());
  const [whole, setWhole] = useState(false);

  useEffect(() => {
    if (open) {
      setDiscountType(enrollment.discount_type || "");
      setDiscountValue(enrollment.discount_value?.toString() || "");
      // Map database "once" to UI "per_session"
      const uiCadence = enrollment.discount_cadence === "once" ? "per_session" : enrollment.discount_cadence;
      setDiscountCadence(uiCadence || "");
      setFromDate(today());
    }
  }, [open, enrollment]);

  // D4 step 3B (G-13 / G-14): the discount is written through the checked
  // path as the signed-in admin. "From a date" splits the enrolment on that
  // day (tier 0 from this month: no dialog). "Correct a mistake for the whole
  // enrolment" reaches every month it covers and asks for a reason when one
  // of them is billed. Either way one row records who, when, why, before and after.
  const done = () => {
    queryClient.invalidateQueries({ queryKey: ["student-enrollments", studentId] });
    queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
    toast.success("Enrollment discount updated successfully");
    onOpenChange(false);
  };
  const money = useMoneyInput(done);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Map cadence values to match database enum
      const dbCadence = discountCadence === "per_session" ? "once" : discountCadence;

      // If no discount type selected, clear all discount fields
      const terms = discountType === "" || discountType === "none"
        ? { discount_type: null, discount_value: null, discount_cadence: null }
        : {
            discount_type: discountType as "percent" | "amount",
            discount_value: parseInt(discountValue) || null,
            discount_cadence: dbCadence as "monthly" | "once",
          };

      const r = await money.run(whole
        ? { entity: "enrollment", op: "set_discount", args: { enrollment_id: enrollment.id, ...terms } }
        : { entity: "enrollment", op: "set_terms_from", args: { enrollment_id: enrollment.id, terms, effective_date: fromDate } });
      if (r.status === "refused") throw new Error(r.message);
      return r;
    },
    onSuccess: (r) => {
      if (r.status === "done" && r.unchanged) {
        toast.message("Nothing was changed");
        onOpenChange(false);
      } else if (r.status === "done") {
        done();
      }
      // "dialog": the reason dialog is open; confirming it calls done()
    },
    onError: (error: any) => {
      console.error("Error updating enrollment discount:", error);
      toast.error(error?.message || "Failed to update enrollment discount");
    },
  });

  const handleUpdate = () => {
    if (discountType && discountType !== "none") {
      if (!discountValue || parseInt(discountValue) <= 0) {
        toast.error("Please enter a valid discount value");
        return;
      }
      if (!discountCadence) {
        toast.error("Please select a discount cadence");
        return;
      }
    }
    updateMutation.mutate();
  };

  const handleRemoveDiscount = () => {
    setDiscountType("");
    setDiscountValue("");
    setDiscountCadence("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Enrollment Discount</DialogTitle>
          <DialogDescription>
            Modify the discount for enrollment in {enrollment.classes.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
              <div>
                <Label htmlFor="discountType">Discount Type</Label>
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger id="discountType">
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Discount</SelectItem>
                    <SelectItem value="percent">Percentage</SelectItem>
                    <SelectItem value="amount">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

          {discountType && discountType !== "none" && (
            <>
              <div>
                <Label htmlFor="discountValue">
                  Discount Value {discountType === "percent" ? "(%)" : "(VND)"}
                </Label>
                <Input
                  id="discountValue"
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="Enter discount value"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="discountCadence">Cadence</Label>
                <Select value={discountCadence} onValueChange={setDiscountCadence}>
                  <SelectTrigger id="discountCadence">
                    <SelectValue placeholder="Select cadence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_session">Per Session</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="discountFrom">Applies from</Label>
            <Input
              id="discountFrom"
              type="date"
              value={fromDate}
              disabled={whole}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Lessons before this date keep the discount they had.
            </p>
            <label className="mt-2 flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={whole}
                onChange={(e) => setWhole(e.target.checked)}
              />
              <span>{INPUT_TEXT.wholeEnrollment}</span>
            </label>
          </div>
        </div>

        <DialogFooter>
          {discountType && discountType !== "none" && (
            <Button
              variant="outline"
              onClick={handleRemoveDiscount}
              disabled={updateMutation.isPending}
            >
              Remove Discount
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
      <MoneyInputDialog guard={money.guard} subject={enrollment.classes.name} />
    </Dialog>
  );
}
