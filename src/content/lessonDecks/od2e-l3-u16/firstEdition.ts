// Unit 16 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e Teacher's Book (scope
// table: Unit 16 "The Garden of Happiness", Student Book p. 156, Big Question 8
// "Why do we need plants?") and the 2e Teacher's Guide lesson notes. Checked
// lesson by lesson: the 1e unit has the same topic, the same words, the same
// reading, the same activity letters (Get Ready A-F, Understand A-G, Communicate
// A-E, Wrap Up A-C) and the same pages (156-165). Audio tracks 2.51-2.57 are the
// same in both editions. No page or letter differs.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U16FirstEdition: FirstEditionMap = {
  unit: 16,
  note: "1e Unit 16 'The Garden of Happiness' uses the same pages and activity letters.",
  pages: {
    "SB 156": same(156),
    "SB 156 A": same(156, "A"),
    "SB 156 B": same(156, "B"),
    "SB 156 C": same(156, "C"),
    "SB 157": same(157),
    "SB 157 C": same(157, "C"),
    "SB 157 D": same(157, "D"),
    "SB 157 E": same(157, "E"),
    "SB 157 F": same(157, "F"),
    "SB 158": same(158, undefined, "Reading: same story in 1e."),
    "SB 159": same(159),
    "SB 160": same(160),
    "SB 160 A": same(160, "A"),
    "SB 160 B": same(160, "B"),
    "SB 161": same(161),
    "SB 161 C": same(161, "C"),
    "SB 161 D": same(161, "D"),
    "SB 161 E": same(161, "E"),
    "SB 161 F": same(161, "F"),
    "SB 161 G": same(161, "G"),
    "SB 162": same(162),
    "SB 162 A": same(162, "A"),
    "SB 162 B": same(162, "B"),
    "SB 163": same(163),
    "SB 163 C": same(163, "C"),
    "SB 163 D": same(163, "D"),
    "SB 163 E": same(163, "E"),
    "SB 164": same(164),
    "SB 164 A": same(164, "A"),
    "SB 164 B": same(164, "B"),
    "SB 165": same(165),
    "SB 165 C": same(165, "C"),
  },
};
