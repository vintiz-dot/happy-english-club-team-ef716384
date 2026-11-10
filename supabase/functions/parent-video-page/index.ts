/**
 * Public parent video page. No sign-in: the secret link token IS the key.
 * Returns only one child's APPROVED videos and the teacher's final words.
 * Never AI drafts, never other children. Signed video links expire in 2 hours.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!/^[a-f0-9]{48}$/.test(token)) return json({ error: "Link not found" }, 404);

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: link } = await db
      .from("video_parent_links")
      .select("student_id, revoked_at")
      .eq("token", token)
      .maybeSingle();
    if (!link || link.revoked_at) return json({ error: "Link not found" }, 404);

    const { data: student } = await db.from("students").select("full_name, avatar_url").eq("id", link.student_id).maybeSingle();

    const { data: subs, error } = await db
      .from("video_submissions")
      .select("id, video_path, submitted_at, duration_seconds, homeworks(title, due_date), video_analyses(final_score, final_grade, final_feedback_parent, final_feedback_student, approved_at)")
      .eq("student_id", link.student_id)
      .eq("status", "approved")
      .order("submitted_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const videos = [];
    for (const s of subs ?? []) {
      const a: any = Array.isArray(s.video_analyses) ? s.video_analyses[0] : s.video_analyses;
      if (!a?.approved_at) continue; // approved by a teacher, or not shown
      const { data: signed } = await db.storage.from("homework-videos").createSignedUrl(s.video_path, 7200);
      if (!signed?.signedUrl) continue;
      const h: any = s.homeworks;
      videos.push({
        id: s.id,
        title: h?.title ?? "Video homework",
        date: s.submitted_at,
        url: signed.signedUrl,
        grade: a.final_grade,
        score: a.final_score,
        feedback: a.final_feedback_parent || a.final_feedback_student || null,
      });
    }

    return json({ student: { name: student?.full_name ?? "", avatar_url: student?.avatar_url ?? null }, videos });
  } catch (e) {
    console.error("parent-video-page", e);
    return json({ error: "Internal error" }, 500);
  }
});
