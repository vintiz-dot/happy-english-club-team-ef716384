import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatVND } from "@/lib/money";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";

interface PaymentDetailsTableProps {
  selectedMonth: string;
}

export function PaymentDetailsTable({ selectedMonth }: PaymentDetailsTableProps) {
  const { data: payments } = useQuery({
    queryKey: ["recorded-payments", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invoices")
        .select("id, recorded_payment, updated_at, student_id, students(full_name, avatar_url)")
        .eq("month", selectedMonth)
        .gt("recorded_payment", 0)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const totalPayments = payments?.reduce((sum, p) => sum + (p.recorded_payment || 0), 0) || 0;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Student</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments?.map((payment: any) => (
            <TableRow key={payment.id} className="hover:bg-muted/50">
              <TableCell>{format(new Date(payment.updated_at), "PP")}</TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 ring-1 ring-border shadow-sm">
                    <AvatarImage 
                      src={getAvatarUrl(payment.students?.avatar_url) || undefined} 
                      alt={payment.students?.full_name}
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-xs font-medium">
                      {payment.students?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{payment.students?.full_name}</span>
                </div>
              </TableCell>
              <TableCell className="text-right font-medium">{formatVND(payment.recorded_payment)}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-muted/50 font-bold">
            <TableCell colSpan={2}>TOTAL PAYMENTS</TableCell>
            <TableCell className="text-right">{formatVND(totalPayments)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
