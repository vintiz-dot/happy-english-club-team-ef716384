/**
 * transcribe-lesson-audio Edge Function
 * =======================================
 * Upgrades transcript ingestion to accept the raw class recording itself.
 * The frontend uploads the audio file to the `class-recordings` bucket,
 * inserts a `class_transcripts` row (raw_text placeholder, source_format
 * 'audio', audio_storage_path set, status 'processing'), then invokes this
 * function with the row id. Pipeline:
 *
 *   1. Download the audio and send it to OpenAI Whisper
 *      (audio/transcriptions, response_format=verbose_json) — returns the
 *      full text PLUS segment-level timestamps (start/end per utterance).
 *   2. Batch the timestamped segments and ask an LLM to attribute each one
 *      to a speaker (roster name / "Teacher" / "Unknown") using the same
 *      call-out cues as the text-transcript diarizer. Speaker labeling is
 *      the LLM's only job — every timestamp on the final utterances is
 *      Whisper's own, never fabricated, because labels are mapped back
 *      onto the original segments by index.
 *   3. Merge consecutive same-speaker segments into utterances and render
 *      a labeled, timestamped WebVTT (`<v Speaker>text</v>` cues with real
 *      HH:MM:SS.mmm timestamps) into class_transcripts.raw_text.
 *   4. Delegate to the existing analyze-transcript function — unmodified —
 *      for everything downstream: stats, error logging, CEFR, point-award
 *      mining, learning-profile refresh. This function's only job is
 *      turning audio into a labeled transcript; analyze-transcript does
 *      not need to know or care where the text came from.
 *
 * Input:  { transcript_id: string }
 * Output: analyze-transcript's response, plus
 *         { duration_seconds, segments_transcribed }
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";
import { safeParseJson, chunkArray } from "../_lib/text.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// OpenAI's whisper-1 endpoint hard-caps uploads at 25 MB. Checked here
// (not just at the storage-bucket level) so an oversized file gets a
// specific, actionable error instead of a generic upstream 400.
const WHISPER_MAX_BYTES = 25_000_000;

interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

interface LabeledUtterance {
  speaker: string;
  text: string;
  start: number;
  end: number;
}

function formatVttTimestamp(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  const pad = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
}

async function transcribeWithWhisper(
  key: string,
  audioBytes: Uint8Array,
  mimeType: string,
  fileName: string,
  recognitionPrompt: string,
): Promise<{ text: string; duration: number; segments: WhisperSegment[] }> {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeType || "audio/mpeg" }), fileName);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  // Whisper's prompt biases recognition toward the vocabulary it lists —
  // priming it with the roster, lesson title and the teacher's own lesson
  // notes makes names and domain terms ("Oxford Discover", target
  // vocabulary) transcribe correctly instead of as near-homophones, which
  // is what downstream diarization and analysis key on.
  if (recognitionPrompt) form.append("prompt", recognitionPrompt);

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` }, // no Content-Type — fetch sets the multipart boundary
    body: form,
  });
  if (!res.ok) throw new Error(`Whisper transcription error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const segments: WhisperSegment[] = Array.isArray(data.segments)
    ? data.segments.map((s: any) => ({
        id: Number(s.id),
        start: Number(s.start) || 0,
        end: Number(s.end) || 0,
        text: String(s.text || "").trim(),
      })).filter((s: WhisperSegment) => s.text)
    : [];
  return { text: String(data.text || ""), duration: Number(data.duration) || 0, segments };
}

// Batch segments for speaker labeling so the JSON response can never be
// truncated regardless of recording length.
//
// Batches run in BOUNDED-PARALLEL waves. An earlier version chained them
// sequentially (each batch seeing the previous batch's *labels*), which was
// more precise in principle but multiplied wall clock by the batch count —
// a 45-min lesson blew past the edge function's time limit and the run was
// killed mid-flight, stranding the transcript in "processing" forever.
//
// Continuity is preserved a cheaper way: each batch is given the RAW text of
// the segments immediately preceding it. That context is known upfront, so
// batches stay independent and parallelisable, while the labeler still sees
// the name call-out that precedes an answer — the signal that actually
// matters on a mono room recorder (e.g. Anker S500).
//
// The labeler runs on gpt-4o (not mini): diarization precision is what the
// whole engagement dashboard stands on, and with parallel waves the wall
// clock is roughly one batch regardless of lesson length.
const SEGMENT_BATCH_SIZE = 120;
const SEGMENT_BATCH_LIMIT = 20; // ~2400 segments — far above what a 25MB
                                 // (Whisper's own cap) recording can hold
const CONTEXT_TAIL = 8;          // raw preceding lines given to each batch
const DIARIZE_CONCURRENCY = 8;   // parallel labeling calls per wave

async function labelSegmentBatch(
  key: string,
  batch: WhisperSegment[],
  rosterNames: string[],
  teacherNames: string[],
  prevContext: string,
): Promise<Map<number, string>> {
  const listing = batch
    .map((s) => `[${s.id}] (${formatVttTimestamp(s.start).slice(3, 8)}) ${s.text}`)
    .join("\n");

  const result = new Map<number, string>();
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You attribute timestamped segments from a MONO classroom recording (one room " +
              "microphone, no channel separation) to speakers. It is an English lesson for " +
              "Vietnamese school students.\n\n" +
              "STRUCTURE OF SUCH RECORDINGS — use this as your prior:\n" +
              "- The TEACHER typically produces 50-80% of all segments: giving instructions " +
              "(\"open your books\", \"repeat after me\", \"listen\"), asking the class questions, " +
              "praising (\"good job!\", \"five stars!\"), correcting, managing behaviour, and " +
              "calling students BY NAME. When in doubt between Teacher and Unknown for " +
              "instruction-giving or praising speech, choose Teacher.\n" +
              "- STUDENTS give shorter responses, usually right after their name is called " +
              "(\"Anna, can you read?\" → the next segment is Anna's) or as choral/individual " +
              "answers to a question. A student keeps the floor until the teacher speaks again.\n" +
              "- Segments are CONSECUTIVE in time; speaker changes are far rarer than segments. " +
              "Prefer continuing the current speaker unless the content clearly switches voice " +
              "(question→answer, name call, register change from instruction to response).\n\n" +
              `Known students: ${rosterNames.join(", ") || "(unknown)"}.\n` +
              `Teacher(s): ${teacherNames.join(", ") || "Teacher"}.\n\n` +
              (prevContext
                ? `For context, the moments immediately BEFORE this excerpt were:\n${prevContext}\n` +
                  "(context only — do not label those lines)\n\n"
                : "") +
              "For EVERY segment index below return the most likely speaker: a student name " +
              'exactly as listed, "Teacher", or "Unknown" (reserve Unknown for genuinely ' +
              "unattributable audio like overlapping chatter — NOT for teacher speech).\n\n" +
              'Return JSON: {"labels": [{"index": number, "speaker": string}]}',
          },
          { role: "user", content: listing },
        ],
      }),
    });
    if (!res.ok) {
      console.warn(`segment batch labeling failed (${res.status}), defaulting to Unknown`);
      return result;
    }
    const data = await res.json();
    const parsed = safeParseJson(data.choices?.[0]?.message?.content || "{}");
    const labels: any[] = Array.isArray(parsed.labels) ? parsed.labels : [];
    for (const l of labels) {
      const idx = Number(l.index);
      if (Number.isFinite(idx)) result.set(idx, String(l.speaker || "Unknown").trim());
    }
  } catch (e) {
    console.warn("segment batch labeling error, defaulting to Unknown:", (e as Error)?.message);
  }
  return result;
}

async function diarizeSegments(
  key: string,
  segments: WhisperSegment[],
  rosterNames: string[],
  teacherNames: string[],
): Promise<LabeledUtterance[]> {
  const batches = chunkArray(segments, SEGMENT_BATCH_SIZE).slice(0, SEGMENT_BATCH_LIMIT);
  const labelById = new Map<number, string>();

  // Raw lookback context is known upfront, so batches are independent.
  const jobs = batches.map((batch, i) => ({
    batch,
    context: i === 0 ? "" : batches[i - 1].slice(-CONTEXT_TAIL).map((s) => s.text).join("\n"),
  }));

  // Bounded-parallel waves: fast enough to stay inside the function's time
  // budget, without firing dozens of gpt-4o calls at once into a rate limit.
  for (let i = 0; i < jobs.length; i += DIARIZE_CONCURRENCY) {
    const wave = jobs.slice(i, i + DIARIZE_CONCURRENCY);
    const results = await Promise.all(
      wave.map((j) => labelSegmentBatch(key, j.batch, rosterNames, teacherNames, j.context)),
    );
    for (const m of results) for (const [id, speaker] of m) labelById.set(id, speaker);
  }

  // Merge consecutive same-speaker segments into natural utterances,
  // keeping Whisper's own start (first segment) / end (last segment).
  const merged: LabeledUtterance[] = [];
  for (const seg of segments) {
    const speaker = labelById.get(seg.id) || "Unknown";
    const last = merged[merged.length - 1];
    if (last && last.speaker === speaker) {
      last.text += " " + seg.text;
      last.end = seg.end;
    } else {
      merged.push({ speaker, text: seg.text, start: seg.start, end: seg.end });
    }
  }
  return merged;
}

function toLabeledVtt(utterances: LabeledUtterance[]): string {
  const cues = utterances.map(
    (u) =>
      `${formatVttTimestamp(u.start)} --> ${formatVttTimestamp(u.end)}\n<v ${u.speaker}>${u.text.trim()}</v>`,
  );
  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
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
  const fail = async (message: string, status: number) => {
    if (transcriptId) {
      await sb
        .from("class_transcripts")
        .update({ status: "failed", error_message: message.slice(0, 500) })
        .eq("id", transcriptId);
    }
    return respond({ success: false, error: message }, status);
  };

  try {
    const body = await req.json().catch(() => ({}));
    transcriptId = String(body.transcript_id ?? "").trim() || null;
    if (!transcriptId) return respond({ success: false, error: "transcript_id is required" }, 400);

    const { data: tr, error: trErr } = await sb
      .from("class_transcripts")
      .select("id, class_id, audio_storage_path, audio_mime_type, title, lesson_context")
      .eq("id", transcriptId)
      .single();
    if (trErr || !tr) return respond({ success: false, error: "transcript not found" }, 404);
    if (!tr.audio_storage_path) return fail("No audio file was attached to this transcript", 400);

    const key = Deno.env.get("OPENAI_API_KEY");
    if (!key) return fail("OPENAI_API_KEY is not configured", 500);

    // ── 1. Download + size guard ──────────────────────────────────────────
    const { data: file, error: dlErr } = await sb.storage
      .from("class-recordings")
      .download(tr.audio_storage_path);
    if (dlErr || !file) return fail(`Could not download the audio file: ${dlErr?.message}`, 500);

    const audioBytes = new Uint8Array(await file.arrayBuffer());
    if (audioBytes.byteLength > WHISPER_MAX_BYTES) {
      return fail(
        `This recording is ${(audioBytes.byteLength / 1_000_000).toFixed(1)}MB, over Whisper's 25MB limit. ` +
          `Trim it or split the lesson into two shorter recordings and upload each separately.`,
        400,
      );
    }
    if (audioBytes.byteLength === 0) return fail("The uploaded audio file is empty", 400);

    // ── 2. Roster + teachers (fetched BEFORE Whisper so the roster can
    //       prime name recognition in the transcription itself) ───────────
    const today = new Date().toISOString().slice(0, 10);
    const { data: enrollRows } = await sb
      .from("enrollments")
      .select("students(full_name)")
      .eq("class_id", tr.class_id)
      .or(`end_date.is.null,end_date.gte.${today}`);
    const rosterNames = [
      ...new Set((enrollRows || []).map((r: any) => r.students?.full_name).filter(Boolean) as string[]),
    ];

    const { data: teacherRows } = await sb
      .from("sessions")
      .select("teachers(full_name)")
      .eq("class_id", tr.class_id)
      .limit(20);
    const teacherNames = [
      ...new Set((teacherRows || []).map((r: any) => r.teachers?.full_name).filter(Boolean) as string[]),
    ];

    // ── 3. Build the recognition prompt from everything we know about
    //       this lesson, then transcribe ────────────────────────────────
    // Whisper's prompt is capped around 224 tokens, so this is assembled
    // most-valuable-first and truncated: names (what diarization keys on),
    // then the lesson topic, the teacher's own notes, the resources they
    // attached, and finally the textbooks this class habitually uses.
    const [{ data: resourceRows }, { data: recentOverviews }] = await Promise.all([
      sb.from("lesson_resources").select("caption").eq("transcript_id", transcriptId).limit(10),
      sb.from("lesson_overviews")
        .select("materials")
        .eq("class_id", tr.class_id)
        .order("lesson_date", { ascending: false })
        .limit(5),
    ]);
    const recentMaterials = [
      ...new Set(
        (recentOverviews || [])
          .flatMap((o: any) => (Array.isArray(o.materials) ? o.materials : []))
          .map((m: any) => String(m?.name || "").trim())
          .filter(Boolean),
      ),
    ];
    const promptParts = [
      "An English lesson at a Vietnamese English club.",
      rosterNames.length ? `Students: ${rosterNames.slice(0, 30).join(", ")}.` : "",
      tr.title ? `Topic: ${tr.title}.` : "",
      tr.lesson_context ? `Lesson notes: ${String(tr.lesson_context).slice(0, 400)}` : "",
      (resourceRows || []).length
        ? `Materials: ${(resourceRows || []).map((r: any) => r.caption).filter(Boolean).join(", ")}.`
        : "",
      recentMaterials.length ? `Books used: ${recentMaterials.slice(0, 6).join(", ")}.` : "",
    ].filter(Boolean);
    // ~4 chars/token; stay under Whisper's prompt ceiling.
    const recognitionPrompt = promptParts.join(" ").slice(0, 850);

    const fileName = tr.audio_storage_path.split("/").pop() || "recording.mp3";
    const { text, duration, segments } = await transcribeWithWhisper(
      key,
      audioBytes,
      tr.audio_mime_type || "audio/mpeg",
      fileName,
      recognitionPrompt,
    );
    if (!segments.length || !text.trim()) {
      return fail("Whisper detected no speech in this recording", 400);
    }

    // ── 4. Diarize: label each timestamped segment against the roster ─────
    const utterances = await diarizeSegments(key, segments, rosterNames, teacherNames);

    // ── 4. Persist the labeled, timestamped transcript ─────────────────────
    const vtt = toLabeledVtt(utterances);
    const { error: updErr } = await sb
      .from("class_transcripts")
      .update({ raw_text: vtt, audio_duration_seconds: duration })
      .eq("id", transcriptId);
    if (updErr) return fail(`Failed to save the transcribed text: ${updErr.message}`, 500);

    // ── 5. Done. Analysis is deliberately a SEPARATE request ─────────────
    // This function used to call analyze-transcript inline, which meant one
    // request had to fit Whisper + diarization + the whole analysis chain
    // inside a single edge-function time budget — long lessons were killed
    // mid-flight and left stranded in "processing". The caller now invokes
    // analyze-transcript itself, so each stage gets its own budget.
    return respond({
      success: true,
      transcribed: true,
      transcript_id: transcriptId,
      duration_seconds: duration,
      segments_transcribed: segments.length,
      speakers_labeled: new Set(utterances.map((u) => u.speaker)).size,
    });
  } catch (error) {
    console.error("transcribe-lesson-audio error:", error);
    return fail((error as Error).message || "Transcription failed", 500);
  }
});
