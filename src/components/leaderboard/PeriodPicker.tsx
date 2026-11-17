/**
 * Week / Month / Term / All time, and which one.
 *
 * Dates are Hanoi dates and the lists are built with year/month
 * arithmetic (src/lib/leaderboard/board.ts): the old month list stepped
 * back with Date.setMonth from today, which on the 31st skipped a month
 * and showed another twice, and read the month in UTC, so early on the
 * 1st it opened on last month.
 *
 * Term appears only once an admin has set term dates.
 */
import { useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  hanoiToday,
  recentMonths,
  recentWeeks,
  termOptions,
  type PeriodChoice,
  type PeriodKind,
} from "@/lib/leaderboard/board";
import { useSchoolTerms } from "@/hooks/useClassBoard";
import { cn } from "@/lib/utils";

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

const KINDS: Array<{ kind: PeriodKind; label: string }> = [
  { kind: "week", label: "Week" },
  { kind: "month", label: "Month" },
  { kind: "term", label: "Term" },
  { kind: "all", label: "All time" },
];

/** The default: this month. */
export const THIS_MONTH: PeriodChoice = { kind: "month", anchor: null };

export function PeriodPicker({
  value,
  onChange,
  className,
  monthOnly = false,
}: {
  value: PeriodChoice;
  onChange: (next: PeriodChoice) => void;
  className?: string;
  /** The server predates the engine and has month boards only. */
  monthOnly?: boolean;
}) {
  const today = hanoiToday();
  const { data: terms = [] } = useSchoolTerms();
  const termList = useMemo(() => termOptions(terms, today), [terms, today]);

  const options = useMemo(() => {
    if (value.kind === "week") return recentWeeks(today, 8);
    if (value.kind === "month") return recentMonths(today, 12);
    if (value.kind === "term") return termList;
    return [];
  }, [value.kind, today, termList]);

  const kinds = KINDS.filter((k) => (monthOnly ? k.kind === "month" : k.kind !== "term" || termList.length > 0));
  // null anchor = "the current one", which is the first option.
  const selected = value.anchor ?? options[0]?.anchor ?? "";

  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}>
      <div
        role="radiogroup"
        aria-label="Period"
        className="inline-flex min-w-0 rounded-hec-md border border-hec-line bg-hec-raised p-0.5"
      >
        {kinds.map((k) => {
          const on = value.kind === k.kind;
          return (
            <button
              key={k.kind}
              type="button"
              role="radio"
              aria-checked={on}
              // Term: the latest term that has started, named, so that between
              // terms (no term covers today) it still opens the last one.
              onClick={() => onChange({ kind: k.kind, anchor: k.kind === "term" ? termList[0]?.anchor ?? null : null })}
              className={cn(
                "min-h-[2.25rem] whitespace-nowrap rounded-hec-sm px-2.5 text-hec-small font-medium transition-colors sm:px-3",
                on ? "bg-hec-action text-hec-on-action" : "text-hec-ink-soft hover:text-hec-ink",
                FOCUS,
              )}
            >
              {k.label}
            </button>
          );
        })}
      </div>
      {options.length > 0 && (
        <Select value={selected} onValueChange={(anchor) => onChange({ kind: value.kind, anchor })}>
          <SelectTrigger
            aria-label={value.kind === "week" ? "Which week" : value.kind === "term" ? "Which term" : "Which month"}
            className="min-h-hec-target w-auto min-w-[9.5rem] rounded-hec-md border-hec-line-strong bg-hec-raised text-hec-small text-hec-ink focus:ring-0 focus:ring-offset-0"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-hec-md border-hec-line bg-hec-raised text-hec-ink shadow-hec-2">
            {options.map((o) => (
              <SelectItem key={o.anchor} value={o.anchor}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
