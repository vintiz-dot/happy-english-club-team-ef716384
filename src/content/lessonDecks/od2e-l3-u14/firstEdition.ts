// Unit 14 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book and the 2e
// Teacher's Guide (scope tables and lesson notes): 1e Unit 14 "Clara's Invention"
// starts on page 136 in both books, with the same reading, the same ten words, the
// same activity letters (Get Ready A-F, Understand A-G, Communicate A-E, Wrap Up
// A, B and the project C) and the same grammar (comparative and superlative
// adverbs, before and after). The one difference is small: the 1e words in context
// are "bump" and "pound" where 2e prints "bumped" and "pounded".
// Audio track numbers (2.37-2.43) are the same in both editions.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U14FirstEdition: FirstEditionMap = {
  unit: 14,
  note: "1e Unit 14 'Clara's Invention' uses the same pages and activity letters.",
  pages: {
    "SB 136": same(136),
    "SB 136 A": same(136, "A"),
    "SB 136 B": same(136, "B"),
    "SB 136 C": same(136, "C"),
    "SB 137": same(137),
    "SB 137 D": same(137, "D"),
    "SB 137 E": same(137, "E", "1e lists the words in context as bump and pound; 2e prints bumped and pounded."),
    "SB 137 F": same(137, "F"),
    "SB 138": same(138, undefined, "Reading: same story in 1e."),
    "SB 139": same(139),
    "SB 140": same(140),
    "SB 140 A": same(140, "A"),
    "SB 140 B": same(140, "B"),
    "SB 140 C": same(140, "C", "1e lists the words in context as bump and pound; 2e prints bumped and pounded."),
    "SB 141": same(141),
    "SB 141 D": same(141, "D"),
    "SB 141 E": same(141, "E"),
    "SB 141 F": same(141, "F"),
    "SB 141 G": same(141, "G"),
    "SB 142": same(142),
    "SB 142 A": same(142, "A"),
    "SB 142 B": same(142, "B"),
    "SB 143": same(143),
    "SB 143 C": same(143, "C"),
    "SB 143 D": same(143, "D"),
    "SB 143 E": same(143, "E"),
    "SB 144": same(144),
    "SB 144 A": same(144, "A"),
    "SB 144 B": same(144, "B"),
    "SB 145": same(145),
    "SB 145 C": same(145, "C"),
  },
};
