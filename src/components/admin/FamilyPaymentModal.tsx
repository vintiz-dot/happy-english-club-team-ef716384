import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { functionErrorMessage } from "@/lib/functionError";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Users, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";

interface FamilyPaymentModalProps {
  open: boolean;
  onClose: () => void;
}

interface Student {
  id: string;
  full_name: string;
  family_id: string;
  enrollments?: Array<{
    classes: {
      name: string;
    };
  }>;
}

interface Invoice {
  id: string;
  student_id: string;
  month: string;
  total_amount: number;
  paid_amount: number;
}

export function FamilyPaymentModal({ open, onClose }: FamilyPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [siblings, setSiblings] = useState<Student[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<Set<string>>(new Set());
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [formData, setFormData] = useState({
    month: "",
    amount: "",
    method: "Bank Transfer",
    occurredAt: new Date().toISOString().slice(0, 10),
    memo: "",
    allocationMode: "oldest-first" as "oldest-first" | "pro-rata" | "manual",
    leftoverHandling: "unapplied_cash" as "voluntary_contribution" | "unapplied_cash" | undefined,
    consentGiven: false,
  });

  const [manualAllocations, setManualAllocations] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();
  const tuitionMonth = useTuitionMonthConfirmation(formData.month, open);

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open]);

  useEffect(() => {
    if (selectedStudent) {
      loadFamilyData();
    }
  }, [selectedStudent, formData.month]);

  const loadStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select(`
        id, 
        full_name, 
        family_id,
        enrollments(
          classes(name)
        )
      `)
      .eq("is_active", true)
      .order("full_name");
    
    if (data) setStudents(data);
  };

  const loadFamilyData = async () => {
    if (!formData.month) { setInvoices([]); return; }
    if (!selectedStudent?.family_id) {
      setSiblings([]);
      return;
    }

    // Load siblings
    const { data: siblingsData } = await supabase
      .from("students")
      .select(`
        id, 
        full_name, 
        family_id,
        enrollments(
          classes(name)
        )
      `)
      .eq("family_id", selectedStudent.family_id)
      .eq("is_active", true)
      .order("full_name");

    if (siblingsData) {
      setSiblings(siblingsData);
      setSelectedSiblings(new Set(siblingsData.map(s => s.id)));
      
      // Initialize manual allocations
      const allocations: Record<string, string> = {};
      siblingsData.forEach(s => {
        allocations[s.id] = "";
      });
      setManualAllocations(allocations);
    }

    // Load balances using calculate-tuition (more accurate than invoice status)
    const siblingIds = siblingsData?.map(s => s.id) || [];
    if (siblingIds.length > 0) {
      const currentMonth = formData.month;
      const balances: Invoice[] = [];
      
      for (const sid of siblingIds) {
        try {
          const { data } = await supabase.functions.invoke("calculate-tuition", {
            body: { studentId: sid, month: currentMonth }
          });
          
          if (data?.carry) {
            const owed = data.carry.carryOutDebt || 0;
            if (owed > 0) {
              balances.push({
                id: `balance-${sid}`,
                student_id: sid,
                month: currentMonth,
                total_amount: owed,
                paid_amount: 0
              });
            }
          }
        } catch (e) {
          console.error(`Failed to fetch balance for student ${sid}:`, e);
        }
      }
      
      setInvoices(balances);
    }
  };

  const getStudentBalance = (studentId: string) => {
    return invoices
      .filter(inv => inv.student_id === studentId)
      .reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0);
  };

  const getTotalBalance = () => {
    return Array.from(selectedSiblings).reduce((sum, sid) => sum + getStudentBalance(sid), 0);
  };

  const getPreview = () => {
    const totalAmount = parseInt(formData.amount) || 0;
    const totalBalance = getTotalBalance();
    const leftover = Math.max(0, totalAmount - totalBalance);
    
    return {
      totalAmount,
      totalBalance,
      leftover,
      willApply: Math.min(totalAmount, totalBalance),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording a payment"); return; }

    if (!selectedStudent || selectedSiblings.size === 0) {
      toast.error("Please select students");
      return;
    }

    if (formData.allocationMode === "manual") {
      const total = Object.values(manualAllocations).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
      if (total > parseInt(formData.amount)) {
        toast.error("Manual allocations exceed payment amount");
        return;
      }
    }

    const preview = getPreview();
    if (preview.leftover > 0 && !formData.leftoverHandling) {
      toast.error("Please specify how to handle leftover amount");
      return;
    }

    if (formData.leftoverHandling === "voluntary_contribution" && !formData.consentGiven) {
      toast.error("Parent consent required for voluntary contribution");
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        month: formData.month,
        familyId: selectedStudent.family_id,
        selectedStudentIds: Array.from(selectedSiblings),
        amount: parseInt(formData.amount),
        method: formData.method,
        occurredAt: new Date(formData.occurredAt).toISOString(),
        memo: formData.memo,
        allocationMode: formData.allocationMode,
        leftoverHandling: preview.leftover > 0 ? formData.leftoverHandling : undefined,
        consentGiven: formData.consentGiven,
      };

      if (formData.allocationMode === "manual") {
        payload.manualAllocations = Array.from(selectedSiblings).map(sid => ({
          studentId: sid,
          amount: parseInt(manualAllocations[sid]) || 0,
        }));
      }

      const { error } = await supabase.functions.invoke("family-payment", { body: payload });

      // The function's own sentence, not "non-2xx status code".
        if (error) throw new Error(await functionErrorMessage(error));

      toast.success(`Family payment posted for ${selectedSiblings.size} students`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["student-tuition"] });
      queryClient.invalidateQueries({ queryKey: ["admin-finance"] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });

      onClose();
      resetForm();
    } catch (error: any) {
      console.error("Error posting family payment:", error);
      toast.error(error.message || "Failed to post family payment");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent(null);
    setSiblings([]);
    setSelectedSiblings(new Set());
    setInvoices([]);
    setFormData({
      month: "",
      amount: "",
      method: "Bank Transfer",
      occurredAt: new Date().toISOString().slice(0, 10),
      memo: "",
      allocationMode: "oldest-first",
      leftoverHandling: "unapplied_cash",
      consentGiven: false,
    });
    setManualAllocations({});
  };

  const preview = getPreview();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Post Family Payment
          </DialogTitle>
          <DialogDescription>
            Allocate a single payment across multiple siblings with automatic distribution
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="family-tuition-month">Tuition month *</Label>
            <Input id="family-tuition-month" type="month" required value={formData.month}
              onChange={e => setFormData(prev => ({ ...prev, month: e.target.value }))} />
          </div>
          {tuitionMonth.field}
          {/* Step 1: Select Student */}
          <div className="space-y-3">
            <Label>Select Any Family Member</Label>
            <Select
              value={selectedStudent?.id || ""}
              onValueChange={(id) => {
                const student = students.find(s => s.id === id);
                setSelectedStudent(student || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a student..." />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {siblings.length > 0 && (
            <>
              {/* Step 2: Select Siblings */}
              <div className="space-y-3">
                <Label>Select Students to Include</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {siblings.map((sibling) => {
                    const balance = getStudentBalance(sibling.id);
                    const classes = sibling.enrollments?.map(e => e.classes.name).join(", ") || "—";
                    return (
                      <div key={sibling.id} className="flex items-center justify-between p-2 hover:bg-muted rounded">
                        <div className="flex items-center space-x-3 flex-1">
                          <Checkbox
                            id={`sibling-${sibling.id}`}
                            checked={selectedSiblings.has(sibling.id)}
                            onCheckedChange={(checked) => {
                              const newSet = new Set(selectedSiblings);
                              if (checked) {
                                newSet.add(sibling.id);
                              } else {
                                newSet.delete(sibling.id);
                              }
                              setSelectedSiblings(newSet);
                            }}
                          />
                          <div className="flex flex-col flex-1">
                            <label htmlFor={`sibling-${sibling.id}`} className="cursor-pointer font-medium">
                              {sibling.full_name}
                            </label>
                            <span className="text-xs text-muted-foreground">{classes}</span>
                          </div>
                        </div>
                        <Badge variant={balance > 0 ? "destructive" : "secondary"}>
                          {balance > 0 ? "+" : ""}{balance.toLocaleString()} ₫
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total AR Balance: <span className="font-semibold">{getTotalBalance().toLocaleString()} ₫</span>
                </p>
              </div>

              {/* Step 3: Payment Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount (VND) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
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

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="memo">Memo</Label>
                  <Input
                    id="memo"
                    value={formData.memo}
                    onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                    placeholder="Optional note"
                  />
                </div>
              </div>

              {/* Step 4: Allocation Mode */}
              <div className="space-y-3">
                <Label>Allocation Mode</Label>
                <RadioGroup
                  value={formData.allocationMode}
                  onValueChange={(v: any) => setFormData({ ...formData, allocationMode: v })}
                >
                  <div className="flex items-start space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="oldest-first" id="oldest" />
                    <div className="flex-1">
                      <label htmlFor="oldest" className="font-medium cursor-pointer">
                        Oldest-First Waterfall (Recommended)
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Apply to oldest invoices first across selected students
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="pro-rata" id="prorata" />
                    <div className="flex-1">
                      <label htmlFor="prorata" className="font-medium cursor-pointer">
                        Pro-Rata by Balance
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Distribute proportionally based on each student's balance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="manual" id="manual" />
                    <div className="flex-1">
                      <label htmlFor="manual" className="font-medium cursor-pointer">
                        Manual Split
                      </label>
                      <p className="text-sm text-muted-foreground">
                        Specify exact amounts for each student
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {formData.allocationMode === "manual" && (
                <div className="space-y-3 border rounded-lg p-4">
                  <Label>Manual Allocation Amounts</Label>
                  {Array.from(selectedSiblings).map((sid) => {
                    const sibling = siblings.find(s => s.id === sid);
                    if (!sibling) return null;
                    return (
                      <div key={sid} className="flex items-center gap-3">
                        <span className="flex-1 font-medium">{sibling.full_name}</span>
                        <Input
                          type="number"
                          value={manualAllocations[sid] || ""}
                          onChange={(e) =>
                            setManualAllocations({ ...manualAllocations, [sid]: e.target.value })
                          }
                          placeholder="0"
                          className="w-40"
                        />
                        <span className="text-muted-foreground">₫</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Leftover Handling */}
              {preview.leftover > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p className="font-medium">
                        Leftover amount: {preview.leftover.toLocaleString()} ₫
                      </p>
                      <RadioGroup
                        value={formData.leftoverHandling}
                        onValueChange={(v: any) => setFormData({ ...formData, leftoverHandling: v })}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="unapplied_cash" id="leftover-unapplied" />
                          <label htmlFor="leftover-unapplied" className="cursor-pointer">
                            Keep as Unapplied Cash (Recommended)
                          </label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="voluntary_contribution" id="leftover-contribution" />
                          <label htmlFor="leftover-contribution" className="cursor-pointer">
                            Voluntary Contribution (requires consent)
                          </label>
                        </div>
                      </RadioGroup>

                      {formData.leftoverHandling === "voluntary_contribution" && (
                        <div className="flex items-center space-x-2 pt-2">
                          <Checkbox
                            id="leftover-consent"
                            checked={formData.consentGiven}
                            onCheckedChange={(checked) =>
                              setFormData({ ...formData, consentGiven: checked as boolean })
                            }
                          />
                          <label htmlFor="leftover-consent" className="text-sm cursor-pointer">
                            Parent has given explicit consent for voluntary contribution (non-refundable)
                          </label>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Preview */}
              <div className="rounded-lg border border-blue-500 bg-blue-50 p-4 space-y-2">
                <div className="font-medium text-blue-800">Allocation Preview</div>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Payment Amount: {preview.totalAmount.toLocaleString()} ₫</p>
                  <p>• Total AR Balance: {preview.totalBalance.toLocaleString()} ₫</p>
                  <p>• Will Apply: {preview.willApply.toLocaleString()} ₫</p>
                  {preview.leftover > 0 && (
                    <p>• Leftover: {preview.leftover.toLocaleString()} ₫</p>
                  )}
                  <p>• Students: {selectedSiblings.size}</p>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { onClose(); resetForm(); }} disabled={loading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedSiblings.size === 0 || !formData.amount}
            >
              {loading ? "Processing..." : "Post Family Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
