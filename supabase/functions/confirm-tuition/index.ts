import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { requireRole } from "../_lib/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Admins only. This ran on the service role and never looked at who
    // was calling, so any signed-in account could act on any child's data.
    // Service-to-service calls still pass - see requireRole.
    const gate = await requireRole(req, supabase, ["admin"], corsHeaders);
    if (gate instanceof Response) return gate;

    const InputSchema = z.object({
      invoiceIds: z.array(z.string().uuid()),
      notes: z.string().optional(),
      adjustedStatus: z.enum(['confirmed', 'adjusted']).optional().default('confirmed')
    });

    const body = InputSchema.parse(await req.json());
    const { invoiceIds, notes, adjustedStatus } = body;

    // requireRole above already verified the caller; `gate` carries their
    // id. An internal service-role call has no end user, so confirmed_by
    // is left null rather than attributed to somebody who did not do it.
    const confirmedBy = gate.userId || null;

    // Never confirm a saved bill without rechecking current cancellations.
    const { data: invoices, error: invoiceReadError } = await supabase
      .from('invoices').select('id, student_id, month').in('id', invoiceIds);
    if (invoiceReadError) throw invoiceReadError;
    if (invoices?.length !== new Set(invoiceIds).size) throw new Error('Invoice not found');
    for (const invoice of invoices ?? []) {
      const { data: refreshed, error: refreshError } = await supabase.functions.invoke('calculate-tuition', {
        body: { studentId: invoice.student_id, month: invoice.month },
      });
      if (refreshError || refreshed?.error) throw new Error('Tuition must be refreshed before confirmation');
      if (refreshed?.siblingUnresolved) throw new Error('Family discount is still being calculated. Try confirming again in a moment.');
    }

    // Update invoices
    const { data, error } = await supabase
      .from("invoices")
      .update({
        confirmation_status: adjustedStatus,
        confirmed_at: new Date().toISOString(),
        confirmed_by: confirmedBy,
        confirmation_notes: notes || null,
      })
      .in("id", invoiceIds)
      .select();

    if (error) throw error;

    // Log to audit
    for (const invoice of data || []) {
      await supabase.from("audit_log").insert({
        actor_user_id: confirmedBy,
        action: "confirm_tuition",
        entity: "invoice",
        entity_id: invoice.id,
        diff: {
          status: adjustedStatus,
          notes: notes,
          invoice_month: invoice.month,
          student_id: invoice.student_id
        }
      });
    }

    console.log(`Confirmed ${invoiceIds.length} invoices by user ${confirmedBy ?? "service role"}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        confirmedCount: invoiceIds.length,
        invoices: data 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error confirming tuition:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
