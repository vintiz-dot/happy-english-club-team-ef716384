// Every unit with lesson decks. Add a unit file next to this one and list it here;
// scripts/pgtest/lesson-decks-lib.test.mjs checks each one.
import type { Unit } from "@/lib/lessonDecks/types";
import { odL1U1 } from "./od2e-l1-u01";
import { odL1U2 } from "./od2e-l1-u02";
import { odL1U3 } from "./od2e-l1-u03";
import { odL1U4 } from "./od2e-l1-u04";
import { odL1U5 } from "./od2e-l1-u05";
import { odL1U6 } from "./od2e-l1-u06";
import { odL3U12 } from "./od2e-l3-u12";

export const UNITS: Unit[] = [odL1U1, odL1U2, odL1U3, odL1U4, odL1U5, odL1U6, odL3U12];

export const unitKey = (u: Pick<Unit, "level" | "unit">) => `L${u.level} U${u.unit}`;
