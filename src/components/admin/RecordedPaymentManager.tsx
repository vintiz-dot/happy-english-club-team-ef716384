import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DollarSign, Edit2, Save, X, Undo2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Loading } from "@/components/ui/loading";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { DIFFERENT_PAYMENT_LABEL, paymentKeys, receiptDateToday, recordPayment, waitingDuplicateMessage } from "@/lib/recordPayment";

interface Invoice {
  id: string;
  student_id: string;
  month: string;
  recorded_payment: number | null;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  students: {
    full_name: string;
  };
}

interface EditingInvoice {
  id: string;
  newValue: string;
  reason: string;
}

export function RecordedPaymentManager() {
  const queryClient = useQueryClient();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<EditingInvoice | null>(null);
  const [reversingInvoice, setReversingInvoice] = useState<{ id: string; currentValue: number } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  // Both suggest the oldest month this child still owes when it is earlier
  // than the one shown (pattern D: a February debt booked on March). "Use"
  // closes the row and opens that month; nothing is moved, and the admin
  // still confirms the month by hand.
  const studentOf = (invoiceId?: string) => invoices.find(i => i.id === invoiceId)?.student_id;
  const editStudent = studentOf(editingInvoice?.id);
  const reverseStudent = studentOf(reversingInvoice?.id);
  const editMonth = useTuitionMonthConfirmation(selectedMonth, !!editingInvoice, {
    studentIds: editStudent ? [editStudent] : [],
    onUseMonth: (m) => { setEditingInvoice(null); setSelectedMonth(m); },
  });
  const reverseMonth = useTuitionMonthConfirmation(selectedMonth, !!reversingInvoice, {
    studentIds: reverseStudent ? [reverseStudent] : [],
    onUseMonth: (m) => { setReversingInvoice(null); setReversalReason(""); setSelectedMonth(m); },
  });
  // Which ledger account the money went into or came out of: cash or bank.
  // Nothing is pre-selected: the admin chooses every time (a default would
  // book every unexamined edit to one account and skew the CASH/BANK split).
  // The edit form and the reversal dialog each have their own choice, and
  // both are cleared whenever one opens, so a choice never carries to another row.
  const [editMethod, setEditMethod] = useState("");
  const [reverseMethod, setReverseMethod] = useState("");
  // One key per bill (child + month) per attempt, kept outside this screen
  // (paymentKeys in src/lib/recordPayment.ts, review R-N2): a double click,
  // or a retry after no answer - even after leaving the screen and coming
  // back - records nothing more; another row never reuses it.
  const methodField = (id: string, value: string, onChange: (v: string) => void) => (
    <div className="space-y-1 text-left">
      <Label htmlFor={id} className="text-xs">Money in / out by (required)</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="h-8 w-40"><SelectValue placeholder="Choose cash or bank" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Cash">Cash</SelectItem>
          <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
  const METHOD_REQUIRED = "Choose whether the money moved by cash or by bank transfer";

  useEffect(() => {
    loadInvoices();
  }, [selectedMonth]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select(`
          *,
          students!inner(full_name)
        `)
        .eq("month", selectedMonth)
        .order("students(full_name)");

      if (error) throw error;
      setInvoices(data as Invoice[]);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (invoice: Invoice) => {
    setEditMethod("");
    setEditingInvoice({
      id: invoice.id,
      newValue: (invoice.recorded_payment || 0).toString(),
      reason: ""
    });
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
  };

  const handleSaveEdit = async () => {
    if (!editingInvoice) return;
    if (!editMonth.confirmed) { toast.error("Confirm the tuition month before changing a payment"); return; }

    if (!editingInvoice.reason.trim()) {
      toast.error("Please provide a reason for this change");
      return;
    }
    if (!editMethod) { toast.error(METHOD_REQUIRED); return; }

    setLoading(true);
    try {
      const newValue = parseInt(editingInvoice.newValue);
      if (!Number.isFinite(newValue) || newValue < 0) throw new Error("Enter the recorded payment as a whole number, 0 or more");

      // Get the current invoice to capture the old value
      const invoice = invoices.find(inv => inv.id === editingInvoice.id);
      if (!invoice) throw new Error("Invoice not found");

      // The month written is the month the admin confirmed, never another.
      if (invoice.month !== selectedMonth) throw new Error("This bill is not for the month shown; reload and try again");
      const oldValue = invoice.recorded_payment || 0;
      if (newValue === oldValue) { toast.info("The recorded payment is unchanged"); setEditingInvoice(null); return; }

      // The change is money in (a payment) or money back out (a correction),
      // recorded by record-payment in the payments list, the ledger and the
      // bill together (D5 G-1), against the figure this screen showed. It
      // labels the bill by the one rule and writes the audit row.
      const attempt = {
        studentId: invoice.student_id, month: selectedMonth,
        kind: newValue > oldValue ? "payment" as const : "correction" as const, amount: Math.abs(newValue - oldValue),
      };
      // An earlier try of exactly this change got no answer (review N-2).
      const waiting = paymentKeys.pending(attempt);
      const saved = await recordPayment(supabase, {
        studentId: invoice.student_id,
        month: selectedMonth,
        kind: attempt.kind,
        amount: attempt.amount,
        method: editMethod,
        occurredAt: receiptDateToday(),
        memo: `Recorded Payment Manager: ${editingInvoice.reason.trim()}`.slice(0, 500),
        idempotencyKey: paymentKeys.keyFor(attempt),
        expectedRecorded: oldValue,
      });
      paymentKeys.settle(attempt, saved);
      if (!saved.ok) {
        // Nothing was recorded (the function says why); reload the list so the admin sees the bill as it is.
        // A duplicate of an unanswered earlier try: said plainly, with the deliberate way out (review N-2).
        if (saved.duplicate && waiting) {
          toast.error(waitingDuplicateMessage(attempt, invoice.students?.full_name), {
            duration: 30_000,
            action: { label: DIFFERENT_PAYMENT_LABEL, onClick: () => paymentKeys.forget(attempt) },
          });
        } else {
          toast.error(saved.message);
        }
        loadInvoices();
        return;
      }

      toast.success("Recorded payment updated successfully");
      setEditingInvoice(null);
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ["student-tuition", invoice.student_id, invoice.month] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReversePayment = async () => {
    if (!reverseMonth.confirmed) { toast.error("Confirm the tuition month before reversing a payment"); return; }
    if (!reversingInvoice || !reversalReason.trim()) {
      toast.error("Please provide a reason for this reversal");
      return;
    }
    if (!reverseMethod) { toast.error(METHOD_REQUIRED); return; }

    setLoading(true);
    try {
      const invoice = invoices.find(inv => inv.id === reversingInvoice.id);
      if (!invoice) throw new Error("Invoice not found");

      if (invoice.month !== selectedMonth) throw new Error("This bill is not for the month shown; reload and try again");
      const current = invoice.recorded_payment || 0;
      if (current <= 0) { toast.info("This bill records no payment to reverse"); setReversingInvoice(null); return; }

      // Back to 0: a correction of everything the bill records, through
      // record-payment (payments list, ledger and bill together, D5 G-1),
      // against the figure this screen showed.
      const attempt = { studentId: invoice.student_id, month: selectedMonth, kind: "correction" as const, amount: current };
      // An earlier try of exactly this change got no answer (review N-2).
      const waiting = paymentKeys.pending(attempt);
      const saved = await recordPayment(supabase, {
        studentId: invoice.student_id,
        month: selectedMonth,
        kind: "correction",
        amount: current,
        method: reverseMethod,
        occurredAt: receiptDateToday(),
        memo: `Reversal (Recorded Payment Manager): ${reversalReason.trim()}`.slice(0, 500),
        idempotencyKey: paymentKeys.keyFor(attempt),
        expectedRecorded: current,
      });
      paymentKeys.settle(attempt, saved);
      if (!saved.ok) {
        // Nothing was recorded (the function says why); reload the list so the admin sees the bill as it is.
        // A duplicate of an unanswered earlier try: said plainly, with the deliberate way out (review N-2).
        if (saved.duplicate && waiting) {
          toast.error(waitingDuplicateMessage(attempt, invoice.students?.full_name), {
            duration: 30_000,
            action: { label: DIFFERENT_PAYMENT_LABEL, onClick: () => paymentKeys.forget(attempt) },
          });
        } else {
          toast.error(saved.message);
        }
        loadInvoices();
        return;
      }

      toast.success("Recorded payment reversed successfully");
      setReversingInvoice(null);
      setReversalReason("");
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ["student-tuition", invoice.student_id, invoice.month] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      
      loadInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    const options = [];
    const today = new Date();
    for (let i = -6; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      options.push(monthStr);
    }
    return options;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recorded Payment Manager
          </CardTitle>
          <CardDescription>
            View and adjust recorded_payment values for student invoices. Use this to correct accounting errors or reverse payments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map(month => (
                    <SelectItem key={month} value={month}>
                      {new Date(month + "-01").toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Base Amount</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid Amount</TableHead>
                  <TableHead className="text-right">Recorded Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      <Loading size="sm" className="py-6" />
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No invoices found for this month
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice) => {
                    const isEditing = editingInvoice?.id === invoice.id;
                    const recordedPayment = invoice.recorded_payment || 0;
                    const hasDiscrepancy = recordedPayment !== invoice.paid_amount;

                    return (
                      <TableRow key={invoice.id} className={hasDiscrepancy ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          {invoice.students.full_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.base_amount.toLocaleString('vi-VN')} ₫
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.total_amount.toLocaleString('vi-VN')} ₫
                        </TableCell>
                        <TableCell className="text-right">
                          {invoice.paid_amount.toLocaleString('vi-VN')} ₫
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="space-y-2">
                              {editMonth.field}
                              {methodField("rpm-edit-method", editMethod, setEditMethod)}
                              <Input
                                type="number"
                                value={editingInvoice.newValue}
                                onChange={(e) => setEditingInvoice({ 
                                  ...editingInvoice, 
                                  newValue: e.target.value 
                                })}
                                className="h-8 w-32"
                              />
                              <Textarea
                                placeholder="Reason for change (required)"
                                value={editingInvoice.reason}
                                onChange={(e) => setEditingInvoice({ 
                                  ...editingInvoice, 
                                  reason: e.target.value 
                                })}
                                className="text-xs"
                                rows={2}
                              />
                            </div>
                          ) : (
                            <span className={hasDiscrepancy ? "text-destructive font-semibold" : ""}>
                              {recordedPayment.toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                            {hasDiscrepancy && (
                              <Badge variant="destructive">Mismatch</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleSaveEdit}
                                disabled={loading}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleStartEdit(invoice)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              {recordedPayment > 0 && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReverseMethod("");
                                    setReversingInvoice({
                                      id: invoice.id,
                                      currentValue: recordedPayment
                                    });
                                  }}
                                  title="Reverse recorded payment"
                                >
                                  <Undo2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!reversingInvoice} onOpenChange={() => setReversingInvoice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reverse Recorded Payment</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the recorded_payment to 0 for this invoice, recorded as a correction in the payments list and the ledger.
              Current value: {reversingInvoice?.currentValue.toLocaleString('vi-VN')} ₫
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
            {reverseMonth.field}
            {methodField("rpm-reverse-method", reverseMethod, setReverseMethod)}
            <Label>Reason for reversal (required)</Label>
            <Textarea
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="Explain why this recorded payment is being reversed (e.g., money returned to parents, accounting error)..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReversalReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReversePayment}
              disabled={!reversalReason.trim() || !reverseMethod || loading}
            >
              Reverse Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
