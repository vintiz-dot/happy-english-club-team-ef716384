import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { requireRole } from "../_lib/auth.ts";
import { callerClient, fail, guardError, json } from "../_lib/session-guard.ts";
import { moneyConfirm, moneyPreview, readAck } from "../_lib/money-guard.ts";

// Seeds the missing register rows of one child in one class over a date
// range (marked_by NULL, a note), the rows calculate-tuition bills from.
//
// D4 step 1b (docs/evidence/D4-design.md b.3 G-12): the LANE is the admin's
// own JWT. The rows are written by money_change_checked('attendance',
// 'repair') on a client built from the caller's Authorization header, so the
// database judges them (zz_attendance_money_guard) and every repair leaves
// one money_change_overrides row. The service key is used only to resolve
// who is calling (requireRole); this function never writes with it, and a
// call presenting the service key itself is refused.
//
// - preview: true  -> what would be written, the tier and the stored bills;
//                     nothing written.
// - T0 (this week's lessons, an unbilled current month, Excused rows): written.
// - T1+ without `ack` -> 409 attendance_requires_checked_path with the
//   preview, NOTHING written; the screen opens the dialog and sends the same
//   request again with ack {reason, token, confirm, correction_reason}.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  studentId: z.string().uuid(),
  classId: z.string().uuid(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  defaultStatus: z.enum(["Present", "Absent", "Excused"]),
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

    // Admins only, with their own session: a service-key caller has no
    // person to write as.
    const gate = await requireRole(req, service, ["admin"], corsHeaders, { allowServiceRole: false });
    if (gate instanceof Response) return gate;
    const asCaller = callerClient(createClient, url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", req.headers.get("Authorization")!);

    const parsed = InputSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return fail(guardError(400, "bad_request", "studentId, classId, startDate, endDate and defaultStatus are required."));
    }
    const { studentId, classId, startDate, endDate, defaultStatus } = parsed.data;
    const args = { student_id: studentId, class_id: classId, from: startDate, to: endDate, status: defaultStatus };

    const p = await moneyPreview(asCaller, "attendance", "repair", args);
    if ("error" in p) return fail(p.error);
    const plan = p.data;
    const sessions = (plan?.change?.lessons ?? []).map((l: any) => ({ id: l.session_id, date: l.date, status: l.status, tier: l.tier }));

    if (plan?.refuse_code === "no_enrollment") {
      return json({ error: "No enrollment found for this student in this class", code: "no_enrollment" }, 400);
    }
    if (plan?.refuse_code === "nothing_to_change") {
      return json({ message: "All sessions already have attendance records", inserted: 0, sessions: [] });
    }
    if (!plan?.allowed) {
      return fail(guardError(409, plan?.refuse_code ?? "refused", `Refused: ${plan?.refuse_code ?? "refused"}.`), { preview: plan });
    }
    // Absent or Excused is not written for a lesson where there is proof the child
    // was in the room (attendance_proof_for_session). A missing or failing RPC
    // changes nothing: the repair goes ahead as before.
    if (defaultStatus !== "Present" && sessions.length > 0) {
      try {
        const proven: Array<{ student_id: string; summary: string }> = [];
        for (const l of sessions.slice(0, 80)) {
          const { data: rows, error: proofError } = await asCaller.rpc("attendance_proof_for_session", { p_session_id: l.id });
          if (proofError || !Array.isArray(rows)) continue;
          const hit = (rows as any[]).find((r) => r?.strength === "proof" && r.student_id === studentId);
          if (hit) proven.push({ student_id: studentId, summary: `${l.date}: ${String(hit.summary ?? "")}` });
        }
        if (proven.length > 0) {
          return json({
            error: "attendance_proof",
            message: `This child was in the lesson on ${proven.map((p) => p.summary).join("; ")}. If that is a mistake, remove it first, then repair with Absent or Excused.`,
            students: proven,
          }, 409);
        }
      } catch (e) {
        console.warn("attendance proof check skipped:", e);
      }
    }
    if (parsed.data.preview) {
      return json({ preview: true, message: `${sessions.length} attendance records would be added`, inserted: 0, sessions, plan });
    }

    const ack = readAck(parsed.data.ack);
    if (plan.tier >= 1 && !ack) {
      return json({
        ok: false, code: "attendance_requires_checked_path", message_key: "moneyGuard.error.attendance_requires_checked_path",
        message: "Some of these lessons are more than a week old and their month is billed. Give a reason to add them.",
        preview: plan, sessions,
      }, 409);
    }

    const r = await moneyConfirm(asCaller, "attendance", "repair", args, ack ?? { token: plan.token },
      { source: "repair-attendance" });
    if ("error" in r) {
      // The token went stale or a reason is missing: give the fresh preview back.
      const fresh = await moneyPreview(asCaller, "attendance", "repair", args);
      return fail(r.error, { preview: "data" in fresh ? fresh.data : null });
    }
    return json({
      message: `Repaired ${r.data?.written ?? 0} attendance records`,
      inserted: r.data?.written ?? 0,
      override_id: r.data?.override_id ?? null,
      tier: r.data?.tier ?? null,
      refresh_pairs: r.data?.refresh_pairs ?? [],
      sessions,
    });
  } catch (error) {
    console.error("repair-attendance failed:", error);
    return new Response(
      JSON.stringify({ error: "Repair failed. Nothing may have changed; reload and check.", code: "unexpected" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
