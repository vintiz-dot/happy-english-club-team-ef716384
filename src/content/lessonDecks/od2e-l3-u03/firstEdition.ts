// Unit 3 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images (printed
// pages 26-35): Big Question 2 "Why do people move to new places?" and Unit 3 (Moving)
// are on the same topic and the same printed pages as the 2e unit, with the same
// audio tracks (1.16-1.22), reading (Letters to a Friend, sequence of events), grammar
// (can and could), listening, asking for help, the prefix un- and but.
// Differences are in where the Big Question tasks and one activity sit:
//  - SB 26 is only the opener picture in 1e; the Big Question tasks A-D are on SB 27.
//  - SB 28 C (words about moving I already know) is on SB 28 in 1e, not SB 29.
//  - SB 35: the Big Question Review is a speech-bubble prompt ("Sati moved because of
//    her father's job. What do you think?") at the foot of the page, with no A and B.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U3FirstEdition: FirstEditionMap = {
  unit: 3,
  note: "1e Unit 3 uses the same pages and activity letters as 2e, except that the Big Question tasks are on SB 27 and SB 28 C is on page 28.",
  pages: {
    "SB 26": same(26, undefined, "1e SB 26 is the opener picture and the unit aims only; the Big Question tasks are on SB 27."),
    "SB 26 A": same(27, "A", "In 1e the Big Question tasks are on SB 27 (watch the video)."),
    "SB 26 B": same(27, "B", "On SB 27 in 1e: look at the picture of Julia with a box; what are they doing, how do they feel."),
    "SB 26 C": same(27, "C", "On SB 27 in 1e: where were you born, what places would you like to visit."),
    "SB 26 D": same(27, "D", "On SB 27 in 1e: fill out the Big Question Chart."),
    "SB 27": same(27),
    "SB 28": same(28),
    "SB 28 A": same(28, "A", "Same ten pictures and words, track 1.16."),
    "SB 28 B": same(28, "B", "Same Indoors / Outdoors / Both diagram."),
    "SB 29": same(29),
    "SB 29 C": same(28, "C", "In 1e this task (words about moving I already know) is at the foot of SB 28."),
    "SB 29 D": same(29, "D", "Same Learn box on sequence of events."),
    "SB 29 E": same(29, "E", "Same words: monsoon, surgeon, curry, classmate."),
    "SB 29 F": same(29, "F"),
    "SB 30": same(30, undefined, "Same two letters from Sati to Nisha (track 1.17); the story runs over SB 30-31."),
    "SB 30 E": same(29, "E", "The scan-and-circle task for the story words is SB 29 E in 1e."),
    "SB 32": same(32),
    "SB 32 A": same(32, "A", "Same timeline task."),
    "SB 32 B": same(32, "B"),
    "SB 32 C": same(32, "C", "Same words and matching pictures."),
    "SB 33": same(33),
    "SB 33 D": same(33, "D", "Same song, I Can Ice Skate (track 1.18)."),
    "SB 33 E": same(33, "E"),
    "SB 33 F": same(33, "F", "Same Learn Grammar box (can and could) and circle task."),
    "SB 33 G": same(33, "G"),
    "SB 34": same(34),
    "SB 34 A": same(34, "A", "Same listening about Mina (track 1.19)."),
    "SB 34 B": same(34, "B", "Track 1.20."),
    "SB 34 C": same(34, "C", "Learn: asking for help (track 1.21)."),
    "SB 35": same(35),
    "SB 35 D": same(35, "D", "The prefix un-, track 1.22."),
    "SB 35 E": same(35, "E", "Learn: but."),
    "SB 35 A": { page: null, activity: undefined, note: "1e has no Big Question Review A; only a speech-bubble prompt at the foot of SB 35 (Sati moved because of her father's job. What do you think?)." },
    "SB 35 B": { page: null, activity: undefined, note: "1e has no Big Question Review B; see the prompt at the foot of SB 35." },
  },
};
