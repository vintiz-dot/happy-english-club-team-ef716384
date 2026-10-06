import { useCallback, useEffect, useMemo, useState } from "react";
import { dayjs } from "@/lib/date";

export type CalendarViewType = "month" | "week" | "day" | "agenda";

const STORAGE_KEY = "hec.calendar.view";
const VALID: CalendarViewType[] = ["month", "week", "day", "agenda"];

/**
 * Remembers the view the person last used, per browser.
 *
 * localStorage throws in private windows and when site data is blocked, and
 * returns nothing on a first visit, so every access is guarded and the
 * fallback has to be a view that stands on its own. That is "week": this
 * school's timetable is a fixed weekly rhythm, so the time grid is the most
 * useful thing to land on before we know anything about the person.
 */
export function usePersistedView(fallback: CalendarViewType = "week") {
  const [view, setViewState] = useState<CalendarViewType>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && VALID.includes(stored as CalendarViewType)) {
        return stored as CalendarViewType;
      }
    } catch {
      /* private window, or site data blocked - fall through */
    }
    return fallback;
  });

  const setView = useCallback((next: CalendarViewType) => {
    setViewState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* the view still changes for this session; it just will not persist */
    }
  }, []);

  return [view, setView] as const;
}

export interface VisibleRange {
  start: string;
  end: string;
}

/**
 * The dates actually on screen for a given view.
 *
 * THIS IS THE FIX FOR A REAL BUG. The old calendar always fetched a calendar
 * MONTH, while the week and day views navigated their own cursor without
 * telling the parent. Paging the week view across a month boundary therefore
 * showed an empty calendar: the component asked for days it had never
 * fetched, and nothing ever triggered a refetch. Fetching by what is visible
 * makes every view self-consistent.
 */
export function getVisibleRange(view: CalendarViewType, cursor: dayjs.Dayjs): VisibleRange {
  switch (view) {
    case "week":
      return {
        start: cursor.startOf("isoWeek").format("YYYY-MM-DD"),
        end: cursor.endOf("isoWeek").format("YYYY-MM-DD"),
      };
    case "day":
      return {
        start: cursor.format("YYYY-MM-DD"),
        end: cursor.format("YYYY-MM-DD"),
      };
    case "month":
      // The month grid shows leading/trailing days from adjacent months, and
      // those cells must not be silently empty.
      return {
        start: cursor.startOf("month").startOf("isoWeek").format("YYYY-MM-DD"),
        end: cursor.endOf("month").endOf("isoWeek").format("YYYY-MM-DD"),
      };
    case "agenda":
    default:
      return {
        start: cursor.startOf("month").format("YYYY-MM-DD"),
        end: cursor.endOf("month").format("YYYY-MM-DD"),
      };
  }
}

/** Keeps the parent's data query in step with whatever is on screen. */
export function useVisibleRange(
  view: CalendarViewType,
  cursor: dayjs.Dayjs,
  onRangeChange?: (range: VisibleRange) => void,
) {
  const range = useMemo(() => getVisibleRange(view, cursor), [view, cursor]);

  useEffect(() => {
    onRangeChange?.(range);
    // Comparing the serialised range, not the callback, so a parent that
    // re-creates its handler each render cannot cause a fetch loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.start, range.end]);

  return range;
}

/** Step the cursor by one unit of whatever view is showing. */
export function stepCursor(
  view: CalendarViewType,
  cursor: dayjs.Dayjs,
  direction: 1 | -1,
): dayjs.Dayjs {
  const unit = view === "week" ? "week" : view === "day" ? "day" : "month";
  return direction === 1 ? cursor.add(1, unit) : cursor.subtract(1, unit);
}

export function cursorLabel(view: CalendarViewType, cursor: dayjs.Dayjs, compact = false): string {
  if (view === "day") return cursor.format(compact ? "ddd D MMM" : "dddd D MMMM YYYY");
  if (view === "week") {
    const start = cursor.startOf("isoWeek");
    const end = cursor.endOf("isoWeek");
    if (start.isSame(end, "month")) {
      return `${start.format("D")} – ${end.format(compact ? "D MMM" : "D MMMM YYYY")}`;
    }
    return `${start.format("D MMM")} – ${end.format(compact ? "D MMM" : "D MMM YYYY")}`;
  }
  return cursor.format(compact ? "MMM YYYY" : "MMMM YYYY");
}
