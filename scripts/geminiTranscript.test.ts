import { describe, expect, test } from "bun:test";
import {
  GEMINI_TRANSCRIPT_PROMPT,
  MAX_SEGMENTS,
  readGeminiTranscript,
  toSeconds,
  transcriptAttention,
} from "../supabase/functions/_lib/gemini-transcript.ts";

describe("readGeminiTranscript", () => {
  test("the shape asked for becomes the OpenAI transcript's shape", () => {
    const t = readGeminiTranscript('{"segments":[{"start":0,"end":2.46,"text":"My name is Lan."},{"start":2.5,"end":5,"text":"I goes to school."}]}');
    expect(t).toEqual({
      text: "My name is Lan. I goes to school.",
      segments: [{ start: 0, end: 2.5, text: "My name is Lan." }, { start: 2.5, end: 5, text: "I goes to school." }],
    });
  });
  test("keeps the child's mistakes word for word", () => {
    expect(readGeminiTranscript('{"segments":[{"start":1,"end":2,"text":"He have two cat"}]}')?.text).toBe("He have two cat");
  });
  test("a json fence, a bare list, and m:ss times are read", () => {
    const t = readGeminiTranscript('```json\n[{"start":"0:05","end":"1:02.5","text":" hello  there "}]\n```');
    expect(t?.segments).toEqual([{ start: 5, end: 62.5, text: "hello there" }]);
  });
  test("unordered segments are sorted; empty, timeless and negative ones are dropped", () => {
    const t = readGeminiTranscript({ segments: [
      { start: 9, end: 10, text: "second" }, { start: 1, end: 2, text: "first" },
      { start: 3, end: 4, text: "   " }, { end: 5, text: "no start" }, { start: -1, text: "before the video" }, null, "x",
    ] });
    expect(t?.segments.map((s) => s.text)).toEqual(["first", "second"]);
  });
  test("an end before its start is pulled up to the start", () => {
    expect(readGeminiTranscript([{ start: 4, end: 1, text: "a" }])?.segments[0]).toEqual({ start: 4, end: 4, text: "a" });
  });
  test("with the video's length known, a segment after the end is dropped", () => {
    const t = readGeminiTranscript([{ start: 10, end: 12, text: "real" }, { start: 400, end: 402, text: "invented" }], 60);
    expect(t?.segments.map((s) => s.text)).toEqual(["real"]);
  });
  test("nobody speaking is an empty transcript, not a failure", () => {
    expect(readGeminiTranscript('{"segments":[]}')).toEqual({ text: "", segments: [] });
  });
  test("an unreadable answer is null, so the video counts as untranscribed", () => {
    expect(readGeminiTranscript("I could not hear anything")).toBeNull();
    expect(readGeminiTranscript('{"summary":"x"}')).toBeNull();
    expect(readGeminiTranscript(42)).toBeNull();
  });
  test("caps the number and the length of segments", () => {
    const many = Array.from({ length: MAX_SEGMENTS + 50 }, (_, i) => ({ start: i, end: i + 1, text: "w".repeat(900) }));
    const t = readGeminiTranscript(many);
    expect(t?.segments.length).toBe(MAX_SEGMENTS);
    expect(t?.segments[0].text.length).toBe(500);
  });
});

describe("toSeconds", () => {
  test("numbers, numeric strings and clock times", () => {
    expect(toSeconds(3.2)).toBe(3.2);
    expect(toSeconds("12.5")).toBe(12.5);
    expect(toSeconds("12.5s")).toBe(12.5);
    expect(toSeconds("1:05")).toBe(65);
    expect(toSeconds("1:00:05")).toBe(3605);
    expect(Number.isNaN(toSeconds("soon"))).toBe(true);
    expect(Number.isNaN(toSeconds(null))).toBe(true);
  });
});

describe("transcriptAttention: the teacher is always told who wrote it", () => {
  test("OpenAI's transcript needs no note", () => {
    expect(transcriptAttention("openai")).toBe("");
  });
  test("Gemini's is named as Gemini's, with the reason, and asks for a check", () => {
    const s = transcriptAttention("gemini", { geminiModel: "gemini-x", tooBig: true });
    expect(s).toContain("gemini-x");
    expect(s).toContain("not by OpenAI");
    expect(s).toContain("25 MB");
    expect(s).toContain("Check");
  });
  test("none at all, too big, says why and what the scores rest on", () => {
    const s = transcriptAttention(null, { tooBig: true, geminiError: "no video model is configured" });
    expect(s).toContain("No transcript");
    expect(s).toContain("no video model is configured");
  });
  test("the prompt asks for verbatim speech, mistakes kept, with times", () => {
    expect(GEMINI_TRANSCRIPT_PROMPT).toContain("WORD FOR WORD");
    expect(GEMINI_TRANSCRIPT_PROMPT).toContain("Do NOT correct");
    expect(GEMINI_TRANSCRIPT_PROMPT).toContain('"start"');
  });
});
