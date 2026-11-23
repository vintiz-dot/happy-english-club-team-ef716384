import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireRole } from "../_lib/auth.ts";
import { resolveSiblingStates } from "../_lib/sibling-state.ts";
import { isBillableTuitionSession } from "../_lib/tuition-session.ts";
import { enrollmentDiscounts, enrollmentOn, inCreationOrder } from "../_lib/enrollment-discounts.ts";
import { monthPayable } from "../_lib/invoice-status.ts";
import { classNetAmounts } from "../_lib/class-net.ts";
import { findRegisterHoles, hanoiToday, heldSentence, mustHold } from "../_lib/register-holes.ts";
import { classFeeOn, indexClassFees, isMissingFeeHistory, type ClassFeeHistory } from "../_lib/class-fee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AttendanceStatus = "Present" | "Absent" | "Excused" | "Late";

function getDayOfWeek(dateStr: string): number {
  const date = new Date(`${dateStr}T12:00:00+07:00`);
  return date.getDay();
}

/** A lesson the student is not charged for (excused or cancelled). */
type LessonForgone = { session_id: string; date: string; class_id: string; rate_vnd: number };

/**
 * What one lesson adds to a student's month before the month-level discounts:
 * exactly the two lines the billable branch of the loop below adds for it -
 * the class's default rate into the base, less the rate-adjustment saving when
 * the enrollment's override is lower - and 0 when that branch would skip the
 * lesson (no positive rate). Used ONLY for the excused / cancelled lessons
 * reported beside the totals; no charged figure goes through here.
 */
function lessonCharge(defaultRate: number, overrideRate: number | null | undefined): number {
  const actualRate = overrideRate ?? defaultRate;
  if (!(actualRate > 0)) return 0;
  const saving = overrideRate && overrideRate < defaultRate ? defaultRate - overrideRate : 0;
  return defaultRate - saving;
}

function monthRange(month: string) {
  const startDate = `${month}-01`;
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const nextMonthStart = d.toISOString().slice(0, 10);
  return { startDate, nextMonthStart };
}

// Chunk array for .in() queries (Supabase has limits)
function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

// Rows asked for per request. PostgREST answers with at most its own
// `max-rows` (1,000 unless the project changed it) and does not say when it
// stopped short, so the size asked for is never trusted: see fetchChunked.
const PAGE_SIZE = 1000;

// Every multi-row read of this function goes through here, and every one is
// read TO THE END.
//
// It used to be one request per 200 ids. A request that matched more rows
// than the server's cap came back short with no error: the invoices of the
// last students in a batch went missing, so their arrears read as nothing
// owed, and so did attendance, which made their lessons unbillable and the
// month's charge 0.
//
// Now each read is paged by key: rows in `id` order, the next page starting
// after the last id received, until a page comes back empty. Stopping on an
// EMPTY page rather than a short one is what makes it hold for any cap - a
// page shorter than PAGE_SIZE may simply be the server's limit. Paging by key
// rather than by offset means a row inserted or deleted between two pages
// cannot make another row appear twice or not at all; a bill counted twice
// would be a wrong balance.
//
// So every `select` passed here must include `id`, and no caller may add its
// own `.order()` - sort in memory afterwards if the order matters.
async function fetchChunked<T>(
  supabase: any,
  table: string,
  select: string,
  inColumn: string,
  inValues: string[],
  extraFilters?: (q: any) => any
): Promise<T[]> {
  if (inValues.length === 0) return [];
  const chunks_ = chunk(inValues, 200);
  const results: T[] = [];
  for (const ch of chunks_) {
    let after: string | null = null;
    for (;;) {
      let q = supabase.from(table).select(select).in(inColumn, ch);
      if (extraFilters) q = extraFilters(q);
      if (after !== null) q = q.gt("id", after);
      const { data, error } = await q.order("id", { ascending: true }).limit(PAGE_SIZE);
      if (error) throw error;
      if (!data || data.length === 0) break;
      results.push(...data);
      const last = (data[data.length - 1] as any)?.id;
      // Without an id there is no "after": refuse rather than loop or stop short.
      if (last === undefined || last === null) throw new Error(`Paged read of ${table} returned a row without id`);
      after = String(last);
    }
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Auth + role: only an admin may see financial data. An internal call
    // holding the service-role key also passes - the schedule generator makes
    // one after every rebuild to keep invoices in step with the timetable,
    // and it has no person behind it. Teachers were let through until S2
    // (audit F-04): any teacher or TA could read any child's bill, discount,
    // payments and carry for up to 200 ids. Every browser caller is an admin
    // screen (AdminTuitionList*, QuickPayPanel, CloseMonthDialog,
    // useFinanceOverview).
    const gate = await requireRole(req, supabase, ["admin"], corsHeaders);
    if (gate instanceof Response) return gate;

    const InputSchema = z.object({
      studentIds: z.array(z.string().uuid()).min(1).max(200),
      month: z.string().regex(/^\d{4}-\d{2}$/),
    });

    const body = await req.json();
    const { studentIds, month } = InputSchema.parse(body);
    const { startDate, nextMonthStart } = monthRange(month);

    // ---- BULK QUERIES ----

    // 1. Students + families
    const students: any[] = await fetchChunked(
      supabase, "students",
      "id, family_id, families(id, sibling_percent_override)",
      "id", studentIds
    );
    const studentMap = new Map(students.map(s => [s.id, s]));

    // 2. All enrollments for these students
    // Read in id order (paging), then put in creation order: where two rows of
    // one class overlap, the one created first prices the lesson - the same
    // rule, by the same helper, as calculate-tuition. See enrollment-discounts.ts.
    const allEnrollments: any[] = inCreationOrder(await fetchChunked<any>(
      supabase, "enrollments",
      "id, created_at, student_id, class_id, discount_type, discount_value, discount_cadence, start_date, end_date, rate_override_vnd, allowed_days",
      "student_id", studentIds
    ));

    // Group enrollments by student
    const enrollmentsByStudent = new Map<string, any[]>();
    for (const e of allEnrollments) {
      const arr = enrollmentsByStudent.get(e.student_id) || [];
      arr.push(e);
      enrollmentsByStudent.set(e.student_id, arr);
    }

    // 3. Collect all active class IDs
    const allClassIds = [...new Set(
      allEnrollments
        .filter(e => !e.end_date || e.end_date >= startDate)
        .map(e => e.class_id)
    )];

    // 4. Classes info
    const allClasses: any[] = allClassIds.length > 0
      ? await fetchChunked(supabase, "classes", "id, name, session_rate_vnd", "id", allClassIds)
      : [];
    const classMap = new Map(allClasses.map(c => [c.id, c]));

    // 4b. The classes' fee history (D4 step 2, _lib/class-fee.ts): each lesson
    // at the fee in force on its date. No table yet: every lesson at the
    // class's session_rate_vnd, as before; any other read error fails the call.
    let feeHistory: ClassFeeHistory | null = null;
    try {
      feeHistory = indexClassFees(allClassIds.length > 0
        ? await fetchChunked<any>(supabase, "class_fee_history", "id, class_id, effective_from, session_rate_vnd", "class_id", allClassIds)
        : []);
    } catch (e) {
      if (!isMissingFeeHistory(e)) throw e;
      feeHistory = null;
    }

    // 5. Sessions in month for these classes
    const allSessions: any[] = allClassIds.length > 0
      ? await fetchChunked(
          supabase, "sessions",
          "id, date, status, class_id",
          "class_id", allClassIds,
          (q: any) => q.gte("date", startDate).lt("date", nextMonthStart).in("status", ["Scheduled", "Held"])
        )
      : [];

    const sessionsByClass = new Map<string, any[]>();
    for (const s of allSessions) {
      const arr = sessionsByClass.get(s.class_id) || [];
      arr.push(s);
      sessionsByClass.set(s.class_id, arr);
    }

    // 5b. The month's CANCELLED lessons of the same classes, read apart from
    // the lessons above so nothing that is charged depends on it. They price
    // `cancelledLessons` only - what each would have added to a student's
    // month - for the reports' "lost tuition" (BROWSER-PRICING), which used to
    // multiply classes.session_rate_vnd by a head count in the browser. A
    // display figure: if it cannot be read the field is left out and the
    // screens say "figure unavailable"; the call does not fail for it.
    let cancelledByClass: Map<string, any[]> | null = new Map();
    try {
      const cancelled: any[] = allClassIds.length > 0
        ? await fetchChunked(
            supabase, "sessions",
            "id, date, status, class_id",
            "class_id", allClassIds,
            (q: any) => q.gte("date", startDate).lt("date", nextMonthStart).eq("status", "Canceled")
          )
        : [];
      for (const s of cancelled) {
        const arr = cancelledByClass.get(s.class_id) || [];
        arr.push(s);
        cancelledByClass.set(s.class_id, arr);
      }
    } catch (e) {
      console.error("Cancelled lessons not read:", e instanceof Error ? e.message : e);
      cancelledByClass = null;
    }

    const allSessionIds = allSessions.map(s => s.id);

    // 6. Attendance for all sessions + all students
    const allAttendance: any[] = allSessionIds.length > 0
      ? await fetchChunked(
          supabase, "attendance",
          "id, session_id, student_id, status",
          "session_id", allSessionIds,
          (q: any) => q.in("student_id", studentIds)
        )
      : [];

    // Key: `${session_id}:${student_id}` -> status
    const attendanceKey = (sid: string, stid: string) => `${sid}:${stid}`;
    const attendanceMap = new Map<string, string>();
    for (const a of allAttendance) {
      attendanceMap.set(attendanceKey(a.session_id, a.student_id), a.status);
    }

    // 7. Discount assignments
    const allDiscountAssignments: any[] = await fetchChunked(
      supabase, "discount_assignments",
      "id, student_id, discount_definitions(*)",
      "student_id", studentIds,
      (q: any) => q.lte("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
    );
    const discountsByStudent = new Map<string, any[]>();
    for (const d of allDiscountAssignments) {
      const arr = discountsByStudent.get(d.student_id) || [];
      arr.push(d);
      discountsByStudent.set(d.student_id, arr);
    }

    // 8. Referral bonuses. A failed read fails the call like every other
    // pricing read: swallowing it priced the month without the bonus.
    const allReferralBonuses: any[] = await fetchChunked(
      supabase, "referral_bonuses",
      "id, student_id, type, value",
      "student_id", studentIds,
      (q: any) => q.lte("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
    );
    const referralsByStudent = new Map<string, any[]>();
    for (const r of allReferralBonuses) {
      const arr = referralsByStudent.get(r.student_id) || [];
      arr.push(r);
      referralsByStudent.set(r.student_id, arr);
    }

    // 9. Sibling discount states - collect family IDs
    const familyIds = [...new Set(students.map(s => s.family_id).filter(Boolean))];
    let siblingStates: any[] = [];
    if (familyIds.length > 0) {
      siblingStates = await resolveSiblingStates(supabase, familyIds, month);
    }
    const siblingStateMap = new Map(siblingStates.map(s => [s.family_id, s]));

    // 10. Other invoices (all months != current) for all students
    const allOtherInvoices: any[] = await fetchChunked(
      supabase, "invoices",
      "id, student_id, total_amount, month, recorded_payment",
      "student_id", studentIds,
      (q: any) => q.neq("month", month)
    );
    // Oldest first: the "settled in a later month" walk below reads each
    // student's later bills in month order. (The read itself is in id order.)
    allOtherInvoices.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
    const priorInvoicesByStudent = new Map<string, any[]>();
    const futureInvoicesByStudent = new Map<string, any[]>();
    for (const inv of allOtherInvoices) {
      if (inv.month < month) {
        const arr = priorInvoicesByStudent.get(inv.student_id) || [];
        arr.push(inv);
        priorInvoicesByStudent.set(inv.student_id, arr);
      } else if (inv.month > month) {
        const arr = futureInvoicesByStudent.get(inv.student_id) || [];
        arr.push(inv);
        futureInvoicesByStudent.set(inv.student_id, arr);
      }
    }

    // 11. Current month invoices
    const currentInvoices: any[] = await fetchChunked(
      supabase, "invoices",
      "student_id, id, recorded_payment, confirmation_status, status, tuition_frozen, base_amount, discount_amount, total_amount, class_breakdown",
      "student_id", studentIds,
      (q: any) => q.eq("month", month)
    );
    const currentInvoiceMap = new Map(currentInvoices.map(inv => [inv.student_id, inv]));

    // ---- PROCESS EACH STUDENT IN-MEMORY ----
    const results: any[] = [];

    for (const sid of studentIds) {
      try {
        const student = studentMap.get(sid);
        if (!student) continue;

        const family = student.families
          ? Array.isArray(student.families) ? student.families[0] : student.families
          : null;

        const enrollments = enrollmentsByStudent.get(sid) || [];
        const activeClassIds = [...new Set<string>(enrollments
          .filter((e: any) => !e.end_date || e.end_date >= startDate)
          .map((e: any) => e.class_id))];

        // Sessions for this student's classes
        const studentSessions: any[] = [];
        for (const cid of activeClassIds) {
          const classSessions = sessionsByClass.get(cid) || [];
          studentSessions.push(...classSessions);
        }

        // Calculate tuition
        let baseAmount = 0;
        const enrollmentBaseAmounts = new Map<string, number>();
        const datedEnrollmentBases = new Map<any, number>();
        const rateAdjustmentSavings = new Map<string, number>();
        // Lessons this student is not charged for, each with what it would
        // have added to the month: see lessonCharge. Display figures only.
        const excusedLessons: LessonForgone[] = [];

        for (const s of studentSessions) {
          const enrollment = enrollmentOn(enrollments, s.class_id, s.date);
          if (!enrollment) continue;

          const sessionDayOfWeek = getDayOfWeek(s.date);
          if (enrollment.allowed_days && !enrollment.allowed_days.includes(sessionDayOfWeek)) continue;

          const att = attendanceMap.get(attendanceKey(s.id, sid)) as AttendanceStatus | undefined;
          const classInfo = classMap.get(s.class_id);
          const defaultRate = classFeeOn(feeHistory, s.class_id, s.date, Number(classInfo?.session_rate_vnd ?? 0));
          const overrideRate = enrollment.rate_override_vnd;
          const actualRate = overrideRate ?? defaultRate;
          // Late students attended, so they are billed like Present. Only
          // Excused (forgiven) absences are non-billable.
          const billable = isBillableTuitionSession(s.status, att);

          if (billable && actualRate > 0) {
            baseAmount += defaultRate;
            enrollmentBaseAmounts.set(s.class_id, (enrollmentBaseAmounts.get(s.class_id) || 0) + defaultRate);
            datedEnrollmentBases.set(enrollment, (datedEnrollmentBases.get(enrollment) || 0) + defaultRate);

            if (overrideRate && overrideRate < defaultRate) {
              const savings = defaultRate - overrideRate;
              rateAdjustmentSavings.set(s.class_id, (rateAdjustmentSavings.get(s.class_id) || 0) + savings);
            }
          } else if (att === "Excused") {
            excusedLessons.push({ session_id: s.id, date: s.date, class_id: s.class_id,
              rate_vnd: lessonCharge(defaultRate, overrideRate) });
          }
        }

        // Lessons held, inside the enrolment, with no attendance row: holes in the
        // register (_lib/register-holes.ts), judged by the same enrolment, weekday
        // and rate rules as the loop above - and as calculate-tuition does.
        const registerHoles = findRegisterHoles(
          studentSessions,
          { has: (sessionId: string) => attendanceMap.has(attendanceKey(sessionId, sid)) },
          hanoiToday(),
          {
            enrollmentFor: (s: any) => enrollmentOn(enrollments, s.class_id, s.date),
            onAllowedDay: (s: any, e: any) => !e.allowed_days || e.allowed_days.includes(getDayOfWeek(s.date)),
            rateOf: (s: any, e: any) =>
              e.rate_override_vnd ?? classFeeOn(feeHistory, s.class_id, s.date, Number(classMap.get(s.class_id)?.session_rate_vnd ?? 0)),
          },
        );

        // The month's cancelled lessons in this student's classes, on the
        // student's enrolled dates and weekdays - the same two tests a charged
        // lesson passes above. Null when they could not be read.
        let cancelledLessons: LessonForgone[] | null = null;
        if (cancelledByClass) {
          cancelledLessons = [];
          for (const cid of activeClassIds) {
            for (const s of cancelledByClass.get(cid) || []) {
              const enrollment = enrollmentOn(enrollments, s.class_id, s.date);
              if (!enrollment) continue;
              if (enrollment.allowed_days && !enrollment.allowed_days.includes(getDayOfWeek(s.date))) continue;
              cancelledLessons.push({ session_id: s.id, date: s.date, class_id: s.class_id,
                // The fee in force on the lesson's date, as a charged lesson
                // is priced above (D4 step 2), not the class's current fee.
                rate_vnd: lessonCharge(
                  classFeeOn(feeHistory, s.class_id, s.date, Number(classMap.get(s.class_id)?.session_rate_vnd ?? 0)),
                  enrollment.rate_override_vnd,
                ) });
            }
          }
        }

        // Discounts
        let totalDiscount = 0;
        // class -> the discounts that belong to that class, for classNet.
        const classDiscounts = new Map<string, number>();
        const toClass = (classId: string, amount: number) =>
          classDiscounts.set(classId, (classDiscounts.get(classId) || 0) + amount);

        // Rate adjustments
        for (const [classId, savings] of rateAdjustmentSavings) {
          if (savings > 0) {
            totalDiscount += savings;
            toClass(classId, savings);
          }
        }

        // Enrollment-level discounts
        for (const discount of enrollmentDiscounts(datedEnrollmentBases)) {
          totalDiscount += discount.amount;
          toClass(discount.class_id, discount.amount);
        }

        // Student-level discounts
        const studentDiscounts = discountsByStudent.get(sid) || [];
        for (const a of studentDiscounts) {
          const def = a.discount_definitions;
          if (!def || !def.is_active) continue;
          const amt = def.type === "percent"
            ? Math.round(baseAmount * (def.value / 100))
            : Math.round(def.value);
          if (amt > 0) totalDiscount += amt;
        }

        // Referral bonuses
        const studentReferrals = referralsByStudent.get(sid) || [];
        for (const b of studentReferrals) {
          const amt = b.type === "percent"
            ? Math.round(baseAmount * (b.value / 100))
            : Math.round(b.value);
          if (amt > 0) totalDiscount += amt;
        }

        // Sibling discount
        if (family?.id) {
          const sd = siblingStateMap.get(family.id);
          if (sd && sd.status === "assigned" && sd.winner_student_id === sid && sd.winner_class_id) {
            const winnerClassBase = enrollmentBaseAmounts.get(sd.winner_class_id) || 0;
            const amt = Math.round(winnerClassBase * (sd.sibling_percent / 100));
            if (amt > 0) {
              totalDiscount += amt;
              toClass(sd.winner_class_id, amt);
            }
          }
        }

        let totalAmount = Math.max(0, baseAmount - totalDiscount);
        const frozenInv = currentInvoiceMap.get(sid);
        // A frozen bill keeps its saved figures whatever the enrollment says now.
        if (frozenInv?.tuition_frozen) {
          baseAmount = Number(frozenInv.base_amount ?? 0);
          totalDiscount = Number(frozenInv.discount_amount ?? 0);
          totalAmount = Number(frozenInv.total_amount ?? 0);
        }
        // So does a bill the register would only lower because lessons have no
        // row: calculate-tuition holds it (same rule, same helper), and this
        // reports what it will keep, never a lower figure than the bill.
        const heldBill = mustHold({
          holeCount: registerHoles.length,
          savedBase: frozenInv ? Number(frozenInv.base_amount ?? 0) : null,
          tuitionFrozen: !!frozenInv?.tuition_frozen,
          registerBase: baseAmount,
          forced: false,
        });
        const heldInfo = heldBill
          ? {
              reason: "register_missing_marks",
              message: heldSentence(registerHoles.length, month),
              lessons: registerHoles.map((h) => ({
                date: h.date,
                class_name: classMap.get(h.class_id)?.name || "Unknown",
              })),
              register_base: baseAmount,
              saved_base: Number(frozenInv.base_amount ?? 0),
            }
          : null;
        if (heldBill) {
          baseAmount = Number(frozenInv.base_amount ?? 0);
          totalDiscount = Number(frozenInv.discount_amount ?? 0);
          totalAmount = Number(frozenInv.total_amount ?? 0);
        }

        // The charge split by class, after EVERY discount (student, referral
        // and sibling included), summing to totalAmount exactly. For the
        // per-class report; see _lib/class-net.ts. A frozen bill is split
        // along the class breakdown it was saved with, not today's register.
        let classNet;
        if (frozenInv?.tuition_frozen || heldBill) {
          const savedBases = new Map<string, number>();
          const savedClassDiscounts = new Map<string, number>();
          for (const c of (Array.isArray(frozenInv.class_breakdown) ? frozenInv.class_breakdown : []) as any[]) {
            if (!c?.class_id) continue;
            const amount = Number(c.amount_vnd ?? 0);
            savedBases.set(c.class_id, (savedBases.get(c.class_id) || 0) + amount);
            const own = amount - Number(c.net_amount_vnd ?? amount);
            savedClassDiscounts.set(c.class_id, (savedClassDiscounts.get(c.class_id) || 0) + Math.max(0, own));
          }
          classNet = classNetAmounts(savedBases, savedClassDiscounts, totalAmount);
        } else {
          classNet = classNetAmounts(enrollmentBaseAmounts, classDiscounts, totalAmount);
        }

        // Payments / carry
        const priorInvoices = priorInvoicesByStudent.get(sid) || [];
        const priorCharges = priorInvoices.reduce((s: number, r: any) => s + Number(r.total_amount ?? 0), 0);
        const priorPayments = priorInvoices.reduce((s: number, r: any) => s + Number(r.recorded_payment ?? 0), 0);

        const currentInvoice = currentInvoiceMap.get(sid);
        const monthPayments = Number(currentInvoice?.recorded_payment ?? 0);

        const carryInBalance = priorPayments - priorCharges;
        const carryInCredit = carryInBalance > 0 ? carryInBalance : 0;
        const carryInDebt = carryInBalance < 0 ? Math.abs(carryInBalance) : 0;

        const closingBalance = totalAmount - carryInBalance - monthPayments;
        const carryOutCredit = closingBalance < 0 ? Math.abs(closingBalance) : 0;
        const carryOutDebt = closingBalance > 0 ? closingBalance : 0;

        let settledInMonth: string | null = null;
        if (carryOutDebt > 0) {
          const futureInvoices = futureInvoicesByStudent.get(sid) || [];
          if (futureInvoices.length > 0) {
            let runningBalance = -carryOutDebt;
            for (const fInv of futureInvoices) {
              runningBalance += Number(fInv.recorded_payment ?? 0) - Number(fInv.total_amount ?? 0);
              if (runningBalance >= 0) {
                settledInMonth = fInv.month;
                break;
              }
            }
          }
        }

        // Build class breakdown
        const classBreakdown: any[] = [];
        for (const [classId, classBase] of enrollmentBaseAmounts) {
          const classInfo = classMap.get(classId);
          classBreakdown.push({
            class_id: classId,
            class_name: classInfo?.name || "Unknown",
            amount_vnd: classBase,
            session_rate_vnd: classFeeOn(feeHistory, classId, startDate, Number(classInfo?.session_rate_vnd ?? 0)),
          });
        }

        results.push({
          studentId: sid,
          baseAmount,
          totalDiscount,
          totalAmount,
          payments: { priorPayments, monthPayments },
          carry: {
            carryInCredit, carryInDebt, carryOutCredit, carryOutDebt, settledInMonth,
            // charge + carry-in debt - carry-in credit, before this month's
            // payment: the same figure, by the same helper, as calculate-tuition.
            payable: monthPayable({ total_amount: totalAmount, carry_in_debt: carryInDebt, carry_in_credit: carryInCredit }),
          },
          // The family discount is still being decided: totalAmount leaves it
          // out, so the figures are provisional (same meaning as in calculate-tuition).
          siblingUnresolved: family?.id ? siblingStateMap.get(family.id)?.status === "unresolved" : false,
          breakdown: { classes: classBreakdown },
          classNet,
          ...(heldInfo ? { held: heldInfo } : {}),
          invoiceId: currentInvoice?.id || null,
          invoiceStatus: currentInvoice?.status || null,
          confirmationStatus: currentInvoice?.confirmation_status || null,
          // Added for BROWSER-PRICING. Lessons not charged, each with what it
          // would have added to the month before the month-level discounts
          // (enrollment terms, special, referral, sibling): the reports'
          // "tuition lost". Not part of any total above.
          //
          // Left out for a FROZEN bill: its charge is the saved figure, not
          // today's register, so a lesson marked Excused after the freeze may
          // still be charged (and one charged now may not have been). Listing
          // it as forgone would call billed tuition lost. Absent, the screens
          // show "figure unavailable" rather than a guess.
          ...(frozenInv?.tuition_frozen ? {} : {
            excusedLessons,
            ...(cancelledLessons ? { cancelledLessons } : {}),
          }),
        });
      } catch (err) {
        console.error(`Error processing student ${sid}:`, err);
        results.push({ studentId: sid, error: true });
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
