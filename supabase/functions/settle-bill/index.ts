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

  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return respond({ error: 'No authorization header' }, 401);

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) return respond({ error: 'Unauthorized' }, 401);

    // A user can hold several roles (admin + teacher is common). The old
    // `.single()` errored on the second row and rejected real admins.
    const { data: roleRows } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    if (!(roleRows || []).some((r) => r.role === 'admin')) {
      return respond({ error: 'Admin access required' }, 403);
    }

    const SettleBillSchema = z.object({
      studentId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      settlementType: z.enum(['discount', 'voluntary_contribution', 'unapplied_cash']),
      amount: z.number().int().positive(),
      reason: z.string().max(500),
      consentGiven: z.boolean().optional(),
      approverName: z.string().optional(),
    });

    const parsedBody = SettleBillSchema.safeParse(await req.json());
    if (!parsedBody.success) {
      return respond(
        { error: `Invalid request: ${parsedBody.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` },
        400,
      );
    }
    const { studentId, month, settlementType, amount, reason, consentGiven, approverName } =
      parsedBody.data;

    console.log('Settling bill:', { studentId, month, settlementType, amount });

    if (settlementType === 'voluntary_contribution' && !consentGiven) {
      return respond({ error: 'Consent required for voluntary contribution' }, 400);
    }

    // ── Balance ──────────────────────────────────────────────────────────
    // The admin UI shows the CARRY-OVER balance, which exists even when the
    // selected month has no invoice row yet (debt from earlier months). The
    // old code demanded an invoice for the exact month and 400'd otherwise.
    // Resolution order: exact-month invoice → latest invoice at-or-before the
    // month (carry_out) → AR ledger balance (the double-entry ground truth).
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, total_amount, paid_amount, carry_in_debt, carry_in_credit')
      .eq('student_id', studentId)
      .eq('month', month)
      .maybeSingle();

    let balance: number;
    if (invoice) {
      balance =
        (invoice.total_amount - invoice.paid_amount) +
        (invoice.carry_in_debt ?? 0) - (invoice.carry_in_credit ?? 0);
    } else {
      const { data: prevInvoice } = await supabase
        .from('invoices')
        .select('month, carry_out_debt, carry_out_credit')
        .eq('student_id', studentId)
        .lte('month', month)
        .order('month', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (prevInvoice) {
        balance = (prevInvoice.carry_out_debt ?? 0) - (prevInvoice.carry_out_credit ?? 0);
      } else {
        // No invoices at all — fall back to the AR account balance.
        const { data: arAccount } = await supabase
          .from('ledger_accounts')
          .select('id')
          .eq('student_id', studentId)
          .eq('code', 'AR')
          .maybeSingle();
        if (!arAccount) {
          return respond(
            { error: 'No invoice or ledger history found for this student — nothing to settle' },
            404,
          );
        }
        const { data: arEntries } = await supabase
          .from('ledger_entries')
          .select('debit, credit')
          .eq('account_id', arAccount.id);
        balance = (arEntries || []).reduce((sum, e) => sum + (e.debit ?? 0) - (e.credit ?? 0), 0);
      }
    }

    // ── Ledger accounts ──────────────────────────────────────────────────
    // Ensure the accounts exist before mapping (same pattern as
    // family-payment). The old code mapped blindly; a student without a
    // DISCOUNT account produced inserts with account_id null.
    for (const code of ['AR', 'DISCOUNT', 'REVENUE', 'CREDIT']) {
      await supabase
        .from('ledger_accounts')
        .upsert({ student_id: studentId, code }, { onConflict: 'student_id,code', ignoreDuplicates: true });
    }
    const { data: accounts } = await supabase
      .from('ledger_accounts')
      .select('id, code')
      .eq('student_id', studentId);
    const accountMap = new Map(accounts?.map((a) => [a.code, a.id]));
    for (const code of ['AR', 'DISCOUNT', 'REVENUE', 'CREDIT']) {
      if (!accountMap.get(code)) {
        return respond({ error: `Ledger account ${code} could not be created for this student` }, 500);
      }
    }

    const txId = crypto.randomUUID();
    const now = new Date().toISOString();
    let settledAmount = 0;

    const insertEntries = async (entries: unknown[]) => {
      const { error } = await supabase.from('ledger_entries').insert(entries);
      if (error) throw new Error(`Ledger posting failed: ${error.message}`);
    };

    if (settlementType === 'discount') {
      // Debit balance write-off: DR Tuition Discounts expense / CR AR.
      if (balance <= 0) {
        return respond({ error: `No outstanding debt to discount (balance: ${balance})` }, 400);
      }
      settledAmount = Math.min(amount, balance);
      await insertEntries([
        {
          tx_id: txId,
          tx_key: `settlement-discount-${studentId}-${month}-${Date.now()}`,
          account_id: accountMap.get('DISCOUNT'),
          debit: settledAmount,
          credit: 0,
          occurred_at: now,
          memo: `Settlement discount: ${reason}`,
          month,
          created_by: user.id,
        },
        {
          tx_id: txId,
          account_id: accountMap.get('AR'),
          debit: 0,
          credit: settledAmount,
          occurred_at: now,
          memo: `Settlement discount: ${reason}`,
          month,
          created_by: user.id,
        },
      ]);

      if (invoice) {
        const { error: invErr } = await supabase
          .from('invoices')
          .update({
            paid_amount: invoice.paid_amount + settledAmount,
            status:
              invoice.total_amount <= invoice.paid_amount + settledAmount ? 'paid' : 'partial',
          })
          .eq('id', invoice.id);
        if (invErr) console.warn('invoice update failed (ledger already posted):', invErr.message);
      }
    } else if (settlementType === 'voluntary_contribution') {
      // Credit balance conversion: DR AR / CR Contributions revenue.
      if (balance >= 0) {
        return respond({ error: `No credit balance to convert (balance: ${balance})` }, 400);
      }
      settledAmount = Math.min(amount, Math.abs(balance));
      await insertEntries([
        {
          tx_id: txId,
          tx_key: `settlement-contribution-${studentId}-${month}-${Date.now()}`,
          account_id: accountMap.get('AR'),
          debit: settledAmount,
          credit: 0,
          occurred_at: now,
          memo: `Voluntary contribution (consent: ${approverName || 'yes'}): ${reason}`,
          month,
          created_by: user.id,
        },
        {
          tx_id: txId,
          account_id: accountMap.get('REVENUE'),
          debit: 0,
          credit: settledAmount,
          occurred_at: now,
          memo: `Voluntary contribution: ${reason}`,
          month,
          created_by: user.id,
        },
      ]);
    } else {
      // unapplied_cash — keep the overpayment as a customer-credit liability.
      if (balance >= 0) {
        return respond({ error: `No credit balance to record as unapplied (balance: ${balance})` }, 400);
      }
      settledAmount = Math.min(amount, Math.abs(balance));
      await insertEntries([
        {
          tx_id: txId,
          tx_key: `settlement-unapplied-${studentId}-${month}-${Date.now()}`,
          account_id: accountMap.get('AR'),
          debit: settledAmount,
          credit: 0,
          occurred_at: now,
          memo: `Unapplied cash liability: ${reason}`,
          month,
          created_by: user.id,
        },
        {
          tx_id: txId,
          account_id: accountMap.get('CREDIT'),
          debit: 0,
          credit: settledAmount,
          occurred_at: now,
          memo: `Customer credit for future use: ${reason}`,
          month,
          created_by: user.id,
        },
      ]);
    }

    const afterBalance = settlementType === 'discount' ? balance - settledAmount : balance + settledAmount;

    const { error: settlementErr } = await supabase.from('settlements').insert({
      student_id: studentId,
      month,
      settlement_type: settlementType,
      amount: settledAmount,
      reason,
      consent_given: consentGiven || false,
      approver_id: user.id,
      created_by: user.id,
      tx_id: txId,
      before_balance: balance,
      after_balance: afterBalance,
    });
    if (settlementErr) console.warn('settlements insert failed (ledger already posted):', settlementErr.message);

    // Trigger tuition recalc so invoices/carry-over reflect the settlement.
    try {
      await supabase.functions.invoke('calculate-tuition', { body: { studentId, month } });
    } catch (e) {
      console.error('Failed to recalc tuition:', e);
    }

    return respond({
      success: true,
      txId,
      settlementType,
      amount: settledAmount,
      beforeBalance: balance,
      afterBalance,
    });
  } catch (error: any) {
    console.error('Error settling bill:', error);
    return respond({ error: error.message }, 500);
  }
});
