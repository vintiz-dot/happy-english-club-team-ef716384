// Unit 9 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images (SB 87-95): the
// unit is on the same topic (Big Question 5 "Where does energy come from?", Energy for
// Today: Wind Power, may and might, asking with will, antonyms, verbs with count and
// noncount nouns) with the same audio tracks (2.02-2.08). The pages are the same except:
//  - The Big Question page is SB 87 in 1e (2e: SB 86), with the same activities A-D.
//  - 2e SB 89 C (write a sentence with a word) is on SB 88 in 1e, under the vocabulary
//    task; 1e page 89 starts with the Think questions and D (Learn: Paraphrasing).
//  - 2e SB 95 C (asking using will, track 2.07) is on SB 94 in 1e (the Speaking part of
//    Communicate); 1e page 95 starts with D (antonyms) and has E (verbs with count and
//    noncount nouns).
//  - 1e SB 88 B is a word web (write the words under "You can't see it", "People built it",
//    "It's in the ground", "It's bad for us"); the picture word set is the same ten words.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U9FirstEdition: FirstEditionMap = {
  unit: 9,
  note: "1e Unit 9 'Get Ready' to 'Communicate' covers the same energy topic on pages 88-95; the Big Question page is SB 87 (not 86), 2e SB 89 C is on SB 88, and 2e SB 95 C is on SB 94.",
  pages: {
    "SB 86": same(87, undefined, "Moved: in 1e the Big Question 5 page 'Where does energy come from?' is SB 87."),
    "SB 86 A": same(87, "A", "Moved: Watch the video, on SB 87 in 1e."),
    "SB 86 B": same(87, "B", "Moved: look at the picture (wind turbines and a road with trucks); the questions are about sources of energy and things that use energy."),
    "SB 86 C": same(87, "C", "Moved: think and answer, on SB 87 in 1e."),
    "SB 86 D": same(87, "D", "Moved: fill out the Big Question Chart, on SB 87 in 1e."),
    "SB 88": same(88),
    "SB 88 A": same(88, "A", "Same ten words (windmill, sailboat, wind turbine, wind farm, coal, oil, natural gas, pollution, power plant, electricity); track 2.02."),
    "SB 88 B": same(88, "B", "1e: write the words in a word web (You can't see it / People built it / It's in the ground / It's bad for us); natural gas is used twice."),
    "SB 89": same(89),
    "SB 89 C": same(88, "C", "Moved: in 1e 'choose a word and write a sentence in your notebook' is C on SB 88."),
    "SB 89 D": same(89, "D", "Learn: Paraphrasing; 1e page 89 starts with the Think questions, then D."),
    "SB 89 E": same(89, "E", "Words in context: source, fossil fuels, nonrenewable, renewable."),
    "SB 89 F": same(89, "F"),
    "SB 90": same(90, undefined, "Reading 'Energy for Today: Wind Power' (track 2.03) on pages 90-91; same text."),
    "SB 92": same(92, undefined, "1e Understand page; the Think question is the same kind of opinion question about wind power."),
    "SB 92 A": same(92, "A", "Check the wind / fossil fuels table."),
    "SB 92 B": same(92, "B"),
    "SB 92 C": same(92, "C"),
    "SB 93": same(93),
    "SB 93 D": same(93, "D", "Song 'Wind Power' (track 2.04)."),
    "SB 93 E": same(93, "E"),
    "SB 93 F": same(93, "F", "Learn Grammar: may and might."),
    "SB 93 G": same(93, "G"),
    "SB 94": same(94),
    "SB 94 A": same(94, "A", "Listen and number the pictures (track 2.05)."),
    "SB 94 B": same(94, "B", "Listen again and fill in the missing word (track 2.06)."),
    "SB 95": same(95),
    "SB 95 C": same(94, "C", "Moved: in 1e 'Asking Using Will' (track 2.07) is C on SB 94, in the Speaking part."),
    "SB 95 D": same(95, "D", "Antonyms (track 2.08)."),
    "SB 95 E": same(95, "E", "Verbs with count and noncount nouns."),
  },
};
