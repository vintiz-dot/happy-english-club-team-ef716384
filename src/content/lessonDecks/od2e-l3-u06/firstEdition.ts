// Unit 6 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Checked on 23 Nov 2026 against the 1e page images (pp. 56-65): the unit is
// "Seeing Like a Poet" (Big Question 3, "Why do people write poems?") on the same
// printed pages (56-65), with the same activity letters, the same audio tracks
// (1.37-1.43), the same poems (acrostic, cinquain, haiku), grammar (past continuous
// and simple past) and project (illustrating and reciting a poem). No differences found.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U6FirstEdition: FirstEditionMap = {
  unit: 6,
  note: "1e Unit 6 'Seeing Like a Poet' sits on the same pages (56-65) with the same activity letters and tracks as 2e.",
  pages: {
    "SB 56": same(56),
    "SB 56 A": same(56, "A"),
    "SB 56 B": same(56, "B"),
    "SB 56 C": same(56, "C"),
    "SB 57": same(57),
    "SB 57 D": same(57, "D"),
    "SB 57 E": same(57, "E"),
    "SB 57 F": same(57, "F"),
    "SB 58": same(58),
    "SB 59": same(59),
    "SB 60": same(60),
    "SB 60 A": same(60, "A"),
    "SB 60 B": same(60, "B"),
    "SB 60 C": same(60, "C"),
    "SB 61": same(61),
    "SB 61 D": same(61, "D"),
    "SB 61 E": same(61, "E"),
    "SB 61 F": same(61, "F"),
    "SB 61 G": same(61, "G"),
    "SB 62": same(62),
    "SB 62 A": same(62, "A"),
    "SB 62 B": same(62, "B"),
    "SB 62 C": same(62, "C"),
    "SB 63": same(63),
    "SB 63 C": same(63, "C"),
    "SB 63 D": same(63, "D"),
    "SB 63 E": same(63, "E"),
    "SB 64": same(64),
    "SB 64 A": same(64, "A"),
    "SB 64 B": same(64, "B"),
    "SB 65": same(65),
    "SB 65 C": same(65, "C"),
  },
};
