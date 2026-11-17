// Close a payroll month, or reopen one.
//
// Closing snapshots what each member of staff is owed into payroll_lines,
// books the cost into expenditures once, and marks the period locked. From
// then on calculate-payroll reports the stored lines rather than
// recomputing, and the database refuses to overwrite them.
//
// WHY THE FIGURES COME FROM calculate-payroll RATHER THAN THE CLIENT. The
// Payroll tab already has the numbers on screen, and taking them from the
// request would be one line shorter. It would also mean the amount written
// into the books is whatever the browser said it was. This asks the
// function that owns the pricing, over the service role, so a closed month
// records what the system computed and not what a client posted.
//
// WHY THE ORDER IS LINES, THEN EXPENDITURES, THEN LOCK. The trigger
// installed by 20261021093000 refuses writes to payroll_lines for a locked
// month. Setting the lock first would lock out the very insert that is
// trying to record the month. Lines are written while the period is still
// open, and the lock is the last thing that happens.
//
// WHY ONE DATABASE CALL (D5 G-7, 20261117153000). The writes used to be five
// PostgREST requests, each its own transaction, and they only upserted: a
// person who earned at an earlier close and earns nothing now kept their
// line and their booked cost, so a re-closed month paid someone it no longer
// owed; and a failure part-way left half a month written. This function now
// works out the lines and costs exactly as before and hands them to
// close_payroll_month_apply, which removes whoever is no longer in them,
// writes the rest and locks the month in that order, in one transaction:
// all of it or none. Until the migration is pasted the close is refused
// (503) rather than run the old way.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireRole } from "../_lib/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const InputSchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be YYYY-MM"),
  action: z.enum(["close", "reopen"]),
  // Required for reopen. Reopening a month that has been paid is the act
  // most worth being able to reconstruct a year later, and "because an
  // admin clicked it" is not a reconstruction.
  reason: z.string().trim().min(3).max(500).optional(),
  note: z.string().trim().max(500).optional(),
});

interface PayrollResultRow {
  teacherId: string;
  teacherName: string;
  payRateType: "hourly" | "per_session";
  hourlyRate: number;
  perSessionRate: number;
  sessionsCountActual: number;
  totalMinutesActual: number;
  totalAmountActual: number;
  staffType?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // allowServiceRole: false on purpose. Everything else in this project
    // lets an internal call through, because one function calling another
    // is routine. Closing a month is not routine and is not something a
    // background job should be able to do on nobody's behalf - it has to
    // be a named admin, because locked_by is part of the record.
    const gate = await requireRole(req, supabase, ["admin"], corsHeaders, {
      allowServiceRole: false,
    });
    if (gate instanceof Response) return gate;

    const parsed = InputSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, 400);
    }
    const { month, action, note } = parsed.data;
    const reason = parsed.data.reason ?? null;

    const { data: existing } = await supabase
      .from("payroll_periods")
      .select("month, status, locked_at")
      .eq("month", month)
      .maybeSingle();

    // ------------------------------------------------------------ reopen
    if (action === "reopen") {
      if (!existing || existing.status !== "locked") {
        return json({ error: `Payroll for ${month} is not locked.` }, 409);
      }
      if (!reason) {
        return json({ error: "A reason is required to reopen a closed month." }, 400);
      }
      const { error } = await supabase
        .from("payroll_periods")
        .update({
          status: "open",
          reopened_at: new Date().toISOString(),
          reopened_by: gate.userId,
          reopen_reason: reason,
        })
        .eq("month", month);
      if (error) throw error;

      // The lines are deliberately left in place. They are the record of
      // what the month was closed at, and re-closing upserts over them
      // (and removes the line and booked cost of anyone who no longer
      // earns in the month, with an audit entry naming them);
      // the audit trail on payroll_lines holds the previous values. A
      // correction to a month that has actually been PAID should not come
      // through here at all - it belongs in payroll_adjustments against a
      // later month, which is what the Payroll tab offers first.
      return json({ month, status: "open", reopened: true });
    }

    // ------------------------------------------------------------- close
    if (existing?.status === "locked") {
      return json({ error: `Payroll for ${month} is already closed.`, month }, 409);
    }

    // Ask the owner of the pricing, not the caller. Asked while the month
    // is open, so it reports the month as it computes now.
    const { data: payroll, error: payrollError } = await supabase.functions.invoke(
      "calculate-payroll",
      {
        body: { month },
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      },
    );
    if (payrollError) {
      // Another close of this month may have won meanwhile: calculate-payroll
      // then fails on the closed month's payroll_summaries. Say so (409)
      // rather than a bare 500 - nothing was written either way.
      const { data: now } = await supabase
        .from("payroll_periods")
        .select("month, status")
        .eq("month", month)
        .maybeSingle();
      if (now?.status === "locked") {
        return json({ error: `Payroll for ${month} is already closed.`, month }, 409);
      }
      throw payrollError;
    }

    // The response field is payrollData, not results.
    const rows: PayrollResultRow[] = payroll?.payrollData ?? [];
    // A month with nothing earned is almost certainly the wrong month
    // rather than a month where nobody worked, and closing it would lock
    // an empty period that then has to be reopened to fix.
    const earning = rows.filter((r) => (r.totalAmountActual ?? 0) > 0);
    if (earning.length === 0) {
      return json({ error: `No earned payroll in ${month}; nothing to close.` }, 409);
    }

    const isTa = (r: PayrollResultRow) => r.staffType === "teaching_assistant";
    const lines = earning.map((r) => ({
      month,
      teacher_id: isTa(r) ? null : r.teacherId,
      assistant_id: isTa(r) ? r.teacherId : null,
      // Name as it stands today. A payslip that silently changes whose it
      // was is not a record.
      staff_name: r.teacherName,
      pay_rate_type: r.payRateType,
      hourly_rate_vnd: r.payRateType === "hourly" ? Math.round(r.hourlyRate ?? 0) : 0,
      per_session_rate_vnd: r.payRateType === "per_session" ? Math.round(r.perSessionRate ?? 0) : 0,
      sessions_count: r.sessionsCountActual ?? 0,
      total_minutes: Math.round(r.totalMinutesActual ?? 0),
      total_amount_vnd: Math.round(r.totalAmountActual ?? 0),
      created_by: gate.userId,
    }));

    // Book the cost, once. source_kind/source_key carry a unique
    // constraint (20261021092000), so closing twice - or closing,
    // reopening and closing again - updates the same rows rather than
    // charging the school twice.
    const lastDay = new Date(Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    )).toISOString().slice(0, 10);

    const costs = earning.map((r) => ({
      amount: Math.round(r.totalAmountActual ?? 0),
      category: isTa(r) ? "TA Payroll" : "Teacher Payroll",
      memo: `${r.teacherName} – ${month}`,
      date: lastDay,
      source_kind: "payroll",
      source_key: `${month}:${isTa(r) ? "assistant" : "teacher"}:${r.teacherId}`,
    }));

    // One transaction, in this order: the period row (taken FOR UPDATE, a
    // month closed meanwhile refused), the lines and booked costs of anyone
    // NOT in `lines` removed while the month is still open, the lines
    // upserted (teacher rows on (month, teacher_id), assistant rows on
    // (month, assistant_id)), the costs upserted on (source_kind,
    // source_key), and the lock last, so the closed-payroll triggers do not
    // refuse the writes before it. Anything refused rolls all of it back.
    const { data: closed, error: applyError } = await supabase.rpc("close_payroll_month_apply", {
      p_month: month,
      p_lines: lines,
      p_costs: costs,
      p_actor: gate.userId,
      p_note: note ?? null,
    });
    if (applyError) {
      const code = String((applyError as { code?: string }).code ?? "");
      if (code === "PGRST202" || code === "42883") {
        return json({
          error: "Closing a payroll month needs migration 20261117153000 in the database. Nothing was changed.",
          month,
        }, 503);
      }
      if (code === "HC147") return json({ error: `Payroll for ${month} is already closed.`, month }, 409);
      // A correction already carried out of this month for someone the close
      // would remove (HC149): the database names them and says what to do.
      if (code === "HC149") return json({ error: applyError.message, month }, 409);
      // A closed-payroll guard (23514) or a plan that disagrees with itself
      // (HC148): the whole call was rolled back.
      if (code === "23514" || code === "HC148") {
        return json({ error: `${applyError.message} Nothing was changed.`, month }, 409);
      }
      throw applyError;
    }

    // Who was taken off the month at this close, so the screen can say so
    // instead of the month's total simply dropping.
    const removedLines = Array.isArray(closed?.removedLines) ? closed.removedLines : [];
    const removedCosts = Array.isArray(closed?.removedCosts) ? closed.removedCosts : [];

    return json({
      month,
      status: "locked",
      lockedAt: closed?.lockedAt ?? null,
      lines: lines.length,
      totalAmountVnd: lines.reduce((n, l) => n + l.total_amount_vnd, 0),
      removedLines,
      removedCosts,
    });
  } catch (error) {
    console.error("close-payroll-month failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
