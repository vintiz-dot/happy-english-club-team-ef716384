/**
 * A student's account, on paper.
 *
 * This is the thing you hand a parent who disagrees about what they
 * owe, so it is built to settle an argument rather than to look tidy:
 * every month, what it was for, what was taken off, what was paid, and
 * where the balance stood afterwards.
 *
 * It uses the print portal the AI progress report already established
 * (#hec-print-report attached under <body>, every sibling hidden by the
 * @media print block in index.css). One portal, one set of print rules —
 * a second mechanism would be a second thing to keep working.
 *
 * Payments are listed with both dates where both are known. The date the
 * money changed hands and the date it was typed into the system are
 * different facts, and on a statement meant to resolve a dispute that
 * difference is often the whole question.
 */
import { createPortal } from "react-dom";
import { BrandHeader } from "@/components/reports/ReportDocument";
import { formatVND } from "@/lib/invoice/formatter";
import { dayjs } from "@/lib/date";
import { actorName, type StudentAudit } from "@/hooks/useStudentAudit";

const money = (n: number) => `${formatVND(n)} ₫`;
const signed = (n: number) =>
  n === 0 ? "0 ₫" : `${n > 0 ? "+" : "−"}${formatVND(Math.abs(n))} ₫`;

export function StudentStatementPrint({ audit }: { audit: StudentAudit }) {
  let running = 0;
  const rows = audit.months.map((m) => {
    running += m.paid - m.charged;
    return { m, running };
  });

  const first = audit.months[0]?.month;
  const last = audit.months[audit.months.length - 1]?.month;

  return createPortal(
    <div id="hec-print-report" className="hidden bg-white p-2 text-black">
      <div className="space-y-4">
        <BrandHeader
          title="Account Statement"
          studentName={audit.student.name}
          periodStart={first ? dayjs(`${first}-01`).format("MMM YYYY") : null}
          periodEnd={last ? dayjs(`${last}-01`).format("MMM YYYY") : null}
        />

        <div>
          <p className="text-[11px] print-muted">
            {first && last
              ? `${dayjs(`${first}-01`).format("MMMM YYYY")} to ${dayjs(`${last}-01`).format("MMMM YYYY")}`
              : "No billed months"}
          </p>
        </div>

        {/* ------------------------------------------------- the months */}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-black/30 text-left">
              <th className="py-1 pr-2 font-semibold">Month</th>
              <th className="py-1 pr-2 text-right font-semibold">Sessions</th>
              <th className="py-1 pr-2 text-right font-semibold">Gross</th>
              <th className="py-1 pr-2 text-right font-semibold">Discount</th>
              <th className="py-1 pr-2 text-right font-semibold">Charged</th>
              <th className="py-1 pr-2 text-right font-semibold">Paid</th>
              <th className="py-1 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, running: bal }) => (
              <tr key={m.month} className="border-b border-black/10 print-avoid-break">
                <td className="py-1 pr-2">{dayjs(`${m.month}-01`).format("MMM YYYY")}</td>
                <td className="py-1 pr-2 text-right">
                  {m.attendance ? m.attendance.billedSessions : "—"}
                  {m.attendance && m.attendance.excused > 0 && (
                    <span className="print-muted"> (+{m.attendance.excused} exc.)</span>
                  )}
                </td>
                <td className="py-1 pr-2 text-right">{money(m.baseAmount)}</td>
                <td className="py-1 pr-2 text-right">
                  {m.discountAmount > 0 ? `−${formatVND(m.discountAmount)} ₫` : "—"}
                </td>
                <td className="py-1 pr-2 text-right">{money(m.charged)}</td>
                <td className="py-1 pr-2 text-right">{money(m.paid)}</td>
                <td className="py-1 text-right font-semibold">{signed(bal)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-black/40 font-bold">
              <td className="py-1 pr-2">Total</td>
              <td className="py-1 pr-2" />
              <td className="py-1 pr-2" />
              <td className="py-1 pr-2" />
              <td className="py-1 pr-2 text-right">{money(audit.totals.charged)}</td>
              <td className="py-1 pr-2 text-right">{money(audit.totals.paid)}</td>
              <td className="py-1 text-right">{signed(audit.totals.balance)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-[10px] print-muted">
          Balance is cumulative. A positive figure means the account is in credit; a negative
          figure is the amount outstanding at the end of that month.
        </p>

        {/* ----------------------------------------------- the payments */}
        {audit.events.length > 0 && (
          <div className="print-avoid-break">
            <h3 className="mb-1 text-xs font-bold">Payments received</h3>
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-black/30 text-left">
                  <th className="py-1 pr-2 font-semibold">Paid on</th>
                  <th className="py-1 pr-2 font-semibold">Entered</th>
                  <th className="py-1 pr-2 font-semibold">Method</th>
                  <th className="py-1 pr-2 font-semibold">Recorded by</th>
                  <th className="py-1 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {audit.events
                  .filter((e) => e.kind === "payment" || e.kind === "correction")
                  .map((e) => (
                    <tr key={e.id} className="border-b border-black/10">
                      <td className="py-1 pr-2">
                        {e.occurredAt ? dayjs(e.occurredAt).format("D MMM YYYY") : "—"}
                      </td>
                      <td className="py-1 pr-2">{dayjs(e.recordedAt).format("D MMM YYYY")}</td>
                      <td className="py-1 pr-2">{e.method ?? "—"}</td>
                      <td className="py-1 pr-2">{actorName(audit.actors, e.actorId)}</td>
                      <td className="py-1 text-right">
                        {e.amount == null ? "—" : money(Math.abs(e.amount))}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {audit.caveats.unattributedEvents > 0 && (
          <p className="text-[10px] print-muted">
            Some entries predate this system&rsquo;s record of who entered them and are shown as
            &ldquo;not recorded&rdquo;.
          </p>
        )}

        <p className="text-center text-[10px] print-muted">
          Happy English Club &middot; hanoienglish.com &middot; statement for {audit.student.name}
        </p>
      </div>
    </div>,
    document.body,
  );
}
