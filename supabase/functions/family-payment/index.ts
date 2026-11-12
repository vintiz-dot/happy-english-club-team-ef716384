import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { labelAfterPayment, monthPayable } from '../_lib/invoice-status.ts';
import { addToRecordedPayment } from '../_lib/recorded-payment-write.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Rate limit by IP - stricter for financial operations
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit(clientIP, 20, 60000, 'ip');
    
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

    // Rate limit by user - stricter for financial operations
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

    const FamilyPaymentSchema = z.object({
      month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      familyId: z.string().uuid(),
      selectedStudentIds: z.array(z.string().uuid()).min(1),
      amount: z.number().int().positive().max(100000000),
      method: z.string(),
      occurredAt: z.string().datetime(),
      memo: z.string().max(500).optional(),
      allocationMode: z.enum(['oldest-first', 'pro-rata', 'manual']),
      manualAllocations: z.array(z.object({
        studentId: z.string().uuid(),
        amount: z.number().int().min(0)
      })).optional(),
      leftoverHandling: z.enum(['voluntary_contribution', 'unapplied_cash']).optional(),
      consentGiven: z.boolean().optional(),
    });

    const body = await req.json();
    const {
      month,
      familyId,
      selectedStudentIds,
      amount,
      method,
      occurredAt,
      memo,
      allocationMode,
      manualAllocations,
      leftoverHandling,
      consentGiven
    } = FamilyPaymentSchema.parse(body);

    console.log('Processing family payment:', { familyId, amount, allocationMode });

    // Get open invoices for selected students
    const { data: monthInvoices, error: invoiceError } = await supabase
      .from('invoices')
      .select('*, students(full_name)')
      .in('student_id', selectedStudentIds)
      .eq('month', month)
      .order('month', { ascending: true });

    if (invoiceError) throw invoiceError;

    // What a bill still asks for is judged from its own money, never from
    // the stored label: the month's charge plus debt carried in, less credit
    // carried in, less what is already recorded in the month. (It used to be
    // total - recorded, which took a credit-covered month's charge again and
    // could put nothing towards debt carried in.) A bill with nothing owed is
    // not selected, so no zero allocation is written for it.
    const owedOn = (inv: any) => Math.max(0, monthPayable(inv) - Number(inv.recorded_payment || 0));
    const invoices = (monthInvoices ?? []).filter((inv) => owedOn(inv) > 0);

    // Calculate allocations based on mode
    let allocations: Array<{ studentId: string; amount: number; invoices: any[] }> = [];
    let remainingAmount = amount;

    if (allocationMode === 'manual' && manualAllocations) {
      // Manual split
      for (const allocation of manualAllocations) {
        if (remainingAmount <= 0) break;
        
        // The admin chose this amount, so it goes on the child's bill for the
        // month even where nothing is owed (the excess becomes credit through
        // the carry) - never into the ledger alone.
        const studentInvoices = (monthInvoices ?? []).filter(inv => inv.student_id === allocation.studentId);
        const appliedAmount = Math.min(allocation.amount, remainingAmount);
        if (appliedAmount <= 0) continue;
        
        allocations.push({
          studentId: allocation.studentId,
          amount: appliedAmount,
          invoices: studentInvoices
        });
        
        remainingAmount -= appliedAmount;
      }

    } else if (allocationMode === 'pro-rata') {
      // Pro-rata by balance
      const studentBalances = new Map<string, number>();
      for (const inv of invoices || []) {
        const owed = owedOn(inv);
        studentBalances.set(
          inv.student_id,
          (studentBalances.get(inv.student_id) || 0) + owed
        );
      }

      const totalOwed = Array.from(studentBalances.values()).reduce((sum, val) => sum + val, 0);
      
      if (totalOwed > 0) {
        for (const [studentId, owed] of studentBalances.entries()) {
          if (remainingAmount <= 0) break;
          
          const proRataAmount = Math.round((owed / totalOwed) * amount);
          const appliedAmount = Math.min(proRataAmount, remainingAmount, owed);
          
          const studentInvoices = invoices?.filter(inv => inv.student_id === studentId) || [];
          
          allocations.push({
            studentId,
            amount: appliedAmount,
            invoices: studentInvoices
          });
          
          remainingAmount -= appliedAmount;
        }
      }

    } else {
      // Oldest-first (FIFO) waterfall
      const sortedInvoices = invoices?.sort((a, b) => a.month.localeCompare(b.month)) || [];
      
      for (const inv of sortedInvoices) {
        if (remainingAmount <= 0) break;
        
        const owed = owedOn(inv);
        const appliedAmount = Math.min(owed, remainingAmount);
        
        let existingAlloc = allocations.find(a => a.studentId === inv.student_id);
        if (!existingAlloc) {
          existingAlloc = { studentId: inv.student_id, amount: 0, invoices: [] };
          allocations.push(existingAlloc);
        }
        
        existingAlloc.amount += appliedAmount;
        existingAlloc.invoices.push(inv);
        remainingAmount -= appliedAmount;
      }
    }

    // Refuse before anything is written, rather than post money that lands
    // nowhere: an allocation with no bill to go on, or a remainder with no
    // instruction for it (it used to be dropped silently).
    for (const a of allocations) {
      if (a.amount > 0 && a.invoices.length === 0) {
        throw new Error(`A student has no bill for ${month} to put ${a.amount} on; open their tuition for that month first`);
      }
    }
    if (remainingAmount > 0 && !leftoverHandling) {
      throw new Error(`${remainingAmount} is more than the selected bills owe for ${month}; choose what to do with the rest (voluntary contribution or unapplied cash)`);
    }
    if (remainingAmount > 0 && leftoverHandling === 'voluntary_contribution' && !consentGiven) {
      throw new Error('Consent required for voluntary contribution');
    }

    // Create parent payment
    const parentPaymentId = crypto.randomUUID();
    const parentTxId = crypto.randomUUID();

    await supabase.from('payments').insert({
      id: parentPaymentId,
      student_id: selectedStudentIds[0], // Primary student
      amount,
      method,
      occurred_at: occurredAt,
      memo: memo || `Family payment for ${selectedStudentIds.length} students`,
      created_by: user.id,
      family_id: familyId
    });

    // Create allocation records and apply payments
    for (let i = 0; i < allocations.length; i++) {
      const allocation = allocations[i];
      
      // Create allocation record
      await supabase.from('payment_allocations').insert({
        parent_payment_id: parentPaymentId,
        student_id: allocation.studentId,
        allocated_amount: allocation.amount,
        allocation_order: i + 1,
        created_by: user.id
      });

      // Ensure student has accounts
      const accountCodes = ['AR', 'CASH', 'BANK', 'REVENUE', 'CREDIT'];
      for (const code of accountCodes) {
        await supabase
          .from('ledger_accounts')
          .upsert(
            { student_id: allocation.studentId, code },
            { onConflict: 'student_id,code', ignoreDuplicates: true }
          );
      }

      // Get account IDs
      const { data: accounts } = await supabase
        .from('ledger_accounts')
        .select('id, code')
        .eq('student_id', allocation.studentId);

      const accountMap = new Map(accounts?.map(a => [a.code, a.id]));
      const allocationTxId = crypto.randomUUID();

      // Post ledger entries for this allocation
      await supabase.from('ledger_entries').insert([
        {
          tx_id: allocationTxId,
          tx_key: `family-payment-${parentPaymentId}-${allocation.studentId}-${Date.now()}`,
          account_id: method === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
          debit: allocation.amount,
          credit: 0,
          occurred_at: occurredAt,
          memo: `Family payment allocation (${i + 1}/${allocations.length})`,
          month,
          created_by: user.id
        },
        {
          tx_id: allocationTxId,
          account_id: accountMap.get('AR'),
          debit: 0,
          credit: allocation.amount,
          occurred_at: occurredAt,
          memo: `Family payment allocation`,
          month,
          created_by: user.id
        }
      ]);

      // Apply to invoices (FIFO within student). The bills record exactly
      // what the ledger just posted for this student: each takes what it
      // owes, and the last one takes whatever is left (a manual amount above
      // what is owed becomes credit through the carry).
      let studentRemaining = allocation.amount;
      for (const [k, inv] of allocation.invoices.entries()) {
        if (studentRemaining <= 0) break;
        const last = k === allocation.invoices.length - 1;
        const applied = last ? studentRemaining : Math.min(studentRemaining, owedOn(inv));
        if (applied <= 0) continue;
        // Compare-and-set on the value read (_lib/recorded-payment-write.ts):
        // another payment landing in between is re-read and kept.
        try {
          await addToRecordedPayment(supabase, inv, applied, (fresh, newRecorded) => {
            const label = labelAfterPayment(fresh, newRecorded);
            return label ? { status: label } : {};
          });
        } catch (e) {
          throw new Error(`Payment posted to the ledger but the bill could not be updated: ${(e as Error).message}`);
        }

        studentRemaining -= applied;
      }

      // Trigger tuition recalc
      try {
        await supabase.functions.invoke('calculate-tuition', {
          body: { studentId: allocation.studentId, month }
        });
      } catch (e) {
        console.error('Failed to recalc tuition:', e);
      }
    }

    // Handle leftover
    if (remainingAmount > 0 && leftoverHandling) {
      const primaryStudentId = selectedStudentIds[0];
      
      const { data: accounts } = await supabase
        .from('ledger_accounts')
        .select('id, code')
        .eq('student_id', primaryStudentId);

      const accountMap = new Map(accounts?.map(a => [a.code, a.id]));
      const leftoverTxId = crypto.randomUUID();

      if (leftoverHandling === 'voluntary_contribution') {
        if (!consentGiven) {
          throw new Error('Consent required for voluntary contribution');
        }

        // Post contribution directly from CASH/BANK to REVENUE (bypassing AR)
        await supabase.from('ledger_entries').insert([
          {
            tx_id: leftoverTxId,
            tx_key: `family-contribution-${parentPaymentId}-${Date.now()}`,
            account_id: method === 'cash' ? accountMap.get('CASH') : accountMap.get('BANK'),
            debit: 0,
            credit: remainingAmount,
            occurred_at: occurredAt,
            memo: `Voluntary contribution from family payment`,
            month,
            created_by: user.id
          },
          {
            tx_id: leftoverTxId,
            account_id: accountMap.get('REVENUE'),
            debit: remainingAmount,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Voluntary contribution - direct to revenue`,
            month,
            created_by: user.id
          }
        ]);

      } else if (leftoverHandling === 'unapplied_cash') {
        await supabase.from('ledger_entries').insert([
          {
            tx_id: leftoverTxId,
            tx_key: `family-credit-${parentPaymentId}-${Date.now()}`,
            account_id: accountMap.get('AR'),
            debit: remainingAmount,
            credit: 0,
            occurred_at: occurredAt,
            memo: `Unapplied cash from family payment`,
            month,
            created_by: user.id
          },
          {
            tx_id: leftoverTxId,
            account_id: accountMap.get('CREDIT'),
            debit: 0,
            credit: remainingAmount,
            occurred_at: occurredAt,
            memo: `Customer credit for future use`,
            month,
            created_by: user.id
          }
        ]);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        parentPaymentId,
        allocations: allocations.map(a => ({
          studentId: a.studentId,
          amount: a.amount
        })),
        leftoverAmount: remainingAmount,
        leftoverHandling
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing family payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
