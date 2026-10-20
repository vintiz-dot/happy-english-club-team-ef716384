import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletePaymentRequest {
  paymentId: string;
  deleteReason: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const userSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Check admin permission
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRoles) {
      throw new Error('Admin permission required');
    }

    const { paymentId, deleteReason }: DeletePaymentRequest = await req.json();

    if (!paymentId || !deleteReason?.trim()) {
      throw new Error('Payment ID and deletion reason are required');
    }

    console.log(`[delete-payment] Starting deletion for payment ${paymentId}`);

    // 1. Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, payment_allocations(student_id, allocated_amount)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    const isFamilyPayment = payment.parent_payment_id === null && payment.family_id !== null;
    const affectedStudents = new Set<string>();
    const affectedMonths = new Set<string>();
    const reversalTxIds: string[] = [];

    // 2. Handle family payment allocations
    if (isFamilyPayment && payment.payment_allocations?.length > 0) {
      for (const allocation of payment.payment_allocations) {
        affectedStudents.add(allocation.student_id);
      }
    } else {
      affectedStudents.add(payment.student_id);
    }

    console.log(`[delete-payment] Affected students: ${Array.from(affectedStudents).join(', ')}`);

    // 3. For each affected student, revert invoice payments
    for (const studentId of affectedStudents) {
      // Find ledger entries for this payment and student
      const { data: ledgerEntries } = await supabase
        .from('ledger_entries')
        .select('*, ledger_accounts!inner(student_id, code)')
        .eq('ledger_accounts.student_id', studentId)
        .like('tx_key', `payment-${paymentId}%`);

      if (!ledgerEntries || ledgerEntries.length === 0) {
        console.log(`[delete-payment] No ledger entries found for student ${studentId}`);
        continue;
      }

      // Group by month
      const monthsForStudent = new Set(ledgerEntries.map(e => e.month));
      monthsForStudent.forEach(m => affectedMonths.add(m));

      // Find invoices that were paid by this payment (via ledger entries)
      for (const month of monthsForStudent) {
        const { data: invoices } = await supabase
          .from('invoices')
          .select('*')
          .eq('student_id', studentId)
          .eq('month', month);

        if (invoices && invoices.length > 0) {
          for (const invoice of invoices) {
            // Calculate how much of this payment went to this invoice
            const invoiceLedgerEntries = ledgerEntries.filter(
              e => e.month === month && e.ledger_accounts.code === 'AR'
            );
            const totalCredited = invoiceLedgerEntries.reduce((sum, e) => sum + e.credit, 0);

            if (totalCredited > 0) {
              const newPaidAmount = Math.max(0, invoice.paid_amount - totalCredited);
              let newStatus = invoice.status;

              // Update status based on new paid amount
              if (newPaidAmount === 0) {
                newStatus = 'draft';
              } else if (newPaidAmount >= invoice.total_amount) {
                newStatus = 'paid';
              } else {
                newStatus = 'partial';
              }

              console.log(`[delete-payment] Reverting invoice ${invoice.id}: ${invoice.paid_amount} -> ${newPaidAmount}, status: ${invoice.status} -> ${newStatus}`);

              await supabase
                .from('invoices')
                .update({
                  paid_amount: newPaidAmount,
                  status: newStatus,
                  updated_at: new Date().toISOString(),
                  updated_by: user.id
                })
                .eq('id', invoice.id);
            }
          }
        }
      }

      // 4. Create reversal ledger entries for each original entry
      const reversalTxId = crypto.randomUUID();
      reversalTxIds.push(reversalTxId);

      const reversalEntries = ledgerEntries.map(entry => ({
        tx_id: reversalTxId,
        tx_key: `payment-reversal-${paymentId}-${entry.id}`,
        account_id: entry.account_id,
        debit: entry.credit, // Reverse: debit becomes credit
        credit: entry.debit, // Reverse: credit becomes debit
        occurred_at: new Date().toISOString(),
        memo: `Reversal of deleted payment: ${deleteReason}`,
        month: entry.month,
        created_by: user.id
      }));

      if (reversalEntries.length > 0) {
        const { error: reversalError } = await supabase
          .from('ledger_entries')
          .insert(reversalEntries);

        if (reversalError) {
          console.error(`[delete-payment] Failed to create reversal entries: ${reversalError.message}`);
          throw new Error(`Failed to create reversal entries: ${reversalError.message}`);
        }

        console.log(`[delete-payment] Created ${reversalEntries.length} reversal entries for student ${studentId}`);
      }
    }

    // 5. Store deletion history
    const deletionSnapshot = {
      payment_data: payment,
      reversal_tx_ids: reversalTxIds,
      affected_students: Array.from(affectedStudents),
      affected_months: Array.from(affectedMonths),
      deleted_by: user.id,
      deleted_at: new Date().toISOString(),
      deletion_reason: deleteReason
    };

    await supabase.from('payment_deletions').insert({
      payment_id: paymentId,
      snapshot: deletionSnapshot,
      deleted_by: user.id,
      deletion_reason: deleteReason
    });

    // 6. Delete the payment record (allocations cascade automatically)
    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      throw new Error(`Failed to delete payment: ${deleteError.message}`);
    }

    // 7. Log to audit_log
    await supabase.from('audit_log').insert({
      actor_user_id: user.id,
      action: 'delete',
      entity: 'payment',
      entity_id: paymentId,
      diff: {
        reason: deleteReason,
        affected_students: Array.from(affectedStudents),
        affected_months: Array.from(affectedMonths),
        reversal_tx_ids: reversalTxIds
      }
    });

    console.log(`[delete-payment] Successfully deleted payment ${paymentId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment deleted successfully',
        affected_students: Array.from(affectedStudents),
        affected_months: Array.from(affectedMonths),
        reversal_tx_count: reversalTxIds.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[delete-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
