/**
 * _lib/tuition-pricing.ts - what one student owes for one month. ONE place.
 *
 * The owner's rules (23 Nov 2026), in the order they are applied:
 *
 *  1. LESSONS. A lesson is on the bill when the child is enrolled in the
 *     class on that date (and that weekday, if the enrollment names days),
 *     the lesson is not cancelled, and the child is not Excused. Present,
 *     Late, Absent and NO MARK AT ALL are all billed: a missing register
 *     mark can never shrink a bill. A lesson an admin gave this child as a
 *     FREE TRIAL (owner, 24 Nov 2026; free_trial_lessons) is not billed,
 *     whatever its mark.
 *  2. PRICE. The enrollment's custom rate when it has one, higher or lower
 *     than the class fee; otherwise the class fee in force on the lesson's
 *     date. A price of 0 is a free lesson.
 *  3. DISCOUNTS, so that the school gives away the least: fixed amounts
 *     before percentages, and every percentage is taken from what is left,
 *     never from the undiscounted base.
 *       a. the enrollment's own terms, on that class;
 *       b. the student's fixed-amount discounts and bonuses, on the month;
 *       c. the student's percentage discounts and bonuses, on what is left;
 *       d. the family's sibling percentage, on the winner class's share of
 *          what is left.
 *     No discount takes more than the amount it applies to.
 *  4. SIBLING. Off when the family's percent is 0. Needs two or more
 *     children with billable lessons. It goes to the one class, among all
 *     those children's classes, where it costs the school the least money.
 *     Chosen once per month (the caller stores it; this module only says
 *     which class it would be). One thing moves it afterwards (owner, 24 Nov
 *     2026): the family paid as if the discount were on another child. When
 *     every child's payment for the month is, to the dong, their bill with
 *     the discount there, it goes there (siblingFitByPayments).
 *
 * "projected" is the whole month as the timetable stands; "actual" is the
 * lessons already held. Same rules, same discounts, fewer lessons.
 *
 * Imports nothing: Deno functions and the node tests load it as it is.
 * Enrollments must arrive in creation order (enrollment-discounts.ts
 * inCreationOrder): where two rows of one class cover a date, the one
 * created first prices the lesson.
 */

export interface PricingEnrollment {
  class_id: string;
  start_date: string;
  end_date?: string | null;
  rate_override_vnd?: number | string | null;
  allowed_days?: number[] | null;
  discount_type?: "percent" | "amount" | string | null;
  discount_value?: number | string | null;
  discount_cadence?: string | null;
}

export interface PricingSession {
  id: string;
  date: string; // YYYY-MM-DD
  status: string; // Scheduled | Held | Canceled
  class_id: string;
}

/** A discount on the whole month: a special student discount or a referral bonus. */
export interface MonthDiscount {
  name: string;
  type: "percent" | "amount" | string;
  value: number | string;
}

export interface SiblingAward {
  percent: number;
  classId: string;
}

/** "free": the price is 0 (a free place). "trial": a free trial lesson given to this child. */
export type LessonState = "billed" | "excused" | "cancelled" | "free" | "trial";

export interface PricedLesson {
  session_id: string;
  date: string;
  class_id: string;
  /** What the lesson costs this child: custom rate, else the class fee on the date. */
  price_vnd: number;
  /** The class fee on the date, whatever the child pays. */
  class_fee_vnd: number;
  mark: string | null;
  held: boolean;
  state: LessonState;
}

export interface DiscountLine {
  name: string;
  type: "percent" | "amount";
  value: number;
  amount: number;
  class_id?: string;
  appliedToClass?: string;
  isSiblingWinner?: boolean;
}

export interface PricedClass {
  class_id: string;
  lessons: number;
  /** Lessons x price, before any discount. */
  base_vnd: number;
  /** The enrollment's own discounts on this class. */
  own_discount_vnd: number;
  /** base less own discounts. */
  after_own_vnd: number;
  /** This class's share of the month after every discount except the sibling one:
   *  the amount a sibling percentage would be taken from. */
  sibling_basis_vnd: number;
  /** The sibling discount given on this class (0 unless it is the winner class). */
  sibling_discount_vnd: number;
}

export interface PricedMonth {
  lessons: number;
  baseAmount: number;
  discounts: DiscountLine[];
  totalDiscount: number;
  totalAmount: number;
  /** The same lessons at the class fee, no custom rate, no discount. */
  expectedClassTuition: number;
  classes: PricedClass[];
}

const num = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v: number, max: number): number => Math.max(0, Math.min(Math.round(v), Math.max(0, max)));

/** 0 = Sunday .. 6 = Saturday, from the date alone (no time zone involved). */
export function weekdayOf(date: string): number {
  return new Date(`${String(date).slice(0, 10)}T00:00:00Z`).getUTCDay();
}

/** The enrollment a lesson is billed under; `ordered` is in creation order. */
function enrollmentFor<T extends PricingEnrollment>(ordered: T[], classId: string, date: string): T | undefined {
  return ordered.find((e) => e.class_id === classId && e.start_date <= date && (!e.end_date || e.end_date >= date));
}

/** A custom rate is any number on the enrollment, 0 included; null / "" / missing means "none". */
function customRate(e: PricingEnrollment): number | null {
  const raw = e.rate_override_vnd;
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

type LessonWithEnrollment = PricedLesson & { enrollment: PricingEnrollment };

/**
 * Every lesson of the month that concerns this child, with what it costs and
 * whether it is billed. Sessions of any status may be passed; cancelled ones
 * come back as "cancelled" (not billed), statuses other than Scheduled /
 * Held / Canceled are left out.
 */
export function monthLessons(
  enrollments: PricingEnrollment[],
  sessions: PricingSession[],
  markOf: (sessionId: string) => string | null | undefined,
  classFeeOn: (classId: string, date: string) => number,
  isFreeTrial: (sessionId: string) => boolean = () => false,
): LessonWithEnrollment[] {
  const out: LessonWithEnrollment[] = [];
  const seen = new Set<string>();
  for (const s of sessions ?? []) {
    if (!s || seen.has(s.id)) continue; // a session listed twice is one lesson
    seen.add(s.id);
    const cancelled = s.status === "Canceled";
    if (!cancelled && s.status !== "Scheduled" && s.status !== "Held") continue;
    const enrollment = enrollmentFor(enrollments ?? [], s.class_id, s.date);
    if (!enrollment) continue;
    if (enrollment.allowed_days && !enrollment.allowed_days.includes(weekdayOf(s.date))) continue;
    const classFee = num(classFeeOn(s.class_id, s.date));
    const custom = customRate(enrollment);
    const price = custom ?? classFee;
    const mark = markOf(s.id) ?? null;
    const state: LessonState = cancelled
      ? "cancelled"
      : !(price > 0)
        ? "free"
        : isFreeTrial(s.id) === true
          ? "trial"
          : mark === "Excused"
            ? "excused"
            : "billed";
    out.push({
      session_id: s.id,
      date: s.date,
      class_id: s.class_id,
      price_vnd: Math.max(0, price),
      class_fee_vnd: classFee,
      mark,
      held: s.status === "Held",
      state,
      enrollment,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.session_id < b.session_id ? -1 : 1));
}

/** Rule 3 over the lessons given (all of them must be billed lessons). */
export function priceLessons(
  billed: LessonWithEnrollment[],
  monthDiscounts: MonthDiscount[],
  sibling: SiblingAward | null,
): PricedMonth {
  const classes = new Map<string, { lessons: number; base: number; own: number }>();
  const groups = new Map<string, { enrollment: PricingEnrollment; class_id: string; base: number }>();
  let expectedClassTuition = 0;
  for (const l of billed) {
    const c = classes.get(l.class_id) ?? { lessons: 0, base: 0, own: 0 };
    c.lessons += 1;
    c.base += l.price_vnd;
    classes.set(l.class_id, c);
    expectedClassTuition += l.class_fee_vnd;
    // A weekday change copies an enrollment's terms into a new dated row:
    // identical terms on one class are one discount, not two.
    const e = l.enrollment;
    const key = JSON.stringify([l.class_id, e.discount_type ?? null, num(e.discount_value), e.discount_cadence ?? null]);
    const g = groups.get(key) ?? { enrollment: e, class_id: l.class_id, base: 0 };
    g.base += l.price_vnd;
    groups.set(key, g);
  }

  const discounts: DiscountLine[] = [];

  // a. the enrollment's own terms, on that class.
  for (const g of groups.values()) {
    const e = g.enrollment;
    const value = num(e.discount_value);
    if (!(value > 0) || (e.discount_type !== "percent" && e.discount_type !== "amount")) continue;
    if (e.discount_cadence !== "monthly" && e.discount_cadence !== "once") continue;
    const amount = clamp(e.discount_type === "percent" ? (g.base * value) / 100 : value, g.base);
    if (amount <= 0) continue;
    classes.get(g.class_id)!.own += amount;
    discounts.push({ name: "Enrollment Discount", type: e.discount_type, value, amount, class_id: g.class_id });
  }

  const baseAmount = [...classes.values()].reduce((n, c) => n + c.base, 0);
  const afterOwn = [...classes.values()].reduce((n, c) => n + Math.max(0, c.base - c.own), 0);
  let remaining = afterOwn;

  // b. fixed amounts first, c. then each percentage on what is left.
  const usable = (monthDiscounts ?? []).filter((d) => d && num(d.value) > 0 && (d.type === "percent" || d.type === "amount"));
  for (const d of usable.filter((x) => x.type === "amount")) {
    const amount = clamp(num(d.value), remaining);
    if (amount <= 0) continue;
    remaining -= amount;
    discounts.push({ name: d.name, type: "amount", value: num(d.value), amount });
  }
  for (const d of usable.filter((x) => x.type === "percent")) {
    const amount = clamp((remaining * num(d.value)) / 100, remaining);
    if (amount <= 0) continue;
    remaining -= amount;
    discounts.push({ name: d.name, type: "percent", value: num(d.value), amount });
  }

  // d. the sibling percentage, on the winner class's share of what is left.
  const basisOf = (c: { base: number; own: number }) =>
    afterOwn > 0 ? Math.round((remaining * Math.max(0, c.base - c.own)) / afterOwn) : 0;
  const beforeSibling = remaining;
  let siblingAmount = 0;
  const winner = sibling && num(sibling.percent) > 0 ? classes.get(sibling.classId) : undefined;
  if (sibling && winner) {
    siblingAmount = clamp((basisOf(winner) * num(sibling.percent)) / 100, remaining);
    if (siblingAmount > 0) {
      remaining -= siblingAmount;
      discounts.push({
        name: "Sibling Discount",
        type: "percent",
        value: num(sibling.percent),
        amount: siblingAmount,
        class_id: sibling.classId,
        appliedToClass: sibling.classId,
        isSiblingWinner: true,
      });
    }
  }

  const totalAmount = Math.max(0, Math.round(remaining));
  return {
    lessons: billed.length,
    baseAmount,
    discounts,
    totalDiscount: baseAmount - totalAmount,
    totalAmount,
    expectedClassTuition,
    classes: [...classes.entries()].map(([class_id, c]) => ({
      class_id,
      lessons: c.lessons,
      base_vnd: c.base,
      own_discount_vnd: c.own,
      after_own_vnd: Math.max(0, c.base - c.own),
      sibling_basis_vnd: afterOwn > 0 ? Math.round((beforeSibling * Math.max(0, c.base - c.own)) / afterOwn) : 0,
      sibling_discount_vnd: sibling && class_id === sibling.classId ? siblingAmount : 0,
    })),
  };
}

export interface StudentMonthInput {
  /** In creation order. */
  enrollments: PricingEnrollment[];
  /** The month's sessions of the student's classes, any status. */
  sessions: PricingSession[];
  markOf: (sessionId: string) => string | null | undefined;
  classFeeOn: (classId: string, date: string) => number;
  monthDiscounts: MonthDiscount[];
  sibling: SiblingAward | null;
  /** The lessons given to this child as a free trial (never billed). Absent: none. */
  isFreeTrial?: (sessionId: string) => boolean;
}

export interface StudentMonth {
  /** The whole month as the timetable stands: what the family is asked for. */
  projected: PricedMonth;
  /** The lessons already held. */
  actual: PricedMonth;
  lessons: PricedLesson[];
}

export function priceStudentMonth(input: StudentMonthInput): StudentMonth {
  const all = monthLessons(input.enrollments, input.sessions, input.markOf, input.classFeeOn, input.isFreeTrial);
  const billed = all.filter((l) => l.state === "billed");
  return {
    projected: priceLessons(billed, input.monthDiscounts, input.sibling),
    actual: priceLessons(billed.filter((l) => l.held), input.monthDiscounts, input.sibling),
    lessons: all.map(({ enrollment: _enrollment, ...lesson }) => lesson),
  };
}

// ------------------------------------------------- what a payment paid for

export interface PaymentExplained {
  /**
   *   none       nothing is recorded as paid on the month;
   *   exact      what was paid is what the month asks for now;
   *   explained  what was paid is the month WITH `lessons` still billed: they
   *              were cancelled, excused or made a free trial after the family paid;
   *   over       more was paid than is asked, and those lessons do not explain it;
   *   under      less was paid than is asked.
   */
  kind: "none" | "exact" | "explained" | "over" | "under";
  paid: number;
  /** What the month asks for now: its charge plus the balance brought in. */
  payable: number;
  /** paid - payable: credit for the next month when positive, still owed when negative. */
  difference: number;
  /** The balance brought in was part of what the family paid against (false: they paid the month's own charge). */
  carryCounted: boolean;
  /** kind "explained": the lessons no longer billed that the payment covered. */
  lessons: PricedLesson[];
}

/** k-element subsets of 0..n-1, later indexes first (the latest lessons are tried first). */
function* subsets(n: number, k: number, from = n - 1): Generator<number[]> {
  if (k === 0) { yield []; return; }
  for (let i = from; i >= k - 1; i--) for (const rest of subsets(n, k - 1, i - 1)) yield [i, ...rest];
}

/**
 * Parents pay what the bill said on the day; a lesson cancelled or excused
 * afterwards lowers the bill and the app then shows more paid than asked. This
 * says whether the lessons no longer billed account for the whole difference:
 * the month is priced again with some of them billed (same rules, same
 * discounts) until it comes to exactly what was paid.
 *
 * `carryIn` is the balance brought into the month: debt positive, credit
 * negative. Both "the month's charge plus the balance" and "the month's charge
 * alone" count as what a family may have paid against.
 */
export function explainPayment(input: StudentMonthInput, paid: number, carryIn: number): PaymentExplained {
  const all = monthLessons(input.enrollments, input.sessions, input.markOf, input.classFeeOn, input.isFreeTrial);
  const billed = all.filter((l) => l.state === "billed");
  const charge = priceLessons(billed, input.monthDiscounts, input.sibling).totalAmount;
  const carry = Math.round(num(carryIn));
  const payable = charge + carry;
  const amount = Math.round(num(paid));
  const strip = (ls: LessonWithEnrollment[]): PricedLesson[] => ls.map(({ enrollment: _enrollment, ...lesson }) => lesson);
  const answer = (kind: PaymentExplained["kind"], carryCounted: boolean, lessons: LessonWithEnrollment[] = []): PaymentExplained => ({
    kind, paid: amount, payable, difference: amount - payable, carryCounted, lessons: strip(lessons),
  });
  if (!(amount > 0)) return answer("none", true);
  if (amount === payable) return answer("exact", true);
  if (carry !== 0 && amount === charge) return answer("exact", false);
  if (amount < payable && amount < charge) return answer("under", true);

  // Lessons that would have been billed: cancelled, excused or a free trial, with a price.
  const gone = all.filter((l) => (l.state === "cancelled" || l.state === "excused" || l.state === "trial") && l.price_vnd > 0);
  if (gone.length > 0 && gone.length <= 12) {
    for (let k = 1; k <= gone.length; k++) {
      for (const pick of subsets(gone.length, k)) {
        const chosen = pick.map((i) => gone[i]);
        const withThem = priceLessons([...billed, ...chosen], input.monthDiscounts, input.sibling).totalAmount;
        const sorted = [...chosen].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
        if (withThem + carry === amount) return answer("explained", true, sorted);
        if (carry !== 0 && withThem === amount) return answer("explained", false, sorted);
      }
    }
  }
  return answer(amount > payable ? "over" : "under", true);
}

// ------------------------------------------------------------- sibling winner

export interface SiblingChild {
  studentId: string;
  /** The child's month priced WITHOUT a sibling discount (sibling: null). */
  month: PricedMonth;
}

export type SiblingChoice =
  | { status: "off"; reason: string }
  | { status: "pending"; reason: string; billableChildren: number }
  | { status: "assigned"; studentId: string; classId: string; basis: number; amount: number; reason: string };

/**
 * Rule 4. `tie` orders two candidates that cost exactly the same (the callers
 * pass the family+month hash they already use), lower first.
 */
export function chooseSiblingClass(
  children: SiblingChild[],
  percent: number,
  tie: (studentId: string, classId: string) => number = () => 0,
): SiblingChoice {
  if (!(num(percent) > 0)) return { status: "off", reason: "Sibling discount is off for this family (0%)" };
  const billable = (children ?? []).filter((c) => c.month.baseAmount > 0);
  if (billable.length < 2) {
    return {
      status: "pending",
      billableChildren: billable.length,
      reason: `Only ${billable.length} child(ren) with billable lessons, need 2 or more`,
    };
  }
  const candidates = billable.flatMap((c) =>
    c.month.classes
      .filter((k) => k.sibling_basis_vnd > 0)
      .map((k) => ({
        studentId: c.studentId,
        classId: k.class_id,
        basis: k.sibling_basis_vnd,
        amount: Math.round((k.sibling_basis_vnd * num(percent)) / 100),
      })),
  );
  if (candidates.length === 0) {
    return { status: "pending", billableChildren: billable.length, reason: "No class with anything left to discount" };
  }
  candidates.sort(
    (a, b) =>
      a.amount - b.amount ||
      a.basis - b.basis ||
      tie(a.studentId, a.classId) - tie(b.studentId, b.classId) ||
      (a.studentId < b.studentId ? -1 : a.studentId > b.studentId ? 1 : a.classId < b.classId ? -1 : 1),
  );
  const w = candidates[0];
  return { ...w, status: "assigned", reason: `Cheapest class for the school: ${num(percent)}% of ${w.basis} = ${w.amount}` };
}

// ------------------------------------- the sibling discount, as the family paid

export interface SiblingPaidChild {
  studentId: string;
  /** The child's month priced WITHOUT a sibling discount (sibling: null). */
  month: PricedMonth;
  /** What is recorded as paid on the child's bill for the month. */
  paid: number;
}

export interface SiblingFit {
  studentId: string;
  classId: string;
  /** The sibling discount there. */
  amount: number;
  /** Every billable child's bill with the discount there; each equals what that child paid. */
  totals: Array<{ studentId: string; total: number }>;
}

/** A child's month with the family's percentage taken on one class (the same sum as rule 3d). */
function totalWithSiblingOn(month: PricedMonth, classId: string | null, percent: number): { total: number; amount: number } {
  const k = classId ? month.classes.find((c) => c.class_id === classId) : undefined;
  const amount = k ? clamp((k.sibling_basis_vnd * num(percent)) / 100, month.totalAmount) : 0;
  return { total: Math.max(0, month.totalAmount - amount), amount };
}

/**
 * Sometimes a family puts the sibling discount on another child than the one
 * the school's rule chose, and pays that way. Owner, 24 Nov 2026: then the
 * discount goes where the family put it, for that month.
 *
 * Returns where the discount must sit for EVERY billable child's payment to
 * equal, to the dong, that child's bill for the month - or null when the
 * payments do not say so: they already fit where the discount is, a child has
 * paid nothing, no placing fits, or placings on two different children fit.
 * `current` is where the discount is now (null: nowhere).
 */
export function siblingFitByPayments(
  children: SiblingPaidChild[],
  percent: number,
  current: { studentId: string; classId: string } | null,
): SiblingFit | null {
  if (!(num(percent) > 0)) return null;
  const billable = (children ?? []).filter((c) => c.month.baseAmount > 0);
  if (billable.length < 2) return null;
  if (billable.some((c) => !(Math.round(num(c.paid)) > 0))) return null;
  const totalsWith = (studentId: string | null, classId: string | null) =>
    billable.map((c) => ({
      studentId: c.studentId,
      total: totalWithSiblingOn(c.month, c.studentId === studentId ? classId : null, percent).total,
    }));
  const fits = (totals: Array<{ studentId: string; total: number }>) =>
    totals.every((t) => t.total === Math.round(num(billable.find((c) => c.studentId === t.studentId)!.paid)));
  // Already paid as billed: nothing to move.
  if (fits(totalsWith(current?.studentId ?? null, current?.classId ?? null))) return null;
  const found: SiblingFit[] = [];
  for (const c of billable) {
    for (const k of c.month.classes) {
      if (!(k.sibling_basis_vnd > 0)) continue;
      if (current && current.studentId === c.studentId && current.classId === k.class_id) continue;
      const amount = totalWithSiblingOn(c.month, k.class_id, percent).amount;
      if (!(amount > 0)) continue;
      const totals = totalsWith(c.studentId, k.class_id);
      if (fits(totals)) found.push({ studentId: c.studentId, classId: k.class_id, amount, totals });
    }
  }
  if (found.length === 0) return null;
  // Two classes of ONE child can come to the same money; two children cannot both be right.
  if (found.some((f) => f.studentId !== found[0].studentId)) return null;
  found.sort((a, b) => (a.classId < b.classId ? -1 : a.classId > b.classId ? 1 : 0));
  return found[0];
}
