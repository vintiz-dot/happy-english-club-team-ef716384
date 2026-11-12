import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Users, ArrowDown, Check, AlertCircle, Loader2, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatVND } from "@/lib/invoice/formatter";
import { monthKey } from "@/lib/date";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { useIvory } from "@/hooks/useIvory";

interface SmartFamilyPaymentModalProps {
  open: boolean;
  onClose: () => void;
}

interface Family {
  id: string;
  name: string;
}

interface DiscountDetail {
  name: string;
  type: "percent" | "amount";
  value: number;
  amount: number;
  appliedToClass?: string;
}

interface SiblingBalance {
  id: string;
  name: string;
  debt: number;
  credit: number;
  baseAmount: number;
  totalDiscount: number;
  totalAmount: number; // post-discount current month charges
  discounts: DiscountDetail[];
}

interface AllocationPreview {
  studentId: string;
  studentName: string;
  debt: number;
  applied: number;
  remaining: number;
  afterDebt: number;
}

export function SmartFamilyPaymentModal({ open, onClose }: SmartFamilyPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [siblings, setSiblings] = useState<SiblingBalance[]>([]);
  
  const [formData, setFormData] = useState({
    amount: "",
    method: "Bank Transfer",
    occurredAt: new Date().toISOString().slice(0, 10),
    memo: "",
    month: monthKey(),
    leftoverHandling: "unapplied_cash" as "voluntary_contribution" | "unapplied_cash",
    consentGiven: false,
  });

  const queryClient = useQueryClient();
  const tuitionMonth = useTuitionMonthConfirmation(formData.month, open);
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  // Load families with multiple students
  useEffect(() => {
    if (open) {
      loadFamilies();
    }
  }, [open]);

  // Load sibling balances when family selected
  useEffect(() => {
    if (selectedFamilyId) {
      loadSiblingBalances();
    } else {
      setSiblings([]);
    }
  }, [selectedFamilyId, formData.month]);

  const loadFamilies = async () => {
    // Get families with 2+ active students
    const { data: studentsData } = await supabase
      .from("students")
      .select("family_id, families(id, name)")
      .eq("is_active", true)
      .not("family_id", "is", null);

    if (studentsData) {
      // Count students per family
      const familyCounts = new Map<string, { count: number; name: string }>();
      studentsData.forEach((s: any) => {
        if (s.family_id && s.families) {
          const existing = familyCounts.get(s.family_id);
          if (existing) {
            existing.count++;
          } else {
            familyCounts.set(s.family_id, { count: 1, name: s.families.name });
          }
        }
      });

      // Filter to families with 2+ students
      const eligibleFamilies: Family[] = [];
      familyCounts.forEach((value, key) => {
        if (value.count >= 2) {
          eligibleFamilies.push({ id: key, name: value.name });
        }
      });

      setFamilies(eligibleFamilies.sort((a, b) => a.name.localeCompare(b.name)));
    }
  };

  const loadSiblingBalances = async () => {
    setLoadingBalances(true);
    try {
      const { data: studentsData } = await supabase
        .from("students")
        .select("id, full_name")
        .eq("family_id", selectedFamilyId)
        .eq("is_active", true)
        .order("full_name");

      if (!studentsData || studentsData.length === 0) {
        setSiblings([]);
        return;
      }

      // Parallel fetch - all siblings at once
      const balancePromises = studentsData.map(async (student) => {
        try {
          const { data } = await supabase.functions.invoke("calculate-tuition", {
            body: { studentId: student.id, month: formData.month }
          });
          return {
            id: student.id,
            name: student.full_name,
            debt: data?.carry?.carryOutDebt ?? 0,
            credit: data?.carry?.carryOutCredit ?? 0,
            baseAmount: data?.baseAmount ?? 0,
            totalDiscount: data?.totalDiscount ?? 0,
            totalAmount: data?.totalAmount ?? 0,
            discounts: (data?.discounts ?? []).map((d: any) => ({
              name: d.name,
              type: d.type,
              value: d.value,
              amount: d.amount,
              appliedToClass: d.appliedToClass,
            })),
          };
        } catch (e) {
          console.error(`Failed to fetch balance for ${student.id}:`, e);
          return {
            id: student.id,
            name: student.full_name,
            debt: 0,
            credit: 0,
            baseAmount: 0,
            totalDiscount: 0,
            totalAmount: 0,
            discounts: [],
          };
        }
      });

      const balances = await Promise.all(balancePromises);
      
      // Sort by debt descending
      balances.sort((a, b) => b.debt - a.debt);
      setSiblings(balances);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Calculate allocation preview
  const allocationPreview = useMemo((): AllocationPreview[] => {
    const amount = parseInt(formData.amount) || 0;
    if (amount <= 0 || siblings.length === 0) return [];

    const preview: AllocationPreview[] = [];
    let remaining = amount;

    for (const sibling of siblings) {
      const applied = Math.min(sibling.debt, remaining);
      const afterDebt = sibling.debt - applied;
      
      preview.push({
        studentId: sibling.id,
        studentName: sibling.name,
        debt: sibling.debt,
        applied,
        remaining: remaining - applied,
        afterDebt,
      });

      remaining -= applied;
    }

    return preview;
  }, [formData.amount, siblings]);

  const totalFamilyDebt = siblings.reduce((sum, s) => sum + s.debt, 0);
  const paymentAmount = parseInt(formData.amount) || 0;
  const leftoverAmount = Math.max(0, paymentAmount - totalFamilyDebt);
  const totalApplied = Math.min(paymentAmount, totalFamilyDebt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording a payment"); return; }

    if (!selectedFamilyId) {
      toast.error("Please select a family");
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (leftoverAmount > 0 && formData.leftoverHandling === "voluntary_contribution" && !formData.consentGiven) {
      toast.error("Parent consent required for voluntary contribution");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        familyId: selectedFamilyId,
        amount: paymentAmount,
        method: formData.method,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        memo: formData.memo,
        month: formData.month,
        leftoverHandling: leftoverAmount > 0 ? formData.leftoverHandling : undefined,
        consentGiven: formData.consentGiven,
      };

      const { data, error } = await supabase.functions.invoke("smart-family-payment", { body: payload });

      if (error) throw error;

      toast.success(`Smart payment processed for ${data.allocations?.length || 0} students`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-live"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["family-payment-activity"] });

      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error posting smart family payment:", error);
      toast.error(error.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedFamilyId("");
    setSiblings([]);
    setFormData({
      amount: "",
      method: "Bank Transfer",
      occurredAt: new Date().toISOString().slice(0, 10),
      memo: "",
      month: monthKey(),
      leftoverHandling: "unapplied_cash",
      consentGiven: false,
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSettleAll = () => {
    setFormData(prev => ({ ...prev, amount: totalFamilyDebt.toString() }));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Smart Family Payment
          </DialogTitle>
          <DialogDescription>
            Automatically distribute payment across siblings with waterfall allocation
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Family Selection */}
          <div className="space-y-3">
            <Label>Select Family</Label>
            <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a family with siblings..." />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {families.length === 0 && (
              <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>
                No families with multiple active students found
              </p>
            )}
          </div>

          {/* Month Selection */}
          <div className="space-y-2">
            <Label>Tuition month</Label>
            <Input
              type="month"
              value={formData.month}
              onChange={(e) => setFormData({ ...formData, month: e.target.value })}
            />
          </div>

          {/* Sibling Balances */}
          {tuitionMonth.field}
          {selectedFamilyId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Sibling Balances (Sorted by Debt)</Label>
                {loadingBalances && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
              
              {loadingBalances ? (
                <div className={iv("border border-hec-line rounded-hec-md divide-y divide-hec-line", "border rounded-lg divide-y")}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-5 w-24" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className={iv("border border-hec-line rounded-hec-md divide-y divide-hec-line", "border rounded-lg divide-y")}>
                  {siblings.map((sibling, index) => (
                    <div key={sibling.id} className="p-3 space-y-2">
                      <div className={iv("flex items-start justify-between gap-3", "flex items-center justify-between")}>
                        <div className={iv("flex min-w-0 flex-1 items-start gap-3", "flex items-center gap-3")}>
                          <div className={iv("h-6 w-6 shrink-0 rounded-full bg-hec-sunken text-hec-ink-soft flex items-center justify-center text-hec-caption font-medium tabular-nums", "h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium")}>
                            {index + 1}
                          </div>
                          <span className={iv("min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink", "font-medium")}>{sibling.name}</span>
                        </div>
                        <Badge variant={sibling.debt > 0 ? "destructive" : "secondary"} className={iv(sibling.debt > 0 ? "shrink-0 whitespace-nowrap tabular-nums" : "shrink-0 whitespace-nowrap border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf", "")}>
                          {sibling.debt > 0 ? `Owes ${formatVND(sibling.debt)}` : "Settled"}
                        </Badge>
                      </div>

                      {/* Discount breakdown */}
                      {sibling.baseAmount > 0 && (
                        <div className={iv("ml-9 text-hec-caption space-y-1", "ml-9 text-xs space-y-1")}>
                          <div className={iv("flex flex-wrap gap-x-3 gap-y-1 text-hec-ink-soft tabular-nums", "flex gap-3 text-muted-foreground")}>
                            <span className={iv("whitespace-nowrap", "")}>Base: {formatVND(sibling.baseAmount)}</span>
                            {sibling.totalDiscount > 0 && (
                              <span className={iv("whitespace-nowrap text-hec-ink-soft", "text-green-600")}>Disc: -{formatVND(sibling.totalDiscount)}</span>
                            )}
                            <span className={iv("whitespace-nowrap font-medium text-hec-ink", "font-medium text-foreground")}>Net: {formatVND(sibling.totalAmount)}</span>
                          </div>

                          {sibling.discounts.length > 0 && (
                            <Collapsible>
                              <CollapsibleTrigger className={iv("flex min-h-hec-target items-center gap-1 rounded-hec-sm text-hec-brass hover:underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors")}>
                                <ChevronDown className="h-3 w-3" />
                                <span>{sibling.discounts.length} discount{sibling.discounts.length > 1 ? 's' : ''} applied</span>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="pt-1 space-y-0.5">
                                {sibling.discounts.map((d, i) => (
                                  <div key={i} className={iv("flex items-baseline justify-between gap-4 text-hec-ink-soft", "flex justify-between text-muted-foreground")}>
                                    <span className={iv("min-w-0 whitespace-normal break-words", "")}>
                                      {d.name}
                                      {d.type === 'percent' ? ` (${d.value}%)` : ''}
                                      {d.appliedToClass ? ` · ${d.appliedToClass}` : ''}
                                    </span>
                                    <span className={iv("shrink-0 whitespace-nowrap text-hec-ink tabular-nums", "text-green-600")}>-{formatVND(d.amount)}</span>
                                  </div>
                                ))}
                              </CollapsibleContent>
                            </Collapsible>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <div className={iv("flex items-baseline justify-between gap-4 text-hec-small", "flex items-center justify-between text-sm")}>
                <span className={iv("min-w-0 text-hec-ink-soft", "text-muted-foreground")}>Total Family Debt (post-discount):</span>
                <span className={iv("shrink-0 whitespace-nowrap font-semibold text-hec-ink tabular-nums", "font-semibold text-destructive")}>{formatVND(totalFamilyDebt)}</span>
              </div>
            </div>
          )}

          {/* Payment Details */}
          {siblings.length > 0 && (
            <>
              <div className={iv("grid grid-cols-1 sm:grid-cols-2 gap-4", "grid grid-cols-2 gap-4")}>
                <div className={iv("min-w-0 space-y-2", "space-y-2")}>
                  <Label htmlFor="amount">Payment Amount (VND) *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      className={iv("min-w-0 flex-1 tabular-nums", "flex-1")}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={handleSettleAll}>
                      Settle All
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="method">Payment Method</Label>
                  <Select
                    value={formData.method}
                    onValueChange={(v) => setFormData({ ...formData, method: v })}
                  >
                    <SelectTrigger id="method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.occurredAt}
                    onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="memo">Memo (Optional)</Label>
                  <Input
                    id="memo"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="Payment note"
                  />
                </div>
              </div>

              {/* Allocation Preview */}
              {paymentAmount > 0 && (
                <Card className={iv("bg-hec-sunken", "border-primary/20 bg-primary/5")}>
                  <CardContent className={iv("pt-4 sm:pt-6 space-y-3", "pt-4 space-y-3")}>
                    <div className={iv("flex items-center gap-2 text-hec-body font-medium text-hec-ink", "flex items-center gap-2 font-medium")}>
                      <Users className="h-4 w-4" />
                      Payment Allocation Preview
                    </div>

                    <div className="space-y-2">
                      {allocationPreview.map((alloc, index) => (
                        <div key={alloc.studentId} className={iv("flex flex-wrap items-center gap-x-2 gap-y-1 text-hec-small text-hec-ink", "flex items-center gap-2 text-sm")}>
                          <div className={iv("h-6 w-6 shrink-0 rounded-full bg-hec-surface border border-hec-line text-hec-ink-soft flex items-center justify-center text-hec-caption tabular-nums", "h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs")}>
                            {index + 1}
                          </div>
                          <span className={iv("min-w-0 flex-1 basis-32 whitespace-normal break-words hyphens-none font-medium", "flex-1")}>{alloc.studentName}</span>
                          <span className={iv("whitespace-nowrap text-hec-ink-soft tabular-nums", "text-muted-foreground")}>
                            (debt: {formatVND(alloc.debt)})
                          </span>
                          <ArrowDown className={iv("h-3 w-3 text-hec-ink-soft", "h-3 w-3 text-muted-foreground")} />
                          <span className={ivory ? (alloc.applied > 0 ? "whitespace-nowrap font-medium text-hec-ink tabular-nums" : "text-hec-ink-soft") : alloc.applied > 0 ? "text-green-600 font-medium" : "text-muted-foreground"}>
                            {alloc.applied > 0 ? `Apply: ${formatVND(alloc.applied)}` : "—"}
                          </span>
                          {alloc.afterDebt === 0 && alloc.applied > 0 && (
                            <Check className={iv("h-4 w-4 text-hec-leaf", "h-4 w-4 text-green-600")} aria-label={ivory ? "Settled in full" : undefined} />
                          )}
                        </div>
                      ))}
                    </div>

                    <div className={iv("flex items-baseline justify-between gap-4 pt-3 border-t-2 border-hec-ink text-hec-body text-hec-ink", "flex justify-between pt-2 border-t text-sm")}>
                      <span className={iv("min-w-0 font-semibold", "")}>Total Applied:</span>
                      <span className={iv("shrink-0 whitespace-nowrap font-sans text-hec-h3 font-semibold text-hec-ink tabular-nums", "font-medium text-green-600")}>{formatVND(totalApplied)}</span>
                    </div>

                    {leftoverAmount > 0 && (
                      <div className={iv("flex items-baseline justify-between gap-4 text-hec-small text-hec-ink", "flex justify-between text-sm")}>
                        <span className={iv("min-w-0 text-hec-warn font-medium", "")}>Leftover:</span>
                        <span className={iv("shrink-0 whitespace-nowrap font-medium text-hec-ink tabular-nums", "font-medium text-orange-600")}>{formatVND(leftoverAmount)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Leftover Handling */}
              {leftoverAmount > 0 && (
                <Alert className={iv("rounded-hec-md border-hec-warn/30 bg-hec-warn-tint text-hec-ink [&>svg]:text-hec-warn", "")}>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className={iv("font-medium tabular-nums", "font-medium")}>
                        Leftover amount: {formatVND(leftoverAmount)}
                      </p>
                      <RadioGroup
                        value={formData.leftoverHandling}
                        onValueChange={(v: any) => setFormData({ ...formData, leftoverHandling: v })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unapplied_cash" id="unapplied" />
                          <label htmlFor="unapplied" className={iv("flex min-h-hec-target items-center text-hec-small text-hec-ink", "text-sm")}>
                            Store as unapplied cash (credit for future)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="voluntary_contribution" id="contribution" />
                          <label htmlFor="contribution" className={iv("flex min-h-hec-target items-center text-hec-small text-hec-ink", "text-sm")}>
                            Treat as voluntary contribution
                          </label>
                        </div>
                      </RadioGroup>

                      {formData.leftoverHandling === "voluntary_contribution" && (
                        <div className={iv("flex items-center space-x-2 pt-2 border-t border-hec-warn/30", "flex items-center space-x-2 pt-2 border-t")}>
                          <Checkbox
                            id="consent"
                            checked={formData.consentGiven}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, consentGiven: checked as boolean })
                            }
                          />
                          <label htmlFor="consent" className={iv("flex min-h-hec-target items-center text-hec-small text-hec-ink", "text-sm")}>
                            Parent has given consent for voluntary contribution
                          </label>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || siblings.length === 0 || paymentAmount <= 0}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Process Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
