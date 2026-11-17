// Modify payment has been retired (D5 G-2; owner's ruling D-22, through the
// conductor, 17 Nov 2026: "use your recommendations").
//
// Why. The old function rewrote a payment as a reversal payment plus a new
// payment, each with ledger legs, but never moved the bill
// (invoices.recorded_payment), booked 'Cash' to BANK (case-sensitive), ignored
// every insert error and had no compare-and-set - so the ledger and the bill
// came apart with each use (D5-audit G-2). No screen reached it: its only
// caller, ModifyPaymentModal, was mounted nowhere and has been deleted. What
// it was for is covered, with the bill and the ledger moving together:
//   - wrong amount, method or month   -> Delete payment (delete-payment), then
//                                        record it again (record-payment);
//   - money to take off a bill        -> a correction through record-payment.
//
// This stub stays deployed under the old name so that a browser tab or a
// script holding the old URL cannot reach the old function: every request
// after the CORS preflight is answered 410 Gone. It reads nothing and writes
// nothing - no client, no environment, not even the request body.
//
// The payments it modified before stay exactly as they are (their
// payment_modifications rows, reversal and replacement payments and legs);
// delete-payment still refuses those, as before. See
// docs/evidence/PAYMENTS-followups.md.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODIFY_PAYMENT_REMOVED = 'Modify payment has been removed: delete the payment and record it again';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(JSON.stringify({ error: MODIFY_PAYMENT_REMOVED }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
