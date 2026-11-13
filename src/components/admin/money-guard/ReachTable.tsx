import { reachRows, type MoneyPlan } from "@/lib/moneyGuard";
import { formatVnd } from "@/lib/sessionGuard";

/**
 * The bills a money change reaches, AS STORED (the preview's own copy): one
 * row per child and month, its state in words and the recorded payment. No
 * figure is worked out here; the new bills come from calculate-tuition
 * after the change.
 */
export function ReachTable({ plan, names }: { plan: MoneyPlan; names?: Record<string, string> }) {
  const rows = reachRows(plan);
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">Bills this reaches</h3>
      <ul className="space-y-1.5" aria-label="Bills this change reaches">
        {rows.map((r) => (
          <li key={r.key} className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
            <span className="min-w-0 break-words font-medium">{names?.[r.studentId] ?? "A child"} - {r.month}</span>
            <span className="text-muted-foreground">
              {r.stateText}
              {r.total !== null ? ` - bill ${formatVnd(r.total)}` : ""}
              {r.recorded !== null && r.recorded > 0 ? `, paid ${formatVnd(r.recorded)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
