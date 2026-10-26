import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { refreshCancelledTuition } from '../_lib/refresh-cancelled-tuition.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SessionActionSchema = z.object({
  action: z.enum(['update', 'cancel', 'force-cancel', 'change-status', 'bulk-delete', 'delete', 'create']),
  data: z.record(z.any()),
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

    // Rate limiting: 50 session management actions per minute per user
    const clientIP = getClientIP(req);
    const userRateCheck = checkRateLimit(user.id, 50, 60 * 1000, 'user');
    if (userRateCheck.limited) {
      console.warn(`Rate limit exceeded for user ${user.id} on manage-session`);
      await supabase.from('audit_log').insert({
        action: 'rate_limit_exceeded',
        entity: 'session',
        actor_user_id: user.id,
        diff: { reason: 'session_management_rate_limit', ip: clientIP }
      });
      return rateLimitResponse(userRateCheck.resetAt, corsHeaders);
    }

    // Input validation
    const requestBody = await req.json();
    const validationResult = SessionActionSchema.safeParse(requestBody);
    
    if (!validationResult.success) {
      return new Response(JSON.stringify({ 
        error: "Invalid input", 
        details: validationResult.error.issues 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, data } = validationResult.data;

    if (action === 'update') {
      const { id, teacher_id, rate_override_vnd, status, notes, is_manual, manual_reason } = data;
      const { data: oldSession } = await supabase.from('sessions').select('*').eq('id', id).single();

      // Detect if manual edit (teacher or time change)
      const isManualEdit = teacher_id !== undefined && teacher_id !== oldSession?.teacher_id;

      const { error } = await supabase.from('sessions').update({
        teacher_id: teacher_id !== undefined ? teacher_id : oldSession?.teacher_id,
        rate_override_vnd: rate_override_vnd !== undefined ? rate_override_vnd : oldSession?.rate_override_vnd,
        status: status || oldSession?.status,
        notes: notes !== undefined ? notes : oldSession?.notes,
        is_manual: is_manual !== undefined ? is_manual : (isManualEdit || oldSession?.is_manual),
        manual_reason: manual_reason || (isManualEdit ? 'Manual teacher reassignment' : oldSession?.manual_reason),
        updated_by: user.id,
      }).eq('id', id);

      if (error) throw error;

      if (status === 'Canceled' && oldSession) await refreshCancelledTuition(supabase, [oldSession]);
      await supabase.from('audit_log').insert({
        action: 'session_update',
        entity: 'sessions',
        entity_id: id,
        actor_user_id: user.id,
        diff: { before: oldSession, after: data }
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cancel') {
      const { id, reason } = data;
      const { data: session } = await supabase.from('sessions').select('id, status, date').eq('id', id).single();
      
      // Regular cancel blocks past Held sessions
      const now = new Date();
      const sessionDate = new Date(session?.date || '');
      if (session?.status === 'Held' && sessionDate < now) {
        return new Response(JSON.stringify({ error: 'Cannot cancel past Held sessions via regular cancel. Use admin override.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { error } = await supabase.from('sessions').update({
        status: 'Canceled',
        canceled_reason: reason,
        canceled_by: user.id,
        canceled_at: new Date().toISOString(),
        updated_by: user.id,
      }).eq('id', id);

      if (error) throw error;

      if (session) await refreshCancelledTuition(supabase, [session]);
      await supabase.from('audit_log').insert({
        action: 'session_cancel',
        entity: 'sessions',
        entity_id: id,
        actor_user_id: user.id,
        diff: { reason, old_status: session?.status }
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'force-cancel') {
      const { id, reason } = data;
      const { data: oldSession } = await supabase.from('sessions').select('*').eq('id', id).single();
      
      const { error } = await supabase.from('sessions').update({
        status: 'Canceled',
        canceled_reason: reason || 'Admin force-canceled (correction)',
        canceled_by: user.id,
        canceled_at: new Date().toISOString(),
        updated_by: user.id,
      }).eq('id', id);

      if (error) throw error;

      if (oldSession) await refreshCancelledTuition(supabase, [oldSession]);
      await supabase.from('audit_log').insert({
        action: 'session_force_cancel',
        entity: 'sessions',
        entity_id: id,
        actor_user_id: user.id,
        diff: { 
          reason,
          old_status: oldSession?.status,
          new_status: 'Canceled',
          note: 'Admin override for mistake correction'
        }
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'change-status') {
      const { id, status, reason } = data;
      
      if (!['Scheduled', 'Held', 'Canceled'].includes(status)) {
        return new Response(JSON.stringify({ error: 'Invalid status' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: oldSession } = await supabase.from('sessions').select('*').eq('id', id).single();

      const updates: any = {
        status,
        updated_by: user.id,
      };

      if (status === 'Canceled') {
        updates.canceled_reason = reason || 'Admin status change';
        updates.canceled_by = user.id;
        updates.canceled_at = new Date().toISOString();
      }

      const { error } = await supabase.from('sessions').update(updates).eq('id', id);
      if (error) throw error;
      if (status === 'Canceled' && oldSession) await refreshCancelledTuition(supabase, [oldSession]);

      await supabase.from('audit_log').insert({
        action: 'session_status_change',
        entity: 'sessions',
        entity_id: id,
        actor_user_id: user.id,
        diff: { 
          old_status: oldSession?.status,
          new_status: status,
          reason,
          note: 'Admin override for mistake correction'
        }
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'bulk-delete') {
      const { class_id, teacher_id, from_date, to_date, hard_delete = false } = data;
      
      let query = supabase.from('sessions').select('*');
      
      if (class_id) query = query.eq('class_id', class_id);
      if (teacher_id) query = query.eq('teacher_id', teacher_id);
      if (from_date) query = query.gte('date', from_date);
      if (to_date) query = query.lte('date', to_date);
      
      const { data: sessions, error: fetchError } = await query;
      if (fetchError) throw fetchError;

      // Prevent deletion of past Held sessions
      const today = new Date().toISOString().split('T')[0];
      const sessionsToProcess = sessions?.filter(s => {
        if (s.status === 'Held' && s.date < today) {
          return false; // Skip past Held sessions
        }
        return true;
      }) || [];

      if (hard_delete) {
        // Hard delete
        const ids = sessionsToProcess.map(s => s.id);
        if (ids.length > 0) {
          const { error } = await supabase.from('sessions').delete().in('id', ids);
          if (error) throw error;
        }
        
        await supabase.from('audit_log').insert({
          action: 'session_bulk_hard_delete',
          entity: 'sessions',
          actor_user_id: user.id,
          diff: { count: ids.length, ids, criteria: { class_id, teacher_id, from_date, to_date } }
        });

        return new Response(JSON.stringify({ 
          ok: true, 
          deleted: ids.length,
          skipped: (sessions?.length || 0) - ids.length 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        // Soft delete (cancel)
        const ids = sessionsToProcess.map(s => s.id);
        if (ids.length > 0) {
          const { error } = await supabase.from('sessions').update({
            status: 'Canceled',
            canceled_reason: 'Bulk cancellation',
            canceled_by: user.id,
            canceled_at: new Date().toISOString(),
          }).in('id', ids);
          if (error) throw error;
        }

        await refreshCancelledTuition(supabase, sessionsToProcess);
        await supabase.from('audit_log').insert({
          action: 'session_bulk_cancel',
          entity: 'sessions',
          actor_user_id: user.id,
          diff: { count: ids.length, criteria: { class_id, teacher_id, from_date, to_date } }
        });

        return new Response(JSON.stringify({ 
          ok: true, 
          canceled: ids.length,
          skipped: (sessions?.length || 0) - ids.length 
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (action === 'delete') {
      const { id } = data;
      const { data: oldSession } = await supabase.from('sessions').select('*').eq('id', id).single();
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'session_delete',
        entity: 'sessions',
        entity_id: id,
        actor_user_id: user.id,
        diff: { deleted: oldSession }
      });

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'create') {
      const { class_id, date, start_time, end_time, teacher_id, rate_override_vnd, notes, status, is_manual, manual_reason } = data;

      const { data: newSession, error } = await supabase.from('sessions').insert({
        class_id, date, start_time, end_time, teacher_id,
        rate_override_vnd: rate_override_vnd || null,
        notes: notes || null,
        status: status || 'Scheduled',
        is_manual: is_manual || true, // Ad-hoc sessions are manual by default
        manual_reason: manual_reason || 'Admin ad-hoc creation',
        created_by: user.id,
      }).select().single();

      if (error) throw error;

      await supabase.from('audit_log').insert({
        action: 'session_create',
        entity: 'sessions',
        entity_id: newSession.id,
        actor_user_id: user.id,
        diff: { created: newSession }
      });

      return new Response(JSON.stringify({ ok: true, session: newSession }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Session management error:', error);
    
    // Don't expose internal errors to client
    return new Response(JSON.stringify({ error: 'Session operation failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
