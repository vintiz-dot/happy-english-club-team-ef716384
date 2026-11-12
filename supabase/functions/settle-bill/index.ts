import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { WRITE_OFF_KEY_PREFIX } from '../_lib/invoice-status.ts';

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
    // The balance is the month's own bill: its closing balance, kept by the
    // carry trigger from what each month charged and what was recorded in it.
    // That is the figure the Settle Bill dialog shows (carry-out debt, or
    // carry-out credit as a negative). It used to be worked out from
    // cumulative paid_amount, which for any family with paid earlier months
    // already exceeds one month's charge: real debts were refused ("balance:
    // 0") and credits that did not exist were offered for conversion.
    //
    // The bill is brought up to date first (as confirm-tuition does), so the
    // balance is the one the screen showed, and a month without a bill row
    // gets one.
    const refresh = await supabase.functions.invoke('calculate-tuition', { body: { studentId, month } });
    if (refresh.error) {
      return respond({ error: `The bill could not be brought up to date: ${refresh.error.message}` }, 502);
    }
    if (refresh.data?.invoiceSaved === false) {
      return respond({ error: 'This family\'s sibling discount for the month is still being worked out; try again in a moment' }, 409);
    }
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('id, total_amount, carry_out_debt, carry_out_credit, tuition_frozen')
      .eq('student_id', studentId)
      .eq('month', month)
      .maybeSingle();
    if (invoiceError) return respond({ error: 'Unable to read the bill for this month' }, 500);
    if (!invoice) return respond({ error: 'There is no bill for this month - nothing to settle' }, 404);

    const balance = Number(invoice.carry_out_debt ?? 0) - Number(invoice.carry_out_credit ?? 0);

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
      // The write-off lowers what THIS month charges (both calculators add it
      // as a discount line, see _lib/invoice-status.ts), so it can count only
      // where that charge can move, and never past it.
      if (invoice.tuition_frozen) {
        return respond({
          error: 'This bill is frozen: its charged figures cannot change, so a write-off would never show on it. Unfreeze it first, or write off on another month.',
        }, 409);
      }
      // The bill was just recalculated, so its total is the charge left after
      // any earlier write-off of the same month.
      const room = Math.max(0, Number(invoice.total_amount ?? 0));
      if (room <= 0) {
        return respond({
          error: `Nothing of ${month}'s own charge is left to write off. Debt carried in from an earlier month is written off on that month.`,
        }, 400);
      }
      settledAmount = Math.min(amount, balance, room);
      await insertEntries([
        {
          tx_id: txId,
          // This key is what makes the write-off count on the bill: both
          // calculators add only settlements whose ledger transaction starts
          // WRITE_OFF_KEY_PREFIX (_lib/invoice-status.ts). The old function
          // wrote 'settlement-discount-...', which stays ledger-only.
          tx_key: `${WRITE_OFF_KEY_PREFIX}${studentId}-${month}-${Date.now()}`,
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
      // No invoice write here. The settlements row below IS the write-off on
      // the bill: the recalculation after it lowers total_amount, the carry
      // trigger moves the balance, and the label follows the one rule. (It
      // used to add the write-off to cumulative paid_amount, which the next
      // recalculation overwrote, so the debt never left the bill.)
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
    if (settlementErr) {
      // For a write-off the settlements row is what puts it on the bill; say
      // so rather than report a settlement the bill will never show.
      console.error('settlements insert failed (ledger already posted):', settlementErr.message);
      return respond({
        error: `The ledger entries were posted (transaction ${txId}) but the settlement record was not saved, so the bill does not show it: ${settlementErr.message}`,
      }, 500);
    }

    // Recalculate so the bill, its carry and its label reflect the settlement.
    let billRefreshed = true;
    try {
      const { error } = await supabase.functions.invoke('calculate-tuition', { body: { studentId, month } });
      if (error) billRefreshed = false;
    } catch (e) {
      billRefreshed = false;
      console.error('Failed to recalc tuition:', e);
    }

    return respond({
      success: true,
      txId,
      settlementType,
      amount: settledAmount,
      beforeBalance: balance,
      afterBalance,
      billRefreshed,
    });
  } catch (error: any) {
    console.error('Error settling bill:', error);
    return respond({ error: error.message }, 500);
  }
});
