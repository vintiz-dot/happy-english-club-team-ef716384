import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { acquireLock, releaseLock, ymNowBangkok } from '../_lib/lock.ts'
import { tieHash } from '../_lib/hash.ts'
import { requireRole } from '../_lib/auth.ts'
import { siblingHolds } from '../_lib/sibling-hold.ts'
import { chooseSiblingClass, siblingFitByPayments, type PricedMonth, type SiblingChild } from '../_lib/tuition-pricing.ts'

// Who gets a family's sibling discount for a month. The owner's rules
// (23 Nov 2026), decided in _lib/tuition-pricing.ts chooseSiblingClass:
//
//   - a family whose sibling percent is 0 has the discount switched OFF;
//   - it needs two or more children with billable lessons that month;
//   - it goes to ONE class: among every billable class of those children, the
//     one where the percentage comes to the least money for the school;
//   - it is decided once. A month that already has a winner keeps it, whatever
//     the register does afterwards, unless an admin sends `reassign: true`, or
//     the family paid as if it were on another child (`swapByPayments`, below).
//
// This function prices nothing itself: each child's month comes from
// calculate-tuition (siblingPreview: no recursion, no bill written), which
// reports for every class the amount a sibling percentage would be taken from.

interface ChildMonth extends SiblingChild {
  studentName: string
  classNames: Map<string, string>
  enrollmentCount: number
  /** The child's month as priced today WITHOUT the sibling discount. */
  totalNoSibling: number
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
  // Today's pricing (never a locked or held bill's saved figures), with the
  // sibling discount, when this child holds it, put back.
  const siblingNow = (Array.isArray(data?.discounts) ? data.discounts : [])
    .filter((d: any) => d?.isSiblingWinner === true)
    .reduce((n: number, d: any) => n + Number(d.amount ?? 0), 0)
  const totalNow = Number(data?.projected?.totalAmount ?? data?.totalAmount ?? baseAmount)
  return {
    studentId: student.id,
    studentName: student.full_name,
    month: priced,
    classNames,
    enrollmentCount: Array.isArray(data?.enrollments) ? data.enrollments.length : 0,
    totalNoSibling: (Number.isFinite(totalNow) ? totalNow : baseAmount) + siblingNow,
  }
}

// ------------------------------------------------ the discount, as the family paid
//
// Owner, 24 Nov 2026: a family sometimes puts the sibling discount on another
// child than the one chosen here, and pays that way. When every child's payment
// for the month is, to the dong, their bill with the discount on that other
// child, the discount is moved there for that month and the bills are saved
// again - automatically, and listed (audit_log, action sibling_swap_by_payments;
// Finance > Tuition shows the list). The rule is siblingFitByPayments in
// _lib/tuition-pricing.ts; this only fetches, writes the state and asks
// calculate-tuition to save the bills (settleToPayment: a closed month's bill
// is saved only when it then equals what was paid).

export const SWAP_ACTION = 'sibling_swap_by_payments'

// calculate-tuition allows 30 calls a minute per caller address, and this
// function prices a family child by child. The swap check spaces its calls
// (as refresh-month-bills does) and stops starting new families after a while:
// the ones not reached say so, and the next run does them.
const SWAP_PACE_MS = (() => {
  const n = Number(Deno.env.get('SIBLING_SWAP_PACE_MS'))
  return Number.isFinite(n) && n >= 0 ? n : 2100
})()
const SWAP_TIME_BUDGET_MS = 100_000
let lastSwapCall = 0
async function pacedSwapCall() {
  const wait = lastSwapCall + SWAP_PACE_MS - Date.now()
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastSwapCall = Date.now()
}

async function swapFamilyByPayments(supabase: any, family: any, month: string, dryRun: boolean) {
  const { data: state, error: stateError } = await supabase
    .from('sibling_discount_state')
    .select('status, winner_student_id, winner_class_id, sibling_percent')
    .eq('family_id', family.id)
    .eq('month', month)
    .maybeSingle()
  if (stateError) throw stateError
  if (state?.status !== 'assigned' || !state.winner_student_id || !state.winner_class_id) return null
  const percent = Number(state.sibling_percent ?? 0)
  if (!(percent > 0)) return null

  // Every child of the family, still active or not: a past month is judged
  // with the children who were billed in it.
  const { data: familyStudents, error: studentsError } = await supabase
    .from('students').select('id, full_name').eq('family_id', family.id)
  if (studentsError) throw studentsError
  const held = await siblingHolds(supabase, [family.id], month)
  const students = (familyStudents ?? []).filter((s: any) => !held.has(s.id))
  if (students.length < 2) return null

  const { data: bills, error: billsError } = await supabase
    .from('invoices')
    .select('student_id, base_amount, total_amount, recorded_payment, tuition_frozen')
    .eq('month', month)
    .in('student_id', students.map((s: any) => s.id))
  if (billsError) throw billsError
  const billOf = new Map<string, any>((bills ?? []).map((b: any) => [b.student_id, b]))
  const charged = (bills ?? []).filter((b: any) => Number(b.base_amount ?? 0) > 0)
  // Nothing to judge without two charged bills that both hold a payment, and
  // nothing to move when each was paid exactly as it stands. No pricing needed.
  if (charged.length < 2) return null
  if (charged.some((b: any) => !(Number(b.recorded_payment ?? 0) > 0))) return null
  if (charged.every((b: any) => Number(b.recorded_payment ?? 0) === Number(b.total_amount ?? 0))) return null

  const base = { family_id: family.id, family_name: family.name, month }
  const children: ChildMonth[] = []
  for (const student of students) {
    await pacedSwapCall()
    children.push(await childMonth(supabase, student, month))
  }
  const fit = siblingFitByPayments(
    children.map((c) => ({
      studentId: c.studentId,
      month: { ...c.month, totalAmount: c.totalNoSibling },
      paid: Number(billOf.get(c.studentId)?.recorded_payment ?? 0),
    })),
    percent,
    { studentId: state.winner_student_id, classId: state.winner_class_id },
  )
  if (!fit) return { ...base, status: 'kept', reason: 'The payments do not fit the discount on another child' }

  const from = children.find((c) => c.studentId === state.winner_student_id)
  const to = children.find((c) => c.studentId === fit.studentId)!
  const toClassName = to.classNames.get(fit.classId) || 'Unknown'
  const detail = {
    ...base,
    percent,
    from: { student_id: state.winner_student_id, student_name: from?.studentName ?? null, class_id: state.winner_class_id,
      class_name: from?.classNames.get(state.winner_class_id) ?? null },
    to: { student_id: fit.studentId, student_name: to.studentName, class_id: fit.classId, class_name: toClassName, discount: fit.amount },
    bills: fit.totals.map((t) => ({
      student_id: t.studentId,
      student_name: children.find((c) => c.studentId === t.studentId)?.studentName ?? null,
      was: Number(billOf.get(t.studentId)?.total_amount ?? 0),
      now: t.total,
      paid: Number(billOf.get(t.studentId)?.recorded_payment ?? 0),
    })),
  }
  // A locked bill keeps its figures whatever is asked: leave the family as it is.
  const changing = detail.bills.filter((b) => b.was !== b.now)
  const locked = changing.filter((b) => billOf.get(b.student_id)?.tuition_frozen === true)
  if (locked.length > 0) {
    return { ...detail, status: 'skipped', reason: `A bill that would change is locked (${locked.map((b) => b.student_name).join(', ')}): unlock it to move the discount` }
  }
  if (dryRun) return { ...detail, status: 'would_swap' }

  const reason = `Sibling discount moved to ${to.studentName} (${toClassName}): the payments recorded for ${month} fit it there to the dong`
  const { error: writeError } = await supabase
    .from('sibling_discount_state')
    .update({
      winner_student_id: fit.studentId,
      winner_class_id: fit.classId,
      projected_base_snapshot: to.month.classes.find((k) => k.class_id === fit.classId)?.sibling_basis_vnd ?? null,
      reason,
      computed_at: new Date().toISOString(),
    })
    .eq('family_id', family.id)
    .eq('month', month)
    // Only the decision that was judged: a winner changed meanwhile is left alone.
    .eq('winner_student_id', state.winner_student_id)
    .eq('winner_class_id', state.winner_class_id)
  if (writeError) throw writeError

  // Save the bills that change. Each must come to exactly what was paid.
  const saved: any[] = []
  for (const b of changing) {
    let outcome: Record<string, unknown> = { student_id: b.student_id, student_name: b.student_name, ok: false }
    try {
      await pacedSwapCall()
      const { data, error } = await supabase.functions.invoke('calculate-tuition', {
        body: { studentId: b.student_id, month, settleToPayment: true, reason: `${reason} (automatic)` },
      })
      if (error || data?.error) outcome = { ...outcome, error: String(data?.error ?? error?.message ?? 'not saved') }
      else if (data?.held) outcome = { ...outcome, error: 'held: the bill did not come to what was paid, so it stays as charged' }
      else if (data?.invoiceSaved === false) outcome = { ...outcome, error: 'not saved' }
      else if (Number(data?.totalAmount) !== b.paid) outcome = { ...outcome, error: `saved at ${data?.totalAmount}, not the ${b.paid} paid` }
      else outcome = { ...outcome, ok: true, total: Number(data.totalAmount) }
    } catch (e) {
      outcome = { ...outcome, error: e instanceof Error ? e.message : String(e) }
    }
    saved.push(outcome)
  }
  const allSaved = saved.every((s) => s.ok)
  const result = { ...detail, status: allSaved ? 'swapped' : 'swapped_bills_not_saved', saved }
  const { error: logError } = await supabase.from('audit_log').insert({
    action: SWAP_ACTION,
    entity: 'sibling_discount_state',
    entity_id: `${family.id}:${month}`,
    diff: result,
  })
  if (logError) console.error('sibling swap not logged:', logError.message)
  return { ...result, logged: !logError }
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
  // Move the discount to the child the family paid for, where the payments
  // say so to the dong, and save the bills. Decides nothing else.
  swapByPayments: z.boolean().optional().default(false),
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
      // Get all active families. The swap check judges a month as it was paid,
      // so it also looks at families that have left since.
      const swapByPayments = validationResult.data.swapByPayments === true
      let familiesQuery = supabase
        .from('families')
        .select('id, name, sibling_percent_override')
      if (!swapByPayments) familiesQuery = familiesQuery.eq('is_active', true)
      const familyIds = validationResult.data.familyIds;
      if (familyIds) familiesQuery = familiesQuery.in('id', familyIds);
      const { data: families, error: familiesError } = await familiesQuery;

      if (familiesError) throw familiesError

      if (swapByPayments) {
        const swaps: any[] = []
        const swapStarted = Date.now()
        for (const family of families || []) {
          if (Date.now() - swapStarted > SWAP_TIME_BUDGET_MS) {
            swaps.push({ family_id: family.id, family_name: family.name, month, status: 'error',
              reason: 'Not reached in this run: check the month again' })
            continue
          }
          try {
            const r = await swapFamilyByPayments(supabase, family, month, dryRun)
            if (r) swaps.push(r)
          } catch (e) {
            swaps.push({ family_id: family.id, family_name: family.name, month, status: 'error',
              reason: e instanceof Error ? e.message : String((e as any)?.message ?? e) })
          }
        }
        return new Response(JSON.stringify({
          success: true,
          dryRun,
          month,
          swapByPayments: true,
          processed: families?.length || 0,
          results: swaps,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

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
