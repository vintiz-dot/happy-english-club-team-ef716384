import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const InputSchema = z.object({
      studentId: z.string().uuid(),
      classId: z.string().uuid(),
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      defaultStatus: z.enum(["Present", "Absent", "Excused"]),
    });

    const { studentId, classId, startDate, endDate, defaultStatus } = InputSchema.parse(await req.json());

    // Verify enrollment exists for date range
    const { data: enrollment } = await supabase
      .from("enrollments")
      .select("*")
      .eq("student_id", studentId)
      .eq("class_id", classId)
      .single();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: "No enrollment found for this student in this class" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Find sessions in range that don't have attendance
    const { data: sessions } = await supabase
      .from("sessions")
      .select("id, date, status")
      .eq("class_id", classId)
      .gte("date", startDate)
      .lte("date", endDate)
      .neq("status", "Canceled");

    if (!sessions || sessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No sessions found in date range", inserted: 0, sessions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check which sessions already have attendance
    const sessionIds = sessions.map(s => s.id);
    const { data: existingAttendance } = await supabase
      .from("attendance")
      .select("session_id")
      .in("session_id", sessionIds)
      .eq("student_id", studentId);

    const existingSessionIds = new Set(existingAttendance?.map(a => a.session_id) || []);
    const missingSessions = sessions.filter(s => !existingSessionIds.has(s.id));

    if (missingSessions.length === 0) {
      return new Response(
        JSON.stringify({ message: "All sessions already have attendance records", inserted: 0, sessions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Insert attendance records
    const attendanceRecords = missingSessions.map(s => ({
      session_id: s.id,
      student_id: studentId,
      status: defaultStatus,
      marked_by: null,
      notes: `Auto-repaired on ${new Date().toISOString().slice(0, 10)}`,
    }));

    const { data: inserted, error: insertError } = await supabase
      .from("attendance")
      .insert(attendanceRecords)
      .select();

    if (insertError) throw insertError;

    // Log audit
    await supabase
      .from("audit_log")
      .insert({
        actor_user_id: null,
        action: "repair_attendance",
        entity: "attendance",
        entity_id: studentId,
        diff: {
          student_id: studentId,
          class_id: classId,
          date_range: `${startDate} to ${endDate}`,
          inserted_count: inserted?.length || 0,
          sessions: missingSessions.map(s => ({ id: s.id, date: s.date })),
        },
      });

    return new Response(
      JSON.stringify({
        message: `Repaired ${inserted?.length || 0} attendance records`,
        inserted: inserted?.length || 0,
        sessions: missingSessions.map(s => ({ id: s.id, date: s.date, status: defaultStatus })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
