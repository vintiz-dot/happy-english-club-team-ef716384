// Builds the student's month picker: every month they were enrolled, plus any
// month with an invoice or attendance, newest first, with class names.

export interface EnrollmentSpan {
  start_date: string | null;
  end_date: string | null;
  className: string | null;
}

export interface MonthOption {
  value: string; // YYYY-MM
  label: string; // "October 2026"
  classes: string[];
}

const ym = (d: string) => d.slice(0, 7);

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}

export function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function buildEnrolledMonths(
  enrollments: EnrollmentSpan[],
  extra: { month: string; className?: string | null }[],
  currentMonth: string,
): MonthOption[] {
  const map = new Map<string, Set<string>>();
  const add = (m: string, cls?: string | null) => {
    if (!map.has(m)) map.set(m, new Set());
    if (cls) map.get(m)!.add(cls);
  };
  for (const e of enrollments) {
    if (!e.start_date) continue;
    let m = ym(e.start_date);
    const end = e.end_date ? ym(e.end_date) : (currentMonth > m ? currentMonth : m);
    for (let i = 0; m <= end && i < 600; i++, m = nextMonth(m)) add(m, e.className);
  }
  for (const x of extra) add(ym(x.month), x.className);
  return [...map.keys()]
    .sort((a, b) => b.localeCompare(a))
    .map((value) => ({ value, label: monthLabel(value), classes: [...map.get(value)!].sort() }));
}

export function defaultMonth(options: MonthOption[], currentMonth: string): string {
  if (options.some((o) => o.value === currentMonth)) return currentMonth;
  const past = options.find((o) => o.value <= currentMonth);
  return past?.value ?? options[0]?.value ?? currentMonth;
}
