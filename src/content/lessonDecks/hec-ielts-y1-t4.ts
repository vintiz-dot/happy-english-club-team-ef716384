// Sun Class · HEC IELTS Speaking & Listening · Year 1, Term 4 "Science, cities, the planet"
// (programme lessons 38-50; the pacing guide is ./hec-ielts/programme.ts).
// Part 3 at length; Listening Part 4 (lectures: notes, summaries, flow-charts,
// diagrams); 3v3 class debates with roles, weighing and summary speeches. A
// mini-mock in Lesson 6 (43) and the Year 1 full mock in Lesson 13 (50).
// Check with: node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t4.ts
import type { Unit } from "@/lib/lessonDecks/types";
import { l01 } from "./hec-ielts-y1-t4/l01";
import { l02 } from "./hec-ielts-y1-t4/l02";
import { l03 } from "./hec-ielts-y1-t4/l03";
import { l04 } from "./hec-ielts-y1-t4/l04";
import { l05 } from "./hec-ielts-y1-t4/l05";
import { l06 } from "./hec-ielts-y1-t4/l06";
import { l07 } from "./hec-ielts-y1-t4/l07";
import { l08 } from "./hec-ielts-y1-t4/l08";
import { l09 } from "./hec-ielts-y1-t4/l09";
import { l10 } from "./hec-ielts-y1-t4/l10";
import { l11 } from "./hec-ielts-y1-t4/l11";
import { l12 } from "./hec-ielts-y1-t4/l12";
import { l13 } from "./hec-ielts-y1-t4/l13";
import { miniMock } from "./hec-ielts-y1-t4/mock-mini";
import { fullMock } from "./hec-ielts-y1-t4/mock-full";

export const hecIeltsY1T4: Unit = {
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 4,
  title: "Science, cities, the planet",
  bigQuestion: "Who should decide what is best for everyone's future?",
  generalizations: [
    "A lecture is easier to follow when you hold its structure: the speaker's signposts tell you where every detail belongs.",
    "Evidence persuades more than opinion, and careful speakers say how sure they are (hedging) instead of overclaiming.",
    "Big problems have trade-offs: a good argument weighs costs and benefits for different people over different time scales.",
    "A team case is stronger than three speeches when each speaker has a clear role and the summary weighs the clash.",
  ],
  decks: [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, l13],
  assessments: [miniMock, fullMock],
};
