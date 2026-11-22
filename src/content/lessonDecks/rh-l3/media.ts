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
const VIDEOS: Record<number, { title: string; driveId?: string; r2?: string; file?: string }> = {
  1: { title: "Saving Stranded Whales", driveId: "1SU7Qtc8F7S1hb9cfZHGqw4wgjBXBkNCi", r2: "reach-higher/3a/unit-1-video.mp4", file: "Video Level 3A - Reach Higher 1e.mp4" },
  2: { title: "The Great Barrier Reef", driveId: "1_H0vBv9AGzl0rlAtG0ZskXXnbtUwmoDg", r2: "reach-higher/3a/unit-2-video.mp4", file: "Video Level 3A - Reach Higher 1e_2.mp4" },
  3: { title: "Rainforests Around the World", driveId: "1WBiPXBjY5nhSPzVPsR4BkNJbrAzqnJ8x", r2: "reach-higher/3a/unit-3-video.mp4", file: "Video Level 3A - Reach Higher 1e_3.mp4" },
  4: { title: "Clean Up the Coasts", driveId: "1UXg8TN7ptcyUpPpVPAtBjM3sfXiPHABR", r2: "reach-higher/3a/unit-4-video.mp4", file: "Video Level 3A - Reach Higher 1e_4.mp4" },
  5: { title: "Matter Is Everywhere!", driveId: "1WoAkAtMUaOwfCdinmnhcYlFZX9LP0iCv", r2: "reach-higher/3b/unit-5-video.mp4", file: "Video Level 3B - Reach Higher 1e.mp4" },
  6: { title: "Traditions of Japan", driveId: "1oNHsjLU7AvUGpLn5Y2ITaTrCAlCnQPra", r2: "reach-higher/3b/unit-6-video.mp4", file: "Video Level 3B - Reach Higher 1e_2.mp4" },
  7: { title: "Amazing Volcanoes", driveId: "1ciMYPMIKMFbDEqBcL3usq6fDF-OqwTKf", r2: "reach-higher/3b/unit-7-video.mp4", file: "Video Level 3B - Reach Higher 1e_3.mp4" },
  8: { title: "Never Give Up on Your Goals!", driveId: "1_K-5Bsaua3NB86qsfadW56z9hmbvtjsI", r2: "reach-higher/3b/unit-8-video.mp4", file: "Video Level 3B - Reach Higher 1e_4.mp4" },
};

/** The unit video, or null while its file is not in the Drive yet. */
export function unitVideo(unit: number): MediaLink | null {
  const v = VIDEOS[unit];
  return v?.driveId
    ? { kind: "video", label: `Unit ${unit} video: ${v.title}`, tracks: [{ label: "watch", driveId: v.driveId, ...(v.r2 ? { r2: v.r2 } : {}) }] }
    : null;
}
