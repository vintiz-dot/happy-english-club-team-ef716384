// Unit 12 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book and the 2e
// Teacher's Guide (scope tables and lesson notes): 1e Unit 12 "The World of
// Instruments" sits on the same printed pages (116-125) with the same activity
// letters, words, reading, song and grammar. The one difference is the heading of
// SB 123 E: "Possessive Pronouns" in 1e, "its and it's" in 2e; same practice.
// Audio track numbers (2.23-2.29) are the same in both editions.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U12FirstEdition: FirstEditionMap = {
  unit: 12,
  note: "1e Unit 12 'The World of Instruments' uses the same pages and activity letters.",
  pages: {
    "SB 116": same(116),
    "SB 116 A": same(116, "A"),
    "SB 116 B": same(116, "B"),
    "SB 116 C": same(116, "C"),
    "SB 117": same(117),
    "SB 117 D": same(117, "D"),
    "SB 117 E": same(117, "E"),
    "SB 117 F": same(117, "F"),
    "SB 118": same(118, undefined, "Reading: same text in 1e."),
    "SB 119": same(119),
    "SB 120": same(120),
    "SB 120 A": same(120, "A"),
    "SB 120 B": same(120, "B"),
    "SB 120 C": same(120, "C"),
    "SB 121": same(121),
    "SB 121 D": same(121, "D"),
    "SB 121 E": same(121, "E"),
    "SB 121 F": same(121, "F"),
    "SB 121 G": same(121, "G"),
    "SB 122": same(122),
    "SB 122 A": same(122, "A"),
    "SB 122 B": same(122, "B"),
    "SB 122 C": same(122, "C"),
    "SB 123": same(123),
    "SB 123 D": same(123, "D"),
    "SB 123 E": same(123, "E", "1e calls this box 'Possessive Pronouns'."),
    "SB 124": same(124),
    "SB 124 A": same(124, "A"),
    "SB 124 B": same(124, "B"),
    "SB 125": same(125),
    "SB 125 C": same(125, "C"),
  },
};
