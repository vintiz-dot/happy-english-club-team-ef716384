import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';

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

    // Worked out in full, then written in ONE database transaction
    // (record_family_payment, 20261121130000): the payments row, each
    // sibling's allocation, ledger pair and bill, and these audit rows - all
    // of it or none of it. It used to be a string of separate writes, so a
    // failure part-way left a payment row with no bill, or one sibling paid
    // and not the other (tuition audit phase 1b).
    const allocations: AllocationResult[] = [];
    const parentPaymentId = crypto.randomUUID();
    const audit: any[] = [{
      action: 'family_payment_initiated', entity: 'family_payment', entity_id: familyId,
      diff: { family_id: familyId, family_name: family.name, total_payment: amount, method, month },
    }];
    const toRecord: any[] = [];
    let remaining = amount;
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
        const sibData = sibling as any;
        toRecord.push({
          student_id: sibling.id,
          amount: posted,
          order: sibling.order,
          leg_memo: `Smart family payment (${sibling.order}/${siblingBalances.length})`
            + (extra > 0 ? `, including ${extra} beyond what the family owes, kept on the bill as credit` : ''),
          ar_memo: 'Smart family payment allocation',
          // Used only when the sibling has no bill for the month yet (the
          // calculator could not save one): the figures it worked out.
          new_bill: { base_amount: sibData.baseAmount ?? 0, discount_amount: sibData.totalDiscount ?? 0, total_amount: sibData.totalAmount ?? 0 },
        });
        audit.push({
          action: 'family_payment_allocation', entity: 'family_payment', entity_id: parentPaymentId,
          diff: {
            family_id: familyId, family_name: family.name, total_payment: amount, allocation_order: sibling.order,
            student: { id: sibling.id, name: sibling.name, before_debt: beforeDebt, applied, after_debt: afterDebt,
              // Beyond what the family owes, on this bill as credit.
              credit_on_bill: extra },
            excess_transferred: excessTransferred,
            remaining_to_allocate: remaining - applied,
          },
        });
        if (excessTransferred > 0 && sibling.order < siblingBalances.length) {
          const nextSibling = siblingBalances[sibling.order];
          audit.push({
            action: 'credit_transfer', entity: 'family_payment', entity_id: parentPaymentId,
            diff: { family_id: familyId, family_name: family.name,
              from_student: { id: sibling.id, name: sibling.name },
              to_student: { id: nextSibling?.id, name: nextSibling?.name },
              transfer_amount: excessTransferred },
          });
        }
        allocations.push({
          studentId: sibling.id, studentName: sibling.name, beforeDebt, applied, afterDebt,
          excessTransferred, creditOnBill: extra, allocationOrder: sibling.order,
        });
      }
      remaining -= applied;
    }
    const leftoverResult = leftover > 0
      ? { type: 'credit_next_bill', amount: leftover, studentId: plan[0].sibling.id, studentName: plan[0].sibling.name, month }
      : null;
    audit.push({
      action: 'family_payment_completed', entity: 'family_payment', entity_id: parentPaymentId,
      diff: { family_id: familyId, family_name: family.name, total_payment: amount, total_allocated: amount - remaining,
        siblings_count: allocations.length,
        allocations: allocations.map((a) => ({ student_name: a.studentName, applied: a.applied })),
        leftover: leftoverResult },
    });

    const { error: recordError } = await supabase.rpc('record_family_payment', {
      p_payment_id: parentPaymentId,
      p_actor: user.id,
      p_family_id: familyId,
      p_primary_student_id: siblingBalances[0]?.id || siblings[0].id,
      p_amount: amount,
      p_method: method,
      p_occurred_at: occurredAt,
      p_memo: memo || `Smart family payment - ${siblingBalances.length} siblings`,
      p_month: month,
      p_key_prefix: 'smart-family',
      p_allocations: toRecord,
      p_audit: audit,
    });
    if (recordError) {
      throw new Error(`${recordError.message || 'The payment could not be recorded'}${/Nothing (more )?was recorded/.test(recordError.message ?? '') ? '' : ' Nothing was recorded.'}`);
    }

    // Recalculate each sibling's month, as every payment path does.
    for (const r of toRecord) {
      try {
        await supabase.functions.invoke('calculate-tuition', { body: { studentId: r.student_id, month } });
      } catch (e) {
        console.error('Failed to recalc tuition:', e);
      }
    }

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
