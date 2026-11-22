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
import { odL3U13 } from "./od2e-l3-u13";
import { odL3U14 } from "./od2e-l3-u14";
import { odL3U15 } from "./od2e-l3-u15";
import { odL3U16 } from "./od2e-l3-u16";
import { odL3U17 } from "./od2e-l3-u17";
import { odL3U18 } from "./od2e-l3-u18";

export const UNITS: Unit[] = [
  odL1U1, odL1U2, odL1U3, odL1U4, odL1U5, odL1U6,
  odL3U12, odL3U13, odL3U14, odL3U15, odL3U16, odL3U17, odL3U18,
];

export const unitKey = (u: Pick<Unit, "level" | "unit">) => `L${u.level} U${u.unit}`;
