import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get the authorization header to validate the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to get their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // The cover window. MUST MATCH is_teacher_of_class (see
    // supabase/migrations/20261007120000_scope_teacher_class_access_in_time.sql)
    // and src/lib/teacherAccess.ts. Roster membership is permanent; covering a
    // class is not, and this function previously treated them the same.
    const COVER_TRAILING_DAYS = 7;
    const COVER_UPCOMING_DAYS = 60;
    const asDate = (offsetDays: number) => {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };
    const coverFrom = asDate(-COVER_TRAILING_DAYS);
    const coverTo = asDate(COVER_UPCOMING_DAYS);

    // Parse request body
    const { classId, month } = await req.json();
    if (!classId || !month) {
      return new Response(JSON.stringify({ error: "classId and month are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ----- Wave 1: identity lookups + main enrollments, all in parallel -----
    const [teacherRes, userStudentRes, familyRes, enrollmentsRes] = await Promise.all([
      adminClient.from("teachers")
        .select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      adminClient.from("students")
        .select("id, family_id").eq("linked_user_id", user.id).maybeSingle(),
      adminClient.from("families")
        .select("id").eq("primary_user_id", user.id).maybeSingle(),
      adminClient.from("enrollments")
        .select(`id, student_id, students ( id, full_name, avatar_url )`)
        .eq("class_id", classId).is("end_date", null),
    ]);

    const teacher = teacherRes.data;
    const userStudent = userStudentRes.data;
    const family = familyRes.data;
    const { data: enrollments, error: enrollError } = enrollmentsRes;

    if (enrollError) {
      console.error("Error fetching enrollments:", enrollError);
      return new Response(JSON.stringify({ error: "Failed to fetch enrollments" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentIds = enrollments?.map((e) => e.student_id) || [];

    // ----- Wave 2: secondary auth checks + points, all in parallel -----
    const [classRes, teacherSessionRes, studentEnrollRes, familyEnrollRes, pointsRes] =
      await Promise.all([
        // Roster: permanent. Reads the weekly slots too - a teacher named on
        // a slot is on the roster even when they are not the class default.
        teacher
          ? adminClient.from("classes").select("id, default_teacher_id, schedule_template")
              .eq("id", classId).maybeSingle()
          : Promise.resolve({ data: null as any }),
        // Coverage, bounded. This used to be "any session for this class with
        // my teacher_id, ever", so covering one lesson opened this class's
        // leaderboard permanently - and the function runs on the service-role
        // key, so RLS does not catch it. Cancelled sessions no longer count.
        // Window must match is_teacher_of_class and src/lib/teacherAccess.ts.
        teacher
          ? adminClient.from("sessions").select("id")
              .eq("class_id", classId).eq("teacher_id", teacher.id)
              .neq("status", "Canceled")
              .gte("date", coverFrom).lte("date", coverTo).limit(1)
          : Promise.resolve({ data: null as any }),
        userStudent
          ? adminClient.from("enrollments").select("id, end_date")
              .eq("student_id", userStudent.id).eq("class_id", classId).limit(1)
          : Promise.resolve({ data: null as any }),
        family
          ? adminClient.from("enrollments")
              .select("id, student_id, end_date, students!inner(family_id)")
              .eq("class_id", classId).eq("students.family_id", family.id).limit(1)
          : Promise.resolve({ data: null as any }),
        studentIds.length
          ? adminClient.from("student_points")
              .select("student_id, participation_points, homework_points, reading_theory_points, total_points")
              .eq("class_id", classId).eq("month", month).in("student_id", studentIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

    // ----- Evaluate authorization (same precedence as before) -----
    let isAuthorized = false;
    let currentStudentId: string | null = null;

    if (teacher) {
      const cls = (classRes as any).data;
      const slots = Array.isArray(cls?.schedule_template?.weeklySlots)
        ? cls.schedule_template.weeklySlots
        : [];
      const onRoster =
        !!cls &&
        (cls.default_teacher_id === teacher.id ||
          slots.some((slot: any) => slot?.teacherId === teacher.id));
      if (onRoster) isAuthorized = true;
      if (!isAuthorized && (teacherSessionRes as any).data && (teacherSessionRes as any).data.length > 0) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && userStudent) {
      currentStudentId = userStudent.id;
      const enr = (studentEnrollRes as any).data?.[0];
      if (enr && (!enr.end_date || new Date(enr.end_date) >= new Date())) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized && family) {
      const enr = (familyEnrollRes as any).data?.[0];
      if (enr && (!enr.end_date || new Date(enr.end_date) >= new Date())) {
        isAuthorized = true;
        currentStudentId = enr.student_id;
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Not enrolled in this class" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rawPoints, error: pointsError } = pointsRes as any;
    if (pointsError) {
      console.error("Error fetching points:", pointsError);
    }

    // Typed explicitly: `pointsRes` is `any`, so an untyped `p` in the map
    // below is implicitly any and the Map's value type collapses to `{}`.
    interface PointsRow {
      student_id: string;
      participation_points?: number | null;
      homework_points?: number | null;
      reading_theory_points?: number | null;
      total_points?: number | null;
    }
    const points: PointsRow[] = rawPoints ?? [];

    // Create points map
    const pointsMap = new Map(
      points.map((p) => [p.student_id, p])
    );

    // Combine data and calculate rankings
    const leaderboard = (enrollments || [])
      .map((enrollment) => {
        const studentPoints = pointsMap.get(enrollment.student_id);
        const student = enrollment.students as unknown as { id: string; full_name: string; avatar_url: string | null } | null;
        
        return {
          student_id: enrollment.student_id,
          student_name: student?.full_name || "Unknown",
          avatar_url: student?.avatar_url || null,
          participation_points: studentPoints?.participation_points || 0,
          homework_points: studentPoints?.homework_points || 0,
          // Added so the student board can show the same breakdown the
          // teacher's does. Clients treat it as optional, so an older
          // deploy of this function degrades to hiding the reading pill.
          reading_theory_points: studentPoints?.reading_theory_points || 0,
          total_points: studentPoints?.total_points || 0,
          is_current_user: enrollment.student_id === currentStudentId,
        };
      })
      .sort((a, b) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return a.student_name.localeCompare(b.student_name);
      })
      .map((entry, index) => ({
        ...entry,
        rank: index + 1,
      }));

    return new Response(JSON.stringify({ leaderboard, currentStudentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in class-leaderboard function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
