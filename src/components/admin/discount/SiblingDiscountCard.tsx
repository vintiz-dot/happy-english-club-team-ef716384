import { useQuery } from "@tanstack/react-query";
import { siblingRetryDelayMs } from "@/lib/siblingRetry";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingDown, Check } from "lucide-react";
import { formatVND } from "@/lib/invoice/formatter";
import { Loading } from "@/components/ui/loading";
import { siblingDiscountView } from "@/lib/siblingDiscountView";

interface SiblingDiscountCardProps {
  studentId: string;
  month?: string;
}

interface ClassTuition {
  classId: string;
  className: string;
  sessionsCount: number;
  totalAmount: number;
}

export function SiblingDiscountCard({ studentId, month }: SiblingDiscountCardProps) {
  // Default to current month if not provided
  const currentMonth = month || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  // Get class breakdown directly from the calculate-tuition edge function
  const { data: tuition, isLoading, isError } = useQuery({
    queryKey: ["student-class-breakdown", studentId, currentMonth],
    queryFn: async () => {
      const { data: tuitionData, error: tuitionError } = await supabase.functions.invoke('calculate-tuition', {
        body: { studentId, month: currentMonth }
      });

      if (tuitionError) {
        console.error("Tuition calculation error:", tuitionError);
        throw tuitionError;
      }

      if (tuitionData?.error) throw new Error(tuitionData.error);
      return siblingDiscountView(tuitionData);
    },
    enabled: !!studentId,
    refetchInterval: (query) =>
      siblingRetryDelayMs(query.state.data?.state?.status, Math.max(0, query.state.dataUpdateCount - 1)),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Sibling Discount</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Loading size="sm" />
        </CardContent>
      </Card>
    );
  }

  if (isError) return <Card><CardHeader><CardTitle>Sibling Discount</CardTitle>
    <CardDescription>Unable to load the family discount. Please try again.</CardDescription></CardHeader></Card>;

  const siblingState = tuition?.state;
  const classBreakdown = tuition?.classes;

  // Determine if this student is the discount winner
  const isWinner = siblingState?.status === 'assigned' && siblingState.isWinner;
  const discountPercent = siblingState?.percent || 0;
  
  // Find the highest tuition class to apply discount (winner class)
  const winnerClass = classBreakdown?.find(cls => cls.classId === siblingState?.winnerClassId) ?? null;

  // No sibling discount scenario
  if (!siblingState || siblingState.status === 'none') {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <CardTitle>Sibling Discount</CardTitle>
          </div>
          <CardDescription>
            {siblingState?.reason || 'No family discount assigned for this month'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classBreakdown && classBreakdown.length > 0 && (
            <div className="space-y-3">
              <p className="text-hec-small font-medium text-hec-ink-soft">Monthly Tuition Breakdown</p>
              {classBreakdown.map(enrollment => (
                <div key={enrollment.classId} className="p-4 rounded-hec-lg border border-hec-line bg-hec-surface space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <h4 className="min-w-0 whitespace-normal break-words hyphens-none text-hec-body font-semibold text-hec-ink">{enrollment.className}</h4>
                    <span className="shrink-0 whitespace-nowrap text-hec-caption text-hec-ink-soft tabular-nums">{enrollment.sessionsCount} sessions</span>
                  </div>
                  <div className="flex items-baseline justify-between gap-4 pt-2 border-t border-hec-line">
                    <span className="min-w-0 text-hec-small font-medium text-hec-ink">Total Payable</span>
                    <span className="shrink-0 whitespace-nowrap text-hec-h3 font-semibold text-hec-ink tabular-nums">{formatVND(enrollment.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Calculate grand totals
  const grandTotal = classBreakdown?.reduce((sum, e) => sum + e.totalAmount, 0) || 0;
  const totalDiscount = isWinner ? tuition?.discountAmount ?? 0 : 0;
  const grandFinalPayable = grandTotal - totalDiscount;

  return (
    <Card className="">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className={`h-5 w-5 shrink-0 ${isWinner ? 'text-hec-brass' : 'text-hec-ink-soft'}`} />
          <div className="min-w-0 flex-1">
            <CardTitle className="">
              {isWinner ? 'Sibling Discount Active' : 'Sibling Discount Status'}
            </CardTitle>
            <CardDescription>
              {isWinner 
                ? `${discountPercent}% discount applied to highest tuition class`
                : siblingState?.status === 'assigned' 
                ? 'Sibling receives the discount this month'
                : 'Threshold not met for this month'}
            </CardDescription>
          </div>
          {isWinner && (
            <Badge variant="default" className="shrink-0 border-hec-brass/40 bg-transparent text-hec-brass">
              Winner
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWinner && siblingState?.reason && (
          <div className="p-3 rounded-hec-md bg-hec-sunken border border-hec-line">
            <p className="text-hec-small text-hec-ink-soft">{siblingState.reason}</p>
          </div>
        )}

        {classBreakdown && classBreakdown.length > 0 && (
          <div className="space-y-3">
            <p className="text-hec-small font-medium text-hec-ink-soft">Monthly Tuition Breakdown</p>

            {classBreakdown.map(enrollment => {
              const isWinnerClass = isWinner && winnerClass?.classId === enrollment.classId;
              const discountAmount = isWinnerClass ? totalDiscount : 0;
              const finalAmount = enrollment.totalAmount - discountAmount;

              return (
                <div 
                  key={enrollment.classId}
                  className="p-4 rounded-hec-lg border border-hec-line bg-hec-surface space-y-3"
                >
                  {/* Class Name with Badge */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h4 className="min-w-0 whitespace-normal break-words hyphens-none text-hec-body font-semibold text-hec-ink">{enrollment.className}</h4>
                      {isWinnerClass && (
                        <Badge variant="default" className="shrink-0 border-hec-brass/40 bg-transparent text-hec-brass">
                          <Check className="h-3 w-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-hec-caption text-hec-ink-soft tabular-nums">{enrollment.sessionsCount} sessions</span>
                  </div>

                  {/* Base Tuition */}
                  <div className="flex items-baseline justify-between gap-4 py-2">
                    <span className="min-w-0 text-hec-small text-hec-ink-soft">Base Tuition</span>
                    <span className="shrink-0 whitespace-nowrap text-hec-body font-medium text-hec-ink tabular-nums">{formatVND(enrollment.totalAmount)}</span>
                  </div>

                  {/* Discount (only for winner class) */}
                  {isWinnerClass && (
                    <div className="flex items-baseline justify-between gap-4 py-2 -mt-1">
                      <span className="min-w-0 text-hec-small text-hec-ink-soft">Discount ({discountPercent}%)</span>
                      <span className="shrink-0 whitespace-nowrap text-hec-body font-medium text-hec-ink tabular-nums">
                        -{formatVND(discountAmount)}
                      </span>
                    </div>
                  )}

                  {/* Final Payable */}
                  <div className="flex items-baseline justify-between gap-4 pt-3 border-t border-hec-line">
                    <span className="min-w-0 text-hec-small font-semibold text-hec-ink">Final Payable</span>
                    <span className="shrink-0 whitespace-nowrap text-hec-h3 font-semibold text-hec-ink tabular-nums">
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Grand Total Summary */}
            <div className="p-4 rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1 space-y-2">
              <div className="flex items-baseline justify-between gap-4">
                <span className="min-w-0 text-hec-small font-medium text-hec-ink-soft">Total Before Discount</span>
                <span className="shrink-0 whitespace-nowrap text-hec-body font-semibold text-hec-ink tabular-nums">{formatVND(grandTotal)}</span>
              </div>
              {isWinner && totalDiscount > 0 && winnerClass && (
                <div className="flex items-baseline justify-between gap-4">
                  <span className="min-w-0 whitespace-normal break-words text-hec-small font-medium text-hec-ink-soft">
                    Discount ({discountPercent}% on {winnerClass.className})
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-hec-body font-semibold text-hec-ink tabular-nums">
                    -{formatVND(totalDiscount)}
                  </span>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 pt-3 border-t-2 border-hec-ink">
                <span className="min-w-0 text-hec-body font-semibold text-hec-ink">Grand Total Payable</span>
                <span className="shrink-0 whitespace-nowrap font-sans text-hec-h1 font-semibold text-hec-ink tabular-nums">
                  {formatVND(grandFinalPayable)}
                </span>
              </div>
            </div>
          </div>
        )}

        {isWinner && (
          <div className="pt-2 border-t border-hec-line">
            <p className="text-hec-caption text-hec-ink-soft">
              Sibling discount applies only to the highest tuition class. Other classes are charged at full rate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
