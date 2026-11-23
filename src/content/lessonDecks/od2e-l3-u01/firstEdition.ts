// Unit 1 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images (printed
// pages 6-15): the 1e unit is on the same topic (Big Question 1, "How do people have
// fun?", Unit 1 Get Ready) and has the same content, with the same activity letters
// and audio tracks (1.02-1.08). Differences are only where things sit:
//  - The Big Question activities A-D are on p. 7 in 1e; p. 6 is the opening photo
//    (kayaking) with the "In units 1 and 2 you will" banner.
//  - The Speaking task "same and different" (track 1.07) is SB 14 C in 1e; it is on
//    the next page (SB 15 C) in 2e. 1e p. 15 starts at Word Study D.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U1FirstEdition: FirstEditionMap = {
  unit: 1,
  note: "1e Unit 1 is the same unit (Big Question 1, 'How do people have fun?'); pages and activity letters match except that the Big Question activities are on p. 7 and the speaking task (track 1.07) is on p. 14 as C.",
  pages: {
    "SB 6": same(6, undefined, "1e p. 6 is the opening photo; the Big Question activities A-D are on p. 7."),
    "SB 6 A": same(7, "A", "Watch the video; on p. 7 in 1e."),
    "SB 6 B": same(7, "B", "On p. 7 in 1e: the boys in the kayak."),
    "SB 6 C": same(7, "C", "On p. 7 in 1e."),
    "SB 6 D": same(7, "D", "On p. 7 in 1e: the Big Question Chart."),
    "SB 8": same(8),
    "SB 8 A": same(8, "A"),
    "SB 8 B": same(8, "B"),
    "SB 8 C": same(8, "C"),
    "SB 9": same(9),
    "SB 9 D": same(9, "D"),
    "SB 9 E": same(9, "E"),
    "SB 9 F": same(9, "F"),
    "SB 10": same(10, undefined, "Photo essay 'Having Fun' (track 1.03); continues on p. 11."),
    "SB 12": same(12),
    "SB 12 A": same(12, "A"),
    "SB 12 B": same(12, "B"),
    "SB 12 C": same(12, "C"),
    "SB 13": same(13),
    "SB 13 D": same(13, "D"),
    "SB 13 E": same(13, "E"),
    "SB 13 F": same(13, "F"),
    "SB 13 G": same(13, "G"),
    "SB 14": same(14),
    "SB 14 A": same(14, "A"),
    "SB 14 B": same(14, "B"),
    "SB 15": same(15, undefined, "1e p. 15 holds Word Study D and Writing Study E; the speaking task is on p. 14."),
    "SB 15 C": same(14, "C", "Speaking (same and different, track 1.07) is on p. 14 in 1e, not on p. 15."),
    "SB 15 D": same(15, "D"),
    "SB 15 E": same(15, "E"),
  },
};
