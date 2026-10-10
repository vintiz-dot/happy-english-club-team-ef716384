import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DollarSign, TrendingDown, Award, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { Loading } from "@/components/ui/loading";

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
          <p className="text-muted-foreground text-center py-8">No tuition data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
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
            className={`p-3 rounded-lg flex items-start gap-2 ${
              currentMonth.siblingState.status === 'assigned' && currentMonth.siblingState.isWinner
                ? 'bg-primary/10' 
                : currentMonth.siblingState.status === 'pending'
                ? 'bg-yellow-50 dark:bg-yellow-950'
                : 'bg-muted'
            }`}
          >
            {currentMonth.siblingState.status === 'assigned' && currentMonth.siblingState.isWinner ? (
              <>
                <Award className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Sibling Discount Recipient ({currentMonth.siblingState.percent}%)</p>
                  <p className="text-xs text-muted-foreground">
                    You have the lowest tuition among siblings
                    {currentMonth.siblingState.winnerClassId && ' - Applied to highest-tuition class'}
                  </p>
                </div>
              </>
            ) : currentMonth.siblingState.status === 'pending' ? (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    Sibling Discount Pending
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Requires ≥2 siblings with tuition this month
                  </p>
                </div>
              </>
            ) : null}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Base Amount</span>
            <span className="font-medium">{currentMonth.baseAmount.toLocaleString('vi-VN')} ₫</span>
          </div>

          {currentMonth.discounts.length > 0 && (
            <>
              <div className="flex items-start justify-between text-sm">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Discounts</span>
                </div>
                <div className="text-right space-y-1">
                  {currentMonth.discounts.map((discount, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">
                      {discount.name}: -{discount.amount.toLocaleString('vi-VN')} ₫
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {discount.value}{discount.type === 'percent' ? '%' : ' ₫'}
                      </Badge>
                      {discount.isSiblingWinner && discount.appliedToClass && (
                        <span className="text-[10px] block text-primary mt-0.5">
                          Applied to one class only
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Total Discount</span>
                <span className="font-medium text-success">
                  -{currentMonth.totalDiscount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </>
          )}

          <div className="flex items-center justify-between text-lg font-bold border-t-2 pt-3">
            <span>Total Due</span>
            <span className="text-primary">{currentMonth.totalAmount.toLocaleString('vi-VN')} ₫</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
