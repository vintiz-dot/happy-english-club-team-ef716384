import { useQuery } from "@tanstack/react-query";
import { siblingRetryDelayMs } from "@/lib/siblingRetry";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingDown, Check } from "lucide-react";
import { formatVND } from "@/lib/invoice/formatter";
import { Loading } from "@/components/ui/loading";
import { siblingDiscountView } from "@/lib/siblingDiscountView";
import { useIvory } from "@/hooks/useIvory";

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
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
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
              <p className={iv("text-hec-small font-medium text-hec-ink-soft", "text-sm font-medium text-muted-foreground")}>Monthly Tuition Breakdown</p>
              {classBreakdown.map(enrollment => (
                <div key={enrollment.classId} className={iv("p-4 rounded-hec-lg border border-hec-line bg-hec-surface space-y-2", "p-4 rounded-lg border bg-card space-y-2")}>
                  <div className={iv("flex items-start justify-between gap-4", "flex items-center justify-between")}>
                    <h4 className={iv("min-w-0 whitespace-normal break-words hyphens-none text-hec-body font-semibold text-hec-ink", "font-semibold")}>{enrollment.className}</h4>
                    <span className={iv("shrink-0 whitespace-nowrap text-hec-caption text-hec-ink-soft tabular-nums", "text-xs text-muted-foreground")}>{enrollment.sessionsCount} sessions</span>
                  </div>
                  <div className={iv("flex items-baseline justify-between gap-4 pt-2 border-t border-hec-line", "flex items-center justify-between pt-2 border-t")}>
                    <span className={iv("min-w-0 text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Total Payable</span>
                    <span className={iv("shrink-0 whitespace-nowrap text-hec-h3 font-semibold text-hec-ink tabular-nums", "text-lg font-bold")}>{formatVND(enrollment.totalAmount)}</span>
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
    <Card className={ivory ? "" : isWinner ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20" : ""}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className={ivory ? `h-5 w-5 shrink-0 ${isWinner ? 'text-hec-brass' : 'text-hec-ink-soft'}` : `h-5 w-5 ${isWinner ? 'text-green-600 dark:text-green-400' : ''}`} />
          <div className={iv("min-w-0 flex-1", "flex-1")}>
            <CardTitle className={ivory ? "" : isWinner ? "text-green-700 dark:text-green-300" : ""}>
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
            <Badge variant="default" className={iv("shrink-0 border-hec-brass/40 bg-transparent text-hec-brass", "bg-green-600 hover:bg-green-700")}>
              Winner
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isWinner && siblingState?.reason && (
          <div className={iv("p-3 rounded-hec-md bg-hec-sunken border border-hec-line", "p-3 rounded-lg bg-muted/50 border")}>
            <p className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>{siblingState.reason}</p>
          </div>
        )}

        {classBreakdown && classBreakdown.length > 0 && (
          <div className="space-y-3">
            <p className={iv("text-hec-small font-medium text-hec-ink-soft", "text-sm font-medium text-muted-foreground")}>Monthly Tuition Breakdown</p>

            {classBreakdown.map(enrollment => {
              const isWinnerClass = isWinner && winnerClass?.classId === enrollment.classId;
              const discountAmount = isWinnerClass ? totalDiscount : 0;
              const finalAmount = enrollment.totalAmount - discountAmount;

              return (
                <div 
                  key={enrollment.classId}
                  className={iv("p-4 rounded-hec-lg border border-hec-line bg-hec-surface space-y-3", "p-4 rounded-lg border bg-card space-y-3")}
                >
                  {/* Class Name with Badge */}
                  <div className={iv("flex items-start justify-between gap-4", "flex items-center justify-between")}>
                    <div className={iv("flex min-w-0 flex-wrap items-center gap-2", "flex items-center gap-2")}>
                      <h4 className={iv("min-w-0 whitespace-normal break-words hyphens-none text-hec-body font-semibold text-hec-ink", "font-semibold")}>{enrollment.className}</h4>
                      {isWinnerClass && (
                        <Badge variant="default" className={iv("shrink-0 border-hec-brass/40 bg-transparent text-hec-brass", "bg-green-600 hover:bg-green-700")}>
                          <Check className="h-3 w-3 mr-1" />
                          Winner
                        </Badge>
                      )}
                    </div>
                    <span className={iv("shrink-0 whitespace-nowrap text-hec-caption text-hec-ink-soft tabular-nums", "text-xs text-muted-foreground")}>{enrollment.sessionsCount} sessions</span>
                  </div>

                  {/* Base Tuition */}
                  <div className={iv("flex items-baseline justify-between gap-4 py-2", "flex items-center justify-between py-2")}>
                    <span className={iv("min-w-0 text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>Base Tuition</span>
                    <span className={iv("shrink-0 whitespace-nowrap text-hec-body font-medium text-hec-ink tabular-nums", "text-base font-medium")}>{formatVND(enrollment.totalAmount)}</span>
                  </div>

                  {/* Discount (only for winner class) */}
                  {isWinnerClass && (
                    <div className={iv("flex items-baseline justify-between gap-4 py-2 -mt-1", "flex items-center justify-between py-2 -mt-1")}>
                      <span className={iv("min-w-0 text-hec-small text-hec-ink-soft", "text-sm text-green-600 dark:text-green-400")}>Discount ({discountPercent}%)</span>
                      <span className={iv("shrink-0 whitespace-nowrap text-hec-body font-medium text-hec-ink tabular-nums", "text-base font-medium text-green-600 dark:text-green-400")}>
                        -{formatVND(discountAmount)}
                      </span>
                    </div>
                  )}

                  {/* Final Payable */}
                  <div className={iv("flex items-baseline justify-between gap-4 pt-3 border-t border-hec-line", "flex items-center justify-between pt-3 border-t")}>
                    <span className={iv("min-w-0 text-hec-small font-semibold text-hec-ink", "text-sm font-semibold")}>Final Payable</span>
                    <span className={ivory ? "shrink-0 whitespace-nowrap text-hec-h3 font-semibold text-hec-ink tabular-nums" : `text-lg font-bold ${isWinnerClass ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                      {formatVND(finalAmount)}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Grand Total Summary */}
            <div className={iv("p-4 rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1 space-y-2", "p-4 rounded-lg border-2 bg-card space-y-2")}>
              <div className={iv("flex items-baseline justify-between gap-4", "flex items-center justify-between")}>
                <span className={iv("min-w-0 text-hec-small font-medium text-hec-ink-soft", "text-sm font-medium")}>Total Before Discount</span>
                <span className={iv("shrink-0 whitespace-nowrap text-hec-body font-semibold text-hec-ink tabular-nums", "text-base font-semibold")}>{formatVND(grandTotal)}</span>
              </div>
              {isWinner && totalDiscount > 0 && winnerClass && (
                <div className={iv("flex items-baseline justify-between gap-4", "flex items-center justify-between")}>
                  <span className={iv("min-w-0 whitespace-normal break-words text-hec-small font-medium text-hec-ink-soft", "text-sm font-medium text-green-600 dark:text-green-400")}>
                    Discount ({discountPercent}% on {winnerClass.className})
                  </span>
                  <span className={iv("shrink-0 whitespace-nowrap text-hec-body font-semibold text-hec-ink tabular-nums", "text-base font-semibold text-green-600 dark:text-green-400")}>
                    -{formatVND(totalDiscount)}
                  </span>
                </div>
              )}
              <div className={iv("flex items-baseline justify-between gap-4 pt-3 border-t-2 border-hec-ink", "flex items-center justify-between pt-2 border-t")}>
                <span className={iv("min-w-0 text-hec-body font-semibold text-hec-ink", "font-bold")}>Grand Total Payable</span>
                <span className={ivory ? "shrink-0 whitespace-nowrap font-sans text-hec-h1 font-semibold text-hec-ink tabular-nums" : `text-xl font-bold ${isWinner ? 'text-green-600 dark:text-green-400' : 'text-foreground'}`}>
                  {formatVND(grandFinalPayable)}
                </span>
              </div>
            </div>
          </div>
        )}

        {isWinner && (
          <div className={iv("pt-2 border-t border-hec-line", "pt-2 border-t border-green-200 dark:border-green-800")}>
            <p className={iv("text-hec-caption text-hec-ink-soft", "text-xs text-muted-foreground")}>
              Sibling discount applies only to the highest tuition class. Other classes are charged at full rate.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
