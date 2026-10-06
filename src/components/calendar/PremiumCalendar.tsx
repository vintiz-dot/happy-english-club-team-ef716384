import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CalendarDays,
  CalendarRange,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayjs, nowBangkok } from "@/lib/date";
import { useIsMobile } from "@/hooks/use-mobile";
import MiniCalendar from "./MiniCalendar";
import AgendaView from "./AgendaView";
import MonthView from "./MonthView";
import TimeGridView from "./TimeGridView";
import CalendarFilters, {
  EMPTY_FILTERS,
  type CalendarFilterValue,
} from "./CalendarFilters";
import {
  STATUS_META,
  formatTime,
  getStatusKey,
  isActionable,
  toMinutes,
  type CalendarEvent,
  type StatusKey,
} from "./lib/calendarStatus";
import {
  cursorLabel,
  getVisibleRange,
  stepCursor,
  usePersistedView,
  useVisibleRange,
  type CalendarViewType,
  type VisibleRange,
} from "./lib/useCalendarView";

export type { CalendarEvent } from "./lib/calendarStatus";
export type { VisibleRange } from "./lib/useCalendarView";

export interface RescheduleRequest {
  eventId: string;
  date: string;
  /** Present only when the session was dropped onto a time slot. */
  startTime?: string;
  endTime?: string;
}

interface PremiumCalendarProps {
  events: CalendarEvent[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onAddSession?: (date: Date) => void;
  onReschedule?: (request: RescheduleRequest) => void;
  /** Fires whenever the dates on screen change, so the parent can refetch. */
  onRangeChange?: (range: VisibleRange) => void;
  isAdmin?: boolean;
  isLoading?: boolean;
  className?: string;
}

const VIEWS: { key: CalendarViewType; label: string; icon: React.ReactNode }[] = [
  { key: "month", label: "Month", icon: <Grid3X3 className="h-4 w-4" /> },
  { key: "week", label: "Week", icon: <CalendarRange className="h-4 w-4" /> },
  { key: "day", label: "Day", icon: <CalendarClock className="h-4 w-4" /> },
  { key: "agenda", label: "List", icon: <List className="h-4 w-4" /> },
];

/* ------------------------------------------------------- filters in a URL */

const parseList = (raw: string | null) =>
  raw ? raw.split(",").map(decodeURIComponent).filter(Boolean) : [];

function useUrlFilters(): [CalendarFilterValue, (next: CalendarFilterValue) => void] {
  const [params, setParams] = useSearchParams();

  const value = useMemo<CalendarFilterValue>(
    () => ({
      classes: parseList(params.get("cls")),
      teachers: parseList(params.get("tch")),
      statuses: parseList(params.get("st")) as StatusKey[],
      actionableOnly: params.get("todo") === "1",
    }),
    [params],
  );

  // In the URL so a filtered schedule survives a refresh and can be sent to
  // someone else. `replace` keeps the back button meaning "previous page".
  const setValue = useCallback(
    (next: CalendarFilterValue) => {
      const p = new URLSearchParams(params);
      const put = (key: string, list: string[]) => {
        if (list.length) p.set(key, list.map(encodeURIComponent).join(","));
        else p.delete(key);
      };
      put("cls", next.classes);
      put("tch", next.teachers);
      put("st", next.statuses);
      if (next.actionableOnly) p.set("todo", "1");
      else p.delete("todo");
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  return [value, setValue];
}

/* ------------------------------------------------------------------- main */

export default function PremiumCalendar({
  events,
  onSelectEvent,
  onAddSession,
  onReschedule,
  onRangeChange,
  isAdmin = false,
  isLoading,
  className,
}: PremiumCalendarProps) {
  const isMobile = useIsMobile();
  const reduceMotion = useReducedMotion();
  const [view, setView] = usePersistedView("week");
  const [cursor, setCursor] = useState(() => nowBangkok());
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);
  const [filters, setFilters] = useUrlFilters();
  const [dragging, setDragging] = useState<CalendarEvent | null>(null);

  const range = useVisibleRange(view, cursor, onRangeChange);

  /* -- the events actually on screen ------------------------------------ */

  const inRange = useMemo(
    () => events.filter((e) => e.date >= range.start && e.date <= range.end),
    [events, range.start, range.end],
  );

  // Filter options come from what is visible, so the lists stay short and
  // never offer a class with nothing in this range.
  const { classOptions, teacherOptions, statusOptions } = useMemo(() => {
    const classes = new Set<string>();
    const teachers = new Set<string>();
    const statuses = new Set<StatusKey>();
    for (const e of inRange) {
      classes.add(e.class_name);
      if (e.teacher_name) teachers.add(e.teacher_name);
      statuses.add(getStatusKey(e));
    }
    const order: StatusKey[] = [
      "needsAttention",
      "today",
      "scheduled",
      "held",
      "canceled",
      "holiday",
    ];
    return {
      classOptions: [...classes].sort((a, b) => a.localeCompare(b)),
      teacherOptions: [...teachers].sort((a, b) => a.localeCompare(b)),
      statusOptions: order.filter((s) => statuses.has(s)),
    };
  }, [inRange]);

  const visible = useMemo(() => {
    return inRange.filter((e) => {
      if (filters.actionableOnly && !isActionable(e)) return false;
      if (filters.classes.length && !filters.classes.includes(e.class_name)) return false;
      if (filters.teachers.length && !filters.teachers.includes(e.teacher_name || "")) return false;
      if (filters.statuses.length && !filters.statuses.includes(getStatusKey(e))) return false;
      return true;
    });
  }, [inRange, filters]);

  const actionableCount = useMemo(() => inRange.filter(isActionable).length, [inRange]);

  const days = useMemo(() => {
    if (view === "day") return [cursor];
    const start = cursor.startOf("isoWeek");
    return Array.from({ length: 7 }, (_, i) => start.add(i, "day"));
  }, [view, cursor]);

  const eventDates = useMemo(() => new Set(events.map((e) => e.date)), [events]);

  /* -- navigation -------------------------------------------------------- */

  const go = useCallback(
    (direction: 1 | -1) => setCursor((c) => stepCursor(view, c, direction)),
    [view],
  );
  const goToday = useCallback(() => setCursor(nowBangkok()), []);

  const openDay = useCallback((dateStr: string) => {
    setCursor(dayjs(dateStr));
    setView("day");
  }, [setView]);

  /* -- drag to reschedule ------------------------------------------------ */

  const sensors = useSensors(
    // 6px of travel before a drag begins, so a plain click still selects the
    // session instead of being swallowed by the drag handler.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (e: DragStartEvent) => {
    setDragging((e.active.data.current as { event?: CalendarEvent })?.event ?? null);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    const event = dragging;
    setDragging(null);
    if (!event || !e.over || !onReschedule) return;

    const overId = String(e.over.id);

    if (overId.startsWith("day:")) {
      const date = overId.slice(4);
      if (date !== event.date) onReschedule({ eventId: event.id, date });
      return;
    }

    if (overId.startsWith("slot:")) {
      const [, date, minutesRaw] = overId.split(":");
      const minutes = Number(minutesRaw);
      const sameDay = date === event.date;
      const sameTime = toMinutes(event.start_time) === minutes;
      if (sameDay && sameTime) return;

      // Keep the session's length; only move where it sits.
      const duration = Math.max(
        30,
        toMinutes(event.end_time || event.start_time) - toMinutes(event.start_time),
      );
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (total: number) => `${pad(Math.floor(total / 60) % 24)}:${pad(total % 60)}:00`;

      onReschedule({
        eventId: event.id,
        date,
        startTime: fmt(minutes),
        endTime: fmt(minutes + duration),
      });
    }
  };

  /* -- render ------------------------------------------------------------ */

  const transition = reduceMotion ? { duration: 0 } : { duration: 0.15 };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border/60">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => go(-1)}
                aria-label="Previous"
                className="h-8 w-8 rounded-r-none"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                onClick={goToday}
                className="h-8 rounded-none border-x border-border/60 px-3 text-xs font-medium"
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => go(1)}
                aria-label="Next"
                className="h-8 w-8 rounded-l-none"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMiniCalendar((v) => !v)}
                className="flex items-center gap-1.5 rounded-md px-1 py-0.5 text-lg font-bold tracking-tight transition-colors hover:bg-muted md:text-xl"
              >
                {cursorLabel(view, cursor, isMobile)}
                <CalendarDays
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    showMiniCalendar && "rotate-180",
                  )}
                />
              </button>
              {showMiniCalendar && (
                <div className="absolute left-0 top-full z-50 mt-2">
                  <MiniCalendar
                    currentMonth={cursor}
                    selectedDate={cursor.format("YYYY-MM-DD")}
                    eventDates={eventDates}
                    onSelectDate={(dateStr) => {
                      setCursor(dayjs(dateStr));
                      setShowMiniCalendar(false);
                    }}
                    onChangeMonth={setCursor}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5">
            {VIEWS.map(({ key, label, icon }) => (
              <Button
                key={key}
                variant={view === key ? "default" : "ghost"}
                size="sm"
                onClick={() => setView(key)}
                aria-pressed={view === key}
                className={cn("h-7 rounded-md px-2", view === key && "shadow-sm")}
              >
                {icon}
                {!isMobile && <span className="ml-1.5 text-xs">{label}</span>}
              </Button>
            ))}
          </div>
        </div>

        <CalendarFilters
          classes={classOptions}
          teachers={teacherOptions}
          statuses={statusOptions}
          value={filters}
          onChange={setFilters}
          actionableCount={actionableCount}
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">
            {visible.length} session{visible.length === 1 ? "" : "s"}
          </span>
          {visible.length !== inRange.length && (
            <span className="tabular-nums">· {inRange.length} before filtering</span>
          )}
          {isAdmin && !isMobile && view !== "agenda" && (
            <span className="ml-auto">Drag a session to reschedule it</span>
          )}
        </div>

        {/* Body */}
        <div className="rounded-2xl border border-border/50 bg-card/30 p-2 md:p-3">
          {isLoading && inRange.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              Loading sessions…
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={transition}
              >
                {view === "month" && (
                  <MonthView
                    cursor={cursor}
                    events={visible}
                    onSelectEvent={onSelectEvent}
                    onOpenDay={openDay}
                    onAddSession={onAddSession}
                    isAdmin={isAdmin}
                    isMobile={isMobile}
                  />
                )}
                {(view === "week" || view === "day") && (
                  <TimeGridView
                    days={days}
                    events={visible}
                    onSelectEvent={onSelectEvent}
                    onOpenDay={openDay}
                    isAdmin={isAdmin}
                    isMobile={isMobile}
                  />
                )}
                {view === "agenda" && (
                  <AgendaView
                    events={visible}
                    currentMonth={cursor}
                    onSelectEvent={onSelectEvent!}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging && (
          <div
            className={cn(
              "pointer-events-none rounded-lg border px-2 py-1 text-[11px] font-semibold shadow-lg",
              STATUS_META[getStatusKey(dragging)].tint,
              STATUS_META[getStatusKey(dragging)].border,
            )}
          >
            {dragging.class_name} · {formatTime(dragging.start_time)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export { getVisibleRange };
