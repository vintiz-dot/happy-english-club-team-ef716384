import { useEffect, useMemo, useRef, useState } from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayjs, nowBangkok } from "@/lib/date";
import { statusTreatment, type ClassColor } from "@/lib/classColors";
import { describeVariance, formatSignedMinutes } from "@/lib/sessionDuration";
import { eventAccessibleName } from "./lib/eventLabel";
import {
  STATUS_META,
  colorKeyFor,
  deriveTimeWindow,
  eventVariance,
  formatTime,
  getStatusKey,
  layoutDay,
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

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

/* ------------------------------------------------------------------ block */

type ColorFor = (key: string) => ClassColor;

function EventBlock({
  positioned,
  onSelect,
  draggable,
  colorFor,
}: {
  positioned: ReturnType<typeof layoutDay>[number];
  onSelect?: (event: CalendarEvent) => void;
  draggable?: boolean;
  colorFor: ColorFor;
}) {
  const { event, top, height, leftPct, widthPct } = positioned;
  const statusKey = getStatusKey(event);
  const meta = STATUS_META[statusKey];
  const color = colorFor(colorKeyFor(event));
  const treatment = statusTreatment(statusKey);
  const variance = eventVariance(event);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    disabled: !draggable,
    data: { event },
  });

  // Only show what there is genuinely room for.
  const showTeacher = height >= 56;
  const showMeta = height >= 44;

  // What the block shows, line by line; the name starts with exactly that,
  // then adds what does not fit (times, teacher), the status and any note.
  const metaText = `${formatTime(event.start_time)}–${formatTime(event.end_time)}${variance ? ` (${formatSignedMinutes(variance.deltaMinutes)})` : ""}${event.enrolled_count ? ` · ${event.enrolled_count}` : ""}`;
  const teacherShown = showTeacher && !!event.teacher_name;
  const label = eventAccessibleName(
    [event.class_name, showMeta && metaText, teacherShown && event.teacher_name],
    [
      !showMeta && `${formatTime(event.start_time)} to ${formatTime(event.end_time)}`,
      !teacherShown && event.teacher_name,
      meta.label,
      variance ? describeVariance(variance) : null,
    ],
  );

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
      onClick={() => onSelect?.(event)}
      aria-label={label}
      title={variance ? describeVariance(variance) : undefined}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
      }}
      className={cn(
        "absolute overflow-hidden rounded-hec-sm border py-1 pl-2 pr-1 text-left",
        "transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2",
        FOCUS,
        color.tint,
        color.border,
        treatment.wrapper,
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px] rounded-l-hec-sm", color.rail)}
      />
      <div className="flex items-start gap-1">
        <div
          className={cn(
            "min-w-0 flex-1 truncate text-hec-caption font-semibold leading-tight",
            color.text,
            treatment.label,
          )}
        >
          {event.class_name}
        </div>
        {variance && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-hec-warn" aria-hidden />}
      </div>
      {/* A space between the lines, so their text does not run together
          ("...Nguyên17:30") for WCAG 2.5.3. White space between blocks is not drawn. */}
      {" "}
      {showMeta && (
        <div
          className={cn(
            "truncate text-hec-caption leading-tight tabular-nums",
            variance
              ? "font-medium text-hec-warn"
              : "text-hec-ink-soft",
          )}
        >
          {/* Rendered as before (one string here moved the dash by a sub-pixel); metaText is the same text. */}
          {formatTime(event.start_time)}–{formatTime(event.end_time)}
          {variance ? ` (${formatSignedMinutes(variance.deltaMinutes)})` : ""}
          {event.enrolled_count ? ` · ${event.enrolled_count}` : ""}
        </div>
      )}
      {" "}
      {showTeacher && event.teacher_name && (
        <div className="truncate text-hec-caption leading-tight text-hec-ink-soft">{event.teacher_name}</div>
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
      className={
        cn("transition-colors duration-hec-1 ease-hec", isOver && "bg-hec-sunken ring-1 ring-inset ring-hec-brass")
      }
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
  colorFor: ColorFor;
}

export default function TimeGridView({
  days,
  events,
  onSelectEvent,
  onOpenDay,
  isAdmin,
  isMobile,
  colorFor,
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
          className="grid border-b border-hec-line"
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
                  "flex min-h-hec-target min-w-0 flex-col items-center gap-1 rounded-hec-sm py-2 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring",
                )}
              >
                <span className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                  {day.format("ddd")}
                </span>
                <span
                  className={cn(
                    "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-hec-small font-semibold tabular-nums",
                    isToday
                      ? "bg-hec-action text-hec-on-action"
                      : "text-hec-ink",
                  )}
                >
                  {day.format("D")}
                </span>
                <span className="text-hec-caption tabular-nums text-hec-ink-faint">
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
                className="absolute right-2 -translate-y-1/2 text-hec-caption tabular-nums text-hec-ink-faint"
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
                className={
                  cn("relative border-l border-hec-line", isToday && "bg-hec-sunken/40")}
                style={{ height: bodyHeight, minWidth: colMinWidth || undefined }}
              >
                {/* Hour rules */}
                {slotStarts.map((m) => (
                  <div
                    key={m}
                    style={{ top: (m - startMin) * PX_PER_MIN }}
                    className={cn(
                      "pointer-events-none absolute inset-x-0 border-t",
                      m % 60 === 0
                        ? "border-hec-line"
                        : "border-hec-line/50",
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
                    colorFor={colorFor}
                  />
                ))}

                {isToday && nowVisible && (
                  <div
                    className="pointer-events-none absolute inset-x-0 z-20"
                    style={{ top: nowTop }}
                    aria-hidden
                  >
                    <div className="relative border-t-2 border-hec-brass">
                      <span className="absolute -left-1 -top-[5px] h-2 w-2 rounded-full bg-hec-brass" />
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
