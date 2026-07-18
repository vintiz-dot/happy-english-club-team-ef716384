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
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
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
    }),
  });
  if (!res.ok) throw new Error(`OpenAI diarization error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const parsed = safeParseJson(data.choices?.[0]?.message?.content || "{}");
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

async function llmAnalyze(
  perStudent: Array<{ name: string; sample: string }>,
  lessonExcerpt: string,
): Promise<any> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 12000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an ESL assessment specialist analyzing a class transcript from an English " +
            "club for Vietnamese school students (levels Pre-A1 to B2). For each listed student, " +
            "analyze ONLY their quoted utterances.\n\n" +
            'Return JSON: {"summary": string (4-6 sentence lesson summary: topics covered, overall ' +
            "class dynamics), " +
            '"materials": [{"name": string (book/handout/game as mentioned in class), ' +
            '"pages": string|null (page numbers if stated, e.g. "42-45")}] (only materials ' +
            "EXPLICITLY referenced, e.g. \"open your books to page 42\"; empty array if none), " +
            '"homework": string|null (homework the teacher assigned, stated concisely; null if ' +
            "no homework was assigned), " +
            '"students": [{"name": string (exactly as given), ' +
            '"cefr_estimate": "Pre-A1"|"A1"|"A1+"|"A2"|"A2+"|"B1"|"B1+"|"B2"|null (null if too little speech), ' +
            '"confidence": number 0-1, ' +
            '"errors": [{"error_text": string (verbatim student utterance fragment), ' +
            '"corrected_text": string, "error_type": "grammar"|"vocabulary"|"pronunciation"|"spelling"|"syntax"|"other", ' +
            '"cefr_topic": string (e.g. "past simple", "articles", "subject-verb agreement")}] (max 5, most instructive first, ' +
            "ignore casual contractions and normal spoken ellipsis — flag only genuine learner errors), " +
            '"highlights": [string] (up to 2 notable moments: breakthroughs, great vocabulary use), ' +
            '"contribution": string (1-2 sentences: what this student contributed to THIS lesson — ' +
            "topics they engaged with, questions they asked, roles they played), " +
            '"teacher_feedback": string (2-3 warm sentences in a teacher\'s voice, addressed to the ' +
            "student, grounded in their actual utterances this lesson), " +
            '"recommendation": string (1 concrete, actionable next step for this student), ' +
            '"evidence": string (1 sentence justifying the CEFR estimate)}]}',
        },
        {
          role: "user",
          content:
            `Lesson excerpt (context):\n${lessonExcerpt.slice(0, 3000)}\n\n` +
            `Per-student utterances:\n` +
            perStudent
              .map((s) => `### ${s.name}\n${s.sample}`)
              .join("\n\n"),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return safeParseJson(data.choices?.[0]?.message?.content || "{}");
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
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });
      if (!res.ok) {
        console.warn(`point-award chunk failed (${res.status}), skipped`);
        return [] as PointAward[];
      }
      const data = await res.json();
      const parsed = safeParseJson(data.choices?.[0]?.message?.content || "{}");
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
      .select("id, class_id, raw_text, uploaded_by, transcript_date, title")
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

    const analysis = llmInput.length
      ? await llmAnalyze(llmInput, utterances.slice(0, 60).map((u) => `${u.speaker}: ${u.text}`).join("\n"))
      : { summary: "No student speech detected in this transcript.", students: [] };

    const byName = new Map<string, any>(
      (analysis.students || []).map((s: any) => [normName(String(s.name || "")), s]),
    );

    // ── 5. Persist everything ────────────────────────────────────────────
    // Re-analysis: clear previous derived rows for this transcript.
    await sb.from("transcript_speaker_metrics").delete().eq("transcript_id", transcriptId);

    let errorsLogged = 0;
    let matchedCount = 0;

    for (const s of speakers) {
      const isTeacher = teacherNames.has(normName(s.label));
      const isUnknown = isUnknownLabel(s.label);
      const studentId = isTeacher || isUnknown ? null : matchStudent(s.label);
      if (studentId) matchedCount++;
      const ai = byName.get(normName(s.label));

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
        contribution: ai?.contribution ? String(ai.contribution).slice(0, 600) : null,
        teacher_feedback: ai?.teacher_feedback ? String(ai.teacher_feedback).slice(0, 800) : null,
        recommendation: ai?.recommendation ? String(ai.recommendation).slice(0, 400) : null,
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
        analyzed_at: new Date().toISOString(),
      })
      .eq("id", transcriptId);

    // ── 7. Publish the student-safe lesson overview ──────────────────────
    // Summary + materials/pages + homework, visible to every enrolled
    // student (separate table: students must never see raw transcripts or
    // classmates' error analyses). Best-effort.
    try {
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
