// Unit 15 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book (scope
// table and the Unit 15 lesson notes) and the 2e Teacher's Guide: 1e Unit 15
// "The Life of a Sunflower" (Big Question 8, "Why do we need plants?") sits on the
// same printed pages (146-155) with the same activity letters, words, reading,
// song and grammar. The only difference is the heading of SB 155 D: "Words Ending
// in -th" in 1e, "Word Families: Adjectives and Nouns" in 2e; same words and same
// practice. Audio track numbers (2.44-2.50) are the same in both editions.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U15FirstEdition: FirstEditionMap = {
  unit: 15,
  note: "1e Unit 15 'The Life of a Sunflower' uses the same pages and activity letters.",
  pages: {
    "SB 146": same(146),
    "SB 146 A": same(146, "A"),
    "SB 146 B": same(146, "B"),
    "SB 146 C": same(146, "C"),
    "SB 146 D": same(146, "D"),
    "SB 148": same(148),
    "SB 148 A": same(148, "A"),
    "SB 148 B": same(148, "B"),
    "SB 149": same(149),
    "SB 149 C": same(149, "C"),
    "SB 149 D": same(149, "D"),
    "SB 149 E": same(149, "E"),
    "SB 149 F": same(149, "F"),
    "SB 150": same(150, undefined, "Reading: same text in 1e."),
    "SB 151": same(151),
    "SB 152": same(152),
    "SB 152 A": same(152, "A"),
    "SB 152 B": same(152, "B"),
    "SB 152 C": same(152, "C"),
    "SB 153": same(153),
    "SB 153 D": same(153, "D"),
    "SB 153 E": same(153, "E"),
    "SB 153 F": same(153, "F"),
    "SB 153 G": same(153, "G"),
    "SB 154": same(154),
    "SB 154 A": same(154, "A"),
    "SB 154 B": same(154, "B"),
    "SB 155": same(155),
    "SB 155 C": same(155, "C"),
    "SB 155 D": same(155, "D", "1e calls this box 'Words Ending in -th'."),
    "SB 155 E": same(155, "E"),
  },
};
