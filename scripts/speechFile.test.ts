import { describe, expect, test } from "bun:test";
import { geminiVideoMime, speechFileFor } from "../supabase/functions/_lib/speech-file.ts";

describe("speechFileFor", () => {
  test("the case that failed on 14 Nov: an iPhone .mov upload goes as .mp4", () => {
    expect(speechFileFor("video/quicktime", "", "hw/x/video.mov")).toEqual({ name: "audio.mp4", type: "video/mp4" });
  });
  test("the in-app recorder's own formats keep their names", () => {
    expect(speechFileFor("audio/webm", "", "a/audio.webm")?.name).toBe("audio.webm");
    expect(speechFileFor("video/webm", "", "a/video.webm")?.name).toBe("audio.webm");
    expect(speechFileFor("video/mp4", "", "a/video.mp4")?.name).toBe("audio.mp4");
    expect(speechFileFor("audio/mp4", "", "a/audio.mp4")?.name).toBe("audio.m4a");
    expect(speechFileFor("audio/ogg;codecs=opus", "", "a/audio.ogg")?.name).toBe("audio.ogg");
  });
  test("Android phone uploads", () => {
    expect(speechFileFor("video/3gpp", "", "a/video.3gp")?.name).toBe("audio.mp4");
    expect(speechFileFor("video/x-m4v", "", "a/video.m4v")?.name).toBe("audio.mp4");
  });
  test("falls back to the blob's type, then the path's extension", () => {
    expect(speechFileFor(null, "video/quicktime", "a/x")?.name).toBe("audio.mp4");
    expect(speechFileFor(null, "", "a/video.MOV")?.name).toBe("audio.mp4");
    expect(speechFileFor("application/octet-stream", "", "a/video.mov")?.name).toBe("audio.mp4");
  });
  test("every name it gives is one OpenAI lists", () => {
    const ok = ["flac", "m4a", "mp3", "mp4", "mpeg", "mpga", "oga", "ogg", "wav", "webm"];
    for (const m of ["video/quicktime", "audio/webm", "audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "video/3gpp"]) {
      const f = speechFileFor(m, "", "x");
      expect(f).not.toBeNull();
      expect(ok).toContain(f!.name.split(".").pop()!);
    }
  });
  test("a format it cannot name is refused, not sent as webm", () => {
    expect(speechFileFor("video/x-msvideo", "", "a/video.avi")).toBeNull();
    expect(speechFileFor(null, null, "a/noext")).toBeNull();
  });
});

describe("geminiVideoMime", () => {
  test("quicktime is called video/mov; parameters dropped; default kept", () => {
    expect(geminiVideoMime("video/quicktime")).toBe("video/mov");
    expect(geminiVideoMime("video/webm;codecs=vp9")).toBe("video/webm");
    expect(geminiVideoMime("video/mp4")).toBe("video/mp4");
    expect(geminiVideoMime(null)).toBe("video/webm");
  });
});
