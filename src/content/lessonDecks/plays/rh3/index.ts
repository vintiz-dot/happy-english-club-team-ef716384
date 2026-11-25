// Every class play for Reach Higher 3 (Jupiter): one file per unit, listed here in unit order.
// Checked by scripts/pgtest/lesson-plays.test.mjs.
import type { Play } from "@/lib/lessonDecks/plays";
import { rh3U1Plays } from "./u1";
import { rh3U2Plays } from "./u2";
import { rh3U3Plays } from "./u3";
import { rh3U4Plays } from "./u4";
import { rh3U5Plays } from "./u5";
import { rh3U6Plays } from "./u6";
import { rh3U7Plays } from "./u7";
import { rh3U8Plays } from "./u8";

export const RH3_PLAYS: Play[] = [
  ...rh3U1Plays,
  ...rh3U2Plays,
  ...rh3U3Plays,
  ...rh3U4Plays,
  ...rh3U5Plays,
  ...rh3U6Plays,
  ...rh3U7Plays,
  ...rh3U8Plays,
];
