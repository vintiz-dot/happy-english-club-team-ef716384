/**
 * Reception display feed. No sign-in: the TV in reception holds the display
 * token from reception_settings, and that token IS the key. Returns only what
 * the screen shows - students' names, photos, class and points, the centre's
 * own figures, admin content and APPROVED feedback the sender agreed to show.
 * Never contact details, families, money or anything about one child beyond
 * what the board already shows in class.
 *
 * Supabase setting: verify_jwt = false (the TV has no session).
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

/** Today and this month in Hanoi (UTC+7, no daylight saving). */
function hanoiToday(now = new Date()) {
  const d = new Date(now.getTime() + 7 * 3600 * 1000);
  const today = d.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  return { today, month, prevMonth: prev, monthStart: `${month}-01`, nextMonthStart: next };
}

function sameToken(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function qr(url: string | null) {
  if (!url) return null;
  try {
    const svg: string = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#0b1b3a", light: "#ffffff" } });
    return { url, svg };
  } catch {
    return { url, svg: null };
  }
}

// What the website (hanoienglish.com) says about each programme, used when a
// class in HEC has no description of its own. Matched on the class name.
const PROGRAMME_NOTES: Record<string, { en: string; vi: string }> = {
  mars: { en: "National Geographic Look Starter: first steps in real English.", vi: "Nat Geo Look Starter: những bước đầu với tiếng Anh thật." },
  venus: { en: "National Geographic Look 1: reading, speaking and curiosity.", vi: "Nat Geo Look 1: đọc, nói và khám phá." },
  neptune: { en: "National Geographic Look 2: confident readers and speakers.", vi: "Nat Geo Look 2: tự tin đọc và nói." },
  jupiter: { en: "Reach Higher ELA for Grades 3-4: US Common Core reading and writing.", vi: "Reach Higher ELA lớp 3-4: đọc và viết theo chuẩn Common Core Hoa Kỳ." },
  sky: { en: "Oxford Discover ELA for Grades 5-6: thinking, reading and writing.", vi: "Oxford Discover ELA lớp 5-6: tư duy, đọc và viết." },
  sanrio: { en: "Grammar and Writing for Grade 6.", vi: "Ngữ pháp và Viết cho lớp 6." },
  mercury: { en: "Cambridge Maths taught in English.", vi: "Toán Cambridge bằng tiếng Anh." },
  sun: { en: "IELTS: a Cambridge and British Council blend.", vi: "IELTS: kết hợp Cambridge và British Council." },
};
const noteFor = (name: string) => {
  const key = Object.keys(PROGRAMME_NOTES).find((k) => name.toLowerCase().includes(k));
  return key ? PROGRAMME_NOTES[key] : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim().toLowerCase() : "";
    if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "Display not recognised" }, 401);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: settings, error: settingsErr } = await db.from("reception_settings").select("*").eq("id", true).maybeSingle();
    if (settingsErr) throw settingsErr;
    if (!settings || !sameToken(token, settings.display_token)) return json({ error: "Display not recognised" }, 401);

    const t = hanoiToday();

    const [classesRes, enrollRes, pointsRes, leadersRes, itemsRes, feedbackRes, hwRes, attTotalRes, attPresentRes] = await Promise.all([
      db.from("classes").select("id, name, curriculum, age_range, description, max_students").eq("is_active", true).order("name"),
      db.from("enrollments").select("student_id, class_id, start_date, end_date, students!inner(id, full_name, avatar_url, is_active)")
        .lte("start_date", t.today).or(`end_date.is.null,end_date.gte.${t.today}`).limit(5000),
      db.from("student_points").select("student_id, class_id, total_points, homework_points, participation_points").eq("month", t.month).limit(5000),
      db.from("monthly_leaders").select("student_id, class_id, total_points").eq("month", t.prevMonth).limit(500),
      db.from("reception_items").select("id, kind, title_en, title_vi, body_en, body_vi, stat_value, image_url, student_id, starts_on, ends_on, sort_order")
        .eq("is_active", true).or(`ends_on.is.null,ends_on.gte.${t.today}`)
        .order("sort_order").order("created_at", { ascending: false }).limit(200),
      db.from("reception_feedback").select("name, relation, rating, message, approved_at").eq("may_show", true)
        .not("approved_at", "is", null).order("approved_at", { ascending: false }).limit(12),
      db.from("homework_submissions").select("id", { count: "exact", head: true })
        .gte("submitted_at", `${t.monthStart}T00:00:00+07:00`).lt("submitted_at", `${t.nextMonthStart}T00:00:00+07:00`),
      db.from("attendance").select("id, sessions!inner(date)", { count: "exact", head: true })
        .gte("sessions.date", t.monthStart).lte("sessions.date", t.today),
      db.from("attendance").select("id, sessions!inner(date)", { count: "exact", head: true })
        .eq("status", "Present").gte("sessions.date", t.monthStart).lte("sessions.date", t.today),
    ]);
    for (const r of [classesRes, enrollRes, pointsRes, itemsRes]) if (r.error) throw r.error;

    const classes = classesRes.data ?? [];
    const classById = new Map<string, any>(classes.map((c: any) => [c.id, c]));

    // Who is in which class today (active students in active classes).
    type Kid = { id: string; name: string; photo: string | null };
    const kids = new Map<string, Kid>();
    const roster = new Map<string, Set<string>>(); // class -> students
    for (const e of enrollRes.data ?? []) {
      const s: any = e.students;
      if (!s?.is_active || !classById.has(e.class_id)) continue;
      kids.set(s.id, { id: s.id, name: s.full_name, photo: s.avatar_url ?? null });
      if (!roster.has(e.class_id)) roster.set(e.class_id, new Set());
      roster.get(e.class_id)!.add(s.id);
    }

    // This month's points, per class and across the centre.
    const overall = new Map<string, number>();
    const perClass = new Map<string, { id: string; points: number }[]>();
    let pointsMonth = 0;
    for (const p of pointsRes.data ?? []) {
      if (!roster.get(p.class_id)?.has(p.student_id)) continue;
      const pts = Number(p.total_points ?? (p.homework_points ?? 0) + (p.participation_points ?? 0)) || 0;
      pointsMonth += Math.max(0, pts);
      overall.set(p.student_id, (overall.get(p.student_id) ?? 0) + pts);
      if (!perClass.has(p.class_id)) perClass.set(p.class_id, []);
      perClass.get(p.class_id)!.push({ id: p.student_id, points: pts });
    }
    const person = (id: string, points: number, classId?: string) => {
      const k = kids.get(id)!;
      return { name: k.name, photo: k.photo, points, class_name: classId ? classById.get(classId)?.name ?? null : null };
    };
    const classesOf = (id: string) =>
      classes.filter((c) => roster.get(c.id)?.has(id)).map((c) => c.name).join(" · ");

    const top = [...overall.entries()]
      .filter(([id, pts]) => kids.has(id) && pts > 0)
      .sort((a, b) => b[1] - a[1] || kids.get(a[0])!.name.localeCompare(kids.get(b[0])!.name))
      .slice(0, 10)
      .map(([id, pts], i) => ({ rank: i + 1, ...person(id, pts), class_name: classesOf(id) }));

    const classBoards = classes
      .map((c) => {
        const rows = (perClass.get(c.id) ?? []).filter((r) => r.points > 0 && kids.has(r.id))
          .sort((a, b) => b.points - a.points || kids.get(a.id)!.name.localeCompare(kids.get(b.id)!.name))
          .slice(0, 5)
          .map((r, i) => ({ rank: i + 1, ...person(r.id, r.points) }));
        return { class_name: c.name, curriculum: c.curriculum, students: roster.get(c.id)?.size ?? 0, top: rows };
      })
      .filter((b) => b.top.length > 0);

    // Last month's champions (archived when the month closed).
    const champions = (leadersRes.data ?? [])
      .filter((l) => kids.has(l.student_id) && classById.has(l.class_id))
      .map((l) => ({ ...person(l.student_id, l.total_points, l.class_id) }))
      .sort((a, b) => (a.class_name ?? "").localeCompare(b.class_name ?? ""));

    const courses = classes.map((c) => {
      const note = noteFor(c.name);
      return {
        name: c.name,
        curriculum: c.curriculum,
        age_range: c.age_range,
        description_en: c.description || note?.en || null,
        description_vi: note?.vi || null,
        seats_taken: roster.get(c.id)?.size ?? 0,
        seats_max: c.max_students ?? 12,
      };
    });

    // Dates: an item shows from starts_on to ends_on. An EVENT's starts_on is
    // the day it happens, so it shows ahead of that day and drops off once the
    // day (or its ends_on) has passed.
    const showing = (i: any) =>
      i.kind === "event"
        ? (i.ends_on ?? i.starts_on ?? t.today) >= t.today
        : !i.starts_on || i.starts_on <= t.today;
    const items = (itemsRes.data ?? []).filter(showing).map((i) => {
      const k = i.student_id ? kids.get(i.student_id) : null;
      return { ...i, student_id: undefined, student: k ? { name: k.name, photo: k.photo } : null };
    });

    const attTotal = attTotalRes.count ?? 0;
    const stats = {
      students: kids.size,
      classes: classes.length,
      points_this_month: pointsMonth,
      homework_this_month: hwRes.count ?? 0,
      attendance_rate: attTotal > 0 ? Math.round(((attPresentRes.count ?? 0) / attTotal) * 100) : null,
      max_class_size: 12,
      review_score: "5.0",
      review_count: 47,
    };

    const [feedbackQr, zaloQr, googleQr] = await Promise.all([qr(settings.feedback_url), qr(settings.zalo_url), qr(settings.google_review_url)]);

    // The screen checks in on every refresh; the dashboard shows when it last did.
    await db.from("reception_settings").update({ last_seen_at: new Date().toISOString() }).eq("id", true);

    return json({
      generated_at: new Date().toISOString(),
      today: t.today,
      month: t.month,
      champions_month: t.prevMonth,
      settings: { scene_seconds: settings.scene_seconds, sections: settings.sections },
      stats,
      leaderboard: top,
      class_boards: classBoards,
      champions,
      courses,
      items,
      feedback: (feedbackRes.data ?? []).map((f) => ({ name: f.name, relation: f.relation, rating: f.rating, message: f.message })),
      qr: { feedback: feedbackQr, zalo: zaloQr, google: googleQr },
    });
  } catch (e) {
    console.error("reception-feed", e);
    return json({ error: "Internal error" }, 500);
  }
});
