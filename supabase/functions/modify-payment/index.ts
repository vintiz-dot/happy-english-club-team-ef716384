import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) throw new Error('Unauthorized');

    // Check admin role. Every role row, not .single(): an admin who also
    // holds teacher or student has two rows and .single() errored, so a real
    // admin could not record a payment (audit F-11).
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!(roleRows || []).some((r: { role: string }) => r.role === 'admin')) {
      throw new Error('Unauthorized: Admin access required');
    }

    const ModifyPaymentSchema = z.object({
      paymentId: z.string().uuid(),
      studentId: z.string().uuid(),
      amount: z.number().int().positive().max(100000000),
      method: z.string(),
      occurredAt: z.string().datetime(),
      memo: z.string().max(500).optional(),
      reason: z.string().max(500, 'Modification reason too long'),
    });

    const body = await req.json();
    const {
      paymentId,
      studentId,
      amount,
      method,
      occurredAt,
      memo,
      reason
    } = ModifyPaymentSchema.parse(body);

    console.log('Modifying payment:', { paymentId, amount, method });

    // Get original payment for audit
    const { data: originalPayment, error: fetchError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchError || !originalPayment) {
      throw new Error('Original payment not found');
    }

    const originalMonth = originalPayment.occurred_at.slice(0, 7);
    const newMonth = occurredAt.slice(0, 7);

    // Create reversal entry with original date
    const reversalTxId = crypto.randomUUID();
    const reversalPaymentId = crypto.randomUUID();

    // Record reversal payment
    await supabase.from('payments').insert({
      id: reversalPaymentId,
      student_id: originalPayment.student_id,
      amount: -originalPayment.amount,
      method: originalPayment.method,
      occurred_at: originalPayment.occurred_at,
      memo: `Reversal of payment ${paymentId}`,
      created_by: user.id,
      parent_payment_id: paymentId
    });

    // Get student accounts
    const { data: accounts } = await supabase
      .from('ledger_accounts')
      .select('id, code')
      .eq('student_id', originalPayment.student_id);

    const accountMap = new Map(accounts?.map(a => [a.code, a.id]));

    // Post reversal ledger entries: reverse original
    await supabase.from('ledger_entries').insert([
      {
        tx_id: reversalTxId,
        tx_key: `reversal-${paymentId}-${Date.now()}`,
        account_id: accountMap.get('AR'),
        debit: originalPayment.amount,
        credit: 0,
        occurred_at: originalPayment.occurred_at,
        memo: `Reversal: ${reason}`,
        month: originalMonth,
        created_by: user.id
      },
      {
        tx_id: reversalTxId,
        account_id: originalPayment.method === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
        debit: 0,
        credit: originalPayment.amount,
        occurred_at: originalPayment.occurred_at,
        memo: `Reversal: ${reason}`,
        month: originalMonth,
        created_by: user.id
      }
    ]);

    // Create new corrected payment
    const newTxId = crypto.randomUUID();
    const newPaymentId = crypto.randomUUID();

    await supabase.from('payments').insert({
      id: newPaymentId,
      student_id: studentId,
      amount,
      method,
      occurred_at: occurredAt,
      memo: memo || `Modified payment - ${reason}`,
      created_by: user.id,
      parent_payment_id: paymentId
    });

    // Ensure new student has accounts if different student
    if (studentId !== originalPayment.student_id) {
      const accountCodes = ['AR', 'CASH', 'BANK'];
      for (const code of accountCodes) {
        await supabase
          .from('ledger_accounts')
          .upsert(
            { student_id: studentId, code },
            { onConflict: 'student_id,code', ignoreDuplicates: true }
          );
      }

      const { data: newAccounts } = await supabase
        .from('ledger_accounts')
        .select('id, code')
        .eq('student_id', studentId);

      const newAccountMap = new Map(newAccounts?.map(a => [a.code, a.id]));

      // Post new payment ledger entries
      await supabase.from('ledger_entries').insert([
        {
          tx_id: newTxId,
          tx_key: `modified-${paymentId}-${Date.now()}`,
          account_id: method === 'cash' ? newAccountMap.get('CASH') : newAccountMap.get('BANK'),
          debit: amount,
          credit: 0,
          occurred_at: occurredAt,
          memo: memo || `Modified payment`,
          month: newMonth,
          created_by: user.id
        },
        {
          tx_id: newTxId,
          account_id: newAccountMap.get('AR'),
          debit: 0,
          credit: amount,
          occurred_at: occurredAt,
          memo: memo || `Modified payment`,
          month: newMonth,
          created_by: user.id
        }
      ]);
    } else {
      // Same student, use existing accounts
      await supabase.from('ledger_entries').insert([
        {
          tx_id: newTxId,
          tx_key: `modified-${paymentId}-${Date.now()}`,
          account_id: method === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
          debit: amount,
          credit: 0,
          occurred_at: occurredAt,
          memo: memo || `Modified payment`,
          month: newMonth,
          created_by: user.id
        },
        {
          tx_id: newTxId,
          account_id: accountMap.get('AR'),
          debit: 0,
          credit: amount,
          occurred_at: occurredAt,
          memo: memo || `Modified payment`,
          month: newMonth,
          created_by: user.id
        }
      ]);
    }

    // Record modification audit trail
    await supabase.from('payment_modifications').insert({
      original_payment_id: paymentId,
      reversal_payment_id: reversalPaymentId,
      new_payment_id: newPaymentId,
      modification_reason: reason,
      before_data: originalPayment,
      after_data: {
        student_id: studentId,
        amount,
        method,
        occurred_at: occurredAt,
        memo
      },
      created_by: user.id
    });

    // Trigger tuition recalc for affected months and students
    const affectedStudents = new Set([originalPayment.student_id, studentId]);
    const affectedMonths = new Set([originalMonth, newMonth]);

    for (const sid of affectedStudents) {
      for (const month of affectedMonths) {
        try {
          await supabase.functions.invoke('calculate-tuition', {
            body: { studentId: sid, month }
          });
        } catch (e) {
          console.error('Failed to recalc tuition:', e);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        reversalPaymentId,
        newPaymentId,
        affectedMonths: Array.from(affectedMonths),
        affectedStudents: Array.from(affectedStudents)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error modifying payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
