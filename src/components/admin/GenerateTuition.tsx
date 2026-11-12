import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIvory } from "@/hooks/useIvory";

export function GenerateTuition() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [results, setResults] = useState<any>(null);
  const queryClient = useQueryClient();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const ResultBox = ivory ? IvoryNote : Alert;

  const generateMutation = useMutation({
    mutationFn: async (month: string) => {
      const monthStart = dayjs(`${month}-01`);
      const monthEnd = monthStart.endOf('month');
      const monthStartStr = monthStart.format('YYYY-MM-DD');
      const monthEndStr = monthEnd.format('YYYY-MM-DD');

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`student_id, students(id, full_name, is_active, deactivated_at)`)
        .lte("start_date", monthEndStr)
        .or(`end_date.is.null,end_date.gte.${monthStartStr}`);

      if (enrollError) throw enrollError;

      // Month-aware: generate for whoever was on the roster during this
      // month, not just whoever is still here today. Regenerating an old
      // month must not drop a student who has left since.
      const activeStudentIds = Array.from(
        new Set(
          enrollments
            ?.filter((e: any) =>
              e.students?.is_active ||
              (e.students?.deactivated_at && e.students.deactivated_at >= monthStartStr))
            .map((e: any) => e.student_id) || []
        )
      );

      if (activeStudentIds.length === 0) {
        return { success: true, processed: 0, errors: [], needsReview: 0 };
      }

      const results = { processed: 0, errors: [] as string[], needsReview: 0 };

      for (const studentId of activeStudentIds) {
        try {
          const { data, error } = await supabase.functions.invoke("calculate-tuition", {
            body: { studentId, month },
          });
          if (error) {
            results.errors.push(`Student ${studentId}: ${error.message}`);
          } else if (data?.error) {
            results.errors.push(`Student ${studentId}: ${data.error}`);
          } else {
            results.processed++;
          }
        } catch (err: any) {
          results.errors.push(`Student ${studentId}: ${err.message}`);
        }
      }

      const { data: invoices } = await supabase
        .from("invoices")
        .select("confirmation_status")
        .eq("month", month)
        .eq("confirmation_status", "needs_review");
      
      results.needsReview = invoices?.length || 0;
      return results;
    },
    onSuccess: (data) => {
      setResults(data);
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] });
      if (data.errors.length === 0) {
        toast.success(`Generated tuition for ${data.processed} students`);
      } else {
        toast.warning(`Generated tuition for ${data.processed} students with ${data.errors.length} errors`);
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate tuition");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Generate Tuition
        </CardTitle>
        <CardDescription>Calculate and generate tuition invoices for all active students</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className={iv("flex flex-col gap-4 sm:flex-row sm:items-end", "flex items-end gap-4")}>
          <div className={iv("min-w-0 flex-1", "flex-1")}>
            <label className={iv("mb-2 block text-hec-small font-medium text-hec-ink", "text-sm font-medium mb-2 block")}>Select Month</label>
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>
          {/* Generate writes invoices for every student this month: it is the
              irreversible act on this card, so in Ivory it is the
              destructive-quiet control and says what it does. */}
          <Button
            variant={ivory ? "destructive-quiet" : "default"}
            className={iv("w-full sm:w-auto", "")}
            onClick={() => generateMutation.mutate(selectedMonth)}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {ivory ? (generateMutation.isPending ? "Generating tuition invoices..." : "Generate tuition invoices") : "Generate"}
          </Button>
        </div>
        {results && (
          <ResultBox>
            <AlertDescription className={iv("text-hec-small", "")}>
              Generated tuition for {results.processed} students.
              {results.needsReview > 0 && (
                <div className={iv("mt-2 flex flex-wrap items-center gap-2", "mt-2")}>
                  <strong className={iv("font-semibold text-hec-warn", "text-amber-600")}>{results.needsReview} students need review.</strong>
                  <Button variant="link" className={iv("h-auto min-h-hec-target p-0", "p-0 h-auto ml-2")} onClick={() => window.location.href = `/admin/tuition-review?month=${selectedMonth}`}>
                    Go to Review Queue →
                  </Button>
                </div>
              )}
            </AlertDescription>
          </ResultBox>
        )}
      </CardContent>
    </Card>
  );
}

// Ivory: the same role="alert" box as a solid sunken panel (the shared Alert is still glass).
function IvoryNote({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-ink">{children}</div>;
}
