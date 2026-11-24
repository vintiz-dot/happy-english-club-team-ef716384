import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";
import { toast } from "sonner";
import { Calculator, Loader2 } from "lucide-react";
import { AlertDescription } from "@/components/ui/alert";

export function GenerateTuition() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [results, setResults] = useState<any>(null);
  const queryClient = useQueryClient();
  const ResultBox = IvoryNote;

  const generateMutation = useMutation({
    mutationFn: async (month: string) => {
      const monthStart = dayjs(`${month}-01`);
      const monthEnd = monthStart.endOf('month');
      const monthStartStr = monthStart.format('YYYY-MM-DD');
      const monthEndStr = monthEnd.format('YYYY-MM-DD');

      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select(`student_id, students(id, full_name)`)
        .lte("start_date", monthEndStr)
        .or(`end_date.is.null,end_date.gte.${monthStartStr}`);

      if (enrollError) throw enrollError;

      // Whoever has an enrolment covering a day of this month (the rule of
      // src/lib/finance/monthRoster.ts, which the query above applies). The
      // "active" switch and the Deactivate date decide nothing: a child who
      // was enrolled then is billed for then, whenever they were deactivated.
      const activeStudentIds = Array.from(
        new Set((enrollments ?? []).map((e: any) => e.student_id).filter(Boolean)),
      );

      if (activeStudentIds.length === 0) {
        return { success: true, processed: 0, errors: [], needsReview: 0, stillWrong: null };
      }

      const names = new Map<string, string>(
        (enrollments ?? []).map((e: any) => [e.student_id, e.students?.full_name ?? e.student_id]),
      );
      const results = { processed: 0, errors: [] as string[], needsReview: 0, stillWrong: null as number | null };

      // calculate-tuition allows 30 calls a minute. Firing every child at once
      // got the later ones refused (429), and the screen said only "N errors",
      // so a child could be left with no bill and nobody knew who. One call
      // every 2.1 s, one retry after a refusal, and every failure by name.
      const call = async (studentId: string) => {
        const { data, error } = await supabase.functions.invoke("calculate-tuition", { body: { studentId, month } });
        const status = (error as any)?.context?.status;
        return { data, error, status };
      };
      for (const [i, studentId] of activeStudentIds.entries()) {
        const name = names.get(studentId) ?? studentId;
        if (i > 0) await new Promise((r) => setTimeout(r, 2100));
        try {
          let r = await call(studentId);
          if (r.error && r.status === 429) {
            await new Promise((done) => setTimeout(done, 30000));
            r = await call(studentId);
          }
          if (r.error) {
            results.errors.push(`${name}: ${r.error.message}`);
          } else if (r.data?.error) {
            results.errors.push(`${name}: ${r.data.error}`);
          } else if (r.data?.invoiceSaved === false) {
            results.errors.push(`${name}: not saved${r.data?.siblingUnresolved ? " (family discount still being worked out)" : ""}`);
          } else {
            results.processed++;
          }
        } catch (err: any) {
          results.errors.push(`${name}: ${err.message}`);
        }
      }

      // The check the database keeps (20261123090000): anyone still without a
      // matching bill. Absent before the migration is pasted; then it says nothing.
      const { data: gaps, error: gapError } = await (supabase.rpc as any)("tuition_bill_gaps", { p_month: month });
      if (!gapError) results.stillWrong = (gaps ?? []).length;

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="mb-2 block text-hec-small font-medium text-hec-ink">Select Month</label>
            <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
          </div>
          {/* Generate writes invoices for every student this month: it is the
              irreversible act on this card, so in Ivory it is the
              destructive-quiet control and says what it does. */}
          <Button
            variant="destructive-quiet"
            className="w-full sm:w-auto"
            onClick={() => generateMutation.mutateAsync(selectedMonth).catch(() => {})}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {(generateMutation.isPending ? "Generating tuition invoices..." : "Generate tuition invoices")}
          </Button>
        </div>
        {results && (
          <ResultBox>
            <AlertDescription className="text-hec-small">
              Generated tuition for {results.processed} students.
              {results.errors.length > 0 && (
                <div className="mt-2">
                  <strong className="font-semibold text-hec-danger">{results.errors.length} not saved:</strong>
                  <ul className="mt-1 list-disc pl-5">
                    {results.errors.map((e: string) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              {results.stillWrong != null && results.stillWrong > 0 && (
                <div className="mt-2 font-semibold text-hec-danger">
                  {results.stillWrong} bill(s) for this month are still missing or do not match the register (Finance &gt; Tuition lists them).
                </div>
              )}
              {results.needsReview > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <strong className="font-semibold text-hec-warn">{results.needsReview} students need review.</strong>
                  <Button variant="link" className="h-auto min-h-hec-target p-0" onClick={() => window.location.href = `/admin/tuition-review?month=${selectedMonth}`}>
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

// Ivory: the same role="alert" box as a solid sunken panel (the shared Alert keeps its old translucent look).
function IvoryNote({ children }: { children: React.ReactNode }) {
  return <div role="alert" className="rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-ink">{children}</div>;
}
