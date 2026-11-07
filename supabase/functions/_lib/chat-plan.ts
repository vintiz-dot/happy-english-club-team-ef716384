/**
 * _lib/chat-plan.ts — from what an admin typed to a plan the database checks.
 *
 * The model reads the instruction and fills in propose_changes with the
 * values AS TYPED: a date stays "02/18/2021", a class stays "stars 2". This
 * module does the part that must not be left to a model: reading a date one
 * way or asking, matching names to real records or asking, and checking a
 * percentage or an amount against the admin's own words, so "30 percent ...
 * 20%" gets a question instead of a guess. ai_plan_check in the database
 * then checks the result again, and only it decides what may be written.
 *
 * Pure: no database, no Deno. Tested in scripts/pgtest/chat-assistant.test.mjs.
 */

import { asMonth, foldName, matchByName, nameScore, type SchoolDay } from "./chat-context.ts";

// ── Dates ─────────────────────────────────────────────────────────────

const MONTH_NUMBERS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type DateReading = { date: string } | { ambiguous: [string, string] } | { invalid: true };

const iso = (y: number, m: number, d: number): string | null => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? dt.toISOString().slice(0, 10)
    : null;
};

/** "2026-11-07" -> "7 Nov 2026" */
export function dateLabel(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTH_NAMES[m - 1]} ${y}`;
}

/**
 * A date as an admin typed it. 18/02 and 02/18 are both clear; 02/03 is
 * not - Vietnam writes the day first, a US-style form writes the month
 * first - so that comes back as two readings to ask about.
 */
export function readDate(text: unknown): DateReading {
  const raw = String(text ?? "").trim().toLowerCase();
  if (!raw) return { invalid: true };
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(raw);
  if (m) {
    const d = iso(+m[1], +m[2], +m[3]);
    return d ? { date: d } : { invalid: true };
  }
  m = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/.exec(raw);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    const dayFirst = iso(y, b, a), monthFirst = iso(y, a, b);
    if (dayFirst && monthFirst && dayFirst !== monthFirst) return { ambiguous: [dayFirst, monthFirst] };
    const d = dayFirst ?? monthFirst;
    return d ? { date: d } : { invalid: true };
  }
  const words = foldName(raw);
  m = /^(?:ngay )?(\d{1,2}) thang (\d{1,2}) (?:nam )?(\d{4})$/.exec(words);
  if (m) {
    const d = iso(+m[3], +m[2], +m[1]);
    return d ? { date: d } : { invalid: true };
  }
  m = /^(\d{1,2})(?:st|nd|rd|th)? ([a-z]+) (\d{4})$/.exec(words) ?? null;
  if (m && MONTH_NUMBERS[m[2]]) {
    const d = iso(+m[3], MONTH_NUMBERS[m[2]], +m[1]);
    return d ? { date: d } : { invalid: true };
  }
  m = /^([a-z]+) (\d{1,2})(?:st|nd|rd|th)? (\d{4})$/.exec(words);
  if (m && MONTH_NUMBERS[m[1]]) {
    const d = iso(+m[3], MONTH_NUMBERS[m[1]], +m[2]);
    return d ? { date: d } : { invalid: true };
  }
  return { invalid: true };
}

/** A month as YYYY-MM from "2026-10", "10/2026", "Oct 2026", "October" or "thang 10". */
export function readMonth(text: unknown, today: SchoolDay): string | null {
  const direct = asMonth(text);
  if (direct) return direct;
  const raw = String(text ?? "").trim().toLowerCase();
  let m = /^(\d{1,2})[/.\-](\d{4})$/.exec(raw);
  if (m && +m[1] >= 1 && +m[1] <= 12) return `${m[2]}-${String(+m[1]).padStart(2, "0")}`;
  const words = foldName(raw);
  m = /^(?:thang )?(\d{1,2})(?: (?:nam )?(\d{4}))?$/.exec(words);
  if (m && words.startsWith("thang") && +m[1] >= 1 && +m[1] <= 12) {
    return `${m[2] ?? today.month.slice(0, 4)}-${String(+m[1]).padStart(2, "0")}`;
  }
  m = /^([a-z]+)(?: (\d{4}))?$/.exec(words);
  if (m && MONTH_NUMBERS[m[1]]) {
    return `${m[2] ?? today.month.slice(0, 4)}-${String(MONTH_NUMBERS[m[1]]).padStart(2, "0")}`;
  }
  return null;
}

/** YYYY-MM moved by whole months. */
export function addMonths(month: string, n: number): string {
  const d = new Date(`${month}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}

// ── What the admin actually wrote ─────────────────────────────────────

/** Every percentage written in a message: "30 percent", "20%", "15 phần trăm". */
export function percentsIn(text: string): number[] {
  const out: number[] = [];
  const re = /(\d{1,3}(?:[.,]\d+)?)\s*(?:%|percent\b|per cent\b|phan tram\b)/g;
  for (const m of foldPercent(text).matchAll(re)) out.push(Number(m[1].replace(",", ".")));
  return out;
}
// foldName drops "%", so this keeps it while losing the accents.
const foldPercent = (s: string) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[đĐ]/g, "d").toLowerCase();

/**
 * Every amount of money written in a message, in dong: "123,000",
 * "123.000", "123000", "123k", "500 nghìn", "1.2tr", "1tr2", "2 triệu".
 */
export function amountsIn(text: string): number[] {
  const s = foldPercent(text);
  const out = new Set<number>();
  for (const m of s.matchAll(/(\d+)\s*tr(\d{1,3})\b/g)) {
    out.add(Number(m[1]) * 1_000_000 + Number(m[2].padEnd(3, "0")) * 1_000);
  }
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:tr|trieu|m|mil|million)\b/g)) {
    out.add(Math.round(Number(m[1].replace(",", ".")) * 1_000_000));
  }
  for (const m of s.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:k|nghin|ngan)\b/g)) {
    out.add(Math.round(Number(m[1].replace(",", ".")) * 1_000));
  }
  for (const m of s.matchAll(/\d{1,3}(?:[.,]\d{3})+/g)) out.add(Number(m[0].replace(/[.,]/g, "")));
  for (const m of s.matchAll(/\b\d{4,}\b/g)) out.add(Number(m[0]));
  return [...out];
}

const vnd = (n: number) => `${Math.round(n).toLocaleString("en-US").replace(/,/g, ".")} ₫`;

// ── The plan ──────────────────────────────────────────────────────────

export interface Lookups {
  students: { id: string; name: string; active: boolean }[];
  classes: { id: string; name: string }[];
  families: { id: string; name: string }[];
}

export interface Draft {
  questions: string[];
  plan: Record<string, unknown> | null;
}

export const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Card", "Other"];

/** One record by name, or a question. */
function pick<T extends { name: string }>(rows: T[], typed: string, what: string, ask: string[], strip?: RegExp): T | null {
  const query = strip ? foldName(typed).replace(strip, " ").replace(/\s+/g, " ").trim() : typed;
  if (!foldName(query)) {
    ask.push(`Which ${what}?`);
    return null;
  }
  const found = matchByName(rows, query, (r) => r.name);
  const exact = found.filter((r) => nameScore(query, r.name) === 4);
  if (exact.length === 1) return exact[0];
  if (found.length === 1) return found[0];
  ask.push(found.length
    ? `Which ${what} do you mean: ${found.slice(0, 6).map((r) => r.name).join(", ")}?`
    : `I couldn't find a ${what} called "${typed}".`);
  return null;
}

/** A date from the admin's words, or a question about it. */
function dateOrAsk(typed: unknown, what: string, ask: string[]): string | null {
  const r = readDate(typed);
  if ("date" in r) return r.date;
  if ("ambiguous" in r) {
    ask.push(`Is the ${what} ${dateLabel(r.ambiguous[0])} or ${dateLabel(r.ambiguous[1])}?`);
  } else {
    ask.push(`I couldn't read "${String(typed)}" as the ${what}. Could you write it like 18 Feb 2021?`);
  }
  return null;
}

/**
 * The plan for propose_changes' arguments, or the questions to ask first.
 * `adminTexts` is everything the admin has typed in this conversation,
 * oldest first: what a percentage or an amount is checked against.
 */
export function draftPlan(args: any, look: Lookups, today: SchoolDay, adminTexts: string[]): Draft {
  const ask: string[] = [];
  const plan: Record<string, unknown> = { version: 1 };
  const latest = adminTexts[adminTexts.length - 1] ?? "";
  const recent = adminTexts.slice(-4);
  const typedName = String(args?.student_name ?? "").trim().replace(/\s+/g, " ");

  if (typedName.length < 2) return { questions: ["Which student is this for?"], plan: null };

  if (args?.new_student) {
    const same = look.students.filter((s) => nameScore(typedName, s.name) >= 3);
    const fresh: Record<string, unknown> = { full_name: typedName };
    if (same.length && !args?.different_child_confirmed) {
      ask.push(`There is already a student called ${same.slice(0, 3).map((s) => s.name).join(", ")}. Is ${typedName} a different child?`);
    }
    if (args?.date_of_birth) {
      const dob = dateOrAsk(args.date_of_birth, "date of birth", ask);
      if (dob) fresh.date_of_birth = dob;
    }
    plan.student = { new: fresh, ...(same.length && args?.different_child_confirmed ? { allow_same_name: true } : {}) };
  } else {
    const s = pick(look.students, typedName, "student", ask);
    if (s) plan.student = { id: s.id };
  }

  let enrolMonth: string | null = null;
  if (args?.class_name) {
    const c = pick(look.classes, String(args.class_name), "class", ask);
    const start = args?.start_date ? dateOrAsk(args.start_date, "start date", ask) : today.date;
    if (c && start) {
      plan.enrol = { class_id: c.id, start_date: start };
      enrolMonth = start.slice(0, 7);
    }
  }

  let lastDiscountMonth: string | null = null;
  const hasPct = args?.discount_percent !== undefined && args?.discount_percent !== null;
  const hasMonths = args?.discount_months !== undefined && args?.discount_months !== null;
  if (hasPct || hasMonths) {
    const pct = Number(args?.discount_percent);
    const months = Number(args?.discount_months);
    if (!hasPct) ask.push("What percentage should the discount be?");
    if (!hasMonths) ask.push("For how many months should the discount last?");
    if (hasPct) {
      // The admin's own words decide. A clear answer in the latest message
      // settles it ("30%", or just "30"); otherwise every percentage in the
      // recent messages has to be this one.
      const said = percentsIn(latest);
      const bare = /^\D*?(\d{1,3})\D*$/.exec(latest.trim());
      const settled = (said.length === 1 && said[0] === pct) ||
        (said.length === 0 && bare !== null && Number(bare[1]) === pct && latest.trim().length <= 24);
      if (!settled) {
        const seen = [...new Set(recent.flatMap(percentsIn))];
        if (seen.length > 1) ask.push(`You mentioned ${seen.map((p) => `${p}%`).join(" and ")}. Which discount do you mean?`);
        else if (seen.length === 1 && seen[0] !== pct) ask.push(`Did you mean a ${seen[0]}% discount?`);
        else if (seen.length === 0) ask.push("What percentage should the discount be?");
      }
    }
    if (hasPct && hasMonths) {
      // The month she starts is the first discounted bill (agreed 7 Nov 2026).
      const first = asMonth(args?.discount_first_month) ?? enrolMonth ?? today.month;
      plan.discount = { percent: pct, first_month: first, months };
      if (Number.isInteger(months) && months > 0) lastDiscountMonth = addMonths(first, months - 1);
    }
  }

  if (args?.family_name) {
    const f = pick(look.families, String(args.family_name), "family", ask, /\b(family|gia dinh|nha)\b/g);
    if (f) plan.family = { family_id: f.id };
  }

  const hold = args?.sibling_discount_hold;
  if (hold) {
    if (hold === "lift") {
      plan.sibling_hold = { lift: true };
    } else if (hold === "until_discount_ends") {
      if (lastDiscountMonth) plan.sibling_hold = { from: `${addMonths(lastDiscountMonth, 1)}-01` };
      else ask.push("Until when should the sibling discount wait?");
    } else {
      const d = dateOrAsk(hold, "date the sibling discount starts", ask);
      // Holds run in whole bills: from the 1st of that month, or of the next.
      if (d) plan.sibling_hold = { from: d.endsWith("-01") ? d : `${addMonths(d.slice(0, 7), 1)}-01` };
    }
  }

  if (args?.payment_amount !== undefined && args?.payment_amount !== null) {
    const amount = Number(args.payment_amount);
    if (!recent.flatMap(amountsIn).includes(amount)) {
      ask.push(Number.isFinite(amount) && amount > 0
        ? `I read ${vnd(amount)}, but I can't see that amount in your message. How much was paid?`
        : "How much was paid?");
    }
    const month = readMonth(args?.payment_month, today);
    if (!month) ask.push("Which month is this payment for?");
    const method = PAYMENT_METHODS.find((m) => foldName(m) === foldName(args?.payment_method ?? "")) ?? "Cash";
    const paidOn = args?.payment_date ? dateOrAsk(args.payment_date, "payment date", ask) : today.date;
    if (month && paidOn) {
      plan.payment = {
        amount,
        month,
        method,
        paid_on: paidOn,
        ...(args?.payment_note ? { note: String(args.payment_note).slice(0, 500) } : {}),
      };
    }
  }

  return ask.length ? { questions: ask, plan: null } : { questions: [], plan };
}
