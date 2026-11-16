import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface EditDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: any;
  studentId: string;
}

export function EditDiscountModal({
  open,
  onOpenChange,
  assignment,
  studentId,
}: EditDiscountModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Determine if this is a referral bonus or discount assignment
  const isReferralBonus = assignment && !assignment.discount_def && !assignment.discount_definitions;
  const discountName = isReferralBonus 
    ? "Referral Bonus"
    : assignment?.discount_def?.name || assignment?.discount_definitions?.name || "Discount";
  
  const [effectiveFrom, setEffectiveFrom] = useState(assignment?.effective_from || "");
  const [effectiveTo, setEffectiveTo] = useState(assignment?.effective_to || "");
  const [note, setNote] = useState(assignment?.note || "");
  
  // Value fields (for referral bonuses)
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    assignment?.type || "percent"
  );
  const [discountValue, setDiscountValue] = useState(
    assignment?.value?.toString() || ""
  );
  const [discountCadence, setDiscountCadence] = useState<"once" | "monthly">(
    assignment?.cadence || "monthly"
  );

  useEffect(() => {
    if (open && assignment) {
      setEffectiveFrom(assignment.effective_from || "");
      setEffectiveTo(assignment.effective_to || "");
      setNote(assignment.note || "");
      
      if (isReferralBonus) {
        setDiscountType(assignment.type || "percent");
        setDiscountValue(assignment.value?.toString() || "");
        setDiscountCadence(assignment.cadence || "monthly");
      }
    }
  }, [open, assignment, isReferralBonus]);

  // D4 step 3B (G-15): the dates (and, for a referral bonus, its value) are
  // changed through the checked path as the signed-in admin. A change that
  // only moves days of this month is tier 0; one that reaches a billed month
  // asks for a reason. A discount never changes child.
  const updated = () => {
    queryClient.invalidateQueries({ queryKey: ["student-discount-assignments", studentId] });
    queryClient.invalidateQueries({ queryKey: ["special-discount-assignments"] });
    queryClient.invalidateQueries({ queryKey: ["referral-bonuses"] });
    queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
    toast({
      title: "Success",
      description: "Discount updated successfully",
    });
    onOpenChange(false);
  };
  const money = useMoneyInput(updated);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const r = await money.run(isReferralBonus
        ? {
            entity: "referral_bonus",
            op: "edit",
            args: {
              id: assignment.id,
              effective_from: effectiveFrom,
              effective_to: effectiveTo || null,
              note: note || null,
              type: discountType,
              value: parseInt(discountValue),
              cadence: discountCadence,
            },
          }
        : {
            entity: "discount_assignment",
            op: "edit",
            args: { id: assignment.id, effective_from: effectiveFrom, effective_to: effectiveTo || null, note: note || null },
          });
      if (r.status === "refused") throw new Error(r.message);
      return r;
    },
    onSuccess: (r) => {
      if (r.status === "done" && r.unchanged) onOpenChange(false);
      else if (r.status === "done") updated();
      // "dialog": the reason dialog is open; confirming it calls updated()
    },
    onError: (error: any) => {
      console.error("Error updating discount:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update discount",
        variant: "destructive",
      });
    },
  });

  const handleUpdate = () => {
    if (!effectiveFrom) {
      toast({
        title: "Missing field",
        description: "Please select an effective from date",
        variant: "destructive",
      });
      return;
    }

    if (isReferralBonus && (!discountValue || parseInt(discountValue) <= 0)) {
      toast({
        title: "Invalid value",
        description: "Please enter a valid discount value",
        variant: "destructive",
      });
      return;
    }

    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {isReferralBonus ? "Referral Bonus" : "Discount"}</DialogTitle>
          <DialogDescription>
            Modify the {isReferralBonus ? "value, " : ""}dates and notes for {discountName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isReferralBonus && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">Percent</SelectItem>
                      <SelectItem value="amount">Amount (VND)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percent" ? "e.g. 10" : "e.g. 100000"}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cadence">Cadence</Label>
                <Select value={discountCadence} onValueChange={(v: any) => setDiscountCadence(v)}>
                  <SelectTrigger id="cadence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          <div>
            <Label htmlFor="effectiveFrom">Effective From</Label>
            <Input
              id="effectiveFrom"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="effectiveTo">Effective To (Optional)</Label>
            <Input
              id="effectiveTo"
              type="date"
              value={effectiveTo}
              onChange={(e) => setEffectiveTo(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add any notes about this discount..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
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
      <MoneyInputDialog guard={money.guard} subject={discountName} />
    </Dialog>
  );
}
