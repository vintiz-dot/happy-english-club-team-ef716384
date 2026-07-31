/**
 * redeem-access-code — front-desk account recovery (FAMILY SIDE).
 * ================================================================
 * A family types the code from their printed card and chooses a password.
 *
 * THIS IS THE ONLY PUBLIC SURFACE OF THE RECOVERY FLOW. It has to be: the
 * person using it is by definition locked out, so there is no JWT to verify.
 * `verify_jwt = false` in config.toml is deliberate and load-bearing, and it
 * is why the hardening below is not optional.
 *
 * DEFENCES
 *
 *   1. The code is looked up BY HASH. The plaintext is never stored, so
 *      there is nothing in the database to steal and replay.
 *
 *   2. Single use, expiring, revocable. Redeeming marks used_at, so a card
 *      photographed on the way out of the building is already spent.
 *
 *   3. Per-code attempt counter, locking at MAX_ATTEMPTS. 50 bits of entropy
 *      already makes guessing hopeless; this makes it hopeless AND loud.
 *
 *   4. IP rate limiting on top, so one host cannot spray codes.
 *
 *   5. UNIFORM ERRORS. Wrong, expired, revoked, already-used and
 *      locked-out all return the same sentence. Distinguishing them would
 *      turn this endpoint into an oracle for which codes exist.
 *
 *   6. STUDENTS AND FAMILIES ONLY, re-checked here. Even if a code for a
 *      staff account somehow existed, it could not be redeemed. Defence in
 *      depth: manage-student-access refuses to issue one in the first place.
 *
 *   7. Redeeming revokes every existing session for that account, so an
 *      attacker who was already signed in is thrown out.
 *
 * Input:  { code: string, new_password: string }
 * Output: { success, email }  — the caller then signs in normally.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_lib/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ATTEMPTS = 5;
const MIN_PASSWORD = 8;
const FORBIDDEN_ROLES = ["admin", "teacher"];

/** One sentence for every failure mode. Never say which one it was. */
const GENERIC_FAILURE =
  "That code is not valid. It may have been used already or expired — ask the school for a new one.";

/**
 * MUST stay byte-identical to normaliseCode in manage-student-access — the
 * issuing side hashes the normalised form, so any divergence here makes every
 * code un-redeemable.
 *
 * Only characters ABSENT from the code alphabet (O, I, L, U) may be folded.
 * Q is IN the alphabet and must never be remapped.
 */
function normaliseCode(input: string): string {
  return String(input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/U/g, "V");
}

async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(normaliseCode(code)),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // Rate limit BEFORE touching the database: 10 attempts per IP per
    // 10 minutes. Redeeming is a once-in-a-year action for a real family.
    const ip = getClientIP(req);
    const rl = checkRateLimit(`redeem:${ip}`, 10, 10 * 60_000, "ip");
    if (rl.limited) return rateLimitResponse(rl.resetAt, corsHeaders);

    const body = await req.json().catch(() => ({}));
    const rawCode = String(body.code ?? "");
    const newPassword = String(body.new_password ?? "");

    if (normaliseCode(rawCode).length < 6) {
      return respond({ success: false, error: GENERIC_FAILURE }, 400);
    }
    if (newPassword.length < MIN_PASSWORD) {
      // A password-strength complaint is safe to be specific about: it says
      // nothing about whether the code was real.
      return respond({
        success: false,
        error: `Please choose a password of at least ${MIN_PASSWORD} characters.`,
      }, 400);
    }

    const codeHash = await hashCode(rawCode);
    const { data: row } = await sb
      .from("student_access_codes")
      .select("id, student_id, user_id, login_email, expires_at, used_at, revoked_at, attempts")
      .eq("code_hash", codeHash)
      .maybeSingle();

    // Unknown code. Nothing to count against, so just refuse.
    if (!row) {
      console.warn(`redeem: unknown code from ${ip}`);
      return respond({ success: false, error: GENERIC_FAILURE }, 400);
    }

    const spent =
      !!row.used_at ||
      !!row.revoked_at ||
      new Date(row.expires_at).getTime() < Date.now() ||
      row.attempts >= MAX_ATTEMPTS;

    if (spent) {
      // Count the attempt so a found-and-retried card still trips the lock.
      await sb.from("student_access_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      console.warn(`redeem: spent/expired code ${row.id} from ${ip}`);
      return respond({ success: false, error: GENERIC_FAILURE }, 400);
    }

    // Defence in depth: never let a code touch a staff account, even if one
    // was somehow issued.
    const { data: roleRows } = await sb
      .from("user_roles").select("role").eq("user_id", row.user_id);
    const forbidden = (roleRows || [])
      .map((r: any) => String(r.role))
      .filter((r) => FORBIDDEN_ROLES.includes(r));
    if (forbidden.length) {
      await sb.from("student_access_codes")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", row.id);
      await sb.from("audit_log").insert({
        action: "front_desk_redeem_blocked_staff",
        entity: "student",
        entity_id: row.student_id,
        diff: { user_id: row.user_id, roles: forbidden, ip },
      });
      console.error(`redeem: BLOCKED staff account ${row.user_id} — code revoked`);
      return respond({ success: false, error: GENERIC_FAILURE }, 400);
    }

    // ── Set the password the family chose ──────────────────────────────
    const { error: pwErr } = await sb.auth.admin.updateUserById(row.user_id, {
      password: newPassword,
      email_confirm: true,
    });
    if (pwErr) {
      await sb.from("student_access_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      return respond({ success: false, error: "Could not set that password. Please try another." }, 400);
    }

    // Burn the code first — if anything below fails, it must not be reusable.
    await sb.from("student_access_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", row.id);

    // Throw out anyone already holding a session on this account.
    try {
      await sb.auth.admin.signOut(row.user_id, "global");
    } catch (e) {
      console.warn("could not revoke existing sessions:", (e as Error).message);
    }

    await sb.from("audit_log").insert({
      actor_user_id: row.user_id,
      action: "front_desk_code_redeemed",
      entity: "student",
      entity_id: row.student_id,
      diff: { user_id: row.user_id, login_email: row.login_email, ip },
    });

    // Returning the address is safe now: whoever redeemed the code has just
    // proved they hold the card, and they need it to sign in.
    return respond({ success: true, email: row.login_email });
  } catch (error) {
    console.error("redeem-access-code error:", error);
    // Even an internal failure must not leak detail on this endpoint.
    return respond({ success: false, error: GENERIC_FAILURE }, 400);
  }
});
