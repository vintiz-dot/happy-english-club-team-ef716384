/**
 * Who did what, for the admin Activity screen.
 *
 * Runs on the service-role key, so it can do the one thing the browser
 * cannot: turn an actor_user_id into a person. Names come from
 * public.profiles where they exist and fall back to the auth email, which
 * every account has.
 *
 * Previously this returned `select('*')` with an ilike on `action` and
 * nothing else — no actor, no date range, no paging, and the UUID in
 * actor_user_id meant the one question the log exists to answer ("which of
 * us did this?") could not be answered from it.
 *
 * Authorisation is unchanged and deliberately strict: a verified JWT, then
 * an admin role check read from user_roles without .single(), since a user
 * may hold several roles.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/** Hard ceiling so one screen cannot ask for the whole table. */
const MAX_LIMIT = 200;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    if (!roles?.some((r) => r.role === "admin")) {
      return json({ error: "Admin access required" }, 403);
    }

    /* ------------------------------------------------------------ filters */

    // Accept either: a JSON body (how supabase-js invoke sends things) or a
    // query string (so the function stays curl-able for a quick check).
    const url = new URL(req.url);
    let body: Record<string, string> = {};
    if (req.method === "POST") {
      try {
        body = (await req.json()) ?? {};
      } catch {
        body = {};
      }
    }
    const param = (name: string) =>
      String(body[name] ?? url.searchParams.get(name) ?? "").trim();

    const q = param("q");
    const actorId = param("actorId");
    const entity = param("entity");
    const operation = param("operation");
    const from = param("from");
    const to = param("to");
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(param("limit") || "100")));
    const offset = Math.max(0, parseInt(param("offset") || "0"));

    let query = admin
      .from("audit_log")
      .select(
        "id, entity, entity_id, action, operation, changed_fields, diff, actor_user_id, client_ip, user_agent, occurred_at",
        { count: "exact" },
      )
      .order("occurred_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (actorId === "system") query = query.is("actor_user_id", null);
    else if (actorId) query = query.eq("actor_user_id", actorId);
    if (entity) query = query.eq("entity", entity);
    if (operation) query = query.eq("operation", operation);
    if (from) query = query.gte("occurred_at", from);
    // Inclusive of the whole end day: the UI sends a date, not an instant.
    if (to) query = query.lt("occurred_at", `${to}T23:59:59.999Z`);
    if (q) query = query.or(`action.ilike.%${q}%,entity.ilike.%${q}%,entity_id.ilike.%${q}%`);

    const { data: logs, error, count } = await query;
    if (error) throw error;

    /* ------------------------------------------------------- resolve names */

    const actorIds = [...new Set((logs ?? []).map((l) => l.actor_user_id).filter(Boolean))] as string[];
    const actors: Record<string, { name: string; email: string | null }> = {};

    if (actorIds.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));

      // auth.users is not reachable through PostgREST, so emails come from
      // the admin API, one call per id. Bounded by the page size.
      await Promise.all(
        actorIds.map(async (id) => {
          let email: string | null = null;
          try {
            const { data } = await admin.auth.admin.getUserById(id);
            email = data?.user?.email ?? null;
          } catch {
            // A deleted account still has history; it just has no email.
          }
          actors[id] = {
            name: nameById.get(id) || email || `${id.slice(0, 8)}…`,
            email,
          };
        }),
      );
    }

    /* ------------------- the filter dropdowns, from what is actually there */

    const { data: entityRows } = await admin
      .from("audit_log")
      .select("entity")
      .order("entity")
      .limit(1000);
    const entities = [...new Set((entityRows ?? []).map((r) => r.entity))].sort();

    return json({
      ok: true,
      logs: logs ?? [],
      actors,
      entities,
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Activity logs error:", message);
    return json({ error: message }, 500);
  }
});
