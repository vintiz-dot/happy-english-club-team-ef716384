// Links from Jupiter's Reach Higher decks to the class audio and the unit videos
// in the school's Google Drive. Nothing is copied into the app: a slide shows
// Drive's own player for the file (see MediaBar in src/components/lessonDecks).
//
// Audio file names are the publisher's: L3AU2_1RS_087 = Level 3A (Units 1-4; 3B is
// Units 5-8), Unit 2, Part 1, reading selection (RS), Student Book page 87.
// LF = the Language Focus song / chant / dialogue, P_TT_full = the phonics
// passage, *_KW = the key words read aloud, AV_<word> = one academic word.
import type { MediaLink } from "@/lib/lessonDecks/types";
import { RH3_AUDIO } from "./audio";

type Part = 1 | 2;
const pad = (n: number) => String(n).padStart(3, "0");
const prefix = (unit: number, part: Part) => `L3${unit <= 4 ? "A" : "B"}U${unit}_${part}`;
const tracksOf = (names: [string, string][]) =>
  names.flatMap(([label, name]) => (RH3_AUDIO[name] ? [{ label, driveId: RH3_AUDIO[name] }] : []));

/** A reading selection's audio, one track per Student Book page that has a recording. */
export function readingAudio(unit: number, part: Part, from: number, to: number, label: string): MediaLink {
  const names: [string, string][] = [];
  for (let p = from; p <= to; p++) {
    names.push([`p. ${p}`, `${prefix(unit, part)}RS_${pad(p)}`]);
    names.push([`p. ${p} (caption)`, `${prefix(unit, part)}RS_C${pad(p)}`]);
  }
  return { kind: "audio", label, tracks: tracksOf(names) };
}

/** The Language Focus song, chant, dialogue or poem that opens a part (its page). */
export function talkAudio(unit: number, part: Part, page: number, label: string): MediaLink {
  const p = `${prefix(unit, part)}LF_${page}_`;
  return { kind: "audio", label, tracks: tracksOf(["Song", "Chant", "Dialogue", "Poem"].map((k) => [k.toLowerCase(), p + k])) };
}

/** The part's phonics passage, read aloud. */
export function phonicsAudio(unit: number, part: Part, label = "Phonics passage"): MediaLink {
  return { kind: "audio", label, tracks: tracksOf([["passage", `${prefix(unit, part)}P_TT_full`]]) };
}

/** The part's key words read aloud (content words, academic words). */
export function keyWordAudio(unit: number, part: Part, label = "Key words"): MediaLink {
  const p = prefix(unit, part);
  return { kind: "audio", label, tracks: tracksOf([["content words", `${p}SV_KW`], ["content words", `${p}SSV_KW`], ["academic words", `${p}AV_KW`]]) };
}

/** Single academic words, read aloud (only those the book recorded). */
export function wordAudio(unit: number, part: Part, words: string[], label = "Say the words"): MediaLink {
  return { kind: "audio", label, tracks: tracksOf(words.map((w) => [w, `${prefix(unit, part)}AV_${w}`])) };
}

// The unit videos. Each plays from the school's R2 store (`r2`, bucket
// course-media, uploaded from the publisher's file `file` by
// scripts/upload-course-media.mjs, which reads this list); the Google Drive copy
// is the backup: 3A's in the shared course folder, 3B's in the owner's 3B video
// folder (22 Nov 2026). The unit order of the files was read from their own
// metadata: 1e = the first unit of the book, 1e_2 the second, and so on.
// `sha256` / `bytes` are the publisher originals' (22 Nov 2026): the upload script
// refuses any copy, from a folder or from the Drive backup, that differs.
const VIDEOS: Record<number, { title: string; driveId?: string; r2?: string; file?: string; sha256?: string; bytes?: number }> = {
  1: { title: "Saving Stranded Whales", driveId: "1SU7Qtc8F7S1hb9cfZHGqw4wgjBXBkNCi", r2: "reach-higher/3a/unit-1-video.mp4", file: "Video Level 3A - Reach Higher 1e.mp4", sha256: "9584b48941b42e69ca6e8b3359f449a80ce05b76d12ee484b124fbac84ee4e6d", bytes: 144824507 },
  2: { title: "The Great Barrier Reef", driveId: "1_H0vBv9AGzl0rlAtG0ZskXXnbtUwmoDg", r2: "reach-higher/3a/unit-2-video.mp4", file: "Video Level 3A - Reach Higher 1e_2.mp4", sha256: "743602648cd2da17190c269a2aceb3c459384190f3bc5349c888ac6fc6e98925", bytes: 151536274 },
  3: { title: "Rainforests Around the World", driveId: "1WBiPXBjY5nhSPzVPsR4BkNJbrAzqnJ8x", r2: "reach-higher/3a/unit-3-video.mp4", file: "Video Level 3A - Reach Higher 1e_3.mp4", sha256: "01d1f01d61f4f03815b48a621e7fb181878ecadf46d40fd29d0aee51ebc0f052", bytes: 161894892 },
  4: { title: "Clean Up the Coasts", driveId: "1UXg8TN7ptcyUpPpVPAtBjM3sfXiPHABR", r2: "reach-higher/3a/unit-4-video.mp4", file: "Video Level 3A - Reach Higher 1e_4.mp4", sha256: "2c0f1e03ca15d5ecf52cc1365945911512a9ac06a50905b378d2447dc8d9f8c2", bytes: 163549724 },
  5: { title: "Matter Is Everywhere!", driveId: "1WoAkAtMUaOwfCdinmnhcYlFZX9LP0iCv", r2: "reach-higher/3b/unit-5-video.mp4", file: "Video Level 3B - Reach Higher 1e.mp4", sha256: "c76444b04cb74a8e8619632daacc3f059e0d906266d13e0edf18afa1a4772604", bytes: 143565966 },
  6: { title: "Traditions of Japan", driveId: "1oNHsjLU7AvUGpLn5Y2ITaTrCAlCnQPra", r2: "reach-higher/3b/unit-6-video.mp4", file: "Video Level 3B - Reach Higher 1e_2.mp4", sha256: "05eb859bff1e390c04bfd82fd47298db45456ba11866555f6da8d21c3b7482fb", bytes: 162320870 },
  7: { title: "Amazing Volcanoes", driveId: "1ciMYPMIKMFbDEqBcL3usq6fDF-OqwTKf", r2: "reach-higher/3b/unit-7-video.mp4", file: "Video Level 3B - Reach Higher 1e_3.mp4", sha256: "44f1c809ecd694b1ba490a81c2ffb3580f6c625979f75a59b7618b851aad2eda", bytes: 187821331 },
  8: { title: "Never Give Up on Your Goals!", driveId: "1_K-5Bsaua3NB86qsfadW56z9hmbvtjsI", r2: "reach-higher/3b/unit-8-video.mp4", file: "Video Level 3B - Reach Higher 1e_4.mp4", sha256: "d0cbb5c304e74817c510e9728a94431f2af2ed1ed87e83ee513c9033ca8f55d9", bytes: 170985114 },
};

/** The unit video, or null while its file is not in the Drive yet. */
export function unitVideo(unit: number): MediaLink | null {
  const v = VIDEOS[unit];
  return v?.driveId
    ? { kind: "video", label: `Unit ${unit} video: ${v.title}`, tracks: [{ label: "watch", driveId: v.driveId, ...(v.r2 ? { r2: v.r2 } : {}) }] }
    : null;
}
