// Unit 7 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e pages 66-75: Big Question 4
// "How do we measure time?", Unit 7 "Time and the Earth" is on the same topic with the same
// reading (track 1.45), song "On the Plane to Spain" (1.46), grammar (future facts with will),
// listening tracks 1.47-1.49 and suffix -tion (1.50). Differences are in layout only:
//  - The Big Question spread is one page later: 1e p. 66 is the unit opener (no tasks) and
//    its tasks A-D (video, picture, think, chart) are on p. 67, where 2e has them on p. 66.
//  - SB 68: 1e Words has A, B and C (match each sentence to a word) on p. 68;
//    in 2e "Words in Context" C sits on p. 69, so 2e 69 C is 1e 68 C.
//  - Speaking C (track 1.49) is at the bottom of p. 74 in 1e, not on p. 75.
//  - Word Study D and Writing Study E are on p. 75 in both editions.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U7FirstEdition: FirstEditionMap = {
  unit: 7,
  note: "1e Unit 7 'Time and the Earth' is the same unit on the same topic; the Big Question tasks are on p. 67 (not 66), activity C of Words is on p. 68, and Speaking C is on p. 74.",
  pages: {
    "SB 66": same(67, undefined, "1e p. 66 is the unit opener (a picture of the Earth, no tasks); the Big Question page with the tasks is p. 67."),
    "SB 66 A": same(67, "A"),
    "SB 66 B": same(67, "B"),
    "SB 66 C": same(67, "C"),
    "SB 66 D": same(67, "D"),
    "SB 68": same(68),
    "SB 68 A": same(68, "A"),
    "SB 68 B": same(68, "B"),
    "SB 69": same(69),
    "SB 69 C": same(68, "C", "In 1e this matching task (each sentence to a word) is on p. 68, under B, not on p. 69."),
    "SB 69 D": same(69, "D"),
    "SB 69 E": same(69, "E"),
    "SB 69 F": same(69, "F"),
    "SB 70": same(70, undefined, "Reading: same article, track 1.45."),
    "SB 71": same(71),
    "SB 72": same(72),
    "SB 72 A": same(72, "A"),
    "SB 72 B": same(72, "B"),
    "SB 72 C": same(72, "C"),
    "SB 73": same(73),
    "SB 73 D": same(73, "D", "Same song, On the Plane to Spain (track 1.46)."),
    "SB 73 E": same(73, "E"),
    "SB 73 F": same(73, "F"),
    "SB 73 G": same(73, "G"),
    "SB 74": same(74),
    "SB 74 A": same(74, "A"),
    "SB 74 B": same(74, "B"),
    "SB 75": same(75, undefined, "The Big Question Review box is at the bottom of 1e p. 75."),
    "SB 75 C": same(74, "C", "In 1e Speaking C (track 1.49) is at the bottom of p. 74."),
    "SB 75 D": same(75, "D"),
    "SB 75 E": same(75, "E"),
  },
};
