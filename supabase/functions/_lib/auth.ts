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
