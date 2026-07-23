/**
 * analyze-transcript Edge Function
 * =================================
 * A class transcript is uploaded at the end of the lesson and must be
 * analyzed immediately so teacher/admin dashboards are ready to view.
 *
 * The frontend inserts a `class_transcripts` row (status `processing`) and
 * invokes this function with the row id. Pipeline:
 *
 *   1. Parse the transcript (WebVTT / SRT / "Name: line" plain text).
 *   2. Compute deterministic per-speaker metrics locally: utterances,
 *      words, questions, vocabulary richness, participation share.
 *   3. Match speakers to the class roster (diacritic-insensitive).
 *   4. One LLM pass per transcript extracts, per student: grammar/vocab
 *      errors (with corrections + CEFR topic), a CEFR estimate, and
 *      notable highlights — plus a lesson summary.
 *   5. Persist: transcript_speaker_metrics, student_error_log (+ SRS cards
 *      for spaced repetition), cefr_assessments, transcript summary.
 *
 * Input:  { transcript_id: string }
 * Output: { success, transcript_id, speakers, matched_students,
 *           errors_logged, summary }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { fireProfileRefresh } from "../_lib/profile.ts";
import { safeParseJson, chunkOnLines } from "../_lib/text.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CEFR_SCORE: Record<string, number> = {
  "Pre-A1": 0, A1: 1, "A1+": 1.5, A2: 2, "A2+": 2.5,
  B1: 3, "B1+": 3.5, B2: 4, "B2+": 4.5, C1: 5, C2: 6,
};

interface Utterance {
  speaker: string;
  text: string;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normName(s: string): string {
  return stripDiacritics(s).toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * "Unknown" is unattributable audio (overlapping chatter, mislabeled mono
 * segments) — NOT a student. It must never count toward student talk share
 * or receive analysis/CEFR, or one bucket of mixed voices dominates the
 * whole engagement dashboard.
 */
function isUnknownLabel(label: string): boolean {
  return normName(label) === "unknown";
}

/**
 * Parse VTT/SRT cue text or plain "Speaker: line" transcripts into
 * speaker-attributed utterances. Zoom-style "Name: text" inside cues is
 * also handled.
 */
function parseTranscript(raw: string): Utterance[] {
  const out: Utterance[] = [];
  let lastSpeaker = "";

  const lines = raw
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    // drop VTT/SRT structural noise: headers, cue numbers, timestamps
    .filter(
      (l) =>
        l &&
        l !== "WEBVTT" &&
        !/^\d+$/.test(l) &&
        !/^\d{2}:\d{2}(:\d{2})?[.,]\d{3}\s+-->/.test(l) &&
        !/^NOTE\b/.test(l),
    );

  // Zoom VTT uses "Name: text"; MS Teams "<v Name>text</v>"
  const vTag = /^<v\s+([^>]+)>(.*?)(<\/v>)?$/i;
  const nameColon = /^([A-Za-zÀ-ỹ' .-]{2,40}):\s*(.+)$/;

  for (const line of lines) {
    const v = line.match(vTag);
    if (v) {
      out.push({ speaker: v[1].trim(), text: v[2].trim() });
      lastSpeaker = v[1].trim();
      continue;
    }
    const nc = line.match(nameColon);
    if (nc && nc[1].split(" ").length <= 5) {
      out.push({ speaker: nc[1].trim(), text: nc[2].trim() });
      lastSpeaker = nc[1].trim();
      continue;
    }
    // Continuation line — attach to the previous speaker.
    if (lastSpeaker && out.length) {
      out[out.length - 1].text += " " + line;
    }
  }
  return out.filter((u) => u.text);
}

/**
 * Classes are offline: a room recorder captures all audio, and the teacher
 * (or students) call out a student's name before they speak — so raw
 * recorder transcripts usually have NO "Name:" speaker labels. When the
 * structural parser finds no usable speaker turns, this LLM pass attributes
 * utterances to roster names based on those call-outs.
 */
// Diarize in bounded windows so the JSON response can never be truncated,
// no matter how long the recording is. Each ~6k-char chunk is re-emitted as
// structured turns well within the output cap; chunks run in parallel and
// their utterances are concatenated in order.
const DIARIZE_CHUNK_CHARS = 6000;
const DIARIZE_MAX_CHUNKS = 20; // ~120k chars of transcript

async function diarizeChunk(
  key: string,
  chunk: string,
  rosterNames: string[],
  teacherNames: string[],
): Promise<Utterance[]> {
  const parsed = await openaiJson(key, {
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You segment a raw classroom audio-recording transcript into speaker turns. " +
            "This is an offline English class for Vietnamese school students: one recorder " +
            "captured everyone, and the teacher usually calls a student's NAME right before " +
            "that student speaks (e.g. \"Anna, can you read this?\" → the next utterance is Anna's). " +
            "Students may also call out each other's names.\n\n" +
            `Known students: ${rosterNames.join(", ") || "(unknown)"}.\n` +
            `Teacher(s): ${teacherNames.join(", ") || "Teacher"}.\n\n` +
            "Attribute every utterance to the most likely speaker. Use the student names " +
            'exactly as listed, "Teacher" for the teacher, and "Unknown" only when genuinely ' +
            "unattributable. Split turns at natural speaker changes; keep the original wording.\n\n" +
            'Return JSON: {"utterances": [{"speaker": string, "text": string}]}',
        },
        { role: "user", content: chunk },
      ],
  }, "diarization", 60_000);
  const utts: any[] = Array.isArray(parsed.utterances) ? parsed.utterances : [];
  return utts
    .map((u) => ({ speaker: String(u.speaker || "Unknown").trim(), text: String(u.text || "").trim() }))
    .filter((u) => u.text);
}

async function llmDiarize(
  rawText: string,
  rosterNames: string[],
  teacherNames: string[],
): Promise<Utterance[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const chunks = chunkOnLines(rawText, DIARIZE_CHUNK_CHARS).slice(0, DIARIZE_MAX_CHUNKS);
  const perChunk = await Promise.all(
    chunks.map((c) =>
      diarizeChunk(key, c, rosterNames, teacherNames).catch((e) => {
        console.warn("diarize chunk failed (skipped):", (e as Error)?.message);
        return [] as Utterance[];
      }),
    ),
  );
  return perChunk.flat();
}

interface SpeakerStats {
  label: string;
  utterances: string[];
  words: number;
  distinctWords: Set<string>;
  questions: number;
}

function computeStats(utterances: Utterance[]): Map<string, SpeakerStats> {
  const map = new Map<string, SpeakerStats>();
  for (const u of utterances) {
    const key = u.speaker;
    if (!map.has(key)) {
      map.set(key, { label: key, utterances: [], words: 0, distinctWords: new Set(), questions: 0 });
    }
    const s = map.get(key)!;
    s.utterances.push(u.text);
    const tokens = u.text.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
    s.words += tokens.length;
    for (const t of tokens) s.distinctWords.add(t);
    if (u.text.includes("?")) s.questions++;
  }
  return map;
}

// The lesson report is the quality-critical call, so it gets gpt-4o. The
// per-student pass stays on gpt-4o-mini: it was already good enough there,
// and running BOTH on gpt-4o pushed this handler past the edge-function
// wall-clock budget — the function was killed mid-flight and left transcripts
// stranded in "processing" (the same stall this pipeline hit before).
const ANALYSIS_MODEL = "gpt-4o";
const STUDENT_MODEL = "gpt-4o-mini";

/**
 * One bounded OpenAI JSON call.
 *
 * This handler also runs diarization and point mining, so no single LLM call
 * may consume the whole budget. Each is hard-capped with an AbortController;
 * on timeout it rejects, Promise.allSettled catches it, and the run still
 * finishes and persists whatever succeeded instead of hanging forever.
 */
async function openaiJson(
  key: string,
  body: Record<string, unknown>,
  label: string,
  timeoutMs: number,
): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) {
      throw new Error(`OpenAI ${label} error (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const data = await res.json();
    return safeParseJson(data.choices?.[0]?.message?.content || "{}");
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw new Error(`OpenAI ${label} timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Rich, grounded lesson report from the FULL transcript.
 *
 * Two things previously wrecked this: the report was built from only the
 * first 60 utterances (so anything taught later was reported as "not
 * covered"), and the prompt asked for a vague 4-sentence blurb. This reads
 * the whole lesson and returns a structured post-lesson report — the shape
 * of a good teacher's notes — with hard anti-hallucination guardrails.
 */
async function llmLessonReport(
  key: string,
  fullTranscript: string,
  lessonTitle: string | null,
  lessonContext: string | null,
  presentStudents: string[],
  lessonDate: string,
): Promise<any> {
  return await openaiJson(key, {
      model: ANALYSIS_MODEL,
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write a structured post-lesson report from the transcript of an English lesson " +
            "at a Vietnamese English club (students Pre-A1 to B2). The transcript is from a single " +
            "room microphone, so speaker labels may be imperfect and some lines are labeled " +
            "'Unknown' or 'Teacher' — use the CONTENT to tell teaching from answering.\n\n" +
            "ABSOLUTE RULES — a good report is worthless if it's not true:\n" +
            "1. Ground EVERYTHING in the transcript. Never invent activities, quotes, numbers, " +
            "materials, homework or outcomes. If something isn't in the transcript, leave it out.\n" +
            "2. Quotes must be VERBATIM from the transcript — copy the words exactly, don't " +
            "paraphrase into quotation marks. Attribute each to the labeled speaker.\n" +
            "3. Read the WHOLE transcript before judging anything, especially title coverage — a " +
            "topic can appear anywhere. Only say a topic was NOT covered if it is genuinely absent.\n" +
            "4. Be concrete and specific like a real teacher's notes — what actually happened, in " +
            "order. No generic filler ('students were engaged') without a specific example.\n" +
            "5. Every list may be empty. An empty, true report beats a padded, invented one.\n\n" +
            `Lesson date: ${lessonDate}. Students on the roster who spoke: ${presentStudents.join(", ") || "unknown"}.\n` +
            (lessonTitle ? `The teacher titled this lesson: "${lessonTitle}".\n` : "") +
            (lessonContext ? `The teacher's plan/notes:\n${String(lessonContext).slice(0, 1500)}\n` : "") +
            "\nReturn JSON: {" +
            '"summary": string (3-4 plain sentences a parent could read: what the class actually ' +
            "did and how it went), " +
            '"objectives": [string] (learning objectives you can SEE being worked on in the ' +
            "transcript — not aspirational), " +
            '"chronology": [{"phase": string (e.g. "Warm-up", "Grammar", "Reading", "Closing"), ' +
            '"detail": string (what happened in this segment, grounded, 1-3 sentences)}] (in order), ' +
            '"engagement": [{"student": string (name or label as in transcript), "quote": string ' +
            '(VERBATIM), "note": string (what this showed — a strength, an attempt, a breakthrough)}] ' +
            "(the most telling real moments, up to 8), " +
            '"misconceptions": [string] (a real confusion a student showed AND how the teacher ' +
            "addressed it, if they did — grounded), " +
            '"interventions": [string] (specific teacher feedback or instructional adjustments that ' +
            "actually happened, e.g. a correction, a scaffold, a re-explanation), " +
            '"general_understanding": string (1-2 sentences: how well the class grasped the material, ' +
            "with a concrete example), " +
            '"next_steps": [string] (follow-ups the teacher stated or that clearly follow from what ' +
            "happened — grounded, not generic), " +
            '"materials": [{"name": string, "pages": string|null}] (only materials EXPLICITLY ' +
            "referenced in the transcript), " +
            '"homework": string|null (homework actually assigned; null if none), ' +
            '"title_coverage": {"covered": boolean, "evidence": [string] (up to 3 VERBATIM lines ' +
            'showing the titled topic being taught), "note": string (how well it matched, or what ' +
            "was taught instead)}}",
        },
        { role: "user", content: fullTranscript.slice(0, 30000) },
      ],
  }, "lesson-report", 90_000);
}

/**
 * Per-student assessment. Kept separate from the lesson report so each call
 * has a focused job and bounded output. Stays on gpt-4o-mini for speed (the
 * lesson report is the call that needed the upgrade), but is now given the
 * lesson as real context instead of a 3k-char slice.
 */
async function llmAnalyze(
  perStudent: Array<{ name: string; sample: string }>,
  fullTranscript: string,
  lessonTitle: string | null,
): Promise<any> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  return await openaiJson(key, {
      model: STUDENT_MODEL,
      temperature: 0.2,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an ESL assessment specialist. For each listed student, assess ONLY their own " +
            "quoted utterances, using the full lesson as context. Ground everything in the " +
            "transcript — never invent errors, quotes or achievements. Flag only GENUINE learner " +
            "errors (ignore casual contractions and normal spoken ellipsis).\n\n" +
            (lessonTitle ? `Lesson topic: "${lessonTitle}".\n\n` : "") +
            'Return JSON: {"students": [{"name": string (exactly as given), ' +
            '"cefr_estimate": "Pre-A1"|"A1"|"A1+"|"A2"|"A2+"|"B1"|"B1+"|"B2"|null (null if too little speech), ' +
            '"confidence": number 0-1, ' +
            '"errors": [{"error_text": string (VERBATIM student fragment), "corrected_text": string, ' +
            '"error_type": "grammar"|"vocabulary"|"pronunciation"|"spelling"|"syntax"|"other", ' +
            '"cefr_topic": string}] (max 5, most instructive first), ' +
            '"highlights": [string] (up to 2 real notable moments), ' +
            '"contribution": string (1-2 sentences: what this student actually contributed this ' +
            "lesson — grounded in their utterances), " +
            '"teacher_feedback": string (2-3 warm sentences to the student, grounded in what they ' +
            "actually said/did), " +
            '"recommendation": string (1 concrete next step), ' +
            '"evidence": string (1 sentence justifying the CEFR estimate)}]}',
        },
        {
          role: "user",
          content:
            `Full lesson transcript (context):\n${fullTranscript.slice(0, 10000)}\n\n` +
            `Assess these students from their own utterances:\n` +
            perStudent.map((s) => `### ${s.name}\n${s.sample}`).join("\n\n"),
        },
      ],
  }, "per-student", 90_000);
}

interface PointAward {
  student_name: string;
  points: number;
  quote: string;
  reason: string | null;
}

/**
 * Decipher point awards the teacher announced in class — "5 stars Kiki!",
 * "two points for Anna", "minus one Tom". Runs over TEACHER utterances only
 * (students promising themselves stars don't count), chunked so long
 * lessons can't truncate the JSON output.
 */
async function extractPointAwards(
  key: string,
  teacherSpeech: string,
  rosterNames: string[],
): Promise<PointAward[]> {
  const chunks = chunkOnLines(teacherSpeech, 8000).slice(0, 12);
  const perChunk = await Promise.all(
    chunks.map(async (chunk) => {
      const parsed = await openaiJson(key, {
          model: "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 3000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You extract POINT AWARDS the teacher announces out loud during an English club " +
                "lesson for Vietnamese school students. You receive a SPEAKER-LABELED transcript, " +
                "but the labels come from mono-microphone diarization and can be wrong — teacher " +
                "speech is sometimes labeled 'Unknown' or even a student's name. Judge by CONTENT: " +
                "an award grant is the teaching voice giving/removing stars or points. " +
                "'Star' and 'point' mean the same thing. Typical phrasings: \"5 stars Kiki!\", " +
                "\"two points for Anna\", \"Tom gets a star\", \"minus one point, Sam\", " +
                "\"I'm taking a star from Lily\".\n\n" +
                `Known students: ${rosterNames.join(", ") || "(unknown)"}.\n\n` +
                "Rules:\n" +
                "- Only ACTUAL grants addressed to a NAMED student, in the teaching voice.\n" +
                "- Skip hypotheticals/promises (\"if you finish, you get 5 stars\"), group awards " +
                "without names (\"a point for everyone\"), and students requesting or bragging " +
                "about stars for themselves (\"I have 5 stars!\", \"give me a star!\").\n" +
                "- Deductions are negative points.\n" +
                "- If the same award is repeated/echoed, include it once.\n\n" +
                'Return JSON: {"awards": [{"student_name": string (as spoken), ' +
                '"points": integer (negative for deductions), ' +
                '"quote": string (the verbatim utterance containing the grant), ' +
                '"reason": string|null (short paraphrase of why, if stated)}]}',
            },
            { role: "user", content: chunk },
          ],
      }, "point-awards", 45_000).catch((e) => {
        console.warn("point-award chunk failed (skipped):", (e as Error)?.message);
        return {};
      });
      const awards: any[] = Array.isArray(parsed.awards) ? parsed.awards : [];
      return awards
        .map((a) => ({
          student_name: String(a.student_name || "").trim(),
          points: Math.trunc(Number(a.points) || 0),
          quote: String(a.quote || "").slice(0, 400),
          reason: a.reason ? String(a.reason).slice(0, 200) : null,
        }))
        .filter((a) => a.student_name && a.points !== 0 && Math.abs(a.points) <= 100);
    }),
  );
  return perChunk.flat();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const respond = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let transcriptId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    transcriptId = String(body.transcript_id ?? "").trim() || null;
    if (!transcriptId) return respond({ success: false, error: "transcript_id is required" }, 400);

    const { data: tr, error: trErr } = await sb
      .from("class_transcripts")
      .select("id, class_id, raw_text, uploaded_by, transcript_date, title, lesson_context")
      .eq("id", transcriptId)
      .single();
    if (trErr || !tr) return respond({ success: false, error: "transcript not found" }, 404);

    // ── 1. Roster + teachers (needed both for parsing fallback & matching)
    // enrollments has no `status` column — "currently enrolled" means
    // end_date is null or still in the future.
    const today = new Date().toISOString().slice(0, 10);
    const { data: enrollRows } = await sb
      .from("enrollments")
      .select("students(id, full_name)")
      .eq("class_id", tr.class_id)
      .or(`end_date.is.null,end_date.gte.${today}`);
    const roster: Array<{ id: string; full_name: string }> = (enrollRows || [])
      .map((r: any) => r.students)
      .filter((s: any) => s?.id);

    const { data: teacherRows } = await sb
      .from("sessions")
      .select("teachers(full_name)")
      .eq("class_id", tr.class_id)
      .limit(20);
    const rawTeacherNames = [
      ...new Set(
        (teacherRows || []).map((r: any) => r.teachers?.full_name).filter(Boolean) as string[],
      ),
    ];
    const teacherNames = new Set(rawTeacherNames.map((n) => normName(n)));
    teacherNames.add("teacher"); // diarization labels the teacher generically

    // Manual speaker→student corrections the teacher made on earlier
    // transcripts for this class. A recorder that consistently mis-hears a
    // name ("Kiwi" for "Kiki") then resolves itself from here on.
    const { data: aliasRows } = await sb
      .from("class_speaker_aliases")
      .select("speaker_label, student_id")
      .eq("class_id", tr.class_id);
    const aliasMap = new Map<string, string>(
      (aliasRows || []).map((a: any) => [String(a.speaker_label), String(a.student_id)]),
    );

    // ── 2. Parse into speaker turns ──────────────────────────────────────
    // Structural parse first (Zoom/Teams VTT, SRT, "Name: line"). Offline
    // classes use a room recorder with no labels — when the parse yields
    // fewer than 2 distinct speakers, fall back to LLM diarization keyed on
    // names called out in class.
    let utterances = parseTranscript(tr.raw_text);
    const distinctSpeakers = new Set(utterances.map((u) => normName(u.speaker))).size;
    if (!utterances.length || distinctSpeakers < 2) {
      utterances = await llmDiarize(
        tr.raw_text,
        roster.map((s) => s.full_name),
        rawTeacherNames,
      );
    }
    if (!utterances.length) throw new Error("could not attribute any speaker turns in the transcript");
    const stats = computeStats(utterances);

    const matchStudent = (label: string) => {
      const n = normName(label);
      if (!n) return null;
      // A teacher's past manual correction beats fuzzy name matching.
      const aliased = aliasMap.get(n);
      if (aliased) return aliased;
      let best: { id: string; score: number } | null = null;
      for (const s of roster) {
        const rn = normName(s.full_name);
        let score = 0;
        if (rn === n) score = 1;
        else if (rn.includes(n) || n.includes(rn)) score = 0.9;
        else {
          const nTok = new Set(n.split(" "));
          const rTok = rn.split(" ");
          const hits = rTok.filter((t) => nTok.has(t)).length;
          score = hits / Math.max(rTok.length, 1);
        }
        if (!best || score > best.score) best = { id: s.id, score };
      }
      return best && best.score >= 0.5 ? best.id : null;
    };

    const speakers = [...stats.values()];
    const totalStudentWords = speakers
      .filter((s) => !teacherNames.has(normName(s.label)) && !isUnknownLabel(s.label))
      .reduce((sum, s) => sum + s.words, 0);

    // ── 4. LLM analysis over matched students (Unknown excluded) ─────────
    const studentSpeakers = speakers
      .map((s) => ({ ...s, studentId: matchStudent(s.label), isTeacher: teacherNames.has(normName(s.label)) }))
      .filter((s) => !s.isTeacher && !isUnknownLabel(s.label));

    const llmInput = studentSpeakers
      .filter((s) => s.words >= 5)
      .sort((a, b) => b.words - a.words)
      .slice(0, 30) // bound the JSON output even for very large classes
      .map((s) => ({
        name: s.label,
        sample: s.utterances.slice(0, 40).join("\n").slice(0, 2500),
      }));

    // The whole lesson, labeled — this is what both LLM passes read. The old
    // code fed only the first 60 utterances, so anything taught later was
    // reported as "not covered". Cap generously; gpt-4o has a 128k context.
    const fullTranscript = utterances.map((u) => `${u.speaker}: ${u.text}`).join("\n");

    const presentStudents = [
      ...new Set(
        studentSpeakers
          .filter((s) => s.studentId && s.words >= 5)
          .map((s) => {
            const match = roster.find((r) => r.id === s.studentId);
            return match?.full_name || s.label;
          }),
      ),
    ];
    const lessonDate = tr.transcript_date ? String(tr.transcript_date).slice(0, 10) : "unknown";
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    // Lesson report (whole class) and per-student assessment are separate LLM
    // jobs — each stays focused and its JSON output stays bounded. Run them
    // together; a failure in one shouldn't sink the other.
    const [reportRes, perStudentRes] = await Promise.allSettled([
      llmLessonReport(
        openaiKey,
        fullTranscript,
        tr.title ?? null,
        tr.lesson_context ?? null,
        presentStudents,
        lessonDate,
      ),
      llmInput.length
        ? llmAnalyze(llmInput, fullTranscript, tr.title ?? null)
        : Promise.resolve({ students: [] }),
    ]);

    const report = reportRes.status === "fulfilled" ? reportRes.value : {};
    if (reportRes.status === "rejected") console.error("lesson report failed:", reportRes.reason);
    const perStudent = perStudentRes.status === "fulfilled" ? perStudentRes.value : { students: [] };
    if (perStudentRes.status === "rejected") console.error("per-student analysis failed:", perStudentRes.reason);

    // Merge into the single `analysis` object the rest of the handler (and the
    // persisted JSONB) expects. Lesson-level fields come from the report; the
    // structured narrative lives under `lesson_report`.
    const analysis: any = {
      summary: report.summary || "No lesson summary could be generated.",
      title_coverage: report.title_coverage ?? null,
      materials: Array.isArray(report.materials) ? report.materials : [],
      homework: report.homework ?? null,
      lesson_report: {
        objectives: Array.isArray(report.objectives) ? report.objectives : [],
        chronology: Array.isArray(report.chronology) ? report.chronology : [],
        engagement: Array.isArray(report.engagement) ? report.engagement : [],
        misconceptions: Array.isArray(report.misconceptions) ? report.misconceptions : [],
        interventions: Array.isArray(report.interventions) ? report.interventions : [],
        general_understanding: report.general_understanding || "",
        next_steps: Array.isArray(report.next_steps) ? report.next_steps : [],
      },
      students: Array.isArray(perStudent.students) ? perStudent.students : [],
    };

    const byName = new Map<string, any>(
      (analysis.students || []).map((s: any) => [normName(String(s.name || "")), s]),
    );

    // ── 5. Persist everything ────────────────────────────────────────────
    // Re-analysis rebuilds the metric rows, so first capture any text a
    // teacher has corrected — their wording must survive a re-run.
    const { data: editedRows } = await sb
      .from("transcript_speaker_metrics")
      .select("speaker_label, contribution, teacher_feedback, recommendation")
      .eq("transcript_id", transcriptId)
      .eq("edited_by_teacher", true);
    const preserved = new Map<string, any>(
      (editedRows || []).map((r: any) => [normName(String(r.speaker_label || "")), r]),
    );

    await sb.from("transcript_speaker_metrics").delete().eq("transcript_id", transcriptId);

    let errorsLogged = 0;
    let matchedCount = 0;

    for (const s of speakers) {
      const isTeacher = teacherNames.has(normName(s.label));
      const isUnknown = isUnknownLabel(s.label);
      const studentId = isTeacher || isUnknown ? null : matchStudent(s.label);
      if (studentId) matchedCount++;
      const ai = byName.get(normName(s.label));
      const keep = preserved.get(normName(s.label));

      await sb.from("transcript_speaker_metrics").insert({
        transcript_id: transcriptId,
        class_id: tr.class_id,
        student_id: studentId,
        speaker_label: s.label,
        is_teacher: isTeacher,
        utterance_count: s.utterances.length,
        word_count: s.words,
        avg_utterance_length: s.utterances.length ? s.words / s.utterances.length : 0,
        questions_asked: s.questions,
        participation_share:
          !isTeacher && !isUnknown && totalStudentWords > 0 ? s.words / totalStudentWords : null,
        vocabulary_richness: s.words > 0 ? s.distinctWords.size / s.words : null,
        errors_count: ai?.errors?.length ?? 0,
        cefr_estimate: ai?.cefr_estimate ?? null,
        highlights: ai?.highlights?.length ? ai.highlights : null,
        // Teacher corrections win over a fresh AI pass.
        contribution:
          keep?.contribution ?? (ai?.contribution ? String(ai.contribution).slice(0, 600) : null),
        teacher_feedback:
          keep?.teacher_feedback ?? (ai?.teacher_feedback ? String(ai.teacher_feedback).slice(0, 800) : null),
        recommendation:
          keep?.recommendation ?? (ai?.recommendation ? String(ai.recommendation).slice(0, 400) : null),
        edited_by_teacher: !!keep,
      });

      if (!studentId || !ai) continue;

      // Error log + auto SRS cards
      for (const err of ai.errors ?? []) {
        if (!err?.error_text || !err?.corrected_text) continue;
        const { data: errRow } = await sb
          .from("student_error_log")
          .insert({
            student_id: studentId,
            class_id: tr.class_id,
            source: "transcript",
            source_id: transcriptId,
            error_text: String(err.error_text).slice(0, 500),
            corrected_text: String(err.corrected_text).slice(0, 500),
            error_type: ["grammar", "vocabulary", "pronunciation", "spelling", "syntax", "other"].includes(err.error_type)
              ? err.error_type
              : "grammar",
            cefr_topic: err.cefr_topic ? String(err.cefr_topic).slice(0, 80) : null,
          })
          .select("id")
          .single();
        if (errRow) {
          errorsLogged++;
          await sb.from("srs_cards").insert({
            student_id: studentId,
            source: "error",
            error_log_id: errRow.id,
            front: `Fix this sentence:\n“${String(err.error_text).slice(0, 300)}”`,
            back: String(err.corrected_text).slice(0, 300),
            hint: err.cefr_topic ? `Topic: ${err.cefr_topic}` : null,
          });
        }
      }

      // CEFR trajectory point
      if (ai.cefr_estimate && CEFR_SCORE[ai.cefr_estimate] !== undefined) {
        await sb.from("cefr_assessments").insert({
          student_id: studentId,
          class_id: tr.class_id,
          source: "transcript",
          level: ai.cefr_estimate,
          level_score: CEFR_SCORE[ai.cefr_estimate],
          confidence: typeof ai.confidence === "number" ? ai.confidence : null,
          evidence: ai.evidence ? String(ai.evidence).slice(0, 500) : null,
          assessed_at: tr.transcript_date,
          source_id: transcriptId,
        });
      }
    }

    // ── 6. Decipher teacher-announced point awards ("5 stars Kiki!") ─────
    // Suggestions only — the teacher applies them from the review UI. Gated
    // by that day's attendance so absent students can't receive awards.
    // Best-effort: a failure here must never sink the whole analysis.
    let pointsSuggested = 0;
    try {
      // Mine the WHOLE labeled transcript, not just teacher-labeled turns:
      // on mono room recordings the diarizer sometimes files teacher speech
      // under Unknown, and filtering by label made those awards invisible.
      // The extractor judges "is this the teaching voice granting points?"
      // from content, with the (imperfect) labels as a hint.
      const labeledTranscript = utterances
        .map((u) => `${u.speaker}: ${u.text}`)
        .join("\n");

      if (labeledTranscript.trim().length >= 20) {
        const key = Deno.env.get("OPENAI_API_KEY")!;
        const awards = await extractPointAwards(key, labeledTranscript, roster.map((s) => s.full_name));

        if (awards.length) {
          // Attendance for the transcript's date (any session of this class).
          const { data: daySessions } = await sb
            .from("sessions")
            .select("id")
            .eq("class_id", tr.class_id)
            .eq("date", tr.transcript_date);
          const sessionIds = (daySessions ?? []).map((s: any) => s.id);

          const attMap = new Map<string, string>();
          if (sessionIds.length) {
            const { data: att } = await sb
              .from("attendance")
              .select("student_id, status")
              .in("session_id", sessionIds);
            for (const a of att ?? []) {
              // A student present in ANY session that day counts as present.
              const prev = attMap.get(a.student_id);
              if (!prev || a.status === "Present") attMap.set(a.student_id, a.status);
            }
          }

          // Re-analysis: refresh pending suggestions, keep applied/dismissed.
          await sb
            .from("transcript_point_suggestions")
            .delete()
            .eq("transcript_id", transcriptId)
            .eq("status", "suggested");
          const { data: settled } = await sb
            .from("transcript_point_suggestions")
            .select("student_id, points, quote")
            .eq("transcript_id", transcriptId);
          const settledKeys = new Set(
            (settled ?? []).map((r: any) => `${r.student_id}|${r.points}|${r.quote}`),
          );

          for (const award of awards) {
            const studentId = matchStudent(award.student_name);
            const attendanceStatus = studentId
              ? attMap.get(studentId) ?? (sessionIds.length ? "unmarked" : "no_session")
              : "unmarked";
            if (settledKeys.has(`${studentId}|${award.points}|${award.quote}`)) continue;

            const { error: insErr } = await sb.from("transcript_point_suggestions").insert({
              transcript_id: transcriptId,
              class_id: tr.class_id,
              student_id: studentId,
              speaker_label: award.student_name,
              points: award.points,
              quote: award.quote,
              reason: award.reason,
              attendance_status: attendanceStatus,
            });
            if (!insErr) pointsSuggested++;
          }
        }
      }
    } catch (e) {
      console.warn("point-award extraction failed (analysis continues):", (e as Error)?.message);
    }

    await sb
      .from("class_transcripts")
      .update({
        status: "analyzed",
        summary: analysis.summary ?? null,
        analysis,
        title_covered:
          typeof analysis.title_coverage?.covered === "boolean"
            ? analysis.title_coverage.covered
            : null,
        title_evidence: Array.isArray(analysis.title_coverage?.evidence)
          ? analysis.title_coverage.evidence.slice(0, 3)
          : [],
        title_note: analysis.title_coverage?.note
          ? String(analysis.title_coverage.note).slice(0, 500)
          : null,
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", transcriptId);

    // ── 7. Publish the student-safe lesson overview ──────────────────────
    // Summary + materials/pages + homework, visible to every enrolled
    // student (separate table: students must never see raw transcripts or
    // classmates' error analyses). Best-effort.
    try {
      // Never overwrite an overview the teacher has corrected by hand.
      const { data: existingOv } = await sb
        .from("lesson_overviews")
        .select("edited_by_teacher")
        .eq("transcript_id", transcriptId)
        .maybeSingle();

      if (existingOv?.edited_by_teacher) {
        console.log("lesson overview was teacher-edited — leaving it untouched");
      } else {
        const { error: ovErr } = await sb.from("lesson_overviews").upsert(
          {
            transcript_id: transcriptId,
            class_id: tr.class_id,
            lesson_date: tr.transcript_date,
            title: tr.title ?? null,
            summary: analysis.summary ?? null,
            materials: Array.isArray(analysis.materials) ? analysis.materials.slice(0, 10) : [],
            homework: analysis.homework ? String(analysis.homework).slice(0, 1000) : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "transcript_id" },
        );
        if (ovErr) console.warn("lesson_overviews upsert failed:", ovErr.message);
      }
    } catch (e) {
      console.warn("lesson overview publish failed (analysis continues):", (e as Error)?.message);
    }

    // Keep every matched student's living profile current (background).
    fireProfileRefresh(
      speakers
        .map((s) => (teacherNames.has(normName(s.label)) ? null : matchStudent(s.label)))
        .filter((id): id is string => !!id),
    );

    return respond({
      success: true,
      transcript_id: transcriptId,
      speakers: speakers.length,
      matched_students: matchedCount,
      errors_logged: errorsLogged,
      points_suggested: pointsSuggested,
      summary: analysis.summary ?? null,
    });
  } catch (error) {
    console.error("analyze-transcript error:", error);
    if (transcriptId) {
      await sb
        .from("class_transcripts")
        .update({
          status: "failed",
          error_message: (error as Error).message?.slice(0, 500),
        })
        .eq("id", transcriptId);
    }
    return respond({ success: false, error: (error as Error).message }, 500);
  }
});
