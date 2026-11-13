// Exact ports of the formatting in StudentStatementPrint.tsx (and
// src/lib/invoice/formatter.ts formatVND), so the printed statement says what
// the browser-print view said, character for character. Pure: no clock, no I/O.

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const VND = new Intl.NumberFormat("vi-VN");
const DAY = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "numeric", year: "numeric" });

const formatVND = (n: number): string => VND.format(n);
const money = (n: number): string => `${formatVND(n)} ₫`;
const signed = (n: number): string => (n === 0 ? "0 ₫" : `${n > 0 ? "+" : "\u2212"}${formatVND(Math.abs(n))} ₫`);

/** "2026-08" -> "Aug 2026" (dayjs "MMM YYYY") or "August 2026" (long). */
function monthLabel(ym: string, long = false): string {
  const [y, m] = ym.split("-");
  return `${(long ? MONTHS_LONG : MONTHS_SHORT)[Number(m) - 1]} ${y}`;
}

/** ISO instant -> "5 Aug 2026" (dayjs "D MMM YYYY"), Hanoi calendar day. */
function dayLabel(iso: string): string {
  const parts = DAY.formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return `${get("day")} ${MONTHS_SHORT[get("month") - 1]} ${get("year")}`;
}

interface Month { month: string; baseAmount: number; discountAmount: number; charged: number; paid: number; attendance?: { billedSessions: number; excused: number } | null }
interface Event { id: string; kind: string; amount?: number | null; occurredAt?: string | null; recordedAt: string; method?: string | null; actorId?: string | null }
interface Audit {
  student: { name: string };
  months: Month[];
  events: Event[];
  actors: Record<string, { name: string }>;
  totals: { charged: number; paid: number; balance: number };
  caveats: { unattributedEvents: number };
}

/** Everything the statement prints, already formatted; the template only lays it out. */
function statementModel(audit: Audit) {
  let running = 0;
  const rows = audit.months.map((m) => {
    running += m.paid - m.charged;
    const excused = m.attendance && m.attendance.excused > 0 ? ` (+${m.attendance.excused} exc.)` : "";
    return {
      month: monthLabel(m.month),
      sessions: m.attendance ? String(m.attendance.billedSessions) : "\u2014",
      excused,
      gross: money(m.baseAmount),
      discount: m.discountAmount > 0 ? `\u2212${formatVND(m.discountAmount)} ₫` : "\u2014",
      charged: money(m.charged),
      paid: money(m.paid),
      balance: signed(running),
    };
  });
  const first = audit.months[0]?.month;
  const last = audit.months[audit.months.length - 1]?.month;
  const payments = audit.events
    .filter((e) => e.kind === "payment" || e.kind === "correction")
    .map((e) => ({
      paidOn: e.occurredAt ? dayLabel(e.occurredAt) : "\u2014",
      entered: dayLabel(e.recordedAt),
      method: e.method ?? "\u2014",
      by: e.actorId ? (audit.actors[e.actorId]?.name ?? "Unknown") : "Not recorded",
      amount: e.amount == null ? "\u2014" : money(Math.abs(e.amount)),
    }));
  return {
    rows,
    payments,
    hasEvents: audit.events.length > 0,
    period: first && last ? `${monthLabel(first)} \u2192 ${monthLabel(last)}` : "",
    rangeLine: first && last ? `${monthLabel(first, true)} to ${monthLabel(last, true)}` : "No billed months",
    totalCharged: money(audit.totals.charged),
    totalPaid: money(audit.totals.paid),
    totalBalance: signed(audit.totals.balance),
    showCaveat: audit.caveats.unattributedEvents > 0,
  };
}

export const filters = { statementModel };
