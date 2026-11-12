import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatVND } from "@/lib/invoice/formatter";
import { Users, ArrowRight, Check, Clock, Wallet, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { useIvory } from "@/hooks/useIvory";

interface FamilyPaymentActivityLogProps {
  selectedMonth?: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  actor_user_id: string | null;
  occurred_at: string;
  diff: {
    family_id?: string;
    family_name?: string;
    total_payment?: number;
    allocation_order?: number;
    student?: {
      id: string;
      name: string;
      before_debt: number;
      applied: number;
      after_debt: number;
    };
    excess_transferred?: number;
    remaining_to_allocate?: number;
    from_student?: { id: string; name: string };
    to_student?: { id: string; name: string };
    transfer_amount?: number;
    allocations?: Array<{ student_name: string; applied: number }>;
    leftover?: { type: string; amount: number } | null;
    siblings_count?: number;
    total_allocated?: number;
  };
}

export function FamilyPaymentActivityLog({ selectedMonth }: FamilyPaymentActivityLogProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  // Fetch family payment audit logs
  const { data: activityLogs, isLoading } = useQuery({
    queryKey: ["family-payment-activity", selectedMonth],
    queryFn: async () => {
      let query = supabase
        .from("audit_log")
        .select("*")
        .eq("entity", "family_payment")
        .in("action", [
          "family_payment_initiated",
          "family_payment_allocation",
          "credit_transfer",
          "family_payment_completed"
        ])
        .order("occurred_at", { ascending: false })
        .limit(100);

      if (selectedMonth) {
        // Filter by month in diff
        const monthStart = `${selectedMonth}-01T00:00:00`;
        const nextMonth = new Date(monthStart);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const monthEnd = nextMonth.toISOString();

        query = query.gte("occurred_at", monthStart).lt("occurred_at", monthEnd);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as AuditLogEntry[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Set up realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("family-payment-activity")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "audit_log",
          filter: "entity=eq.family_payment"
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["family-payment-activity"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Group logs by payment (entity_id)
  const groupedLogs = activityLogs?.reduce((acc, log) => {
    const paymentId = log.entity_id || "unknown";
    if (!acc[paymentId]) {
      acc[paymentId] = [];
    }
    acc[paymentId].push(log);
    return acc;
  }, {} as Record<string, AuditLogEntry[]>);

  // Get summary for each payment
  const paymentSummaries = Object.entries(groupedLogs || {}).map(([paymentId, logs]) => {
    const initiated = logs.find(l => l.action === "family_payment_initiated");
    const completed = logs.find(l => l.action === "family_payment_completed");
    const allocations = logs.filter(l => l.action === "family_payment_allocation");
    const transfers = logs.filter(l => l.action === "credit_transfer");

    return {
      paymentId,
      familyName: initiated?.diff?.family_name || completed?.diff?.family_name || "Unknown",
      totalPayment: initiated?.diff?.total_payment || completed?.diff?.total_payment || 0,
      occurredAt: initiated?.occurred_at || completed?.occurred_at || "",
      siblingsCount: completed?.diff?.siblings_count || allocations.length,
      totalAllocated: completed?.diff?.total_allocated || 0,
      leftover: completed?.diff?.leftover,
      allocations,
      transfers,
      isComplete: !!completed,
    };
  }).sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Family Payment Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className={iv("h-16 bg-hec-sunken rounded-hec-md", "h-16 bg-muted rounded-lg")} />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Family Payment Activity
        </CardTitle>
        <CardDescription>
          Real-time log of smart family payment allocations and credit transfers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          {paymentSummaries.length === 0 ? (
            <div className={iv("text-center py-8 text-hec-body text-hec-ink-soft", "text-center py-8 text-muted-foreground")}>
              No family payment activity found
            </div>
          ) : (
            <div className="space-y-3">
              {paymentSummaries.map((summary) => (
                <Collapsible
                  key={summary.paymentId}
                  open={expandedItems.has(summary.paymentId)}
                  onOpenChange={() => toggleExpand(summary.paymentId)}
                >
                  <div className={iv("border border-hec-line bg-hec-surface rounded-hec-md overflow-hidden", "border rounded-lg overflow-hidden")}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className={iv("w-full justify-between gap-3 whitespace-normal rounded-none p-4 h-auto text-left hover:bg-hec-sunken/60", "w-full justify-between p-4 h-auto hover:bg-muted/50")}
                      >
                        <div className={iv("flex min-w-0 items-start gap-3", "flex items-center gap-3")}>
                          <div className={ivory ? `h-10 w-10 shrink-0 rounded-full border flex items-center justify-center ${
                            summary.isComplete ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : "border-hec-warn/30 bg-hec-warn-tint text-hec-warn"
                          }` : `h-10 w-10 rounded-full flex items-center justify-center ${
                            summary.isComplete ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600"
                          }`} role={ivory ? "img" : undefined} aria-label={ivory ? (summary.isComplete ? "Completed" : "In progress") : undefined}>
                            {summary.isComplete ? <Check className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                          </div>
                          <div className={iv("min-w-0 text-left", "text-left")}>
                            <div className={iv("whitespace-normal break-words hyphens-none text-hec-body font-medium text-hec-ink", "font-medium")}>{summary.familyName}</div>
                            <div className={iv("text-hec-small font-normal text-hec-ink-soft", "text-sm text-muted-foreground")}>
                              {formatDistanceToNow(new Date(summary.occurredAt), { addSuffix: true })}
                            </div>
                          </div>
                        </div>
                        <div className={iv("flex shrink-0 items-center gap-3", "flex items-center gap-3")}>
                          <div className="text-right">
                            <div className={iv("whitespace-nowrap font-semibold text-hec-ink tabular-nums", "font-semibold")}>{formatVND(summary.totalPayment)}</div>
                            <div className={iv("text-hec-caption font-normal text-hec-ink-soft tabular-nums", "text-xs text-muted-foreground")}>
                              {summary.siblingsCount} sibling{summary.siblingsCount > 1 ? "s" : ""}
                            </div>
                          </div>
                          {expandedItems.has(summary.paymentId) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className={iv("px-4 pb-4 space-y-3 border-t border-hec-line pt-3", "px-4 pb-4 space-y-3 border-t pt-3")}>
                        {/* Allocation Chain */}
                        {summary.allocations.map((alloc, index) => (
                          <div key={alloc.id} className={iv("flex flex-wrap items-center gap-2 text-hec-small text-hec-ink", "flex items-center gap-2 text-sm")}>
                            <div className={iv("h-6 w-6 shrink-0 rounded-full bg-hec-sunken text-hec-ink-soft flex items-center justify-center text-hec-caption font-medium tabular-nums", "h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium")}>
                              {alloc.diff.allocation_order || index + 1}
                            </div>
                            <span className={iv("min-w-0 whitespace-normal break-words hyphens-none font-medium", "font-medium")}>{alloc.diff.student?.name}</span>
                            <ArrowRight className={iv("h-3 w-3 text-hec-ink-soft", "h-3 w-3 text-muted-foreground")} />
                            <span className={iv("whitespace-nowrap text-hec-ink tabular-nums", "text-green-600")}>
                              {formatVND(alloc.diff.student?.applied || 0)}
                            </span>
                            {alloc.diff.student?.after_debt === 0 && (
                              <Badge variant="outline" className={iv("border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf", "text-green-600 border-green-600")}>
                                Settled
                              </Badge>
                            )}
                            {alloc.diff.student?.after_debt && alloc.diff.student.after_debt > 0 && (
                              <span className={iv("whitespace-nowrap text-hec-ink-soft text-hec-caption tabular-nums", "text-muted-foreground text-xs")}>
                                (remaining: {formatVND(alloc.diff.student.after_debt)})
                              </span>
                            )}
                          </div>
                        ))}

                        {/* Credit Transfers */}
                        {summary.transfers.map((transfer) => (
                          <div key={transfer.id} className={iv("flex flex-wrap items-center gap-2 text-hec-small text-hec-ink bg-hec-sunken border border-hec-line p-2 rounded-hec-sm", "flex items-center gap-2 text-sm text-orange-600 bg-orange-50 p-2 rounded")}>
                            <Wallet className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4")} />
                            <span>Credit transfer:</span>
                            <span className={iv("min-w-0 whitespace-normal break-words font-medium", "font-medium")}>{transfer.diff.from_student?.name}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span className={iv("min-w-0 whitespace-normal break-words font-medium", "font-medium")}>{transfer.diff.to_student?.name}</span>
                            <span className={iv("whitespace-nowrap tabular-nums", "")}>({formatVND(transfer.diff.transfer_amount || 0)})</span>
                          </div>
                        ))}

                        {/* Leftover */}
                        {summary.leftover && (
                          <div className={iv("flex flex-wrap items-center gap-2 text-hec-small text-hec-ink-soft border-t border-hec-line pt-2", "flex items-center gap-2 text-sm text-muted-foreground border-t pt-2")}>
                            <span>Leftover:</span>
                            <span className={iv("whitespace-nowrap font-medium text-hec-ink tabular-nums", "font-medium")}>{formatVND(summary.leftover.amount)}</span>
                            <Badge variant="secondary">
                              {summary.leftover.type === "voluntary_contribution" 
                                ? "Contribution" 
                                : "Credit"
                              }
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
