import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionError";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users, Check, Loader2, Wallet, ChevronRight, ChevronLeft,
  CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatVND } from "@/lib/money";
import { monthKey } from "@/lib/date";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { showSeal } from "@/components/fx/showSeal";

interface BatchFamilyPaymentModalProps {
  open: boolean;
  onClose: () => void;
}

interface Family {
  id: string;
  name: string;
  studentCount: number;
}

interface FamilyDebtInfo {
  familyId: string;
  familyName: string;
  totalDebt: number;
  siblings: { id: string; name: string; debt: number }[];
  loaded: boolean;
  error?: string;
}

interface FamilyPaymentEntry {
  familyId: string;
  amount: number;
  settled: boolean;
}

type Step = "select" | "configure" | "processing" | "results";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { useOwingBills } from "@/hooks/useOwingMonths";
import { earlierOwing, familyOldestOwingMonth, owingRowNote, type FamilyOwingMonth } from "@/lib/owingMonth";

interface ProcessingResult {
  familyId: string;
  familyName: string;
  success: boolean;
  amount: number;
  allocationsCount: number;
  error?: string;
}

export function BatchFamilyPaymentModal({ open, onClose }: BatchFamilyPaymentModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [families, setFamilies] = useState<Family[]>([]);
  const [selectedFamilyIds, setSelectedFamilyIds] = useState<Set<string>>(new Set());
  const [familyDebts, setFamilyDebts] = useState<Map<string, FamilyDebtInfo>>(new Map());
  const [loadingFamilies, setLoadingFamilies] = useState(false);
  const [loadingDebts, setLoadingDebts] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);

  const [sharedSettings, setSharedSettings] = useState({
    method: "Bank Transfer",
    occurredAt: new Date().toISOString().slice(0, 10),
    memo: "",
    month: monthKey(),
  });

  // Per-family amount overrides (familyId -> amount string)
  const tuitionMonth = useTuitionMonthConfirmation(sharedSettings.month, open);
  const [familyAmounts, setFamilyAmounts] = useState<Map<string, string>>(new Map());

  const queryClient = useQueryClient();

  // Load families on open
  useEffect(() => {
    if (open) {
      loadFamilies();
      setStep("select");
      setSelectedFamilyIds(new Set());
      setFamilyDebts(new Map());
      setFamilyAmounts(new Map());
      setResults([]);
    }
  }, [open]);

  const loadFamilies = async () => {
    setLoadingFamilies(true);
    try {
      const { data: studentsData } = await supabase
        .from("students")
        .select("family_id, families(id, name)")
        .eq("is_active", true)
        .not("family_id", "is", null);

      if (studentsData) {
        const familyCounts = new Map<string, { count: number; name: string }>();
        studentsData.forEach((s: any) => {
          if (s.family_id && s.families) {
            const existing = familyCounts.get(s.family_id);
            if (existing) existing.count++;
            else familyCounts.set(s.family_id, { count: 1, name: s.families.name });
          }
        });

        const eligible: Family[] = [];
        familyCounts.forEach((value, key) => {
          if (value.count >= 2) {
            eligible.push({ id: key, name: value.name, studentCount: value.count });
          }
        });

        setFamilies(eligible.sort((a, b) => a.name.localeCompare(b.name)));
      }
    } finally {
      setLoadingFamilies(false);
    }
  };

  const toggleFamily = (familyId: string) => {
    setSelectedFamilyIds(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedFamilyIds(new Set(families.map(f => f.id)));
  };

  const deselectAll = () => {
    setSelectedFamilyIds(new Set());
  };

  // Load debts for selected families when moving to configure step
  const loadDebtsForSelected = useCallback(async () => {
    setLoadingDebts(true);
    const newDebts = new Map<string, FamilyDebtInfo>();
    const newAmounts = new Map<string, string>();

    const promises = Array.from(selectedFamilyIds).map(async (familyId) => {
      const family = families.find(f => f.id === familyId);
      if (!family) return;

      try {
        // Get students
        const { data: students } = await supabase
          .from("students")
          .select("id, full_name")
          .eq("family_id", familyId)
          .eq("is_active", true)
          .order("full_name");

        if (!students || students.length === 0) {
          newDebts.set(familyId, {
            familyId, familyName: family.name, totalDebt: 0,
            siblings: [], loaded: true,
          });
          return;
        }

        // Parallel fetch balances
        const balances = await Promise.all(
          students.map(async (s) => {
            try {
              const { data } = await supabase.functions.invoke("calculate-tuition", {
                body: { studentId: s.id, month: sharedSettings.month },
              });
              return {
                id: s.id,
                name: s.full_name,
                debt: data?.carry?.carryOutDebt ?? 0,
              };
            } catch {
              return { id: s.id, name: s.full_name, debt: 0 };
            }
          })
        );

        balances.sort((a, b) => b.debt - a.debt);
        const totalDebt = balances.reduce((sum, b) => sum + b.debt, 0);

        newDebts.set(familyId, {
          familyId, familyName: family.name, totalDebt,
          siblings: balances, loaded: true,
        });

        // Default amount = total debt
        newAmounts.set(familyId, totalDebt > 0 ? totalDebt.toString() : "0");
      } catch (e: any) {
        newDebts.set(familyId, {
          familyId, familyName: family.name, totalDebt: 0,
          siblings: [], loaded: true, error: e.message,
        });
      }
    });

    await Promise.all(promises);
    setFamilyDebts(newDebts);
    setFamilyAmounts(newAmounts);
    setLoadingDebts(false);
  }, [selectedFamilyIds, families, sharedSettings.month]);

  const goToConfigure = async () => {
    setStep("configure");
    await loadDebtsForSelected();
  };

  // Computed totals
  const selectedFamiliesWithDebt = useMemo(() => {
    return Array.from(selectedFamilyIds)
      .map(id => familyDebts.get(id))
      .filter((d): d is FamilyDebtInfo => !!d && d.loaded);
  }, [selectedFamilyIds, familyDebts]);

  // A family that still owes an EARLIER month is marked on its row (pattern D).
  // One month is recorded for every family here, so the note says to switch.
  const { data: owingBills } = useOwingBills(
    useMemo(() => selectedFamiliesWithDebt.flatMap(f => f.siblings.map(s => s.id)), [selectedFamiliesWithDebt]),
    open && step === "configure",
  );
  const earlierFor = (family: FamilyDebtInfo): FamilyOwingMonth | null => {
    if (!owingBills) return null;
    const bills = Object.fromEntries(family.siblings.map(s => [s.id, owingBills[s.id] ?? []]));
    return earlierOwing(familyOldestOwingMonth(bills), sharedSettings.month);
  };

  const grandTotalDebt = useMemo(() =>
    selectedFamiliesWithDebt.reduce((sum, f) => sum + f.totalDebt, 0),
    [selectedFamiliesWithDebt]
  );

  const grandTotalPayment = useMemo(() =>
    selectedFamiliesWithDebt.reduce((sum, f) => {
      const amt = parseInt(familyAmounts.get(f.familyId) || "0") || 0;
      return sum + amt;
    }, 0),
    [selectedFamiliesWithDebt, familyAmounts]
  );

  const settleAllFamilies = () => {
    const newAmounts = new Map(familyAmounts);
    for (const f of selectedFamiliesWithDebt) {
      newAmounts.set(f.familyId, f.totalDebt.toString());
    }
    setFamilyAmounts(newAmounts);
  };

  // Process all payments
  const processAllPayments = async () => {
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording payments"); return; }
    setProcessing(true);
    setStep("processing");
    setProcessingProgress(0);

    const toProcess = selectedFamiliesWithDebt.filter(f => {
      const amt = parseInt(familyAmounts.get(f.familyId) || "0") || 0;
      return amt > 0;
    });

    const newResults: ProcessingResult[] = [];
    let completed = 0;

    for (const family of toProcess) {
      const amount = parseInt(familyAmounts.get(family.familyId) || "0") || 0;

      try {
        const { data, error } = await supabase.functions.invoke("smart-family-payment", {
          body: {
            familyId: family.familyId,
            amount,
            method: sharedSettings.method,
            occurredAt: new Date(sharedSettings.occurredAt).toISOString(),
            memo: sharedSettings.memo || `Batch payment – ${family.familyName}`,
            month: sharedSettings.month,
            // Only when the extra-credit line was shown (OVERPAYMENT).
            leftoverHandling: amount > family.totalDebt ? "credit_next_bill" : undefined,
          },
        });

        // The function's own sentence, not "non-2xx status code".
        if (error) throw new Error(await functionErrorMessage(error));

        newResults.push({
          familyId: family.familyId,
          familyName: family.familyName,
          success: true,
          amount,
          allocationsCount: data?.allocations?.length || 0,
        });
      } catch (e: any) {
        newResults.push({
          familyId: family.familyId,
          familyName: family.familyName,
          success: false,
          amount,
          allocationsCount: 0,
          error: e.message || "Failed",
        });
      }

      completed++;
      setProcessingProgress(Math.round((completed / toProcess.length) * 100));
    }

    setResults(newResults);
    setProcessing(false);
    setStep("results");
    // every family's payment was recorded (the function answered yes for each)
    if (newResults.length > 0 && newResults.every(r => r.success)) showSeal("Recorded");

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
    queryClient.invalidateQueries({ queryKey: ["admin-tuition-live"] });
    queryClient.invalidateQueries({ queryKey: ["payments"] });
    queryClient.invalidateQueries({ queryKey: ["family-payment-activity"] });
  };

  const handleClose = () => {
    if (processing) return; // prevent close during processing
    onClose();
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  const totalProcessed = results.reduce((s, r) => s + (r.success ? r.amount : 0), 0);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Batch Family Payment
          </DialogTitle>
          <DialogDescription>
            {step === "select" && "Select families to process payments for"}
            {step === "configure" && "Review debts and configure payment amounts"}
            {step === "processing" && "Processing payments..."}
            {step === "results" && "Payment results"}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex flex-wrap items-center gap-2 text-hec-caption text-hec-ink-soft">
          {["select", "configure", "processing", "results"].map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              <span className={(step === s ? "font-semibold text-hec-ink" : "")} aria-current={step === s ? "step" : undefined}>
                {s === "select" ? "Select" : s === "configure" ? "Configure" : s === "processing" ? "Process" : "Results"}
              </span>
            </div>
          ))}
        </div>

        <Separator />

        <ScrollArea className="flex-1 pr-4" style={{ minHeight: 0 }}>
          {/* STEP 1: SELECT FAMILIES */}
          {step === "select" && (
            <div className="space-y-4 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label>Families with 2+ students ({families.length})</Label>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>

              {loadingFamilies ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : (
                <div className="border border-hec-line rounded-hec-md divide-y divide-hec-line max-h-[35vh] overflow-y-auto pb-1">
                  {families.map(family => (
                    <label
                      key={family.id}
                      className="flex min-h-hec-target items-start gap-3 px-3 py-3 hover:bg-hec-sunken/60 cursor-pointer transition-colors duration-hec-1 ease-hec"
                    >
                      <Checkbox
                        checked={selectedFamilyIds.has(family.id)}
                        onCheckedChange={() => toggleFamily(family.id)}
                        className="mt-1 shrink-0"
                      />
                      <span className="min-w-0 flex-1 whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{family.name}</span>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">{family.studentCount} students</Badge>
                    </label>
                  ))}
                </div>
              )}

              {/* Shared settings */}
              <div className="space-y-3 pt-2">
                <Label className="text-hec-small font-semibold text-hec-ink">Payment Settings</Label>
                {tuitionMonth.field}
                <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                  <div className="min-w-0 space-y-2">
                    <Label className="text-hec-small font-medium text-hec-ink" htmlFor="batch-family-month">Tuition month</Label>
                    <Input
                      id="batch-family-month"
                      type="month"
                      value={sharedSettings.month}
                      onChange={e => setSharedSettings(p => ({ ...p, month: e.target.value }))}
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label className="text-hec-small font-medium text-hec-ink" htmlFor="batch-family-method">Method</Label>
                    <Select
                      value={sharedSettings.method}
                      onValueChange={v => setSharedSettings(p => ({ ...p, method: v }))}
                    >
                      <SelectTrigger id="batch-family-method"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label className="text-hec-small font-medium text-hec-ink" htmlFor="batch-family-date">Date</Label>
                    <Input
                      id="batch-family-date"
                      type="date"
                      value={sharedSettings.occurredAt}
                      onChange={e => setSharedSettings(p => ({ ...p, occurredAt: e.target.value }))}
                    />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <Label className="text-hec-small font-medium text-hec-ink" htmlFor="batch-family-memo">Memo (optional)</Label>
                    <Input
                      id="batch-family-memo"
                      value={sharedSettings.memo}
                      onChange={e => setSharedSettings(p => ({ ...p, memo: e.target.value }))}
                      placeholder="Batch payment note"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONFIGURE AMOUNTS */}
          {step === "configure" && (
            <div className="space-y-4 py-2">
              {loadingDebts ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <p className="text-hec-small text-hec-ink-soft">
                    Loading balances for {selectedFamilyIds.size} families...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label>Family Debts & Payment Amounts</Label>
                    <Button type="button" variant="outline" size="sm" onClick={settleAllFamilies}>
                      <Wallet className="h-3.5 w-3.5 mr-1.5" />
                      Settle All Debts
                    </Button>
                  </div>

                  <div className="border border-hec-line rounded-hec-md divide-y divide-hec-line">
                    {selectedFamiliesWithDebt.map(family => {
                      const amountStr = familyAmounts.get(family.familyId) || "0";
                      const amount = parseInt(amountStr) || 0;
                      const isFullSettle = amount >= family.totalDebt && family.totalDebt > 0;
                      const earlier = earlierFor(family);

                      return (
                        <div key={family.familyId} className="p-3 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <span className="whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{family.familyName}</span>
                              <span className="text-hec-caption text-hec-ink-soft ml-2 whitespace-nowrap tabular-nums">
                                {family.siblings.length} students
                              </span>
                            </div>
                            <Badge variant={family.totalDebt > 0 ? "destructive" : "secondary"} className="shrink-0 whitespace-nowrap tabular-nums">
                              {family.totalDebt > 0 ? `Debt: ${formatVND(family.totalDebt)}` : "No debt"}
                            </Badge>
                          </div>

                          {/* Siblings preview */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-hec-caption text-hec-ink-soft tabular-nums ml-1">
                            {family.siblings.map(s => (
                              <span key={s.id}>
                                {s.name}: {s.debt > 0 ? formatVND(s.debt) : "✓"}
                              </span>
                            ))}
                          </div>

                          {earlier && (
                            <p className="text-hec-caption text-hec-warn" role="status" data-owing-month={earlier.month}>{owingRowNote(earlier)}</p>
                          )}

                          {/* Amount input */}
                          {family.totalDebt > 0 && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                value={amountStr}
                                onChange={e => {
                                  const next = new Map(familyAmounts);
                                  next.set(family.familyId, e.target.value);
                                  setFamilyAmounts(next);
                                }}
                                className="min-w-0 tabular-nums"
                                aria-label={`Payment amount for ${family.familyName}`}
                              />
                              <Button
                                type="button" variant="ghost" size="sm"
                                className="shrink-0"
                                onClick={() => {
                                  const next = new Map(familyAmounts);
                                  next.set(family.familyId, family.totalDebt.toString());
                                  setFamilyAmounts(next);
                                }}
                              >
                                Settle
                              </Button>
                              {isFullSettle && <Check className="h-4 w-4 text-hec-leaf shrink-0" aria-label="Settles the full debt" />}
                            </div>
                          )}
                          {family.totalDebt > 0 && amount > family.totalDebt && (
                            <p className="text-hec-caption text-hec-ink tabular-nums">
                              The extra {formatVND(amount - family.totalDebt)} will show as credit on{" "}
                              {family.siblings[0]?.name ?? "the first child"}'s next bill.
                            </p>
                          )}

                          {family.error && (
                            <p className="text-hec-caption text-hec-danger">{family.error}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Grand totals */}
                  <Card>
                    <CardContent className="pt-4 sm:pt-6 space-y-2">
                      <div className="flex items-baseline justify-between gap-4 text-hec-small">
                        <span className="min-w-0 text-hec-ink-soft">Total Debt Across Families</span>
                        <span className="shrink-0 whitespace-nowrap font-semibold text-hec-ink tabular-nums">{formatVND(grandTotalDebt)}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 text-hec-small">
                        <span className="min-w-0 text-hec-ink-soft">Total Payment Amount</span>
                        <span className="shrink-0 whitespace-nowrap font-semibold text-hec-ink tabular-nums">{formatVND(grandTotalPayment)}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-4 text-hec-small">
                        <span className="min-w-0 text-hec-ink-soft">Families to Process</span>
                        <span className="shrink-0 font-semibold text-hec-ink tabular-nums">
                          {selectedFamiliesWithDebt.filter(f => (parseInt(familyAmounts.get(f.familyId) || "0") || 0) > 0).length}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* STEP 3: PROCESSING */}
          {step === "processing" && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-hec-brass" />
              <div className="text-center space-y-1">
                <p className="text-hec-body font-medium text-hec-ink">Processing payments...</p>
                <p className="text-hec-small text-hec-ink-soft">
                  Please don't close this dialog
                </p>
              </div>
              <Progress value={processingProgress} className="w-full max-w-64" aria-label="Payments processed" />
              <p className="text-hec-small text-hec-ink-soft tabular-nums">{processingProgress}%</p>
            </div>
          )}

          {/* STEP 4: RESULTS */}
          {step === "results" && (
            <div className="space-y-4 py-2">
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <p className="font-sans text-hec-h1 font-semibold text-hec-leaf tabular-nums">{successCount}</p>
                    <p className="text-hec-caption text-hec-ink-soft">Successful</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <p className="font-sans text-hec-h1 font-semibold text-hec-danger tabular-nums">{failCount}</p>
                    <p className="text-hec-caption text-hec-ink-soft">Failed</p>
                  </CardContent>
                </Card>
                <Card className="col-span-2 sm:col-span-1">
                  <CardContent className="pt-4 sm:pt-6 text-center">
                    <p className="whitespace-nowrap font-sans text-hec-h1 font-semibold text-hec-ink tabular-nums">{formatVND(totalProcessed)}</p>
                    <p className="text-hec-caption text-hec-ink-soft">Total Processed</p>
                  </CardContent>
                </Card>
              </div>

              {/* Per-family results */}
              <div className="border border-hec-line rounded-hec-md divide-y divide-hec-line">
                {results.map(r => (
                  <div key={r.familyId} className="flex items-start gap-3 p-3">
                    {r.success ? (
                      <CheckCircle2 className="h-5 w-5 text-hec-leaf shrink-0" aria-label="Recorded" />
                    ) : (
                      <XCircle className="h-5 w-5 text-hec-danger shrink-0" aria-label="Failed" />
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink">{r.familyName}</span>
                      {r.success ? (
                        <p className="text-hec-caption text-hec-ink-soft tabular-nums">
                          {formatVND(r.amount)} applied to {r.allocationsCount} students
                        </p>
                      ) : (
                        <p className="text-hec-caption text-hec-danger">{r.error}</p>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-hec-small font-medium text-hec-ink tabular-nums">{formatVND(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        <Separator />

        <DialogFooter className="gap-2">
          {step === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={goToConfigure}
                disabled={selectedFamilyIds.size === 0}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          )}
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <Button
                onClick={processAllPayments}
                disabled={loadingDebts || grandTotalPayment <= 0}
              >
                <Wallet className="h-4 w-4 mr-1.5" />
                <span className="tabular-nums">Process {formatVND(grandTotalPayment)}</span>
              </Button>
            </>
          )}
          {step === "results" && (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
