// Every class play for HEC IELTS Speaking & Listening Year 1 (Sun Class): one file per unit, listed here in unit order.
// Checked by scripts/pgtest/lesson-plays.test.mjs.
import type { Play } from "@/lib/lessonDecks/plays";
import { ielts1T1Plays } from "./t1";
import { ielts1T2Plays } from "./t2";
import { ielts1T3Plays } from "./t3";
import { ielts1T4Plays } from "./t4";

export const IELTS1_PLAYS: Play[] = [
  ...ielts1T1Plays,
  ...ielts1T2Plays,
  ...ielts1T3Plays,
  ...ielts1T4Plays,
];
