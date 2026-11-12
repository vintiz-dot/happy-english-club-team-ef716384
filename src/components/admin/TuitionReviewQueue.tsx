import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { AlertCircle, CheckCircle, Loader2, FileText } from "lucide-react";
import { StudentTuitionReviewCard } from "./StudentTuitionReviewCard";
import { Accordion } from "@/components/ui/accordion";
import Layout from "@/components/Layout";
import { useSearchParams } from "react-router-dom";

export function TuitionReviewQueue() {
  const [searchParams] = useSearchParams();
  const initialMonth = searchParams.get("month") || dayjs().format("YYYY-MM");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: reviewData, isLoading } = useQuery({
    queryKey: ["tuition-review-queue", selectedMonth],
    queryFn: async () => {
      // Fetch invoices with review flags
      const { data: invoices, error } = await supabase
        .from("invoices")
        .select(`
          *,
          students!inner(id, full_name, family_id)
        `)
        .eq("month", selectedMonth)
        .order("confirmation_status", { ascending: false });

      if (error) throw error;

      return invoices || [];
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async (invoiceIds: string[]) => {
      const { data, error } = await supabase.functions.invoke("confirm-tuition", {
        body: { invoiceIds, adjustedStatus: "confirmed" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Tuition confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["tuition-review-queue"] });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] });
      setSelectedStudents(new Set());
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to confirm tuition");
    },
  });

  const needsReview = useMemo(
    () => reviewData?.filter((i) => i.confirmation_status === "needs_review") || [],
    [reviewData]
  );

  const confirmed = useMemo(
    () => reviewData?.filter((i) => i.confirmation_status === "confirmed") || [],
    [reviewData]
  );

  const autoApproved = useMemo(
    () => reviewData?.filter((i) => i.confirmation_status === "auto_approved") || [],
    [reviewData]
  );

  // Group by flag type
  const groupedByFlag = useMemo(() => {
    const groups = new Map<string, any[]>();
    
    needsReview.forEach((invoice) => {
      const flags = invoice.review_flags as any[] || [];
      if (flags.length === 0) {
        const existing = groups.get("other") || [];
        groups.set("other", [...existing, invoice]);
      } else {
        flags.forEach((flag) => {
          const existing = groups.get(flag.type) || [];
          groups.set(flag.type, [...existing, invoice]);
        });
      }
    });

    return groups;
  }, [needsReview]);

  const stats = useMemo(() => {
    const totalNeedsReview = needsReview.length;
    const totalVND = needsReview.reduce((sum, i) => sum + (i.total_amount || 0), 0);
    const totalAutoApproved = autoApproved.length;
    
    // Calculate total difference amount (expected - actual)
    const totalDifference = needsReview.reduce((sum, i) => {
      const flags = i.review_flags as any[] || [];
      const adjustmentFlag = flags.find((f) => f.type === "tuition_adjustment");
      return sum + Math.abs(adjustmentFlag?.details?.difference || 0);
    }, 0);
    
    return {
      needsReview: totalNeedsReview,
      autoApproved: totalAutoApproved,
      totalVND,
      totalDifference,
    };
  }, [reviewData, needsReview, autoApproved]);

  const handleConfirmSelected = () => {
    if (selectedStudents.size === 0) {
      toast.error("No students selected");
      return;
    }
    confirmMutation.mutate(Array.from(selectedStudents));
  };

  const handleToggleStudent = (invoiceId: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(invoiceId)) {
      newSet.delete(invoiceId);
    } else {
      newSet.add(invoiceId);
    }
    setSelectedStudents(newSet);
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getFlagLabel = (flagType: string) => {
    const labels: Record<string, string> = {
      tuition_adjustment: "Tuition Adjustments",
      changed_after_confirmation: "Changed after it was confirmed",
      other: "Other Issues",
    };
    return labels[flagType] || flagType;
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tuition Review Queue</h1>
          <p className="text-muted-foreground">Review and confirm student tuition with discounts or anomalies</p>
        </div>

        <div className="flex items-center gap-4">
          <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Needs Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.needsReview}</div>
              <p className="text-xs text-muted-foreground mt-1">Students flagged</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto-Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.autoApproved}</div>
              <p className="text-xs text-muted-foreground mt-1">Matches expected</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Difference</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatVND(stats.totalDifference)}</div>
              <p className="text-xs text-muted-foreground mt-1">Expected vs Actual</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatVND(stats.totalVND)}</div>
              <p className="text-xs text-muted-foreground mt-1">Needs review total</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="needs_review" className="space-y-4">
          <TabsList>
            <TabsTrigger value="needs_review" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Needs Review
              {stats.needsReview > 0 && <Badge variant="destructive">{stats.needsReview}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              Confirmed
              <Badge variant="outline">{confirmed.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All
              <Badge variant="outline">{reviewData?.length || 0}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="needs_review" className="space-y-4">
            {needsReview.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">All tuition reviewed!</p>
                  <p className="text-sm">No students need review for this month.</p>
                </CardContent>
              </Card>
            ) : (
              <Accordion type="multiple" className="space-y-4">
                {Array.from(groupedByFlag.entries()).map(([flagType, invoices]) => (
                  <Card key={flagType}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-lg">{getFlagLabel(flagType)}</CardTitle>
                          <CardDescription>{invoices.length} students</CardDescription>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const ids = invoices.map((i) => i.id);
                            confirmMutation.mutate(ids);
                          }}
                          disabled={confirmMutation.isPending}
                        >
                          Confirm All
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {invoices.map((invoice) => (
                        <StudentTuitionReviewCard
                          key={invoice.id}
                          invoice={invoice}
                          month={selectedMonth}
                          isSelected={selectedStudents.has(invoice.id)}
                          onToggleSelect={() => handleToggleStudent(invoice.id)}
                        />
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </Accordion>
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="space-y-4">
            {confirmed.map((invoice) => (
              <StudentTuitionReviewCard
                key={invoice.id}
                invoice={invoice}
                month={selectedMonth}
                isSelected={selectedStudents.has(invoice.id)}
                onToggleSelect={() => handleToggleStudent(invoice.id)}
              />
            ))}
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            {reviewData?.map((invoice) => (
              <StudentTuitionReviewCard
                key={invoice.id}
                invoice={invoice}
                month={selectedMonth}
                isSelected={selectedStudents.has(invoice.id)}
                onToggleSelect={() => handleToggleStudent(invoice.id)}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Bulk Actions Sticky Footer */}
        {selectedStudents.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <span className="text-sm font-medium">{selectedStudents.size} students selected</span>
              <div className="flex gap-2">
                <Button onClick={handleConfirmSelected} disabled={confirmMutation.isPending}>
                  {confirmMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Selected
                </Button>
                <Button variant="outline" onClick={() => setSelectedStudents(new Set())}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
