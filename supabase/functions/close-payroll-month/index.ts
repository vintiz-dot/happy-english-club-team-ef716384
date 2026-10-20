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
      // what the month was closed at, and re-closing upserts over them;
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

    // Ask the owner of the pricing, not the caller.
    const { data: payroll, error: payrollError } = await supabase.functions.invoke(
      "calculate-payroll",
      {
        body: { month },
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}` },
      },
    );
    if (payrollError) throw payrollError;

    // The response field is payrollData, not results.
    const rows: PayrollResultRow[] = payroll?.payrollData ?? [];
    // A month with nothing earned is almost certainly the wrong month
    // rather than a month where nobody worked, and closing it would lock
    // an empty period that then has to be reopened to fix.
    const earning = rows.filter((r) => (r.totalAmountActual ?? 0) > 0);
    if (earning.length === 0) {
      return json({ error: `No earned payroll in ${month}; nothing to close.` }, 409);
    }

    // The period row has to exist before the lines, which reference it.
    const { error: periodError } = await supabase
      .from("payroll_periods")
      .upsert(
        { month, status: "open", note: note ?? null },
        { onConflict: "month", ignoreDuplicates: false },
      );
    if (periodError) throw periodError;

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

    // Two upserts rather than one, because the conflict target differs:
    // teacher rows key on (month, teacher_id) and assistant rows on
    // (month, assistant_id).
    for (const [subject, subset] of [
      ["teacher_id", lines.filter((l) => l.teacher_id)],
      ["assistant_id", lines.filter((l) => l.assistant_id)],
    ] as const) {
      if (subset.length === 0) continue;
      const { error } = await supabase
        .from("payroll_lines")
        .upsert(subset, { onConflict: `month,${subject}`, ignoreDuplicates: false });
      if (error) throw error;
    }

    // Book the cost, once. source_kind/source_key carry a unique
    // constraint (20261021092000), so closing twice - or closing,
    // reopening and closing again - updates the same rows rather than
    // charging the school twice.
    const lastDay = new Date(Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    )).toISOString().slice(0, 10);

    const { error: expError } = await supabase.from("expenditures").upsert(
      earning.map((r) => ({
        amount: Math.round(r.totalAmountActual ?? 0),
        category: isTa(r) ? "TA Payroll" : "Teacher Payroll",
        memo: `${r.teacherName} – ${month}`,
        date: lastDay,
        source_kind: "payroll",
        source_key: `${month}:${isTa(r) ? "assistant" : "teacher"}:${r.teacherId}`,
      })),
      { onConflict: "source_kind,source_key", ignoreDuplicates: false },
    );
    if (expError) throw expError;

    // Last, so the trigger does not refuse the writes above.
    const lockedAt = new Date().toISOString();
    const { error: lockError } = await supabase
      .from("payroll_periods")
      .update({
        status: "locked",
        locked_at: lockedAt,
        locked_by: gate.userId,
        note: note ?? null,
      })
      .eq("month", month);
    if (lockError) throw lockError;

    return json({
      month,
      status: "locked",
      lockedAt,
      lines: lines.length,
      totalAmountVnd: lines.reduce((n, l) => n + l.total_amount_vnd, 0),
    });
  } catch (error) {
    console.error("close-payroll-month failed:", error);
    return json({ error: error instanceof Error ? error.message : "Unexpected error" }, 500);
  }
});
