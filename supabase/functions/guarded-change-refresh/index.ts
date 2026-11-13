import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { authenticateUser } from "../_lib/auth.ts";
import { callerClient, corsHeaders, fail, guardError, isUuid, json, mapDbError } from "../_lib/session-guard.ts";
import { refreshMoneyChange } from "../_lib/money-guard.ts";

// After a checked money change (D4, docs/evidence/D4-design.md (d) step 1b):
//
//   {action: 'refresh', override_id}    an ADMIN, with their own JWT: re-runs
//       calculate-tuition for the change's (child, month) pairs that are not
//       refreshed yet, at most 25 a call, and records the result on the
//       change as the admin. What is left shows in money_change_tuition_pending
//       and is resumed by calling again.
//   {action: 'log-refused', entity, target_id, source}    the SERVICE ROLE
//       only (automation): "I wanted to change this and the guard kept it".
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

    return fail(guardError(400, "bad_action", "action must be refresh or log-refused."));
  } catch (e) {
    console.error("guarded-change-refresh failed:", e);
    return fail(guardError(500, "unexpected", "The refresh did not finish. The change itself stands; try again."));
  }
});
