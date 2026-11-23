import { useState, useEffect, useMemo } from "react";
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
import { formatVND } from "@/lib/money";
import { showSeal } from "@/components/fx/showSeal";
import { dayjs } from "@/lib/date";
import { invoicePaidLabel, monthPayable } from "@/lib/invoiceStatus";
import { CHECK_INFO, type Finding } from "@/lib/finance/paymentChecks";
import { usePaymentChecks } from "@/hooks/usePaymentChecks";
import { PaymentChecksPanel, SEVERITY_BADGE } from "@/components/admin/finance/PaymentChecksPanel";
import { MonthMoneyTiles } from "@/components/admin/finance/MonthMoneyTiles";
import { fetchEnrolledStudentIds } from "@/lib/finance/studentsInMonth";
import { billShownInMonth } from "@/lib/finance/monthRoster";

type RowFilter = "all" | "flagged" | "owing" | "partial" | "paid";

interface Invoice {
  id: string;
  student_id: string;
  month: string;
  recorded_payment: number | null;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  carry_in_debt: number | null;
  carry_in_credit: number | null;
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
  // Hanoi's month: toISOString() is UTC and read the wrong month for the
  // first seven hours of every month.
  const [selectedMonth, setSelectedMonth] = useState(() => dayjs().tz().format("YYYY-MM"));
  const [filter, setFilter] = useState<RowFilter>("all");
  const [search, setSearch] = useState("");
  const checks = usePaymentChecks(selectedMonth);
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
      // A child who left stays in their last month and is not listed in the
      // next one: an empty bill saved for a month they were not enrolled in
      // is left out. A bill holding a charge or a payment is always shown.
      const enrolled = await fetchEnrolledStudentIds(selectedMonth);
      setInvoices((data as Invoice[]).filter((bill) => billShownInMonth(bill, enrolled)));
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
      // only money coming in is "Recorded"; a correction back out gets no seal
      if (attempt.kind === "payment") showSeal("Recorded");
      setEditingInvoice(null);
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: ["student-tuition", invoice.student_id, invoice.month] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition"] });
      queryClient.invalidateQueries({ queryKey: ["payment-checks", invoice.month] });

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
      queryClient.invalidateQueries({ queryKey: ["payment-checks", invoice.month] });

      loadInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthOptions = () => {
    // Twelve months back, two ahead, in Hanoi's calendar (the old list was
    // built with toISOString and shifted a month in UTC+7).
    const now = dayjs().tz().startOf("month");
    const options: string[] = [];
    for (let i = -12; i <= 2; i++) options.push(now.add(i, "month").format("YYYY-MM"));
    if (!options.includes(selectedMonth)) options.push(selectedMonth);
    return options.sort().reverse();
  };
  const monthLabel = dayjs(`${selectedMonth}-01`).format("MMMM YYYY");

  // Each row's findings, by student: a bill's own checks and the checks on
  // that child's payments this month.
  const findingsByStudent = useMemo(() => {
    const m = new Map<string, Finding[]>();
    if (checks.data?.month !== selectedMonth) return m;
    for (const f of checks.data.checks.findings) {
      if (!f.studentId) continue;
      m.set(f.studentId, [...(m.get(f.studentId) ?? []), f]);
    }
    return m;
  }, [checks.data, selectedMonth]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (q && !inv.students.full_name.toLowerCase().includes(q)) return false;
      const label = inv.status === "credit" ? "credit" : invoicePaidLabel(inv);
      const flags = (findingsByStudent.get(inv.student_id) ?? []).filter((f) => f.severity !== "note");
      switch (filter) {
        case "flagged": return flags.length > 0;
        case "owing": return monthPayable(inv) - (inv.recorded_payment || 0) > 0;
        case "partial": return label === "partial";
        case "paid": return label === "paid";
        default: return true;
      }
    });
  }, [invoices, search, filter, findingsByStudent]);
  const flaggedCount = invoices.filter((inv) => (findingsByStudent.get(inv.student_id) ?? []).some((f) => f.severity !== "note")).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recorded payments
          </CardTitle>
          <CardDescription>
            What each bill records as paid this month, checked against its payments and the ledger. A correction goes through
            record-payment, which writes the payments list, the ledger and the bill together.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
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
            <div className="space-y-2">
              <Label htmlFor="rpm-search">Student</Label>
              <Input id="rpm-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name" className="w-[200px]" />
            </div>
            <div className="space-y-2">
              <Label>Show</Label>
              <Select value={filter} onValueChange={(v) => setFilter(v as RowFilter)}>
                <SelectTrigger className="w-[190px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All bills ({invoices.length})</SelectItem>
                  <SelectItem value="flagged">Flagged ({flaggedCount})</SelectItem>
                  <SelectItem value="owing">Still owing</SelectItem>
                  <SelectItem value="partial">Partly paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => { loadInvoices(); checks.refetch(); }} disabled={loading || checks.isFetching}>
              {checks.isFetching ? "Checking…" : "Re-check"}
            </Button>
          </div>

          {checks.data?.month === selectedMonth ? (
            <>
              <MonthMoneyTiles totals={checks.data.totals} />
              <PaymentChecksPanel
                checks={checks.data.checks}
                names={checks.data.names}
                monthLabel={monthLabel}
                onSelectStudent={(id) => { setFilter("all"); setSearch(checks.data?.names.get(id) ?? ""); }}
              />
            </>
          ) : checks.isError ? (
            <p className="text-sm text-hec-danger">The month's totals and checks could not be loaded: {(checks.error as Error)?.message}</p>
          ) : (
            <Loading size="sm" className="py-4" />
          )}

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Charged</TableHead>
                  <TableHead className="text-right">Payable</TableHead>
                  <TableHead className="text-right">Recorded</TableHead>
                  <TableHead className="text-right">Left to pay</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Checks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      <Loading size="sm" className="py-6" />
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      {invoices.length === 0 ? "No bills for this month" : "No bills match this filter"}
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((invoice) => {
                    const isEditing = editingInvoice?.id === invoice.id;
                    const recordedPayment = invoice.recorded_payment || 0;
                    const payable = monthPayable(invoice);
                    const left = payable - recordedPayment;
                    // The label by the one rule (src/lib/invoiceStatus.ts); an admin's credit stays.
                    const label = invoice.status === "credit" ? "credit" : invoicePaidLabel(invoice);
                    const flags = findingsByStudent.get(invoice.student_id) ?? [];
                    const hasError = flags.some((f) => f.severity === "error");

                    return (
                      <TableRow key={invoice.id} className={hasError ? "bg-destructive/5" : ""}>
                        <TableCell className="font-medium">
                          {invoice.students.full_name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatVND(invoice.total_amount)}
                          {(invoice.discount_amount || 0) > 0 && (
                            <div className="text-xs text-hec-ink-soft">base {formatVND(invoice.base_amount)}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatVND(payable)}
                          {payable !== (invoice.total_amount || 0) && (
                            <div className="text-xs text-hec-ink-soft">
                              {(invoice.carry_in_debt || 0) > 0 ? `+${formatVND(invoice.carry_in_debt)} debt ` : ""}
                              {(invoice.carry_in_credit || 0) > 0 ? `−${formatVND(invoice.carry_in_credit)} credit` : ""}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
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
                            <span className={hasError ? "text-destructive font-semibold" : ""}>
                              {formatVND(recordedPayment)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className={`text-right tabular-nums ${left > 0 ? "text-hec-danger" : left < 0 ? "text-hec-leaf" : "text-hec-ink-soft"}`}>
                          {left > 0 ? formatVND(left) : left < 0 ? `${formatVND(-left)} ahead` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={label === "paid" ? "success" : label === "partial" ? "warning" : label === "credit" ? "brass" : "secondary"}>
                            {label === "issued" ? "unpaid" : label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex max-w-[16rem] flex-wrap gap-1">
                            {flags.length === 0 ? (
                              <span className="text-xs text-hec-ink-soft">{checks.data?.month === selectedMonth ? "OK" : "…"}</span>
                            ) : (
                              flags.map((f, i) => (
                                <Badge key={`${f.kind}-${i}`} variant={SEVERITY_BADGE[f.severity]} title={f.detail} className="whitespace-nowrap">
                                  {CHECK_INFO[f.kind].title}
                                </Badge>
                              ))
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
              This will reset the recorded payment to 0 for{" "}
              {(invoices.find((i) => i.id === reversingInvoice?.id) as any)?.students?.full_name ?? "this student"}, {selectedMonth} tuition,
              recorded as a correction in the payments list and the ledger.{" "}
              Current value: <span className="tabular-nums">{formatVND(reversingInvoice?.currentValue)}</span>
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
            <AlertDialogCancel autoFocus onClick={() => setReversalReason("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReversePayment}
              disabled={!reversalReason.trim() || !reverseMethod || loading}
            >
              {loading ? "Working…" : "Reverse payment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
