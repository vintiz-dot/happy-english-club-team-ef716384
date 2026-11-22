// Every unit with lesson decks. Add a unit file next to this one and list it here;
// scripts/pgtest/lesson-decks-lib.test.mjs checks each one.
import type { Unit } from "@/lib/lessonDecks/types";
import { odL1U1 } from "./od2e-l1-u01";
import { odL1U2 } from "./od2e-l1-u02";
import { odL1U3 } from "./od2e-l1-u03";
import { odL1U4 } from "./od2e-l1-u04";
import { odL1U5 } from "./od2e-l1-u05";
import { odL1U6 } from "./od2e-l1-u06";
import { odL1U7 } from "./od2e-l1-u07";
import { odL1U8 } from "./od2e-l1-u08";
import { odL1U9 } from "./od2e-l1-u09";
import { odL1U10 } from "./od2e-l1-u10";
import { odL1U11 } from "./od2e-l1-u11";
import { odL1U12 } from "./od2e-l1-u12";
import { odL1U13 } from "./od2e-l1-u13";
import { odL1U14 } from "./od2e-l1-u14";
import { odL1U15 } from "./od2e-l1-u15";
import { odL1U16 } from "./od2e-l1-u16";
import { odL1U17 } from "./od2e-l1-u17";
import { odL1U18 } from "./od2e-l1-u18";
import { odL2U1 } from "./od2e-l2-u01";
import { odL2U2 } from "./od2e-l2-u02";
import { odL2U3 } from "./od2e-l2-u03";
import { odL2U4 } from "./od2e-l2-u04";
import { odL2U5 } from "./od2e-l2-u05";
import { odL2U6 } from "./od2e-l2-u06";
import { odL2U7 } from "./od2e-l2-u07";
import { odL2U8 } from "./od2e-l2-u08";
import { odL2U9 } from "./od2e-l2-u09";
import { odL2U10 } from "./od2e-l2-u10";
import { odL2U11 } from "./od2e-l2-u11";
import { odL2U12 } from "./od2e-l2-u12";
import { odL2U13 } from "./od2e-l2-u13";
import { odL2U14 } from "./od2e-l2-u14";
import { odL2U15 } from "./od2e-l2-u15";
import { odL2U16 } from "./od2e-l2-u16";
import { odL2U17 } from "./od2e-l2-u17";
import { odL2U18 } from "./od2e-l2-u18";
import { odL3U12 } from "./od2e-l3-u12";
import { odL3U13 } from "./od2e-l3-u13";
import { odL3U14 } from "./od2e-l3-u14";
import { odL3U15 } from "./od2e-l3-u15";
import { odL3U16 } from "./od2e-l3-u16";
import { odL3U17 } from "./od2e-l3-u17";
import { odL3U18 } from "./od2e-l3-u18";

export const UNITS: Unit[] = [
  odL1U1,
  odL1U2,
  odL1U3,
  odL1U4,
  odL1U5,
  odL1U6,
  odL1U7,
  odL1U8,
  odL1U9,
  odL1U10,
  odL1U11,
  odL1U12,
  odL1U13,
  odL1U14,
  odL1U15,
  odL1U16,
  odL1U17,
  odL1U18,
  odL2U1,
  odL2U2,
  odL2U3,
  odL2U4,
  odL2U5,
  odL2U6,
  odL2U7,
  odL2U8,
  odL2U9,
  odL2U10,
  odL2U11,
  odL2U12,
  odL2U13,
  odL2U14,
  odL2U15,
  odL2U16,
  odL2U17,
  odL2U18,
  odL3U12,
  odL3U13,
  odL3U14,
  odL3U15,
  odL3U16,
  odL3U17,
  odL3U18,
];

export const unitKey = (u: Pick<Unit, "level" | "unit">) => `L${u.level} U${u.unit}`;
