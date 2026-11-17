/**
 * Every child on the board and their points, all at once.
 *
 * The three display styles (Star Board, High Scores, Night League) show a
 * podium and then the rest a page at a time, so nobody ever sees the whole
 * class together (owner, 17 Nov 2026: "i want a list of ALL the students and
 * their points"). This lists the same rows, in the server's order, with the
 * server's rank and points - nothing is ranked here. A child with no points
 * yet has no rank and shows "–".
 *
 * `big` is the projector / class window version: larger type, more columns.
 */
import { cn } from "@/lib/utils";
import type { BoardRow } from "./types";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-US") : n.toFixed(1));

export function EveryoneList({
  rows,
  title = "Everyone",
  pointsLabel = "points",
  big = false,
  onSelect,
}: {
  rows: BoardRow[];
  title?: string;
  pointsLabel?: string;
  big?: boolean;
  onSelect?: (studentId: string) => void;
}) {
  if (!rows.length) return null;
  return (
    <section
      aria-label={title}
      className={cn(
        "rounded-hec-lg border border-hec-line bg-hec-surface",
        big ? "flex h-full flex-col p-6 sm:p-10" : "mt-4 p-4 sm:p-5",
      )}
    >
      <div className={cn("mb-3 flex items-baseline justify-between gap-3", big && "pr-44")}>
        <h3 className={cn("font-display font-medium text-hec-ink", big ? "text-4xl" : "text-hec-h3")}>{title}</h3>
        <span className={cn("tabular-nums text-hec-ink-soft", big ? "text-xl" : "text-hec-caption")}>
          {rows.length} {rows.length === 1 ? "student" : "students"} · {pointsLabel}
        </span>
      </div>
      <ol
        className={cn(
          "grid gap-x-6 gap-y-1",
          big
            ? "min-h-0 flex-1 auto-rows-min grid-cols-2 content-start lg:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2",
        )}
      >
        {rows.map((r) => {
          const Row = onSelect ? "button" : "div";
          return (
            <li key={r.studentId}>
              <Row
                {...(onSelect ? { type: "button" as const, onClick: () => onSelect(r.studentId) } : {})}
                className={cn(
                  "flex w-full min-w-0 items-center gap-3 rounded-hec-md text-left",
                  big ? "px-3 py-2.5" : "min-h-hec-target px-2 py-1.5",
                  r.isSelf ? "bg-hec-sunken ring-1 ring-hec-brass" : onSelect ? "hover:bg-hec-sunken" : "",
                  onSelect &&
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
                )}
              >
                <span
                  className={cn(
                    "shrink-0 text-right font-semibold tabular-nums text-hec-ink-soft",
                    big ? "w-12 text-3xl" : "w-7 text-hec-small",
                  )}
                >
                  {r.rank ? `${r.tied ? "=" : ""}${r.rank}` : "–"}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "grid shrink-0 place-items-center rounded-full font-semibold text-white",
                    big ? "h-12 w-12 text-xl" : "h-8 w-8 text-hec-small",
                  )}
                  style={{ background: r.color }}
                >
                  {r.initial}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 whitespace-normal break-words font-medium text-hec-ink",
                    big ? "text-2xl" : "text-hec-small",
                  )}
                >
                  {r.name}
                  {r.isSelf && <span className="ml-1 font-normal text-hec-ink-soft">(you)</span>}
                </span>
                <span className={cn("shrink-0 font-semibold tabular-nums text-hec-ink", big ? "text-3xl" : "text-hec-body")}>
                  {fmt(r.points)}
                </span>
              </Row>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
