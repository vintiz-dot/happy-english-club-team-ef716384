/**
 * voice-award - the voice points assistant's ears (owner, 27 Nov 2026).
 *
 * The browser heard the wake word "HEC" and recorded ~4 s after it. This
 * function asks Gemini what was said and checks the answer against the
 * children marked Present / Late in the lesson running now
 * (_lib/voice-award-parse.ts). IT WRITES NOTHING: the browser saves through
 * awardPoints as the teacher, so RLS stays the boundary. Audio is never
 * stored or logged.
 *
 * Every read is made with the CALLER's own client (their JWT), never the
 * service role. Secrets: GEMINI_API_KEY, GEMINI_MODEL (optional).
 * Contract: src/lib/voiceAward/types.ts.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSpender, type SpendGate } from "../_lib/ai-gate.ts";
import {
  buildPrompt,
  checkAnswer,
  GEMINI_RESPONSE_SCHEMA,
  type RosterEntry,
} from "../_lib/voice-award-parse.ts";

// A teacher or admin; a command is a few seconds long, a lesson has hundreds.
const GATE: SpendGate = { name: "voice-award", roles: ["teacher", "admin"], limit: 120, windowMs: 10 * 60_000 };

const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const GEMINI_TIMEOUT_MS = 6000;
const MAX_AUDIO_BYTES = 350_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const fail = (code: string, error: string, status = 200) => reply({ ok: false, code, error }, status);

/** Today's date and the minute of the day in Hanoi. */
function hanoiNow(): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, minutes: Number(g("hour")) * 60 + Number(g("minute")) };
}
const minutesOf = (t: string) => {
  const [h, m] = String(t).split(":");
  return Number(h) * 60 + Number(m);
};

/** base64 -> byte length without decoding it. */
function base64Bytes(b64: string): number {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

async function askGemini(key: string, audioBase64: string, prompt: string, withThinking: boolean): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), GEMINI_TIMEOUT_MS);
  try {
    const generationConfig: Record<string, unknown> = {
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: GEMINI_RESPONSE_SCHEMA,
      maxOutputTokens: 300,
    };
    if (withThinking) generationConfig.thinkingConfig = { thinkingLevel: "minimal" };
    return await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctl.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ inline_data: { mime_type: "audio/wav", data: audioBase64 } }, { text: prompt }] }],
          generationConfig,
        }),
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const t0 = Date.now();

  const spender = await requireSpender(req, corsHeaders, GATE);
  if (spender instanceof Response) return spender;

  try {
    const body = await req.json().catch(() => null);
    const classId = body?.classId;
    const sessionId = body?.sessionId;
    const audio = body?.audioBase64;
    if (!UUID.test(String(classId)) || !UUID.test(String(sessionId))) return fail("bad_audio", "Missing class or lesson.");
    if (body?.mime !== "audio/wav" || typeof audio !== "string" || audio.length < 100 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) {
      return fail("bad_audio", "The recording was not readable.");
    }
    if (base64Bytes(audio) > MAX_AUDIO_BYTES) return fail("bad_audio", "The recording is too long.");

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return fail("model_failed", "The listening service is not set up.");

    // The caller's own client: RLS is the boundary for everything read here.
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });

    const [sessRes, teachRes, attRes] = await Promise.all([
      sb.from("sessions").select("id, class_id, date, start_time, end_time, status, teacher_id").eq("id", sessionId).maybeSingle(),
      sb.rpc("is_teacher_of_class", { user_id: spender.userId, class_id: classId }),
      sb.from("attendance").select("student_id, status, students ( id, full_name )").eq("session_id", sessionId).in("status", ["Present", "Late"]),
    ]);

    const s: any = sessRes.data;
    const now = hanoiNow();
    const lessonOk = !!s && s.class_id === classId && s.status !== "Canceled" && s.date === now.date &&
      now.minutes >= minutesOf(s.start_time) - 10 && now.minutes <= minutesOf(s.end_time) + 10;
    if (!lessonOk) return fail("no_lesson", "There is no lesson of this class running now.");

    const teaches = teachRes.data === true || spender.roles.has("admin");
    if (!teaches) return fail("not_teacher", "You do not teach this class.");

    const seen = new Set<string>();
    const roster: RosterEntry[] = [];
    for (const r of (attRes.data ?? []) as any[]) {
      const st = Array.isArray(r.students) ? r.students[0] : r.students;
      if (!st?.id || !st.full_name || seen.has(st.id)) continue;
      seen.add(st.id);
      roster.push({ id: st.id, fullName: String(st.full_name) });
    }
    if (!roster.length) return fail("no_attendance", "No child is marked Present or Late yet.");
    roster.sort((a, b) => a.fullName.localeCompare(b.fullName));

    const prompt = buildPrompt(roster);
    let res: Response;
    try {
      res = await askGemini(key, audio, prompt, true);
      // A model that does not know the thinking setting: ask again without it.
      if (res.status === 400) res = await askGemini(key, audio, prompt, false);
    } catch {
      return fail("model_failed", "The listening service took too long.");
    }
    if (!res.ok) {
      console.error(`voice-award: Gemini answered ${res.status}`);
      return fail("model_failed", "The listening service could not answer.");
    }
    const out = await res.json().catch(() => null);
    const text = out?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

    const parse = checkAnswer(text, roster);
    return reply({ ok: true, parse, ms: Date.now() - t0 });
  } catch (e) {
    console.error("voice-award failed:", e instanceof Error ? e.message : "unknown");
    return fail("model_failed", "Something went wrong. Please say it again.");
  }
});
