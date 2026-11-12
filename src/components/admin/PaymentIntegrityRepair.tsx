import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { labelAfterPayment } from "@/lib/invoiceStatus";

interface IntegrityIssue {
  type: 'orphaned_ledger' | 'incorrect_invoice_status' | 'corrupted_contribution';
  entityId: string;
  description: string;
  suggestedFix: string;
}

export function PaymentIntegrityRepair() {
  const [scanning, setScanning] = useState(false);
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const queryClient = useQueryClient();

  const scanForIssues = async () => {
    setScanning(true);
    setIssues([]);
    
    try {
      const foundIssues: IntegrityIssue[] = [];

      // Check for voluntary contributions that incorrectly touched AR
      const { data: corruptedContributions } = await supabase
        .from('ledger_entries')
        .select('tx_id, tx_key, ledger_accounts!inner(student_id, code)')
        .ilike('tx_key', '%contribution%')
        .eq('ledger_accounts.code', 'AR');

      if (corruptedContributions && corruptedContributions.length > 0) {
        foundIssues.push({
          type: 'corrupted_contribution',
          entityId: 'multiple',
          description: `${corruptedContributions.length} voluntary contributions incorrectly posted to AR`,
          suggestedFix: 'Use Voluntary Contribution Repair tool'
        });
      }

      // Check for invoices whose label disagrees with the month's own money.
      // The rule is the one every writer uses (src/lib/invoiceStatus.ts, the
      // mirror of the edge functions' copy): the month's recorded payment
      // against its charge plus carry-in. It used to judge by cumulative
      // paid_amount and expect 'draft' at zero, so it listed nearly every
      // bill and Repair wrote labels the next calculation undid. An admin's
      // 'credit' is never listed or changed.
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, student_id, month, base_amount, total_amount, recorded_payment, carry_in_debt, carry_in_credit, status');

      if (invoices) {
        for (const invoice of invoices) {
          const expectedStatus = labelAfterPayment(invoice);

          if (expectedStatus && invoice.status !== expectedStatus) {
            foundIssues.push({
              type: 'incorrect_invoice_status',
              entityId: invoice.id,
              description: `Invoice ${invoice.id.slice(0, 8)}... (${invoice.month}) has status '${invoice.status}' but should be '${expectedStatus}' (recorded this month: ${invoice.recorded_payment ?? 0}, total: ${invoice.total_amount})`,
              suggestedFix: `Update status to '${expectedStatus}'`
            });
          }
        }
      }

      // Check 2: Find orphaned ledger entries (tx_key references deleted payments)
      const { data: ledgerEntries } = await supabase
        .from('ledger_entries')
        .select('id, tx_key, memo')
        .like('tx_key', 'payment-%');

      if (ledgerEntries) {
        for (const entry of ledgerEntries) {
          // Extract payment ID from tx_key (format: payment-{uuid}...)
          const match = entry.tx_key.match(/payment-([a-f0-9-]{36})/);
          if (match) {
            const paymentId = match[1];
            
            // Check if payment exists
            const { data: payment } = await supabase
              .from('payments')
              .select('id')
              .eq('id', paymentId)
              .maybeSingle();

            if (!payment) {
              foundIssues.push({
                type: 'orphaned_ledger',
                entityId: entry.id,
                description: `Ledger entry ${entry.id.slice(0, 8)}... references deleted payment ${paymentId.slice(0, 8)}...`,
                suggestedFix: 'Mark as orphaned or delete (requires confirmation)'
              });
            }
          }
        }
      }

      setIssues(foundIssues);
      
      if (foundIssues.length === 0) {
        toast.success("No integrity issues found!");
      } else {
        toast.warning(`Found ${foundIssues.length} integrity issues`);
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error("Failed to scan for issues");
    } finally {
      setScanning(false);
    }
  };

  const repairMutation = useMutation({
    mutationFn: async () => {
      const invoiceIssues = issues.filter(i => i.type === 'incorrect_invoice_status');
      let fixedCount = 0;

      // Fix invoice statuses
      for (const issue of invoiceIssues) {
        const { data: invoice } = await supabase
          .from('invoices')
          .select('base_amount, total_amount, recorded_payment, carry_in_debt, carry_in_credit, status')
          .eq('id', issue.entityId)
          .single();

        // Re-read and judged again by the same rule; a bill set to 'credit' since the scan is left alone.
        const correctStatus = invoice ? labelAfterPayment(invoice) : undefined;
        if (invoice && correctStatus) {
          const { error } = await supabase
            .from('invoices')
            .update({ 
              status: correctStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', issue.entityId);

          if (!error) {
            fixedCount++;
            
            // Log to audit
            await supabase.from('audit_log').insert({
              action: 'repair',
              entity: 'invoice',
              entity_id: issue.entityId,
              diff: {
                repair_type: 'status_correction',
                new_status: correctStatus,
                issue_description: issue.description
              }
            });
          }
        }
      }

      return fixedCount;
    },
    onSuccess: (fixedCount) => {
      toast.success(`Repaired ${fixedCount} issues`);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tuition'] });
      setIssues([]);
    },
    onError: (error) => {
      console.error('Repair error:', error);
      toast.error("Failed to repair issues");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          Payment Integrity Repair
        </CardTitle>
        <CardDescription>
          Scan for and repair orphaned ledger entries and incorrect invoice statuses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={scanForIssues}
            disabled={scanning}
            variant="outline"
          >
            {scanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Scan for Issues
          </Button>

          {issues.length > 0 && (
            <Button
              onClick={() => repairMutation.mutate()}
              disabled={repairMutation.isPending}
              variant="default"
            >
              {repairMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Repair All ({issues.length})
            </Button>
          )}
        </div>

        {issues.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Issues Found:</h4>
            {issues.map((issue, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertDescription>
                  <div className="font-medium">{issue.description}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Fix: {issue.suggestedFix}
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {!scanning && issues.length === 0 && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              Click "Scan for Issues" to check payment integrity
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
