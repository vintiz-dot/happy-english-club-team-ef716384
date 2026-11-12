/**
 * _lib/ai-gate.ts - the door in front of every function that spends the
 * school's AI / speech / image-search credit.
 *
 * WHY THIS EXISTS (audit F-02). Nine functions called OpenAI, Azure Speech,
 * Sapling, Pixabay, Pexels, Google and Unsplash for whoever asked. Four had
 * `verify_jwt = false`: no key at all. The other five had it on - but this
 * project's browser key is itself a JWT (role `anon`), so the gateway's check
 * means "has the public key from the web page", not "is signed in". None of
 * the nine looked at the caller. A script could run up the bills or exhaust
 * the quotas the children's dictionary and recorder depend on.
 *
 * WHAT IT DOES, in this order, before the function reads its body:
 *   1. the caller must present a real session: the token is verified with
 *      Supabase Auth (`authenticateUser`), so the public key alone is a 401;
 *   2. the account must hold one of the roles the function allows. An
 *      account with no role (a sign-up that asked for a staff role and is
 *      waiting for an admin) is refused - 403;
 *   3. a per-account rate limit (`_lib/rate-limit.ts`), keyed by function
 *      and by the user id from the token - never by anything in the body.
 * The service-role key is refused too: no function calls these nine, and a
 * key that can spend without limit is exactly what this closes.
 *
 * The limiter is in memory (it resets on a cold start and is per instance -
 * audit F-12). It stops a loop in a browser tab or a simple script; it is
 * not a budget. A durable daily cap per account is the next step, and this
 * is the one place to put it.
 *
 *     const spender = await requireSpender(req, corsHeaders, GATE);
 *     if (spender instanceof Response) return spender;
 */
import { requireRole, serviceClient, type CallerIdentity } from "./auth.ts";
import { checkRateLimit, rateLimitResponse } from "./rate-limit.ts";

/** Any account that has been given a role. */
export const SIGNED_IN_ROLES = ["student", "family", "teacher", "admin"];
/** Teachers (TAs hold `teacher`) and admins. */
export const STAFF_ROLES = ["teacher", "admin"];

export interface SpendGate {
  /** The function's name: part of the rate-limit key. */
  name: string;
  /** Roles let through. Default: any account holding a role. */
  roles?: string[];
  /** Calls allowed per account in each window. */
  limit: number;
  windowMs: number;
}

export async function requireSpender(
  req: Request,
  corsHeaders: Record<string, string>,
  gate: SpendGate,
): Promise<CallerIdentity | Response> {
  const json = (status: number, error: string) =>
    new Response(JSON.stringify({ error }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let caller: CallerIdentity | Response;
  try {
    caller = await requireRole(req, serviceClient(), gate.roles ?? SIGNED_IN_ROLES, corsHeaders, {
      allowServiceRole: false,
    });
  } catch (e) {
    // Could not even ask who this is: refuse rather than spend.
    console.error(`${gate.name}: caller check failed:`, e instanceof Error ? e.message : e);
    return json(503, "Sign-in could not be checked. Please try again.");
  }
  if (caller instanceof Response) return caller;
  if (!caller.userId) return json(401, "Unauthorized");

  const rl = checkRateLimit(`${gate.name}:${caller.userId}`, gate.limit, gate.windowMs, "user");
  if (rl.limited) return rateLimitResponse(rl.resetAt, corsHeaders);
  return caller;
}

/** True for a teacher, TA or admin. */
export function isStaff(caller: CallerIdentity): boolean {
  return STAFF_ROLES.some((r) => caller.roles.has(r));
}
