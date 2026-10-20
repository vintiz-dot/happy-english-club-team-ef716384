// supabase/functions/calculate-tuition/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';

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
    const ipLimit = checkRateLimit(clientIP, 30, 60000, 'ip');
    
    if (ipLimit.limited) {
      return rateLimitResponse(ipLimit.resetAt, corsHeaders);
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Validate input
    const InputSchema = z.object({
      studentId: z.string().uuid('Invalid student ID format'),
      month: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format. Expected YYYY-MM'),
    });

    const { studentId, month } = InputSchema.parse(await req.json());
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
        .select("class_id, discount_type, discount_value, discount_cadence, start_date, end_date, rate_override_vnd, allowed_days")
        .eq("student_id", studentId),
      supabase
        .from("discount_assignments")
        .select("discount_definitions(*)")
        .eq("student_id", studentId)
        .lte("effective_from", nextMonthStart)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`),
      supabase
        .from("referral_bonuses")
        .select("*")
        .eq("student_id", studentId)
        .lte("effective_from", nextMonthStart)
        .or(`effective_to.is.null,effective_to.gte.${startDate}`),
      supabase
        .from("invoices")
        .select("total_amount, month, recorded_payment, class_breakdown")
        .neq("month", month)
        .eq("student_id", studentId)
        .order("month", { ascending: true }),
      supabase
        .from("invoices")
        .select("recorded_payment")
        .eq("student_id", studentId)
        .eq("month", month)
        .maybeSingle(),
    ]);

    const { data: student, error: studentError } = studentRes;
    if (studentError) throw studentError;
    const { data: enrollments, error: enrollErr } = enrollmentsRes;
    if (enrollErr) throw enrollErr;
    const discountAssignments = discountAssignmentsRes.data;
    const referralBonuses = referralBonusesRes.data;

    // Extract family data if it's an array, handle null families
    const family = student?.families ? (Array.isArray(student.families) ? student.families[0] : student.families) : null;

    const activeClassIds = (enrollments ?? [])
      .filter((e) => !e.end_date || e.end_date >= startDate) // still active in this month
      .map((e) => e.class_id);

    // ----- Wave 2: sessions + sibling state (depend on Wave 1) -----
    const [sessionsRes, siblingStateRes] = await Promise.all([
      supabase
        .from("sessions")
        .select("id, date, status, class_id, classes(session_rate_vnd)")
        .in("class_id", activeClassIds.length ? activeClassIds : ["00000000-0000-0000-0000-000000000000"])
        .gte("date", startDate)
        .lt("date", nextMonthStart)
        .in("status", ["Scheduled", "Held"]),
      family?.id
        ? supabase
            .from("sibling_discount_state")
            .select("status, winner_student_id, winner_class_id, sibling_percent, reason")
            .eq("family_id", family.id)
            .eq("month", month)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
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

    // Calculate expected tuition using CLASS DEFAULT rates (for review comparison)
    let expectedClassTuition = 0;
    
    // Base charges: bill Present or Absent; Excused not billable
    // Track base amounts per enrollment for accurate discount calculation
    let baseAmount = 0;
    const enrollmentBaseAmounts = new Map<string, number>(); // class_id -> base amount
    const rateAdjustmentSavings = new Map<string, number>(); // class_id -> savings
    const sessionDetails: Array<{ date: string; rate: number; status: AttendanceStatus | "Scheduled"; class_id: string; class_name: string }> = [];

    // Class names already fetched in Wave 3
    const classNameMap = new Map((classesNamesRes.data as any[])?.map((c: any) => [c.id, c.name]) || []);

    for (const s of sessions ?? []) {
      // Check if student was enrolled on this specific session date
      const enrollment = (enrollments ?? []).find(e => 
        e.class_id === s.class_id && e.start_date <= s.date && (!e.end_date || e.end_date >= s.date)
      );
      
      if (!enrollment) continue; // Skip sessions outside enrollment period
      
      // Check if session day is in student's allowed_days (null means all days allowed)
      const sessionDayOfWeek = getDayOfWeek(s.date);
      if (enrollment.allowed_days && !enrollment.allowed_days.includes(sessionDayOfWeek)) {
        continue; // Skip sessions on days the student doesn't attend
      }
      
      const att = attendanceMap.get(s.id);
      const classData = s.classes ? (Array.isArray(s.classes) ? s.classes[0] : s.classes) : null;
      const defaultRate = Number(classData?.session_rate_vnd ?? 0);
      const overrideRate = enrollment?.rate_override_vnd;
      const actualRate = overrideRate ?? defaultRate;
      const className = classNameMap.get(s.class_id) || 'Unknown';

      // Bill Present, Absent, or Late (all attended/charged); Excused is forgiven.
      const billable = att === "Present" || att === "Absent" || att === "Late";
      if (billable && actualRate > 0) {
        // Calculate expected using default rate
        expectedClassTuition += defaultRate;
        
        // ALWAYS use default rate for base amount (not override)
        baseAmount += defaultRate;
        // Track per-enrollment base amount using default rate
        const currentAmount = enrollmentBaseAmounts.get(s.class_id) || 0;
        enrollmentBaseAmounts.set(s.class_id, currentAmount + defaultRate);
        
        // Track rate savings if override is lower than default
        if (overrideRate && overrideRate < defaultRate) {
          const savings = defaultRate - overrideRate;
          const currentSavings = rateAdjustmentSavings.get(s.class_id) || 0;
          rateAdjustmentSavings.set(s.class_id, currentSavings + savings);
        }
        
        sessionDetails.push({ 
          date: s.date, 
          rate: actualRate, // Show actual rate paid
          status: (att ?? "Present") as any, 
          class_id: s.class_id, 
          class_name: className 
        });
      } else {
        // still return session detail for UI if needed
        if (att) sessionDetails.push({ date: s.date, rate: actualRate, status: att, class_id: s.class_id, class_name: className });
      }
    }

    // Discounts bucket
    const discounts: Array<{
      name: string;
      type: "percent" | "amount";
      value: number;
      amount: number;
      [k: string]: any;
    }> = [];
    let totalDiscount = 0;

    // Add rate adjustment discounts first
    for (const [classId, savings] of rateAdjustmentSavings.entries()) {
      if (savings > 0) {
        const className = classNameMap.get(classId) || 'Unknown';
        // Get enrollment to show override rate details
        const enrollment = (enrollments as EnrollmentRow[] | null | undefined)?.find(e => e.class_id === classId);
        const overrideRate = enrollment?.rate_override_vnd || 0;
        const defaultRate = sessions?.find(s => s.class_id === classId)?.classes?.[0]?.session_rate_vnd || 0;
        const savingsPerSession = defaultRate - overrideRate;
        
        discounts.push({
          name: `Rate Adjustment`,
          type: "amount",
          value: savings,
          amount: savings,
          class_id: classId,
          appliedToClass: className,
          isRateAdjustment: true,
          overrideRate: overrideRate,
          defaultRate: defaultRate,
          savingsPerSession: savingsPerSession,
        });
        totalDiscount += savings;
      }
    }

    // Enrollment-level discounts (monthly/once)
    // Calculate discount based on the specific enrollment's base amount only
    for (const e of (enrollments as EnrollmentRow[] | null | undefined) ?? []) {
      if (!e.discount_type || !e.discount_value) continue;
      const cadence = e.discount_cadence;
      if (cadence === "monthly" || cadence === "once") {
        // Get the base amount for THIS specific enrollment only
        const enrollmentBase = enrollmentBaseAmounts.get(e.class_id) || 0;
        if (enrollmentBase === 0) continue; // Skip if no billable sessions for this enrollment
        
        const amt =
          e.discount_type === "percent"
            ? Math.round(enrollmentBase * (e.discount_value / 100))
            : Math.round(e.discount_value);
        if (amt > 0) {
          discounts.push({ 
            name: "Enrollment Discount", 
            type: e.discount_type, 
            value: e.discount_value, 
            amount: amt,
            class_id: e.class_id // Track which enrollment this discount is for
          });
          totalDiscount += amt;
        }
      }
    }

    // Special per-student discounts (already fetched in Wave 1)
    for (const a of discountAssignments ?? []) {
      const def = (a as any).discount_definitions;
      if (!def || !def.is_active) continue;
      const amt = def.type === "percent" ? Math.round(baseAmount * (def.value / 100)) : Math.round(def.value);
      if (amt > 0) {
        discounts.push({ name: def.name, type: def.type, value: def.value, amount: amt });
        totalDiscount += amt;
      }
    }

    // Referral bonuses (already fetched in Wave 1)
    for (const b of referralBonuses ?? []) {
      const amt = b.type === "percent" ? Math.round(baseAmount * (b.value / 100)) : Math.round(b.value);
      if (amt > 0) {
        discounts.push({ name: "Referral Bonus", type: b.type, value: b.value, amount: amt });
        totalDiscount += amt;
      }
    }

    // Sibling discount if assigned (already fetched in Wave 2)
    let siblingState: any = null;
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
          // Apply discount only to the winner class
          const winnerClassBase = enrollmentBaseAmounts.get(sd.winner_class_id) || 0;
          const amt = Math.round(winnerClassBase * (sd.sibling_percent / 100));
          if (amt > 0) {
            discounts.push({
              name: "Sibling Discount",
              type: "percent",
              value: sd.sibling_percent,
              amount: amt,
              isSiblingWinner: true,
              appliedToClass: sd.winner_class_id,
            });
            totalDiscount += amt;
          }
        }
      }
    }

    const totalAmount = Math.max(0, baseAmount - totalDiscount);

    // ---------- Payments and carryovers ----------
    // Prior charges and current month invoice already fetched in Wave 1
    const otherInvoicesDetailed: any[] = priorInvoicesRes.data ?? [];
    const priorInvoicesDetailed = otherInvoicesDetailed.filter(inv => inv.month < month);
    const futureInvoicesDetailed = otherInvoicesDetailed.filter(inv => inv.month > month);
    const priorCharges = priorInvoicesDetailed.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
    const priorPayments = priorInvoicesDetailed.reduce(
      (s, inv) => s + Number(inv.recorded_payment ?? 0),
      0
    );
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
          type: 'charge' | 'payment' | 'canceled';
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
        netCarryIn: 0 // Will be set after calculation
      }
    };

    // Build month-by-month breakdown from prior invoices
    for (const invoice of priorInvoicesDetailed) {
      const invoiceMonth = invoice.month;
      const invoiceDate = new Date(`${invoiceMonth}-01T12:00:00+07:00`);
      const monthLabel = invoiceDate.toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric',
        timeZone: 'Asia/Bangkok'
      });
      
      const items: typeof priorBalanceBreakdown.months[0]['items'] = [];
      const classBreakdownData = invoice.class_breakdown || [];
      
      // Add class charges from breakdown
      for (const classItem of classBreakdownData) {
        items.push({
          type: 'charge',
          className: classItem.class_name,
          classId: classItem.class_id,
          amount: -Number(classItem.amount_vnd || 0),
          description: `${classItem.sessions_count || 0} sessions`
        });
      }
      
      // Add payment if any
      const recordedPayment = Number(invoice.recorded_payment ?? 0);
      if (recordedPayment > 0) {
        items.push({
          type: 'payment',
          amount: recordedPayment,
          description: 'Payment received'
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
        items
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

    // Build per-class breakdown for multi-enrollment students
    // Calculate per-class discounts for net_amount_vnd
    const classDiscounts = new Map<string, number>(); // class_id -> total discounts for that class
    
    // Add rate adjustment savings
    for (const [classId, savings] of rateAdjustmentSavings.entries()) {
      classDiscounts.set(classId, (classDiscounts.get(classId) || 0) + savings);
    }
    
    // Add enrollment-level discounts
    for (const e of (enrollments as EnrollmentRow[] | null | undefined) ?? []) {
      if (!e.discount_type || !e.discount_value) continue;
      const cadence = e.discount_cadence;
      if (cadence === "monthly" || cadence === "once") {
        const enrollmentBase = enrollmentBaseAmounts.get(e.class_id) || 0;
        if (enrollmentBase === 0) continue;
        const amt = e.discount_type === "percent"
          ? Math.round(enrollmentBase * (e.discount_value / 100))
          : Math.round(e.discount_value);
        if (amt > 0) {
          classDiscounts.set(e.class_id, (classDiscounts.get(e.class_id) || 0) + amt);
        }
      }
    }
    
    const classBreakdown = [];
    for (const [classId, baseAmount] of enrollmentBaseAmounts.entries()) {
      // Get class details from sessions
      const classSession = sessions?.find(s => s.class_id === classId);
      const classData = classSession?.classes ? 
        (Array.isArray(classSession.classes) ? classSession.classes[0] : classSession.classes) : null;
      
      const className = (classNameMap.get(classId) as string | undefined) || 'Unknown';
      const sessionRate = Number(classData?.session_rate_vnd ?? 0);
      const sessionsCount = sessionDetails.filter(sd => 
        sd.class_id === classId && (sd.status === 'Present' || sd.status === 'Absent')
      ).length;
      
      // net_amount_vnd = base - class-specific discounts (enrollment + rate adjustments)
      const classSpecificDiscounts = classDiscounts.get(classId) || 0;
      const netAmount = Math.max(0, baseAmount - classSpecificDiscounts);
      
      classBreakdown.push({
        class_id: classId,
        class_name: className,
        amount_vnd: baseAmount,
        net_amount_vnd: netAmount, // After class-specific discounts, before sibling/student discounts
        sessions_count: sessionsCount,
        session_rate_vnd: sessionRate
      });
    }

    // ---------- Persist invoice (safe) ----------
    // Calculate cumulative paid amount (all payments up to and including this month)
    const cumulativePaidAmount = priorPayments + monthPayments;
    
    // Try with extended fields first; fallback to minimal if schema lacks them.
    // Generate review flags - SIMPLIFIED: Only flag if final payable differs from expected
    const reviewFlags: any[] = [];
    
    // Only flag if there's a difference between expected and final
    if (totalAmount !== expectedClassTuition) {
      const discountReasons = discounts.map(d => d.name).filter((v, i, a) => a.indexOf(v) === i);
      reviewFlags.push({
        type: 'tuition_adjustment',
        label: 'Tuition differs from class rate',
        details: {
          expectedClassTuition,
          actualPayable: totalAmount,
          difference: expectedClassTuition - totalAmount,
          reasons: discountReasons
        }
      });
    }
    
    // Determine confirmation status - simple logic
    const confirmationStatus = reviewFlags.length === 0 ? 'auto_approved' : 'needs_review';

    const invoicePayloadExtended: any = {
      student_id: studentId,
      month,
      base_amount: baseAmount,
      discount_amount: totalDiscount,
      total_amount: totalAmount,
      paid_amount: cumulativePaidAmount,
      recorded_payment: monthPayments,
      carry_in_credit: carryInCredit,
      carry_in_debt: carryInDebt,
      carry_out_credit: carryOutCredit,
      carry_out_debt: carryOutDebt,
      confirmation_status: confirmationStatus,
      review_flags: reviewFlags,
      class_breakdown: classBreakdown, // Per-class tuition breakdown
      status: "issued",
      updated_at: new Date().toISOString(),
    };

    let invoiceUpsertOk = true;
    let invoiceErrorMsg = "";
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

    if (!invoiceUpsertOk) {
      // fallback minimal upsert (existing schema in your earlier code)
      const { error: invoiceErr2 } = await supabase.from("invoices").upsert(
        {
          student_id: studentId,
          month,
          base_amount: baseAmount,
          discount_amount: totalDiscount,
          total_amount: totalAmount,
          status: "issued",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "student_id,month" },
      );
      if (invoiceErr2) {
        console.error("Invoice upsert failed (both attempts):", invoiceErrorMsg, invoiceErr2.message);
      }
    }

    const response = {
      studentId,
      month,
      sessionCount: sessionDetails.length,
      sessionDetails,
      baseAmount,
      discounts,
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
        settledInMonth,
        status: balanceStatus, // 'credit' | 'debt' | 'settled'
        message: balanceMessage, // show in UI
      },
      siblingState,
      breakdown: {
        classes: classBreakdown
      },
      enrollments: enrollments?.map(e => ({
        class_id: e.class_id,
        class_name: sessions?.find(s => s.class_id === e.class_id)?.classes ? 
          (Array.isArray(sessions.find(s => s.class_id === e.class_id)!.classes) 
            ? (sessions.find(s => s.class_id === e.class_id)!.classes as any)[0]?.name 
            : (sessions.find(s => s.class_id === e.class_id)!.classes as any)?.name) 
          : 'Unknown',
        start_date: e.start_date,
        end_date: e.end_date
      })) || [],
      invoice: {
        base_amount: baseAmount,
        discount_amount: totalDiscount,
        total_amount: totalAmount,
        paid_amount: cumulativePaidAmount,
        recorded_payment: cumulativePaidAmount,
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
