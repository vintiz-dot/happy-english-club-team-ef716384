import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Award, DollarSign, CheckCircle2 } from "lucide-react";
import { useStudentMonthFinance, formatVND, getMonthOptions } from "@/hooks/useStudentMonthFinance";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { checkStudentFinanceParity } from "@/lib/dev/parityCheck";
import { SettleBillModal } from "@/components/admin/SettleBillModal";
import { useAuth } from "@/hooks/useAuth";
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";
import { PriorBalanceBreakdown } from "./PriorBalanceBreakdown";

export function StudentTuitionTab({ studentId }: { studentId: string }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [settleBillOpen, setSettleBillOpen] = useState(false);
  const [studentName, setStudentName] = useState("");

  const queryClient = useQueryClient();
  const { role } = useAuth();

  // Load student name
  useEffect(() => {
    const loadStudentName = async () => {
      const { data } = await supabase
        .from("students")
        .select("full_name")
        .eq("id", studentId)
        .single();
      if (data) setStudentName(data.full_name);
    };
    loadStudentName();
  }, [studentId]);

  // Fetch invoice data - same as PDF download
  const { data: tuitionData, isLoading } = useStudentMonthFinance(studentId, selectedMonth);

  // Real-time sync - invalidate on changes
  useEffect(() => {
    const paymentsChannel = supabase
      .channel("student-payments-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "payments",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["student-month-finance", studentId] });
        }
      )
      .subscribe();

    const invoicesChannel = supabase
      .channel("student-invoices-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invoices",
          filter: `student_id=eq.${studentId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["student-month-finance", studentId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(invoicesChannel);
    };
  }, [studentId, queryClient]);

  // Dev-only parity check - compare Admin vs Student data
  useEffect(() => {
    if (import.meta.env.DEV && tuitionData) {
      checkStudentFinanceParity(studentId, selectedMonth, {
        cumulativePaidAmount: tuitionData.cumulativePaidAmount,
        totalAmount: tuitionData.totalAmount,
        baseAmount: tuitionData.baseAmount,
        totalDiscount: tuitionData.totalDiscount,
        balance: tuitionData.balance,
      });
    }
  }, [tuitionData, studentId, selectedMonth]);


  // Status badge - using shared utility
  const statusBadge = tuitionData ? getTuitionStatusBadge(getPaymentStatus({
    carryOutDebt: tuitionData.carryOutDebt,
    carryOutCredit: tuitionData.carryOutCredit,
    totalAmount: tuitionData.totalAmount,
    monthPayments: tuitionData.monthPayments,
    settledInMonth: tuitionData.settledInMonth,
  }), tuitionData.settledInMonth) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse space-y-4 w-full">
          <div className="h-12 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tuitionData) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No tuition data available for this month</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Selector and Filters - Match Admin Finance */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            <h2 className="text-2xl font-bold">Tuition Overview</h2>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      {/* Status and Invoice - Match Admin Finance */}
      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          {statusBadge}
          {tuitionData.totalDiscount > 0 && (
            <Badge variant="outline">Discount Applied</Badge>
          )}
          {tuitionData.siblingState?.status === 'assigned' && tuitionData.siblingState?.isWinner && (
            <Badge variant="secondary" className="gap-1">
              <Award className="h-3 w-3" />
              Sibling {tuitionData.siblingState.percent}%
              {tuitionData.siblingState.winnerClassId && ' (1 class)'}
            </Badge>
          )}
          {tuitionData.siblingState?.status === 'pending' && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              Sibling Pending
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {role === "admin" && ((tuitionData?.carryOutDebt ?? 0) > 0 || (tuitionData?.carryOutCredit ?? 0) > 0) && (
            <Button
              onClick={() => setSettleBillOpen(true)}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              Settle Bill
            </Button>
          )}
          <InvoiceDownloadButton 
            studentId={studentId} 
            month={selectedMonth}
            variant="default"
            size="sm"
          />
        </div>
      </div>

      {/* Financial Summary Cards - Match Admin Finance column order */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{tuitionData.sessionCount}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scheduled this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Base Tuition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatVND(tuitionData.baseAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Before discounts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Discounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              -{formatVND(tuitionData.totalDiscount)}
            </p>
            {tuitionData.discounts && tuitionData.discounts.length > 0 && (
              <div className="mt-2 space-y-1">
                {tuitionData.discounts.map((d: any, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {d.name}: -{formatVND(d.amount)}
                    {d.appliedToClass && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        ({d.appliedToClass})
                      </span>
                    )}
                    {d.isRateAdjustment && d.overrideRate && d.defaultRate && (
                      <span className="text-[10px] block text-blue-600">
                        Custom: {formatVND(d.overrideRate)}/session (saves {formatVND(d.savingsPerSession || 0)}/session from {formatVND(d.defaultRate)})
                      </span>
                    )}
                    {d.isSiblingWinner && d.appliedToClass && (
                      <span className="text-[10px] block text-primary">
                        Applied to one class only
                      </span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Charges
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatVND(tuitionData.totalAmount)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This month only
            </p>
          </CardContent>
        </Card>

        <Card className={tuitionData.carryInDebt > 0 ? 'bg-red-50 dark:bg-red-950/20' : tuitionData.carryInCredit > 0 ? 'bg-green-50 dark:bg-green-950/20' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prior Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              tuitionData.carryInDebt > 0 ? 'text-red-600 dark:text-red-400' : 
              tuitionData.carryInCredit > 0 ? 'text-green-600 dark:text-green-400' : ''
            }`}>
              {tuitionData.carryInCredit > 0 
                ? `+${formatVND(tuitionData.carryInCredit)}`
                : tuitionData.carryInDebt > 0
                  ? `-${formatVND(tuitionData.carryInDebt)}`
                  : formatVND(0)
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tuitionData.carryInCredit > 0 ? '✓ Credit (Family overpaid)' : 
               tuitionData.carryInDebt > 0 ? '⚠ Debt (Family owes)' : 'No carry-over'}
            </p>
            
            {/* Prior Balance Breakdown */}
            {tuitionData.priorBalanceBreakdown && (
              <PriorBalanceBreakdown breakdown={tuitionData.priorBalanceBreakdown} studentId={studentId} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Breakdown - Show per-class tuition */}
      {tuitionData.classBreakdown && tuitionData.classBreakdown.length > 0 && (
        <Card className="md:col-span-2 lg:col-span-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tuition by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tuitionData.classBreakdown.map((classItem) => {
                // Check if this is the winner class for sibling discount
                const isWinnerClass = tuitionData.siblingState?.isWinner && 
                                     tuitionData.siblingState?.winnerClassId === classItem.class_id;
                const siblingDiscountAmount = isWinnerClass 
                  ? Math.round(classItem.amount_vnd * ((tuitionData.siblingState?.percent || 0) / 100))
                  : 0;
                const finalAmount = classItem.amount_vnd - siblingDiscountAmount;

                return (
                  <div 
                    key={classItem.class_id} 
                    className={`flex items-center justify-between p-3 border rounded-lg ${
                      isWinnerClass ? 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{classItem.class_name}</p>
                        {isWinnerClass && (
                          <Badge variant="default" className="bg-green-600 text-xs">
                            Sibling Winner
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {classItem.sessions_count} sessions × {formatVND(classItem.session_rate_vnd)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatVND(classItem.amount_vnd)}</p>
                      {isWinnerClass && siblingDiscountAmount > 0 && (
                        <>
                          <p className="text-xs text-green-600 dark:text-green-400">
                            -{formatVND(siblingDiscountAmount)} ({tuitionData.siblingState?.percent}%)
                          </p>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">
                            = {formatVND(finalAmount)}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Status - Match Admin Finance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Final Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">
              {formatVND(tuitionData.totalAmount + (tuitionData.carryInDebt - tuitionData.carryInCredit))}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Current + Prior Balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recorded Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {formatVND(tuitionData.monthPayments)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Paid this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${
              tuitionData.carryOutDebt > 0 ? 'text-destructive' : 
              tuitionData.carryOutCredit > 0 ? 'text-green-600' : ''
            }`}>
              {formatVND(tuitionData.carryOutDebt > 0 ? tuitionData.carryOutDebt : tuitionData.carryOutCredit)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {tuitionData.carryOutCredit > 0 && 'Overpaid - Credit'}
              {tuitionData.carryOutDebt > 0 && 'Amount Due'}
              {tuitionData.carryOutDebt === 0 && tuitionData.carryOutCredit === 0 && 'Fully Settled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {statusBadge}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {tuitionData.balanceStatus === 'settled' ? 'All paid up' : tuitionData.balanceStatus === 'credit' ? 'Overpaid for this month' : 'Outstanding balance'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Session Details - Match Admin display */}
      {tuitionData.sessionDetails && tuitionData.sessionDetails.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tuitionData.sessionDetails.map((session, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {new Date(session.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Status: {session.status}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatVND(session.rate)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settle Bill Modal */}
      {role === "admin" && (
        <SettleBillModal
          studentId={settleBillOpen ? studentId : null}
          studentName={studentName}
          month={selectedMonth}
          balance={tuitionData?.carryOutDebt ?? tuitionData?.carryOutCredit ?? 0}
          onClose={() => setSettleBillOpen(false)}
        />
      )}
    </div>
  );
}