// Unit 5 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images
// (printed pp. 46-55): 1e Unit 5 "Poems and Insects" (Big Question 3, Why do
// people write poems?) is on the same topic and on the same pages (48-55) with the
// same activity letters and audio tracks (1.30-1.36). The one difference is the
// Big Question page: in 1e p. 46 is the opener photo only and the Big Question
// activities A-D are printed on p. 47.
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U5FirstEdition: FirstEditionMap = {
  unit: 5,
  note: "1e Unit 5 'Poems and Insects' uses the same pages and activity letters as 2e (SB 48-55); only the Big Question activities move, from SB 46 to SB 47.",
  pages: {
    "SB 46": same(47, undefined, "In 1e the Big Question page is printed p. 47; p. 46 is only the opener photo."),
    "SB 46 A": same(47, "A", "Watch the video."),
    "SB 46 B": same(47, "B"),
    "SB 46 C": same(47, "C"),
    "SB 46 D": same(47, "D"),
    "SB 48": same(48),
    "SB 48 A": same(48, "A", "Track 1.30."),
    "SB 48 B": same(48, "B"),
    "SB 48 C": same(48, "C"),
    "SB 49": same(49),
    "SB 49 D": same(49, "D", "Poem 'My Soccer Ball'."),
    "SB 49 E": same(49, "E"),
    "SB 49 F": same(49, "F"),
    "SB 50": same(50, undefined, "Reading 'Three Poets' (track 1.31) starts on this page."),
    "SB 51": same(51),
    "SB 52": same(52),
    "SB 52 A": same(52, "A"),
    "SB 52 B": same(52, "B"),
    "SB 52 C": same(52, "C"),
    "SB 53": same(53),
    "SB 53 D": same(53, "D", "Track 1.32."),
    "SB 53 E": same(53, "E"),
    "SB 53 F": same(53, "F"),
    "SB 53 G": same(53, "G"),
    "SB 54": same(54),
    "SB 54 A": same(54, "A", "Track 1.33."),
    "SB 54 B": same(54, "B", "Track 1.34."),
    "SB 54 C": same(54, "C"),
    "SB 54 D": same(54, "D", "Track 1.35."),
    "SB 55": same(55, undefined, "The Big Question Review is at the foot of this page in 1e too."),
    "SB 55 E": same(55, "E", "Track 1.36."),
    "SB 55 F": same(55, "F"),
  },
};
