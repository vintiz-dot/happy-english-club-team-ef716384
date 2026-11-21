// Every unit with lesson decks. Add a unit file next to this one and list it here;
// scripts/pgtest/lesson-decks-lib.test.mjs checks each one.
import type { Unit } from "@/lib/lessonDecks/types";

export const UNITS: Unit[] = [];

export const unitKey = (u: Pick<Unit, "level" | "unit">) => `L${u.level} U${u.unit}`;
