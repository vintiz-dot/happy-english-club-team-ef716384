import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { monthPayable } from '../_lib/invoice-status.ts';

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
      // Money beyond what the selected bills owe has one outcome: it goes on
      // the first selected student's bill for the month, where the carry
      // makes it credit on their next bill (OVERPAYMENT, below). Voluntary
      // contributions were removed (D-23); 'unapplied_cash' is what a screen
      // opened before this change sends, and is refused when there is money
      // left over.
      leftoverHandling: z.enum(['credit_next_bill', 'unapplied_cash']).optional(),
    });

    const body = await req.json();
    // A tab opened before the removal may still send the old option. Refuse
    // it, before anything is written, rather than quietly do something else
    // with the family's money.
    if (body?.leftoverHandling === 'voluntary_contribution') {
      return new Response(
        JSON.stringify({ error: VOLUNTARY_REMOVED }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
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
      leftoverHandling
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

        // Rounding each share to whole VND can leave a few VND while the
        // bills still owe (1,000,000 over three children owing 400,000 each
        // leaves 1). That remainder goes to a bill that still owes, in
        // order, so it is never taken for money beyond what the bills owe:
        // only amount - totalOwed can be left over.
        for (const a of allocations) {
          if (remainingAmount <= 0) break;
          const headroom = (studentBalances.get(a.studentId) || 0) - a.amount;
          if (headroom <= 0) continue;
          const add = Math.min(headroom, remainingAmount);
          a.amount += add;
          remainingAmount -= add;
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

    // Money beyond what the selected bills owe (OVERPAYMENT, owner's
    // decision): it goes on the FIRST SELECTED student's bill for the month,
    // the same child unapplied cash used to go to, exactly as a Manual split
    // amount above what is owed does - folded into that student's
    // allocation, so it is one allocation row, one DR CASH/BANK / CR AR
    // pair and one compare-and-set on the bill. The carry then turns it into
    // credit on the student's next bill. Everything here is decided before
    // the first write.
    const leftover = remainingAmount;
    const creditStudentId = selectedStudentIds[0];
    let creditPart = 0;
    if (leftover > 0) {
      if (leftoverHandling === 'unapplied_cash') {
        return new Response(
          JSON.stringify({ error: UNAPPLIED_REPLACED }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (leftoverHandling !== 'credit_next_bill') {
        throw new Error(`${leftover} is more than the selected bills owe for ${month}; confirm it is to go on the first selected student's bill as credit (leftoverHandling 'credit_next_bill'). Nothing was recorded.`);
      }
      // No bill for that student in the month: refuse. A bill is created and
      // priced by calculate-tuition only (opening the student's tuition for
      // the month); this function must not make one up to hold the money.
      const creditBills = (monthInvoices ?? []).filter((inv) => inv.student_id === creditStudentId);
      if (creditBills.length === 0) {
        throw new Error(`The ${leftover} beyond what the bills owe goes on the first selected student's ${month} bill as credit, but they have no bill for ${month}. Nothing was recorded: open their tuition for ${month} first, or put a student who has one first.`);
      }
      let target = allocations.find((a) => a.studentId === creditStudentId);
      if (!target) {
        target = { studentId: creditStudentId, amount: 0, invoices: [] };
        allocations.push(target);
      }
      if (target.invoices.length === 0) target.invoices = creditBills;
      // How much of the leftover is really credit: only what lands above
      // what the student's bill still owes. In oldest-first and pro-rata a
      // leftover exists only once every bill is paid, so it is all of it; in
      // a Manual split, money not split out first pays what the first
      // selected student still owes (OVERPAYMENT review N2).
      const owedThere = creditBills.reduce((sum, inv) => sum + owedOn(inv), 0);
      creditPart = Math.max(0, target.amount + leftover - owedThere) - Math.max(0, target.amount - owedThere);
      target.amount += leftover;
      remainingAmount = 0;
    }

    // Refuse before anything is written, rather than post money that lands
    // nowhere: an allocation with no bill to go on, or a remainder with no
    // instruction for it (it used to be dropped silently).
    for (const a of allocations) {
      if (a.amount > 0 && a.invoices.length === 0) {
        throw new Error(`A student has no bill for ${month} to put ${a.amount} on; open their tuition for that month first`);
      }
    }

    // One database transaction (record_family_payment, 20261121130000): the
    // payments row, each child's allocation, ledger pair and bill, all of it
    // or none of it. It used to be a string of separate writes, so a failure
    // part-way left a payment row with no bill, or one child paid and not the
    // other (tuition audit phase 1b). The split decided above is sent as it is.
    const parentPaymentId = crypto.randomUUID();
    const placed = allocations.filter((a) => a.amount > 0);
    const legMemo = (i: number, studentId: string) => {
      const extra = studentId === creditStudentId ? leftover : 0;
      return `Family payment allocation (${i + 1}/${placed.length})`
        + (extra <= 0 ? ''
          : allocationMode === 'manual'
            ? `, including ${extra} not split out (${creditPart > 0
              ? `${creditPart} of it beyond what the bill owes, kept as credit`
              : 'all of it towards what the bill owes'})`
            : `, including ${extra} beyond what the bills owe, kept on the bill as credit`);
    };
    const { error: recordError } = await supabase.rpc('record_family_payment', {
      p_payment_id: parentPaymentId,
      p_actor: user.id,
      p_family_id: familyId,
      p_primary_student_id: selectedStudentIds[0],
      p_amount: amount,
      p_method: method,
      p_occurred_at: occurredAt,
      p_memo: memo || `Family payment for ${selectedStudentIds.length} students`,
      p_month: month,
      p_key_prefix: 'family-payment',
      p_allocations: placed.map((a, i) => ({
        student_id: a.studentId,
        amount: a.amount,
        order: i + 1,
        leg_memo: legMemo(i, a.studentId),
        ar_memo: 'Family payment allocation',
      })),
      p_audit: [],
    });
    if (recordError) {
      throw new Error(`${recordError.message || 'The payment could not be recorded'}${/Nothing (more )?was recorded/.test(recordError.message ?? '') ? '' : ' Nothing was recorded.'}`);
    }

    // Recalculate each child's month, as every payment path does.
    for (const a of placed) {
      try {
        await supabase.functions.invoke('calculate-tuition', {
          body: { studentId: a.studentId, month }
        });
      } catch (e) {
        console.error('Failed to recalc tuition:', e);
      }
    }

    // The leftover was put on the first selected student's bill with their
    // allocation, above. Nothing is posted as unapplied cash any more.
    return new Response(
      JSON.stringify({
        success: true,
        parentPaymentId,
        allocations: allocations.map(a => ({
          studentId: a.studentId,
          amount: a.amount
        })),
        leftoverAmount: leftover,
        leftoverHandling: leftover > 0 ? leftoverHandling : undefined,
        // Where the extra went: on this student's bill for the month, as
        // credit that their next bill opens with.
        // (Manual split: only the part of the money not split out that lands
        // above what that bill owed; null when none of it is credit.)
        creditOnBill: creditPart > 0 ? { studentId: creditStudentId, month, amount: creditPart } : null
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
