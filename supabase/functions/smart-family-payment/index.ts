import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { labelAfterPayment, monthCharged, paidLabel } from '../_lib/invoice-status.ts';
import { addToRecordedPayment, BILL_COLUMNS } from '../_lib/recorded-payment-write.ts';

const VOLUNTARY_REMOVED =
  'Voluntary contributions have been removed. Money paid beyond what the bills owe now goes on a bill as credit. '
  + 'Nothing was recorded: reload the page and post the payment again.';
// A screen opened before the owner's decision (OVERPAYMENT) told the admin
// the extra would be kept as unapplied cash, off every bill. It now goes on
// a bill as credit, so what that screen said is no longer what happens.
const UNAPPLIED_REPLACED =
  'Money paid beyond what the bills owe now shows as credit on the next bill; it is no longer kept as unapplied cash. '
  + 'Nothing was recorded: reload the page, check where the extra goes, and post the payment again.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SiblingBalance {
  id: string;
  name: string;
  debt: number;
  credit: number;
  order: number;
}

interface AllocationResult {
  studentId: string;
  studentName: string;
  beforeDebt: number;
  applied: number;
  afterDebt: number;
  excessTransferred: number;
  creditOnBill: number; // beyond what the family owes, on this bill as credit
  allocationOrder: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit(clientIP, 10, 60000, 'ip');
    
    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit.resetAt, corsHeaders);
    }

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

    // Rate limit by user
    const userLimit = checkRateLimit(user.id, 10, 60000, 'user');
    if (userLimit.limited) {
      return rateLimitResponse(userLimit.resetAt, corsHeaders);
    }

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

    const SmartPaymentSchema = z.object({
      familyId: z.string().uuid(),
      amount: z.number().int().positive().max(500000000),
      method: z.string(),
      occurredAt: z.string().datetime(),
      memo: z.string().max(500).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      // Money beyond what the family owes has one outcome: it goes on the
      // bill of the sibling listed first (highest debt) for the month, where
      // the carry makes it credit on their next bill (OVERPAYMENT, below).
      // Voluntary contributions were removed (D-23); 'unapplied_cash' is
      // what a screen opened before this change sends, and is refused when
      // there is money left over.
      leftoverHandling: z.enum(['credit_next_bill', 'unapplied_cash']).optional(),
    });

    const body = await req.json();
    // A tab opened before the removal may still send the old option. Refuse
    // it, before anything is written (the audit row included), rather than
    // quietly treat the family's money as something else.
    if (body?.leftoverHandling === 'voluntary_contribution') {
      return new Response(
        JSON.stringify({ error: VOLUNTARY_REMOVED }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const {
      familyId,
      amount,
      method,
      occurredAt,
      memo,
      month,
      leftoverHandling
    } = SmartPaymentSchema.parse(body);

    console.log('Processing smart family payment:', { familyId, amount, month });

    // Get family info
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, name')
      .eq('id', familyId)
      .single();

    if (familyError || !family) throw new Error('Family not found');

    // Step 1: Get all active siblings in family
    const { data: siblings, error: siblingsError } = await supabase
      .from('students')
      .select('id, full_name, family_id')
      .eq('family_id', familyId)
      .eq('is_active', true)
      .order('full_name');

    if (siblingsError) throw siblingsError;
    if (!siblings || siblings.length === 0) {
      throw new Error('No active students found in family');
    }

    console.log(`Found ${siblings.length} siblings in family`);

    // Step 2: Fetch live balances for each sibling
    const siblingBalances: SiblingBalance[] = [];
    
    // Parallel fetch for all siblings
    const balancePromises = siblings.map(async (sibling) => {
      try {
        const { data: tuitionData, error: tuitionError } = await supabase.functions.invoke('calculate-tuition', {
          body: { studentId: sibling.id, month }
        });

        if (tuitionError) {
          console.error(`Error calculating tuition for ${sibling.id}:`, tuitionError);
          return null;
        }

        const debt = tuitionData?.carry?.carryOutDebt ?? 0;
        const credit = tuitionData?.carry?.carryOutCredit ?? 0;

        return {
          id: sibling.id,
          name: sibling.full_name,
          debt,
          credit,
          order: 0,
          baseAmount: tuitionData?.baseAmount ?? 0,
          totalDiscount: tuitionData?.totalDiscount ?? 0,
          totalAmount: tuitionData?.totalAmount ?? 0,
          discounts: tuitionData?.discounts ?? [],
        } as SiblingBalance & { baseAmount: number; totalDiscount: number; totalAmount: number; discounts: any[] };
      } catch (e) {
        console.error(`Failed to get balance for ${sibling.id}:`, e);
        return null;
      }
    });

    const balanceResults = await Promise.all(balancePromises);
    for (const result of balanceResults) {
      if (result) siblingBalances.push(result);
    }

    // Step 3: Sort by debt descending (highest debt first)
    siblingBalances.sort((a, b) => b.debt - a.debt);
    siblingBalances.forEach((s, i) => s.order = i + 1);

    console.log('Sibling balances sorted by debt:', siblingBalances.map(s => ({ name: s.name, debt: s.debt })));

    // Step 4: Waterfall allocation, worked out in full before anything is
    // written. Each sibling, highest debt first, takes what they owe.
    const plan = siblingBalances.map((sibling) => ({ sibling, applied: 0, extra: 0 }));
    let toPlace = amount;
    for (const p of plan) {
      if (toPlace <= 0) break;
      p.applied = Math.min(p.sibling.debt, toPlace);
      toPlace -= p.applied;
    }

    // Money beyond what the family owes (OVERPAYMENT, owner's decision): it
    // goes on the bill of the sibling listed first (highest debt) - the
    // child unapplied cash used to go to - for the month, folded into that
    // sibling's allocation exactly as a Manual split amount above what is
    // owed is: one allocation row, one DR CASH/BANK / CR AR pair, one
    // compare-and-set on the bill. The carry turns it into credit on their
    // next bill. Refused, before anything is written, when the screen did
    // not say where it goes, or when it cannot be placed safely.
    const leftover = toPlace;
    if (leftover > 0) {
      if (leftoverHandling === 'unapplied_cash') {
        return new Response(
          JSON.stringify({ error: UNAPPLIED_REPLACED }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (leftoverHandling !== 'credit_next_bill') {
        throw new Error(`${leftover} is more than the family owes for ${month}, and the screen did not say where it goes. Nothing was recorded: reload the page and post the payment again.`);
      }
      // A sibling whose balance could not be worked out may owe some of it;
      // and with no balance at all there is no bill priced by
      // calculate-tuition to hold it.
      if (plan.length === 0 || plan.length < siblings.length) {
        throw new Error(`The balance of ${siblings.length - plan.length} of the family's ${siblings.length} children for ${month} could not be worked out, so the ${leftover} beyond what the family owes cannot be placed safely. Nothing was recorded: try again.`);
      }
      plan[0].extra = leftover;
    }

    const allocations: AllocationResult[] = [];
    let remaining = amount;
    const parentPaymentId = crypto.randomUUID();

    // Log payment initiation
    await supabase.from('audit_log').insert({
      action: 'family_payment_initiated',
      entity: 'family_payment',
      entity_id: familyId,
      actor_user_id: user.id,
      diff: {
        family_id: familyId,
        family_name: family.name,
        total_payment: amount,
        method,
        month
      }
    });

    // Create parent payment record
    await supabase.from('payments').insert({
      id: parentPaymentId,
      student_id: siblingBalances[0]?.id || siblings[0].id,
      amount,
      method,
      occurred_at: occurredAt,
      memo: memo || `Smart family payment - ${siblingBalances.length} siblings`,
      created_by: user.id,
      family_id: familyId
    });

    for (const { sibling, applied, extra } of plan) {
      if (remaining <= 0) break;

      const beforeDebt = sibling.debt;
      const afterDebt = beforeDebt - applied;
      // Passed on down the waterfall (the last sibling's excess is the leftover).
      const excessTransferred = remaining > beforeDebt ? remaining - beforeDebt : 0;
      // What goes on this sibling's bill: what they owe, plus the leftover
      // when they are listed first.
      const posted = applied + extra;

      if (posted > 0) {
        // Create payment allocation record
        await supabase.from('payment_allocations').insert({
          parent_payment_id: parentPaymentId,
          student_id: sibling.id,
          allocated_amount: posted,
          allocation_order: sibling.order,
          created_by: user.id
        });

        // Ensure ledger accounts exist
        const accountCodes = ['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT'];
        for (const code of accountCodes) {
          await supabase
            .from('ledger_accounts')
            .upsert(
              { student_id: sibling.id, code },
              { onConflict: 'student_id,code', ignoreDuplicates: true }
            );
        }

        // Get account IDs
        const { data: accounts } = await supabase
          .from('ledger_accounts')
          .select('id, code')
          .eq('student_id', sibling.id);

        const accountMap = new Map(accounts?.map(a => [a.code, a.id]));
        const txId = crypto.randomUUID();
        const cashAccount = method.toLowerCase() === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK');
        // The bill is written only after its ledger pair is: never a bill
        // that records money the ledger does not (an insert with no account
        // id, or one that failed, used to go unnoticed).
        if (!cashAccount || !accountMap.get('AR')) {
          throw new Error(`Payment recorded, but ${sibling.name}'s ledger accounts are missing, so ${posted} was not posted to the ledger or their ${month} bill`);
        }

        // Post ledger entries
        const { error: ledgerError } = await supabase.from('ledger_entries').insert([
          {
            tx_id: txId,
            tx_key: `smart-family-${parentPaymentId}-${sibling.id}-${Date.now()}`,
            account_id: cashAccount,
            debit: posted,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Smart family payment (${sibling.order}/${siblingBalances.length})`
              + (extra > 0 ? `, including ${extra} beyond what the family owes, kept on the bill as credit` : ''),
            month,
            created_by: user.id
          },
          {
            tx_id: txId,
            account_id: accountMap.get('AR'),
            debit: 0,
            credit: posted,
            occurred_at: occurredAt,
            memo: `Smart family payment allocation`,
            month,
            created_by: user.id
          }
        ]);
        if (ledgerError) {
          throw new Error(`Payment recorded, but ${posted} for ${sibling.name} could not be posted to the ledger, so their ${month} bill was not changed: ${ledgerError.message}`);
        }

        // Put it on the bill. Every write of recorded_payment is a compare-and-set
        // on the value read (_lib/recorded-payment-write.ts): a second payment
        // landing in between is re-read and kept, never overwritten.
        const { data: invoice, error: invoiceReadError } = await supabase
          .from('invoices')
          .select(BILL_COLUMNS)
          .eq('student_id', sibling.id)
          .eq('month', month)
          .maybeSingle();
        if (invoiceReadError) throw new Error(`Payment posted to the ledger but the bill could not be read: ${invoiceReadError.message}`);

        const onExisting = (bill: any) => addToRecordedPayment(supabase, bill, posted, (fresh, newRecorded) => {
          // The month's own money against what the month asks for (the one
          // rule; an admin's 'credit' label is left alone).
          const label = labelAfterPayment(fresh, newRecorded);
          return { paid_amount: Number(fresh.paid_amount || 0) + posted, ...(label ? { status: label } : {}) };
        });
        if (invoice) {
          await onExisting(invoice);
        } else {
          // Create invoice so payment is tracked
          const sibData = sibling as any;
          const { error: insertError } = await supabase.from('invoices').insert({
            student_id: sibling.id,
            month,
            base_amount: sibData.baseAmount ?? 0,
            discount_amount: sibData.totalDiscount ?? 0,
            total_amount: sibData.totalAmount ?? 0,
            paid_amount: posted,
            recorded_payment: posted,
            // No bill row yet, so nothing is recorded for the month and the
            // calculator's closing balance IS the month's payable.
            status: paidLabel(posted, sibling.debt - sibling.credit,
              monthCharged({ base_amount: sibData.baseAmount, total_amount: sibData.totalAmount })),
          });
          if (insertError) {
            // Another writer created the bill meanwhile: add to it instead.
            if (insertError.code !== '23505') throw new Error(`Payment posted to the ledger but the bill could not be created: ${insertError.message}`);
            const { data: created, error: reReadError } = await supabase
              .from('invoices').select(BILL_COLUMNS).eq('student_id', sibling.id).eq('month', month).maybeSingle();
            if (reReadError || !created) throw new Error('Payment posted to the ledger but the bill could not be read');
            await onExisting(created);
          }
        }

        // Log allocation
        await supabase.from('audit_log').insert({
          action: 'family_payment_allocation',
          entity: 'family_payment',
          entity_id: parentPaymentId,
          actor_user_id: user.id,
          diff: {
            family_id: familyId,
            family_name: family.name,
            total_payment: amount,
            allocation_order: sibling.order,
            student: {
              id: sibling.id,
              name: sibling.name,
              before_debt: beforeDebt,
              applied,
              after_debt: afterDebt,
              // Beyond what the family owes, on this bill as credit.
              credit_on_bill: extra
            },
            excess_transferred: excessTransferred,
            remaining_to_allocate: remaining - applied
          }
        });

        // If there's excess to transfer to next sibling, log it
        if (excessTransferred > 0 && sibling.order < siblingBalances.length) {
          const nextSibling = siblingBalances[sibling.order];
          await supabase.from('audit_log').insert({
            action: 'credit_transfer',
            entity: 'family_payment',
            entity_id: parentPaymentId,
            actor_user_id: user.id,
            diff: {
              family_id: familyId,
              family_name: family.name,
              from_student: {
                id: sibling.id,
                name: sibling.name
              },
              to_student: {
                id: nextSibling?.id,
                name: nextSibling?.name
              },
              transfer_amount: excessTransferred
            }
          });
        }

        allocations.push({
          studentId: sibling.id,
          studentName: sibling.name,
          beforeDebt,
          applied,
          afterDebt,
          excessTransferred,
          creditOnBill: extra,
          allocationOrder: sibling.order
        });

        // Trigger tuition recalc
        try {
          await supabase.functions.invoke('calculate-tuition', {
            body: { studentId: sibling.id, month }
          });
        } catch (e) {
          console.error('Failed to recalc tuition:', e);
        }
      }

      remaining -= applied;
    }

    // The leftover was put on the first sibling's bill with their
    // allocation, above. Nothing is posted as unapplied cash any more.
    const leftoverResult = leftover > 0
      ? { type: 'credit_next_bill', amount: leftover, studentId: plan[0].sibling.id, studentName: plan[0].sibling.name, month }
      : null;

    // Log completion
    await supabase.from('audit_log').insert({
      action: 'family_payment_completed',
      entity: 'family_payment',
      entity_id: parentPaymentId,
      actor_user_id: user.id,
      diff: {
        family_id: familyId,
        family_name: family.name,
        total_payment: amount,
        total_allocated: amount - remaining,
        siblings_count: allocations.length,
        allocations: allocations.map(a => ({
          student_name: a.studentName,
          applied: a.applied
        })),
        leftover: leftoverResult
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        parentPaymentId,
        familyName: family.name,
        totalPayment: amount,
        totalAllocated: amount - remaining,
        allocations,
        leftover: leftoverResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing smart family payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
