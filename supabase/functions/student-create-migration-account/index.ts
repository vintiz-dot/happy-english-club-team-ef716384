import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_SUFFIX = 50;

/**
 * A fresh password per migrated account.
 *
 * This was the constant "1234567" for every child the migration touched,
 * and the email beside it is a slug of their first name on a known domain
 * - so anyone who knew a child's first name knew their login. The password
 * is still returned to the caller below, which is correct: this runs when
 * a student migrates their own account and they have to be told the new
 * credentials. What was wrong was that it was the same one every time.
 *
 * Ambiguous characters (0/O, 1/l/I) are left out because a child reads
 * this off a screen and types it on a phone.
 */
function freshPassword(): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(14);
  crypto.getRandomValues(bytes);
  // Modulo bias across 56 symbols is negligible at this length and this is
  // a one-time credential the child is expected to change.
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

function slugifyEmailLocalPart(input: string): string {
  // Take first word/name, strip diacritics, keep [a-z0-9]
  const first = (input || "").trim().split(/\s+/)[0] || "student";
  const ascii = first
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return ascii || "student";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const requestedEmailRaw = String(body?.email ?? "").trim().toLowerCase();
    if (!requestedEmailRaw || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(requestedEmailRaw)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve student record (only by linked_user_id — original account does this)
    const { data: student, error: stuErr } = await admin
      .from("students")
      .select("id, full_name, linked_user_id, secondary_user_id, migration_completed_at")
      .eq("linked_user_id", callerId)
      .maybeSingle();

    if (stuErr) {
      return new Response(JSON.stringify({ error: stuErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!student) {
      return new Response(
        JSON.stringify({ error: "No student profile linked to this account." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (student.migration_completed_at) {
      return new Response(
        JSON.stringify({
          error:
            "A new login was already created for this student. Please contact your teacher if you lost it.",
        }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Compute candidate email + auto-suffix on collision
    const [localPartRaw, domainPart] = requestedEmailRaw.split("@");
    const baseLocal = slugifyEmailLocalPart(localPartRaw);
    const domain = domainPart || "english.com";

    let finalEmail = `${baseLocal}@${domain}`;
    let newUserId: string | null = null;
    // One password for this account, generated once so the value returned
    // below is the value that was actually set.
    const newPassword = freshPassword();

    for (let i = 0; i <= MAX_SUFFIX; i++) {
      const candidate = i === 0 ? `${baseLocal}@${domain}` : `${baseLocal}${i + 1}@${domain}`;
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: candidate,
        password: newPassword,
        email_confirm: true,
        user_metadata: {
          role: "student",
          migrated_from_user_id: callerId,
          student_id: student.id,
        },
      });

      if (!createErr && created?.user) {
        finalEmail = candidate;
        newUserId = created.user.id;
        break;
      }

      const msg = (createErr?.message || "").toLowerCase();
      const isDup =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists") ||
        msg.includes("duplicate");

      if (!isDup) {
        return new Response(
          JSON.stringify({ error: createErr?.message || "Failed to create account" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      // else loop and try next suffix
    }

    if (!newUserId) {
      return new Response(
        JSON.stringify({ error: "Could not find an available email. Try a different name." }),
        {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Assign student role
    const { error: roleErr } = await admin
      .from("user_roles")
      .insert({ user_id: newUserId, role: "student" });
    if (roleErr) {
      // Best-effort cleanup
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return new Response(
        JSON.stringify({ error: `Role assignment failed: ${roleErr.message}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Link to student + mark migration complete
    const { error: updErr } = await admin
      .from("students")
      .update({
        secondary_user_id: newUserId,
        migration_completed_at: new Date().toISOString(),
      })
      .eq("id", student.id);

    if (updErr) {
      await admin.auth.admin.deleteUser(newUserId).catch(() => {});
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ email: finalEmail, password: newPassword }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: (e as Error).message || "Unexpected error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
