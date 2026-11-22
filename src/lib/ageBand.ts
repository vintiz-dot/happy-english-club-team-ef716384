/**
 * The age engine (docs/EXPERIENCE_DESIGN_BRIEF.md Part F1).
 *
 * One pure function from a child's date of birth to the band that decides the
 * form of their screens (never their access). It imports nothing, takes plain
 * numbers for "today" so it can be tested, and replaces the old
 * isYoungLearner() of StudentDashboard.
 *
 * Grade, not birthday. A Vietnamese child starts Grade 1 in the September of
 * the year they turn 6. In school year Y (September Y to August Y+1) the grade
 * is Y - birth year - 5, so classmates share a band and nobody's screen
 * changes on their birthday. The band changes only on 1 September.
 *
 * The band is derived in the browser from the child's own row. Never store it,
 * never send it anywhere, and never add date of birth to anything a
 * classmate's device receives.
 */

export type AgeBand = "early" | "young" | "junior" | "teen";

export interface AgeProfile {
  band: AgeBand;
  /** Vietnamese school grade this school year; 0 or below = pre-school. null when unknown. */
  grade: number | null;
  /** false when date_of_birth is missing or implausible */
  known: boolean;
  /** the design system's young scale: true for early and young */
  youngScale: boolean;
}

/** Computed age outside this range is treated as a wrong date, not a child. */
const MIN_AGE = 3;
const MAX_AGE = 19;

const UNKNOWN: AgeProfile = { band: "junior", grade: null, known: false, youngScale: false };

function parseDate(value: string | null | undefined): { year: number; month: number; day: number } | null {
  if (typeof value !== "string") return null;
  // "YYYY-MM-DD", optionally followed by a time (an ISO timestamp from the database)
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(value.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1) return null;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return null;
  return { year, month, day };
}

/**
 * @param dateOfBirth `students.date_of_birth`, "YYYY-MM-DD" (nullable)
 * @param today the date in Hanoi: `{ year, month }` with month 1-12 (use dayjs from "@/lib/date" at the call site)
 */
export function ageProfile(
  dateOfBirth: string | null | undefined,
  today: { year: number; month: number },
): AgeProfile {
  const born = parseDate(dateOfBirth);
  if (!born) return UNKNOWN;

  // Age in whole years at `today` (the day of the month is not needed: a date within
  // the current month is a newborn, which is implausible either way).
  const age = today.year - born.year - (today.month < born.month ? 1 : 0);
  if (age < MIN_AGE || age > MAX_AGE) return UNKNOWN;

  const schoolYear = today.month >= 9 ? today.year : today.year - 1;
  const grade = schoolYear - born.year - 5;

  const band: AgeBand = grade <= 1 ? "early" : grade <= 3 ? "young" : grade <= 6 ? "junior" : "teen";
  return { band, grade, known: true, youngScale: band === "early" || band === "young" };
}
