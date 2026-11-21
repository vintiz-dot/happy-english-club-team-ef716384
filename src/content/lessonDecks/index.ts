// Every unit with lesson decks. Add a unit file next to this one and list it here;
// scripts/pgtest/lesson-decks-lib.test.mjs checks each one.
import type { Unit } from "@/lib/lessonDecks/types";
import { odL3U12 } from "./od2e-l3-u12";

export const UNITS: Unit[] = [odL3U12];

export const unitKey = (u: Pick<Unit, "level" | "unit">) => `L${u.level} U${u.unit}`;
