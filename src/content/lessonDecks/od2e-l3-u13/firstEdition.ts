// Unit 13 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 22 Nov 2026 from the 1e scope table (Big Question 7,
// Unit 13 "Simple Machines in Our Daily Lives", SB p. 126) and the 1e lesson notes
// compared with the 2e Teacher's Guide: the 1e unit is on the same topic and sits on
// the same printed pages (126-135) with the same activity letters and the same
// audio tracks (2.30-2.36), reading strategy (classify and categorize), song and
// grammar (too and either, compound subject / verb agreement, hard g words).
// Differences are in the pictures and examples only, and one swap of activities:
//  - SB 126 B: a different big picture (a boy and a printing machine in 1e).
//  - SB 128 A / 129 C: 1e words stairs and hammer where 2e has slide and seesaw.
//  - SB 129 E: words in context are seesaw, nails, wheelchairs, jar lids in 1e.
//  - SB 132 A / C: the chart and the matching pictures have different examples.
//  - SB 134 A and B are the other way round: in 1e A is "match each word with a
//    simple machine" (track 2.33) and B is "write the numbers" (track 2.34).
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U13FirstEdition: FirstEditionMap = {
  unit: 13,
  note: "1e Unit 13 'Simple Machines in Our Daily Lives' uses the same pages and activity letters; only a few pictures and word examples differ, and SB 134 A and B swap places.",
  pages: {
    "SB 126": same(126),
    "SB 126 A": same(126, "A"),
    "SB 126 B": same(126, "B", "1e has a different picture to talk about (a boy and a printing machine)."),
    "SB 126 C": same(126, "C"),
    "SB 126 D": same(126, "D"),
    "SB 128": same(128),
    "SB 128 A": same(128, "A", "1e words include stairs and hammer where 2e has slide and seesaw; same track 2.30."),
    "SB 128 B": same(128, "B"),
    "SB 129": same(129),
    "SB 129 C": same(129, "C"),
    "SB 129 D": same(129, "D"),
    "SB 129 E": same(129, "E", "1e words in context: seesaw, nails, wheelchairs, jar lids."),
    "SB 129 F": same(129, "F"),
    "SB 130": same(130, undefined, "Reading: same article on the same topic in 1e (track 2.31); wording may differ a little."),
    "SB 131": same(131),
    "SB 132": same(132),
    "SB 132 A": same(132, "A", "The inventions in the chart differ a little in 1e (stairs, bottle opener, clock, computer)."),
    "SB 132 B": same(132, "B"),
    "SB 132 C": same(132, "C", "Same task; the context words and the order of the answers differ."),
    "SB 133": same(133),
    "SB 133 D": same(133, "D", "Same song about the seesaw (track 2.32)."),
    "SB 133 E": same(133, "E"),
    "SB 133 F": same(133, "F"),
    "SB 133 G": same(133, "G"),
    "SB 134": same(134),
    "SB 134 A": same(134, "B", "Swapped: in 1e this task (numbering the things in order, track 2.34) is B."),
    "SB 134 B": same(134, "A", "Swapped: in 1e this task (matching each word to a simple machine, track 2.33) is A."),
    "SB 135": same(135),
    "SB 135 C": same(135, "C"),
    "SB 135 D": same(135, "D"),
    "SB 135 E": same(135, "E"),
  },
};
