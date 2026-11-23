// Unit 10 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 23 Nov 2026 by looking at the 1e flipbook pages
// 96-105: the 1e unit is on the same topic (Energy Savers on the Move, "Hector the
// Energy Saver!", Big Question 5 "Where does energy come from?") and sits on the
// same printed pages (96-105) with the same audio tracks (2.09-2.15), reading
// strategy (ask questions), grammar (quantifiers a lot of / lots of, a few, a
// little), prefix re- and articles. The one difference is on the Understand and
// Grammar pages:
//  - 2e SB 100 D (listen and read along, track 2.11) is SB 101 D in 1e: 1e page 100
//    ends at C (words in context) and the Grammar in Use page starts with D.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U10FirstEdition: FirstEditionMap = {
  unit: 10,
  note: "1e Unit 10 'Energy Savers on the Move' uses the same pages and activity letters; the only change is that 2e SB 100 D (track 2.11) is on SB 101 in 1e.",
  pages: {
    "SB 96": same(96),
    "SB 96 A": same(96, "A", "Same ten transportation words and track 2.09."),
    "SB 96 B": same(96, "B"),
    "SB 96 C": same(96, "C"),
    "SB 97": same(97),
    "SB 97 D": same(97, "D"),
    "SB 97 E": same(97, "E", "1e words in context: mask, button, pedal, blades."),
    "SB 97 F": same(97, "F"),
    "SB 98": same(98, undefined, "Same story, 'Hector the Energy Saver!' (track 2.10), on pages 98-99."),
    "SB 100": same(100),
    "SB 100 A": same(100, "A"),
    "SB 100 B": same(100, "B"),
    "SB 100 C": same(100, "C"),
    "SB 100 D": same(101, "D", "Moved: in 1e the 'listen and read along' conversation (track 2.11) is D on SB 101."),
    "SB 101": same(101),
    "SB 101 E": same(101, "E"),
    "SB 101 F": same(101, "F"),
    "SB 101 G": same(101, "G"),
    "SB 102": same(102),
    "SB 102 A": same(102, "A", "Track 2.12."),
    "SB 102 B": same(102, "B", "Track 2.13."),
    "SB 102 C": same(102, "C", "Track 2.14."),
    "SB 103": same(103),
    "SB 103 D": same(103, "D", "Track 2.15."),
    "SB 103 E": same(103, "E"),
    "SB 104": same(104),
    "SB 104 A": same(104, "A"),
    "SB 104 B": same(104, "B"),
    "SB 105": same(105),
    "SB 105 A": same(105, "A", "Big Question 5 video."),
    "SB 105 B": same(105, "B"),
    "SB 105 C": same(105, "C", "On this page C is the panel discussion project; the Big Question Chart is also C in the Big Question box."),
  },
};
