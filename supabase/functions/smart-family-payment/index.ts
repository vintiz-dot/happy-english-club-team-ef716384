import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { invoicePaidLabel, paidLabel } from '../_lib/invoice-status.ts';

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

    // Check admin role
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleData?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required');
    }

    const SmartPaymentSchema = z.object({
      familyId: z.string().uuid(),
      amount: z.number().int().positive().max(500000000),
      method: z.string(),
      occurredAt: z.string().datetime(),
      memo: z.string().max(500).optional(),
      month: z.string().regex(/^\d{4}-\d{2}$/),
      leftoverHandling: z.enum(['voluntary_contribution', 'unapplied_cash']).optional(),
      consentGiven: z.boolean().optional(),
    });

    const body = await req.json();
    const {
      familyId,
      amount,
      method,
      occurredAt,
      memo,
      month,
      leftoverHandling,
      consentGiven
    } = SmartPaymentSchema.parse(body);

    console.log('Processing smart family payment:', { familyId, amount, month });

    // Get family info
    const { data: family, error: familyError } = await supabase
      .from('families')
      .select('id, name')
      .eq('id', familyId)
      .single();

    if (familyError || !family) throw new Error('Family not found');

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

    // Step 4: Waterfall allocation
    const allocations: AllocationResult[] = [];
    let remaining = amount;
    const parentPaymentId = crypto.randomUUID();
    const occurredDate = new Date(occurredAt);

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

    for (const sibling of siblingBalances) {
      if (remaining <= 0) break;

      const beforeDebt = sibling.debt;
      const applied = Math.min(beforeDebt, remaining);
      const afterDebt = beforeDebt - applied;
      const excessTransferred = remaining > beforeDebt ? remaining - beforeDebt : 0;

      if (applied > 0) {
        // Create payment allocation record
        await supabase.from('payment_allocations').insert({
          parent_payment_id: parentPaymentId,
          student_id: sibling.id,
          allocated_amount: applied,
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

        // Post ledger entries
        await supabase.from('ledger_entries').insert([
          {
            tx_id: txId,
            tx_key: `smart-family-${parentPaymentId}-${sibling.id}-${Date.now()}`,
            account_id: method.toLowerCase() === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
            debit: applied,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Smart family payment (${sibling.order}/${siblingBalances.length})`,
            month,
            created_by: user.id
          },
          {
            tx_id: txId,
            account_id: accountMap.get('AR'),
            debit: 0,
            credit: applied,
            occurred_at: occurredAt,
            memo: `Smart family payment allocation`,
            month,
            created_by: user.id
          }
        ]);

        // Update or create invoice
        const { data: invoice } = await supabase
          .from('invoices')
          .select('id, paid_amount, total_amount, recorded_payment, carry_in_debt, carry_in_credit')
          .eq('student_id', sibling.id)
          .eq('month', month)
          .single();

        if (invoice) {
          const newPaid = (invoice.paid_amount || 0) + applied;
          const newRecorded = (invoice.recorded_payment || 0) + applied;
          await supabase
            .from('invoices')
            .update({
              paid_amount: newPaid,
              // The month's own money against what the month asks for.
              // paid_amount is cumulative: compared with one month's total
              // it called nearly every part payment "paid".
              status: invoicePaidLabel(invoice, newRecorded),
              recorded_payment: newRecorded
            })
            .eq('id', invoice.id);
        } else {
          // Create invoice so payment is tracked
          const sibData = sibling as any;
          await supabase.from('invoices').insert({
            student_id: sibling.id,
            month,
            base_amount: sibData.baseAmount ?? 0,
            discount_amount: sibData.totalDiscount ?? 0,
            total_amount: sibData.totalAmount ?? 0,
            paid_amount: applied,
            recorded_payment: applied,
            // No bill row yet, so nothing is recorded for the month and the
            // calculator's closing balance IS the month's payable.
            status: paidLabel(applied, sibling.debt - sibling.credit),
          });
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
              after_debt: afterDebt
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

    // Handle leftover amount
    let leftoverResult = null;
    if (remaining > 0) {
      const primaryStudentId = siblingBalances[0]?.id || siblings[0].id;
      
      const { data: accounts } = await supabase
        .from('ledger_accounts')
        .select('id, code')
        .eq('student_id', primaryStudentId);

      const accountMap = new Map(accounts?.map(a => [a.code, a.id]));
      const leftoverTxId = crypto.randomUUID();

      if (leftoverHandling === 'voluntary_contribution' && consentGiven) {
        await supabase.from('ledger_entries').insert([
          {
            tx_id: leftoverTxId,
            tx_key: `smart-family-contribution-${parentPaymentId}-${Date.now()}`,
            account_id: method.toLowerCase() === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
            debit: 0,
            credit: remaining,
            occurred_at: occurredAt,
            memo: `Voluntary contribution from smart family payment`,
            month,
            created_by: user.id
          },
          {
            tx_id: leftoverTxId,
            account_id: accountMap.get('REVENUE'),
            debit: remaining,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Voluntary contribution - direct to revenue`,
            month,
            created_by: user.id
          }
        ]);
        leftoverResult = { type: 'voluntary_contribution', amount: remaining };
      } else {
        // Default to unapplied cash (credit)
        await supabase.from('ledger_entries').insert([
          {
            tx_id: leftoverTxId,
            tx_key: `smart-family-credit-${parentPaymentId}-${Date.now()}`,
            account_id: accountMap.get('AR'),
            debit: remaining,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Unapplied cash from smart family payment`,
            month,
            created_by: user.id
          },
          {
            tx_id: leftoverTxId,
            account_id: accountMap.get('CREDIT'),
            debit: 0,
            credit: remaining,
            occurred_at: occurredAt,
            memo: `Customer credit for future use`,
            month,
            created_by: user.id
          }
        ]);
        leftoverResult = { type: 'unapplied_cash', amount: remaining };
      }
    }

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
