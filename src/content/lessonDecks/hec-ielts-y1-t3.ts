// Sun Class · HEC IELTS Speaking & Listening · Year 1, Term 3 "Choices and changes"
// (programme lessons 26-37; the pacing guide is ./hec-ielts/programme.ts).
// Part 3: comparing, explaining causes and speculating; Listening Part 3
// (discussions, opinions, distractors); 2v2 mini-debates with a chair and judges.
// A mini-mock in Lesson 7 (32) and the term's full mock in Lesson 12 (37).
// Check with: node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t3.ts
import type { Unit } from "@/lib/lessonDecks/types";
import { l01 } from "./hec-ielts-y1-t3/l01";
import { l02 } from "./hec-ielts-y1-t3/l02";
import { l03 } from "./hec-ielts-y1-t3/l03";
import { l04 } from "./hec-ielts-y1-t3/l04";
import { l05 } from "./hec-ielts-y1-t3/l05";
import { l06 } from "./hec-ielts-y1-t3/l06";
import { l07 } from "./hec-ielts-y1-t3/l07";
import { l08 } from "./hec-ielts-y1-t3/l08";
import { l09 } from "./hec-ielts-y1-t3/l09";
import { l10 } from "./hec-ielts-y1-t3/l10";
import { l11 } from "./hec-ielts-y1-t3/l11";
import { l12 } from "./hec-ielts-y1-t3/l12";
import { miniMock } from "./hec-ielts-y1-t3/mock-mini";
import { fullMock } from "./hec-ielts-y1-t3/mock-full";

export const hecIeltsY1T3: Unit = {
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 3,
  title: "Choices and changes",
  bigQuestion: "How do we decide what is better when good people disagree?",
  generalizations: [
    "A strong Part 3 answer explains why, compares with another time or place, and admits what the other side gets right.",
    "In a discussion, the answer is often what a speaker finally agrees to, not the first idea mentioned.",
    "Change has causes and effects; naming them precisely is what turns an opinion into an argument.",
    "A team argues better than two individuals when each speaker builds on, not repeats, the partner's point.",
  ],
  decks: [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12],
  assessments: [miniMock, fullMock],
};
