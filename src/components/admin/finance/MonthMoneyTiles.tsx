/**
 * A month's recorded money in a row of tiles: what was recorded, how it came
 * in, what was payable, what is still owed, and the bills by label. Figures
 * come from monthTotals (src/lib/finance/paymentChecks.ts); nothing is
 * worked out here.
 */
import { formatVND } from "@/lib/money";
import type { MonthTotals } from "@/lib/finance/paymentChecks";

export function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: "danger" | "leaf" | "warn" }) {
  const toneClass = tone === "danger" ? "text-hec-danger" : tone === "leaf" ? "text-hec-leaf" : tone === "warn" ? "text-hec-warn" : "text-hec-ink";
  return (
    <div className="min-w-0 rounded-xl border border-hec-line bg-hec-surface p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-hec-ink-soft">{label}</div>
      <div className={`mt-1 truncate text-xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs tabular-nums text-hec-ink-soft">{sub}</div>}
    </div>
  );
}

export function MonthMoneyTiles({ totals }: { totals: MonthTotals }) {
  // Bill by bill: one family paying ahead does not hide another's debt.
  const rate = totals.payable > 0 ? Math.max(0, Math.round(((totals.payable - totals.outstanding) / totals.payable) * 100)) : null;
  const receipts = totals.cash + totals.bank;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile
        label="Total recorded"
        value={formatVND(totals.recorded)}
        sub={rate == null ? "nothing payable" : `${rate}% of payable collected`}
        tone="leaf"
      />
      <Tile
        label="Received this month"
        value={formatVND(receipts)}
        sub={<>Cash {formatVND(totals.cash)} · Bank {formatVND(totals.bank)}{totals.openingBalances ? <> · opening {formatVND(totals.openingBalances)}</> : null}</>}
      />
      <Tile label="Payable" value={formatVND(totals.payable)} sub={`Charged ${formatVND(totals.charged)} + carry`} />
      <Tile label="Still owed" value={formatVND(totals.outstanding)} tone={totals.outstanding > 0 ? "danger" : undefined} sub={totals.creditAhead ? `Credit ahead ${formatVND(totals.creditAhead)}` : "no credit ahead"} />
      <Tile
        label={`Bills (${totals.bills})`}
        value={`${totals.byLabel.paid} paid`}
        sub={`${totals.byLabel.partial} partial · ${totals.byLabel.issued} unpaid${totals.byLabel.credit ? ` · ${totals.byLabel.credit} credit` : ""}`}
      />
    </div>
  );
}
