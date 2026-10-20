/**
 * _lib/auth.ts — caller identity for edge functions.
 *
 * THIS IS A LIVE APP WITH REAL USER DATA. Every function must know who is
 * calling before it writes anything or awards anything. Two rules learned
 * the hard way:
 *
 *   1. Never trust an identity from the request BODY. A `user_id` field is
 *      caller-controlled — it lets anyone act as anyone. Derive it from the
 *      verified JWT instead (`authenticateUser`).
 *   2. Never `.single()` a user_roles lookup: a user can legitimately hold
 *      several roles (admin + teacher is common) and `.single()` errors on
 *      the second row, locking real staff out.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

export interface CallerIdentity {
  userId: string;
  roles: Set<string>;
  /** True when the caller presented the service-role key (internal
   *  function-to-function call), not an end-user session. */
  isServiceRole: boolean;
}

/**
 * Resolve and verify the caller from the Authorization header.
 * Returns null when there is no valid identity — respond 401.
 */
export async function authenticateUser(
  req: Request,
  sb: SupabaseClient,
): Promise<CallerIdentity | null> {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  // An internal call presenting the service-role key has no end user.
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return { userId: "", roles: new Set(["service_role"]), isServiceRole: true };
  }

  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) return null;

  const { data: roleRows } = await sb
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id);

  return {
    userId: data.user.id,
    roles: new Set((roleRows || []).map((r: any) => String(r.role))),
    isServiceRole: false,
  };
}

/** Convenience client bound to the service role, for use inside functions. */
export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

/**
 * The gate every function should stand behind.
 *
 * WHY THIS EXISTS. Seven functions authenticated the caller and then did
 * nothing with the answer: they ran on the service role, took a studentId
 * or an invoiceId straight from the body, and acted on it. Any signed-in
 * account — a pupil's, a parent's — could recalculate another child's
 * invoice, sign one off, or wipe a month of leaderboard points. The
 * Authorization header was a turnstile with no one checking tickets.
 *
 * Returns either the caller's identity, or the Response to send back. The
 * two-outcome shape is deliberate: it makes the "forgot to return" mistake
 * a type error rather than a silent authorization bypass.
 *
 *     const gate = await requireRole(req, sb, ["admin"], corsHeaders);
 *     if (gate instanceof Response) return gate;
 *     // gate is now a verified CallerIdentity
 *
 * SERVICE-TO-SERVICE CALLS PASS. Several of these functions are invoked by
 * other functions holding the service-role key — calculate-tuition alone
 * has eight internal callers — and those have no end user to check. They
 * are allowed through unless `allowServiceRole` is false.
 *
 * TAs hold the 'teacher' role (create-teaching-assistant assigns it), so
 * listing "teacher" covers them.
 */
export async function requireRole(
  req: Request,
  sb: SupabaseClient,
  allowed: string[],
  corsHeaders: Record<string, string>,
  opts: { allowServiceRole?: boolean } = {},
): Promise<CallerIdentity | Response> {
  const { allowServiceRole = true } = opts;
  const deny = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const caller = await authenticateUser(req, sb);
  if (!caller) return deny(401, "Unauthorized");
  if (caller.isServiceRole) {
    return allowServiceRole ? caller : deny(403, "Not permitted");
  }
  if (!allowed.some((role) => caller.roles.has(role))) {
    return deny(403, `This action is restricted to: ${allowed.join(", ")}.`);
  }
  return caller;
}

/**
 * May this staff member act on this class?
 *
 * Mirrors the is_teacher_of_class predicate that RLS already uses, so a
 * function running on the service role does not quietly grant more than
 * the same person would get reading the table directly. Admins pass
 * without the lookup.
 *
 * Without this, a role check alone still lets ANY teacher act on ANY
 * child — which is most of the problem, not a detail of it.
 */
export async function callerHoldsClass(
  sb: SupabaseClient,
  caller: CallerIdentity,
  classId: string | null | undefined,
): Promise<boolean> {
  if (caller.isServiceRole || caller.roles.has("admin")) return true;
  if (!classId || !caller.userId) return false;
  const { data, error } = await sb.rpc("is_teacher_of_class", {
    user_id: caller.userId,
    class_id: classId,
  });
  if (error) {
    console.error("is_teacher_of_class failed:", error.message);
    return false;
  }
  return data === true;
}

/**
 * May this staff member act on this student?
 *
 * Mirrors can_view_student_in_class, the predicate behind the students
 * SELECT policy, so a service-role function grants no more than the same
 * person would get reading the row directly. Admins pass without a lookup.
 */
export async function callerHoldsStudent(
  sb: SupabaseClient,
  caller: CallerIdentity,
  studentId: string | null | undefined,
): Promise<boolean> {
  if (caller.isServiceRole || caller.roles.has("admin")) return true;
  if (!studentId || !caller.userId) return false;
  const { data, error } = await sb.rpc("can_view_student_in_class", {
    _student_id: studentId,
    _user_id: caller.userId,
  });
  if (error) {
    console.error("can_view_student_in_class failed:", error.message);
    return false;
  }
  return data === true;
}
