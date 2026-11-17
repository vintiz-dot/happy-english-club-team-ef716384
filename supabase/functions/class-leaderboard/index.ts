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

    // Who may see the class is decided by is_teacher_of_class below - the
    // same rule as the database, cover window included.

    // Parse request body. `month` ("2026-10") is what every client sent
    // until the period picker; `period` + `anchor` is the new shape.
    const body = await req.json().catch(() => ({}));
    const classId: string | undefined = body?.classId;
    const month: string | undefined = typeof body?.month === "string" ? body.month : undefined;
    const PERIODS = ["week", "month", "term", "all"];
    const CATEGORIES = ["homework", "video", "class", "streak", "vocabulary", "reading"];
    // Rank the board on one tab, on the server (the screen never ranks).
    const category: string | null = CATEGORIES.includes(body?.category) ? body.category : null;
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

    // ----- Who is asking -----
    // Staff: an admin, or anyone is_teacher_of_class lets into this class -
    // the same rule as the database's policies, so teaching assistants and
    // cover teachers count (review N-5; this used to read `teachers` only).
    // A child or family: the children this login can view (linked login,
    // second guardian, or the family's main login), enrolled in the class
    // now.
    const [adminRes, teacherRes, kidsRes, familyRes, enrollmentsRes] = await Promise.all([
      adminClient.from("user_roles")
        .select("role").eq("user_id", user.id).eq("role", "admin").limit(1),
      adminClient.rpc("is_teacher_of_class", { user_id: user.id, class_id: classId }),
      adminClient.from("students").select("id")
        .or(`linked_user_id.eq.${user.id},secondary_user_id.eq.${user.id}`),
      adminClient.from("families").select("id").eq("primary_user_id", user.id),
      // For the old month board only (before the migration was pasted).
      adminClient.from("enrollments")
        .select(`id, student_id, students ( id, full_name, avatar_url )`)
        .eq("class_id", classId).is("end_date", null),
    ]);
    const isAdmin = ((adminRes as any).data?.length ?? 0) > 0;
    const isStaff = isAdmin || (teacherRes as any).data === true;

    const familyIds = ((familyRes as any).data ?? []).map((f: any) => f.id);
    const familyKids = familyIds.length
      ? ((await adminClient.from("students").select("id").in("family_id", familyIds)).data ?? [])
      : [];
    const myKids = [...new Set([...((kidsRes as any).data ?? []), ...familyKids].map((k: any) => k.id as string))];

    // Every child of this viewer in the class now: shown in full and marked "you".
    const viewerIds: string[] = [];
    if (!isStaff && myKids.length) {
      const { data: kidEnrols } = await adminClient.from("enrollments")
        .select("student_id, end_date").eq("class_id", classId).in("student_id", myKids);
      for (const enr of (kidEnrols ?? []) as Array<{ student_id: string; end_date: string | null }>) {
        if ((!enr.end_date || new Date(enr.end_date) >= new Date()) && !viewerIds.includes(enr.student_id)) {
          viewerIds.push(enr.student_id);
        }
      }
    }
    const currentStudentId: string | null = viewerIds[0] ?? null;

    if (!isStaff && viewerIds.length === 0) {
      return new Response(JSON.stringify({ error: "Not enrolled in this class" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: enrollments, error: enrollError } = enrollmentsRes as any;
    if (enrollError) console.error("Error fetching enrollments:", enrollError);
    const studentIds: string[] = (enrollments ?? []).map((e: any) => e.student_id);

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
      p_category: category,
      // A teacher's view of a level counts only their own classes (review M-3).
      p_teacher: isStaff && !isAdmin ? user.id : null,
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
        total_points: Number(r.total ?? r.points ?? 0),
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

    const { data: rawPoints, error: pointsError } = studentIds.length
      ? await adminClient.from("student_points")
          .select("student_id, participation_points, homework_points, reading_theory_points, vocabulary_quiz_points, total_points")
          .eq("class_id", classId).eq("month", month).in("student_id", studentIds)
      : { data: [] as any[], error: null as any };
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
      .map((enrollment: any) => {
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
      .sort((a: any, b: any) => {
        if (b.total_points !== a.total_points) {
          return b.total_points - a.total_points;
        }
        return a.student_name.localeCompare(b.student_name);
      })
      .map((entry: any, index: number) => ({
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
