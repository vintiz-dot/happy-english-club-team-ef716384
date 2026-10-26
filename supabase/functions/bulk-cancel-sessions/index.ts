import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { refreshCancelledTuition } from '../_lib/refresh-cancelled-tuition.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BulkCancelRequestSchema = z.object({
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  class_id: z.string().uuid("Invalid class ID").optional(),
  teacher_id: z.string().uuid("Invalid teacher ID").optional(),
  reason: z.string().max(500, "Reason too long").optional(),
  include_held: z.boolean().optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => r.role === 'admin')) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Input validation
    const requestBody = await req.json();
    const validationResult = BulkCancelRequestSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { date_from, date_to, class_id, teacher_id, reason, include_held } = validationResult.data;

    console.log('Bulk cancel request:', { date_from, date_to, class_id, teacher_id, include_held });

    // Build query
    let query = supabase
      .from('sessions')
      .select('id, date, status, class_id, teacher_id, start_time, end_time');

    if (date_from) query = query.gte('date', date_from);
    if (date_to) query = query.lte('date', date_to);
    if (class_id) query = query.eq('class_id', class_id);
    if (teacher_id) query = query.eq('teacher_id', teacher_id);

    const { data: sessions, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    // Get current date in Bangkok timezone
    const now = new Date();
    const bkkNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const today = bkkNow.toISOString().split('T')[0];

    // Filter: cancel based on status and include_held flag
    const sessionsToCancel = sessions?.filter(s => {
      if (s.status === 'Scheduled') return true;
      
      // If include_held is enabled, allow canceling Held sessions
      if (include_held && s.status === 'Held') return true;
      
      return false;
    }) || [];

    const skipped = (sessions?.length || 0) - sessionsToCancel.length;

    if (sessionsToCancel.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        canceled: 0,
        skipped,
        message: 'No eligible sessions found to cancel',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cancel sessions
    const ids = sessionsToCancel.map(s => s.id);
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'Canceled',
        canceled_reason: reason || 'Bulk cancellation',
        canceled_by: user.id,
        canceled_at: new Date().toISOString(),
        is_manual: true,
        manual_reason: reason || 'Bulk cancellation',
      })
      .in('id', ids);

    if (updateError) throw updateError;
    await refreshCancelledTuition(supabase, sessionsToCancel);

    // Write audit log
    await supabase.from('audit_log').insert({
      action: 'bulk_cancel_sessions',
      entity: 'sessions',
      actor_user_id: user.id,
      diff: {
        count: ids.length,
        skipped,
        criteria: { date_from, date_to, class_id, teacher_id },
        reason,
        affected_ids: ids,
      },
    });

    console.log(`Bulk canceled ${ids.length} sessions, skipped ${skipped}`);

    return new Response(JSON.stringify({
      success: true,
      canceled: ids.length,
      skipped,
      affected_sessions: sessionsToCancel.map(s => ({
        id: s.id,
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Bulk cancel error:', error);
    
    // Don't expose internal errors to client
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to cancel sessions',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
