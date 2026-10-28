// supabase/functions/stars-sync/index.ts
//
// Reads what Pixel Pal recorded and applies it to HEC as the chosen
// teacher. Called every five minutes by the database's own scheduler
// (stars_sync_tick, via pg_net), and by an admin's "Run now".
//
// THIS FUNCTION DECIDES NOTHING ABOUT A CHILD'S RECORD. It fetches
// Pixel Pal's feed, hands each page to stars_sync_apply_page - where every
// decision is made, in one transaction, against the real schema - and
// then runs the after-effects a mark has in HEC (tuition, streaks) through
// the same module mark-attendance uses. See
// supabase/migrations/20261027100000_stars_sync_engine.sql.
//
// WHO MAY CALL IT. verify_jwt stays ON, as for every function here, so
// the gateway rejects a request with no valid JWT before this code runs.
// Past the gateway there are exactly two callers:
//
//   the scheduler   presents the project's anon key - public by design,
//                   it ships in the app - to get through the gateway, and
//                   proves it is the scheduler with a token generated
//                   inside the database and readable by nothing a browser
//                   can reach. The anon key alone gets nowhere.
//
//   an admin        "Run now" from the Stars Sync page; the session is
//                   verified with auth.getUser and must hold the admin role.
//
// Anyone else gets 401 before anything is read.
//
// NEVER LOGGED: the shared secret, the schedule's token, or any record's
// contents. Records are about children. Counts only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_lib/rate-limit.ts";
import { advanceStreaks } from "../_lib/attendance-effects.ts";
import {
  FeedError,
  PIXEL_PAL_EXPORT_URL,
  addCounts,
  parseFeedPage,
  planDrain,
  resolveFeedSecret,
  secretsMatch,
} from "../_lib/stars-sync-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGE_SIZE = 500;
const MAX_PAGES = 20;
// Stop asking for more pages after this long. A page that has been
// fetched is always finished; the rest waits for the next run.
const TIME_BUDGET_MS = 90_000;
const FETCH_TIMEOUT_MS = 20_000;
// Longer than any run can take, so a run is never overtaken; short enough
// that a run which died holding it does not stop the sync for long.
const LOCK_SECONDS = 600;
const RETRY_BATCH = 200;
// calculate-tuition allows 30 calls a minute from one address. A run takes
// at most this many; the rest wait in the queue for the next run.
const TUITION_PER_RUN = 20;
const EFFECTS_READ = 200;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // The anon key that gets the scheduler past the gateway is public, so
  // this is rate limited before it costs anything.
  const ipLimit = checkRateLimit(getClientIP(req), 20, 60_000, "ip");
  if (ipLimit.limited) return rateLimitResponse(ipLimit.resetAt, corsHeaders);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // ----------------------------------------------------------- who
  let caller: "schedule" | "admin" | "service";
  const scheduleToken = req.headers.get("x-stars-cron");
  if (scheduleToken !== null) {
    const { data, error } = await supabase
      .from("stars_sync_secrets").select("cron_token").eq("id", true).maybeSingle();
    if (error || !secretsMatch(scheduleToken, data?.cron_token)) {
      return json({ error: "Unauthorized" }, 401);
    }
    caller = "schedule";
  } else {
    const gate = await requireRole(req, supabase, ["admin"], corsHeaders);
    if (gate instanceof Response) return gate;
    caller = gate.isServiceRole ? "service" : "admin";

    // Remember where this function lives and the public key that gets a
    // request past the gateway, both from its own environment, so the
    // scheduler can reach it. Recorded only when a person (or the service
    // key) runs it: the schedule cannot start until somebody has run the
    // sync once by hand.
    const { error } = await supabase
      .from("stars_sync_secrets")
      .update({
        function_url: `${supabaseUrl}/functions/v1/stars-sync`,
        function_key: Deno.env.get("SUPABASE_ANON_KEY") ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    if (error) console.error("stars-sync: could not record its own URL:", error.message);
  }

  // ----------------------------------------------------------- whether
  const { data: conn, error: connError } = await supabase
    .from("stars_sync_connection").select("enabled, sync_from").eq("id", true).maybeSingle();
  if (connError || !conn) {
    return json({ error: "The Stars sync tables are missing. Apply migration 20261027100000." }, 500);
  }
  // The switch governs the schedule. A person pressing "Run now" while it
  // is off is how the first, supervised run happens.
  if (caller === "schedule" && !conn.enabled) return json({ status: "off" });
  if (!conn.sync_from) {
    return json({ error: "Choose the date to sync from on the Stars Sync page first." }, 409);
  }

  const secret = resolveFeedSecret((name) => Deno.env.get(name));

  const { data: locked, error: lockError } = await supabase.rpc("stars_sync_try_lock", {
    p_ttl_seconds: LOCK_SECONDS,
  });
  if (lockError) return json({ error: "Could not start the sync." }, 500);
  if (locked !== true) return json({ status: "busy", message: "A sync is already running." }, 409);

  // ----------------------------------------------------------- the run
  const started = Date.now();
  const counts: Record<string, number> = {};
  const warnings: string[] = [];
  let pages = 0;
  let cursor: number | null = null;
  let failure: string | null = null;
  let upstream = false;

  // The after-effects of marks - tuition and streaks - are queued in
  // stars_sync_effects in the same transaction as each mark, so a run that
  // dies after a page commits loses nothing. This works through the queue,
  // deleting a row only once its work has succeeded; anything refused
  // stays for the next run, with the attempt counted and the reason kept.
  const drainEffects = async () => {
    const { data: rows, error } = await supabase
      .from("stars_sync_effects")
      .select("id, kind, student_id, class_id, session_id, lesson_date, month, attempts")
      .order("attempts", { ascending: true })
      .order("id", { ascending: true })
      .limit(EFFECTS_READ);
    if (error) {
      warnings.push("The after-effects queue could not be read; tuition and streaks will catch up on a later run.");
      return;
    }
    const plan = planDrain(rows, TUITION_PER_RUN);

    for (const batch of plan.streaks) {
      const ok = await advanceStreaks(supabase, {
        classId: batch.classId,
        entries: batch.studentIds.map((studentId) => ({ studentId, status: "Present" })),
      });
      if (ok) {
        await supabase.from("stars_sync_effects").delete().in("id", batch.ids);
      } else {
        await supabase.rpc("stars_sync_effect_failed", { p_ids: batch.ids, p_error: "streak update failed" });
        warnings.push("Streaks could not be updated for one lesson; it will be retried.");
      }
    }

    for (const job of plan.tuition) {
      const { error: invokeError } = await supabase.functions.invoke("calculate-tuition", {
        body: { studentId: job.studentId, month: job.month },
      });
      if (invokeError) {
        await supabase.rpc("stars_sync_effect_failed", {
          p_ids: [job.id],
          p_error: invokeError instanceof Error ? invokeError.message : "tuition recalculation failed",
        });
        warnings.push("Tuition recalculation was refused; the rest are queued for the next run.");
        // Most likely the rate limit. Pressing on would only be refused too.
        break;
      }
      await supabase.from("stars_sync_effects").delete().eq("id", job.id);
    }
  };

  try {
    if (!secret) {
      throw new FeedError(
        "The Pixel Pal secret is not set. Add it as STARPASSCODE in the project's edge function secrets.",
      );
    }

    // Records that were waiting - for a child to be matched, a lesson to
    // exist, a teacher to be on the roster - get another chance first.
    const retried = await supabase.rpc("stars_sync_retry_pending", { p_limit: RETRY_BATCH });
    if (retried.error) throw new Error(`Retrying waiting records failed: ${retried.error.message}`);
    addCounts(counts, retried.data?.counts);

    const { data: cur, error: curError } = await supabase
      .from("stars_sync_cursor").select("last_seq").eq("id", true).maybeSingle();
    if (curError || !cur) throw new Error("The sync cursor is missing.");
    cursor = Number(cur.last_seq);

    while (pages < MAX_PAGES && Date.now() - started < TIME_BUDGET_MS) {
      const url = `${PIXEL_PAL_EXPORT_URL}?since=${cursor}&limit=${PAGE_SIZE}`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          headers: { "x-sync-secret": secret, Accept: "application/json" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch (_e) {
        upstream = true;
        throw new FeedError("Pixel Pal did not answer in time. The next run will try again.");
      }
      if (res.status === 401 || res.status === 403) {
        upstream = true;
        throw new FeedError("Pixel Pal refused the secret. Check STARPASSCODE matches what they gave you.");
      }
      if (!res.ok) {
        upstream = true;
        throw new FeedError(`Pixel Pal answered ${res.status}. The next run will try again.`);
      }
      let body: unknown;
      try {
        body = await res.json();
      } catch (_e) {
        upstream = true;
        throw new FeedError("Pixel Pal's answer was not JSON.");
      }
      const page = parseFeedPage(body, cursor);
      if (page.events.length === 0) break;

      const applied = await supabase.rpc("stars_sync_apply_page", {
        p_events: page.events,
        p_next_cursor: page.nextCursor,
      });
      if (applied.error) throw new Error(`Applying a page failed: ${applied.error.message}`);

      pages += 1;
      addCounts(counts, applied.data?.counts);
      cursor = Number(applied.data?.cursor ?? page.nextCursor);

      if (page.events.length < PAGE_SIZE) break;
    }
  } catch (e) {
    failure = e instanceof FeedError
      ? e.message
      : e instanceof Error ? e.message : "The sync failed.";
  }

  // Run whether or not the fetch worked: the queue holds work for marks
  // already committed, and Pixel Pal being down is no reason to delay it.
  try {
    await drainEffects();
  } catch (_e) {
    warnings.push("The after-effects queue could not be worked through; it will be retried.");
  }

  const summary = { counts, pages, cursor, warnings, ms: Date.now() - started };
  const finished = await supabase.rpc("stars_sync_finish_run", {
    p_summary: summary,
    p_error: failure,
    p_by: caller,
  });
  if (finished.error) console.error("stars-sync: could not record the run:", finished.error.message);

  console.log(`stars-sync ${caller}: ${failure ? "failed" : "ok"}, pages ${pages}, counts ${JSON.stringify(counts)}`);

  if (failure) return json({ error: failure, ...summary }, upstream ? 502 : 500);
  return json({ status: "ok", ...summary });
});
