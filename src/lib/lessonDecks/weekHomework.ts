// Day-by-day homework (the IELTS course's homework slide): what one child does
// in the week for their tier, worked out from the deck alone. Pure; imports only
// types (scripts/pgtest/week-homework.test.mjs bundles it on its own).
//
// A child's tier is kept per class like an interest group (class_deck_state
// .interests, student ids only): "tier-support" and "tier-stretch" lists, everyone
// else Core. A child on both lists gets Support, the safer week.

import type { Deck, Slide, TierLevel, Unit } from "./types";

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type Day = (typeof DAYS)[number];
type HomeworkSlide = Extract<Slide, { kind: "homework" }>;
export type WeekItem = HomeworkSlide["items"][number];

export const TIER_KEYS = { Support: "tier-support", Stretch: "tier-stretch" } as const;
export const TIERS: TierLevel[] = ["Support", "Core", "Stretch"];

/** The deck's day-by-day homework slide: one whose items name days or a tier. */
export function weekSlide(deck: Deck): HomeworkSlide | null {
  const hw = deck.slides.find((s): s is HomeworkSlide => s.kind === "homework");
  return hw && hw.items.some((i) => i.days?.length || i.tier) ? hw : null;
}

/** Decks whose homework is a week plan rather than a creative task. */
export function isWeekHomework(deck: Deck): boolean {
  return !deck.slides.some((s) => s.kind === "creative") && weekSlide(deck) !== null;
}

/** The tier groups a unit's homework needs (none when nothing is tiered). */
export function tierGroups(unit: Unit): { interest: string; label: string }[] {
  const tiered = unit.decks.some((d) => isWeekHomework(d) && weekSlide(d)!.items.some((i) => i.tier));
  return tiered ? [{ interest: TIER_KEYS.Support, label: "Support tier" }, { interest: TIER_KEYS.Stretch, label: "Stretch tier" }] : [];
}

export function tierOf(studentId: string, interests: Record<string, string[]> | null | undefined): TierLevel {
  if (interests?.[TIER_KEYS.Support]?.includes(studentId)) return "Support";
  if (interests?.[TIER_KEYS.Stretch]?.includes(studentId)) return "Stretch";
  return "Core";
}

/** The items for a tier: its own plus the untiered ones, in slide order. */
export function itemsFor(deck: Deck, tier: TierLevel): WeekItem[] {
  return (weekSlide(deck)?.items ?? []).filter((i) => !i.tier || i.tier === tier);
}

export type WeekPlan = {
  tier: TierLevel;
  items: WeekItem[];
  minutes: number; // the week
  days: { day: Day; items: { label: string; minutes: number | null }[]; minutes: number }[];
};

/** A tier's week, day by day: each item's weekly minutes shared over its days. */
export function weekPlan(deck: Deck, tier: TierLevel): WeekPlan {
  const items = itemsFor(deck, tier);
  const days = DAYS.map((day) => {
    const today = items.filter((i) => i.days?.includes(day))
      .map((i) => ({ label: i.label, minutes: i.minutes ? Math.round(i.minutes / i.days!.length) : null }));
    return { day, items: today, minutes: today.reduce((m, x) => m + (x.minutes ?? 0), 0) };
  });
  return { tier, items, minutes: items.reduce((m, i) => m + (i.minutes ?? 0), 0), days };
}

/** Present children split by tier, keeping roster order. */
export function byTier<S extends { id: string }>(students: S[], interests: Record<string, string[]> | null | undefined): Record<TierLevel, S[]> {
  const out: Record<TierLevel, S[]> = { Support: [], Core: [], Stretch: [] };
  for (const s of students) out[tierOf(s.id, interests)].push(s);
  return out;
}

/** The homework as text for the app, for one tier. No names. */
export function weekText(deck: Deck, tier: TierLevel): string {
  const p = weekPlan(deck, tier);
  const line = (i: WeekItem) => [
    `${i.label}${i.days?.length ? ` (${i.days.join(", ")})` : ""}${i.minutes ? `, about ${i.minutes} min a week` : ""}`,
    `  ${i.detail}`,
    ...(i.check ? [`  How it is checked: ${i.check}`] : []),
  ].join("\n");
  const plan = p.days.filter((d) => d.items.length).map((d) => `${d.day}: ${d.items.map((x) => x.label).join(" + ")}${d.minutes ? ` (about ${d.minutes} min)` : ""}`);
  return [`${tier} week, about ${p.minutes} minutes in all.`, "", "Day by day:", ...plan, "", ...p.items.map(line)].join("\n");
}
