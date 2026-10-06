import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayjs, nowBangkok } from "@/lib/date";
import { statusTreatment, type ClassColor } from "@/lib/classColors";
import { describeVariance } from "@/lib/sessionDuration";
import {
  STATUS_META,
  colorKeyFor,
  eventVariance,
  formatTime,
  getStatusKey,
  type CalendarEvent,
} from "./lib/calendarStatus";

/**
 * Chip geometry is FIXED and known, which is the whole point.
 *
 * The previous month grid rendered up to three ~66px cards into an ~84px box
 * with `overflow-y-auto` and `scrollbar-hide`, so roughly 1.3 cards fitted
 * where 3 were drawn. Cards were sliced in half and the hidden scrollbar gave
 * no hint that anything was cut. Here the chip height is a constant, the
 * container is measured, and we render exactly the number that fit. Nothing
 * is ever clipped because nothing is ever overdrawn.
 */
const CHIP_H = 22;
const CHIP_GAP = 3;
const MORE_H = 18;

/**
 * How many chips to draw in a box of `available` px, and how many are left.
 *
 * Either every chip fits, or we give up one slot to an honest "+N more". The
 * arithmetic accounts for the gap above that row too, so the result is always
 * a layout that fits rather than one that merely nearly fits.
 */
function planChips(available: number, total: number): { shown: number; hidden: number } {
  if (total === 0) return { shown: 0, hidden: 0 };

  const allHeight = total * CHIP_H + (total - 1) * CHIP_GAP;
  if (allHeight <= available) return { shown: total, hidden: 0 };

  // Too small to draw even the "+N more" row legibly. Drawing it anyway would
  // clip the text, which is the exact failure this component exists to avoid —
  // so draw nothing. In practice this is only the first paint, before the
  // ResizeObserver has measured; the cell's min-height keeps it from happening
  // in a settled layout, and the date button still opens the full day.
  if (available < MORE_H) return { shown: 0, hidden: 0 };

  // k chips plus a "+N more" row means k gaps.
  const k = Math.max(0, Math.floor((available - MORE_H) / (CHIP_H + CHIP_GAP)));
  const shown = Math.min(total, k);
  return { shown, hidden: total - shown };
}

/** Measures a node and reports its height, kept current across resizes. */
function useMeasuredHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setHeight(el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      setHeight(entry.contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, height] as const;
}

/* ------------------------------------------------------------------- chip */

type ColorFor = (key: string) => ClassColor;

interface ChipProps {
  event: CalendarEvent;
  onSelect?: (event: CalendarEvent) => void;
  draggable?: boolean;
  compact?: boolean;
  colorFor: ColorFor;
}

function EventChip({ event, onSelect, draggable, compact, colorFor }: ChipProps) {
  const statusKey = getStatusKey(event);
  const meta = STATUS_META[statusKey];
  // Colour identifies the CLASS; status is applied on top as treatment.
  const color = colorFor(colorKeyFor(event));
  const treatment = statusTreatment(statusKey);
  const variance = eventVariance(event);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable,
    data: { event },
  });

  const label = [
    event.class_name,
    formatTime(event.start_time),
    meta.label,
    variance ? describeVariance(variance) : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => onSelect?.(event)}
      // A real button, so sessions are reachable by keyboard. The old cards
      // were motion.divs with onClick and could not be tabbed to at all.
      aria-label={label}
      title={variance ? describeVariance(variance) : undefined}
      style={{ height: CHIP_H }}
      className={cn(
        "group/chip relative flex w-full items-center gap-1.5 overflow-hidden rounded-[5px] pl-2 pr-1.5 text-left",
        "border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        color.tint,
        color.border,
        treatment.wrapper,
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {/* The identifying rail, in the class's own colour. */}
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-[5px]", color.rail)}
      />
      <span className="shrink-0 text-[10px] font-semibold tabular-nums opacity-70">
        {formatTime(event.start_time)}
      </span>
      <span className={cn("truncate text-[11px] font-medium leading-none", color.text, treatment.label)}>
        {event.class_name}
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-1">
        {variance && (
          <AlertTriangle
            className="h-3 w-3 text-warning"
            aria-hidden
          />
        )}
        {treatment.showWarning && !variance && (
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-warning" />
        )}
        {!compact && event.enrolled_count ? (
          <span className="text-[10px] tabular-nums opacity-60">{event.enrolled_count}</span>
        ) : null}
      </span>
    </button>
  );
}

/* --------------------------------------------------------------- day cell */

interface DayCellProps {
  date: dayjs.Dayjs;
  events: CalendarEvent[];
  isCurrentMonth: boolean;
  onSelectEvent?: (event: CalendarEvent) => void;
  onOpenDay?: (dateStr: string) => void;
  onAddSession?: (date: Date) => void;
  isAdmin?: boolean;
  dense?: boolean;
  colorFor: ColorFor;
}

function DayCell({
  date,
  events,
  isCurrentMonth,
  onSelectEvent,
  onOpenDay,
  onAddSession,
  isAdmin,
  dense,
  colorFor,
}: DayCellProps) {
  const dateStr = date.format("YYYY-MM-DD");
  const isToday = date.isSame(nowBangkok(), "day");
  const [listRef, listHeight] = useMeasuredHeight<HTMLDivElement>();
  const [peekOpen, setPeekOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    disabled: !isAdmin,
    data: { date: dateStr },
  });

  const { shown, hidden } = planChips(listHeight, events.length);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group/cell relative flex min-h-[116px] flex-col rounded-xl border p-1.5 transition-colors",
        // Weekends are NOT dimmed: this school teaches Saturday and Sunday,
        // and the old grid greyed out two of its busiest days.
        isCurrentMonth ? "border-border/50 bg-card/40" : "border-transparent bg-muted/20",
        isOver && "border-primary/60 bg-primary/5 ring-2 ring-primary/30",
      )}
    >
      <div className="mb-1 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onOpenDay?.(dateStr)}
          aria-label={`Open ${date.format("D MMMM")}`}
          className={cn(
            "flex h-6 min-w-6 items-center justify-center rounded-md px-1 text-xs font-semibold tabular-nums transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isToday
              ? "bg-primary text-primary-foreground"
              : isCurrentMonth
                ? "text-foreground hover:bg-muted"
                : "text-muted-foreground/60",
          )}
        >
          {date.format("D")}
        </button>

        {isAdmin && onAddSession && isCurrentMonth && (
          <button
            type="button"
            onClick={() => onAddSession(date.toDate())}
            aria-label={`Add a session on ${date.format("D MMMM")}`}
            className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover/cell:opacity-70"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* The measured region. No overflow, no scrollbar: capacity is computed
          from this box's real height every time it changes. */}
      <div ref={listRef} className="flex min-h-0 flex-1 flex-col gap-[3px] overflow-hidden">
        {events.slice(0, shown).map((event) => (
          <EventChip
            key={event.id}
            event={event}
            onSelect={onSelectEvent}
            draggable={isAdmin}
            compact={dense}
            colorFor={colorFor}
          />
        ))}

        {hidden > 0 && (
          <Popover open={peekOpen} onOpenChange={setPeekOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                style={{ height: MORE_H }}
                className="w-full rounded-[5px] text-[10px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                +{hidden} more
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-2">
              <p className="px-1 pb-1.5 text-xs font-semibold">
                {date.format("dddd D MMMM")}
              </p>
              <div className="flex flex-col gap-[3px]">
                {events.map((event) => (
                  <EventChip
                    key={event.id}
                    event={event}
                    onSelect={(e) => {
                      setPeekOpen(false);
                      onSelectEvent?.(e);
                    }}
                    colorFor={colorFor}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- the month */

interface MonthViewProps {
  cursor: dayjs.Dayjs;
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onOpenDay?: (dateStr: string) => void;
  onAddSession?: (date: Date) => void;
  isAdmin?: boolean;
  isMobile?: boolean;
  colorFor: ColorFor;
}

export default function MonthView({
  cursor,
  events,
  onSelectEvent,
  onOpenDay,
  onAddSession,
  isAdmin,
  isMobile,
  colorFor,
}: MonthViewProps) {
  const cells = useMemo(() => {
    const start = cursor.startOf("month").startOf("isoWeek");
    const end = cursor.endOf("month").endOf("isoWeek");
    const out: dayjs.Dayjs[] = [];
    for (let d = start; d.isBefore(end) || d.isSame(end, "day"); d = d.add(1, "day")) {
      out.push(d);
    }
    return out;
  }, [cursor]);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) (map[event.date] ||= []).push(event);
    for (const key in map) {
      map[key].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return map;
  }, [events]);

  const weekdays = isMobile
    ? ["M", "T", "W", "T", "F", "S", "S"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div>
      <div className="mb-1.5 grid grid-cols-7 gap-1.5">
        {weekdays.map((day, idx) => (
          <div
            key={`${day}-${idx}`}
            className="py-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date) => {
          const dateStr = date.format("YYYY-MM-DD");
          return (
            <DayCell
              key={dateStr}
              date={date}
              events={byDate[dateStr] || []}
              isCurrentMonth={date.isSame(cursor, "month")}
              onSelectEvent={onSelectEvent}
              onOpenDay={onOpenDay}
              onAddSession={onAddSession}
              isAdmin={isAdmin}
              dense={isMobile}
              colorFor={colorFor}
            />
          );
        })}
      </div>
    </div>
  );
}
