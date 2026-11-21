import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatVND } from "@/lib/money";

interface FamilyPaymentEditModalProps {
  paymentId: string | null;
  onClose: () => void;
}

interface PaymentAllocation {
  id: string;
  student_id: string;
  allocated_amount: number;
  students: {
    full_name: string;
  };
}

export function FamilyPaymentEditModal({ paymentId, onClose }: FamilyPaymentEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [allocations, setAllocations] = useState<PaymentAllocation[]>([]);

  useEffect(() => {
    if (paymentId) {
      loadPaymentData();
    }
  }, [paymentId]);

  const loadPaymentData = async () => {
    if (!paymentId) return;

    setLoading(true);
    try {
      // Load payment
      const { data: paymentData } = await supabase
        .from("payments")
        .select("*, families(name)")
        .eq("id", paymentId)
        .single();

      // Load allocations
      const { data: allocationsData } = await supabase
        .from("payment_allocations")
        .select("*, students(full_name)")
        .eq("parent_payment_id", paymentId);

      if (paymentData) setPayment(paymentData);
      if (allocationsData) setAllocations(allocationsData as any);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!paymentId) return null;

  return (
    <Dialog open={!!paymentId} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Payment Details
          </DialogTitle>
          <DialogDescription>
            View allocation breakdown for this family payment
          </DialogDescription>
        </DialogHeader>

        {payment && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg bg-muted">
              <div>
                <p className="text-sm text-muted-foreground">Family</p>
                <p className="font-semibold">{payment.families?.name || "Unknown"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-semibold">{formatVND(payment.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Method</p>
                <p className="font-semibold">{payment.method}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-semibold">
                  {new Date(payment.occurred_at).toLocaleDateString()}
                </p>
              </div>
              {payment.memo && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Memo</p>
                  <p className="font-semibold">{payment.memo}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-3">Allocation Breakdown</h3>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead className="text-right">Allocated Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allocations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No allocations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      allocations.map((allocation) => (
                        <TableRow key={allocation.id}>
                          <TableCell className="font-medium">
                            {allocation.students.full_name}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">
                              {formatVND(allocation.allocated_amount)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                    <TableRow className="font-semibold bg-muted">
                      <TableCell>Total Allocated</TableCell>
                      <TableCell className="text-right">
                        {formatVND(allocations.reduce((sum, a) => sum + a.allocated_amount, 0))}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
