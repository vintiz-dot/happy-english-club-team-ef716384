// supabase/functions/refresh-month-bills/index.ts
//
// Saves the month's bills that are missing or no longer match the register, and
// records what it did. Runs every hour from pg_cron (migration
// 20261123090000_tuition_bill_check.sql) and from the "Recalculate" button on
// Finance > Tuition.
//
// Before this, nothing saved bills on a schedule: a bill existed only once someone
// had touched that child, so in November 2026 six children had no bill and one a
// bill of 0 (see the migration). This function does not price anything itself:
// public.tuition_bill_gaps lists who is wrong, and calculate-tuition - the only
// thing that writes a bill - is asked to save each of them. Frozen and confirmed
// bills keep calculate-tuition's own protections.
//
// It never reprices an earlier month on its own (refreshableMonths), and reports
// every child it could not fix instead of leaving them out.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";
import { runnerSecretMatches } from "../_lib/runner-secret.ts";
import { adminMayRefresh, readRecalc, refreshableMonths, type RecalcOutcome } from "../_lib/bill-refresh.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-schedule-runner-secret",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// calculate-tuition allows 30 calls a minute per caller address; one every
// 2.1 s keeps this function under it with room for the screens.
const PACE_MS = 2100;
// Children recalculated per run: the rest are next hour's (they stay listed).
const MAX_PER_RUN = 15;
// Stop starting new calls after this long, well inside the edge time limit.
const TIME_BUDGET_MS = 100_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const started = Date.now();
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, serviceKey);

    const isTimer = await runnerSecretMatches(req, supabase);
    let actorUserId: string | null = null;
    if (!isTimer) {
      const gate = await requireRole(req, supabase, ["admin"], corsHeaders);
      if (gate instanceof Response) return gate;
      actorUserId = gate.isServiceRole ? null : gate.userId;
    }

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const now = new Date();
    let months: string[];
    if (typeof body?.month === "string" && body.month) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(body.month)) return json({ error: "Month must be YYYY-MM" }, 400);
      if (!adminMayRefresh(body.month, now)) {
        return json({
          error: "Only this month and last month are recalculated here. An earlier month is listed for you to check child by child (Automation > Manual Tuition Recalculation).",
        }, 400);
      }
      months = [body.month];
    } else {
      months = refreshableMonths(now);
    }

    const results: any[] = [];
    let calls = 0;
    for (const month of months) {
      const { data: gaps, error: gapErr } = await supabase.rpc("tuition_bill_gaps", { p_month: month });
      if (gapErr) throw new Error(`The bill check for ${month} could not run: ${gapErr.message}`);
      const listed: any[] = gaps ?? [];
      const failed: Array<{ student_id: string; name: string; error: string }> = [];
      const saved = new Set<string>();
      let notReached = 0;

      for (const g of listed) {
        if (calls >= MAX_PER_RUN || Date.now() - started > TIME_BUDGET_MS) { notReached++; continue; }
        if (calls > 0) await sleep(PACE_MS);
        calls++;
        let outcome = await recalc(url, serviceKey, g.student_id, month);
        if (!outcome.ok && outcome.retryAfterSeconds !== undefined && outcome.retryAfterSeconds <= 30
            && Date.now() - started + outcome.retryAfterSeconds * 1000 < TIME_BUDGET_MS) {
          await sleep(outcome.retryAfterSeconds * 1000);
          outcome = await recalc(url, serviceKey, g.student_id, month);
        }
        if (outcome.ok) saved.add(g.student_id);
        else failed.push({ student_id: g.student_id, name: g.full_name, error: outcome.error ?? "not saved" });
      }

      // What is still wrong now. A child whose bill WAS saved and is still listed
      // means the check and calculate-tuition disagree - a defect to report, not
      // a bill to retry quietly.
      const { data: after, error: afterErr } = await supabase.rpc("tuition_bill_gaps", { p_month: month });
      if (afterErr) throw new Error(`The bill check for ${month} could not run after the refresh: ${afterErr.message}`);
      const stillOpen: any[] = after ?? [];
      for (const g of stillOpen) {
        if (saved.has(g.student_id)) {
          saved.delete(g.student_id);
          failed.push({
            student_id: g.student_id, name: g.full_name,
            error: `saved, but the bill (${g.saved_base}) still differs from the register (${g.expected_base}): the check and calculate-tuition disagree`,
          });
        }
      }

      const run = {
        month,
        started_by: isTimer ? "timer" : "admin",
        actor_user_id: actorUserId,
        found: listed.length,
        recalculated: saved.size,
        failed,
        still_open: stillOpen,
      };
      const { error: logErr } = await supabase.from("tuition_bill_check_runs").insert(run);
      if (logErr) console.error("refresh-month-bills: run not recorded", logErr.message);
      results.push({ ...run, notReached, recorded: !logErr });
    }

    const anyOpen = results.some((r) => r.still_open.length > 0 || r.failed.length > 0);
    if (anyOpen) console.error("refresh-month-bills: bills still wrong", JSON.stringify(results.map((r) => ({ month: r.month, open: r.still_open.length, failed: r.failed }))));
    return json({ ok: !anyOpen, months: results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("refresh-month-bills failed:", message);
    return json({ error: message }, 500);
  }
});

async function recalc(url: string, serviceKey: string, studentId: string, month: string): Promise<RecalcOutcome> {
  try {
    const res = await fetch(`${url}/functions/v1/calculate-tuition`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}`, apikey: serviceKey },
      body: JSON.stringify({ studentId, month }),
    });
    let payload: any = null;
    try { payload = await res.json(); } catch { payload = null; }
    return readRecalc(res.status, payload);
  } catch (e) {
    return { ok: false, error: `calculate-tuition unreachable: ${e instanceof Error ? e.message : String(e)}` };
  }
}
