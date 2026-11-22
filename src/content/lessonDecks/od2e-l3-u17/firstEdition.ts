// Unit 17 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book and the 2e
// Teacher's Guide (scope tables and lesson notes): 1e Unit 17 "My Journey with
// Captain Magellan" (Big Question 9, "Why do we explore?") has the same topic, the
// same printed pages (166-175), the same activity letters, words, journal, grammar
// (prepositions of movement; complex sentences with before and after) and audio
// (tracks 3.02-3.09) as 2e. Checked page by page against both Teacher's notes: no
// differences found, so every entry below is the same page and letter.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U17FirstEdition: FirstEditionMap = {
  unit: 17,
  note: "1e Unit 17 'My Journey with Captain Magellan' uses the same pages and activity letters.",
  pages: {
    "SB 166": same(166),
    "SB 166 A": same(166, "A"),
    "SB 166 B": same(166, "B"),
    "SB 167": same(167),
    "SB 167 C": same(167, "C"),
    "SB 167 D": same(167, "D"),
    "SB 168": same(168),
    "SB 168 A": same(168, "A"),
    "SB 168 B": same(168, "B"),
    "SB 169": same(169),
    "SB 169 C": same(169, "C"),
    "SB 169 D": same(169, "D"),
    "SB 169 E": same(169, "E"),
    "SB 169 F": same(169, "F"),
    "SB 170": same(170),
    "SB 171": same(171),
    "SB 172": same(172),
    "SB 172 A": same(172, "A"),
    "SB 172 B": same(172, "B"),
    "SB 172 C": same(172, "C"),
    "SB 173": same(173),
    "SB 173 D": same(173, "D"),
    "SB 173 E": same(173, "E"),
    "SB 174": same(174),
    "SB 174 A": same(174, "A"),
    "SB 174 B": same(174, "B"),
    "SB 174 C": same(174, "C"),
    "SB 175": same(175),
    "SB 175 D": same(175, "D"),
    "SB 175 E": same(175, "E"),
    "SB 175 F": same(175, "F"),
  },
};
