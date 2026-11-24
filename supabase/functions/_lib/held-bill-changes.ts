/**
 * What changed on a held closed-month bill (owner, 24 Nov 2026).
 *
 * A closed month keeps the bill it was charged; when today's pricing gives
 * another total the calculators answer `held` with both sets of figures
 * (_lib/past-month-hold.ts). Two totals do not tell an admin WHY they differ,
 * so `held.changes` sets the saved bill beside today's pricing, class by
 * class: the lessons charged then and billed today (each with its mark), the
 * price of a lesson then and today (a custom rate is named as one, beside the
 * class fee), and the discounts taken off then and today. `reasons` says the
 * same in sentences.
 *
 * NOTHING IS PRICED HERE. Today's side is what _lib/tuition-pricing.ts
 * decided; the charged side is what the saved bill says (its class lines and
 * the discount names on its tuition_adjustment flag). This file only puts the
 * two next to each other. What the saved bill never recorded (WHICH lessons
 * were charged, each discount's own amount) is not guessed: the counts and
 * the total are shown, and the sentences say so.
 *
 * Pure; the one import is a type.
 */
import type { StudentMonth } from "./tuition-pricing.ts";

export interface HeldPriceGroup {
  /** What one lesson costs this child today. */
  price_vnd: number;
  /** The class fee on those dates, whatever the child pays. */
  class_fee_vnd: number;
  lessons: number;
  /** True when the price is the enrolment's own rate, not the class fee. */
  custom_rate: boolean;
}

export interface HeldLesson {
  date: string;
  /** Present | Late | Absent | Excused, or null when nobody marked the lesson. */
  mark: string | null;
  price_vnd: number;
  /** The lesson has taken place (false: still on the timetable). */
  held: boolean;
}

export interface HeldClassChange {
  class_id: string | null;
  class_name: string;
  /** The saved bill's line for this class; null when the class is not on it. */
  charged: { lessons: number; rate_vnd: number; amount_vnd: number; net_amount_vnd: number } | null;
  /** Today's pricing of this class; null when no lesson of it concerns the child today. */
  today: {
    lessons: number;
    amount_vnd: number;
    /** After the enrolment's own discounts, before student and sibling discounts. */
    net_amount_vnd: number;
    prices: HeldPriceGroup[];
    billed: HeldLesson[];
    not_billed: Array<{ date: string; mark: string | null; state: "excused" | "cancelled" | "free" }>;
  } | null;
}

export interface HeldDiscountLine {
  name: string;
  type: "percent" | "amount";
  value: number;
  amount_vnd: number;
  /** The class a class-bound discount is taken from (enrolment terms, sibling). */
  class_name: string | null;
}

export interface HeldBillChanges {
  /** False for an older bill saved with no class lines: only totals can be compared. */
  has_saved_lines: boolean;
  charged: { base_vnd: number; discount_vnd: number; total_vnd: number };
  today: { base_vnd: number; discount_vnd: number; total_vnd: number };
  classes: HeldClassChange[];
  discounts: {
    charged_total_vnd: number;
    /** Names on the saved bill's review flag, when it has one. Amounts were not saved. */
    charged_names: string[];
    today_total_vnd: number;
    today: HeldDiscountLine[];
  };
  /** Plain sentences: what moved the figure. */
  reasons: string[];
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const vnd = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")} ₫`;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (date: string): string => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1] ?? ""}`.trim();
const days = (rows: Array<{ date: string }>): string => rows.map((r) => dayLabel(r.date)).join(", ");
const lessons = (n: number): string => `${n} lesson${n === 1 ? "" : "s"}`;

/** The name the old calculator gave a custom rate: the class fee as the base, the difference as a discount. */
export const RATE_ADJUSTMENT = "Rate Adjustment";
/** The date the owner's pricing rules took effect, for the sentences. */
const RULES_DATE = "23 Nov 2026";

export function heldBillChanges(input: {
  /** The saved bill: its figures, class lines and review flags. */
  saved: {
    base_amount?: unknown;
    discount_amount?: unknown;
    total_amount?: unknown;
    class_breakdown?: unknown;
    review_flags?: unknown;
  };
  /** Today's pricing of the month, from priceStudentMonth. */
  priced: StudentMonth;
  className: (classId: string) => string | null | undefined;
}): HeldBillChanges {
  const { saved, priced } = input;
  const nameOf = (id: string | null, fallback?: unknown): string =>
    (id ? input.className(id) : null) || (typeof fallback === "string" && fallback ? fallback : "Unknown class");

  // ---- the saved bill's lines, one per class
  const savedLines: any[] = Array.isArray(saved.class_breakdown) ? saved.class_breakdown : [];
  const chargedBy = new Map<string, { class_id: string | null; name: unknown; lessons: number; amount: number; net: number; rate: number }>();
  for (const l of savedLines) {
    if (!l || typeof l !== "object") continue;
    const id: string | null = typeof l.class_id === "string" && l.class_id ? l.class_id : null;
    const key = id ?? `name:${String(l.class_name ?? "")}`;
    const amount = num(l.amount_vnd);
    const c = chargedBy.get(key) ?? { class_id: id, name: l.class_name, lessons: 0, amount: 0, net: 0, rate: 0 };
    c.lessons += num(l.sessions_count);
    c.amount += amount;
    c.net += l.net_amount_vnd === undefined || l.net_amount_vnd === null ? amount : num(l.net_amount_vnd);
    if (!c.rate) c.rate = num(l.session_rate_vnd);
    chargedBy.set(key, c);
  }
  const hasSavedLines = chargedBy.size > 0;

  // ---- today's pricing, one per class
  const todayIds: string[] = [];
  for (const l of priced.lessons) if (!todayIds.includes(l.class_id)) todayIds.push(l.class_id);
  const todayOf = (classId: string): NonNullable<HeldClassChange["today"]> => {
    const mine = priced.lessons.filter((l) => l.class_id === classId);
    const billed = mine.filter((l) => l.state === "billed");
    const groups: HeldPriceGroup[] = [];
    for (const l of billed) {
      const g = groups.find((x) => x.price_vnd === l.price_vnd && x.class_fee_vnd === l.class_fee_vnd);
      if (g) g.lessons += 1;
      else groups.push({ price_vnd: l.price_vnd, class_fee_vnd: l.class_fee_vnd, lessons: 1, custom_rate: l.price_vnd !== l.class_fee_vnd });
    }
    const pc = priced.projected.classes.find((c) => c.class_id === classId);
    return {
      lessons: billed.length,
      amount_vnd: pc ? pc.base_vnd : 0,
      net_amount_vnd: pc ? pc.after_own_vnd : 0,
      prices: groups,
      billed: billed.map((l) => ({ date: l.date, mark: l.mark, price_vnd: l.price_vnd, held: l.held })),
      not_billed: mine
        .filter((l) => l.state !== "billed")
        .map((l) => ({ date: l.date, mark: l.mark, state: l.state as "excused" | "cancelled" | "free" })),
    };
  };

  const classes: HeldClassChange[] = [];
  const seen = new Set<string>();
  for (const c of chargedBy.values()) {
    if (c.class_id) seen.add(c.class_id);
    classes.push({
      class_id: c.class_id,
      class_name: nameOf(c.class_id, c.name),
      charged: {
        lessons: c.lessons,
        rate_vnd: c.rate > 0 ? c.rate : c.lessons > 0 ? Math.round(c.amount / c.lessons) : 0,
        amount_vnd: c.amount,
        net_amount_vnd: c.net,
      },
      today: c.class_id && todayIds.includes(c.class_id) ? todayOf(c.class_id) : null,
    });
  }
  for (const id of todayIds) {
    if (seen.has(id)) continue;
    classes.push({ class_id: id, class_name: nameOf(id), charged: null, today: todayOf(id) });
  }

  // ---- discounts
  const flags: any[] = Array.isArray(saved.review_flags) ? saved.review_flags : [];
  const chargedNames: string[] = [];
  for (const f of flags) {
    if (f?.type !== "tuition_adjustment" || !Array.isArray(f?.details?.reasons)) continue;
    for (const r of f.details.reasons) {
      // "Custom rate" is the new calculator's note that the base is not the class fee: not a discount.
      if (typeof r === "string" && r && r !== "Custom rate" && !chargedNames.includes(r)) chargedNames.push(r);
    }
  }
  const todayDiscounts: HeldDiscountLine[] = priced.projected.discounts.map((d) => ({
    name: d.name,
    type: d.type,
    value: d.value,
    amount_vnd: d.amount,
    class_name: d.class_id ? nameOf(d.class_id) : null,
  }));
  const charged = { base_vnd: num(saved.base_amount), discount_vnd: num(saved.discount_amount), total_vnd: num(saved.total_amount) };
  const today = {
    base_vnd: priced.projected.baseAmount,
    discount_vnd: priced.projected.totalDiscount,
    total_vnd: priced.projected.totalAmount,
  };

  // ---- the sentences
  const reasons: string[] = [];
  if (!hasSavedLines) {
    reasons.push(
      `The saved bill lists no classes, so only its totals can be compared: ${vnd(charged.base_vnd)} of lessons was charged; today's lessons come to ${vnd(today.base_vnd)}.`,
    );
  }
  for (const c of classes) {
    const a = c.charged, b = c.today;
    if (a && b) {
      if (a.lessons !== b.lessons) {
        const d = b.lessons - a.lessons;
        reasons.push(`${c.class_name}: charged for ${lessons(a.lessons)}; ${b.lessons} ${b.lessons === 1 ? "is" : "are"} billed today (${Math.abs(d)} ${d > 0 ? "more" : "fewer"}).`);
        const unmarked = b.billed.filter((l) => l.held && !l.mark);
        if (d > 0 && unmarked.length > 0) {
          reasons.push(
            `${c.class_name}: ${lessons(unmarked.length)} billed today ${unmarked.length === 1 ? "has" : "have"} no mark in the register (${days(unmarked)}). Until ${RULES_DATE} a lesson with no mark was not billed.`,
          );
        }
        if (d < 0 && b.not_billed.length > 0) {
          const parts: string[] = [];
          for (const [state, word] of [["excused", "excused"], ["cancelled", "cancelled"], ["free", "at no charge"]] as const) {
            const rows = b.not_billed.filter((l) => l.state === state);
            if (rows.length > 0) parts.push(`${rows.length} ${word} (${days(rows)})`);
          }
          reasons.push(`${c.class_name}: not billed today: ${parts.join("; ")}.`);
        }
      }
      const differing = b.prices.filter((p) => a.rate_vnd > 0 && p.price_vnd !== a.rate_vnd);
      if (differing.length > 0) {
        if (b.prices.length === 1) {
          const p = b.prices[0];
          reasons.push(
            p.custom_rate
              ? `${c.class_name}: charged at ${vnd(a.rate_vnd)} a lesson; today each lesson is ${vnd(p.price_vnd)}, the enrolment's custom rate (the class fee is ${vnd(p.class_fee_vnd)}).`
              : `${c.class_name}: charged at ${vnd(a.rate_vnd)} a lesson; today each lesson is ${vnd(p.price_vnd)}, the class fee on those dates.`,
          );
        } else {
          reasons.push(
            `${c.class_name}: charged at ${vnd(a.rate_vnd)} a lesson; today ${b.prices
              .map((p) => `${lessons(p.lessons)} at ${vnd(p.price_vnd)}${p.custom_rate ? " (custom rate)" : ""}`)
              .join(", ")}.`,
          );
        }
      }
    } else if (a && !b) {
      reasons.push(
        `${c.class_name}: charged for ${lessons(a.lessons)} (${vnd(a.amount_vnd)}); today no lesson of this class falls inside the child's enrolment for the month.`,
      );
    } else if (!a && b && hasSavedLines) {
      if (b.lessons > 0) reasons.push(`${c.class_name} is not on the saved bill; today ${lessons(b.lessons)} ${b.lessons === 1 ? "is" : "are"} billed there (${vnd(b.amount_vnd)}).`);
    }
  }
  if (charged.discount_vnd !== today.discount_vnd) {
    const then = chargedNames.length > 0 ? ` (${chargedNames.join(", ")})` : "";
    const now = todayDiscounts.length > 0
      ? ` (${todayDiscounts.map((d) => `${d.name}${d.type === "percent" ? ` ${d.value}%` : ""}: ${vnd(d.amount_vnd)}`).join("; ")})`
      : "";
    reasons.push(`Discounts: ${vnd(charged.discount_vnd)} was taken off the bill${then}; today ${vnd(today.discount_vnd)} is taken off${now}.`);
  }
  if (chargedNames.includes(RATE_ADJUSTMENT)) {
    reasons.push(
      `"${RATE_ADJUSTMENT}" is how a custom rate was saved before ${RULES_DATE}: the class fee as the lesson price and the difference as a discount. Today the custom rate is the lesson price itself, so the lessons figure and the discount are both lower by that difference.`,
    );
  }
  if (reasons.length === 0) {
    reasons.push("The saved lines and today's pricing show the same lessons, prices and discount total; the difference is in how the discounts were worked out when the bill was saved.");
  }

  return {
    has_saved_lines: hasSavedLines,
    charged,
    today,
    classes,
    discounts: {
      charged_total_vnd: charged.discount_vnd,
      charged_names: chargedNames,
      today_total_vnd: today.discount_vnd,
      today: todayDiscounts,
    },
    reasons,
  };
}
