/**
 * manage-demo-student Edge Function
 * ==================================
 * THIS IS A LIVE APP WITH REAL STUDENT AND FAMILY DATA.
 *
 * The ONLY demo account that may exist is a STUDENT (student@demo.com).
 * A student-role account sees nothing but its own rows under RLS, and this
 * one is enrolled solely in the sandbox "Demo Class", so a visitor never
 * touches real records. Privileged demo accounts (admin/teacher/family) are
 * permanently forbidden — they were revoked in migration 20260730110000 and
 * this function will NEVER create one.
 *
 * Admin-authenticated (verify_jwt=true + an explicit admin-role check).
 * There is deliberately no public endpoint: the demo password is chosen by
 * an admin in the dashboard, never shipped in source, and never written to
 * the database — it is set directly on the auth user through the Admin API.
 * `demo_access` records only that a password was set, by whom, and when.
 *
 * Actions:
 *   status        → { enabled, password_set_at, account_exists }
 *   set_password  → { password } (min 10 chars); enables + provisions sandbox
 *   disable       → locks the account with a random password, enabled=false
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEMO_EMAIL = "student@demo.com";
const MIN_PASSWORD = 10;

/** Accounts that must never exist. Guard against reintroduction. */
const FORBIDDEN_DEMO_EMAILS = ["admin@demo.com", "teacher@demo.com", "family@demo.com"];

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
    // ── Admin gate ───────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const { data: { user } } = await sb.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return respond({ success: false, error: "Unauthorized" }, 401);

    // Never .single() on user_roles — a user can hold several roles.
    const { data: roleRows } = await sb.from("user_roles").select("role").eq("user_id", user.id);
    if (!(roleRows || []).some((r: any) => r.role === "admin")) {
      return respond({ success: false, error: "Admin access required" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "status");

    const findDemoUser = async (): Promise<string | null> => {
      const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      return page?.users?.find((u) => u.email?.toLowerCase() === DEMO_EMAIL)?.id ?? null;
    };

    // ── status ───────────────────────────────────────────────────────────
    if (action === "status") {
      const { data: row } = await sb.from("demo_access").select("*").eq("id", true).maybeSingle();
      return respond({
        success: true,
        enabled: !!row?.enabled,
        password_set_at: row?.password_set_at ?? null,
        account_exists: !!(await findDemoUser()),
        demo_email: DEMO_EMAIL,
      });
    }

    // ── disable ──────────────────────────────────────────────────────────
    if (action === "disable") {
      const uid = await findDemoUser();
      if (uid) {
        // Lock with a password nobody knows, rather than deleting, so the
        // sandbox's accumulated data survives being re-enabled later.
        await sb.auth.admin.updateUserById(uid, { password: crypto.randomUUID() + crypto.randomUUID() });
      }
      await sb.from("demo_access").upsert(
        { id: true, enabled: false, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
      return respond({ success: true, enabled: false });
    }

    // ── set_password ─────────────────────────────────────────────────────
    if (action === "set_password") {
      const password = String(body.password ?? "");
      if (password.length < MIN_PASSWORD) {
        return respond(
          { success: false, error: `Password must be at least ${MIN_PASSWORD} characters` },
          400,
        );
      }
      // Refuse anything resembling the old published credentials.
      if (/^(admin|teacher|student|family)123$/i.test(password) || /^demo/i.test(password)) {
        return respond(
          { success: false, error: "Choose a password that isn't guessable — this is a live app" },
          400,
        );
      }

      // Paranoia: if a privileged demo account ever reappears, strip it here.
      const { data: allUsers } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      for (const u of allUsers?.users || []) {
        if (u.email && FORBIDDEN_DEMO_EMAILS.includes(u.email.toLowerCase())) {
          await sb.from("user_roles").delete().eq("user_id", u.id);
          await sb.from("users").delete().eq("id", u.id);
          await sb.auth.admin.updateUserById(u.id, {
            password: crypto.randomUUID() + crypto.randomUUID(),
            ban_duration: "876000h", // ~100 years
          });
          console.warn(`revoked forbidden demo account: ${u.email}`);
        }
      }

      // Create or update the demo STUDENT only.
      let uid = await findDemoUser();
      if (!uid) {
        const { data: created, error: createErr } = await sb.auth.admin.createUser({
          email: DEMO_EMAIL,
          password,
          email_confirm: true,
          user_metadata: { full_name: "Demo Student", role: "student", demo: true },
        });
        if (createErr || !created?.user) {
          throw new Error(`could not create the demo student: ${createErr?.message}`);
        }
        uid = created.user.id;
      } else {
        const { error: updErr } = await sb.auth.admin.updateUserById(uid, {
          password,
          email_confirm: true,
          ban_duration: "none",
          user_metadata: { full_name: "Demo Student", role: "student", demo: true },
        });
        if (updErr) throw new Error(`could not set the demo password: ${updErr.message}`);
      }

      // Student role, and only student.
      await sb.from("user_roles").delete().eq("user_id", uid);
      await sb.from("user_roles").insert({ user_id: uid, role: "student" });
      await sb.from("users").upsert({ id: uid, role: "student" }, { onConflict: "id" });

      // ── Sandbox: a Demo Class the visitor can look around in ──────────
      let { data: demoClass } = await sb
        .from("classes").select("id").eq("name", "Demo Class").maybeSingle();
      if (!demoClass) {
        const { data } = await sb
          .from("classes")
          .insert({
            name: "Demo Class",
            description: "Sandbox class for the public demo — all data here is fictional.",
            is_active: true,
            session_rate_vnd: 0,
          })
          .select("id").single();
        demoClass = data;
      }

      let { data: studentRow } = await sb
        .from("students").select("id").eq("linked_user_id", uid).maybeSingle();
      if (!studentRow) {
        const { data } = await sb
          .from("students")
          .insert({
            full_name: "Demo Student",
            email: DEMO_EMAIL,
            linked_user_id: uid,
            is_active: true,
          })
          .select("id").single();
        studentRow = data;
      }

      if (demoClass?.id && studentRow?.id) {
        // The demo student is enrolled in the sandbox class and NOTHING
        // else — a student in a real class would see that class's
        // leaderboard, i.e. real classmates' names.
        await sb.from("enrollments").delete()
          .eq("student_id", studentRow.id).neq("class_id", demoClass.id);

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

      await sb.from("demo_access").upsert(
        {
          id: true,
          enabled: true,
          password_set_at: new Date().toISOString(),
          password_set_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

      return respond({ success: true, enabled: true, demo_email: DEMO_EMAIL });
    }

    return respond({ success: false, error: `Unknown action: ${action}` }, 400);
  } catch (error) {
    console.error("manage-demo-student error:", error);
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
