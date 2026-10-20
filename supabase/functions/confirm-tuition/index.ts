import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

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

    const InputSchema = z.object({
      invoiceIds: z.array(z.string().uuid()),
      notes: z.string().optional(),
      adjustedStatus: z.enum(['confirmed', 'adjusted']).optional().default('confirmed')
    });

    const body = InputSchema.parse(await req.json());
    const { invoiceIds, notes, adjustedStatus } = body;

    // Get user info from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Update invoices
    const { data, error } = await supabase
      .from("invoices")
      .update({
        confirmation_status: adjustedStatus,
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        confirmation_notes: notes || null,
      })
      .in("id", invoiceIds)
      .select();

    if (error) throw error;

    // Log to audit
    for (const invoice of data || []) {
      await supabase.from("audit_log").insert({
        actor_user_id: user.id,
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

    console.log(`Confirmed ${invoiceIds.length} invoices by user ${user.id}`);

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
