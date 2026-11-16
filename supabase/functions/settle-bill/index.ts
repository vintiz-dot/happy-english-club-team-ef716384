// Settle Bill has been removed (owner, D-23, 2026-11-16: "remove settle bill
// also entirely").
//
// This stub stays deployed under the old name so that a browser tab opened
// before the removal cannot reach the old function: every request after the
// CORS preflight is answered 410 Gone. It reads nothing and writes nothing -
// no client, no environment, not even the request body.
//
// The settlements already made stay exactly as they are and keep counting
// wherever they counted (ledger balances, reports). See
// docs/evidence/REMOVE-voluntary-and-settle.md.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SETTLE_BILL_REMOVED = 'Settle bill has been removed';

Deno.serve((req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return new Response(JSON.stringify({ error: SETTLE_BILL_REMOVED }), {
    status: 410,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
