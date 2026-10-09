import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireUnlock, UNLOCK_HEADER } from "../_lib/unlock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-unlock",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // AUTHORIZATION. This function had none at all.
    //
    // It runs on the service-role key, so it bypasses row-level security
    // entirely, and with scope "all" it DELETES a month of point_transactions
    // across the whole school and zeroes student_points. The only gate was
    // verify_jwt = true, which establishes that the caller is signed in and
    // nothing more - so any student, parent, teacher or TA could wipe the
    // leaderboards for everyone.
    //
    // Same shape as bulk-cancel-sessions and the admin-* functions: prove the
    // bearer token, then require the admin role from user_roles. 401 for "who
    // are you", 403 for "not you".
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (!roles?.some((r) => r.role === "admin")) {
      console.warn(`reset-points denied for user ${user.id}: not an admin`);
      return new Response(JSON.stringify({ success: false, error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The sign-in gate, enforced rather than drawn. A React gate can be
    // walked around by calling this endpoint directly; this cannot. It sits
    // before the body is read, so an unverified caller gets nowhere near
    // the delete.
    const unlock = await requireUnlock(supabase, user.id, req.headers.get(UNLOCK_HEADER));
    if (!unlock.valid) {
      console.warn(`reset-points denied for user ${user.id}: ${unlock.reason}`);
      await supabase.from("audit_log").insert({
        entity: "student_points",
        action: "reset_blocked_locked",
        actor_user_id: user.id,
        diff: { reason: unlock.reason },
      });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Confirm it's you before resetting points.",
          code: "unlock_required",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { targetMonth, scope, classId, studentId } = await req.json();

    console.log("Reset points request:", { targetMonth, scope, classId, studentId });

    if (!targetMonth || !/^\d{4}-\d{2}$/.test(targetMonth)) {
      throw new Error("Invalid month format. Use YYYY-MM");
    }

    if (!scope || !["all", "class", "student"].includes(scope)) {
      throw new Error("Invalid scope. Must be 'all', 'class', or 'student'");
    }

    if (scope === "class" && !classId) {
      throw new Error("classId is required when scope is 'class'");
    }

    if (scope === "student" && !studentId) {
      throw new Error("studentId is required when scope is 'student'");
    }

    // Check if the target class has economy_mode enabled
    if (scope === "class" && classId) {
      const { data: cls } = await supabase
        .from("classes")
        .select("economy_mode")
        .eq("id", classId)
        .single();
      if (cls?.economy_mode) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Cannot reset points for a class with Economy Mode enabled. Points accumulate indefinitely in economy mode.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // For "all" scope, exclude economy-mode classes
    let economyClassIds: string[] = [];
    if (scope === "all") {
      const { data: economyClasses } = await supabase
        .from("classes")
        .select("id")
        .eq("economy_mode", true);
      economyClassIds = (economyClasses || []).map((c: any) => c.id);
    }

    // Build delete query for point_transactions
    let deleteTransactionsQuery = supabase
      .from("point_transactions")
      .delete()
      .eq("month", targetMonth);

    if (scope === "class") {
      deleteTransactionsQuery = deleteTransactionsQuery.eq("class_id", classId);
    } else if (scope === "student") {
      deleteTransactionsQuery = deleteTransactionsQuery.eq("student_id", studentId);
    }

    // Exclude economy classes for "all" scope
    if (scope === "all" && economyClassIds.length > 0) {
      // We need to use not.in filter
      for (const ecId of economyClassIds) {
        deleteTransactionsQuery = deleteTransactionsQuery.neq("class_id", ecId);
      }
    }

    const { error: deleteError, count: deletedCount } = await deleteTransactionsQuery;

    if (deleteError) {
      console.error("Error deleting transactions:", deleteError);
      throw deleteError;
    }

    // Build reset query for student_points
    let resetPointsQuery = supabase
      .from("student_points")
      .update({
        homework_points: 0,
        participation_points: 0,
      })
      .eq("month", targetMonth);

    if (scope === "class") {
      resetPointsQuery = resetPointsQuery.eq("class_id", classId);
    } else if (scope === "student") {
      resetPointsQuery = resetPointsQuery.eq("student_id", studentId);
    }

    if (scope === "all" && economyClassIds.length > 0) {
      for (const ecId of economyClassIds) {
        resetPointsQuery = resetPointsQuery.neq("class_id", ecId);
      }
    }

    const { error: resetError, count: resetCount } = await resetPointsQuery;

    if (resetError) {
      console.error("Error resetting points:", resetError);
      throw resetError;
    }

    console.log(`Reset complete: deleted ${deletedCount} transactions, reset ${resetCount} student_points records (skipped ${economyClassIds.length} economy classes)`);

    // This destroys point_transactions rows outright, so once it has run there
    // is nothing left to say it happened or who asked for it. The deleted rows
    // carried their own created_by; the deletion carried nothing. Recorded
    // after the fact deliberately - a failed reset should not leave a log entry
    // claiming it succeeded. A failure here must not fail the request, since
    // the data is already gone and reporting an error would invite a retry.
    try {
      await supabase.from("audit_log").insert({
        entity: "student_points",
        entity_id: scope === "class" ? classId : scope === "student" ? studentId : null,
        action: "reset_points",
        actor_user_id: user.id,
        diff: {
          month: targetMonth,
          scope,
          class_id: classId ?? null,
          student_id: studentId ?? null,
          transactions_deleted: deletedCount ?? 0,
          student_points_reset: resetCount ?? 0,
          economy_classes_skipped: economyClassIds.length,
        },
      });
    } catch (auditError) {
      console.error("reset-points succeeded but the audit entry failed:", auditError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        deleted: deletedCount || 0,
        reset: resetCount || 0,
        economySkipped: economyClassIds.length,
        message: `Successfully reset points for ${targetMonth}`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in reset-points function:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
