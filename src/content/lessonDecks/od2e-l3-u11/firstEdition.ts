// Unit 11 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e flipbook page images
// (pp. 106-115): the 1e unit is on the same topic (Big Question 6 "How do people make
// music?", Unit 11 "Mystery in the Gym") and sits on the same printed pages with the
// same activity letters and audio tracks (2.16-2.22), reading strategy (making
// inferences), grammar (comparative and superlative adjectives), suffix -ing and
// possessive nouns. No page or activity moves. The Think boxes carry no letter in 1e.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U11FirstEdition: FirstEditionMap = {
  unit: 11,
  note: "1e Unit 11 'Mystery in the Gym' uses the same pages and activity letters as the deck cites; checked page by page against the 1e flipbook.",
  pages: {
    "SB 106": same(106),
    "SB 106 A": same(106, "A"),
    "SB 106 B": same(106, "B"),
    "SB 106 C": same(106, "C"),
    "SB 106 D": same(106, "D"),
    "SB 108": same(108),
    "SB 108 A": same(108, "A"),
    "SB 108 B": same(108, "B"),
    "SB 108 C": same(108, "C"),
    "SB 108 D": same(108, "D"),
    "SB 108 E": same(108, "E"),
    "SB 108 F": same(108, "F"),
    "SB 109": same(109),
    "SB 109 D": same(109, "D"),
    "SB 109 E": same(109, "E"),
    "SB 109 F": same(109, "F"),
    "SB 110": same(110),
    "SB 112": same(112),
    "SB 112 A": same(112, "A"),
    "SB 112 B": same(112, "B"),
    "SB 112 C": same(112, "C"),
    "SB 113": same(113),
    "SB 113 D": same(113, "D"),
    "SB 113 E": same(113, "E"),
    "SB 113 F": same(113, "F"),
    "SB 113 G": same(113, "G"),
    "SB 114": same(114),
    "SB 114 A": same(114, "A"),
    "SB 114 B": same(114, "B"),
    "SB 114 C": same(114, "C"),
    "SB 115": same(115),
    "SB 115 D": same(115, "D"),
    "SB 115 E": same(115, "E"),
  },
};
