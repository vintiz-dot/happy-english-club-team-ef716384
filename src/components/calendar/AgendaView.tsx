import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { getSessionDisplayStatus, type SessionStatus } from "@/lib/sessionStatus";
import { nowBangkok } from "@/lib/date";
import { useIvory } from "@/hooks/useIvory";
import { STATUS_META_IVORY, type StatusKey } from "./lib/calendarStatus";

export interface AgendaEvent {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  class_name: string;
  status: SessionStatus;
  enrolled_count?: number;
  notes?: string;
  teacher_name?: string;
}

interface AgendaViewProps {
  events: AgendaEvent[];
  currentMonth: dayjs.Dayjs;
  onSelectEvent: (event: AgendaEvent) => void;
  className?: string;
}

const statusConfig: Record<string, {
  bg: string;
  border: string;
  text: string;
  dotColor: string;
  icon: string;
}> = {
  scheduled: {
    bg: "bg-success/5 hover:bg-success/10",
    border: "border-l-success",
    text: "text-success",
    dotColor: "bg-success",
    icon: "✨"
  },
  today: {
    bg: "bg-primary/5 hover:bg-primary/10",
    border: "border-l-primary",
    text: "text-primary",
    dotColor: "bg-primary",
    icon: "🌟"
  },
  needsAttention: {
    bg: "bg-warning/5 hover:bg-warning/10",
    border: "border-l-warning",
    text: "text-warning",
    dotColor: "bg-warning",
    icon: "⚡"
  },
  held: {
    bg: "bg-muted/50 hover:bg-muted/70",
    border: "border-l-muted-foreground/30",
    text: "text-muted-foreground",
    dotColor: "bg-muted-foreground/50",
    icon: "✓"
  },
  canceled: {
    bg: "bg-destructive/5 hover:bg-destructive/10",
    border: "border-l-destructive",
    text: "text-destructive",
    dotColor: "bg-destructive",
    icon: "✕"
  },
  holiday: {
    bg: "bg-accent/5 hover:bg-accent/10",
    border: "border-l-accent",
    text: "text-accent",
    dotColor: "bg-accent",
    icon: "🎉"
  },
};

/**
 * The rail colour of each state in the "Ivory" system (DS s.14): one loud
 * state (needs attendance, amber), cancelled red, today brass, the rest
 * quiet ink. The card itself is a plain surface; the words and the icon
 * carry the state as before.
 */
const IVORY_RAIL: Record<StatusKey, string> = {
  scheduled: "border-l-hec-line-strong",
  today: "border-l-hec-brass",
  needsAttention: "border-l-hec-warn",
  held: "border-l-hec-ink-faint",
  canceled: "border-l-hec-danger",
  holiday: "border-l-hec-ink-soft",
};

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

function getEventStatusKey(event: AgendaEvent): string {
  const displayStatus = getSessionDisplayStatus({
    date: event.date,
    start_time: event.start_time,
    status: event.status,
  });

  const sessionDateTime = new Date(`${event.date}T${event.start_time}`);
  const now = nowBangkok().toDate();
  const isPast = sessionDateTime < now;
  const isToday = dayjs(event.date).isSame(dayjs(), "day");

  if (displayStatus === "Canceled") return "canceled";
  if (displayStatus === "Holiday") return "holiday";
  if (displayStatus === "Held") return "held";
  if (isToday && displayStatus === "Scheduled") return "today";
  if (isPast && displayStatus === "Scheduled") return "needsAttention";
  return "scheduled";
}

function AgendaEventCard({
  event,
  onSelect,
  index,
}: {
  event: AgendaEvent;
  onSelect: (event: AgendaEvent) => void;
  index: number;
}) {
  const ivory = useIvory();
  const statusKey = getEventStatusKey(event);
  const config = statusConfig[statusKey];
  const meta = STATUS_META_IVORY[statusKey as StatusKey];

  return (
    <motion.button
      initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, x: -20 }}
      animate={ivory ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
      exit={ivory ? { opacity: 0 } : { opacity: 0, x: 20 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      whileHover={ivory ? undefined : { scale: 1.01, x: 4 }}
      whileTap={ivory ? undefined : { scale: 0.99 }}
      onClick={() => onSelect(event)}
      className={
        ivory
          ? cn(
              "flex min-h-hec-target w-full cursor-pointer items-start gap-3 rounded-hec-md border border-l-4 border-hec-line bg-hec-surface p-4 text-left shadow-hec-1",
              "transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60",
              FOCUS,
              IVORY_RAIL[statusKey as StatusKey],
            )
          : cn(
              "w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300",
              "backdrop-blur-sm cursor-pointer group flex items-start gap-4",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              config.bg,
              config.border
            )
      }
    >
      {/* Time column */}
      <div className={ivory ? "flex min-w-[60px] shrink-0 flex-col items-center tabular-nums" : "flex flex-col items-center min-w-[60px]"}>
        <span className={ivory ? "text-hec-small font-semibold text-hec-ink" : "text-sm font-bold text-foreground"}>
          {event.start_time.slice(0, 5)}
        </span>
        <span className={ivory ? "text-hec-caption text-hec-ink-faint" : "text-[10px] text-muted-foreground"}>to</span>
        <span className={ivory ? "text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground"}>
          {event.end_time.slice(0, 5)}
        </span>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center self-stretch">
        <motion.div
          className={cn("w-3 h-3 rounded-full", ivory ? meta.dot : config.dotColor)}
          // DS s.9: nothing loops. The legacy dot keeps its pulse off-scope.
          animate={ivory ? undefined : { scale: [1, 1.2, 1] }}
          transition={ivory ? undefined : { duration: 2, repeat: Infinity }}
        />
        <div className={ivory ? "mt-1 w-px flex-1 bg-hec-line" : "flex-1 w-px bg-border/50 mt-1"} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={ivory ? "min-w-0" : undefined}>
            <h4
              className={
                ivory
                  ? cn("whitespace-normal break-words hyphens-none text-hec-body font-semibold", meta.text)
                  : cn("font-semibold text-sm", config.text)
              }
            >
              {event.class_name}
            </h4>
            {event.teacher_name && (
              <p
                className={
                  ivory
                    ? "mt-1 flex items-start gap-1 whitespace-normal break-words text-hec-small text-hec-ink-soft"
                    : "text-xs text-muted-foreground mt-0.5 flex items-center gap-1"
                }
              >
                <MapPin className={ivory ? "mt-1 h-4 w-4 shrink-0" : "h-3 w-3"} />
                {event.teacher_name}
              </p>
            )}
          </div>
          <span
            className={
              ivory
                ? "shrink-0 text-hec-body text-hec-ink-soft"
                : "text-lg opacity-60 group-hover:opacity-100 transition-opacity"
            }
          >
            {config.icon}
          </span>
        </div>

        <div className={ivory ? "mt-2 flex flex-wrap items-center gap-3" : "flex items-center gap-3 mt-2"}>
          {event.enrolled_count !== undefined && event.enrolled_count > 0 && (
            <span className={ivory ? "flex items-center gap-1 text-hec-caption tabular-nums text-hec-ink-soft" : "flex items-center gap-1 text-xs text-muted-foreground"}>
              <Users className={ivory ? "h-4 w-4" : "h-3 w-3"} />
              {event.enrolled_count} students
            </span>
          )}
          {event.notes && (
            <span className={ivory ? "max-w-[150px] truncate text-hec-caption text-hec-ink-soft" : "text-xs text-muted-foreground truncate max-w-[150px]"}>
              {event.notes}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  );
}

export default function AgendaView({
  events,
  currentMonth,
  onSelectEvent,
  className,
}: AgendaViewProps) {
  const ivory = useIvory();
  // Group events by date
  const groupedEvents = useMemo(() => {
    const monthStart = currentMonth.startOf("month").format("YYYY-MM-DD");
    const monthEnd = currentMonth.endOf("month").format("YYYY-MM-DD");

    const filtered = events
      .filter((e) => e.date >= monthStart && e.date <= monthEnd)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.start_time.localeCompare(b.start_time);
      });

    const groups: { date: string; events: AgendaEvent[] }[] = [];
    for (const event of filtered) {
      const last = groups[groups.length - 1];
      if (last && last.date === event.date) {
        last.events.push(event);
      } else {
        groups.push({ date: event.date, events: [event] });
      }
    }

    return groups;
  }, [events, currentMonth]);

  if (groupedEvents.length === 0) {
    return (
      <div className={cn(ivory ? "rounded-hec-lg border border-hec-line bg-hec-surface p-8 shadow-hec-1" : "glass rounded-3xl p-8", className)}>
        <motion.div
          initial={{ opacity: 0, y: ivory ? 8 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <CalendarIcon className={ivory ? "mb-4 h-12 w-12 text-hec-ink-faint" : "h-12 w-12 text-muted-foreground/40 mb-4"} />
          <h3 className={ivory ? "text-hec-h3 text-hec-ink" : "text-lg font-semibold text-muted-foreground"}>
            No sessions this month
          </h3>
          <p className={ivory ? "mt-2 text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground/60 mt-1"}>
            Sessions will appear here when scheduled
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(ivory ? "space-y-6 rounded-hec-lg p-2 md:p-4" : "glass rounded-3xl p-4 md:p-6 space-y-6", className)}>
      <AnimatePresence mode="popLayout">
        {groupedEvents.map((group, groupIdx) => {
          const date = dayjs(group.date);
          const isToday = date.isSame(dayjs(), "day");

          return (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: ivory ? 8 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: ivory ? -8 : -20 }}
              transition={{ delay: groupIdx * 0.05 }}
              className="space-y-3"
            >
              {/* Date header */}
              <div
                className={
                  ivory
                    ? "sticky top-0 z-10 flex items-center gap-3 bg-hec-paper py-2"
                    : "flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10"
                }
              >
                <div
                  className={cn(
                    ivory
                      ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-md text-hec-h3 tabular-nums"
                      : "flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-lg",
                    ivory
                      ? isToday
                        ? "border border-hec-brass bg-hec-surface text-hec-brass"
                        : "bg-hec-sunken text-hec-ink-soft"
                      : isToday
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "bg-muted text-muted-foreground"
                  )}
                >
                  {date.format("D")}
                </div>
                <div className={ivory ? "min-w-0" : undefined}>
                  <h3 className={ivory ? "text-hec-h3 text-hec-ink" : "font-semibold text-foreground"}>
                    {date.format("dddd")}
                    {isToday && (
                      <span className={ivory ? "ml-2 text-hec-caption font-medium text-hec-brass" : "ml-2 text-xs font-normal text-primary"}>
                        Today
                      </span>
                    )}
                  </h3>
                  <p className={ivory ? "text-hec-caption tabular-nums text-hec-ink-soft" : "text-xs text-muted-foreground"}>
                    {date.format("MMMM YYYY")} • {group.events.length} session
                    {group.events.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Events */}
              <div className={ivory ? "space-y-2 sm:pl-4" : "space-y-2 pl-4"}>
                {group.events.map((event, idx) => (
                  <AgendaEventCard
                    key={event.id}
                    event={event}
                    onSelect={onSelectEvent}
                    index={idx}
                  />
                ))}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
