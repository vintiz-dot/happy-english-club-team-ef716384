// HEC's IELTS Speaking rubric for Sun Class: what each of the four criteria
// SOUNDS LIKE at bands 5, 6, 7 and 8+, in our own words, for students aged 12-15
// to score each other and for teachers to score mocks. It paraphrases the shape of
// the public IELTS Speaking band descriptors (ielts.org); it is not the official
// text and gives an ESTIMATE, never an official band.
//
// Also the arithmetic: the Speaking band is the mean of the four criteria, and the
// Listening band comes from the raw score out of 40 (approximate; the official
// cut-offs move a little between test versions). Imports nothing.

export type Criterion = "Fluency & Coherence" | "Lexical Resource" | "Grammar Range & Accuracy" | "Pronunciation";

export const RUBRIC: { criterion: Criterion; short: string; listenFor: string; bands: { band: "5" | "6" | "7" | "8+"; sounds: string }[] }[] = [
  {
    criterion: "Fluency & Coherence", short: "FC",
    listenFor: "Does the speaker keep going, and can you follow the ideas?",
    bands: [
      { band: "5", sounds: "Keeps going but slowly, with many pauses, repeats and restarts; uses the same few linkers (and, but, so) again and again." },
      { band: "6", sounds: "Talks at length and is easy to follow, but sometimes loses the thread or repeats; linkers are there but not always the right one." },
      { band: "7", sounds: "Long answers without effort; pauses are for thinking about ideas, not words; uses a range of linking words and phrases naturally." },
      { band: "8+", sounds: "Fluent and relaxed; only rare hesitation; ideas are developed fully and logically, with links you hardly notice." },
    ],
  },
  {
    criterion: "Lexical Resource", short: "LR",
    listenFor: "Does the speaker have the words for the topic, and use them naturally?",
    bands: [
      { band: "5", sounds: "Enough words for familiar topics, but struggles on new ones; paraphrase is hard; mistakes in word choice." },
      { band: "6", sounds: "Wide enough to discuss topics at length; some less common words, not always correct; can usually paraphrase." },
      { band: "7", sounds: "Uses less common words and some idiomatic language with style and collocation awareness; small errors; paraphrases well." },
      { band: "8+", sounds: "A wide range used precisely and flexibly; idioms and collocations sound natural; very few slips." },
    ],
  },
  {
    criterion: "Grammar Range & Accuracy", short: "GRA",
    listenFor: "Does the speaker use different sentence types, and are they correct?",
    bands: [
      { band: "5", sounds: "Short simple sentences are mostly correct; longer complex ones are tried but often break down." },
      { band: "6", sounds: "A mix of simple and complex sentences; frequent mistakes in the complex ones, but they rarely stop you understanding." },
      { band: "7", sounds: "A range of complex structures used flexibly; most sentences have no mistakes, though some errors remain." },
      { band: "8+", sounds: "A wide range of structures; most sentences are error-free; only occasional, non-systematic slips." },
    ],
  },
  {
    criterion: "Pronunciation", short: "P",
    listenFor: "Is the speaker easy to understand, with clear sounds, stress and rhythm?",
    bands: [
      { band: "5", sounds: "Mostly understood, but dropped final sounds or wrong word stress make the listener work hard at times." },
      { band: "6", sounds: "Generally clear; uses some stress and intonation well, but some words are hard to catch." },
      { band: "7", sounds: "Easy to understand all the time; good control of stress, rhythm and chunking; accent does not get in the way." },
      { band: "8+", sounds: "Easy to understand throughout; uses stress, intonation and linking to add meaning; an accent is fine." },
    ],
  },
];

/** What a peer writes after listening: one band per criterion and one thing to keep, one to change. */
export const PEER_STEPS = [
  "Listen to the whole answer first. Don't write while they speak; just notice.",
  "For each criterion, pick the band whose description sounds most like what you heard (5, 6, 7 or 8+).",
  "Write ONE thing the speaker did well and ONE thing to change next time, with an example you heard.",
  "Give your scores kindly. The speaker repeats the task and you score again: did it go up?",
];

const BANDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * The Speaking band from four criterion bands: their mean, rounded as IELTS rounds
 * the overall score (to the nearest half band; .25 and .75 go up). Criterion bands
 * are whole numbers 0-9; anything else is refused (null).
 */
export function speakingBand(fc: number, lr: number, gra: number, p: number): number | null {
  const xs = [fc, lr, gra, p];
  if (!xs.every((x) => BANDS.includes(x))) return null;
  const mean = xs.reduce((a, b) => a + b, 0) / 4;
  return Math.floor(mean * 2 + 0.5) / 2;
}

/**
 * Approximate Listening band from a raw score out of 40. These are typical
 * published cut-offs; a real test's conversion can differ by a mark or two, so
 * the deck says "about" when it shows one.
 */
export const LISTENING_BANDS: { min: number; band: number }[] = [
  { min: 39, band: 9 }, { min: 37, band: 8.5 }, { min: 35, band: 8 }, { min: 32, band: 7.5 }, { min: 30, band: 7 },
  { min: 26, band: 6.5 }, { min: 23, band: 6 }, { min: 18, band: 5.5 }, { min: 16, band: 5 }, { min: 13, band: 4.5 },
  { min: 10, band: 4 }, { min: 8, band: 3.5 }, { min: 6, band: 3 }, { min: 4, band: 2.5 }, { min: 0, band: 0 },
];

export function listeningBand(raw: number, outOf = 40): number | null {
  if (!Number.isInteger(raw) || raw < 0 || raw > outOf || outOf <= 0) return null;
  // A shorter practice test is scaled to 40 before it is converted.
  const scaled = Math.round((raw / outOf) * 40);
  return LISTENING_BANDS.find((b) => scaled >= b.min)!.band;
}
