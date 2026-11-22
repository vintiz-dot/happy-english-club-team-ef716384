// Sun Class · HEC IELTS Speaking & Listening · Year 1, Term 2 "People, places, stories"
// (programme lessons 13-25; the pacing guide is ./hec-ielts/programme.ts).
// Part 2 long turns with past tenses and detail, Listening Part 2 (plans, matching,
// multiple choice), PREP and rebuttal in debate; a mini-mock in Lesson 7 (19) and
// the term's full mock in Lesson 13 (25).
// Check with: node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t2.ts
import type { Unit } from "@/lib/lessonDecks/types";
import { l01 } from "./hec-ielts-y1-t2/l01";
import { l02 } from "./hec-ielts-y1-t2/l02";
import { l03 } from "./hec-ielts-y1-t2/l03";
import { l04 } from "./hec-ielts-y1-t2/l04";
import { l05 } from "./hec-ielts-y1-t2/l05";
import { l06 } from "./hec-ielts-y1-t2/l06";
import { l07 } from "./hec-ielts-y1-t2/l07";
import { l08 } from "./hec-ielts-y1-t2/l08";
import { l09 } from "./hec-ielts-y1-t2/l09";
import { l10 } from "./hec-ielts-y1-t2/l10";
import { l11 } from "./hec-ielts-y1-t2/l11";
import { l12 } from "./hec-ielts-y1-t2/l12";
import { l13 } from "./hec-ielts-y1-t2/l13";
import { miniMock } from "./hec-ielts-y1-t2/mock-mini";
import { fullMock } from "./hec-ielts-y1-t2/mock-full";

export const hecIeltsY1T2: Unit = {
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 2,
  title: "People, places, stories",
  bigQuestion: "What turns something that happened into a story people want to hear?",
  generalizations: [
    "A story holds a listener when it has a setting, a turning point and a feeling, told in the right past tense.",
    "Listening to one speaker is easier when you follow their route: signposts, places and changes of plan.",
    "An argument gets stronger when it answers the best point on the other side, not the weakest.",
    "Detail is what makes a long turn sound fluent: specific names, numbers and senses, not more general words.",
  ],
  decks: [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12, l13],
  assessments: [miniMock, fullMock],
};
