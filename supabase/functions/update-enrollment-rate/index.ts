import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { requireRole } from "../_lib/auth.ts";
import { callerClient, fail, guardError, json } from "../_lib/session-guard.ts";
import { moneyConfirm, moneyPreview, readAck, refreshMoneyChange } from "../_lib/money-guard.ts";

// Sets the per-lesson rate of one enrolment.
//
// D4 step 3B (docs/evidence/D4-design.md b.4 G-13 / G-14, b.5): the LANE is
// the admin's own JWT. The rate is written by money_change_checked on a
// client built from the caller's Authorization header, so the database
// judges it (zz_enrollment_money_guard) and every change leaves one
// money_change_overrides row: who, when, why, the rate before and after.
// The service key is used only to resolve who is calling and to run
// calculate-tuition over the months the change reached; this function never
// writes an enrolment with it, and a call presenting the service key itself
// is refused (there is no person to write as).
//
// - effectiveDate given  -> ('enrollment','set_terms_from'): the enrolment is
//   split on that date and the past keeps its rate. From this month it is
//   tier 0: no dialog. This is what the screen offers by default.
// - no effectiveDate     -> ('enrollment','set_rate'): the whole enrolment,
//   "correct a mistake". It reaches every month the enrolment covers.
// - preview: true        -> the plan (tier, the stored bills reached), nothing written.
// - tier 1+ without `ack` -> 409 money_requires_checked_path with the plan,
//   NOTHING written; the screen opens the dialog and sends the same request
//   again with ack {reason, token, confirm, correction_reason}.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  enrollmentId: z.string().uuid(),
  rateOverrideVnd: z.number().int().positive().nullable(),
  reason: z.string().max(1000).optional(),
  studentId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preview: z.boolean().optional(),
  ack: z.object({
    reason: z.string().max(1000).optional().nullable(),
    token: z.string().max(200).optional().nullable(),
    confirm: z.boolean().optional(),
    correction_reason: z.string().max(1000).optional().nullable(),
  }).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Admins only, with their own session.
    const gate = await requireRole(req, service, ["admin"], corsHeaders, { allowServiceRole: false });
    if (gate instanceof Response) return gate;
    const asCaller = callerClient(createClient, url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", req.headers.get("Authorization")!);

    const parsed = InputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail(guardError(400, "bad_request", "enrollmentId, rateOverrideVnd, studentId and month are required."));
    }
    const { enrollmentId, rateOverrideVnd, studentId, effectiveDate } = parsed.data;
    const op = effectiveDate ? "set_terms_from" : "set_rate";
    const args: Record<string, unknown> = effectiveDate
      ? { enrollment_id: enrollmentId, terms: { rate_override_vnd: rateOverrideVnd }, effective_date: effectiveDate }
      : { enrollment_id: enrollmentId, rate_override_vnd: rateOverrideVnd };

    const p = await moneyPreview(asCaller, "enrollment", op, args);
    if ("error" in p) return fail(p.error);
    const plan = p.data;

    if (plan?.refuse_code === "nothing_to_change") {
      return json({ success: true, unchanged: true, recalculated: false });
    }
    if (!plan?.allowed) {
      return fail(guardError(409, plan?.refuse_code ?? "refused", `Refused: ${plan?.refuse_code ?? "refused"}.`), { preview: plan });
    }
    // the enrolment must be this child's (the screen names both)
    if (!Array.isArray(plan.row_before) || plan.row_before[0]?.student_id !== studentId) {
      return fail(guardError(400, "bad_request", "That enrolment is not this child's."));
    }
    if (parsed.data.preview) return json({ preview: true, plan });

    const ack = readAck(parsed.data.ack);
    if (plan.tier >= 1 && !ack) {
      return json({
        ok: false, code: "money_requires_checked_path", message_key: "moneyGuard.error.money_requires_checked_path",
        message: "This reaches months already billed. Give a reason to change the rate, or change it from a date.",
        preview: plan,
      }, 409);
    }

    const r = await moneyConfirm(asCaller, "enrollment", op, args, ack ?? { token: plan.token },
      { source: "update-enrollment-rate", attached: parsed.data.reason ? { note: parsed.data.reason.slice(0, 1000) } : {} });
    if ("error" in r) {
      // The token went stale or a reason is missing: give the fresh preview back.
      const fresh = await moneyPreview(asCaller, "enrollment", op, args);
      return fail(r.error, { preview: "data" in fresh ? fresh.data : null });
    }

    // The change is committed. Whatever happens below is not a failed change.
    let refresh: unknown = null;
    try {
      refresh = r.data?.override_id ? await refreshMoneyChange(service, asCaller, r.data.override_id) : null;
    } catch (e) {
      console.error("update-enrollment-rate: refresh failed after a committed change:", e);
      refresh = { status: "failed" };
    }
    const { data: enrollment } = await asCaller.from("enrollments").select("*")
      .eq("student_id", studentId).eq("class_id", plan.row_before[0].class_id);

    return json({
      success: true,
      enrollment: Array.isArray(enrollment) ? enrollment[enrollment.length - 1] ?? null : null,
      enrollments: enrollment ?? [],
      override_id: r.data?.override_id ?? null,
      tier: r.data?.tier ?? null,
      refresh_pairs: r.data?.refresh_pairs ?? [],
      recalculated: (refresh as any)?.status === "refreshed" || (refresh as any)?.status === "none",
      refresh,
    });
  } catch (error) {
    console.error("update-enrollment-rate failed:", error);
    return new Response(
      JSON.stringify({ error: "The rate could not be changed. Nothing may have changed; reload and check.", code: "unexpected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
