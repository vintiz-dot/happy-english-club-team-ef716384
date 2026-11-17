import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { authenticateUser } from "../_lib/auth.ts";
import { callerClient, corsHeaders, fail, guardError, isUuid, json, mapDbError } from "../_lib/session-guard.ts";
import { refreshApprovedChange, refreshMoneyChange } from "../_lib/money-guard.ts";

// After a checked money change (D4, docs/evidence/D4-design.md (d) step 1b):
//
//   {action: 'refresh', override_id}    an ADMIN, with their own JWT: re-runs
//       calculate-tuition for the change's (child, month) pairs that are not
//       refreshed yet, at most 25 a call, and records the result on the
//       change as the admin. What is left shows in money_change_tuition_pending
//       and is resumed by calling again.
//   {action: 'log-refused', entity, target_id, source}    the SERVICE ROLE
//       only (automation): "I wanted to change this and the guard kept it".
//   {action: 'approve', request_id, token, note?}   an ADMIN (D4 step 4):
//       approve_change_request with their own JWT, then the bills of what
//       it applied are worked out again and recorded on each override.
//   {action: 'release', request_id, token}   the asker, release_own_request,
//       then the same refresh.
//   {action: 'approval-refresh', request_id}   the refresh alone, again, for
//       an applied request (skips what is already refreshed).
//
// The override and its events are read as the caller (admin RLS); the
// service client only invokes calculate-tuition.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const caller = await authenticateUser(req, service);
    if (!caller) return fail(guardError(401, "unauthorized", "Sign in again."));
    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === "log-refused") {
      if (!caller.isServiceRole) return fail(guardError(403, "forbidden", "For automation only."));
      if (!isUuid(body?.target_id) || typeof body?.entity !== "string") {
        return fail(guardError(400, "bad_request", "entity and target_id are required."));
      }
      const { data, error } = await service.rpc("log_money_automation_refused", {
        p_entity: body.entity, p_target: body.target_id, p_source: String(body?.source ?? "").slice(0, 100),
      });
      if (error) return fail(mapDbError(error));
      return json({ ok: true, event_id: data });
    }

    if (action === "refresh") {
      if (caller.isServiceRole || !caller.roles.has("admin")) {
        return fail(guardError(403, "forbidden", "Only an administrator can refresh a checked change."));
      }
      if (!isUuid(body?.override_id)) return fail(guardError(400, "bad_request", "override_id is required."));
      const asCaller = callerClient(createClient, url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", req.headers.get("Authorization")!);
      const t = await refreshMoneyChange(service, asCaller, body.override_id);
      if ("error" in t) return fail(t.error);
      return json({ ok: true, tuition: t });
    }

    // D4 step 4 (review B-2): an approval ends in the same bill refresh the
    // direct path does. approve / release run the decision RPC AS THE CALLER
    // (the database checks who may decide, recomputes the change and applies
    // it in one transaction), then refresh what it reached and record that on
    // each override. approval-refresh runs only the refresh, for an applied
    // request whose bills did not all come back (idempotent).
    if (action === "approve" || action === "release" || action === "approval-refresh") {
      if (caller.isServiceRole || !caller.roles.has("admin")) {
        return fail(guardError(403, "forbidden", "Only an administrator can decide an approval request."));
      }
      if (!isUuid(body?.request_id)) return fail(guardError(400, "bad_request", "request_id is required."));
      const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      if (!anon) return fail(guardError(503, "misconfigured", "SUPABASE_ANON_KEY is not set for this function. Nothing was changed."));
      const asCaller = callerClient(createClient, url, anon, req.headers.get("Authorization")!);
      let decision: any = null;
      if (action !== "approval-refresh") {
        if (typeof body?.token !== "string" || body.token === "") return fail(guardError(400, "bad_request", "token is required."));
        const note = typeof body?.note === "string" && body.note.trim() !== "" ? body.note.trim().slice(0, 1000) : null;
        const { data, error } = action === "approve"
          ? await asCaller.rpc("approve_change_request", { p_request_id: body.request_id, p_token: body.token, p_note: note })
          : await asCaller.rpc("release_own_request", { p_request_id: body.request_id, p_token: body.token });
        if (error) return fail(mapDbError(error));
        decision = data;
        if (decision?.status !== "applied") return json({ ok: true, decision, tuition: null });
      }
      // Committed from here on: the after-work never reports a failed decision.
      let tuition: any;
      try {
        const t = await refreshApprovedChange(service, asCaller, body.request_id);
        tuition = "error" in t ? { status: "failed", error: t.error.code, message: t.error.message } : t;
        if ("error" in t && action === "approval-refresh") return fail(t.error);
      } catch (e) {
        tuition = { status: "failed", error: "unexpected", message: String((e as Error)?.message ?? e) };
      }
      if (decision) {
        try {
          await service.from("audit_log").insert({
            action: action === "approve" ? "approval_applied" : "approval_released_alone", entity: "change_approval_requests",
            entity_id: body.request_id, actor_user_id: caller.userId,
            diff: { request_id: body.request_id, override_ids: decision.override_ids ?? [], tuition_status: tuition?.status ?? null },
          });
        } catch (e) {
          console.error("audit entry after an applied approval failed:", (e as Error)?.message ?? e);
        }
      }
      return json({ ok: true, decision, tuition });
    }

    return fail(guardError(400, "bad_action", "action must be refresh, log-refused, approve, release or approval-refresh."));
  } catch (e) {
    console.error("guarded-change-refresh failed:", e);
    return fail(guardError(500, "unexpected", "The refresh did not finish. The change itself stands; try again."));
  }
});
