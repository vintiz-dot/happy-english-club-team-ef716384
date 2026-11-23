// Unit 8 in the 1st-edition Level 3 Student Book, for a class whose flipbook is
// the 1st edition. Worked out on 23 Nov 2026 by looking at the 1e page images
// (flipbook pages 76-85): 1e Unit 8 "Get Ready / Read / Understand / Communicate /
// Wrap Up" is on the same topic as 2e (Big Question 4, How do we measure time?)
// and sits on the same printed pages (76-85) with the same activity letters, the
// same story (Doctor Molly), reading strategy (problem and solution), grammar
// (future plans with going to), word study (contractions), writing study
// (capitalization) and the same audio tracks (1.51-1.57).
// Differences noticed: the Wrap Up on 1e SB 84 is the report on the solstices
// (A and B), and 1e SB 85 is the project C (a travel ad) together with the Big
// Question 4 box (A video, B think more, C complete the chart), so the letter C
// appears twice on 1e SB 85. (Flipbook file 86.jpg is printed page 85.)
import type { FirstEditionMap } from "@/lib/lessonDecks/types";

const same = (page: number, activity?: string, note?: string) => ({ page, activity, note });

export const odL3U8FirstEdition: FirstEditionMap = {
  unit: 8,
  note: "1e Unit 8 uses the same pages, activity letters and tracks (1.51-1.57) as 2e; the story is Doctor Molly in both. On 1e SB 85 the letter C is the travel-ad project and the Big Question 4 box has its own A, B, C.",
  pages: {
    "SB 76": same(76),
    "SB 76 A": same(76, "A", "Track 1.51; same ten words."),
    "SB 76 B": same(76, "B", "Sort words into a person, a place, a thing."),
    "SB 76 C": same(76, "C"),
    "SB 77": same(77),
    "SB 77 D": same(77, "D", "Problem and solution; the short story is about Chris and Patrick."),
    "SB 77 E": same(77, "E", "Words: washcloth, forehead, sneezing, tissues."),
    "SB 77 F": same(77, "F"),
    "SB 78": same(78, undefined, "Doctor Molly, track 1.52."),
    "SB 79": same(79, undefined, "Doctor Molly continues: the text messages and the phone call."),
    "SB 80": same(80),
    "SB 80 A": same(80, "A"),
    "SB 80 B": same(80, "B"),
    "SB 80 C": same(80, "C"),
    "SB 81": same(81),
    "SB 81 C": same(80, "C", "Moved: in 1e the Words in Context match (washcloth, forehead, sneezing, tissue) is on SB 80 C, with the same four words; SB 81 starts at D."),
    "SB 81 D": same(81, "D", "Track 1.53."),
    "SB 81 E": same(81, "E"),
    "SB 81 F": same(81, "F"),
    "SB 81 G": same(81, "G"),
    "SB 82": same(82),
    "SB 82 A": same(82, "A", "Track 1.54."),
    "SB 82 B": same(82, "B", "Track 1.55."),
    "SB 82 C": same(82, "C", "Asking for and giving directions; track 1.56."),
    "SB 83": same(83),
    "SB 83 C": same(83, "C"),
    "SB 83 D": same(83, "D", "Contractions; track 1.57."),
    "SB 83 E": same(83, "E", "Capitalization."),
    "SB 84": same(84),
    "SB 84 A": same(84, "A"),
    "SB 84 B": same(84, "B"),
    "SB 85": same(85),
    "SB 85 A": same(85, "A", "1e Big Question 4 box: watch the video."),
    "SB 85 B": same(85, "B", "1e Big Question 4 box: think more about the Big Question."),
    "SB 85 C": same(85, "C", "1e: C is the travel-ad project; the Big Question chart is also lettered C in the box below it."),
  },
};
