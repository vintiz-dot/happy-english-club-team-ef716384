import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { labelAfterPayment } from '../_lib/invoice-status.ts';
import { addToRecordedPayment } from '../_lib/recorded-payment-write.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeletePaymentRequest {
  paymentId: string;
  deleteReason: string;
}

// Deleting a payment undoes it in BOTH places it lives:
//
//   - the ledger: every leg of every transaction the payment posted is
//     reversed, so the reversal balances. The payment paths put `tx_key` on
//     the cash/bank leg only and leave the AR leg without one, so a payment's
//     transactions are found by key and then read whole by `tx_id`;
//   - the bill: what the payment put on a month's `recorded_payment` comes
//     off it again (the bills' carry and label follow). Before T4 this function lowered only the
//     cumulative paid_amount, which the next recalculation overwrites, so a
//     deleted payment stayed on the bill; and it looked only for
//     `payment-<id>` keys, so a family payment's bills were never touched.
//
// What a payment put on a bill = the AR credits, per student and month, of
// its ALLOCATION transactions (keys below). Its leftover transactions
// (voluntary contribution, unapplied cash) are reversed in the ledger but
// were never on a bill.
//
// Refused, with nothing changed: a payment modify-payment has rewritten, or
// one it created (modify-payment writes no invoice, so which bill holds that
// money cannot be read from the ledger); a payment with no ledger entries; a
// payment already reversed by an earlier attempt; and a payment whose bill
// now records LESS than it put there (edited since - taking it off could
// take another payment's money with it).

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

function keyKind(key: string, id: string): 'allocation' | 'leftover' | null {
  const own = (prefix: string) => key === `${prefix}-${id}` || key.startsWith(`${prefix}-${id}-`);
  if (own('payment') || own('family-payment') || own('smart-family')) return 'allocation';
  if (own('family-contribution') || own('family-credit') || own('smart-family-contribution') || own('smart-family-credit')) return 'leftover';
  return null; // e.g. payment-reversal-<id>-..., or another payment whose key merely contains the id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    // 1. The payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, payment_allocations(student_id, allocated_amount)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(`Payment not found: ${paymentError?.message}`);
    }

    const isFamilyPayment = payment.parent_payment_id == null && payment.family_id != null;
    if (payment.parent_payment_id != null) {
      return respond({
        error: 'This payment was created by a modification of another payment. Its money is not on a bill this can find; correct the bill in Recorded Payment Manager instead.',
      }, 409);
    }
    const { data: children, error: childError } = await supabase
      .from('payments')
      .select('id')
      .eq('parent_payment_id', paymentId);
    if (childError) throw new Error(`Unable to check the payment's history: ${childError.message}`);
    if ((children ?? []).length > 0) {
      return respond({
        error: 'This payment has been modified since it was recorded. The bills it touched cannot be read from the ledger; correct them in Recorded Payment Manager instead.',
      }, 409);
    }

    // 2. Its ledger transactions, by key, then each read whole by tx_id.
    const { data: keyed, error: keyedError } = await supabase
      .from('ledger_entries')
      .select('id, tx_id, tx_key')
      .like('tx_key', `%${escapeLike(paymentId)}%`);
    if (keyedError) throw new Error(`Unable to read the payment's ledger entries: ${keyedError.message}`);

    if ((keyed ?? []).some((e: any) => String(e.tx_key ?? '').startsWith(`payment-reversal-${paymentId}-`))) {
      return respond({ error: 'This payment has already been reversed in the ledger. Nothing was changed; check its bills in Recorded Payment Manager.' }, 409);
    }
    const kindOfTx = new Map<string, 'allocation' | 'leftover'>();
    for (const e of keyed ?? []) {
      const kind = keyKind(String(e.tx_key ?? ''), paymentId);
      if (kind && e.tx_id) kindOfTx.set(String(e.tx_id), kind);
    }
    if (kindOfTx.size === 0) {
      return respond({
        error: 'No ledger entries were found for this payment, so nothing says which bill holds it. Nothing was changed; take it off the bill in Recorded Payment Manager.',
      }, 409);
    }
    const { data: legs, error: legsError } = await supabase
      .from('ledger_entries')
      .select('*, ledger_accounts!inner(student_id, code)')
      .in('tx_id', [...kindOfTx.keys()]);
    if (legsError) throw new Error(`Unable to read the payment's ledger entries: ${legsError.message}`);

    // 3. What it put on each bill: AR credits of its allocation transactions.
    const onBill = new Map<string, { studentId: string; month: string; amount: number }>();
    const affectedStudents = new Set<string>();
    const affectedMonths = new Set<string>();
    for (const leg of legs ?? []) {
      const studentId = leg.ledger_accounts?.student_id;
      if (studentId) affectedStudents.add(studentId);
      if (leg.month) affectedMonths.add(leg.month);
      if (kindOfTx.get(String(leg.tx_id)) !== 'allocation' || leg.ledger_accounts?.code !== 'AR' || !studentId || !leg.month) continue;
      const k = `${studentId}|${leg.month}`;
      const cur = onBill.get(k) ?? { studentId, month: leg.month, amount: 0 };
      cur.amount += Number(leg.credit ?? 0) - Number(leg.debit ?? 0);
      onBill.set(k, cur);
    }
    if (isFamilyPayment) for (const a of payment.payment_allocations ?? []) affectedStudents.add(a.student_id);

    // 3b. Each of those bills must still hold at least what the payment put on
    // it. If it holds less, it was edited since (Recorded Payment Manager) and
    // taking the payment off could take another payment's money with it:
    // refuse before anything is written.
    const bills: Array<{ invoice: any; studentId: string; month: string; amount: number }> = [];
    for (const { studentId, month, amount } of onBill.values()) {
      if (amount <= 0) continue;
      const { data: invoice, error: invError } = await supabase
        .from('invoices')
        .select('id, recorded_payment, paid_amount, base_amount, total_amount, carry_in_debt, carry_in_credit, status')
        .eq('student_id', studentId)
        .eq('month', month)
        .maybeSingle();
      if (invError) throw new Error(`Unable to read the ${month} bill: ${invError.message}`);
      const recorded = Number(invoice?.recorded_payment ?? 0);
      if (!invoice || recorded < amount) {
        return respond({
          error: `This payment put ${amount} on the ${month} bill, which now records ${invoice ? recorded : 'nothing (no bill)'}. `
            + 'It was changed since, so taking the payment off could take other money with it. Nothing was changed; correct the bill in Recorded Payment Manager.',
        }, 409);
      }
      bills.push({ invoice, studentId, month, amount });
    }
    // Allocation transactions that put nothing on any bill (e.g. a leg with
    // no month): reversing and deleting would leave the bill as it is with no
    // trace of why. Refuse instead.
    if ([...kindOfTx.values()].includes('allocation') && bills.length === 0) {
      return respond({
        error: 'This payment\'s ledger entries do not say which bill it was put on. Nothing was changed; correct the bill in Recorded Payment Manager.',
      }, 409);
    }

    // 4. Reverse every leg (one insert: all of it or none of it).
    const reversalTxIds: string[] = [];
    const newTx = new Map<string, string>();
    const reversalEntries = (legs ?? []).map((entry: any) => {
      if (!newTx.has(entry.tx_id)) { const id = crypto.randomUUID(); newTx.set(entry.tx_id, id); reversalTxIds.push(id); }
      return {
        tx_id: newTx.get(entry.tx_id),
        tx_key: `payment-reversal-${paymentId}-${entry.id}`,
        account_id: entry.account_id,
        debit: entry.credit,
        credit: entry.debit,
        occurred_at: new Date().toISOString(),
        memo: `Reversal of deleted payment: ${deleteReason}`,
        month: entry.month,
        created_by: user.id,
      };
    });
    const { error: reversalError } = await supabase.from('ledger_entries').insert(reversalEntries);
    if (reversalError) throw new Error(`Failed to create reversal entries: ${reversalError.message}`);
    console.log(`[delete-payment] Reversed ${reversalEntries.length} ledger legs in ${reversalTxIds.length} transactions`);

    // 5. Take it off the bills.
    const billChanges: Array<{ studentId: string; month: string; taken: number; recordedBefore: number; recordedAfter: number }> = [];
    for (const { invoice, studentId, month, amount } of bills) {
      const taken = amount;
      // Compare-and-set on the value read (_lib/recorded-payment-write.ts): a
      // payment landing meanwhile is re-read and kept; the fresh bill must
      // still hold what this payment put there.
      let result;
      try {
        result = await addToRecordedPayment(supabase, invoice, -taken, (fresh, newRecorded) => {
          const label = labelAfterPayment(fresh, newRecorded);
          return {
            paid_amount: Math.max(0, Number(fresh.paid_amount ?? 0) - taken),
            ...(label ? { status: label } : {}),
            updated_at: new Date().toISOString(),
            updated_by: user.id,
          };
        }, (fresh) => (Number(fresh.recorded_payment ?? 0) < taken
          ? `the ${month} bill now records less than this payment put there`
          : null));
      } catch (e) {
        throw new Error(`Ledger reversed, but the ${month} bill could not be updated: ${(e as Error).message}`);
      }
      billChanges.push({ studentId, month, taken, recordedBefore: result.before, recordedAfter: result.after });
      console.log(`[delete-payment] ${month}: recorded ${result.before} -> ${result.after}`);
    }

    // 6. Deletion history, then the payment row
    const deletionSnapshot = {
      payment_data: payment,
      reversal_tx_ids: reversalTxIds,
      affected_students: Array.from(affectedStudents),
      affected_months: Array.from(affectedMonths),
      bill_changes: billChanges,
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

    const { error: deleteError } = await supabase
      .from('payments')
      .delete()
      .eq('id', paymentId);

    if (deleteError) {
      throw new Error(`Ledger and bills reversed, but the payment record could not be deleted: ${deleteError.message}`);
    }

    // 7. Recalculate each bill, as every payment path does.
    for (const { studentId, month } of billChanges) {
      try {
        await supabase.functions.invoke('calculate-tuition', { body: { studentId, month } });
      } catch (e) {
        console.error('[delete-payment] Failed to recalc tuition:', e);
      }
    }

    await supabase.from('audit_log').insert({
      actor_user_id: user.id,
      action: 'delete',
      entity: 'payment',
      entity_id: paymentId,
      diff: {
        reason: deleteReason,
        affected_students: Array.from(affectedStudents),
        affected_months: Array.from(affectedMonths),
        reversal_tx_ids: reversalTxIds,
        bill_changes: billChanges,
      }
    });

    console.log(`[delete-payment] Successfully deleted payment ${paymentId}`);

    return respond({
      success: true,
      message: 'Payment deleted successfully',
      affected_students: Array.from(affectedStudents),
      affected_months: Array.from(affectedMonths),
      reversal_tx_count: reversalTxIds.length,
      bill_changes: billChanges,
    });

  } catch (error) {
    console.error('[delete-payment] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return respond({ error: errorMessage }, 400);
  }
});
