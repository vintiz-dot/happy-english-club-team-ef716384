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
//
// It also saves the bills a checked change left unfinished: a discount, fee or
// enrolment change (D4) or a lesson cancelled or moved (D2) asks calculate-tuition
// to work its bills out again, and when that call fails the change waits in
// money_change_tuition_pending / session_cancel_tuition_pending until an admin
// resumes it. A discount moves the total, not the lessons, so the gaps check
// cannot see those bills. Saving them here puts the bill right; the change itself
// stays listed until an admin finishes it on Finance > Tuition, which records it.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { requireRole } from "../_lib/auth.ts";
import { runnerSecretMatches } from "../_lib/runner-secret.ts";
import { adminMayRefresh, pendingChangeStudents, readRecalc, refreshableMonths, type RecalcOutcome } from "../_lib/bill-refresh.ts";

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
      const listed: any[] = [...(gaps ?? [])];
      // Bills a checked change has not worked out again (see the header).
      const pending = await pendingFor(supabase, month, new Set(listed.map((g) => g.student_id)));
      listed.push(...pending);
      const failed: Array<{ student_id: string; name: string; error: string }> = [];
      // Bills calculate-tuition kept as charged because lessons have no mark:
      // their own outcome, neither saved nor failed (see readRecalc).
      const held = new Map<string, { lessons: number; message: string }>();
      const saved = new Set<string>();
      let notReached = 0;

      // A bill already known to be held goes last: it cannot be fixed from here,
      // so it must not use the run's calls before a bill that can.
      const knownHeld = await heldStudents(supabase, listed.map((g) => g.student_id), month);
      listed.sort((a, b) => Number(knownHeld.has(a.student_id)) - Number(knownHeld.has(b.student_id)));

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
        else if (outcome.held) held.set(g.student_id, outcome.held);
        else failed.push({ student_id: g.student_id, name: g.full_name, error: outcome.error ?? "not saved" });
      }

      // What is still wrong now. A child whose bill WAS saved and is still listed
      // means the check and calculate-tuition disagree - a defect to report, not
      // a bill to retry quietly.
      const { data: after, error: afterErr } = await supabase.rpc("tuition_bill_gaps", { p_month: month });
      if (afterErr) throw new Error(`The bill check for ${month} could not run after the refresh: ${afterErr.message}`);
      // A held child stays listed (the bill differs from the register until
      // someone fixes the register); the row says so, in the same json.
      const stillOpen: any[] = (after ?? []).map((g: any) =>
        held.has(g.student_id) ? { ...g, held: held.get(g.student_id) } : g);
      for (const g of stillOpen) {
        if (saved.has(g.student_id)) {
          saved.delete(g.student_id);
          failed.push({
            student_id: g.student_id, name: g.full_name,
            error: `saved, but the bill (${g.saved_base}) still differs from the register (${g.expected_base}): the check and calculate-tuition disagree`,
          });
        }
      }

      const listedName = new Map<string, string>(listed.map((g) => [g.student_id, g.full_name]));
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
      results.push({
        ...run,
        notReached,
        recorded: !logErr,
        held: [...held].map(([student_id, h]) => ({ student_id, name: listedName.get(student_id) ?? "", ...h })),
      });
    }

    // A held bill is reported, but it is not "still wrong" for this run's answer:
    // the refresh did what it can and says so.
    const openNotHeld = (r: any) => r.still_open.filter((o: any) => !o.held).length;
    const anyOpen = results.some((r) => openNotHeld(r) > 0 || r.failed.length > 0);
    for (const r of results) for (const h of r.held) console.warn("refresh-month-bills:", h.name || h.student_id, h.message);
    if (anyOpen) console.error("refresh-month-bills: bills still wrong", JSON.stringify(results.map((r) => ({ month: r.month, open: openNotHeld(r), failed: r.failed }))));
    return json({ ok: !anyOpen, months: results });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("refresh-month-bills failed:", message);
    return json({ error: message }, 500);
  }
});

async function pendingFor(supabase: any, month: string, skip: Set<string>): Promise<any[]> {
  const rows: any[] = [];
  for (const view of ["money_change_tuition_pending", "session_cancel_tuition_pending"]) {
    const { data, error } = await supabase.from(view).select("override_id, refresh_pairs").limit(1000);
    if (error) { console.error(`refresh-month-bills: ${view} not read`, error.message); continue; }
    rows.push(...(data ?? []));
  }
  const ids = pendingChangeStudents(rows, month, skip);
  if (ids.length === 0) return [];
  const { data: kids } = await supabase.from("students").select("id, full_name").in("id", ids);
  const name = new Map((kids ?? []).map((k: any) => [k.id, k.full_name]));
  return ids.map((id) => ({ student_id: id, full_name: name.get(id) ?? id, problem: "change_pending" }));
}

// The children whose saved bill already carries the register_missing_marks flag.
// Best effort: when it cannot be read, nobody is moved to the back.
async function heldStudents(supabase: any, studentIds: string[], month: string): Promise<Set<string>> {
  const out = new Set<string>();
  if (studentIds.length === 0) return out;
  try {
    const { data } = await supabase
      .from("invoices")
      .select("student_id, review_flags")
      .eq("month", month)
      .in("student_id", studentIds);
    for (const row of data ?? []) {
      const flags = Array.isArray(row.review_flags) ? row.review_flags : [];
      if (flags.some((f: any) => f?.type === "register_missing_marks")) out.add(row.student_id);
    }
  } catch { /* keep the order as listed */ }
  return out;
}

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
