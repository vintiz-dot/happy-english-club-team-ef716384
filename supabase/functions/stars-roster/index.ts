// supabase/functions/stars-roster/index.ts
//
// Asks Pixel Pal who its children and classes are, for the Stars Sync page,
// so an admin is asked "Is Bin from Pixel Pal Nguyễn Gia Bình on HEC?" and
// not "who is child 121?".
//
// A SEPARATE FUNCTION FROM stars-sync ON PURPOSE. Every POST to stars-sync
// runs the sync, so an older copy of it handed a "roster" request would run
// a whole sync every time an admin opened the page. A function that is not
// deployed yet just answers 404, and the page falls back on a pasted list.
//
// ADMINS ONLY, AND NOTHING IS KEPT. The answer is personal data about
// children. It goes straight back to the admin who asked, into that page's
// memory. It is not written to the database and never logged; only counts
// are. Pixel Pal not having this endpoint yet is a normal answer, not an
// error, so the two apps can ship in either order.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_lib/rate-limit.ts";
import {
  FeedError,
  PIXEL_PAL_ROSTER_URL,
  parseRoster,
  resolveFeedSecret,
} from "../_lib/stars-sync-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FETCH_TIMEOUT_MS = 15_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const ipLimit = checkRateLimit(getClientIP(req), 20, 60_000, "ip");
  if (ipLimit.limited) return rateLimitResponse(ipLimit.resetAt, corsHeaders);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const gate = await requireRole(req, supabase, ["admin"], corsHeaders);
  if (gate instanceof Response) return gate;

  const secret = resolveFeedSecret((name) => Deno.env.get(name));
  if (!secret) return json({ status: "no_secret" });

  let res: Response;
  try {
    res = await fetch(PIXEL_PAL_ROSTER_URL, {
      method: "GET",
      headers: { "x-sync-secret": secret, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (_e) {
    return json({ status: "unavailable" });
  }

  // Pixel Pal has not built it yet. The page offers a pasted list instead.
  if (res.status === 404) return json({ status: "not_ready" });
  if (res.status === 401 || res.status === 403) return json({ status: "refused" });
  if (!res.ok) return json({ status: "unavailable" });

  try {
    const roster = parseRoster(await res.json());
    console.log(`stars-roster: ${Object.keys(roster.students).length} children, ${Object.keys(roster.classes).length} classes`);
    return json({ status: "ok", fetched_at: new Date().toISOString(), ...roster });
  } catch (e) {
    // Never the payload: it is about children.
    console.error(`stars-roster: ${e instanceof FeedError ? e.message : "could not read the answer"}`);
    return json({ status: "unavailable" });
  }
});
