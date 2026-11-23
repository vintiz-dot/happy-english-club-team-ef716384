// supabase/functions/calculate-tuition/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_lib/rate-limit.ts";
import { requireRole, callerOwnsStudent } from "../_lib/auth.ts";
import { resolveSiblingStates } from "../_lib/sibling-state.ts";
import { enrollmentOn, inCreationOrder } from "../_lib/enrollment-discounts.ts";
import { classFeeOn, readClassFeeHistory } from "../_lib/class-fee.ts";
import { priceStudentMonth, type MonthDiscount } from "../_lib/tuition-pricing.ts";
import { refreshableMonths } from "../_lib/bill-refresh.ts";
import { clockNow } from "../_lib/clock.ts";
import {
  decidePastMonth,
  figuresOf,
  isClosedMonth,
  PAST_MONTH_DIFFERS,
  PAST_MONTH_REPRICED,
  pastMonthDiffersFlag,
  pastMonthHeld,
  pastMonthRepricedFlag,
} from "../_lib/past-month-hold.ts";
import {
  invoiceLabelFields,
  monthCharged,
  monthPayable,
  paidLabel,
} from "../_lib/invoice-status.ts";
import {
  findRegisterHoles,
  hanoiToday,
  LOWERED_DESPITE_MISSING_MARKS,
  missingMarksFlag,
  REGISTER_MISSING_MARKS,
  sameFlags,
} from "../_lib/register-holes.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AttendanceStatus = "Present" | "Absent" | "Excused" | "Late";

interface SessionRow {
  id: string;
  date: string; // YYYY-MM-DD
  status: "Scheduled" | "Held" | "Canceled";
  class_id: string;
  classes: { session_rate_vnd: number } | { session_rate_vnd: number }[] | null;
}

interface EnrollmentRow {
  class_id: string;
  discount_type: "percent" | "amount" | null;
  discount_value: number | null;
  discount_cadence: "monthly" | "yearly" | "once" | null;
  rate_override_vnd: number | null;
  allowed_days: number[] | null; // Array of weekday numbers (0=Sun, 1=Mon, etc.)
}

// Helper to get day of week from date string (in Bangkok timezone)
function getDayOfWeek(dateStr: string): number {
  const date = new Date(`${dateStr}T12:00:00+07:00`);
  return date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
}

function monthRange(month: string) {
  const startDate = `${month}-01`;
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const nextMonthStart = d.toISOString().slice(0, 10); // YYYY-MM-01
  return { startDate, nextMonthStart };
}

function sumPayments(rows: any[] | null | undefined) {
  if (!rows) return 0;
  return rows.reduce((s, r) => {
    const amt = Number(r.amount_vnd ?? r.amount ?? 0);
    return s + (Number.isFinite(amt) ? amt : 0);
  }, 0);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Rate limit by IP
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit(clientIP, 30, 60000, "ip");

    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit.resetAt, corsHeaders);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Admins, and students / parents for their OWN children only. This ran
    // on the service role and never looked at who was calling, so any
    // signed-in account could act on any child's data. Locking it to admins
    // alone then broke the student and parent Tuition pages, which read
    // their bill through this function - hence the ownership check below.
    // Service-to-service calls still pass - see requireRole.
    const gate = await requireRole(req, supabase, ["admin", "student", "family"], corsHeaders);
    if (gate instanceof Response) return gate;

    // Validate input
    const InputSchema = z.object({
      studentId: z.string().uuid("Invalid student ID format"),
      month: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format. Expected YYYY-MM"),
      // Internal preview used by the sibling calculator to avoid recursion/writes.
      siblingPreview: z.boolean().optional().default(false),
      // An admin may approve a closed month's new figures, with a reason
      // (_lib/past-month-hold.ts). Ignored for anyone else.
      force: z.boolean().optional().default(false),
      reason: z.string().max(500).optional(),
    });

    const { studentId, month, siblingPreview, force, reason } = InputSchema.parse(await req.json());
    if (siblingPreview && !gate.isServiceRole) {
      return new Response(JSON.stringify({ error: "Internal preview only" }), { status: 403, headers: corsHeaders });
    }
    if (!gate.isServiceRole && !gate.roles.has("admin") && !(await callerOwnsStudent(supabase, gate, studentId))) {
      return new Response(JSON.stringify({ error: 'Not your student' }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!studentId || !month) throw new Error("Missing studentId or month (YYYY-MM)");

    const { startDate, nextMonthStart } = monthRange(month);

    // ----- Wave 1: independent queries (only depend on studentId/month) -----
    const [
      studentRes,
      enrollmentsRes,
      discountAssignmentsRes,
      referralBonusesRes,
      priorInvoicesRes,
      currentInvoiceRes,
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id, family_id, families(id, sibling_percent_override)")
        .eq("id", studentId)
        .single(),
      supabase
        .from("enrollments")
        .select(
          "id, created_at, class_id, discount_type, discount_value, discount_cadence, start_date, end_date, rate_override_vnd, allowed_days",
        )
        .eq("student_id", studentId),
      supabase
        .from("discount_assignments")
        .select("discount_definitions(*)")
        .eq("student_id", studentId)
        // In force on at least one day of the month: started before the next
        // month begins. (It was "on or before", so a discount starting on the
        // 1st also cut the month before it.)
        .lt("effective_from", nextMonthStart)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`),
      supabase
        .from("referral_bonuses")
        .select("*")
        .eq("student_id", studentId)
        // In force on at least one day of the month: started before the next
        // month begins. (It was "on or before", so a discount starting on the
        // 1st also cut the month before it.)
        .lt("effective_from", nextMonthStart)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`),
      supabase
        .from("invoices")
        .select("total_amount, month, recorded_payment, class_breakdown")
        .neq("month", month)
        .eq("student_id", studentId)
        .order("month", { ascending: true }),
      supabase
        .from("invoices")
        .select(
          "recorded_payment, tuition_frozen, base_amount, discount_amount, total_amount, status, confirmation_status, review_flags, confirmed_at, confirmed_by, class_breakdown, paid_amount, carry_in_credit, carry_in_debt, carry_out_credit, carry_out_debt",
        )
        .eq("student_id", studentId)
        .eq("month", month)
        .maybeSingle(),
    ]);

    const { data: student, error: studentError } = studentRes;
    if (studentError) throw studentError;
    const { data: enrollmentRows, error: enrollErr } = enrollmentsRes;
    if (enrollErr) throw enrollErr;
    // The query has no ORDER BY. Creation order, stated: where two rows of one
    // class overlap, the one created first prices the lesson - the same rule,
    // by the same helper, as calculate-tuition-bulk. See enrollment-discounts.ts.
    const enrollments: any[] = inCreationOrder<any>(enrollmentRows);
    // The month's own bill carries this month's payment and the labels an
    // admin or a payment put on it. If it cannot be read, stop: carrying on
    // as if there were no bill would save recorded_payment 0 over a payment
    // and reset a confirmed or paid bill.
    if (currentInvoiceRes.error) throw new Error("Unable to read the current tuition invoice");
    // The other months carry the balance brought in. Unread, they would
    // count as "no earlier payments": a wrong carry in the answer and a
    // wrong paid label saved.
    if (priorInvoicesRes.error) throw new Error("Unable to read the earlier tuition invoices");
    // Every read that prices the month fails the call: a discount or bonus
    // silently left out is a wrong charge saved over the bill.
    if (discountAssignmentsRes.error) throw new Error("Unable to read the student's discounts");
    if (referralBonusesRes.error) throw new Error("Unable to read the student's referral bonuses");
    const discountAssignments = discountAssignmentsRes.data;
    const referralBonuses = referralBonusesRes.data;

    // Extract family data if it's an array, handle null families
    const family = student?.families
      ? Array.isArray(student.families)
        ? student.families[0]
        : student.families
      : null;

    const activeClassIds = (enrollments ?? [])
      .filter((e) => !e.end_date || e.end_date >= startDate) // still active in this month
      .map((e) => e.class_id);

    // ----- Wave 2: sessions + sibling state + the classes' fee history (depend on Wave 1) -----
    // The fee history (D4 step 2, _lib/class-fee.ts) prices each lesson at the
    // fee in force on its date; without the table every lesson is at the
    // class's session_rate_vnd, as before.
    const [sessionsRes, siblingStateRes, feeHistory] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, date, status, class_id, classes(session_rate_vnd)")
        .in("class_id", activeClassIds.length ? activeClassIds : ["00000000-0000-0000-0000-000000000000"])
        .gte("date", startDate)
        .lt("date", nextMonthStart)
        // Cancelled lessons are read too: they are listed, never billed.
        .in("status", ["Scheduled", "Held", "Canceled"]),
      family?.id
        ? resolveSiblingStates(supabase, [family.id], month, !siblingPreview).then((states) => ({
            data: states[0] ?? null,
          }))
        : Promise.resolve({ data: null as any }),
      readClassFeeHistory(supabase, activeClassIds),
    ]);
    const { data: sessions, error: sessErr } = sessionsRes;
    if (sessErr) throw sessErr;

    // ----- Wave 3: attendance + class names (depend on Wave 2) -----
    const sessionIds = (sessions ?? []).map((s) => s.id);
    const classIdsForNames = [...new Set((sessions ?? []).map((s) => s.class_id))];
    const [attendanceRes, classesNamesRes] = await Promise.all([
      sessionIds.length
        ? supabase
            .from("attendance")
            .select("session_id, status")
            .in("session_id", sessionIds)
            .eq("student_id", studentId)
        : Promise.resolve({ data: [] as any[], error: null as any }),
      classIdsForNames.length
        ? supabase.from("classes").select("id, name").in("id", classIdsForNames)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    if ((attendanceRes as any).error) throw (attendanceRes as any).error;
    const attendanceMap = new Map<string, AttendanceStatus>();
    for (const a of (attendanceRes.data as any[]) ?? []) attendanceMap.set(a.session_id, a.status);

    // Class names already fetched in Wave 3
    const classNameMap = new Map((classesNamesRes.data as any[])?.map((c: any) => [c.id, c.name]) || []);

    const savedInvoice: any = currentInvoiceRes.data;
    // A frozen bill keeps its saved figures whatever the enrollment says now.
    const tuitionFrozen = savedInvoice?.tuition_frozen === true;

    // The class's own rate, for dates its fee history does not cover.
    const classRate = new Map<string, number>();
    for (const s of (sessions ?? []) as any[]) {
      if (classRate.has(s.class_id)) continue;
      const cd: any = s.classes ? (Array.isArray(s.classes) ? s.classes[0] : s.classes) : null;
      classRate.set(s.class_id, Number(cd?.session_rate_vnd ?? 0));
    }
    const feeOn = (classId: string, date: string) => classFeeOn(feeHistory, classId, date, classRate.get(classId) ?? 0);

    // The student's own discounts and bonuses (already fetched in Wave 1).
    const monthDiscounts: MonthDiscount[] = [];
    for (const a of discountAssignments ?? []) {
      const def = (a as any).discount_definitions;
      if (!def || !def.is_active) continue;
      monthDiscounts.push({ name: def.name, type: def.type, value: def.value });
    }
    for (const b of referralBonuses ?? []) monthDiscounts.push({ name: "Referral Bonus", type: b.type, value: b.value });

    // The family's sibling discount, when this child holds it (fetched in Wave 2).
    let siblingState: any = null;
    let siblingAward: { percent: number; classId: string } | null = null;
    if (family?.id) {
      const sd = (siblingStateRes as any).data;
      if (sd) {
        siblingState = {
          status: sd.status,
          percent: sd.sibling_percent,
          reason: sd.reason,
          isWinner: sd.winner_student_id === studentId,
          winnerClassId: sd.winner_class_id,
        };
        if (sd.status === "assigned" && sd.winner_student_id === studentId && sd.winner_class_id) {
          siblingAward = { percent: Number(sd.sibling_percent ?? 0), classId: sd.winner_class_id };
        }
      }
    }

    // THE PRICE. Every rule is in _lib/tuition-pricing.ts (the owner's, 23 Nov
    // 2026): a lesson is billed unless it is cancelled or the child is Excused,
    // a mark or no mark; the custom rate IS the price; the enrollment's terms,
    // then fixed amounts, then percentages on what is left, then the sibling
    // percentage on the winner class's share. Nothing is priced in this file.
    const pricedMonth = priceStudentMonth({
      enrollments,
      sessions: (sessions ?? []) as any[],
      markOf: (sessionId: string) => attendanceMap.get(sessionId),
      classFeeOn: feeOn,
      monthDiscounts,
      sibling: siblingAward,
    });
    // projected: the whole month as the timetable stands - the bill.
    // actual: the lessons already held - shown to admins beside it.
    const projected = pricedMonth.projected;
    const actual = pricedMonth.actual;
    const computed = { base: projected.baseAmount, discount: projected.totalDiscount, total: projected.totalAmount };
    const expectedClassTuition = projected.expectedClassTuition;

    // Lessons that were held, inside the enrolment, with no attendance row at
    // all: holes in the register (_lib/register-holes.ts). They ARE billed (a
    // missing mark never shrinks a bill); they are found so the bill can say
    // which lessons nobody marked. A frozen bill is left as it is.
    const registerHoles =
      tuitionFrozen
        ? []
        : findRegisterHoles<any, any>((sessions ?? []) as any[], attendanceMap, hanoiToday(), {
            enrollmentFor: (s: any) => enrollmentOn(enrollments, s.class_id, s.date),
            onAllowedDay: (s: any, e: any) => !e.allowed_days || e.allowed_days.includes(getDayOfWeek(s.date)),
            rateOf: (s: any, e: any) => e.rate_override_vnd ?? feeOn(s.class_id, s.date),
          });
    const holeIds = new Set(registerHoles.map((h) => h.session_id));
    const holeLessons = registerHoles.map((h) => ({
      date: h.date,
      class_name: (classNameMap.get(h.class_id) as string | undefined) || "Unknown",
    }));
    // What the month would come to without the unmarked lessons.
    const registerBase =
      computed.base -
      pricedMonth.lessons
        .filter((l) => l.state === "billed" && holeIds.has(l.session_id))
        .reduce((n, l) => n + l.price_vnd, 0);
    const savedBase = savedInvoice ? Number(savedInvoice.base_amount ?? 0) : null;

    // Every lesson of the month that concerns the child, billed or not.
    const lessonList = pricedMonth.lessons.map((l) => ({
      session_id: l.session_id,
      date: l.date,
      class_id: l.class_id,
      class_name: (classNameMap.get(l.class_id) as string | undefined) || "Unknown",
      price_vnd: l.price_vnd,
      mark: l.mark,
      held: l.held,
      state: l.state, // billed | excused | cancelled | free
      ...(l.state === "billed" && holeIds.has(l.session_id) ? { unmarked: true } : {}),
    }));
    // The lines the screens have always read: the billed lessons, and the
    // marked ones that are not billed (Excused, or a free place).
    const sessionDetails: Array<{
      date: string;
      rate: number;
      status: AttendanceStatus | "Scheduled";
      class_id: string;
      class_name: string;
      unmarked?: boolean;
    }> = lessonList
      .filter((l) => l.state === "billed" || ((l.state === "excused" || l.state === "free") && !!l.mark))
      .map((l) => ({
        date: l.date,
        rate: l.price_vnd,
        status: (l.state === "billed" ? (l.mark ?? "Present") : l.mark) as AttendanceStatus,
        class_id: l.class_id,
        class_name: l.class_name,
        ...((l as any).unmarked ? { unmarked: true } : {}),
      }));

    const discounts: Array<{
      name: string;
      type: "percent" | "amount";
      value: number;
      amount: number;
      [k: string]: any;
    }> = projected.discounts;

    let baseAmount = computed.base;
    let totalDiscount = computed.discount;
    let totalAmount = computed.total;
    const frozenInvoice: any = savedInvoice;
    if (tuitionFrozen) {
      baseAmount = Number(frozenInvoice.base_amount ?? 0);
      totalDiscount = Number(frozenInvoice.discount_amount ?? 0);
      totalAmount = Number(frozenInvoice.total_amount ?? 0);
    }

    // A CLOSED month's saved bill never changes on its own (_lib/past-month-hold.ts):
    // when today's pricing gives other figures the saved ones stand, the bill is
    // flagged, and only an admin's approval with a reason saves the new ones.
    // The internal sibling preview prices by the rules and writes nothing, and a
    // month whose family discount is still being decided is not saved at all, so
    // neither is judged.
    const siblingUnresolved = siblingState?.status === "unresolved";
    const savedFigures = savedInvoice ? figuresOf(savedInvoice) : null;
    const mayForce = force === true && gate.roles.has("admin") && !gate.isServiceRole;
    const pastMode =
      siblingPreview || siblingUnresolved
        ? "normal"
        : decidePastMonth({
            closed: isClosedMonth(month, refreshableMonths(clockNow())),
            saved: savedFigures,
            frozen: tuitionFrozen,
            next: computed,
            approved: mayForce,
          });
    const heldBill = pastMode === "held";
    // Same total, split differently between base and discount: kept as saved, silently.
    const keptBill = pastMode === "kept";
    // Either way the saved bill is what is answered and what stays saved.
    const asSaved = heldBill || keptBill;
    const approvedChange = pastMode === "approved";
    if (approvedChange && !(reason ?? "").trim()) throw new Error("Give a reason to change a closed month's bill.");
    if (asSaved) {
      baseAmount = savedFigures!.base;
      totalDiscount = savedFigures!.discount;
      totalAmount = savedFigures!.total;
    }

    // ---------- Payments and carryovers ----------
    // Prior charges and current month invoice already fetched in Wave 1
    const otherInvoicesDetailed: any[] = priorInvoicesRes.data ?? [];
    const priorInvoicesDetailed = otherInvoicesDetailed.filter((inv) => inv.month < month);
    const futureInvoicesDetailed = otherInvoicesDetailed.filter((inv) => inv.month > month);
    const priorCharges = priorInvoicesDetailed.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const priorPayments = priorInvoicesDetailed.reduce((s, inv) => s + Number(inv.recorded_payment ?? 0), 0);
    const monthPayments = Number(currentInvoiceRes.data?.recorded_payment ?? 0);

    // Build prior balance breakdown for detailed view
    const priorBalanceBreakdown: {
      months: Array<{
        month: string;
        label: string;
        charges: number;
        payments: number;
        netBalance: number;
        items: Array<{
          type: "charge" | "payment" | "canceled";
          className?: string;
          classId?: string;
          amount: number;
          description: string;
          date?: string;
        }>;
      }>;
      summary: {
        totalPriorCharges: number;
        totalPriorPayments: number;
        netCarryIn: number;
      };
    } = {
      months: [],
      summary: {
        totalPriorCharges: priorCharges,
        totalPriorPayments: priorPayments,
        netCarryIn: 0, // Will be set after calculation
      },
    };

    // Build month-by-month breakdown from prior invoices
    for (const invoice of priorInvoicesDetailed) {
      const invoiceMonth = invoice.month;
      const invoiceDate = new Date(`${invoiceMonth}-01T12:00:00+07:00`);
      const monthLabel = invoiceDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      });

      const items: (typeof priorBalanceBreakdown.months)[0]["items"] = [];
      const classBreakdownData = invoice.class_breakdown || [];

      // Add class charges from breakdown
      for (const classItem of classBreakdownData) {
        items.push({
          type: "charge",
          className: classItem.class_name,
          classId: classItem.class_id,
          amount: -Number(classItem.amount_vnd || 0),
          description: `${classItem.sessions_count || 0} sessions`,
        });
      }

      // Add payment if any
      const recordedPayment = Number(invoice.recorded_payment ?? 0);
      if (recordedPayment > 0) {
        items.push({
          type: "payment",
          amount: recordedPayment,
          description: "Payment received",
        });
      }

      const invoiceCharges = Number(invoice.total_amount ?? 0);
      const netBalance = recordedPayment - invoiceCharges;

      priorBalanceBreakdown.months.push({
        month: invoiceMonth,
        label: monthLabel,
        charges: invoiceCharges,
        payments: recordedPayment,
        netBalance,
        items,
      });
    }

    // Carry-in (credit positive, debt negative)
    const carryInBalance = priorPayments - priorCharges;
    const carryInCredit = carryInBalance > 0 ? carryInBalance : 0;
    const carryInDebt = carryInBalance < 0 ? Math.abs(carryInBalance) : 0;

    // Update summary with final carry-in
    priorBalanceBreakdown.summary.netCarryIn = carryInBalance;

    // Closing balance for this month: current charges - carry-in credit + carry-in debt - current payments
    // carryInBalance > 0 means credit (reduces what's owed), < 0 means debt (increases what's owed)
    // What the month asks for before this month's payment: its charge plus
    // debt carried in, less credit carried in (negative when the credit is
    // larger). Returned as carry.payable so no screen adds it up, and the
    // figure the paid label is judged against - one arithmetic for both.
    const payable = monthPayable({ total_amount: totalAmount, carry_in_debt: carryInDebt, carry_in_credit: carryInCredit });
    const closingBalance = totalAmount - carryInBalance - monthPayments;
    const carryOutCredit = closingBalance < 0 ? Math.abs(closingBalance) : 0;
    const carryOutDebt = closingBalance > 0 ? closingBalance : 0;

    const balanceStatus = carryOutCredit > 0 ? "credit" : carryOutDebt > 0 ? "debt" : "settled";
    const balanceMessage =
      balanceStatus === "credit"
        ? `Bạn có số dư thừa ${carryOutCredit.toLocaleString("vi-VN")} ₫ sẽ được chuyển sang tháng sau.`
        : balanceStatus === "debt"
          ? `Bạn còn nợ ${carryOutDebt.toLocaleString("vi-VN")} ₫ cần thanh toán.`
          : "Tháng này đã thanh toán đầy đủ.";

    let settledInMonth: string | null = null;
    if (carryOutDebt > 0 && futureInvoicesDetailed.length > 0) {
      let runningBalance = -carryOutDebt;
      for (const fInv of futureInvoicesDetailed) {
        runningBalance += Number(fInv.recorded_payment ?? 0) - Number(fInv.total_amount ?? 0);
        if (runningBalance >= 0) {
          settledInMonth = fInv.month;
          break;
        }
      }
    }

    // Per-class lines, from the priced month.
    const classBreakdown = projected.classes.map((c) => {
      const prices = [
        ...new Set(pricedMonth.lessons.filter((l) => l.state === "billed" && l.class_id === c.class_id).map((l) => l.price_vnd)),
      ];
      return {
        class_id: c.class_id,
        class_name: (classNameMap.get(c.class_id) as string | undefined) || "Unknown",
        amount_vnd: c.base_vnd, // lessons x price (the custom rate when there is one)
        net_amount_vnd: c.after_own_vnd, // after the enrollment's own discounts, before sibling/student discounts
        sessions_count: c.lessons,
        // One price for the month's lessons: that price. Mixed (a fee change
        // mid-month): the class fee at the start of the month, as before.
        session_rate_vnd: prices.length === 1 ? prices[0] : feeOn(c.class_id, startDate),
        // What a sibling percentage would be taken from (compute-sibling-discounts reads this).
        sibling_basis_vnd: c.sibling_basis_vnd,
      };
    });

    // ---------- Persist invoice (safe) ----------
    // Calculate cumulative paid amount (all payments up to and including this month)
    const cumulativePaidAmount = priorPayments + monthPayments;

    // Try with extended fields first; fallback to minimal if schema lacks them.
    // Generate review flags - SIMPLIFIED: Only flag if final payable differs from expected
    const reviewFlags: any[] = [];

    const storedFlags: any[] = Array.isArray(frozenInvoice?.review_flags) ? frozenInvoice.review_flags : [];
    const savedAt = new Date().toISOString();
    if (asSaved) {
      // The bill stands as it was: keep what it already says and, when the
      // total differs (held), add the difference.
      for (const f of storedFlags) {
        if (f?.type !== PAST_MONTH_DIFFERS && f?.type !== REGISTER_MISSING_MARKS && f?.type !== "changed_after_confirmation") {
          reviewFlags.push(f);
        }
      }
      if (heldBill) reviewFlags.push(pastMonthDiffersFlag(savedFigures!, computed));
    } else {
      // Only flag if there's a difference between expected and final
      if (totalAmount !== expectedClassTuition) {
        const discountReasons = discounts.map((d) => d.name).filter((v, i, a) => a.indexOf(v) === i);
        if (baseAmount !== expectedClassTuition) discountReasons.unshift("Custom rate");
        reviewFlags.push({
          type: "tuition_adjustment",
          label: "Tuition differs from class rate",
          details: {
            expectedClassTuition,
            actualPayable: totalAmount,
            difference: expectedClassTuition - totalAmount,
            reasons: discountReasons,
          },
        });
      }
      // What an admin recorded when changing a held bill stays on the bill.
      for (const f of storedFlags) {
        if (f?.type === LOWERED_DESPITE_MISSING_MARKS || f?.type === PAST_MONTH_REPRICED) reviewFlags.push(f);
      }
      if (approvedChange) {
        reviewFlags.push(pastMonthRepricedFlag({
          saved: savedFigures!,
          next: computed,
          actorUserId: gate.userId || null,
          actorEmail: gate.email ?? null,
          reason: (reason ?? "").trim(),
          at: savedAt,
        }));
      }
    }
    if (registerHoles.length > 0) {
      // The saved base is the one first seen: a later call (the bill now moved) must
      // not overwrite it, so identical calls leave the flag, and the row, alone.
      const firstSeen = storedFlags.find((f) => f?.type === REGISTER_MISSING_MARKS)?.details?.savedBase;
      reviewFlags.push(missingMarksFlag(registerHoles, typeof firstSeen === "number" ? firstSeen : savedBase, registerBase, "normal"));
    }

    // Which labels this save may write. A recalculation must not un-confirm
    // or un-pay a bill: see _lib/invoice-status.ts. No figure is decided here.
    const labelFields = invoiceLabelFields(
      currentInvoiceRes.data ?? null,
      { base_amount: baseAmount, discount_amount: totalDiscount, total_amount: totalAmount },
      reviewFlags,
      savedAt,
      // paid / partial / issued from the month's own money - the one rule.
      paidLabel(monthPayments, payable, monthCharged({ base_amount: baseAmount, total_amount: totalAmount })),
    );

    // recorded_payment is NOT in this save. It belongs to the payment paths;
    // this function only ever wrote back the value it read at the start, so
    // a payment recorded while it was calculating was overwritten with the
    // older figure (0 on a bill that did not exist yet). A new bill gets
    // the column default, 0, which is what was written before.
    const invoicePayloadExtended: any = {
      student_id: studentId,
      month,
      base_amount: baseAmount,
      discount_amount: totalDiscount,
      total_amount: totalAmount,
      paid_amount: cumulativePaidAmount,
      carry_in_credit: carryInCredit,
      carry_in_debt: carryInDebt,
      carry_out_credit: carryOutCredit,
      carry_out_debt: carryOutDebt,
      class_breakdown: classBreakdown, // Per-class tuition breakdown
      ...labelFields, // review_flags always; status / confirmation_status only when this save may set them
      updated_at: savedAt,
    };

    // Never save a bill while the family discount is still being decided:
    // that would overwrite the stored invoice without the discount.
    const writeInvoice = !siblingPreview && !siblingUnresolved;
    let invoiceUpsertOk = true;
    let invoiceErrorMsg = "";
    // A held or kept bill is not repriced: only what changed in its labels, flags
    // and balances is written, and nothing at all when nothing changed.
    const patchOnly = asSaved;
    if (patchOnly && writeInvoice) {
      const stored: any = frozenInvoice;
      const patch: Record<string, unknown> = {};
      if (!sameFlags(stored.review_flags, labelFields.review_flags)) patch.review_flags = labelFields.review_flags;
      if (labelFields.status && labelFields.status !== stored.status) patch.status = labelFields.status;
      if (labelFields.confirmation_status && labelFields.confirmation_status !== stored.confirmation_status) {
        patch.confirmation_status = labelFields.confirmation_status;
      }
      const balances: Record<string, number> = {
        paid_amount: cumulativePaidAmount,
        carry_in_credit: carryInCredit,
        carry_in_debt: carryInDebt,
        carry_out_credit: carryOutCredit,
        carry_out_debt: carryOutDebt,
      };
      for (const [k, v] of Object.entries(balances)) if (Number(stored[k] ?? 0) !== v) patch[k] = v;
      if (Object.keys(patch).length > 0) {
        const { error: heldErr } = await supabase
          .from("invoices")
          .upsert({ student_id: studentId, month, ...patch, updated_at: savedAt }, { onConflict: "student_id,month" });
        if (heldErr) {
          console.error("Held invoice flags not saved:", heldErr.message);
          throw new Error("Unable to refresh tuition invoice");
        }
      }
    }
    if (writeInvoice && !patchOnly)
      try {
        const { error: invoiceErr1 } = await supabase
          .from("invoices")
          .upsert(invoicePayloadExtended, { onConflict: "student_id,month" });
        if (invoiceErr1) {
          invoiceUpsertOk = false;
          invoiceErrorMsg = invoiceErr1.message;
        }
      } catch (e: any) {
        invoiceUpsertOk = false;
        invoiceErrorMsg = e?.message ?? String(e);
      }

    if (writeInvoice && !patchOnly && !invoiceUpsertOk) {
      // fallback minimal upsert (existing schema in your earlier code)
      const { error: invoiceErr2 } = await supabase.from("invoices").upsert(
        {
          student_id: studentId,
          month,
          base_amount: baseAmount,
          discount_amount: totalDiscount,
          total_amount: totalAmount,
          ...(labelFields.status ? { status: labelFields.status } : {}),
          updated_at: savedAt,
        },
        { onConflict: "student_id,month" },
      );
      if (invoiceErr2) {
        console.error("Invoice upsert failed (both attempts):", invoiceErrorMsg, invoiceErr2.message);
        throw new Error("Unable to refresh tuition invoice");
      }
    }

    // A held bill is the saved bill: its lines are the saved breakdown, so they
    // add up to the figures answered (the register's own lines would not).
    const savedLines: any[] = Array.isArray(frozenInvoice?.class_breakdown) ? frozenInvoice.class_breakdown : [];
    const heldLines = asSaved
      ? savedLines.length > 0
        ? { classes: savedLines, count: savedLines.reduce((n, c) => n + Number(c?.sessions_count ?? 0), 0) }
        : {
            // No saved breakdown (older bills): one line carrying the saved figures.
            classes: [{
              class_id: projected.classes[0]?.class_id ?? activeClassIds[0] ?? null,
              class_name: "As charged",
              amount_vnd: baseAmount,
              net_amount_vnd: Math.max(0, baseAmount - totalDiscount),
              sessions_count: 0,
              session_rate_vnd: 0,
            }],
            count: 0,
          }
      : null;
    // And its discounts are the saved discount, not the ones priced today.
    const answeredDiscounts = asSaved
      ? totalDiscount > 0
        ? [{ name: "As charged", type: "amount", value: totalDiscount, amount: totalDiscount, isAsCharged: true }]
        : []
      : discounts;

    const response = {
      studentId,
      month,
      sessionCount: heldLines ? heldLines.count : sessionDetails.length,
      sessionDetails,
      baseAmount,
      discounts: answeredDiscounts,
      totalDiscount,
      totalAmount, // charges this month (post-discount)
      payments: {
        priorPayments,
        monthPayments,
        cumulativePaidAmount, // Total paid to date
      },
      carry: {
        carryInCredit,
        carryInDebt,
        carryOutCredit,
        carryOutDebt,
        payable, // charge + carry-in debt - carry-in credit, before this month's payment
        settledInMonth,
        status: balanceStatus, // 'credit' | 'debt' | 'settled'
        message: balanceMessage, // show in UI
      },
      siblingState,
      siblingUnresolved,
      invoiceSaved: writeInvoice,
      tuitionFrozen,
      // The whole month as today's pricing gives it (the saved bill when it is
      // not held or frozen), and, for staff, the lessons already held.
      projected: { lessons: projected.lessons, baseAmount: computed.base, totalDiscount: computed.discount, totalAmount: computed.total },
      ...(gate.isServiceRole || gate.roles.has("admin")
        ? { actual: { lessons: actual.lessons, baseAmount: actual.baseAmount, totalDiscount: actual.totalDiscount, totalAmount: actual.totalAmount } }
        : {}),
      lessons: lessonList,
      ...(heldBill ? { held: pastMonthHeld(month, savedFigures!, computed) } : {}),
      // A closed month answered exactly as it was charged (same total today).
      ...(keptBill ? { keptAsCharged: true } : {}),
      ...(registerHoles.length > 0 && !heldBill
        ? { missingMarks: { lessons: holeLessons, register_base: registerBase, saved_base: savedBase, forcedLower: false, billed: true } }
        : {}),
      ...(approvedChange && writeInvoice
        ? { approvedChange: { saved: savedFigures, next: computed, reason: (reason ?? "").trim() } }
        : {}),
      ...(mayForce && (pastMode === "normal" || pastMode === "kept") ? { forceIgnored: "Nothing was held for this month, so there was nothing to approve." } : {}),
      breakdown: {
        classes: heldLines ? heldLines.classes : classBreakdown,
      },
      enrollments:
        enrollments?.map((e) => ({
          class_id: e.class_id,
          class_name: sessions?.find((s) => s.class_id === e.class_id)?.classes
            ? Array.isArray(sessions.find((s) => s.class_id === e.class_id)!.classes)
              ? (sessions.find((s) => s.class_id === e.class_id)!.classes as any)[0]?.name
              : (sessions.find((s) => s.class_id === e.class_id)!.classes as any)?.name
            : "Unknown",
          start_date: e.start_date,
          end_date: e.end_date,
        })) || [],
      invoice: {
        base_amount: baseAmount,
        discount_amount: totalDiscount,
        total_amount: totalAmount,
        paid_amount: cumulativePaidAmount, // cumulative across months, as the column
        // This month's payments, as the column means. It was the running total
        // (prior months + this one) under this name until the Nov 2026 tuition
        // audit flagged it: anything reading it would have shown inflated payments.
        recorded_payment: monthPayments,
      },
      priorBalanceBreakdown,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
