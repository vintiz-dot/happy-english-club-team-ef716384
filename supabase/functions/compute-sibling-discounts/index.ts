import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { acquireLock, releaseLock, ymNowBangkok } from '../_lib/lock.ts'
import { tieHash } from '../_lib/hash.ts'
import { requireRole } from '../_lib/auth.ts'

// Helper to get actual tuition per student per class using calculate-tuition
async function getActualTuitionPerStudent(supabase: any, studentId: string, month: string) {
  try {
    // Call calculate-tuition edge function to get actual tuition
    const { data, error } = await supabase.functions.invoke('calculate-tuition', {
      body: { studentId, month, siblingPreview: true }
    });
    
    if (error) {
      console.error(`Error calculating tuition for student ${studentId}:`, error);
      throw error;
    }
    
    // Extract class breakdown from the response
    const classBreakdown = data?.breakdown?.classes || [];
    
    return {
      student_id: studentId,
      total_base: data?.tuition?.baseAmount || 0,
      classes: classBreakdown,
      enrollments: data?.enrollments || []
    };
  } catch (err) {
    console.error(`Exception calculating tuition for student ${studentId}:`, err);
    throw err;
  }
}

// Get highest-tuition class per student based on actual tuition calculation
async function getHighestClassPerStudent(supabase: any, familyId: string, month: string) {
  const { data: students, error } = await supabase
    .from('students')
    .select('id, full_name')
    .eq('family_id', familyId)
    .eq('is_active', true);
  if (error) throw error;
  
  if (!students || students.length === 0) {
    return [];
  }
  
  const result = [];
  
  for (const student of students) {
    const tuitionData = await getActualTuitionPerStudent(supabase, student.id, month);
    
    if (!tuitionData || !tuitionData.classes || tuitionData.classes.length === 0) {
      // No tuition but may have enrollments - use enrollment data from calculate-tuition response
      const enrollments = tuitionData?.enrollments || [];
      
      // Find highest class from enrollments (by class name for display)
      let highestClassName = 'N/A';
      let highestClassId = null;
      
      if (enrollments.length > 0) {
        // Use the first enrollment's class info for display
        const firstEnrollment = enrollments[0];
        highestClassName = firstEnrollment.class_name || 'Unknown Class';
        highestClassId = firstEnrollment.class_id || null;
      }
      
      result.push({
        student_id: student.id,
        student_name: student.full_name,
        projected_base: 0,
        projected_sessions: 0,
        class_name: highestClassName,
        class_id: highestClassId,
        enrollment_count: enrollments.length,
        reason: enrollments.length > 0 ? 'no billable sessions (paused or no sessions scheduled)' : 'no active enrollments'
      });
      continue;
    }
    
    // Find the highest-tuition class using NET amount (after class-specific discounts)
    let highestClass = null;
    let highestAmount = 0;
    
    for (const classInfo of tuitionData.classes) {
      // Use net_amount_vnd if available (after class discounts), fallback to amount_vnd
      const effectiveAmount = classInfo.net_amount_vnd ?? classInfo.amount_vnd;
      if (effectiveAmount > highestAmount) {
        highestAmount = effectiveAmount;
        highestClass = { ...classInfo, effective_amount: effectiveAmount };
      }
    }
    
    if (highestClass) {
      result.push({
        student_id: student.id,
        student_name: student.full_name,
        projected_base: highestClass.effective_amount, // Use net amount for comparison
        base_amount: highestClass.amount_vnd, // Keep original for reference
        projected_sessions: highestClass.sessions_count,
        class_name: highestClass.class_name,
        class_id: highestClass.class_id || null,
        enrollment_count: tuitionData.enrollments?.length || 0,
        reason: highestClass.effective_amount > 0 ? 'has tuition' : 'no billable sessions'
      });
    }
  }
  
  return result;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SiblingDiscountRequestSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  dryRun: z.boolean().optional().default(false),
  familyIds: z.array(z.string().uuid()).min(1).max(200).optional(),
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

      for (const family of families || []) {
        console.log(`Processing family ${family.id}`)

        // Get all active students in family
        const { data: students, error: studentsError } = await supabase
          .from('students')
          .select('id, full_name')
          .eq('family_id', family.id)
          .eq('is_active', true)

        if (studentsError) throw studentsError

        if (!students || students.length < 2) {
          // Less than 2 students - no sibling discount possible
          if (!dryRun) {
            const { error: writeError } = await supabase
              .from('sibling_discount_state')
              .upsert({
                family_id: family.id,
                month,
                status: 'none',
                winner_student_id: null,
                sibling_percent: family.sibling_percent_override ?? 5,
                winner_class_id: null,
                projected_base_snapshot: null,
                reason: `Family has ${students?.length || 0} student(s), need ≥2`,
                computed_at: new Date().toISOString()
              })
            if (writeError) throw writeError;
          }
          
          results.push({ 
            family_id: family.id,
            family_name: family.name,
            status: 'none', 
            reason: 'insufficient students',
            student_count: students?.length || 0,
            students: students?.map((s: any) => ({ id: s.id, name: s.full_name }))
          })
          continue
        }

        // Get highest-tuition class per student using actual tuition calculation
        console.log(`Calculating actual tuition for family ${family.id} (${family.name})`)
        const highestPerStudent = await getHighestClassPerStudent(supabase, family.id, month)
        console.log(`Family ${family.id} highest classes per student:`, highestPerStudent)

        // Filter students with positive tuition in their highest class
        const positives = highestPerStudent.filter((r: any) => r.projected_base > 0)
        
        // All students detail is already in highestPerStudent with reason
        const allStudentsDetail = highestPerStudent.map((h: any) => ({
          id: h.student_id,
          name: h.student_name,
          projected_base: h.projected_base,
          projected_sessions: h.projected_sessions,
          highest_class: h.class_name,
          enrollment_count: h.enrollment_count,
          reason: h.reason
        }))

        if (positives.length < 2) {
          // Threshold not met
          const percent = family.sibling_percent_override ?? 5
          if (!dryRun) {
            const { error: writeError } = await supabase
              .from('sibling_discount_state')
              .upsert({
                family_id: family.id,
                month,
                status: 'pending',
                winner_student_id: null,
                winner_class_id: null,
                sibling_percent: percent,
                projected_base_snapshot: null,
                reason: `Only ${positives.length} student(s) with positive tuition, need ≥2`,
                computed_at: new Date().toISOString()
              })
            if (writeError) throw writeError;
          }

          results.push({ 
            family_id: family.id,
            family_name: family.name,
            status: 'pending', 
            reason: 'threshold not met',
            student_count: students?.length || 0,
            positive_count: positives.length,
            students_data: positives,
            students: students?.map((s: any) => ({ id: s.id, name: s.full_name })),
            all_students: allStudentsDetail
          })
          continue
        }

        // Select winner: sibling with LOWEST highest-tuition class with deterministic tie-break
        const percent = family.sibling_percent_override ?? 5
        positives.sort((a: any, b: any) => {
          if (a.projected_base !== b.projected_base) {
            return a.projected_base - b.projected_base // Sort ASCENDING - lowest first
          }
          // Tie-breaker: hash(familyId+month) XOR hash(studentId), then student_id
          const hashA = tieHash(family.id + month) ^ tieHash(String(a.student_id))
          const hashB = tieHash(family.id + month) ^ tieHash(String(b.student_id))
          if (hashA !== hashB) return hashA - hashB
          return String(a.student_id) < String(b.student_id) ? -1 : 1
        })

        const winner = positives[0]

        // Check if status was previously pending (for retroactive application)
        let wasPending = false
        if (!dryRun) {
          const { data: existingState } = await supabase
            .from('sibling_discount_state')
            .select('status, winner_student_id')
            .eq('family_id', family.id)
            .eq('month', month)
            .maybeSingle()

          wasPending = existingState?.status === 'pending'

          const { error: writeError } = await supabase
            .from('sibling_discount_state')
            .upsert({
              family_id: family.id,
              month,
              status: 'assigned',
              winner_student_id: winner.student_id,
              winner_class_id: winner.class_id,
              sibling_percent: percent,
              projected_base_snapshot: winner.projected_base,
              reason: `Winner: ${winner.class_name} - lowest highest-tuition (${winner.projected_base.toLocaleString('vi-VN')} ₫)`,
              computed_at: new Date().toISOString()
            })
          if (writeError) throw writeError;
        }

        const discountAmount = Math.round(winner.projected_base * (percent / 100))

        // Get student names for display - already in highestPerStudent
        const studentsWithNames = positives.map((p: any) => ({
          student_id: p.student_id,
          student_name: p.student_name || 'Unknown',
          class_id: p.class_id,
          class_name: p.class_name,
          projected_base: p.projected_base,
          is_winner: p.student_id === winner.student_id
        }))

        results.push({ 
          family_id: family.id,
          family_name: family.name,
          status: 'assigned',
          student_count: students?.length || 0,
          winner_student_id: winner.student_id,
          winner_student_name: winner.student_name,
          winner_class_id: winner.class_id,
          winner_class_name: winner.class_name,
          winner_base: winner.projected_base,
          discount_percent: percent,
          discount_amount: discountAmount,
          retroactive: wasPending,
          all_students: studentsWithNames,
          students: students?.map((s: any) => ({ id: s.id, name: s.full_name }))
        })

        console.log(`Assigned sibling discount to student ${winner.student_id} (${winner.projected_base})`)
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