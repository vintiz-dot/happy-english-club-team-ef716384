import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { authenticateUser } from "../_lib/auth.ts";

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

    // WHO IS CALLING, AND MAY THEY. This function ran on the service role
    // and authenticated the caller but never checked their role, so any
    // signed-in account - a student's, a parent's - could set ANY
    // enrolment's tuition rate to anything, for any child, and the audit
    // row would faithfully record them doing it.
    //
    // authenticateUser is the shared helper (_lib/auth.ts); it reads roles
    // with the service-role client rather than trusting a claim, and it
    // handles the internal service-to-service case.
    const caller = await authenticateUser(req, supabase);
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!caller.isServiceRole && !caller.roles.has("admin")) {
      return new Response(JSON.stringify({ error: "Admins only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const user = { id: caller.userId };

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
