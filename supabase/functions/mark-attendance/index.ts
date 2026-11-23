import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_lib/rate-limit.ts';
import { afterAttendanceMarked } from '../_lib/attendance-effects.ts';
import { attendanceRefusalKind, callerClient, mapDbError } from '../_lib/session-guard.ts';
import { BILLABLE, lessonEndedMoreThanAWeekAgo, monthIsPast, moneyPreview } from '../_lib/money-guard.ts';

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

    // AUTHORIZATION, PART TWO: is this session actually yours?
    //
    // The role check above proves only that the caller is *a* teacher. It
    // never related sessionId to them, so any teacher could mark attendance
    // on any session in the school by posting another session's id - and this
    // runs on the service-role key, so row-level security does not catch it.
    // That is not a cosmetic write: marking attendance flips the session to
    // Held, which feeds tuition recalculation and student point bonuses.
    //
    // Admins stay unrestricted. Everyone else has to pass the same two-tier
    // test as the rest of the app - on the roster for the class, or covering
    // it inside the window - so there is one definition of "your class" and
    // it lives in the database.
    const isAdmin = roles?.some((r) => r.role === 'admin') ?? false;

    const { data: currentSession, error: currentSessionError } = await supabase
      .from('sessions').select('status').eq('id', sessionId).maybeSingle();
    if (currentSessionError || !currentSession) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (currentSession.status === 'Canceled') {
      return new Response(JSON.stringify({ error: 'Cancelled lessons cannot be marked. All students are Excused and uncharged.' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isAdmin) {
      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('class_id')
        .eq('id', sessionId)
        .maybeSingle();

      if (sessionError || !session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: teachesClass, error: accessError } = await supabase.rpc('is_teacher_of_class', {
        user_id: user.id,
        class_id: session.class_id,
      });

      // Fail closed: an error here must deny, not fall through to the write.
      if (accessError || teachesClass !== true) {
        console.warn(`mark-attendance denied: user ${user.id} does not teach class ${session.class_id}`);
        return new Response(JSON.stringify({ error: 'You do not teach this class' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

    // D4 step 1b (docs/evidence/D4-design.md b.3, G-11). WHO WRITES:
    // - an ADMIN writes with their own JWT (a client built from their
    //   Authorization header), so the database judges an old billed mark
    //   (HC025) and the screen asks for a reason; never retried on the
    //   service key.
    // - a TEACHER writes with the service key as before, after this
    //   function applies G-11 rule 6 itself from the lesson's date and the
    //   stored marks (never the bill): a change across the billable line on
    //   a lesson that ended more than 7 days ago is refused when the
    //   lesson's month is past or a person's Present / Late is being
    //   un-billed. A slip past this check is still recorded by the database
    //   (service_retro_mark).
    // Proof a child was in the room (attendance_proof_for_session). A child with
    // proof is not written Absent or Excused: the database trigger would only keep
    // the old mark silently for the service key, so this check is what tells the
    // teacher. Asked through the caller's own client (the RPC checks the caller).
    // If the function is missing or fails, behave exactly as before.
    // Mirrored in src/lib/attendanceProof.ts (removalAdvice): where to remove the proof.
    const removalAdvice = (kinds: string[]) => {
      const parts: string[] = [];
      if (kinds.includes('individual_points')) parts.push("delete it in the child's point history");
      if (kinds.includes('speaker_mark')) parts.push("use Undo on the lesson's speakers page");
      return parts.length ? parts.join(' or ') : 'remove it first';
    };
    const proofSentence = (name: string, summary: string, kinds: string[]) =>
      `${name} was in this lesson: ${summary}. If that is a mistake, ${removalAdvice(kinds)}, then change the mark.`;
    const refusedForProof: Array<{ student_id: string; summary: string; kinds: string[] }> = [];
    // Only a request that would CHANGE the stored mark to Absent or Excused is refused (no row,
    // or a different stored status): the same condition the database trigger uses. A child
    // already stored as Absent/Excused and re-sent unchanged (or with a note change) is saved as before.
    if (entries.some((e) => e.status === 'Absent' || e.status === 'Excused')) {
      try {
        const { data: storedRows, error: storedErr } = await supabase
          .from('attendance').select('student_id, status').eq('session_id', sessionId);
        const storedBy = new Map<string, string>((storedErr ? [] : (storedRows ?? [])).map((a: any) => [a.student_id, a.status]));
        const candidates = entries.filter((e) =>
          (e.status === 'Absent' || e.status === 'Excused') && storedBy.get(e.studentId) !== e.status);
        if (candidates.length > 0) {
          const asCaller = callerClient(createClient, Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', authHeader);
          // A short timeout: after it, behave as if the function were missing.
          const answer: any = await Promise.race([
            asCaller.rpc('attendance_proof_for_session', { p_session_id: sessionId }),
            new Promise((resolve) => setTimeout(() => resolve(null), 4000)),
          ]);
          if (answer && !answer.error && Array.isArray(answer.data)) {
            const proven = new Map<string, { summary: string; kinds: string[] }>();
            for (const r of answer.data as any[]) {
              if (r?.strength === 'proof' && typeof r.student_id === 'string') {
                proven.set(r.student_id, { summary: String(r.summary ?? ''), kinds: Array.isArray(r.kinds) ? r.kinds.map(String) : [] });
              }
            }
            for (const e of candidates) {
              const hit = proven.get(e.studentId);
              if (hit) refusedForProof.push({ student_id: e.studentId, summary: hit.summary, kinds: hit.kinds });
            }
          }
        }
      } catch (proofErr) {
        console.warn('attendance proof check skipped:', proofErr);
      }
    }
    const refusedIds = new Set(refusedForProof.map((r) => r.student_id));
    const proofRefusal = async (students: Array<{ student_id: string; summary: string; kinds: string[] }>) => {
      let name = 'This child';
      if (students.length === 1) {
        const { data: st } = await supabase.from('students').select('full_name').eq('id', students[0].student_id).maybeSingle();
        if (st?.full_name) name = st.full_name;
      }
      const message = students.length === 1
        ? proofSentence(name, students[0].summary, students[0].kinds)
        : `These children were in this lesson, so their mark was not changed. If that is a mistake, ${removalAdvice([...new Set(students.flatMap((x) => x.kinds))])}, then change the mark.`;
      return new Response(JSON.stringify({ error: 'attendance_proof', message, students }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    };
    // Every child in the request refused: nothing to save.
    if (refusedForProof.length > 0 && refusedForProof.length === entries.length) {
      return await proofRefusal(refusedForProof);
    }
    if (refusedIds.size > 0) entries = entries.filter((e) => !refusedIds.has(e.studentId));

    const now = new Date().toISOString();
    const upsertRows = entries.map(e => ({
      session_id: sessionId,
      student_id: e.studentId,
      status: e.status,
      notes: e.notes || null,
      marked_by: user.id,
      marked_at: now,
    }));

    if (!isAdmin) {
      const { data: lesson } = await supabase
        .from('sessions').select('date, start_time, end_time').eq('id', sessionId).maybeSingle();
      if (!lesson) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (lessonEndedMoreThanAWeekAgo(lesson.date, lesson.start_time, lesson.end_time)) {
        const { data: stored, error: storedError } = await supabase
          .from('attendance').select('student_id, status, marked_by').eq('session_id', sessionId);
        if (storedError) throw new Error(`Failed to read the register: ${storedError.message}`);
        const byStudent = new Map((stored ?? []).map((a: any) => [a.student_id, a]));
        const past = monthIsPast(String(lesson.date).slice(0, 7));
        const refused = entries.some((e) => {
          const old: any = byStudent.get(e.studentId);
          const crossing = BILLABLE.has(old?.status ?? '') !== BILLABLE.has(e.status);
          const unbillPerson = !!old?.marked_by && (old.status === 'Present' || old.status === 'Late') && !BILLABLE.has(e.status);
          return crossing && (past || unbillPerson);
        });
        if (refused) {
          return new Response(JSON.stringify({
            error: 'This lesson is more than a week old. Please ask an administrator to change it.',
            code: 'attendance_requires_checked_path', kind: 'retro_mark_staff',
          }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }
    }

    const writer = isAdmin
      ? callerClient(createClient, Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', authHeader)
      : supabase;

    const { error: attendanceError } = await writer
      .from('attendance')
      .upsert(upsertRows, { onConflict: 'session_id,student_id' });

    if (attendanceError) {
      const raisedProof = /ATTENDANCE_PROOF:\s*(.+)/s.exec(String(attendanceError.message ?? ''));
      if (raisedProof) {
        return new Response(JSON.stringify({ error: 'attendance_proof', message: raisedProof[1].trim(), students: [] }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (attendanceError.code === '23514') {
        return new Response(JSON.stringify({ error: 'Attendance was not saved: cancelled lessons must remain Excused.' }), {
          status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (attendanceError.code === 'HC025' || attendanceError.code === 'HC024') {
        // Nothing was saved (one statement). For an admin: the preview of the
        // same change through the checked path, so the screen can ask for a reason.
        const m = mapDbError(attendanceError);
        const p = isAdmin
          ? await moneyPreview(writer, 'attendance', 'set_marks', {
              session_id: sessionId, marks: entries.map((e) => ({ student_id: e.studentId, status: e.status })) })
          : null;
        return new Response(JSON.stringify({
          error: m.message, code: m.code, kind: attendanceRefusalKind((attendanceError as any).details ?? (attendanceError as any).detail),
          preview: p && 'data' in p ? p.data : null,
          // children left out of this change because of proof: the reason dialog must not send them again
          ...(refusedForProof.length > 0 ? { refused: refusedForProof } : {}),
        }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      throw new Error(`Failed to mark attendance: ${attendanceError.message}`);
    }

    // Auto-mark session as Held (as the writer above)
    await writer
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

    // Tuition for Absent/Excused, streaks for Present. Lives in
    // _lib/attendance-effects.ts so the Stars sync runs the same code when
    // a register is marked from Pixel Pal - one definition of what a mark
    // does, not two that drift. The streak is read from the register up to
    // this lesson and its bonus is linked to it, hence sessionId.
    await afterAttendanceMarked(supabase, {
      classId: sessionData?.class_id,
      date: sessionData?.date,
      sessionId,
      entries,
    });

    console.log(`Attendance marked for ${entries.length} students`);

    return new Response(
      JSON.stringify({ success: true, count: entries.length, ...(refusedForProof.length > 0 ? { refused: refusedForProof } : {}) }),
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
