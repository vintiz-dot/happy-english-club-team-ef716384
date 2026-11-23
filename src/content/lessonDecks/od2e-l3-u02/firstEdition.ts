// Unit 2 in the 1st-edition Level 3 Student Book, for a class whose flipbook is the
// 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images (printed
// pages 16-25): 1e Unit 2 "Get Ready / Read / Understand / Grammar in Use /
// Communicate / Wrap Up" is on the same topic (Big Question 1, How do people have
// fun?) and on the same printed pages, with the same words (kick, tag, skip, bounce,
// drop, plain, lake, canyon, cliff, stream), story ("The Red Rubber Ball", track
// 1.10), main idea strategy, gerunds song (1.11), listening (1.12, 1.13), giving
// encouragement (1.14) and verb phrases with get (1.15). One difference of layout:
//  - SB 24 C: the play project (Acting in a Play) is on 1e page 25, not page 24;
//    the 1e page 24 holds only A, B and the How to Write a Play box.
//  - SB 23 C (Speaking: Giving Encouragement, track 1.14) is on 1e page 22, under
//    Listening; 1e page 23 starts at D (Word Study).
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U2FirstEdition: FirstEditionMap = {
  unit: 2,
  note: "1e Unit 2 uses the same pages and activity letters; only the speaking activity (SB 23 C is on 1e page 22) and the project (SB 24 C is on 1e page 25) move.",
  pages: {
    "SB 16": same(16),
    "SB 16 A": same(16, "A"),
    "SB 16 B": same(16, "B"),
    "SB 16 C": same(16, "C"),
    "SB 17": same(17, undefined, "Think questions and the Main Idea box are on 1e page 17 too."),
    "SB 17 D": same(17, "D"),
    "SB 17 E": same(17, "E"),
    "SB 17 F": same(17, "F"),
    "SB 18": same(18, undefined, "Story 'The Red Rubber Ball' on 1e pages 18-19 (track 1.10)."),
    "SB 20": same(20),
    "SB 20 A": same(20, "A"),
    "SB 20 B": same(20, "B"),
    "SB 20 C": same(20, "C"),
    "SB 21": same(21),
    "SB 21 D": same(21, "D"),
    "SB 21 E": same(21, "E"),
    "SB 21 F": same(21, "F"),
    "SB 21 G": same(21, "G"),
    "SB 22": same(22),
    "SB 22 A": same(22, "A"),
    "SB 22 B": same(22, "B"),
    "SB 23": same(23),
    "SB 23 C": same(22, "C", "In 1e the Speaking task (Giving Encouragement, track 1.14) is on page 22, under Listening."),
    "SB 23 D": same(23, "D"),
    "SB 23 E": same(23, "E"),
    "SB 24": same(24),
    "SB 24 A": same(24, "A"),
    "SB 24 B": same(24, "B"),
    "SB 24 C": same(25, "C", "In 1e the play project (Acting in a Play) is on page 25, above the Big Question box."),
    "SB 25": same(25, undefined, "Big Question 1 review (A watch the video, B think, C Big Question Chart) is on 1e page 25."),
  },
};
