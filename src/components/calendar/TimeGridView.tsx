import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { dayjs, nowBangkok } from "@/lib/date";
import {
  STATUS_META,
  deriveTimeWindow,
  formatTime,
  getStatusKey,
  layoutDay,
  toMinutes,
  type CalendarEvent,
} from "./lib/calendarStatus";

/**
 * The week and day views, as an actual time axis.
 *
 * What was here before called itself a week view but was seven stacked
 * lists: no time axis, so two classes at 17:30 looked identical to one at
 * 16:15 and one at 19:30, and a genuine clash was invisible. On a timetable
 * that repeats every week, the shape of the week IS the information.
 *
 * The axis is derived from the data (see deriveTimeWindow), so for a school
 * teaching 16:00-21:00 this is ten rows of signal rather than forty-eight
 * rows that are mostly empty.
 */
const SLOT_MIN = 30;
const SLOT_H = 32;
const PX_PER_MIN = SLOT_H / SLOT_MIN;
const GUTTER = "3.5rem";

/* ------------------------------------------------------------------ block */

function EventBlock({
  positioned,
  onSelect,
  draggable,
}: {
  positioned: ReturnType<typeof layoutDay>[number];
  onSelect?: (event: CalendarEvent) => void;
  draggable?: boolean;
}) {
  const { event, top, height, leftPct, widthPct } = positioned;
  const meta = STATUS_META[getStatusKey(event)];

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable,
    data: { event },
  });

  // Only show what there is genuinely room for.
  const showTeacher = height >= 56;
  const showMeta = height >= 44;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => onSelect?.(event)}
      aria-label={`${event.class_name}, ${formatTime(event.start_time)} to ${formatTime(
        event.end_time,
      )}, ${meta.label}`}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={cn(
        "absolute overflow-hidden rounded-lg border pl-2 pr-1.5 py-1 text-left",
        "transition-shadow hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        meta.tint,
        meta.border,
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-lg", meta.rail)}
      />
      <div className={cn("truncate text-[11px] font-semibold leading-tight", meta.text)}>
        {event.class_name}
      </div>
      {showMeta && (
        <div className="truncate text-[10px] leading-tight text-muted-foreground tabular-nums">
          {formatTime(event.start_time)}–{formatTime(event.end_time)}
          {event.enrolled_count ? ` · ${event.enrolled_count}` : ""}
        </div>
      )}
      {showTeacher && event.teacher_name && (
        <div className="truncate text-[10px] leading-tight text-muted-foreground/80">
          {event.teacher_name}
        </div>
      )}
    </button>
  );
}

/* ------------------------------------------------------------- drop slots */

function DropSlot({ dateStr, minutes }: { dateStr: string; minutes: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot:${dateStr}:${minutes}`,
    data: { date: dateStr, minutes },
  });
  return (
    <div
      ref={setNodeRef}
      style={{ height: SLOT_H }}
      className={cn("transition-colors", isOver && "bg-primary/10 ring-1 ring-inset ring-primary/40")}
    />
  );
}

/* --------------------------------------------------------------- the grid */

interface TimeGridViewProps {
  days: dayjs.Dayjs[];
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onOpenDay?: (dateStr: string) => void;
  isAdmin?: boolean;
  isMobile?: boolean;
}

export default function TimeGridView({
  days,
  events,
  onSelectEvent,
  onOpenDay,
  isAdmin,
  isMobile,
}: TimeGridViewProps) {
  const { startMin, endMin } = useMemo(() => deriveTimeWindow(events), [events]);
  const bodyHeight = (endMin - startMin) * PX_PER_MIN;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-render the "now" line each minute rather than animating anything.
  const [now, setNow] = useState(() => nowBangkok());
  useEffect(() => {
    const id = setInterval(() => setNow(nowBangkok()), 60_000);
    return () => clearInterval(id);
  }, []);

  const byDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) (map[event.date] ||= []).push(event);
    return map;
  }, [events]);

  const slotStarts = useMemo(() => {
    const out: number[] = [];
    for (let m = startMin; m < endMin; m += SLOT_MIN) out.push(m);
    return out;
  }, [startMin, endMin]);

  const hourStarts = useMemo(
    () => slotStarts.filter((m) => m % 60 === 0),
    [slotStarts],
  );

  const nowMinutes = now.hour() * 60 + now.minute();
  const nowVisible = nowMinutes >= startMin && nowMinutes <= endMin;
  const nowTop = (nowMinutes - startMin) * PX_PER_MIN;

  const colMinWidth = isMobile ? 112 : 0;

  return (
    <div ref={scrollRef} className={cn(isMobile && "overflow-x-auto")}>
      <div style={{ minWidth: isMobile ? days.length * colMinWidth + 56 : undefined }}>
        {/* Day headers */}
        <div
          className="grid border-b border-border/60"
          style={{ gridTemplateColumns: `${GUTTER} repeat(${days.length}, minmax(0, 1fr))` }}
        >
          <div />
          {days.map((day) => {
            const isToday = day.isSame(now, "day");
            const count = (byDate[day.format("YYYY-MM-DD")] || []).length;
            return (
              <button
                key={day.format("YYYY-MM-DD")}
                type="button"
                onClick={() => onOpenDay?.(day.format("YYYY-MM-DD"))}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 transition-colors hover:bg-muted/40",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {day.format("ddd")}
                </span>
                <span
                  className={cn(
                    "flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-sm font-semibold tabular-nums",
                    isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                  )}
                >
                  {day.format("D")}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground/70">
                  {count > 0 ? `${count}` : "—"}
                </span>
              </button>
            );
          })}
        </div>

        {/* Time body */}
        <div
          className="relative grid"
          style={{ gridTemplateColumns: `${GUTTER} repeat(${days.length}, minmax(0, 1fr))` }}
        >
          {/* Hour gutter */}
          <div className="relative" style={{ height: bodyHeight }}>
            {hourStarts.map((m) => (
              <div
                key={m}
                style={{ top: (m - startMin) * PX_PER_MIN }}
                className="absolute right-2 -translate-y-1/2 text-[10px] font-medium tabular-nums text-muted-foreground/70"
              >
                {String(Math.floor(m / 60)).padStart(2, "0")}:00
              </div>
            ))}
          </div>

          {days.map((day) => {
            const dateStr = day.format("YYYY-MM-DD");
            const dayEvents = byDate[dateStr] || [];
            const positioned = layoutDay(dayEvents, startMin, PX_PER_MIN);
            const isToday = day.isSame(now, "day");

            return (
              <div
                key={dateStr}
                className={cn(
                  "relative border-l border-border/40",
                  isToday && "bg-primary/[0.03]",
                )}
                style={{ height: bodyHeight, minWidth: colMinWidth || undefined }}
              >
                {/* Hour rules */}
                {slotStarts.map((m) => (
                  <div
                    key={m}
                    style={{ top: (m - startMin) * PX_PER_MIN }}
                    className={cn(
                      "pointer-events-none absolute inset-x-0 border-t",
                      m % 60 === 0 ? "border-border/40" : "border-border/20",
                    )}
                  />
                ))}

                {/* Drop targets, 30 minutes each */}
                {isAdmin && (
                  <div className="absolute inset-0">
                    {slotStarts.map((m) => (
                      <DropSlot key={m} dateStr={dateStr} minutes={m} />
                    ))}
                  </div>
                )}

                {positioned.map((p) => (
                  <EventBlock
                    key={p.event.id}
                    positioned={p}
                    onSelect={onSelectEvent}
                    draggable={isAdmin}
                  />
                ))}

                {isToday && nowVisible && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20"
                    style={{ top: nowTop }}
                    aria-hidden
                  >
                    <div className="relative border-t-2 border-destructive/70">
                      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-destructive" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { SLOT_MIN, toMinutes };
