// supabase/functions/calculate-payroll/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PayrollRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  teacherId: z.string().uuid("Invalid teacher ID format").optional(),
});

type ClassRow = {
  name: string;
  default_session_length_minutes?: number | null;
  schedule_template?: unknown;
};

type SessionRow = {
  id: string;
  date: string; // YYYY-MM-DD
  start_time: string | null; // "HH:MM" or "HH:MM:SS"
  end_time: string | null; // "HH:MM" or "HH:MM:SS"
  status?: string;
  class_id?: string;
  classes?: ClassRow | ClassRow[] | null;
};

/* --------------------------------------------------------- weekly pattern
 *
 * MIRROR OF src/lib/classSchedule.ts. These two must agree: the client flags
 * the sessions, this function prices them, and if they disagree the admin
 * sees a warning about one session and a money figure about another.
 *
 * Why not the single classes.default_session_length_minutes column: classes
 * here run different lengths on different days - two hours on Wednesday,
 * ninety minutes on Saturday, same class. One number cannot describe that,
 * so comparing every session against one flagged a correct day every week.
 * schedule_template.weeklySlots already holds each day's own start and end,
 * and schedule-sessions generates the session rows from exactly those.
 */

type WeeklySlot = { dayOfWeek: number; startTime: string; endTime: string };

function parseWeeklySlots(template: unknown): WeeklySlot[] {
  const raw = (template as { weeklySlots?: unknown } | null | undefined)?.weeklySlots;
  if (!Array.isArray(raw)) return [];

  const out: WeeklySlot[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const slot = entry as Record<string, unknown>;

    const dayOfWeek = Number(slot.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) continue;

    const startTime = typeof slot.startTime === "string" ? slot.startTime : "";
    const endTime = typeof slot.endTime === "string" ? slot.endTime : "";
    if (parseMinutes(startTime) == null || parseMinutes(endTime) == null) continue;

    out.push({ dayOfWeek, startTime, endTime });
  }
  return out;
}

/** Same cross-midnight handling as the session totals below. */
function spanMinutes(start: string | null, end: string | null): number | null {
  const s = parseMinutes(start);
  const e = parseMinutes(end);
  if (s == null || e == null) return null;
  let minutes = e - s;
  if (minutes <= 0) minutes += 24 * 60;
  return Math.max(0, Math.round(minutes));
}

/**
 * A slot whose start equals its end is half-typed, not a 24-hour class - but
 * the cross-midnight rule that correctly turns 23:30-01:00 into 90 minutes
 * turns 19:30-19:30 into 1440, which would then be accepted as a legitimate
 * length for any session of that class.
 */
function slotLengthMinutes(slot: WeeklySlot): number | null {
  const minutes = spanMinutes(slot.startTime, slot.endTime);
  if (minutes == null || minutes <= 0 || minutes >= 24 * 60) return null;
  return minutes;
}

/** Every length this class schedules, ascending. */
function configuredLengths(slots: WeeklySlot[], classDefault?: number | null): number[] {
  const lengths = new Set<number>();
  for (const slot of slots) {
    const minutes = slotLengthMinutes(slot);
    if (minutes != null) lengths.add(minutes);
  }
  if (lengths.size === 0 && classDefault && classDefault > 0) {
    lengths.add(Math.round(classDefault));
  }
  return [...lengths].sort((a, b) => a - b);
}

/**
 * Day of week for a YYYY-MM-DD session date, read as UTC. Session dates are
 * already Asia/Bangkok calendar dates (schedule-sessions derives them there),
 * so re-interpreting them in the server's zone could shift the weekday and
 * match a session to the wrong slot.
 */
function dayOfWeekFor(date: string | null | undefined): number | null {
  if (!date) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(parsed.getTime())) return null;
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed.getUTCDay();
}

/** The length this session's own day is scheduled for. */
function expectedLengthFor(
  date: string | null | undefined,
  startTime: string | null,
  slots: WeeklySlot[],
  classDefault?: number | null,
): number | null {
  const dayOfWeek = dayOfWeekFor(date);
  const sameDay = dayOfWeek == null ? [] : slots.filter((s) => s.dayOfWeek === dayOfWeek);

  let matched: WeeklySlot | null = null;
  if (sameDay.length === 1) {
    matched = sameDay[0];
  } else if (sameDay.length > 1) {
    // Two groups on one day: the nearest start time is this session's slot.
    const sessionStart = parseMinutes(startTime);
    if (sessionStart == null) {
      matched = sameDay[0];
    } else {
      let best = sameDay[0];
      let bestGap = Number.POSITIVE_INFINITY;
      for (const slot of sameDay) {
        const slotStart = parseMinutes(slot.startTime);
        if (slotStart == null) continue;
        const raw = Math.abs(slotStart - sessionStart);
        const gap = Math.min(raw, 1440 - raw);
        if (gap < bestGap) {
          bestGap = gap;
          best = slot;
        }
      }
      matched = best;
    }
  }

  const slotMinutes = matched ? slotLengthMinutes(matched) : null;
  if (slotMinutes != null) return slotMinutes;
  // Off-pattern date - a make-up or a one-off. The per-class number is all
  // there is to go on.
  if (classDefault && classDefault > 0) return Math.round(classDefault);
  return null;
}

function monthRange(month: string) {
  // month = "YYYY-MM"
  const start = `${month}-01`;
  const d = new Date(`${start}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const nextMonth = d.toISOString().slice(0, 10); // YYYY-MM-01 of next month
  return { startDate: start, nextMonthStart: nextMonth };
}

function parseMinutes(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":");
  const hh = Number(h);
  const mm = Number(m ?? "0");
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  return hh * 60 + mm;
}

/**
 * Totals a teacher's sessions, both as entered and as the classes are
 * configured.
 *
 * WHY BOTH. Pay here is hourly - amount = rate/60 * (end - start) - so the
 * end time on a session row is a multiplicand in a wage calculation. Until
 * now nothing compared that against classes.default_session_length_minutes,
 * which existed but fed no calculation at all. A class set up for 90 minutes
 * that someone entered as 2 hours quietly pays an extra half hour of that
 * teacher's rate, every time it runs, and nothing anywhere said so.
 *
 * So we return the amount as entered (what will actually be paid), the amount
 * the class settings imply, and the difference - which is the number an admin
 * needs in order to decide whether the roster or the class setting is wrong.
 */
function computeTotals(sessions: SessionRow[], hourlyRateVnd: number) {
  let totalMinutes = 0;
  let totalExpectedMinutes = 0;

  // A month of sessions for one class is dozens of rows off the same JSON,
  // so the template is parsed once per class rather than once per session.
  const slotCache = new Map<string, WeeklySlot[]>();
  const slotsForClass = (classId: string | undefined, classes: ClassRow | null) => {
    const key = classId ?? "";
    const cached = slotCache.get(key);
    if (cached) return cached;
    const parsed = parseWeeklySlots(classes?.schedule_template);
    slotCache.set(key, parsed);
    return parsed;
  };

  const perSession: Array<{
    id: string;
    date: string;
    start_time: string | null;
    end_time: string | null;
    status?: string;
    class_id?: string;
    classes?: { name: string } | null;
    minutes: number;
    amount: number;
    expectedMinutes: number | null;
    varianceMinutes: number | null;
    varianceAmount: number | null;
  }> = [];

  for (const s of sessions ?? []) {
    const startMin = parseMinutes(s.start_time);
    const endMin = parseMinutes(s.end_time);
    if (startMin == null || endMin == null) continue;

    let minutes = endMin - startMin;
    if (minutes <= 0) minutes += 24 * 60; // handle cross-midnight just in case

    minutes = Math.max(0, Math.round(minutes));
    const amount = Math.round((hourlyRateVnd / 60) * minutes);

    // Normalize classes to single object (Supabase may return array)
    const classes = Array.isArray(s.classes)
      ? (s.classes[0] || null)
      : (s.classes ?? null);

    const configured = classes?.default_session_length_minutes ?? null;
    const slots = slotsForClass(s.class_id, classes);
    // The length THIS day is scheduled for, not a single number for the
    // whole class.
    const expectedMinutes = expectedLengthFor(s.date, s.start_time, slots, configured);

    // A length the class genuinely runs on some other day is a reschedule,
    // not a data-entry error, so it is not a discrepancy and is priced at
    // what it actually ran.
    const runsAConfiguredLength = configuredLengths(slots, configured).includes(minutes);
    const isMismatch =
      expectedMinutes != null && minutes !== expectedMinutes && !runsAConfiguredLength;

    const varianceMinutes = isMismatch ? minutes - (expectedMinutes as number) : null;
    const varianceAmount =
      varianceMinutes == null ? null : Math.round((hourlyRateVnd / 60) * varianceMinutes);

    totalMinutes += minutes;
    // Only a genuine mismatch moves the projection away from what was
    // entered; anything else contributes its actual time, so the expected
    // total stays comparable rather than inventing a difference.
    totalExpectedMinutes += isMismatch ? (expectedMinutes as number) : minutes;

    perSession.push({
      id: s.id,
      date: s.date,
      start_time: s.start_time,
      end_time: s.end_time,
      status: s.status,
      class_id: s.class_id,
      classes: classes ? { name: classes.name } : null,
      minutes,
      amount,
      expectedMinutes,
      varianceMinutes,
      varianceAmount,
    });
  }

  const totalHours = +(totalMinutes / 60).toFixed(2);
  const totalAmount = Math.round((hourlyRateVnd / 60) * totalMinutes);
  const totalExpectedAmount = Math.round((hourlyRateVnd / 60) * totalExpectedMinutes);
  const discrepancies = perSession.filter((p) => (p.varianceMinutes ?? 0) !== 0);

  return {
    totalMinutes,
    totalHours,
    totalAmount,
    totalExpectedMinutes,
    totalExpectedHours: +(totalExpectedMinutes / 60).toFixed(2),
    totalExpectedAmount,
    varianceMinutes: totalMinutes - totalExpectedMinutes,
    varianceAmount: totalAmount - totalExpectedAmount,
    discrepancyCount: discrepancies.length,
    discrepancies,
    perSession,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization (admin or teacher)
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    const isTeacher = roles?.some(r => r.role === "teacher");

    if (!isAdmin && !isTeacher) {
      return new Response(JSON.stringify({ error: "Admin or teacher access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Input validation
    const requestBody = await req.json();
    const validationResult = PayrollRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { month, teacherId } = validationResult.data;
    const { startDate, nextMonthStart } = monthRange(month);

    // Teachers — scope non-admin teachers to their own data only
    let tq = supabase.from("teachers").select("id, full_name, hourly_rate_vnd, user_id").eq("is_active", true);

    if (isTeacher && !isAdmin) {
      const { data: ownTeacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!ownTeacher) {
        return new Response(JSON.stringify({ error: "Teacher profile not found" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      tq = tq.eq("id", ownTeacher.id);
    } else if (teacherId) {
      tq = tq.eq("id", teacherId);
    }

    const { data: teachers, error: teachersError } = await tq;
    if (teachersError) throw teachersError;

    const results: Array<{
      teacherId: string;
      teacherName: string;
      hourlyRate: number;
      sessionsCountActual: number;
      sessionsCountProjected: number;
      totalMinutesActual: number;
      totalHoursActual: number;
      totalAmountActual: number;
      totalMinutesProjected: number;
      totalHoursProjected: number;
      totalAmountProjected: number;
      // What the class settings say this month SHOULD cost, and the gap.
      totalAmountExpectedProjected: number;
      totalHoursExpectedProjected: number;
      varianceMinutesProjected: number;
      varianceAmountProjected: number;
      discrepancyCount: number;
      discrepancies: ReturnType<typeof computeTotals>["discrepancies"];
      sessionDetailsActual: ReturnType<typeof computeTotals>["perSession"];
      sessionDetailsProjected: ReturnType<typeof computeTotals>["perSession"];
      staffType?: string;
    }> = [];

    for (const t of teachers ?? []) {
      // Actual = Held only
      const { data: held, error: heldErr } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
        .eq("teacher_id", t.id)
        .eq("status", "Held")
        .gte("date", startDate)
        .lt("date", nextMonthStart);

      if (heldErr) throw heldErr;

      // Projected = Held + Scheduled (exclude Canceled)
      const { data: projected, error: projErr } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
        .eq("teacher_id", t.id)
        .in("status", ["Held", "Scheduled"])
        .gte("date", startDate)
        .lt("date", nextMonthStart);

      if (projErr) throw projErr;

      const actual = computeTotals(held ?? [], t.hourly_rate_vnd);
      const future = computeTotals(projected ?? [], t.hourly_rate_vnd);

      results.push({
        teacherId: t.id,
        teacherName: t.full_name,
        hourlyRate: t.hourly_rate_vnd,
        sessionsCountActual: held?.length ?? 0,
        sessionsCountProjected: projected?.length ?? 0,
        totalMinutesActual: actual.totalMinutes,
        totalHoursActual: actual.totalHours,
        totalAmountActual: actual.totalAmount,
        totalMinutesProjected: future.totalMinutes,
        totalHoursProjected: future.totalHours,
        totalAmountProjected: future.totalAmount,
        totalAmountExpectedProjected: future.totalExpectedAmount,
        totalHoursExpectedProjected: future.totalExpectedHours,
        varianceMinutesProjected: future.varianceMinutes,
        varianceAmountProjected: future.varianceAmount,
        discrepancyCount: future.discrepancyCount,
        discrepancies: future.discrepancies,
        sessionDetailsActual: actual.perSession,
        sessionDetailsProjected: future.perSession,
        staffType: "teacher",
      });

      // Upsert monthly summary for actuals (schema-safe)
      const { error: upErr } = await supabase.from("payroll_summaries").upsert(
        {
          teacher_id: t.id,
          month,
          total_hours: actual.totalHours,
          total_amount: actual.totalAmount,
          sessions_count: held?.length ?? 0,
        },
        { onConflict: "teacher_id,month", ignoreDuplicates: false },
      );
      if (upErr) throw upErr;
    }

    // Also calculate payroll for Teaching Assistants
    if (isAdmin) {
      const { data: assistants } = await supabase
        .from("teaching_assistants")
        .select("id, full_name, hourly_rate_vnd")
        .eq("is_active", true);

      for (const ta of assistants ?? []) {
        // Get sessions where this TA is a participant
        const { data: participations } = await supabase
          .from("session_participants")
          .select("session_id")
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", "teaching_assistant");

        const sessionIds = (participations || []).map(p => p.session_id);
        if (sessionIds.length === 0) continue;

        // Actual = Held sessions
        const { data: held } = await supabase
          .from("sessions")
          .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
          .in("id", sessionIds)
          .eq("status", "Held")
          .gte("date", startDate)
          .lt("date", nextMonthStart);

        // Projected = Held + Scheduled
        const { data: projected } = await supabase
          .from("sessions")
          .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
          .in("id", sessionIds)
          .in("status", ["Held", "Scheduled"])
          .gte("date", startDate)
          .lt("date", nextMonthStart);

        const actual = computeTotals(held ?? [], ta.hourly_rate_vnd);
        const future = computeTotals(projected ?? [], ta.hourly_rate_vnd);

        if (actual.totalMinutes > 0 || future.totalMinutes > 0) {
          results.push({
            teacherId: ta.id,
            teacherName: `${ta.full_name} (TA)`,
            hourlyRate: ta.hourly_rate_vnd,
            sessionsCountActual: held?.length ?? 0,
            sessionsCountProjected: projected?.length ?? 0,
            totalMinutesActual: actual.totalMinutes,
            totalHoursActual: actual.totalHours,
            totalAmountActual: actual.totalAmount,
            totalMinutesProjected: future.totalMinutes,
            totalHoursProjected: future.totalHours,
            totalAmountProjected: future.totalAmount,
            totalAmountExpectedProjected: future.totalExpectedAmount,
            totalHoursExpectedProjected: future.totalExpectedHours,
            varianceMinutesProjected: future.varianceMinutes,
            varianceAmountProjected: future.varianceAmount,
            discrepancyCount: future.discrepancyCount,
            discrepancies: future.discrepancies,
            sessionDetailsActual: actual.perSession,
            sessionDetailsProjected: future.perSession,
            staffType: "teaching_assistant",
          });
        }
      }
    }

    const body = {
      month,
      totalTeachers: results.length,
      grandTotalActual: results.reduce((s, r) => s + r.totalAmountActual, 0),
      grandTotalProjected: results.reduce((s, r) => s + r.totalAmountProjected, 0),
      // Projected at the durations the classes are configured for, plus the
      // gap against what the roster as entered will actually pay out.
      grandTotalExpectedProjected: results.reduce((s, r) => s + r.totalAmountExpectedProjected, 0),
      grandTotalVariance: results.reduce((s, r) => s + r.varianceAmountProjected, 0),
      totalDiscrepancies: results.reduce((s, r) => s + r.discrepancyCount, 0),
      payrollData: results,
    };

    return new Response(JSON.stringify(body), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("Payroll calculation error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    
    // Don't expose internal errors to client
    const safeMessage = msg.includes("month parameter") || msg.includes("Invalid") 
      ? msg 
      : "Failed to calculate payroll";
    
    return new Response(JSON.stringify({ error: safeMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
