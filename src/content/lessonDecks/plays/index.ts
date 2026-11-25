// Every class play (src/lib/lessonDecks/plays.ts says what a play is and how it is
// cast). One folder per course and level; each folder lists its own units.
import type { Play } from "@/lib/lessonDecks/plays";
import { OD1_PLAYS } from "./od1";
import { OD3_PLAYS } from "./od3";
import { RH3_PLAYS } from "./rh3";
import { IELTS1_PLAYS } from "./ielts1";
import { LOOK1_PLAYS } from "./look1";

export const PLAYS: Play[] = [...LOOK1_PLAYS, ...OD1_PLAYS, ...OD3_PLAYS, ...RH3_PLAYS, ...IELTS1_PLAYS];
