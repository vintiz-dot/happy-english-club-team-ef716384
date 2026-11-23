import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { acquireLock, releaseLock, ymNowBangkok } from '../_lib/lock.ts'
import { tieHash } from '../_lib/hash.ts'
import { requireRole } from '../_lib/auth.ts'
import { siblingHolds } from '../_lib/sibling-hold.ts'
import { chooseSiblingClass, type PricedMonth, type SiblingChild } from '../_lib/tuition-pricing.ts'

// Who gets a family's sibling discount for a month. The owner's rules
// (23 Nov 2026), decided in _lib/tuition-pricing.ts chooseSiblingClass:
//
//   - a family whose sibling percent is 0 has the discount switched OFF;
//   - it needs two or more children with billable lessons that month;
//   - it goes to ONE class: among every billable class of those children, the
//     one where the percentage comes to the least money for the school;
//   - it is decided once. A month that already has a winner keeps it, whatever
//     the register does afterwards, unless an admin sends `reassign: true`.
//
// This function prices nothing itself: each child's month comes from
// calculate-tuition (siblingPreview: no recursion, no bill written), which
// reports for every class the amount a sibling percentage would be taken from.

interface ChildMonth extends SiblingChild {
  studentName: string
  classNames: Map<string, string>
  enrollmentCount: number
}

async function childMonth(supabase: any, student: { id: string; full_name: string }, month: string): Promise<ChildMonth> {
  const { data, error } = await supabase.functions.invoke('calculate-tuition', {
    body: { studentId: student.id, month, siblingPreview: true },
  })
  if (error) {
    console.error(`Error calculating tuition for student ${student.id}:`, error)
    throw error
  }
  const rows: any[] = Array.isArray(data?.breakdown?.classes) ? data.breakdown.classes : []
  const classNames = new Map<string, string>()
  const classes = rows.filter((c) => c?.class_id).map((c) => {
    classNames.set(c.class_id, c.class_name || 'Unknown')
    // sibling_basis_vnd: the class's share of the month after every other
    // discount. A calculate-tuition that predates it reports the class after
    // its own discounts (net_amount_vnd), which is the same thing for a child
    // with no month-wide discount.
    const basis = Number(c.sibling_basis_vnd ?? c.net_amount_vnd ?? c.amount_vnd ?? 0)
    return {
      class_id: c.class_id as string,
      lessons: Number(c.sessions_count ?? 0),
      base_vnd: Number(c.amount_vnd ?? 0),
      own_discount_vnd: 0,
      after_own_vnd: Number(c.net_amount_vnd ?? c.amount_vnd ?? 0),
      sibling_basis_vnd: Number.isFinite(basis) ? basis : 0,
      sibling_discount_vnd: 0,
    }
  })
  const baseAmount = classes.reduce((n, c) => n + c.base_vnd, 0)
  const priced: PricedMonth = {
    lessons: classes.reduce((n, c) => n + c.lessons, 0),
    baseAmount,
    discounts: [],
    totalDiscount: 0,
    totalAmount: baseAmount,
    expectedClassTuition: baseAmount,
    classes,
  }
  return {
    studentId: student.id,
    studentName: student.full_name,
    month: priced,
    classNames,
    enrollmentCount: Array.isArray(data?.enrollments) ? data.enrollments.length : 0,
  }
}

/** The child's cheapest billable class, for the admin's list. */
function cheapestClass(child: ChildMonth) {
  const billable = child.month.classes.filter((c) => c.sibling_basis_vnd > 0)
  billable.sort((a, b) => a.sibling_basis_vnd - b.sibling_basis_vnd)
  return billable[0] ?? null
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SiblingDiscountRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  dryRun: z.boolean().optional().default(false),
  familyIds: z.array(z.string().uuid()).min(1).max(200).optional(),
  // Choose again for a month that already has a winner. Admins only, on purpose.
  reassign: z.boolean().optional().default(false),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const gate = await requireRole(req, supabase, ['admin'], corsHeaders);
    if (gate instanceof Response) return gate;

    // Input validation
    const body = await req.json().catch(() => ({}))
    const validationResult = SiblingDiscountRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(JSON.stringify({
        error: 'Invalid input',
        details: validationResult.error.issues
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const month = validationResult.data.month ?? ymNowBangkok()
    const dryRun = validationResult.data.dryRun ?? false
    // Only a person may undo a decision already made; the tuition functions
    // call this with the service key and must never reassign.
    const reassign = validationResult.data.reassign === true && !gate.isServiceRole

    console.log('Computing sibling discounts for month:', month, 'dryRun:', dryRun)

    // Acquire lock (skip in dry run mode)
    let lockAcquired = true
    if (!dryRun) {
      lockAcquired = await acquireLock(supabase, 'compute-sibling-discounts', month)
      if (!lockAcquired) {
        return new Response(JSON.stringify({
          success: false,
          reason: 'Job already running for this month'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    try {
      // Get all active families
      let familiesQuery = supabase
        .from('families')
        .select('id, name, sibling_percent_override')
        .eq('is_active', true)
      const familyIds = validationResult.data.familyIds;
      if (familyIds) familiesQuery = familiesQuery.in('id', familyIds);
      const { data: families, error: familiesError } = await familiesQuery;

      if (familiesError) throw familiesError

      const results = []
      const saveState = async (row: Record<string, unknown>) => {
        if (dryRun) return
        const { error: writeError } = await supabase
          .from('sibling_discount_state')
          .upsert({ month, computed_at: new Date().toISOString(), ...row })
        if (writeError) throw writeError
      }

      for (const family of families || []) {
        console.log(`Processing family ${family.id}`)
        const percent = Number(family.sibling_percent_override ?? 5)

        // Get all active students in family
        const { data: familyStudents, error: studentsError } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('family_id', family.id)
          .eq('is_active', true)

        if (studentsError) throw studentsError
        // A child on a sibling-discount hold does not count until it ends,
        // so a family of two with one on hold has no sibling discount yet.
        const held = await siblingHolds(supabase, [family.id], month)
        const students = (familyStudents ?? []).filter((s: any) => !held.has(s.id))
        const studentList = students.map((s: any) => ({ id: s.id, name: s.full_name }))

        // Decided once: a month that has a winner keeps it.
        const { data: existingState, error: existingError } = await supabase
          .from('sibling_discount_state')
          .select('status, winner_student_id, winner_class_id, sibling_percent, projected_base_snapshot, reason')
          .eq('family_id', family.id)
          .eq('month', month)
          .maybeSingle()
        if (existingError) throw existingError
        if (existingState?.status === 'assigned' && !reassign) {
          const keptPercent = Number(existingState.sibling_percent ?? percent)
          const keptBase = Number(existingState.projected_base_snapshot ?? 0)
          results.push({
            family_id: family.id,
            family_name: family.name,
            status: 'assigned',
            kept: true,
            reason: 'Already decided for this month; the winner is kept',
            student_count: students.length,
            winner_student_id: existingState.winner_student_id,
            winner_student_name: students.find((s: any) => s.id === existingState.winner_student_id)?.full_name ?? null,
            winner_class_id: existingState.winner_class_id,
            winner_base: keptBase,
            discount_percent: keptPercent,
            discount_amount: Math.round(keptBase * (keptPercent / 100)),
            students: studentList,
          })
          continue
        }

        // Percent 0: the family's sibling discount is switched off.
        if (!(percent > 0)) {
          await saveState({
            family_id: family.id,
            status: 'none',
            winner_student_id: null,
            winner_class_id: null,
            sibling_percent: 0,
            projected_base_snapshot: null,
            reason: 'Sibling discount is off for this family (0%)',
          })
          results.push({
            family_id: family.id,
            family_name: family.name,
            status: 'none',
            reason: 'sibling discount off (0%)',
            student_count: students.length,
            students: studentList,
          })
          continue
        }

        if (students.length < 2) {
          // Less than 2 students - no sibling discount possible
          await saveState({
            family_id: family.id,
            status: 'none',
            winner_student_id: null,
            winner_class_id: null,
            sibling_percent: percent,
            projected_base_snapshot: null,
            reason: `Family has ${students.length} student(s), need ≥2`,
          })
          results.push({
            family_id: family.id,
            family_name: family.name,
            status: 'none',
            reason: 'insufficient students',
            student_count: students.length,
            students: studentList,
          })
          continue
        }

        console.log(`Calculating actual tuition for family ${family.id} (${family.name})`)
        const children: ChildMonth[] = []
        for (const student of students) children.push(await childMonth(supabase, student, month))

        const familyTie = tieHash(family.id + month)
        const choice = chooseSiblingClass(children, percent, (studentId) => familyTie ^ tieHash(String(studentId)))

        // Each child's cheapest billable class, for the admin's list.
        const allStudentsDetail = children.map((c) => {
          const cheapest = cheapestClass(c)
          return {
            id: c.studentId,
            student_id: c.studentId,
            name: c.studentName,
            student_name: c.studentName,
            projected_base: cheapest?.sibling_basis_vnd ?? 0,
            projected_sessions: cheapest?.lessons ?? 0,
            highest_class: cheapest ? c.classNames.get(cheapest.class_id) : 'N/A',
            class_id: cheapest?.class_id ?? null,
            class_name: cheapest ? c.classNames.get(cheapest.class_id) : 'N/A',
            enrollment_count: c.enrollmentCount,
            reason: c.month.baseAmount > 0
              ? 'has tuition'
              : c.enrollmentCount > 0 ? 'no billable sessions (paused or no sessions scheduled)' : 'no active enrollments',
            is_winner: choice.status === 'assigned' && choice.studentId === c.studentId,
          }
        })

        if (choice.status !== 'assigned') {
          // Threshold not met: asked again the next time the month is priced.
          const billableCount = choice.status === 'pending' ? choice.billableChildren : 0
          await saveState({
            family_id: family.id,
            status: 'pending',
            winner_student_id: null,
            winner_class_id: null,
            sibling_percent: percent,
            projected_base_snapshot: null,
            reason: choice.reason,
          })
          results.push({
            family_id: family.id,
            family_name: family.name,
            status: 'pending',
            reason: 'threshold not met',
            student_count: students.length,
            positive_count: billableCount,
            students_data: allStudentsDetail.filter((s) => s.projected_base > 0),
            students: studentList,
            all_students: allStudentsDetail
          })
          continue
        }

        const winner = children.find((c) => c.studentId === choice.studentId)!
        const winnerClassName = winner.classNames.get(choice.classId) || 'Unknown'
        const wasPending = existingState?.status === 'pending'
        await saveState({
          family_id: family.id,
          status: 'assigned',
          winner_student_id: choice.studentId,
          winner_class_id: choice.classId,
          sibling_percent: percent,
          projected_base_snapshot: choice.basis,
          reason: `Winner: ${winnerClassName} - the class where ${percent}% costs least (${choice.basis.toLocaleString('vi-VN')} ₫)`,
        })

        results.push({
          family_id: family.id,
          family_name: family.name,
          status: 'assigned',
          student_count: students.length,
          winner_student_id: choice.studentId,
          winner_student_name: winner.studentName,
          winner_class_id: choice.classId,
          winner_class_name: winnerClassName,
          winner_base: choice.basis,
          discount_percent: percent,
          discount_amount: choice.amount,
          retroactive: wasPending,
          reassigned: existingState?.status === 'assigned',
          all_students: allStudentsDetail.filter((s) => s.projected_base > 0),
          students: studentList
        })

        console.log(`Assigned sibling discount to student ${choice.studentId} class ${choice.classId} (${choice.basis})`)
      }

      return new Response(JSON.stringify({
        success: true,
        dryRun,
        month,
        processed: families?.length || 0,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } finally {
      // Release lock (only if not dry run)
      if (!dryRun) {
        await releaseLock(supabase, 'compute-sibling-discounts', month)
      }
    }
  } catch (error) {
    console.error('Sibling discount computation error:', error)

    // Don't expose internal errors to client
    return new Response(JSON.stringify({
      error: 'Failed to compute sibling discounts',
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
