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

    if (!editingInvoice.reason.trim()) {
      toast.error("Please provide a reason for this change");
      return;
    }

    setLoading(true);
    try {
      const newValue = parseInt(editingInvoice.newValue);
      
      // Get the current invoice to capture the old value
      const invoice = invoices.find(inv => inv.id === editingInvoice.id);
      if (!invoice) throw new Error("Invoice not found");

      const oldValue = invoice.recorded_payment || 0;

      // Update the invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ 
          recorded_payment: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingInvoice.id);

      if (updateError) throw updateError;

      // Log the change to audit log
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        entity: "invoice",
        entity_id: editingInvoice.id,
        action: "update_recorded_payment",
        actor_user_id: user?.id,
        diff: {
          old_recorded_payment: oldValue,
          new_recorded_payment: newValue,
          reason: editingInvoice.reason,
          student_id: invoice.student_id,
          month: invoice.month
        }
      });

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
    if (!reversingInvoice || !reversalReason.trim()) {
      toast.error("Please provide a reason for this reversal");
      return;
    }

    setLoading(true);
    try {
      const invoice = invoices.find(inv => inv.id === reversingInvoice.id);
      if (!invoice) throw new Error("Invoice not found");

      const newValue = 0; // Reset to 0 on reversal

      // Update the invoice
      const { error: updateError } = await supabase
        .from("invoices")
        .update({ 
          recorded_payment: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", reversingInvoice.id);

      if (updateError) throw updateError;

      // Log the reversal
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        entity: "invoice",
        entity_id: reversingInvoice.id,
        action: "reverse_recorded_payment",
        actor_user_id: user?.id,
        diff: {
          old_recorded_payment: reversingInvoice.currentValue,
          new_recorded_payment: newValue,
          reason: reversalReason,
          student_id: invoice.student_id,
          month: invoice.month
        }
      });

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
                                  onClick={() => setReversingInvoice({ 
                                    id: invoice.id, 
                                    currentValue: recordedPayment 
                                  })}
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
              This will reset the recorded_payment to 0 for this invoice. 
              Current value: {reversingInvoice?.currentValue.toLocaleString('vi-VN')} ₫
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-4">
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
              disabled={!reversalReason.trim() || loading}
            >
              Reverse Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
