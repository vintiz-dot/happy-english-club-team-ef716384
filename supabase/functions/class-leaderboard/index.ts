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

    // Parse request body. `month` ("2026-10") is what every client sent
    // until the period picker; `period` + `anchor` is the new shape.
    const body = await req.json().catch(() => ({}));
    const classId: string | undefined = body?.classId;
    const month: string | undefined = typeof body?.month === "string" ? body.month : undefined;
    const PERIODS = ["week", "month", "term", "all"];
    const period: string = PERIODS.includes(body?.period) ? body.period : "month";
    const anchor: string | null =
      typeof body?.anchor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.anchor)
        ? body.anchor
        : month && /^\d{4}-\d{2}$/.test(month) ? `${month}-01` : null;
    // A real calendar date: "2026-02-31" passes the pattern but not Postgres.
    const realDate = (d: string) => {
      const t = new Date(`${d}T00:00:00Z`);
      return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
    };
    if (anchor && !realDate(anchor)) {
      return new Response(JSON.stringify({ error: "anchor must be a real date (YYYY-MM-DD)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!classId || (!month && !body?.period)) {
      return new Response(JSON.stringify({ error: "classId and month (or period) are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create admin client to bypass RLS
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // ----- Wave 1: identity lookups + main enrollments, all in parallel -----
    const [teacherRes, userStudentRes, familyRes, enrollmentsRes, adminRes] = await Promise.all([
      adminClient.from("teachers")
        .select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
      adminClient.from("students")
        .select("id, family_id").eq("linked_user_id", user.id).maybeSingle(),
      adminClient.from("families")
        .select("id").eq("primary_user_id", user.id).maybeSingle(),
      adminClient.from("enrollments")
        .select(`id, student_id, students ( id, full_name, avatar_url )`)
        .eq("class_id", classId).is("end_date", null),
      adminClient.from("user_roles")
        .select("role").eq("user_id", user.id).eq("role", "admin").limit(1),
    ]);
    const isAdmin = ((adminRes as any).data?.length ?? 0) > 0;

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
              .eq("class_id", classId).eq("students.family_id", family.id).limit(20)
          : Promise.resolve({ data: null as any }),
        studentIds.length && month
          ? adminClient.from("student_points")
              .select("student_id, participation_points, homework_points, reading_theory_points, vocabulary_quiz_points, total_points")
              .eq("class_id", classId).eq("month", month).in("student_id", studentIds)
          : Promise.resolve({ data: [] as any[], error: null as any }),
      ]);

    // ----- Evaluate authorization (same precedence as before) -----
    let isAuthorized = false;
    let isStaff = false;
    let currentStudentId: string | null = null;
    // Every child of this viewer in the class: shown in full and marked "you".
    const viewerIds: string[] = [];

    // Admins can see every class board (they are who opens a student's
    // profile). No student is "the viewer", so currentStudentId stays null.
    if (isAdmin) { isAuthorized = true; isStaff = true; }

    if (!isAuthorized && teacher) {
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
      isStaff = isAuthorized;
    }

    if (!isAuthorized && userStudent) {
      currentStudentId = userStudent.id;
      const enr = (studentEnrollRes as any).data?.[0];
      if (enr && (!enr.end_date || new Date(enr.end_date) >= new Date())) {
        isAuthorized = true;
        viewerIds.push(userStudent.id);
      }
    }

    if (!isAuthorized && family) {
      const current = ((familyEnrollRes as any).data ?? []).filter(
        (enr: any) => !enr.end_date || new Date(enr.end_date) >= new Date(),
      );
      if (current.length > 0) {
        isAuthorized = true;
        currentStudentId = current[0].student_id;
        for (const enr of current) if (!viewerIds.includes(enr.student_id)) viewerIds.push(enr.student_id);
      }
    }

    if (!isAuthorized) {
      return new Response(JSON.stringify({ error: "Not enrolled in this class" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----- A family sees the class from when their child joined -----
    // Children who left before then were never this child's classmates
    // (S1: classmates are a name, an avatar and points - classmates).
    if (!isStaff && viewerIds.length > 0) {
      const [{ data: starts }, { data: per, error: perError }] = await Promise.all([
        adminClient.from("enrollments").select("start_date")
          .eq("class_id", classId).in("student_id", viewerIds),
        adminClient.rpc("leaderboard_period", { p_kind: period, p_anchor: anchor }),
      ]);
      const firstDay = ((starts ?? []) as Array<{ start_date: string }>)
        .map((r) => r.start_date).filter(Boolean).sort()[0];
      const periodRow = Array.isArray(per) ? per[0] : per;
      if (!perError && periodRow?.to_date && firstDay && periodRow.to_date < firstDay) {
        return new Response(JSON.stringify({ error: "before_joined" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ----- The board, from the one calculation (20261117120000) -----
    // Ranks, ties, categories, level, streak and climber are decided by
    // leaderboard_json, the same function the staff screens call. A family
    // gets classmates as name, avatar and points only (p_full = false).
    const { data: board, error: boardError } = await adminClient.rpc("leaderboard_json", {
      p_class: classId,
      p_period: period,
      p_anchor: anchor,
      p_viewers: viewerIds,
      p_full: isStaff,
    });
    if (!boardError && board) {
      const rows = (board as any).rows ?? [];
      // `leaderboard` keeps the shape older clients read.
      const leaderboard = rows.map((r: any) => ({
        student_id: r.student_id,
        student_name: r.name,
        avatar_url: r.avatar_url ?? null,
        participation_points: Number(r.categories?.class ?? 0) + Number(r.categories?.streak ?? 0),
        homework_points: Number(r.categories?.homework ?? 0) + Number(r.categories?.video ?? 0),
        reading_theory_points: Number(r.categories?.reading ?? 0),
        vocabulary_quiz_points: Number(r.categories?.vocabulary ?? 0),
        total_points: Number(r.total ?? 0),
        is_current_user: !!r.is_self,
        rank: r.rank,
      }));
      return new Response(JSON.stringify({ board, leaderboard, currentStudentId, engine: "server" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const missing = boardError && (boardError.code === "PGRST202" || boardError.code === "42883");
    if (boardError && boardError.code === "P0002") {
      return new Response(JSON.stringify({ error: "no_term", message: "No term covers that date" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (boardError && !missing) {
      console.error("leaderboard_json failed:", boardError);
      return new Response(JSON.stringify({ error: "Failed to build the board" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // The migration is not pasted yet: the month board, the old way.
    if (!month) {
      return new Response(JSON.stringify({ error: "period_unavailable" }), {
        status: 409,
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
      vocabulary_quiz_points?: number | null;
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
          // The fourth bucket. total_points is GENERATED across all four,
          // so omitting this made the breakdown short of the total it sat
          // beside — by exactly whatever the student had earned from
          // vocabulary practice, which save-word, record-practice and
          // ocr-vocab-scan all write.
          vocabulary_quiz_points: studentPoints?.vocabulary_quiz_points || 0,
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

    return new Response(JSON.stringify({ leaderboard, currentStudentId, engine: "legacy" }), {
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
