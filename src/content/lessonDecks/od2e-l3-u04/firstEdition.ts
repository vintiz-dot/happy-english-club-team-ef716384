// Unit 4 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Checked on 23 Nov 2026 against the 1e page images (pp. 36-45): the
// 1e unit is on the same topic (Why do people move to new places?, Big Question 2),
// sits on the same printed pages (36-45) with the same activity letters, audio
// tracks (1.23-1.29) and Wrap Up for Units 3 and 4. Checked page by page: places
// words, Eduardo's details, the magazine article, Understand, Present Real
// Conditional, Listening and Speaking, suffixes for countries, complete sentences,
// the letter and the poster project all match.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U4FirstEdition: FirstEditionMap = {
  unit: 4,
  note: "1e Unit 4 'Why People Move' (Big Question 2) uses the same pages, activity letters and tracks as the unit in this deck; no activity moves.",
  pages: {
    "SB 36": same(36),
    "SB 36 A": same(36, "A", "Same ten places, track 1.23."),
    "SB 36 B": same(36, "B"),
    "SB 36 C": same(36, "C"),
    "SB 37": same(37),
    "SB 37 D": same(37, "D", "Same Learn box (details) and Eduardo text."),
    "SB 37 E": same(37, "E"),
    "SB 37 F": same(37, "F"),
    "SB 38": same(38),
    "SB 39": same(39),
    "SB 40": same(40),
    "SB 40 A": same(40, "A", "Same main idea and details chart."),
    "SB 40 B": same(40, "B"),
    "SB 40 C": same(40, "C"),
    "SB 41": same(41),
    "SB 41 D": same(41, "D", "Same comic, track 1.25."),
    "SB 41 E": same(41, "E"),
    "SB 41 F": same(41, "F", "Same Present Real Conditional box and matching."),
    "SB 41 G": same(41, "G"),
    "SB 42": same(42),
    "SB 42 A": same(42, "A", "Same listening, track 1.26."),
    "SB 42 B": same(42, "B", "Same why and because box; tracks 1.26 and 1.27."),
    "SB 42 C": same(42, "C", "Same speaking task, track 1.28."),
    "SB 43": same(43),
    "SB 43 D": same(43, "D", "Same suffixes for countries, track 1.29."),
    "SB 43 E": same(43, "E"),
    "SB 44": same(44),
    "SB 44 A": same(44, "A", "Same letter from Robert to Patrick."),
    "SB 44 B": same(44, "B"),
    "SB 45": same(45),
    "SB 45 A": same(45, "A"),
    "SB 45 B": same(45, "B"),
    "SB 45 C": same(45, "C", "Same poster project; the Big Question video, think and chart are A to C beside it."),
  },
};
