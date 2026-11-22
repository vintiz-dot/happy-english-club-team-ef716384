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

// The unit videos, one file per unit in the school's Drive. 3B's are added when
// the unpacked 3B video files are in the Drive (only the .rar is there now).
const VIDEOS: Record<number, { title: string; driveId?: string }> = {
  1: { title: "Saving Stranded Whales", driveId: "1SU7Qtc8F7S1hb9cfZHGqw4wgjBXBkNCi" },
  2: { title: "The Great Barrier Reef", driveId: "1_H0vBv9AGzl0rlAtG0ZskXXnbtUwmoDg" },
  3: { title: "Rainforests Around the World", driveId: "1WBiPXBjY5nhSPzVPsR4BkNJbrAzqnJ8x" },
  4: { title: "Clean Up the Coasts", driveId: "1UXg8TN7ptcyUpPpVPAtBjM3sfXiPHABR" },
  5: { title: "Matter Is Everywhere!" },
  6: { title: "Traditions of Japan" },
  7: { title: "Amazing Volcanoes" },
  8: { title: "Never Give Up on Your Goals!" },
};

/** The unit video, or null while its file is not in the Drive yet. */
export function unitVideo(unit: number): MediaLink | null {
  const v = VIDEOS[unit];
  return v?.driveId ? { kind: "video", label: `Unit ${unit} video: ${v.title}`, tracks: [{ label: "watch", driveId: v.driveId }] } : null;
}
