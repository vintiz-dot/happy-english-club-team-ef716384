import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

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

// Fetch with chunked .in() to handle large arrays
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
    let q = supabase.from(table).select(select).in(inColumn, ch);
    if (extraFilters) q = extraFilters(q);
    const { data, error } = await q;
    if (error) throw error;
    if (data) results.push(...data);
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

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getUser(token);
    if (claimsErr || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role check: only admin or teacher can access financial data
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id);
    const isAuthorized = roleData?.some((r: any) => ["admin", "teacher"].includes(r.role));
    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
    const allEnrollments: any[] = await fetchChunked(
      supabase, "enrollments",
      "student_id, class_id, discount_type, discount_value, discount_cadence, start_date, end_date, rate_override_vnd, allowed_days",
      "student_id", studentIds
    );

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

    const allSessionIds = allSessions.map(s => s.id);

    // 6. Attendance for all sessions + all students
    const allAttendance: any[] = allSessionIds.length > 0
      ? await fetchChunked(
          supabase, "attendance",
          "session_id, student_id, status",
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
      "student_id, discount_definitions(*)",
      "student_id", studentIds,
      (q: any) => q.lte("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
    );
    const discountsByStudent = new Map<string, any[]>();
    for (const d of allDiscountAssignments) {
      const arr = discountsByStudent.get(d.student_id) || [];
      arr.push(d);
      discountsByStudent.set(d.student_id, arr);
    }

    // 8. Referral bonuses
    let allReferralBonuses: any[] = [];
    try {
      allReferralBonuses = await fetchChunked(
        supabase, "referral_bonuses",
        "student_id, type, value",
        "student_id", studentIds,
        (q: any) => q.lte("effective_from", nextMonthStart).or(`effective_to.is.null,effective_to.gte.${startDate}`)
      );
    } catch { /* table may not exist */ }
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
      siblingStates = await fetchChunked(
        supabase, "sibling_discount_state",
        "family_id, status, winner_student_id, winner_class_id, sibling_percent, reason",
        "family_id", familyIds,
        (q: any) => q.eq("month", month)
      );
    }
    const siblingStateMap = new Map(siblingStates.map(s => [s.family_id, s]));

    // 10. Other invoices (all months != current) for all students
    const allOtherInvoices: any[] = await fetchChunked(
      supabase, "invoices",
      "student_id, total_amount, month, recorded_payment",
      "student_id", studentIds,
      (q: any) => q.neq("month", month).order("month", { ascending: true })
    );
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
      "student_id, id, recorded_payment, confirmation_status, status",
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
        const activeClassIds = enrollments
          .filter((e: any) => !e.end_date || e.end_date >= startDate)
          .map((e: any) => e.class_id);

        // Sessions for this student's classes
        const studentSessions: any[] = [];
        for (const cid of activeClassIds) {
          const classSessions = sessionsByClass.get(cid) || [];
          studentSessions.push(...classSessions);
        }

        // Calculate tuition
        let baseAmount = 0;
        const enrollmentBaseAmounts = new Map<string, number>();
        const rateAdjustmentSavings = new Map<string, number>();

        for (const s of studentSessions) {
          const enrollment = enrollments.find((e: any) =>
            e.class_id === s.class_id && e.start_date <= s.date && (!e.end_date || e.end_date >= s.date)
          );
          if (!enrollment) continue;

          const sessionDayOfWeek = getDayOfWeek(s.date);
          if (enrollment.allowed_days && !enrollment.allowed_days.includes(sessionDayOfWeek)) continue;

          const att = attendanceMap.get(attendanceKey(s.id, sid)) as AttendanceStatus | undefined;
          const classInfo = classMap.get(s.class_id);
          const defaultRate = Number(classInfo?.session_rate_vnd ?? 0);
          const overrideRate = enrollment.rate_override_vnd;
          const actualRate = overrideRate ?? defaultRate;
          // Late students attended, so they are billed like Present. Only
          // Excused (forgiven) absences are non-billable.
          const billable = att === "Present" || att === "Absent" || att === "Late";

          if (billable && actualRate > 0) {
            baseAmount += defaultRate;
            enrollmentBaseAmounts.set(s.class_id, (enrollmentBaseAmounts.get(s.class_id) || 0) + defaultRate);

            if (overrideRate && overrideRate < defaultRate) {
              const savings = defaultRate - overrideRate;
              rateAdjustmentSavings.set(s.class_id, (rateAdjustmentSavings.get(s.class_id) || 0) + savings);
            }
          }
        }

        // Discounts
        let totalDiscount = 0;

        // Rate adjustments
        for (const [, savings] of rateAdjustmentSavings) {
          if (savings > 0) totalDiscount += savings;
        }

        // Enrollment-level discounts
        for (const e of enrollments) {
          if (!e.discount_type || !e.discount_value) continue;
          if (e.discount_cadence === "monthly" || e.discount_cadence === "once") {
            const enrollmentBase = enrollmentBaseAmounts.get(e.class_id) || 0;
            if (enrollmentBase === 0) continue;
            const amt = e.discount_type === "percent"
              ? Math.round(enrollmentBase * (e.discount_value / 100))
              : Math.round(e.discount_value);
            if (amt > 0) totalDiscount += amt;
          }
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
            if (amt > 0) totalDiscount += amt;
          }
        }

        const totalAmount = Math.max(0, baseAmount - totalDiscount);

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
            session_rate_vnd: Number(classInfo?.session_rate_vnd ?? 0),
          });
        }

        results.push({
          studentId: sid,
          baseAmount,
          totalDiscount,
          totalAmount,
          payments: { priorPayments, monthPayments },
          carry: { carryInCredit, carryInDebt, carryOutCredit, carryOutDebt, settledInMonth },
          breakdown: { classes: classBreakdown },
          invoiceId: currentInvoice?.id || null,
          invoiceStatus: currentInvoice?.status || null,
          confirmationStatus: currentInvoice?.confirmation_status || null,
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
