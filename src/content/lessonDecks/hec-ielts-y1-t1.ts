// Sun Class · HEC IELTS Speaking & Listening · Year 1, Term 1 "Talk about my world"
// (programme lessons 1-12; the pacing guide is ./hec-ielts/programme.ts).
// Every lesson is 120 minutes with a fluency warm-up, a language focus, a
// pronunciation micro-focus, IELTS speaking with peer scoring, an original
// listening script, a debate block and reflection, all in Support / Core / Stretch,
// and about 2.5 hours of tiered homework a week.
// Check with: node scripts/lesson-decks/check-ielts.mjs src/content/lessonDecks/hec-ielts-y1-t1.ts
import type { Unit } from "@/lib/lessonDecks/types";
import { l01 } from "./hec-ielts-y1-t1/l01";
import { l02 } from "./hec-ielts-y1-t1/l02";
import { l03 } from "./hec-ielts-y1-t1/l03";
import { l04 } from "./hec-ielts-y1-t1/l04";
import { l05 } from "./hec-ielts-y1-t1/l05";
import { l06 } from "./hec-ielts-y1-t1/l06";
import { l07 } from "./hec-ielts-y1-t1/l07";
import { l08 } from "./hec-ielts-y1-t1/l08";
import { l09 } from "./hec-ielts-y1-t1/l09";
import { l10 } from "./hec-ielts-y1-t1/l10";
import { l11 } from "./hec-ielts-y1-t1/l11";
import { l12 } from "./hec-ielts-y1-t1/l12";
import { diagnostic } from "./hec-ielts-y1-t1/diagnostic";
import { miniMock } from "./hec-ielts-y1-t1/mock-mini";
import { fullMock } from "./hec-ielts-y1-t1/mock-full";

export const hecIeltsY1T1: Unit = {
  curriculum: "hec-ielts-sl",
  level: 1,
  unit: 1,
  title: "Talk about my world",
  bigQuestion: "What makes someone easy and interesting to listen to?",
  generalizations: [
    "Speakers sound fluent when the words are ready: repeating a task and storing chunks frees attention for ideas.",
    "Listeners understand more when they predict what is coming and know how fast speech changes words.",
    "An opinion persuades when it has a reason and an example, and when the speaker has really listened to the other side.",
    "Clear final sounds and word stress matter more for being understood than having a 'native' accent.",
  ],
  decks: [l01, l02, l03, l04, l05, l06, l07, l08, l09, l10, l11, l12],
  assessments: [diagnostic, miniMock, fullMock],
};
