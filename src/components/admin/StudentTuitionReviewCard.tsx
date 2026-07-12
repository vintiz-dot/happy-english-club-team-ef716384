import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {  ChevronDown, CheckCircle, Edit, FileText, Loader2 } from "lucide-react";
import { EnrollmentRateEditor } from "./EnrollmentRateEditor";
import { Textarea } from "@/components/ui/textarea";

interface StudentTuitionReviewCardProps {
  invoice: any;
  month: string;
  isSelected: boolean;
  onToggleSelect: () => void;
}

export function StudentTuitionReviewCard({
  invoice,
  month,
  isSelected,
  onToggleSelect,
}: StudentTuitionReviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [notes, setNotes] = useState(invoice.confirmation_notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const queryClient = useQueryClient();

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("confirm-tuition", {
        body: { 
          invoiceIds: [invoice.id],
          notes: notes || undefined,
          adjustedStatus: "confirmed"
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tuition confirmed");
      queryClient.invalidateQueries({ queryKey: ["tuition-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to confirm");
    },
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("calculate-tuition", {
        body: { studentId: invoice.student_id, month },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tuition recalculated");
      queryClient.invalidateQueries({ queryKey: ["tuition-review-queue"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to recalculate");
    },
  });

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      needs_review: { variant: "destructive", label: "Needs Review" },
      confirmed: { variant: "default", label: "Confirmed" },
      adjusted: { variant: "secondary", label: "Adjusted" },
      auto_approved: { variant: "outline", label: "Auto-Approved" },
    };
    const config = variants[status] || variants.needs_review;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getFlagBadge = (flag: any) => {
    const colors: Record<string, string> = {
      has_special_discount: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      has_referral_bonus: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      sibling_discount_winner: "bg-green-500/10 text-green-500 border-green-500/20",
      rate_override: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      low_tuition: "bg-red-500/10 text-red-500 border-red-500/20",
      enrollment_discount: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
    };
    return (
      <Badge variant="outline" className={colors[flag.type] || ""}>
        {flag.label}
      </Badge>
    );
  };

  const reviewFlags = (invoice.review_flags as any[]) || [];
  const student = invoice.students;
  const discountPercent = invoice.base_amount > 0 
    ? Math.round((invoice.discount_amount / invoice.base_amount) * 100) 
    : 0;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />

          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{student?.full_name || "Unknown Student"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(invoice.confirmation_status)}
                  <span className="text-sm text-muted-foreground">
                    {formatVND(invoice.total_amount)}
                  </span>
                  {discountPercent > 0 && (
                    <Badge variant="outline" className="text-xs">
                      -{discountPercent}% discount
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                {invoice.confirmation_status === "needs_review" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => confirmMutation.mutate()}
                    disabled={confirmMutation.isPending}
                  >
                    {confirmMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditingRate(true)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Review Flags */}
            {reviewFlags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {reviewFlags.map((flag, idx) => (
                  <div key={idx}>{getFlagBadge(flag)}</div>
                ))}
              </div>
            )}

            {/* Collapsible Details */}
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {isExpanded ? "Hide" : "Show"} Details
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Base Amount:</span>
                    <span className="ml-2 font-medium">{formatVND(invoice.base_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="ml-2 font-medium">{formatVND(invoice.discount_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Due:</span>
                    <span className="ml-2 font-medium">{formatVND(invoice.total_amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Paid:</span>
                    <span className="ml-2 font-medium">{formatVND(invoice.paid_amount || 0)}</span>
                  </div>
                </div>

                {/* Possible Reasons for Anomalies */}
                {reviewFlags.some((f) => f.type === "low_tuition") && (
                  <div className="p-3 bg-muted rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Possible Reasons for Low Tuition:</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {reviewFlags
                        .find((f) => f.type === "low_tuition")
                        ?.details?.possibleReasons?.map((reason: string, idx: number) => (
                          <li key={idx}>• {reason}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowNotes(!showNotes)}
                    className="w-full justify-start"
                  >
                    {showNotes ? "Hide" : "Add"} Notes
                  </Button>
                  {showNotes && (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add notes about this tuition..."
                      className="min-h-[80px]"
                    />
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => recalculateMutation.mutate()}
                  disabled={recalculateMutation.isPending}
                  className="w-full"
                >
                  {recalculateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    "Recalculate Tuition"
                  )}
                </Button>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </div>
      </CardContent>

      {isEditingRate && (
        <EnrollmentRateEditor
          studentId={invoice.student_id}
          month={month}
          onClose={() => setIsEditingRate(false)}
        />
      )}
    </Card>
  );
}
