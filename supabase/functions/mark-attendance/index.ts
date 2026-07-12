import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SingleEntry = z.object({
  studentId: z.string().uuid(),
  status: z.enum(['Present', 'Absent', 'Excused', 'Late']),
  notes: z.string().max(500).optional(),
});

const RequestSchema = z.object({
  sessionId: z.string().uuid(),
  // Accept either a single entry or a batch
  studentId: z.string().uuid().optional(),
  status: z.enum(['Present', 'Absent', 'Excused', 'Late']).optional(),
  notes: z.string().max(500).optional(),
  batch: z.array(SingleEntry).optional(),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIP = getClientIP(req);
    const ipLimit = checkRateLimit(clientIP, 60, 60000, 'ip');
    if (ipLimit.limited) return rateLimitResponse(ipLimit.resetAt, corsHeaders);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userLimit = checkRateLimit(user.id, 40, 60000, 'user');
    if (userLimit.limited) return rateLimitResponse(userLimit.resetAt, corsHeaders);

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    if (!roles?.some(r => ['admin', 'teacher'].includes(r.role))) {
      return new Response(JSON.stringify({ error: 'Admin or teacher access required' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await req.json();
    const validationResult = RequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      return new Response(JSON.stringify({ error: "Invalid input", details: validationResult.error.issues }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { sessionId } = validationResult.data;

    // Normalize to entries array
    let entries: Array<{ studentId: string; status: string; notes?: string }>;
    if (validationResult.data.batch && validationResult.data.batch.length > 0) {
      entries = validationResult.data.batch;
    } else if (validationResult.data.studentId && validationResult.data.status) {
      entries = [{ studentId: validationResult.data.studentId, status: validationResult.data.status, notes: validationResult.data.notes }];
    } else {
      return new Response(JSON.stringify({ error: 'Provide studentId+status or batch array' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Marking attendance for ${entries.length} students in session ${sessionId}`);

    // Batch upsert all attendance records at once
    const now = new Date().toISOString();
    const upsertRows = entries.map(e => ({
      session_id: sessionId,
      student_id: e.studentId,
      status: e.status,
      notes: e.notes || null,
      marked_by: user.id,
      marked_at: now,
    }));

    const { error: attendanceError } = await supabase
      .from('attendance')
      .upsert(upsertRows, { onConflict: 'session_id,student_id' });

    if (attendanceError) {
      throw new Error(`Failed to mark attendance: ${attendanceError.message}`);
    }

    // Auto-mark session as Held
    await supabase
      .from('sessions')
      .update({ status: 'Held' })
      .eq('id', sessionId)
      .eq('status', 'Scheduled');

    // Get session info once for post-processing
    const { data: sessionData } = await supabase
      .from('sessions')
      .select('date, class_id')
      .eq('id', sessionId)
      .single();

    // Post-processing: tuition recalc for Absent/Excused, streak for Present — run in parallel
    const postOps: Promise<void>[] = [];

    const needsRecalc = entries.filter(e => e.status === 'Absent' || e.status === 'Excused');
    if (needsRecalc.length > 0 && sessionData) {
      const month = sessionData.date.substring(0, 7);
      for (const entry of needsRecalc) {
        postOps.push(
          supabase.functions.invoke('calculate-tuition', { body: { studentId: entry.studentId, month } })
            .then(({ error }) => { if (error) console.error('Tuition recalc error:', error); })
        );
      }
    }

    const presentEntries = entries.filter(e => e.status === 'Present');
    if (presentEntries.length > 0 && sessionData?.class_id) {
      const classId = sessionData.class_id;
      const today = new Date().toISOString().split('T')[0];

      postOps.push((async () => {
        try {
          const { data: streaks } = await supabase
            .from('student_attendance_streaks')
            .select('*')
            .eq('class_id', classId)
            .in('student_id', presentEntries.map(e => e.studentId));

          const streakMap = new Map((streaks || []).map(s => [s.student_id, s]));
          const upserts: any[] = [];
          const pointInserts: any[] = [];

          for (const entry of presentEntries) {
            const existing = streakMap.get(entry.studentId);
            let newConsecutive = 1;
            let bonusesAwarded = existing?.bonuses_awarded || 0;

            if (existing) {
              if (existing.last_attendance_date !== today) {
                newConsecutive = (existing.consecutive_days || 0) + 1;
              } else {
                newConsecutive = existing.consecutive_days || 1;
              }
            }

            const currentMilestones = Math.floor(newConsecutive / 5);
            if (currentMilestones > bonusesAwarded) {
              // point_transactions has no `reason` column and its type CHECK
              // rejects 'focus'; use the valid 'participation' type + `notes`
              // (date/month fall back to their column defaults). The previous
              // shape failed silently and never awarded streak bonuses.
              pointInserts.push({
                student_id: entry.studentId,
                class_id: classId,
                points: 50,
                type: 'participation',
                notes: `Attendance streak bonus: ${newConsecutive} consecutive classes attended!`,
              });
              bonusesAwarded = currentMilestones;
            }

            upserts.push({
              student_id: entry.studentId,
              class_id: classId,
              consecutive_days: newConsecutive,
              last_attendance_date: today,
              bonuses_awarded: bonusesAwarded,
              updated_at: now,
            });
          }

          if (upserts.length > 0) {
            await supabase.from('student_attendance_streaks').upsert(upserts, { onConflict: 'student_id,class_id' });
          }
          if (pointInserts.length > 0) {
            await supabase.from('point_transactions').insert(pointInserts);
          }
        } catch (err) {
          console.error('Streak tracking error:', err);
        }
      })());
    }

    // Wait for all post-processing
    await Promise.all(postOps);

    console.log(`Attendance marked for ${entries.length} students`);

    return new Response(
      JSON.stringify({ success: true, count: entries.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error marking attendance:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to mark attendance' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
