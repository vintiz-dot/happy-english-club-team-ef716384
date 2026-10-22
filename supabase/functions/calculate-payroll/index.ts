// supabase/functions/calculate-payroll/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  describeQuantity,
  effectiveRateVnd,
  payRateTypeOf,
  sessionPayVnd,
  varianceCostVnd,
  type StaffPayRate,
} from "../_lib/pay-rate.ts";
import {
  indexPayRates,
  rateOnDate,
  recordOnDate,
  type PayRateRecord,
} from "../_lib/pay-history.ts";
import { requireRole } from "../_lib/auth.ts";
import {
  ACTUAL_SESSION_STATUSES,
  ASSISTANT_PARTICIPANT_TYPE,
  PROJECTED_SESSION_STATUSES,
  participationIsPayable,
} from "../_lib/payroll-sessions.ts";

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

/** A row of public.class_schedule_versions. Mirrors src/lib/scheduleHistory.ts. */
type ScheduleVersionRow = {
  class_id: string;
  effective_from: string;   // YYYY-MM-DD, inclusive
  weekly_slots: unknown;
  default_session_length_minutes: number | null;
};

/**
 * The version in force on a date, from a list sorted newest first.
 *
 * String comparison, not Date parsing: both sides are YYYY-MM-DD, which
 * sorts correctly as text, and parsing would drag a timezone into a
 * question that has none.
 */
function versionOnDate(
  sortedDesc: ScheduleVersionRow[] | undefined,
  date?: string | null,
): ScheduleVersionRow | null {
  if (!date || !sortedDesc?.length) return null;
  const day = date.slice(0, 10);
  for (const v of sortedDesc) {
    if (v.effective_from <= day) return v;
  }
  return null;
}

function indexScheduleVersions(rows: ScheduleVersionRow[] | null | undefined) {
  const byClass = new Map<string, ScheduleVersionRow[]>();
  for (const row of rows ?? []) {
    if (!row?.class_id) continue;
    const list = byClass.get(row.class_id);
    if (list) list.push(row);
    else byClass.set(row.class_id, [row]);
  }
  for (const list of byClass.values()) {
    list.sort((a, b) => (a.effective_from < b.effective_from ? 1 : a.effective_from > b.effective_from ? -1 : 0));
  }
  return byClass;
}

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
 *
 * FOR PER-SESSION STAFF none of that comparison has a price. A lesson that
 * runs long costs the same as one that runs short, so the expected totals
 * equal the actual totals and every varianceAmount is 0. The length
 * mismatch is still reported - it is a real scheduling problem - but it is
 * not reported as money, because for these staff it is not money.
 */
function computeTotals(
  sessions: SessionRow[],
  // The member of staff's own row. Used only where no rate record covers a
  // session's date - someone hired since the backfill. Same fallback as
  // public.teacher_rate_on, and the reason it is not an empty rate is that
  // an empty rate pays them nothing.
  fallbackRate: StaffPayRate,
  // Timetable history, newest first per class. A session is judged against
  // the schedule in force ON ITS OWN DATE: judging it against the class's
  // CURRENT template, which is what this did, turned every lesson already
  // taught into a "mismatch" the moment an admin changed the timetable, and
  // re-priced finished months at a length that was never scheduled when
  // they happened. Empty map = no history known, and every lookup falls
  // back to the class row exactly as before.
  versionsByClass: Map<string, ScheduleVersionRow[]> = new Map(),
  // Pay history for this one person, newest first. A session is priced at
  // the rate in force ON ITS OWN DATE. Pricing a whole month at the rate
  // the staff row happens to hold today - which is what this did - meant a
  // raise silently re-priced every month that person had ever worked, the
  // payroll_summaries row for each one being overwritten by the same run.
  // Empty list = no history known, and every lookup falls back to the staff
  // row exactly as before.
  ratesDesc: PayRateRecord[] = [],
) {
  let totalMinutes = 0;
  let totalExpectedMinutes = 0;

  // Cached per (class, version): a month can legitimately span a timetable
  // change now, so one entry per class is no longer enough, and one per
  // session would re-parse the same JSON dozens of times.
  const slotCache = new Map<string, WeeklySlot[]>();
  const scheduleFor = (classId: string | undefined, classes: ClassRow | null, date: string) => {
    const id = classId ?? "";
    const version = versionOnDate(versionsByClass.get(id), date);
    const key = `${id}|${version?.effective_from ?? "current"}`;
    const cached = slotCache.get(key);
    const slots = cached ?? parseWeeklySlots(
      version ? { weeklySlots: version.weekly_slots } : classes?.schedule_template,
    );
    if (!cached) slotCache.set(key, slots);
    return {
      slots,
      defaultMinutes:
        version?.default_session_length_minutes ?? classes?.default_session_length_minutes ?? null,
    };
  };

  const perSession: Array<{
    id: string;
    /** Priced at this session's own date's rate, like `amount`. */
    expectedAmount: number;
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
    const rate = rateOnDate(ratesDesc, s.date, fallbackRate);
    const amount = sessionPayVnd(rate, minutes);

    // Normalize classes to single object (Supabase may return array)
    const classes = Array.isArray(s.classes)
      ? (s.classes[0] || null)
      : (s.classes ?? null);

    const { slots, defaultMinutes: configured } = scheduleFor(s.class_id, classes, s.date);
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
      varianceMinutes == null ? null : varianceCostVnd(rate, varianceMinutes);

    totalMinutes += minutes;
    // Only a genuine mismatch moves the projection away from what was
    // entered; anything else contributes its actual time, so the expected
    // total stays comparable rather than inventing a difference.
    totalExpectedMinutes += isMismatch ? (expectedMinutes as number) : minutes;

    // Priced here rather than summed from minutes at the end, because the
    // rate is no longer one number for the month.
    const expectedAmount = sessionPayVnd(
      rate,
      varianceMinutes == null ? minutes : (expectedMinutes as number),
    );

    perSession.push({
      id: s.id,
      expectedAmount,
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
  // Summed from the per-session amounts rather than from totalMinutes, so
  // a per-session member of staff is paid once per session and the rows an
  // admin can see always add up to this total. For hourly staff that moves
  // the figure by a few VND a month against the old round-once-at-the-end
  // form - see the rounding note in _lib/pay-rate.ts, which is also where
  // the admin screen and this function stopped disagreeing.
  const totalAmount = perSession.reduce((n, p) => n + p.amount, 0);
  // What the class settings imply. For per-session staff the length does not
  // move the money, so this equals totalAmount by construction.
  // Summed from the per-session figures for the same reason totalAmount is:
  // each one was priced at the rate in force on its own date, so there is no
  // single rate left to hand to totalPayVnd. Rounding is unchanged - both
  // forms round once per session and then add.
  const totalExpectedAmount = perSession.reduce((n, p) => n + p.expectedAmount, 0);
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

    // WHO IS CALLING. requireRole decodes the token rather than trusting
    // that one arrived, and lets an internal call holding the service-role
    // key through. That is what the schedule generator runs on after every
    // rebuild: `auth.getUser` has no user for a service key, so this
    // function answered 401 to the generator and payroll was never
    // refreshed by a timetable change - the failure was logged and thrown
    // away by the caller, so nothing ever showed it.
    const gate = await requireRole(req, supabase, ["admin", "teacher"], corsHeaders);
    if (gate instanceof Response) return gate;

    const isAdmin = gate.isServiceRole || gate.roles.has("admin");
    const isTeacher = gate.roles.has("teacher");
    const userId = gate.userId;

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

    // Teachers — scope non-admin teachers to their own data only.
    //
    // NOT filtered by is_active, deliberately. Archiving or deactivating a
    // teacher must not erase work they have already done: the filter used
    // to be `.eq("is_active", true)`, so archiving someone on the 20th
    // silently dropped the first nineteen days of their month out of the
    // payroll run and out of the CSV, and nothing said so. is_active is
    // their status TODAY; the question here is what they are owed for a
    // month that has already happened.
    //
    // Inactive staff with no sessions in the month are dropped further
    // down instead, which keeps the screen uncluttered — the thing the
    // is_active filter was actually added for.
    let tq = supabase
      .from("teachers")
      .select("id, full_name, hourly_rate_vnd, pay_rate_type, per_session_rate_vnd, is_active, user_id");

    if (isTeacher && !isAdmin) {
      const { data: ownTeacher } = await supabase
        .from("teachers")
        .select("id")
        .eq("user_id", userId)
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

    // Timetable history for every class, read once. A session is priced
    // against the schedule in force on its own date, so a class that
    // changed pattern mid-year is still judged correctly for both halves.
    const { data: scheduleVersions } = await supabase
      .from("class_schedule_versions")
      .select("class_id, effective_from, weekly_slots, default_session_length_minutes");
    const versionsByClass = indexScheduleVersions(scheduleVersions as ScheduleVersionRow[] | null);

    // Pay history for everyone, read once for the same reason. A rate is a
    // fact about a period of work, so a session is priced at the rate in
    // force on its own date - not at whatever the staff row holds when the
    // report is opened.
    //
    // Hard failure rather than a fallback. Falling back to the staff row
    // would price a finished month at today's rate and report it as the
    // answer, which is precisely the bug staff_pay_rates exists to remove.
    const { data: payRateRows, error: payRateErr } = await supabase
      .from("staff_pay_rates")
      .select("teacher_id, assistant_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd");
    if (payRateErr) throw payRateErr;
    const ratesByStaff = indexPayRates(payRateRows as PayRateRecord[] | null);

    // IS THIS MONTH CLOSED. A closed month reports what it was closed at,
    // not what it would cost if recomputed now. Sessions and attendance in
    // a closed month stay editable - correcting attendance after the fact
    // is normal work - so the recomputed figure is kept alongside as
    // liveTotalAmountActual and the difference is shown as a variance the
    // admin can carry into a later month, rather than silently restating
    // what was paid.
    const { data: period } = await supabase
      .from("payroll_periods")
      .select("month, status, locked_at")
      .eq("month", month)
      .maybeSingle();
    const periodLocked = period?.status === "locked";

    const { data: lockedLines } = periodLocked
      ? await supabase
          .from("payroll_lines")
          .select("teacher_id, assistant_id, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, sessions_count, total_minutes, total_amount_vnd")
          .eq("month", month)
      : { data: null };
    const linesByStaff = new Map<string, NonNullable<typeof lockedLines>[number]>();
    for (const l of lockedLines ?? []) {
      const id = l.teacher_id ?? l.assistant_id;
      if (id) linesByStaff.set(id, l);
    }

    // Corrections to earlier closed months, paid in this one.
    const { data: adjustmentRows } = await supabase
      .from("payroll_adjustments")
      .select("teacher_id, assistant_id, amount_vnd, reason, origin_month")
      .eq("month", month);
    const adjustmentsByStaff = new Map<string, NonNullable<typeof adjustmentRows>>();
    for (const a of adjustmentRows ?? []) {
      const id = a.teacher_id ?? a.assistant_id;
      if (!id) continue;
      const list = adjustmentsByStaff.get(id);
      if (list) list.push(a);
      else adjustmentsByStaff.set(id, [a]);
    }

    // The last day of the month being reported. What the screen prints as
    // "their rate" for a finished month is the rate they were on at the end
    // of it - not today's. Where a rate changed mid-month the per-session
    // figures are each correct and this header number is the later of the
    // two, which is why rateChangedInMonth is reported alongside it.
    const monthEnd = new Date(Date.UTC(
      Number(month.slice(0, 4)),
      Number(month.slice(5, 7)),
      0,
    )).toISOString().slice(0, 10);

    /** The rate to PRINT for a month, and whether it moved during it. */
    const headlineRate = (staffId: string, row: StaffPayRate) => {
      const records = ratesByStaff.get(staffId) ?? [];
      const atEnd = rateOnDate(records, monthEnd, row);
      const atStart = recordOnDate(records, `${month}-01`);
      const endRecord = recordOnDate(records, monthEnd);
      return {
        rate: atEnd,
        changedInMonth: (atStart?.effective_from ?? null) !== (endRecord?.effective_from ?? null),
      };
    };

    const results: Array<{
      teacherId: string;
      teacherName: string;
      /** The rate in force, in the unit `payRateType` names. */
      hourlyRate: number;
      payRateType: "hourly" | "per_session";
      perSessionRate: number;
      /** The rate moved part-way through this month; `hourlyRate` is the later one. */
      rateChangedInMonth: boolean;
      /** Set only on a closed month: what the figures would be if recomputed now. */
      liveTotalAmountActual?: number;
      /** Corrections to earlier closed months, falling due in this one. */
      adjustmentVnd?: number;
      adjustments?: Array<{ amountVnd: number; reason: string; originMonth: string }>;
      /** "12.5 h" or "9 sessions" - whichever the pay basis makes true. */
      quantityLabel: string;
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
      // Actual and projected are defined in ../_lib/payroll-sessions.ts,
      // which is a byte-identical copy of src/lib/payrollSessions.ts. The
      // admin Payroll screen reads the original. Neither file may answer
      // "which lessons count" on its own.
      const { data: held, error: heldErr } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
        .eq("teacher_id", t.id)
        .in("status", [...ACTUAL_SESSION_STATUSES])
        .gte("date", startDate)
        .lt("date", nextMonthStart);

      if (heldErr) throw heldErr;

      const { data: projected, error: projErr } = await supabase
        .from("sessions")
        .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
        .eq("teacher_id", t.id)
        .in("status", [...PROJECTED_SESSION_STATUSES])
        .gte("date", startDate)
        .lt("date", nextMonthStart);

      if (projErr) throw projErr;

      const teacherRates = ratesByStaff.get(t.id) ?? [];
      const actual = computeTotals(held ?? [], t, versionsByClass, teacherRates);
      const future = computeTotals(projected ?? [], t, versionsByClass, teacherRates);
      const headline = headlineRate(t.id, t);

      // An archived teacher with nothing on the books this month is noise;
      // one with sessions is owed money. This is the filter that replaces
      // the blanket .eq("is_active", true) on the query.
      if (t.is_active === false && (projected?.length ?? 0) === 0) continue;

      results.push({
        teacherId: t.id,
        teacherName: t.is_active === false ? `${t.full_name} (archived)` : t.full_name,
        hourlyRate: effectiveRateVnd(headline.rate),
        payRateType: payRateTypeOf(headline.rate),
        perSessionRate: headline.rate.per_session_rate_vnd,
        rateChangedInMonth: headline.changedInMonth,
        quantityLabel: describeQuantity(headline.rate, {
          sessions: held?.length ?? 0,
          minutes: actual.totalMinutes,
        }),
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

      // Upsert monthly summary for actuals (schema-safe).
      //
      // Skipped once the month is closed. payroll_summaries is rewritten
      // on every call, and this function is invoked by useFinanceSummary
      // and useFinanceOverview as part of a READ - so without this guard,
      // opening the finance dashboard would try to restate a closed month,
      // the trigger from 20261021093000 would refuse it, and the throw
      // would take the whole dashboard down.
      const { error: upErr } = periodLocked ? { error: null } : await supabase.from("payroll_summaries").upsert(
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
        // Same reasoning as the teachers query above: an archived TA is
        // still owed for the lessons they assisted before they left.
        .select("id, full_name, hourly_rate_vnd, pay_rate_type, per_session_rate_vnd, is_active");

      for (const ta of assistants ?? []) {
        // Lessons this TA is on, minus the ones they missed. The rule is
        // participationIsPayable in ../_lib/payroll-sessions.ts; the query
        // narrows on the same terms for bandwidth and the predicate
        // decides, so this and the admin screen cannot disagree.
        const { data: participations } = await supabase
          .from("session_participants")
          .select("session_id, teaching_assistant_id, participant_type, attended")
          .eq("teaching_assistant_id", ta.id)
          .eq("participant_type", ASSISTANT_PARTICIPANT_TYPE)
          .neq("attended", false);

        const sessionIds = (participations || [])
          .filter(participationIsPayable)
          .map(p => p.session_id);
        if (sessionIds.length === 0) continue;

        const { data: held } = await supabase
          .from("sessions")
          .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
          .in("id", sessionIds)
          .in("status", [...ACTUAL_SESSION_STATUSES])
          .gte("date", startDate)
          .lt("date", nextMonthStart);

        const { data: projected } = await supabase
          .from("sessions")
          .select("id, date, start_time, end_time, status, class_id, classes(name, default_session_length_minutes, schedule_template)")
          .in("id", sessionIds)
          .in("status", [...PROJECTED_SESSION_STATUSES])
          .gte("date", startDate)
          .lt("date", nextMonthStart);

        const taRates = ratesByStaff.get(ta.id) ?? [];
        const actual = computeTotals(held ?? [], ta, versionsByClass, taRates);
        const future = computeTotals(projected ?? [], ta, versionsByClass, taRates);
        const headline = headlineRate(ta.id, ta);

        if (actual.totalMinutes > 0 || future.totalMinutes > 0) {
          results.push({
            teacherId: ta.id,
            teacherName: ta.is_active === false
              ? `${ta.full_name} (TA, archived)`
              : `${ta.full_name} (TA)`,
            hourlyRate: effectiveRateVnd(headline.rate),
            payRateType: payRateTypeOf(headline.rate),
            perSessionRate: headline.rate.per_session_rate_vnd,
            rateChangedInMonth: headline.changedInMonth,
            quantityLabel: describeQuantity(headline.rate, {
              sessions: held?.length ?? 0,
              minutes: actual.totalMinutes,
            }),
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

    // What a closed month reports, and what a correction adds to an open
    // one. Done here rather than inside the two staff loops because it is
    // the same rule for teachers and assistants and should read that way.
    for (const r of results) {
      const line = linesByStaff.get(r.teacherId);
      if (periodLocked && line) {
        r.liveTotalAmountActual = r.totalAmountActual;
        r.totalAmountActual = line.total_amount_vnd;
        r.sessionsCountActual = line.sessions_count;
        r.totalMinutesActual = line.total_minutes;
        r.totalHoursActual = +(line.total_minutes / 60).toFixed(2);
        r.payRateType = line.pay_rate_type as "hourly" | "per_session";
        r.hourlyRate = line.pay_rate_type === "hourly"
          ? line.hourly_rate_vnd
          : line.per_session_rate_vnd;
        r.perSessionRate = line.per_session_rate_vnd;
      }
      const adj = adjustmentsByStaff.get(r.teacherId) ?? [];
      if (adj.length > 0) {
        r.adjustmentVnd = adj.reduce((n, a) => n + a.amount_vnd, 0);
        r.adjustments = adj.map((a) => ({
          amountVnd: a.amount_vnd,
          reason: a.reason,
          originMonth: a.origin_month,
        }));
      }
    }

    const body = {
      month,
      locked: periodLocked,
      lockedAt: period?.locked_at ?? null,
      // Corrections to earlier closed months that fall due in this one.
      // Kept out of grandTotalActual, which answers "what did this month's
      // work cost"; this answers "what goes out this month".
      grandTotalAdjustments: results.reduce((s, r) => s + (r.adjustmentVnd ?? 0), 0),
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
