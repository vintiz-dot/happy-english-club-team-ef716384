/**
 * One student's account, opened up.
 *
 * The shape follows the question an audit actually asks, which is never
 * "what is the total" but "why is this number what it is". So the month
 * row carries the summary and every month opens into the four things
 * that produced it: which classes and how many sessions were billed,
 * what was taken off, what was carried in, and who paid what when.
 *
 * Two honesty rules run through this file, because a money screen that
 * overstates its certainty is worse than no screen.
 *
 *  - Sessions are counted from attendance marks, not from the invoice's
 *    own sessions_count, which is built from Present and Absent only and
 *    so loses every Late — a session that IS charged for. Where the two
 *    disagree the row says so rather than silently picking one.
 *  - Most payments here were recorded as a bump to a running total
 *    rather than a row of their own, so the person and the date survive
 *    only in the audit trail. Those entries are marked, and an entry
 *    nobody can be attributed to says "not recorded" instead of
 *    inventing a name.
 */
import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Lock,
  Printer,
  Receipt,
  TriangleAlert,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatVND } from "@/lib/invoice/formatter";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import {
  actorName,
  useStudentAudit,
  type AuditEvent,
  type AuditMonth,
  type StudentAudit,
} from "@/hooks/useStudentAudit";

/* ------------------------------------------------------------- helpers */

const monthLabel = (m: string) => dayjs(`${m}-01`).format("MMM YYYY");

/** Money, signed and coloured: ahead is good, owing is not. */
function Signed({ value, className }: { value: number; className?: string }) {
  if (value === 0) return <span className={cn("text-muted-foreground", className)}>0 ₫</span>;
  const ahead = value > 0;
  return (
    <span className={cn("font-semibold tabular-nums", ahead ? "text-emerald-600" : "text-red-600", className)}>
      {ahead ? "+" : "−"}
      {formatVND(Math.abs(value))} ₫
    </span>
  );
}

function Money({ value, tone, className }: { value: number; tone?: "charge" | "paid"; className?: string }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        tone === "charge" && value > 0 && "text-red-600",
        tone === "paid" && value > 0 && "text-emerald-600",
        value === 0 && "text-muted-foreground",
        className,
      )}
    >
      {formatVND(value)} ₫
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

/** Where a figure came from, since not all of them are equally solid. */
function ProvenanceBadge({ event }: { event: AuditEvent }) {
  const map = {
    payments: { label: "payment record", tone: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" },
    ledger: { label: "ledger", tone: "border-sky-500/40 text-sky-700 dark:text-sky-400" },
    audit_log: { label: "from audit trail", tone: "border-amber-500/40 text-amber-700 dark:text-amber-400" },
  }[event.provenance];

  return (
    <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[10px] font-normal", map.tone)}>
      {map.label}
    </Badge>
  );
}

/* ------------------------------------------------------- payment lines */

function EventRow({ event, audit }: { event: AuditEvent; audit: StudentAudit }) {
  const who = actorName(audit.actors, event.actorId);
  const paidOn = event.occurredAt ? dayjs(event.occurredAt).format("D MMM YYYY") : null;
  const enteredOn = dayjs(event.recordedAt).format("D MMM YYYY, HH:mm");

  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1 border-b py-2 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{event.label}</span>
          <ProvenanceBadge event={event} />
          {!event.exact && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal text-muted-foreground">
              amount inferred
            </Badge>
          )}
        </span>

        <span className="text-xs text-muted-foreground">
          {/* The two dates are genuinely different facts and conflating
              them is how a reconciliation goes wrong. */}
          {paidOn ? <>Paid {paidOn} · </> : null}
          Entered {enteredOn}
          {event.method ? <> · {event.method}</> : null}
        </span>

        <span className={cn("text-xs", event.actorId ? "text-muted-foreground" : "italic text-amber-600")}>
          by {who}
        </span>

        {event.memo && <span className="text-xs italic text-muted-foreground">“{event.memo}”</span>}
      </span>

      <span className="shrink-0 text-right">
        {event.amount == null ? (
          <span className="text-sm text-muted-foreground">—</span>
        ) : (
          <Money value={Math.abs(event.amount)} tone={event.amount >= 0 ? "paid" : "charge"} className="text-sm font-semibold" />
        )}
      </span>
    </li>
  );
}

/* ---------------------------------------------------------- month rows */

function MonthRow({
  month,
  audit,
  runningBalance,
}: {
  month: AuditMonth;
  audit: StudentAudit;
  runningBalance: number;
}) {
  const [open, setOpen] = useState(false);

  const att = month.attendance;
  const billed = att?.billedSessions ?? 0;
  const stored = month.classes.reduce((s, c) => s + c.sessionsCountStored, 0);
  // Late is billed but is left out of the stored count, so a mismatch
  // here is expected rather than alarming — but it must be visible.
  const countsDisagree = !!att && stored > 0 && stored !== billed;

  const payable = month.charged + month.carryInDebt - month.carryInCredit;
  const monthEvents = audit.events.filter((e) => e.month === month.month);

  return (
    <>
      <tr
        className={cn("cursor-pointer border-b transition-colors hover:bg-muted/50", open && "bg-muted/40")}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-2 pl-2 pr-1">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
        </td>
        <td className="py-2 pr-3 text-sm font-medium whitespace-nowrap">
          {monthLabel(month.month)}
          {month.source === "snapshot" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="ml-1.5 inline h-3 w-3 text-muted-foreground" aria-hidden />
                </TooltipTrigger>
                <TooltipContent>Closed and frozen — this figure will not change</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </td>
        <td className="py-2 pr-3 text-right text-sm tabular-nums">
          {att ? (
            <span className={cn(countsDisagree && "text-amber-600")}>
              {billed}
              {att.excused > 0 && <span className="text-muted-foreground"> +{att.excused}e</span>}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2 pr-3 text-right text-sm">
          <Money value={month.charged} tone="charge" />
        </td>
        <td className="py-2 pr-3 text-right text-sm">
          {month.discountAmount > 0 ? (
            <span className="tabular-nums text-sky-600">−{formatVND(month.discountAmount)} ₫</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="py-2 pr-3 text-right text-sm">
          <Money value={month.paid} tone="paid" />
        </td>
        <td className="py-2 pr-2 text-right text-sm">
          <Signed value={runningBalance} />
        </td>
      </tr>

      {open && (
        <tr className="border-b bg-muted/20">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid gap-5 md:grid-cols-2">
              {/* ------------------------------------- what was charged */}
              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Receipt className="h-3.5 w-3.5" aria-hidden />
                  What was billed
                </h4>

                {month.classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No class breakdown recorded for this month.</p>
                ) : (
                  <ul className="mb-2 space-y-1">
                    {month.classes.map((c) => (
                      <li key={c.classId || c.className} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate">
                          {c.className}
                          <span className="ml-1.5 text-xs text-muted-foreground">
                            {c.sessionsCountStored} session{c.sessionsCountStored === 1 ? "" : "s"}
                          </span>
                        </span>
                        <Money value={c.amount} className="shrink-0" />
                      </li>
                    ))}
                  </ul>
                )}

                <div className="border-t pt-1">
                  <Field label="Gross">{<Money value={month.baseAmount} />}</Field>
                  <Field label="Discounts">
                    {month.discountAmount > 0 ? (
                      <span className="tabular-nums text-sky-600">−{formatVND(month.discountAmount)} ₫</span>
                    ) : (
                      <span className="text-muted-foreground">none</span>
                    )}
                  </Field>
                  <Field label="Charged this month">
                    <Money value={month.charged} tone="charge" className="font-semibold" />
                  </Field>
                </div>

                {countsDisagree && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-md border border-amber-400/40 bg-amber-50 p-2 text-xs dark:bg-amber-950/30">
                    <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
                    <span>
                      The invoice counts <strong>{stored}</strong> billed session
                      {stored === 1 ? "" : "s"} but attendance shows <strong>{billed}</strong>. A
                      session marked <em>Late</em> is charged for but is left out of the invoice's
                      own count, which usually explains the gap.
                    </span>
                  </p>
                )}
              </section>

              {/* ------------------------------------ attendance detail */}
              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  Attendance
                </h4>
                {att ? (
                  <>
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="border-emerald-500/40">{att.present} present</Badge>
                      {att.late > 0 && <Badge variant="outline" className="border-amber-500/40">{att.late} late</Badge>}
                      {att.absent > 0 && <Badge variant="outline" className="border-red-500/40">{att.absent} absent</Badge>}
                      {att.excused > 0 && <Badge variant="outline" className="border-sky-500/40">{att.excused} excused</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <strong>{att.billedSessions}</strong> billed
                      {att.excused > 0 && <> · <strong>{att.excused}</strong> excused and not charged</>}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">No attendance recorded for this month.</p>
                )}

                <h4 className="mb-2 mt-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Wallet className="h-3.5 w-3.5" aria-hidden />
                  Balance
                </h4>
                <Field label="Brought forward">
                  <Signed value={month.carryInCredit - month.carryInDebt} />
                </Field>
                <Field label="Payable">
                  <Money value={Math.max(0, payable)} className="font-semibold" />
                </Field>
                <Field label="Paid">
                  <Money value={month.paid} tone="paid" />
                </Field>
                <Field label="Carried out">
                  <Signed value={month.carryOutCredit - month.carryOutDebt} />
                </Field>
              </section>
            </div>

            {/* ------------------------------------------ money events */}
            <section className="mt-4 border-t pt-3">
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payments and changes in {monthLabel(month.month)}
              </h4>
              {monthEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {month.paid > 0
                    ? "This month shows money received, but no individual payment record survives for it — only the running total on the invoice."
                    : "Nothing recorded."}
                </p>
              ) : (
                <ul>
                  {monthEvents.map((e) => (
                    <EventRow key={e.id} event={e} audit={audit} />
                  ))}
                </ul>
              )}
            </section>

            {/* ------------------------------------------- provenance */}
            <section className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t pt-2 text-xs text-muted-foreground">
              <span>
                Source: {month.source === "snapshot" ? "closed snapshot" : "live invoice"}
                {month.closedAt && <> · closed {dayjs(month.closedAt).format("D MMM YYYY")} by {actorName(audit.actors, month.closedBy)}</>}
              </span>
              {month.confirmedAt && (
                <span>
                  Confirmed {dayjs(month.confirmedAt).format("D MMM YYYY")} by{" "}
                  {actorName(audit.actors, month.confirmedBy)}
                </span>
              )}
              {month.invoiceNumber && <span>Invoice {month.invoiceNumber}</span>}
            </section>
          </td>
        </tr>
      )}
    </>
  );
}

/* ----------------------------------------------------------- the panel */

export function StudentAuditPanel({
  studentId,
  onPrint,
}: {
  studentId: string;
  onPrint?: (audit: StudentAudit) => void;
}) {
  const { data: audit, isLoading, error } = useStudentAudit(studentId, true);

  if (isLoading) return <Loading size="sm" message="Building the audit" />;

  if (error) {
    return (
      <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{(error as Error).message}</span>
      </p>
    );
  }

  if (!audit) return null;

  if (audit.months.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        No invoices exist for this student yet, so there is nothing to audit. A month only appears
        here once tuition has been calculated for it.
      </p>
    );
  }

  // The balance column is cumulative, which is what makes the table
  // readable: you can see the debt build and clear rather than reading
  // twelve independent numbers.
  let running = 0;
  const rows = audit.months.map((m) => {
    running += m.paid - m.charged;
    return { month: m, runningBalance: running };
  });

  const unattributed = audit.caveats.unattributedEvents;

  return (
    <div className="space-y-3">
      {/* ------------------------------------------------------ totals */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="text-sm">
          <span className="text-muted-foreground">Charged </span>
          <Money value={audit.totals.charged} tone="charge" className="font-semibold" />
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Paid </span>
          <Money value={audit.totals.paid} tone="paid" className="font-semibold" />
        </span>
        <span className="text-sm">
          <span className="text-muted-foreground">Balance </span>
          <Signed value={audit.totals.balance} />
        </span>
        <span className="text-xs text-muted-foreground">
          {audit.totals.months} month{audit.totals.months === 1 ? "" : "s"} on record
        </span>

        {onPrint && (
          <Button size="sm" variant="outline" className="ml-auto gap-1.5" onClick={() => onPrint(audit)}>
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Statement
          </Button>
        )}
      </div>

      {/* ------------------------------------------------- the months */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full min-w-[640px] text-left">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-8" />
              <th className="py-2 pr-3 font-medium">Month</th>
              <th className="py-2 pr-3 text-right font-medium">Sessions</th>
              <th className="py-2 pr-3 text-right font-medium">Charged</th>
              <th className="py-2 pr-3 text-right font-medium">Discount</th>
              <th className="py-2 pr-3 text-right font-medium">Paid</th>
              <th className="py-2 pr-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ month, runningBalance }) => (
              <MonthRow key={month.month} month={month} audit={audit} runningBalance={runningBalance} />
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td />
              <td className="py-2 pr-3 text-sm">Total</td>
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3 text-right text-sm">
                <Money value={audit.totals.charged} tone="charge" />
              </td>
              <td className="py-2 pr-3" />
              <td className="py-2 pr-3 text-right text-sm">
                <Money value={audit.totals.paid} tone="paid" />
              </td>
              <td className="py-2 pr-2 text-right text-sm">
                <Signed value={audit.totals.balance} />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Sessions counts billed lessons; <span className="font-medium">+Ne</span> is excused lessons,
        which are not charged. Balance is cumulative — a running total, not the month on its own.
      </p>

      {/* ------------------------------------------------- the caveat */}
      {unattributed > 0 && (
        <p className="flex items-start gap-2 rounded-lg border border-amber-400/40 bg-amber-50 p-2.5 text-xs dark:bg-amber-950/30">
          <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden />
          <span>
            {unattributed} entr{unattributed === 1 ? "y has" : "ies have"} no recorded author.
            Attribution only began when the audit trail was switched on, and payments entered as a
            running total rather than their own record keep no author at all. Those are shown as
            “not recorded” rather than guessed at.
          </span>
        </p>
      )}
    </div>
  );
}
