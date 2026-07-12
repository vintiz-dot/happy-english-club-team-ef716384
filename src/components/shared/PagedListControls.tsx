import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const HOMEWORK_PAGE_SIZE = 20;

/**
 * Slices a list into pages and exposes the controls. Page is 1-indexed.
 * Resets to page 1 whenever the input list reference changes — important
 * when filters/sorts upstream produce a new array, otherwise we end up
 * pointing at an out-of-range page.
 */
export function usePagedList<T>(items: T[], pageSize: number = HOMEWORK_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Snap back to a valid page when items shrink.
  useEffect(() => {
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const slice = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return {
    page,
    setPage,
    totalPages,
    total,
    pageSize,
    slice,
    rangeLabel: total === 0
      ? "0"
      : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} of ${total}`,
  };
}

interface PagedListControlsProps {
  page: number;
  totalPages: number;
  total: number;
  rangeLabel: string;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Touch-friendly pager: chunky 44px tap targets, range readout, jump-to
 * controls, hides itself when there's only one page.
 */
export function PagedListControls({
  page,
  totalPages,
  total,
  rangeLabel,
  onPageChange,
  className,
}: PagedListControlsProps) {
  if (totalPages <= 1) return null;

  const pages = buildPageWindow(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground text-center sm:text-left tabular-nums">
        Showing <span className="font-medium text-foreground">{rangeLabel}</span>
      </p>
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 gap-1"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {pages.map((p, idx) =>
          p === "…" ? (
            <span key={`gap-${idx}`} className="px-1 text-muted-foreground select-none">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "default" : "outline"}
              size="sm"
              className="h-11 w-11 sm:h-9 sm:w-9 p-0 tabular-nums"
              onClick={() => onPageChange(p)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          ),
        )}

        <Button
          variant="outline"
          size="sm"
          className="h-11 w-11 sm:h-9 sm:w-auto sm:px-3 gap-1"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Build a sliding window of page numbers with ellipses for long lists.
 * Always shows first, last, current ± 1.
 */
function buildPageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);
  if (left > 2) out.push("…");
  for (let i = left; i <= right; i++) out.push(i);
  if (right < total - 1) out.push("…");
  out.push(total);
  return out;
}
