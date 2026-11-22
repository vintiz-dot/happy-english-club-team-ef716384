// Unit 18 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book (scope
// table and the Unit 18 lesson notes) and the 2e Teacher's Guide: 1e Unit 18
// "Exploring the Ocean" (Why do we explore?) sits on the same printed pages
// (176-185) with the same activity letters, words, biography, song, grammar,
// compound nouns, although and Wrap Up for Units 17 and 18. The one difference
// is the book's own wording of the lesson summaries; the activities match.
// Audio track numbers (3.10-3.16) are the same in both editions.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U18FirstEdition: FirstEditionMap = {
  unit: 18,
  note: "1e Unit 18 'Exploring the Ocean' uses the same pages and activity letters.",
  pages: {
    "SB 176": same(176),
    "SB 176 A": same(176, "A"),
    "SB 176 B": same(176, "B"),
    "SB 176 C": same(176, "C"),
    "SB 177": same(177),
    "SB 177 D": same(177, "D"),
    "SB 177 E": same(177, "E"),
    "SB 177 F": same(177, "F"),
    "SB 177 G": same(177, "G"),
    "SB 178": same(178, undefined, "Reading: same biography in 1e."),
    "SB 179": same(179),
    "SB 180": same(180),
    "SB 180 A": same(180, "A"),
    "SB 180 B": same(180, "B"),
    "SB 180 C": same(180, "C"),
    "SB 181": same(181),
    "SB 181 D": same(181, "D"),
    "SB 181 E": same(181, "E"),
    "SB 181 F": same(181, "F"),
    "SB 181 G": same(181, "G"),
    "SB 182": same(182),
    "SB 182 A": same(182, "A"),
    "SB 182 B": same(182, "B"),
    "SB 182 C": same(182, "C"),
    "SB 183": same(183),
    "SB 183 D": same(183, "D"),
    "SB 183 E": same(183, "E"),
    "SB 183 F": same(183, "F"),
    "SB 184": same(184),
    "SB 184 A": same(184, "A"),
    "SB 184 B": same(184, "B"),
    "SB 185": same(185),
    "SB 185 A": same(185, "A"),
    "SB 185 B": same(185, "B"),
    "SB 185 C": same(185, "C"),
  },
};
