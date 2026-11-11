import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'
import { ymNowBangkok } from '../_lib/lock.ts'
import { tieHash } from '../_lib/hash.ts'
import { getHighestClassPerStudent } from '../_lib/projected-per-class.ts'
import { requireRole } from '../_lib/auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // This assigns a family's sibling discount and posts a retroactive credit,
    // so only an admin, another function holding the service-role key, or a
    // scheduled job presenting the cron secret may run it. verify_jwt alone is
    // not a check: the public anon key is a valid JWT.
    const cronSecret = Deno.env.get('CRON_SECRET_TOKEN')
    const presented = req.headers.get('x-cron-secret')
    const isCron = !!cronSecret && !!presented && presented === cronSecret
    if (!isCron) {
      const gate = await requireRole(req, supabase, ['admin'], corsHeaders)
      if (gate instanceof Response) return gate
    }

    const body = await req.json().catch(() => ({}))
    const month = body?.month ?? ymNowBangkok()

    console.log(`Checking sibling threshold for month: ${month}`)

    const { data: pendingStates } = await supabase
      .from('sibling_discount_state')
      .select('family_id, sibling_percent')
      .eq('month', month)
      .eq('status', 'pending')

    console.log(`Found ${pendingStates?.length || 0} pending families`)

    let assignedCount = 0

    for (const state of pendingStates || []) {
      console.log(`Checking family ${state.family_id}`)
      
      const highestPerStudent = await getHighestClassPerStudent(supabase, state.family_id, month)
      // Use projected_base which now contains net_amount_vnd (after class discounts)
      const positives = highestPerStudent.filter((r: any) => r.projected_base > 0)

      console.log(`Family ${state.family_id} has ${positives.length} students with positive tuition`)

      if (positives.length < 2) {
        continue
      }

      // Threshold now met! Pick winner with deterministic tie-break
      // Winner = student with LOWEST highest-class tuition (net amount)
      positives.sort((a: any, b: any) => {
        if (a.projected_base !== b.projected_base) {
          return a.projected_base - b.projected_base // Sort ASCENDING - lowest first
        }
        const hashA = tieHash(state.family_id + month) ^ tieHash(String(a.student_id))
        const hashB = tieHash(state.family_id + month) ^ tieHash(String(b.student_id))
        if (hashA !== hashB) return hashA - hashB
        return String(a.student_id) < String(b.student_id) ? -1 : 1
      })

      const winner = positives[0]
      const percent = state.sibling_percent ?? 5

      console.log(`Assigning sibling discount to ${winner.student_id} class ${winner.class_id} with ${percent}% on net amount ${winner.projected_base}`)

      // Update state to assigned with snapshot
      await supabase.from('sibling_discount_state').upsert({
        family_id: state.family_id,
        month,
        status: 'assigned',
        winner_student_id: winner.student_id,
        winner_class_id: winner.class_id,
        sibling_percent: percent,
        projected_base_snapshot: winner.projected_base,
        reason: `Threshold met mid-month for ${winner.class_name} - retroactive credit applied`,
        computed_at: new Date().toISOString()
      }, { onConflict: 'family_id,month' })

      // Post retroactive credit
      const amount = Math.floor((winner.projected_base || 0) * (percent / 100))
      if (amount > 0) {
        console.log(`Posting retroactive credit of ${amount} VND`)
        
        const { error: creditError } = await supabase.rpc('post_sibling_retro_credit', {
          p_student_id: winner.student_id,
          p_month: month,
          p_amount: amount,
          p_memo: `Retro sibling discount ${percent}% for ${month}`
        })

        if (creditError) {
          console.error(`Failed to post credit:`, creditError)
        } else {
          // Audit log
          await supabase.from('audit_log').insert({
            actor_user_id: null,
            action: 'sibling_retro_credit',
            entity: 'sibling_discount_state',
            entity_id: winner.student_id,
            diff: { family_id: state.family_id, month, amount }
          })
          
          assignedCount++
        }
      }
    }

    console.log(`Assigned ${assignedCount} new sibling discounts for ${month}`)

    return new Response(JSON.stringify({ 
      success: true, 
      month,
      checked: pendingStates?.length || 0,
      assigned: assignedCount
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
