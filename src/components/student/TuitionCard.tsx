import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, Award, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { Loading } from "@/components/ui/loading";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

interface TuitionData {
  baseAmount: number;
  discounts: Array<{
    name: string;
    type: string;
    value: number;
    amount: number;
    isSiblingWinner?: boolean;
    appliedToClass?: string;
  }>;
  totalDiscount: number;
  totalAmount: number;
  sessionCount: number;
  siblingState?: {
    status: 'assigned' | 'pending' | 'none';
    percent: number;
    reason?: string;
    isWinner: boolean;
    winnerClassId?: string;
  } | null;
}

export function TuitionCard({ studentId }: { studentId: string }) {
  const [currentMonth, setCurrentMonth] = useState<TuitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  // Rendered on "/" (parent area, not flipped yet): old classes unless the route is ivory.
  const ivory = useIvory();

  useEffect(() => {
    if (studentId) {
      loadTuition();
    }
  }, [studentId]);

  const loadTuition = async () => {
    try {
      setLoading(true);
      const month = format(new Date(), "yyyy-MM");

      // Call calculate-tuition to get accurate data with carry-in balance
      const { data, error } = await supabase.functions.invoke('calculate-tuition', {
        body: { studentId, month }
      });

      if (error) throw error;
      
      if (data) {
        setCurrentMonth({
          baseAmount: data.baseAmount ?? 0,
          discounts: data.discounts ?? [],
          totalDiscount: data.totalDiscount ?? 0,
          totalAmount: data.totalAmount ?? 0,
          sessionCount: data.sessionCount ?? 0,
          siblingState: data.siblingState,
        });
      }
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tuition</CardTitle>
        </CardHeader>
        <CardContent>
          <Loading size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (!currentMonth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tuition</CardTitle>
        </CardHeader>
        <CardContent>
          <p className={cn(ivory ? "py-8 text-center text-hec-body text-hec-ink-soft" : "text-muted-foreground text-center py-8")}>No tuition data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className={cn(ivory ? "flex flex-wrap items-start justify-between gap-3" : "flex items-center justify-between")}>
          <div className={cn(ivory && "min-w-0")}>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className={cn("h-5 w-5", ivory && "shrink-0 text-hec-ink-soft")} />
              Tuition - {format(new Date(), "MMMM yyyy")}
            </CardTitle>
            <CardDescription>{currentMonth.sessionCount} sessions this month</CardDescription>
          </div>
          <InvoiceDownloadButton 
            studentId={studentId} 
            month={format(new Date(), "yyyy-MM")}
            variant="outline"
            size="sm"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {currentMonth.siblingState && (
          <div 
            className={ivory ? `flex items-start gap-2 rounded-hec-md border p-3 ${
              currentMonth.siblingState.status === 'pending'
                ? 'border-hec-warn/30 bg-hec-warn-tint'
                : 'border-hec-line bg-hec-sunken'
            }` : `p-3 rounded-lg flex items-start gap-2 ${
              currentMonth.siblingState.status === 'assigned' && currentMonth.siblingState.isWinner
                ? 'bg-primary/10' 
                : currentMonth.siblingState.status === 'pending'
                ? 'bg-yellow-50 dark:bg-yellow-950'
                : 'bg-muted'
            }`}
          >
            {currentMonth.siblingState.status === 'assigned' && currentMonth.siblingState.isWinner ? (
              <>
                <Award className={cn(ivory ? "mt-0.5 h-5 w-5 shrink-0 text-hec-ink-soft" : "h-5 w-5 text-primary mt-0.5")} />
                <div className={cn(ivory ? "min-w-0 flex-1" : "flex-1")}>
                  <p className={cn(ivory ? "text-hec-small font-medium text-hec-ink" : "text-sm font-medium")}>Sibling Discount Recipient ({currentMonth.siblingState.percent}%)</p>
                  <p className={cn(ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground")}>
                    You have the lowest tuition among siblings
                    {currentMonth.siblingState.winnerClassId && ' - Applied to highest-tuition class'}
                  </p>
                </div>
              </>
            ) : currentMonth.siblingState.status === 'pending' ? (
              <>
                <AlertCircle className={cn(ivory ? "mt-0.5 h-5 w-5 shrink-0 text-hec-warn" : "h-5 w-5 text-yellow-600 mt-0.5")} />
                <div className={cn(ivory ? "min-w-0 flex-1" : "flex-1")}>
                  <p className={cn(ivory ? "text-hec-small font-medium text-hec-warn" : "text-sm font-medium text-yellow-900 dark:text-yellow-100")}>
                    Sibling Discount Pending
                  </p>
                  <p className={cn(ivory ? "text-hec-caption text-hec-ink" : "text-xs text-yellow-700 dark:text-yellow-300")}>
                    Requires ≥2 siblings with tuition this month
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <div className={cn(ivory ? "flex items-baseline justify-between gap-4 text-hec-small" : "flex items-center justify-between text-sm")}>
            <span className={cn(ivory ? "min-w-0 text-hec-ink-soft" : "text-muted-foreground")}>Base Amount</span>
            <span className={cn(ivory ? "shrink-0 whitespace-nowrap font-medium tabular-nums text-hec-ink" : "font-medium")}>{currentMonth.baseAmount.toLocaleString('vi-VN')} ₫</span>
          </div>

          {currentMonth.discounts.length > 0 && (
            <>
              <div className={cn(ivory ? "flex items-start justify-between gap-4 text-hec-small" : "flex items-start justify-between text-sm")}>
                <div className="flex items-center gap-2">
                  <TrendingDown className={cn(ivory ? "h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-success")} />
                  <span className={cn(ivory ? "text-hec-ink-soft" : "text-muted-foreground")}>Discounts</span>
                </div>
                <div className={cn(ivory ? "min-w-0 space-y-1 text-right" : "text-right space-y-1")}>
                  {currentMonth.discounts.map((discount, idx) => (
                    <div key={idx} className={cn(ivory ? "text-hec-caption tabular-nums text-hec-ink" : "text-xs text-muted-foreground")}>
                      {discount.name}: -{discount.amount.toLocaleString('vi-VN')} ₫
                      <Badge variant="secondary" className={cn(ivory ? "ml-2 tabular-nums" : "ml-2 text-xs")}>
                        {discount.value}{discount.type === 'percent' ? '%' : ' ₫'}
                      </Badge>
                      {discount.isSiblingWinner && discount.appliedToClass && (
                        <span className={cn(ivory ? "mt-0.5 block text-hec-caption text-hec-ink-soft" : "text-[10px] block text-primary mt-0.5")}>
                          Applied to one class only
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className={cn(ivory ? "flex items-baseline justify-between gap-4 border-t border-hec-line pt-2 text-hec-small" : "flex items-center justify-between text-sm border-t pt-2")}>
                <span className={cn(ivory ? "min-w-0 text-hec-ink-soft" : "text-muted-foreground")}>Total Discount</span>
                <span className={cn(ivory ? "shrink-0 whitespace-nowrap font-medium tabular-nums text-hec-ink" : "font-medium text-success")}>
                  -{currentMonth.totalDiscount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </>
          )}

          <div className={cn(ivory ? "flex items-baseline justify-between gap-4 border-t-2 border-hec-ink pt-3 text-hec-ink" : "flex items-center justify-between text-lg font-bold border-t-2 pt-3")}>
            <span className={cn(ivory && "min-w-0 text-hec-body font-semibold")}>Total Due</span>
            <span className={cn(ivory ? "shrink-0 whitespace-nowrap text-hec-h1 font-semibold tabular-nums" : "text-primary")}>{currentMonth.totalAmount.toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
