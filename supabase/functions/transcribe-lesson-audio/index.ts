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
  rosterNames: string[],
): Promise<{ text: string; duration: number; segments: WhisperSegment[] }> {
  const form = new FormData();
  form.append("file", new Blob([audioBytes], { type: mimeType || "audio/mpeg" }), fileName);
  form.append("model", "whisper-1");
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  // Whisper's prompt biases recognition toward listed vocabulary — priming
  // it with the roster makes student names transcribe correctly instead of
  // as near-homophones, which is what downstream diarization keys on.
  if (rosterNames.length) {
    form.append(
      "prompt",
      `An English lesson at a Vietnamese English club. Students: ${rosterNames.slice(0, 30).join(", ")}.`,
    );
  }

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
// truncated regardless of recording length. Batches run SEQUENTIALLY and
// each one receives the tail of the previous batch's labels — a mono room
// recorder (e.g. Anker S500) gives no channel separation, so conversational
// continuity across batch boundaries is the strongest signal there is.
// The labeler runs on gpt-4o (not mini): diarization precision is what the
// whole engagement dashboard stands on, and the labeling pass is a small
// share of the per-lesson cost.
const SEGMENT_BATCH_SIZE = 80;
const SEGMENT_BATCH_LIMIT = 20; // ~1600 segments — comfortably above what a
                                 // 25MB (Whisper's own cap) recording can hold
const CONTEXT_TAIL = 8;          // labeled lines carried into the next batch

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
                ? `The transcript so far ended like this (already labeled):\n${prevContext}\n\n`
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

  // Sequential on purpose: each batch is labeled with the tail of the
  // previous batch as conversational context.
  let prevContext = "";
  for (const batch of batches) {
    const labels = await labelSegmentBatch(key, batch, rosterNames, teacherNames, prevContext);
    for (const [id, speaker] of labels) labelById.set(id, speaker);
    prevContext = batch
      .slice(-CONTEXT_TAIL)
      .map((s) => `${labelById.get(s.id) || "Unknown"}: ${s.text}`)
      .join("\n");
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
      .select("id, class_id, audio_storage_path, audio_mime_type")
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

    // ── 3. Whisper transcription (real timestamps, roster-primed) ─────────
    const fileName = tr.audio_storage_path.split("/").pop() || "recording.mp3";
    const { text, duration, segments } = await transcribeWithWhisper(
      key,
      audioBytes,
      tr.audio_mime_type || "audio/mpeg",
      fileName,
      rosterNames,
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

    // ── 5. Delegate to the existing analysis pipeline, unmodified ─────────
    const analyzeRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/analyze-transcript`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ transcript_id: transcriptId }),
    });
    const analyzeJson = await analyzeRes.json().catch(() => ({}));

    return respond(
      { ...analyzeJson, duration_seconds: duration, segments_transcribed: segments.length },
      analyzeRes.status,
    );
  } catch (error) {
    console.error("transcribe-lesson-audio error:", error);
    return fail((error as Error).message || "Transcription failed", 500);
  }
});
