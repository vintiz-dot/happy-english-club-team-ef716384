/**
 * admin-unlock — the server side of the admin sign-in gate.
 *
 * One function, several actions, because they share identity resolution,
 * the admin check and the rate limiter, and splitting them would mean
 * four near-identical preambles.
 *
 *   status              what this person has enrolled, and what to offer
 *   passkey/options     a fresh single-use challenge
 *   passkey/register    store a credential against this account
 *   passkey/verify      check an assertion, open a session
 *   passcode/set        set or change the fallback passcode
 *   passcode/verify     check it, open a session
 *   passkey/forget      remove a device
 *   lock                end the session on this browser
 *
 * Identity always comes from the verified JWT. Nothing in the body says
 * who the caller is, which is the rule _lib/auth.ts spells out.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyAssertion, ES256, RS256 } from "../_lib/webauthn.ts";
import {
  hashPasscode,
  issueUnlock,
  randomToken,
  requireUnlock,
  sha256Hex,
  verifyPasscode,
} from "../_lib/unlock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-unlock",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CHALLENGE_TTL_MS = 5 * 60_000;
const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;
/** Six digits minimum; long enough to matter, short enough to be typed. */
const PASSCODE_MIN = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const db = createClient(supabaseUrl, serviceKey);

    // The gate guards the admin area, so only admins may enrol into it.
    const { data: roles } = await db.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      return json({ error: "Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");

    // The browser tells us where it thinks it is; we only ever trust it to
    // the extent of matching it against the Origin header the platform set.
    const origin = req.headers.get("origin") ?? "";
    let rpId = "";
    try {
      rpId = new URL(origin).hostname;
    } catch {
      return json({ error: "Missing or malformed Origin" }, 400);
    }

    const userAgent = req.headers.get("user-agent");
    const clientIp = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;

    /* ------------------------------------------------------------ status */

    if (action === "status") {
      const [{ data: keys }, { data: passcode }] = await Promise.all([
        db.from("admin_passkeys")
          .select("id, device_label, created_at, last_used_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true }),
        db.from("admin_passcodes")
          .select("locked_until, updated_at")
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      // Ask the server whether the token this browser is holding is still
      // good, rather than trusting sessionStorage: it may have expired, or
      // been revoked from another tab.
      const held = req.headers.get("x-admin-unlock");
      const unlock = await requireUnlock(db, user.id, held);

      const lockedUntil = passcode?.locked_until ?? null;
      return json({
        ok: true,
        unlocked: unlock.valid,
        passkeys: keys ?? [],
        hasPasscode: !!passcode,
        passcodeLockedUntil:
          lockedUntil && new Date(lockedUntil).getTime() > Date.now() ? lockedUntil : null,
        // Nothing enrolled at all: the gate must let them through, or the
        // first admin locks themselves out of their own console.
        enrolled: (keys?.length ?? 0) > 0 || !!passcode,
        rpId,
      });
    }

    /* -------------------------------------------------- passkey: options */

    if (action === "passkey/options") {
      const purpose = body.purpose === "register" ? "register" : "authenticate";
      const challenge = randomToken(32);

      await db.from("admin_auth_challenges").insert({
        user_id: user.id,
        challenge,
        purpose,
        expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
      });
      // Cheap to do here, and saves scheduling anything. Best effort: a
      // failing prune must not break enrolment, and the RPC builder has no
      // catch() of its own, so the throw is caught here instead.
      try {
        await db.rpc("prune_admin_auth_state");
      } catch {
        // ignored on purpose
      }


      const { data: keys } = await db
        .from("admin_passkeys")
        .select("credential_id")
        .eq("user_id", user.id);

      return json({
        ok: true,
        challenge,
        rpId,
        userId: user.id,
        userName: user.email ?? user.id,
        // On register: so the same device cannot enrol twice.
        // On authenticate: so the browser offers only keys we know.
        credentialIds: (keys ?? []).map((k) => k.credential_id),
      });
    }

    /** Burn a challenge. Returns it only if it was live and unspent. */
    const consumeChallenge = async (
      purpose: "register" | "authenticate",
      challenge: string,
    ): Promise<boolean> => {
      const { data } = await db
        .from("admin_auth_challenges")
        .select("id, expires_at, consumed_at")
        .eq("user_id", user.id)
        .eq("purpose", purpose)
        .eq("challenge", challenge)
        .maybeSingle();

      if (!data || data.consumed_at) return false;
      if (new Date(data.expires_at).getTime() <= Date.now()) return false;

      const { error } = await db
        .from("admin_auth_challenges")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", data.id)
        .is("consumed_at", null);
      // A lost race here means someone else consumed it first: reject.
      return !error;
    };

    /* ------------------------------------------------- passkey: register */

    if (action === "passkey/register") {
      const { challenge, credentialId, publicKeySpki, publicKeyAlg, deviceLabel } = body;
      if (!challenge || !credentialId || !publicKeySpki) {
        return json({ error: "Incomplete registration" }, 400);
      }
      if (![ES256, RS256].includes(Number(publicKeyAlg))) {
        return json({ error: "This device uses an algorithm we do not support" }, 400);
      }
      if (!(await consumeChallenge("register", String(challenge)))) {
        return json({ error: "That enrolment expired. Please try again." }, 400);
      }

      const { error } = await db.from("admin_passkeys").insert({
        user_id: user.id,
        credential_id: String(credentialId),
        public_key_spki: String(publicKeySpki),
        public_key_alg: Number(publicKeyAlg),
        device_label: String(deviceLabel || "This device").slice(0, 80),
      });
      if (error) {
        const duplicate = String((error as { code?: string }).code) === "23505";
        return json(
          { error: duplicate ? "That device is already enrolled." : "Could not save the device." },
          duplicate ? 409 : 500,
        );
      }

      await db.from("audit_log").insert({
        entity: "admin_passkeys",
        action: "passkey_enrolled",
        entity_id: user.id,
        actor_user_id: user.id,
        diff: { device: String(deviceLabel || "This device").slice(0, 80) },
      });

      // Enrolling proves presence just as much as signing in does.
      const unlock = await issueUnlock(db, user.id, "passkey", { userAgent, clientIp });
      return json({ ok: true, ...unlock });
    }

    /* --------------------------------------------------- passkey: verify */

    if (action === "passkey/verify") {
      const { challenge, credentialId, clientDataJSON, authenticatorData, signature } = body;
      if (!challenge || !credentialId || !clientDataJSON || !authenticatorData || !signature) {
        return json({ error: "Incomplete sign-in" }, 400);
      }

      const { data: key } = await db
        .from("admin_passkeys")
        .select("id, user_id, public_key_spki, public_key_alg, sign_count")
        .eq("credential_id", String(credentialId))
        .maybeSingle();

      // Checked before the challenge is burned so a wrong credential does
      // not cost the user their challenge.
      if (!key || key.user_id !== user.id) {
        return json({ error: "That device is not enrolled for this account." }, 403);
      }
      if (!(await consumeChallenge("authenticate", String(challenge)))) {
        return json({ error: "That attempt expired. Please try again." }, 400);
      }

      const result = await verifyAssertion({
        clientDataJSON: String(clientDataJSON),
        authenticatorData: String(authenticatorData),
        signature: String(signature),
        publicKeySpki: String(key.public_key_spki),
        publicKeyAlg: Number(key.public_key_alg),
        storedSignCount: Number(key.sign_count ?? 0),
        expectedChallenge: String(challenge),
        expectedOrigin: origin,
        expectedRpId: rpId,
      });

      if (!result.ok) {
        await db.from("audit_log").insert({
          entity: "admin_passkeys",
          action: "unlock_failed",
          entity_id: user.id,
          actor_user_id: user.id,
          diff: { method: "passkey", reason: result.reason },
        });
        // Say why. The caller has already proved they hold an admin JWT
        // for this account, so there is nobody here to withhold it from,
        // and "that did not verify" is unactionable when the real cause
        // is a passkey created on a different hostname.
        const explain: Record<string, string> = {
          "relying party does not match":
            `This passkey was not created for ${rpId}. Passkeys are tied to one address — unlock with your passcode, remove the device under Devices, and add it again here.`,
          "device did not verify the user":
            "Your device signed in without checking it was you. Windows Hello needs a PIN, face or fingerprint enabled for this to count.",
          "challenge does not match":
            "That attempt was stale. Please try again.",
          "origin does not match":
            "The page address did not match the one the sign-in started from.",
        };
        return json(
          {
            error:
              explain[result.reason ?? ""] ??
              `That did not verify (${result.reason ?? "unknown"}). Please try again, or use your passcode.`,
          },
          401,
        );
      }

      await db
        .from("admin_passkeys")
        .update({
          sign_count: result.newSignCount ?? 0,
          last_used_at: new Date().toISOString(),
        })
        .eq("id", key.id);

      if (result.counterRegression) {
        // Not fatal on its own - plenty of authenticators keep no counter -
        // but it is exactly the signal a cloned credential would produce.
        await db.from("audit_log").insert({
          entity: "admin_passkeys",
          action: "passkey_counter_regression",
          entity_id: user.id,
          actor_user_id: user.id,
          diff: { credential: String(credentialId).slice(0, 16) },
        });
      }

      const unlock = await issueUnlock(db, user.id, "passkey", { userAgent, clientIp });
      await db.from("audit_log").insert({
        entity: "admin_unlock_sessions",
        action: "unlocked",
        entity_id: user.id,
        actor_user_id: user.id,
        diff: { method: "passkey" },
      });
      return json({ ok: true, ...unlock });
    }

    /* ---------------------------------------------------- passcode: set */

    if (action === "passcode/set") {
      const passcode = String(body.passcode ?? "");
      if (passcode.length < PASSCODE_MIN) {
        return json({ error: `Use at least ${PASSCODE_MIN} characters.` }, 400);
      }
      if (/^(.)\1+$/.test(passcode) || /^(0123456789|123456|654321|111111)/.test(passcode)) {
        return json({ error: "Please choose something less guessable." }, 400);
      }

      const { data: existing } = await db
        .from("admin_passcodes")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Changing an existing passcode requires the current one. Setting the
      // first one does not - the signed-in session is the proof.
      if (existing) {
        const current = String(body.currentPasscode ?? "");
        const { data: row } = await db
          .from("admin_passcodes")
          .select("passcode_hash")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!row || !(await verifyPasscode(current, String(row.passcode_hash)))) {
          return json({ error: "That is not your current passcode." }, 403);
        }
      }

      const { error } = await db.from("admin_passcodes").upsert(
        {
          user_id: user.id,
          passcode_hash: await hashPasscode(passcode),
          failed_attempts: 0,
          locked_until: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (error) return json({ error: "Could not save the passcode." }, 500);

      await db.from("audit_log").insert({
        entity: "admin_passcodes",
        action: existing ? "passcode_changed" : "passcode_set",
        entity_id: user.id,
        actor_user_id: user.id,
        diff: {},
      });

      const unlock = await issueUnlock(db, user.id, "passcode", { userAgent, clientIp });
      return json({ ok: true, ...unlock });
    }

    /* -------------------------------------------------- passcode: verify */

    if (action === "passcode/verify") {
      const passcode = String(body.passcode ?? "");
      const { data: row } = await db
        .from("admin_passcodes")
        .select("passcode_hash, failed_attempts, locked_until")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!row) return json({ error: "No passcode is set for this account." }, 400);

      if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
        return json(
          { error: "Too many attempts. Try again later.", lockedUntil: row.locked_until },
          429,
        );
      }

      if (!(await verifyPasscode(passcode, String(row.passcode_hash)))) {
        const attempts = Number(row.failed_attempts ?? 0) + 1;
        const lock = attempts >= MAX_FAILED;
        await db
          .from("admin_passcodes")
          .update({
            failed_attempts: lock ? 0 : attempts,
            locked_until: lock
              ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
              : null,
          })
          .eq("user_id", user.id);

        await db.from("audit_log").insert({
          entity: "admin_passcodes",
          action: "unlock_failed",
          entity_id: user.id,
          actor_user_id: user.id,
          diff: { method: "passcode", attempt: attempts, lockedOut: lock },
        });

        return json(
          {
            error: lock
              ? `Too many attempts. Locked for ${LOCKOUT_MINUTES} minutes.`
              : `Incorrect. ${MAX_FAILED - attempts} ${MAX_FAILED - attempts === 1 ? "try" : "tries"} left.`,
          },
          lock ? 429 : 401,
        );
      }

      await db
        .from("admin_passcodes")
        .update({ failed_attempts: 0, locked_until: null })
        .eq("user_id", user.id);

      const unlock = await issueUnlock(db, user.id, "passcode", { userAgent, clientIp });
      await db.from("audit_log").insert({
        entity: "admin_unlock_sessions",
        action: "unlocked",
        entity_id: user.id,
        actor_user_id: user.id,
        diff: { method: "passcode" },
      });
      return json({ ok: true, ...unlock });
    }

    /* --------------------------------------------------- passkey: forget */

    if (action === "passkey/forget") {
      const id = String(body.id ?? "");
      if (!id) return json({ error: "Which device?" }, 400);

      const { error } = await db
        .from("admin_passkeys")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) return json({ error: "Could not remove that device." }, 500);

      await db.from("audit_log").insert({
        entity: "admin_passkeys",
        action: "passkey_removed",
        entity_id: user.id,
        actor_user_id: user.id,
        diff: { passkey_id: id },
      });
      return json({ ok: true });
    }

    /* ----------------------------------------------------------- lock */

    if (action === "lock") {
      const token = req.headers.get("x-admin-unlock");
      if (token) {
        await db
          .from("admin_unlock_sessions")
          .update({ revoked_at: new Date().toISOString() })
          .eq("token_hash", await sha256Hex(token))
          .eq("user_id", user.id);
      }
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("admin-unlock:", message);
    return json({ error: "Something went wrong." }, 500);
  }
});
