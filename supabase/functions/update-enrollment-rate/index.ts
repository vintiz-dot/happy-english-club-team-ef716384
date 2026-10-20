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
      enrollmentId: z.string().uuid(),
      rateOverrideVnd: z.number().int().positive().nullable(),
      reason: z.string().optional(),
      studentId: z.string().uuid(),
      month: z.string().regex(/^\d{4}-\d{2}$/)
    });

    const body = InputSchema.parse(await req.json());
    const { enrollmentId, rateOverrideVnd, reason, studentId, month } = body;

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

    // Update enrollment rate override
    const { data: enrollment, error: updateError } = await supabase
      .from("enrollments")
      .update({
        rate_override_vnd: rateOverrideVnd,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .eq("id", enrollmentId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Log to audit
    await supabase.from("audit_log").insert({
      actor_user_id: user.id,
      action: "update_enrollment_rate",
      entity: "enrollment",
      entity_id: enrollmentId,
      diff: {
        rate_override_vnd: rateOverrideVnd,
        reason: reason,
        student_id: studentId,
        class_id: enrollment.class_id
      }
    });

    // Recalculate tuition for this student/month
    const { data: recalcData, error: recalcError } = await supabase.functions.invoke("calculate-tuition", {
      body: { studentId, month }
    });

    if (recalcError) {
      console.error("Error recalculating tuition:", recalcError);
    }

    console.log(`Updated enrollment rate for ${enrollmentId} by user ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        enrollment,
        recalculated: !recalcError,
        tuition: recalcData
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error updating enrollment rate:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
