/**
 * seed-demo-accounts Edge Function
 * =================================
 * Makes the Auth page's demo buttons actually work against production.
 *
 * The old approach seeded auth.users with raw SQL, which GoTrue rejects at
 * login time (manually-inserted rows miss token-column invariants → 500 /
 * invalid credentials). This uses the SUPPORTED path — the auth Admin API —
 * so GoTrue owns every column it cares about.
 *
 * Idempotent and self-healing: creates the four demo users if missing,
 * resets their passwords to the documented values if they exist, corrects
 * role rows, links entity rows, and seeds a small "Demo Class" so the
 * dashboards have something to show. verify_jwt=false — the Auth page calls
 * it (unauthenticated by definition) when a demo login fails, then retries.
 * The only thing it can do is (re)provision the four fixed demo accounts.
 *
 * Input:  {} (none)
 * Output: { success, seeded: [emails] }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMOS = [
  { email: "admin@demo.com", pass: "admin123", role: "admin", name: "Demo Admin" },
  { email: "teacher@demo.com", pass: "teacher123", role: "teacher", name: "Demo Teacher" },
  { email: "student@demo.com", pass: "student123", role: "student", name: "Demo Student" },
  { email: "family@demo.com", pass: "family123", role: "family", name: "Demo Family" },
] as const;

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
    const userIds: Record<string, string> = {};

    for (const demo of DEMOS) {
      // Create-or-reset through the Admin API only.
      const { data: created, error: createErr } = await sb.auth.admin.createUser({
        email: demo.email,
        password: demo.pass,
        email_confirm: true,
        user_metadata: { full_name: demo.name, role: demo.role },
      });

      let uid = created?.user?.id ?? null;
      if (!uid) {
        // Already exists (or was half-created by the old SQL seed) — find it
        // and reset the password so the documented credentials always work.
        if (createErr && !/already|registered|exists/i.test(createErr.message)) {
          throw new Error(`createUser(${demo.email}): ${createErr.message}`);
        }
        const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
        uid = page?.users?.find((u) => u.email?.toLowerCase() === demo.email)?.id ?? null;
        if (!uid) throw new Error(`could not locate existing user ${demo.email}`);
        const { error: updErr } = await sb.auth.admin.updateUserById(uid, {
          password: demo.pass,
          email_confirm: true,
          user_metadata: { full_name: demo.name, role: demo.role },
        });
        if (updErr) throw new Error(`updateUser(${demo.email}): ${updErr.message}`);
      }
      userIds[demo.role] = uid;

      // Roles: the signup trigger may have written something else.
      await sb.from("user_roles").delete().eq("user_id", uid);
      const { error: roleErr } = await sb.from("user_roles").insert({ user_id: uid, role: demo.role });
      if (roleErr) throw new Error(`role for ${demo.email}: ${roleErr.message}`);
      await sb.from("users").upsert({ id: uid, role: demo.role }, { onConflict: "id" });
    }

    // ── Entity rows ──────────────────────────────────────────────────────
    const teacherUid = userIds["teacher"];
    let { data: teacherRow } = await sb
      .from("teachers").select("id").eq("user_id", teacherUid).maybeSingle();
    if (!teacherRow) {
      const { data } = await sb
        .from("teachers")
        .insert({ user_id: teacherUid, full_name: "Demo Teacher", email: "teacher@demo.com" })
        .select("id").single();
      teacherRow = data;
    }

    let { data: familyRow } = await sb
      .from("families").select("id").eq("primary_user_id", userIds["family"]).maybeSingle();
    if (!familyRow) {
      const { data } = await sb
        .from("families")
        .insert({ name: "Demo Family", email: "family@demo.com", primary_user_id: userIds["family"], is_active: true })
        .select("id").single();
      familyRow = data;
    }

    let { data: studentRow } = await sb
      .from("students").select("id").eq("linked_user_id", userIds["student"]).maybeSingle();
    if (!studentRow) {
      const { data } = await sb
        .from("students")
        .insert({
          full_name: "Demo Student",
          email: "student@demo.com",
          linked_user_id: userIds["student"],
          family_id: familyRow?.id ?? null,
          is_active: true,
        })
        .select("id").single();
      studentRow = data;
    } else if (familyRow?.id) {
      await sb.from("students").update({ family_id: familyRow.id }).eq("id", studentRow.id);
    }

    // ── A small demo class so dashboards aren't empty ────────────────────
    let { data: demoClass } = await sb
      .from("classes").select("id").eq("name", "Demo Class").maybeSingle();
    if (!demoClass) {
      const { data } = await sb
        .from("classes")
        .insert({
          name: "Demo Class",
          description: "Sandbox class for demo accounts — data here is fake.",
          is_active: true,
          default_teacher_id: teacherRow?.id ?? null,
          session_rate_vnd: 0,
        })
        .select("id").single();
      demoClass = data;
    }

    if (demoClass?.id && studentRow?.id) {
      const { data: enr } = await sb
        .from("enrollments").select("id")
        .eq("class_id", demoClass.id).eq("student_id", studentRow.id).maybeSingle();
      if (!enr) {
        await sb.from("enrollments").insert({
          class_id: demoClass.id,
          student_id: studentRow.id,
          start_date: new Date().toISOString().slice(0, 10),
        });
      }

      // A few points so the student dashboard has life in it.
      const { count } = await sb
        .from("point_transactions")
        .select("id", { count: "exact", head: true })
        .eq("student_id", studentRow.id);
      if ((count ?? 0) === 0) {
        const today = new Date().toISOString().slice(0, 10);
        await sb.from("point_transactions").insert([
          { student_id: studentRow.id, class_id: demoClass.id, points: 10, type: "participation", date: today, notes: "Demo: great answers in class" },
          { student_id: studentRow.id, class_id: demoClass.id, points: 5, type: "participation", date: today, notes: "Demo: helped a classmate" },
        ]);
      }
    }

    return respond({ success: true, seeded: DEMOS.map((d) => d.email) });
  } catch (error) {
    console.error("seed-demo-accounts error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
