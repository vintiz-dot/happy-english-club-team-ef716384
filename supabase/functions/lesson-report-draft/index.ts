/**
 * lesson-report-draft Edge Function - the AI's first draft of a lesson report
 * (docs/LESSON_REPORTS.md, stage A).
 *
 * Input:  POST { session_id, redo? }
 * Who:    a teacher of the class or an admin (lesson_report_claim decides,
 *         under a row lock: one run at a time, 6 a Hanoi day, an approved
 *         report only with redo). requireSpender first: a real session with
 *         a staff role, and a per-account limit.
 * Reads:  EVERYTHING AS THE CALLER, through their own JWT client - RLS is the
 *         boundary, and there is no service role here. So an admin builds
 *         without the lesson monitor transcript (only the lesson's own
 *         teacher can read it) and the draft's `sources` says so.
 *         The transcript, the lesson's photos (lesson-photos bucket), student
 *         work uploaded from the lesson's start to 30 minutes after its end
 *         (OCR text and a few images), attendance, points given in the lesson,
 *         homework set that day and recent results, target words, and the
 *         enrolled children (id + name, so the reply can name a student_id).
 * Writes: the draft, through lesson_report_finish with the claimed run number
 *         (or the run's failure). Staff only; nothing reaches a family until a
 *         teacher approves it on the review screen.
 *
 * Runs in the background (EdgeRuntime.waitUntil) and answers
 * { status: "building", run }; the screen watches lesson_report_drafts.
 * Logs carry codes and counts only, never a child's name or the lesson's words.
 *
 * Keys: ANTHROPIC_API_KEY (CLAUDE_MODEL optional). HEC_FILES_URL optional.
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { askClaudeJson, ClaudeUnavailable } from "../_lib/claude-json.ts";
import { requireSpender, STAFF_ROLES, type SpendGate } from "../_lib/ai-gate.ts";
import { DEFAULT_FILES_WORKER } from "../_lib/file-store.ts";
import {
  cleanDraft,
  DRAFT_JSON_SCHEMA,
  DRAFT_SYSTEM,
  lessonWindow,
  readTranscript,
  transcriptText,
  type DraftContext,
} from "../_lib/lesson-report-draft.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const GATE: SpendGate = { name: "lesson-report-draft", roles: STAFF_ROLES, limit: 12, windowMs: 60 * 60_000 };
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PHOTOS = 12;
const MAX_WORK_IMAGES = 4;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function toBase64(buf: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return btoa(bin);
}

async function imageBlock(blob: Blob | null, fallbackType: string | null) {
  if (!blob || blob.size === 0 || blob.size > MAX_IMAGE_BYTES) return null;
  const type = (blob.type || fallbackType || "").toLowerCase().replace("image/jpg", "image/jpeg");
  if (!IMAGE_TYPES.has(type)) return null;
  return { type: "image", source: { type: "base64", media_type: type, data: toBase64(new Uint8Array(await blob.arrayBuffer())) } };
}

/**
 * A student-work file, read as the caller: the hec-files Worker signs only
 * what the database lets this caller read (student-work lives in R2); a file
 * not copied there yet is still in Supabase Storage.
 */
async function readWorkFile(asCaller: SupabaseClient, token: string, path: string): Promise<Blob | null> {
  try {
    const base = Deno.env.get("HEC_FILES_URL") || DEFAULT_FILES_WORKER;
    const r = await fetch(`${base}/v1/sign`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ op: "read", bucket: "student-work", paths: [path] }),
    });
    const j = await r.json().catch(() => ({}));
    const url = r.ok ? j?.urls?.[path] : null;
    if (url) {
      const f = await fetch(url);
      if (f.ok) return await f.blob();
    }
  } catch { /* fall through to Supabase */ }
  const { data } = await asCaller.storage.from("student-work").download(path);
  return data ?? null;
}

const hanoiDate = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);

async function build(asCaller: SupabaseClient, token: string, session: any, isAdminOnly: boolean) {
  const sid = session.id as string, cls = session.class_id as string, date = session.date as string;
  const win = lessonWindow(date, String(session.start_time), String(session.end_time));
  const since = new Date(new Date(`${date}T00:00:00+07:00`).getTime() - 30 * 86400_000).toISOString();

  const [enr, att, pts, photos, works, hws, targets, monitor] = await Promise.all([
    asCaller.from("enrollments").select("student_id, start_date, end_date, students!inner(id, full_name)")
      .eq("class_id", cls).lte("start_date", date).or(`end_date.is.null,end_date.gte.${date}`),
    asCaller.from("attendance").select("student_id, status").eq("session_id", sid),
    asCaller.from("point_transactions").select("student_id, points, type, notes").eq("session_id", sid),
    asCaller.from("lesson_report_photos").select("id, storage_path, kind, caption, created_at").eq("session_id", sid).order("created_at"),
    asCaller.from("student_work").select("id, student_id, ocr_text, storage_path, mime_type, created_at, workflow")
      .eq("class_id", cls).gte("created_at", win.from).lte("created_at", win.to).order("created_at").limit(40),
    asCaller.from("homeworks").select("id, title, body, due_date, created_at, submission_type")
      .eq("class_id", cls).gte("created_at", since).order("created_at", { ascending: false }).limit(20),
    asCaller.from("lesson_monitor_targets").select("words, structures").eq("session_id", sid).maybeSingle(),
    asCaller.from("lesson_monitor_reports").select("body").eq("session_id", sid).order("made_at", { ascending: false }).limit(1),
  ]);
  for (const [name, r] of Object.entries({ enr, att, pts, photos, works, hws })) {
    if ((r as any).error) throw new Error(`could not read ${name}`);
  }

  const children = new Map<string, string>();
  for (const e of enr.data ?? []) children.set(e.student_id, (e as any).students?.full_name ?? "");
  const enrolled = new Set(children.keys());

  const attendance = new Map<string, string>();
  for (const a of att.data ?? []) if (enrolled.has(a.student_id)) attendance.set(a.student_id, a.status);
  const points = new Map<string, number>();
  const pointNotes: { student_id: string; points: number; type: string; note: string }[] = [];
  for (const p of pts.data ?? []) {
    if (!enrolled.has(p.student_id)) continue;
    points.set(p.student_id, (points.get(p.student_id) ?? 0) + (Number(p.points) || 0));
    pointNotes.push({ student_id: p.student_id, points: p.points, type: p.type, note: String(p.notes ?? "").slice(0, 120) });
  }

  const ownWork = (works.data ?? []).filter((w: any) => w.student_id && enrolled.has(w.student_id));
  const workOwner = new Map<string, string>(ownWork.map((w: any) => [w.id, w.student_id]));
  const workText = new Map<string, string>(ownWork.map((w: any) => [w.id, String(w.ocr_text ?? "").slice(0, 3000)]));

  const hwAll = hws.data ?? [];
  const setToday = hwAll.filter((h: any) => hanoiDate(h.created_at) === date && h.submission_type !== "quiz");
  const recentIds = hwAll.filter((h: any) => hanoiDate(h.created_at) < date).slice(0, 6).map((h: any) => h.id);
  let results: unknown[] = [];
  if (recentIds.length) {
    const { data } = await asCaller.from("homework_submissions").select("homework_id, student_id, status, grade")
      .in("homework_id", recentIds);
    const byHw = new Map<string, { submitted: number; grades: string[] }>();
    for (const s of data ?? []) {
      if (!enrolled.has(s.student_id)) continue;
      const b = byHw.get(s.homework_id) ?? { submitted: 0, grades: [] };
      b.submitted++;
      if (s.grade) b.grades.push(String(s.grade).slice(0, 20));
      byHw.set(s.homework_id, b);
    }
    results = hwAll.filter((h: any) => recentIds.includes(h.id)).map((h: any) => ({
      title: h.title, due_date: h.due_date, submitted: byHw.get(h.id)?.submitted ?? 0, of: enrolled.size,
      grades: byHw.get(h.id)?.grades ?? [],
    }));
  }

  // The transcript: only the lesson's own teacher can read it (RLS). Anyone
  // else builds without it, and the draft says why.
  const monitorBody = monitor.error ? null : monitor.data?.[0]?.body ?? null;
  const lines = monitorBody ? readTranscript(monitorBody) : null;
  const transcript = lines && lines.length ? lines : null;
  const transcriptNote = transcript ? null
    : monitor.error || (!monitorBody && isAdminOnly)
      ? "Not read: only the lesson's own teacher can read the lesson monitor transcript."
      : "No lesson monitor transcript for this lesson.";

  const photoMap = new Map<string, { kind: string; caption: string | null }>();
  const content: unknown[] = [];
  for (const p of (photos.data ?? []).slice(0, MAX_PHOTOS)) {
    photoMap.set(p.id, { kind: p.kind, caption: p.caption });
    const { data: blob } = await asCaller.storage.from("lesson-photos").download(p.storage_path);
    const img = await imageBlock(blob ?? null, "image/jpeg");
    if (!img) continue;
    content.push({ type: "text", text: `Photo ${p.id} (${p.kind}${p.caption ? `: ${String(p.caption).slice(0, 200)}` : ""})` }, img);
  }
  let workImages = 0;
  for (const w of ownWork) {
    if (workImages >= MAX_WORK_IMAGES) break;
    if (!w.storage_path || !String(w.mime_type ?? "").startsWith("image/")) continue;
    const img = await imageBlock(await readWorkFile(asCaller, token, w.storage_path), w.mime_type);
    if (!img) continue;
    workImages++;
    content.push({ type: "text", text: `Work ${w.id} by student ${w.student_id}` }, img);
  }

  const ctx: DraftContext = {
    enrolled, workOwner, photos: photoMap, attendance, points,
    homework: setToday.map((h: any) => ({ homework_id: h.id, title: String(h.title ?? ""), due_date: h.due_date ?? null })),
    transcript, transcriptNote, workCount: ownWork.length,
  };

  const evidence = {
    lesson: { class: session.classes?.name ?? "", date, start: session.start_time, end: session.end_time, status: session.status },
    children: [...children].map(([id, name]) => ({ student_id: id, name, attendance: attendance.get(id) ?? "unknown", points: points.get(id) ?? 0 })),
    points_given: pointNotes,
    work: ownWork.map((w: any) => ({ work_id: w.id, student_id: w.student_id, at: w.created_at, kind: w.workflow, text: workText.get(w.id) })),
    homework_set_today: setToday.map((h: any) => ({ title: h.title, due_date: h.due_date, body: String(h.body ?? "").replace(/<[^>]+>/g, " ").slice(0, 600) })),
    recent_homework_results: results,
    target_words: targets.data ? { words: targets.data.words ?? [], structures: targets.data.structures ?? [] } : null,
    photos: [...photoMap].map(([id, p]) => ({ photo_id: id, kind: p.kind, caption: p.caption })),
  };
  const intro = `EVIDENCE (JSON):\n${JSON.stringify(evidence)}\n\nTRANSCRIPT:\n${transcript ? transcriptText(transcript) : `(none - ${transcriptNote})`}`;

  const reply = await askClaudeJson<unknown>({
    system: DRAFT_SYSTEM,
    content: [{ type: "text", text: intro }, ...content, { type: "text", text: "Write the draft lesson report now, as the schema says." }],
    schema: DRAFT_JSON_SCHEMA,
    maxTokens: 20000,
    effort: "medium",
  });
  return { body: cleanDraft(reply.data, ctx, workText), model: reply.model, usage: reply.usage };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let input: { session_id?: string; redo?: boolean };
  try { input = await req.json(); } catch { return json({ error: "Body must be JSON" }, 400); }
  const sessionId = String(input?.session_id ?? "");
  if (!UUID_RE.test(sessionId)) return json({ error: "session_id is required" }, 400);

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const asCaller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: session, error: sErr } = await asCaller.from("sessions")
    .select("id, class_id, date, start_time, end_time, status, teacher_id, classes(name)").eq("id", sessionId).maybeSingle();
  if (sErr) return json({ error: "The lesson could not be read" }, 503);
  if (!session) return json({ error: "Not found" }, 404);

  const { data: run, error: claimErr } = await asCaller.rpc("lesson_report_claim", { p_session: sessionId, p_redo: input?.redo === true });
  if (claimErr) {
    if (claimErr.code === "42501") return json({ error: "Only a teacher of this class or an admin can build its lesson report" }, 403);
    if (claimErr.code === "P0001") return json({ error: claimErr.message }, 409);
    console.error("lesson-report-draft: claim failed", claimErr.code);
    return json({ error: "The draft could not be started" }, 503);
  }

  // Not the lesson's teacher (an admin, say): the transcript will not be readable.
  const { data: own } = await asCaller.from("teachers").select("id").eq("user_id", spender.userId).eq("id", session.teacher_id ?? "").maybeSingle();
  const isAdminOnly = !own && spender.roles.has("admin");

  const job = (async () => {
    try {
      const out = await build(asCaller, token, session, isAdminOnly);
      const { data: saved, error } = await asCaller.rpc("lesson_report_finish", {
        p_session: sessionId, p_run: run, p_body: out.body, p_model: out.model, p_usage: out.usage, p_error: null,
      });
      if (error || saved !== true) console.error("lesson-report-draft: save refused", error?.code ?? "stale_run");
      else console.log("lesson-report-draft: saved", JSON.stringify({ run, students: out.body.students.length, quiz: out.body.quiz.questions.length }));
    } catch (e) {
      const message = e instanceof ClaudeUnavailable ? "The AI service is not set up"
        : e instanceof Error ? e.message.slice(0, 180) : "The draft could not be built";
      console.error("lesson-report-draft: failed", e instanceof ClaudeUnavailable ? "no_key" : "build_error");
      await asCaller.rpc("lesson_report_finish", { p_session: sessionId, p_run: run, p_body: null, p_error: message });
    }
  })();
  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(job);
  else await job;
  return json({ status: "building", run }, 202);
});
