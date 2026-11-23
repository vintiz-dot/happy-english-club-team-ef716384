import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireRole } from "../_lib/auth.ts";
import { resolveSiblingStates } from "../_lib/sibling-state.ts";
import { enrollmentOn, inCreationOrder } from "../_lib/enrollment-discounts.ts";
import { monthPayable } from "../_lib/invoice-status.ts";
import { classNetAmounts } from "../_lib/class-net.ts";
import { priceStudentMonth, type MonthDiscount } from "../_lib/tuition-pricing.ts";
import { refreshableMonths } from "../_lib/bill-refresh.ts";
import { clockNow } from "../_lib/clock.ts";
import { decidePastMonth, figuresOf, isClosedMonth, pastMonthHeld } from "../_lib/past-month-hold.ts";
import { classFeeOn, indexClassFees, isMissingFeeHistory, type ClassFeeHistory } from "../_lib/class-fee.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getDayOfWeek(dateStr: string): number {
  const date = new Date(`${dateStr}T12:00:00+07:00`);
  return date.getDay();
}

/** A lesson the student is not charged for (excused or cancelled). */
type LessonForgone = { session_id: string; date: string; class_id: string; rate_vnd: number };

/**
 * What one lesson would add to a student's month before any discount: the
 * enrollment's custom rate when it has one, else the class fee on the date
 * (the price rule of _lib/tuition-pricing.ts). Used ONLY for the cancelled
 * lessons reported beside the totals; no charged figure goes through here.
 */
function lessonCharge(defaultRate: number, overrideRate: number | null | undefined): number {
  const price = overrideRate ?? defaultRate;
  return price > 0 ? price : 0;
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
      (q: any) => q.lt("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
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
      (q: any) => q.lt("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
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
    // A closed month's saved bill stands (_lib/past-month-hold.ts), as in calculate-tuition.
    const monthClosed = isClosedMonth(month, refreshableMonths(clockNow()));

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

        const feeOn = (classId: string, date: string) =>
          classFeeOn(feeHistory, classId, date, Number(classMap.get(classId)?.session_rate_vnd ?? 0));

        // The student's own discounts and bonuses.
        const monthDiscounts: MonthDiscount[] = [];
        for (const a of discountsByStudent.get(sid) || []) {
          const def = a.discount_definitions;
          if (!def || !def.is_active) continue;
          monthDiscounts.push({ name: def.name, type: def.type, value: def.value });
        }
        for (const b of referralsByStudent.get(sid) || []) {
          monthDiscounts.push({ name: "Referral Bonus", type: b.type, value: b.value });
        }

        // The family's sibling discount, when this child holds it.
        const sd = family?.id ? siblingStateMap.get(family.id) : null;
        const siblingAward =
          sd && sd.status === "assigned" && sd.winner_student_id === sid && sd.winner_class_id
            ? { percent: Number(sd.sibling_percent ?? 0), classId: sd.winner_class_id as string }
            : null;

        // THE PRICE: _lib/tuition-pricing.ts, the same call as calculate-tuition.
        // Nothing is priced in this file.
        const pricedMonth = priceStudentMonth({
          enrollments,
          sessions: studentSessions,
          markOf: (sessionId: string) => attendanceMap.get(attendanceKey(sessionId, sid)),
          classFeeOn: feeOn,
          monthDiscounts,
          sibling: siblingAward,
        });
        const projected = pricedMonth.projected;
        const actual = pricedMonth.actual;
        const computed = { base: projected.baseAmount, discount: projected.totalDiscount, total: projected.totalAmount };

        // Lessons this student is not charged for because they were excused,
        // each with what it would have added to the month. Display figures only.
        const excusedLessons: LessonForgone[] = pricedMonth.lessons
          .filter((l) => l.state === "excused")
          .map((l) => ({ session_id: l.session_id, date: l.date, class_id: l.class_id, rate_vnd: l.price_vnd }));

        // The month's cancelled lessons in this student's classes, on the
        // student's enrolled dates and weekdays - the same two tests a charged
        // lesson passes. Null when they could not be read.
        let cancelledLessons: LessonForgone[] | null = null;
        if (cancelledByClass) {
          cancelledLessons = [];
          for (const cid of activeClassIds) {
            for (const s of cancelledByClass.get(cid) || []) {
              const enrollment = enrollmentOn(enrollments, s.class_id, s.date);
              if (!enrollment) continue;
              if (enrollment.allowed_days && !enrollment.allowed_days.includes(getDayOfWeek(s.date))) continue;
              cancelledLessons.push({ session_id: s.id, date: s.date, class_id: s.class_id,
                // Priced as a charged lesson would be: custom rate, else the fee on its date.
                rate_vnd: lessonCharge(feeOn(s.class_id, s.date), enrollment.rate_override_vnd) });
            }
          }
        }

        let baseAmount = computed.base;
        let totalDiscount = computed.discount;
        let totalAmount = computed.total;
        const frozenInv = currentInvoiceMap.get(sid);
        // A frozen bill keeps its saved figures whatever the enrollment says now.
        if (frozenInv?.tuition_frozen) {
          baseAmount = Number(frozenInv.base_amount ?? 0);
          totalDiscount = Number(frozenInv.discount_amount ?? 0);
          totalAmount = Number(frozenInv.total_amount ?? 0);
        }
        // So does a CLOSED month's saved bill when today's pricing gives other
        // figures: calculate-tuition keeps it until an admin approves the change,
        // and this reports what it keeps, with both sets of figures in `held`.
        const siblingUnresolved = family?.id ? siblingStateMap.get(family.id)?.status === "unresolved" : false;
        const savedFigures = frozenInv ? figuresOf(frozenInv) : null;
        const pastMode = siblingUnresolved
          ? "normal"
          : decidePastMonth({
              closed: monthClosed,
              saved: savedFigures,
              frozen: !!frozenInv?.tuition_frozen,
              next: computed,
              approved: false,
            });
        // held: the total differs; kept: the same total, split differently
        // between base and discount. Either way the saved bill is answered.
        const asSaved = pastMode === "held" || pastMode === "kept";
        const heldInfo = pastMode === "held" ? pastMonthHeld(month, savedFigures!, computed) : null;
        if (asSaved) {
          baseAmount = savedFigures!.base;
          totalDiscount = savedFigures!.discount;
          totalAmount = savedFigures!.total;
        }

        // The charge split by class, after EVERY discount (student, referral
        // and sibling included), summing to totalAmount exactly. For the
        // per-class report; see _lib/class-net.ts. A frozen or held bill is split
        // along the class breakdown it was saved with, not today's register.
        const savedLines: any[] = Array.isArray(frozenInv?.class_breakdown) ? frozenInv.class_breakdown : [];
        let classNet;
        if (frozenInv?.tuition_frozen || asSaved) {
          const savedBases = new Map<string, number>();
          const savedClassDiscounts = new Map<string, number>();
          for (const c of savedLines) {
            if (!c?.class_id) continue;
            const amount = Number(c.amount_vnd ?? 0);
            savedBases.set(c.class_id, (savedBases.get(c.class_id) || 0) + amount);
            const own = amount - Number(c.net_amount_vnd ?? amount);
            savedClassDiscounts.set(c.class_id, (savedClassDiscounts.get(c.class_id) || 0) + Math.max(0, own));
          }
          // A bill saved with no breakdown (older bills) still has to be carried by
          // some class: split by the classes of the month's lessons, else the
          // child's first class - never [] against a charge.
          if (asSaved && [...savedBases.values()].reduce((n, v) => n + v, 0) <= 0 && totalAmount > 0) {
            savedBases.clear();
            savedClassDiscounts.clear();
            for (const c of projected.classes) if (c.base_vnd > 0) savedBases.set(c.class_id, c.base_vnd);
            if (savedBases.size === 0 && activeClassIds.length > 0) savedBases.set(activeClassIds[0], 1);
          }
          classNet = classNetAmounts(savedBases, savedClassDiscounts, totalAmount);
        } else {
          classNet = classNetAmounts(
            new Map(projected.classes.map((c) => [c.class_id, c.base_vnd])),
            // The discounts that belong to one class: its enrollment terms and,
            // on the winner class, the sibling discount.
            new Map(projected.classes.map((c) => [c.class_id, c.own_discount_vnd + c.sibling_discount_vnd])),
            totalAmount,
          );
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

        // Per-class lines, from the priced month; a held bill answers the lines
        // it was saved with, so they add up to the figures beside them. The same
        // four fields as always (no per-class net here: the reports read classNet).
        const pricedLines = projected.classes.map((c) => {
          const prices = [
            ...new Set(pricedMonth.lessons.filter((l) => l.state === "billed" && l.class_id === c.class_id).map((l) => l.price_vnd)),
          ];
          return {
            class_id: c.class_id,
            class_name: classMap.get(c.class_id)?.name || "Unknown",
            amount_vnd: c.base_vnd,
            session_rate_vnd: prices.length === 1 ? prices[0] : feeOn(c.class_id, startDate),
          };
        });
        const classBreakdown: any[] = !asSaved
          ? pricedLines
          : savedLines.length > 0
            ? savedLines.map((c: any) => ({
                class_id: c?.class_id ?? null,
                class_name: c?.class_name ?? classMap.get(c?.class_id)?.name ?? "Unknown",
                amount_vnd: Number(c?.amount_vnd ?? 0),
                session_rate_vnd: Number(c?.session_rate_vnd ?? 0),
              }))
            : [{
                class_id: projected.classes[0]?.class_id ?? activeClassIds[0] ?? null,
                class_name: "As charged",
                amount_vnd: baseAmount,
                session_rate_vnd: 0,
              }];

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
          siblingUnresolved,
          breakdown: { classes: classBreakdown },
          classNet,
          // The whole month as today's pricing gives it, and the lessons already held.
          projected: { lessons: projected.lessons, baseAmount: computed.base, totalDiscount: computed.discount, totalAmount: computed.total },
          actual: { lessons: actual.lessons, baseAmount: actual.baseAmount, totalDiscount: actual.totalDiscount, totalAmount: actual.totalAmount },
          ...(heldInfo ? { held: heldInfo } : {}),
          ...(pastMode === "kept" ? { keptAsCharged: true } : {}),
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
