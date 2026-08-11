import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface AssignDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess: () => void;
}

export function AssignDiscountModal({ open, onOpenChange, studentId, onSuccess }: AssignDiscountModalProps) {
  const [mode, setMode] = useState<"existing" | "custom">("existing");
  const [discountDefId, setDiscountDefId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState("");
  const [memo, setMemo] = useState("");
  const [loading, setLoading] = useState(false);

  // Custom (one-off) discount fields
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"amount" | "percent">("amount");
  const [customCadence, setCustomCadence] = useState<"once" | "monthly">("once");
  const [customValue, setCustomValue] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: definitions } = useQuery({
    queryKey: ["discount-definitions-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("discount_definitions")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const reset = () => {
    setDiscountDefId("");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setEffectiveTo("");
    setMemo("");
    setCustomName("");
    setCustomValue("");
    setCustomType("amount");
    setCustomCadence("once");
  };

  const handleAssign = async () => {
    if (mode === "existing" && !discountDefId) {
      toast({ title: "Missing field", description: "Please select a discount", variant: "destructive" });
      return;
    }
    if (mode === "custom" && (!customName.trim() || !customValue || Number(customValue) <= 0)) {
      toast({
        title: "Missing field",
        description: "Enter a name and a value greater than zero",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      let defId = discountDefId;

      if (mode === "custom") {
        const { data: created, error: defError } = await supabase
          .from("discount_definitions")
          .insert({
            name: customName.trim(),
            type: customType,
            value: Number(customValue),
            cadence: customCadence,
            start_month: effectiveFrom.slice(0, 7),
            end_month: customCadence === "once" ? effectiveFrom.slice(0, 7) : effectiveTo ? effectiveTo.slice(0, 7) : null,
            is_active: true,
          })
          .select("id")
          .single();
        if (defError) throw defError;
        defId = created.id;
      }

      const { error } = await supabase.from("discount_assignments").insert({
        student_id: studentId,
        discount_def_id: defId,
        effective_from: effectiveFrom,
        effective_to: mode === "custom" && customCadence === "once" ? effectiveFrom : effectiveTo || null,
        note: memo || null,
      });

      if (error) {
        if (error.message?.includes("no_overlapping_assignments")) {
          throw new Error("This discount already has an overlapping assignment for this student");
        }
        throw error;
      }

      await supabase.from("audit_log").insert({
        entity: "discount_assignment",
        entity_id: studentId,
        action: "create",
        diff: { discount_def_id: defId, effective_from: effectiveFrom, effective_to: effectiveTo, mode },
      });

      toast({ title: "Success", description: "Discount assigned to student" });
      queryClient.invalidateQueries({ queryKey: ["discount-definitions-active"] });

      onSuccess();
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedDef = definitions?.find((d) => d.id === discountDefId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Discount</DialogTitle>
          <DialogDescription>
            Assign an existing discount or create a one-time / recurring custom discount for this student.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "existing" | "custom")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Existing discount</TabsTrigger>
            <TabsTrigger value="custom">Custom discount</TabsTrigger>
          </TabsList>

          <TabsContent value="existing" className="space-y-2 pt-4">
            <Label>Discount</Label>
            <Select value={discountDefId} onValueChange={setDiscountDefId}>
              <SelectTrigger>
                <SelectValue placeholder="Select discount" />
              </SelectTrigger>
              <SelectContent>
                {definitions?.map((def) => (
                  <SelectItem key={def.id} value={def.id}>
                    {def.name} ({def.value}
                    {def.type === "percent" ? "%" : " VND"} - {def.cadence})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDef && (
              <p className="text-sm text-muted-foreground">
                Expected effect:{" "}
                {selectedDef.type === "percent"
                  ? `${selectedDef.value}% off`
                  : `${selectedDef.value.toLocaleString()} VND off`}{" "}
                {selectedDef.cadence === "monthly" ? "every month" : "once"}
              </p>
            )}
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Discount name</Label>
              <Input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Goodwill adjustment - August"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={customType} onValueChange={(v) => setCustomType(v as "amount" | "percent")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="amount">Fixed amount (VND)</SelectItem>
                    <SelectItem value="percent">Percent (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={customCadence} onValueChange={(v) => setCustomCadence(v as "once" | "monthly")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">One time only</SelectItem>
                    <SelectItem value="monthly">Every month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{customType === "percent" ? "Percent off" : "Amount off (VND)"}</Label>
              <Input
                type="number"
                min={0}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={customType === "percent" ? "10" : "200000"}
              />
              {customCadence === "once" && (
                <p className="text-xs text-muted-foreground">
                  Applies only to {effectiveFrom.slice(0, 7)}.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Effective From</Label>
              <Input type="date" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Effective To (optional)</Label>
              <Input
                type="date"
                value={mode === "custom" && customCadence === "once" ? effectiveFrom : effectiveTo}
                disabled={mode === "custom" && customCadence === "once"}
                onChange={(e) => setEffectiveTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Memo (optional)</Label>
            <Textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Note about this assignment"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={loading}>
            {loading ? "Saving..." : "Assign Discount"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
