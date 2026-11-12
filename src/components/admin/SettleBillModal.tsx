import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { useIvory } from "@/hooks/useIvory";

interface SettleBillModalProps {
  studentId: string | null;
  studentName: string;
  month: string;
  balance: number;
  onClose: () => void;
}

export function SettleBillModal({
  studentId,
  studentName,
  month,
  balance,
  onClose,
}: SettleBillModalProps) {
  const [loading, setLoading] = useState(false);
  const [settlementType, setSettlementType] = useState<string>(
    balance > 0 ? "discount" : "unapplied_cash"
  );
  const [amount, setAmount] = useState(Math.abs(balance).toString());
  const [reason, setReason] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);
  const [approverName, setApproverName] = useState("");

  const queryClient = useQueryClient();
  const tuitionMonth = useTuitionMonthConfirmation(month, !!studentId);
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before settling this bill"); return; }

    if (!studentId || !reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }

    if (settlementType === "voluntary_contribution" && !consentGiven) {
      toast.error("Parent consent required for voluntary contribution");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("settle-bill", {
        body: {
          studentId,
          month,
          settlementType,
          amount: parseInt(amount),
          reason,
          consentGiven,
          approverName,
        },
      });

      if (error) {
        // Unwrap the function's JSON body — "non-2xx status code" alone is
        // useless to the admin reading the toast.
        let detail = error.message;
        try {
          const body = await (error as any).context?.json?.();
          if (body?.error) detail = body.error;
        } catch { /* keep the generic message */ }
        throw new Error(detail);
      }

      toast.success("Bill settled successfully");

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["student-tuition", studentId] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance"] });

      onClose();
    } catch (error: any) {
      console.error("Error settling bill:", error);
      toast.error(error.message || "Failed to settle bill");
    } finally {
      setLoading(false);
    }
  };

  if (!studentId) return null;

  const isDebit = balance > 0;
  const isCredit = balance < 0;

  return (
    <Dialog open={!!studentId} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Settle Bill - {studentName}</DialogTitle>
          <DialogDescription>Month: {month}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tuitionMonth.field}
          <div className={iv("rounded-hec-md border border-hec-line bg-hec-surface p-4 space-y-2", "rounded-lg border p-4 space-y-2")}>
            <div className={iv("flex items-baseline justify-between gap-4", "flex items-center justify-between")}>
              <span className={iv("min-w-0 text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Current Balance:</span>
              <span className={ivory ? "shrink-0 whitespace-nowrap font-sans text-hec-h3 font-semibold text-hec-ink tabular-nums" : `text-lg font-bold ${isDebit ? "text-destructive" : "text-green-600"}`}>
                {isDebit ? "+" : ""}{balance.toLocaleString()} VND
              </span>
            </div>
            <p className={ivory ? `text-hec-caption font-medium ${isDebit ? "text-hec-danger" : "text-hec-ink-soft"}` : "text-xs text-muted-foreground"}>
              {isDebit ? "Amount owed by student" : "Credit balance (overpaid)"}
            </p>
          </div>

          {isDebit && (
            <div className="space-y-3">
              <Label>Settlement Type</Label>
              <RadioGroup value={settlementType} onValueChange={setSettlementType}>
                <div className={iv("flex items-start space-x-2 p-3 border border-hec-line-strong rounded-hec-md", "flex items-start space-x-2 p-3 border rounded-lg")}>
                  <RadioGroupItem value="discount" id="discount" />
                  <div className={iv("min-w-0 flex-1", "flex-1")}>
                    <label htmlFor="discount" className={iv("font-medium text-hec-body text-hec-ink cursor-pointer", "font-medium cursor-pointer")}>
                      Tuition Adjustment (Discount)
                    </label>
                    <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>
                      Write off debt as tuition discount expense
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {isCredit && (
            <div className="space-y-3">
              <Label>How to handle overpayment?</Label>
              <RadioGroup value={settlementType} onValueChange={setSettlementType}>
                <div className={iv("flex items-start space-x-2 p-3 border border-hec-line-strong rounded-hec-md", "flex items-start space-x-2 p-3 border rounded-lg")}>
                  <RadioGroupItem value="unapplied_cash" id="unapplied" />
                  <div className={iv("min-w-0 flex-1", "flex-1")}>
                    <label htmlFor="unapplied" className={iv("font-medium text-hec-body text-hec-ink cursor-pointer", "font-medium cursor-pointer")}>
                      Unapplied Cash (Recommended)
                    </label>
                    <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>
                      Keep as customer credit for future tuition
                    </p>
                  </div>
                </div>

                <div className={iv("flex items-start space-x-2 p-3 border rounded-hec-md border-hec-warn/30 bg-hec-warn-tint", "flex items-start space-x-2 p-3 border rounded-lg border-amber-500 bg-amber-50")}>
                  <RadioGroupItem value="voluntary_contribution" id="contribution" />
                  <div className={iv("min-w-0 flex-1", "flex-1")}>
                    <label htmlFor="contribution" className={iv("font-medium text-hec-body text-hec-ink cursor-pointer", "font-medium cursor-pointer")}>
                      Voluntary Contribution
                    </label>
                    <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>
                      Convert to unrestricted revenue (requires parent consent)
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}

          {settlementType === "voluntary_contribution" && (
            <Alert className={iv("rounded-hec-md border-hec-warn/30 bg-hec-warn-tint text-hec-ink [&>svg]:text-hec-warn", "")}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-3">
                  <p className="font-medium">Parent consent required</p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="consent"
                      checked={consentGiven}
                      onCheckedChange={(checked) => setConsentGiven(checked as boolean)}
                    />
                    <label
                      htmlFor="consent"
                      className={iv("flex min-h-hec-target items-center text-hec-small text-hec-ink cursor-pointer", "text-sm cursor-pointer")}
                    >
                      Parent has given explicit consent for voluntary contribution (non-refundable)
                    </label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="approver">Approver Name</Label>
                    <Input
                      id="approver"
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Parent/guardian name"
                      required={settlementType === "voluntary_contribution"}
                    />
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Settle (VND)</Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              max={Math.abs(balance)}
              required
              className={ivory ? "tabular-nums" : undefined}
            />
            <p className={iv("text-hec-caption text-hec-ink-soft tabular-nums", "text-xs text-muted-foreground")}>
              Maximum: {Math.abs(balance).toLocaleString()} VND
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this settlement is necessary..."
              required
              rows={3}
            />
          </div>

          <div className={iv("rounded-hec-md border border-hec-line bg-hec-sunken p-4 space-y-2", "rounded-lg border border-blue-500 bg-blue-50 p-4 space-y-2")}>
            <div className={iv("flex items-center gap-2 text-hec-ink font-medium", "flex items-center gap-2 text-blue-800 font-medium")}>
              <CheckCircle2 className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4")} />
              Settlement Preview
            </div>
            <div className={iv("text-hec-small text-hec-ink tabular-nums space-y-1", "text-sm text-blue-700 space-y-1")}>
              <p>• Current Balance: {balance.toLocaleString()} VND</p>
              <p>• Settlement Amount: {parseInt(amount).toLocaleString()} VND</p>
              <p>
                • New Balance:{" "}
                {settlementType === "discount"
                  ? (balance - parseInt(amount)).toLocaleString()
                  : balance.toLocaleString()}{" "}
                VND
              </p>
              <p>
                • Classification:{" "}
                {settlementType === "discount"
                  ? "Tuition Discounts (Expense)"
                  : settlementType === "voluntary_contribution"
                  ? "Contributions (Revenue)"
                  : "Customer Credit (Liability)"}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                !reason.trim() ||
                (settlementType === "voluntary_contribution" && (!consentGiven || !approverName))
              }
            >
              {loading ? "Processing..." : "Settle Bill"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
