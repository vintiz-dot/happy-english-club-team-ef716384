import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import type { PayRateType } from "@/lib/payRate";

interface PayrollData {
  teacherId: string;
  teacherName: string;
  /** The rate in force, in the unit payRateType names - not always hourly. */
  hourlyRate: number;
  payRateType?: PayRateType;
  quantityLabel?: string;
  totalHours: number;
  totalMinutes: number;
  totalAmount: number;
  sessionsCount: number;
}

export function PayrollManager() {
  const [month, setMonth] = useState(format(new Date(), "yyyy-MM"));
  const [payrollData, setPayrollData] = useState<PayrollData[]>([]);
  const [loading, setLoading] = useState(false);
  const [grandTotal, setGrandTotal] = useState(0);
  const { toast } = useToast();

  const calculatePayroll = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-payroll", {
        body: { month },
      });

      if (error) throw error;

      setPayrollData(data.payrollData);
      setGrandTotal(data.grandTotal);

      toast({
        title: "Success",
        description: `Payroll calculated for ${data.totalTeachers} teachers`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (payrollData.length === 0) {
      toast({
        title: "No data",
        description: "Please calculate payroll first",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Teacher Name", "Paid", "Rate (VND)", "Total Hours", "Sessions", "Total Amount (VND)"];
    const rows = payrollData.map(p => [
      p.teacherName,
      p.payRateType === "per_session" ? "Per session" : "Per hour",
      (p.hourlyRate || 0).toString(),
      (p.totalHours || 0).toFixed(2),
      (p.sessionsCount || 0).toString(),
      (p.totalAmount || 0).toString()
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.join(",")),
      "",
      `Total,,,,${grandTotal}`
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll-${month}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported",
      description: "Payroll exported to CSV",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Calculate Payroll
          </CardTitle>
          <CardDescription>Calculate teacher payroll based on held sessions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label>Month</Label>
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
            <Button onClick={calculatePayroll} disabled={loading}>
              Calculate Payroll
            </Button>
          </div>
        </CardContent>
      </Card>

      {payrollData.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Payroll Summary - {month}</CardTitle>
                <CardDescription>{payrollData.length} teachers</CardDescription>
              </div>
              <Button onClick={exportToCSV} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payrollData.map((teacher) => (
                <div
                  key={teacher.teacherId}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{teacher.teacherName}</p>
                    <p className="text-sm text-muted-foreground">
                      {(teacher.totalHours || 0).toFixed(2)} hours ({teacher.totalMinutes || 0} minutes) • {teacher.sessionsCount || 0} sessions
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {/* Not a hardcoded "/hour": a per-session teacher's
                          hourly column is 0, so this read "0 ₫/hour". */}
                      Rate: {(teacher.hourlyRate || 0).toLocaleString('vi-VN')} ₫/
                      {teacher.payRateType === "per_session" ? "session" : "hour"}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-primary">
                    {(teacher.totalAmount || 0).toLocaleString('vi-VN')} ₫
                  </p>
                </div>
              ))}

              <div className="border-t-2 pt-3 flex items-center justify-between">
                <p className="text-lg font-bold">Grand Total</p>
                <p className="text-xl font-bold text-primary">
                  {(grandTotal || 0).toLocaleString('vi-VN')} ₫
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
