import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { getSessionDisplayStatus, type SessionStatus } from "@/lib/sessionStatus";
import { nowBangkok } from "@/lib/date";
import { useIvory } from "@/hooks/useIvory";

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

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
 * statusConfig in the "Ivory" system (DESIGN_SYSTEM s.14), used on a listed
 * route. Same keys and the same icon characters; only the classes differ.
 * One loud state: needsAttention is amber, cancelled is red, today carries
 * the brass edge (the current item); the rest are quiet ink.
 */
const statusConfigIvory: typeof statusConfig = {
  scheduled: {
    bg: "border-hec-line bg-hec-surface hover:bg-hec-sunken/60",
    border: "border-l-hec-line-strong",
    text: "text-hec-ink",
    dotColor: "bg-hec-line-strong",
    icon: "✨",
  },
  today: {
    bg: "border-hec-brass/40 bg-hec-surface hover:bg-hec-sunken/60",
    border: "border-l-hec-brass",
    text: "text-hec-ink",
    dotColor: "bg-hec-brass",
    icon: "🌟",
  },
  needsAttention: {
    bg: "border-hec-warn/30 bg-hec-warn-tint hover:bg-hec-warn-tint/80",
    border: "border-l-hec-warn",
    text: "text-hec-ink",
    dotColor: "bg-hec-warn",
    icon: "⚡",
  },
  held: {
    bg: "border-hec-line bg-hec-sunken hover:bg-hec-sunken/80",
    border: "border-l-hec-ink-faint",
    text: "text-hec-ink-soft",
    dotColor: "bg-hec-ink-faint",
    icon: "✓",
  },
  canceled: {
    bg: "border-hec-danger/30 bg-hec-danger-tint hover:bg-hec-danger-tint/80",
    border: "border-l-hec-danger",
    text: "text-hec-ink-soft line-through decoration-hec-danger/50",
    dotColor: "bg-hec-danger",
    icon: "✕",
  },
  holiday: {
    bg: "border-hec-line bg-hec-sunken hover:bg-hec-sunken/80",
    border: "border-l-hec-ink-soft",
    text: "text-hec-ink-soft",
    dotColor: "bg-hec-ink-soft",
    icon: "🎉",
  },
};

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
  const config = (ivory ? statusConfigIvory : statusConfig)[statusKey];

  return (
    <motion.button
      initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, x: -20 }}
      animate={ivory ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
      exit={ivory ? { opacity: 0 } : { opacity: 0, x: 20 }}
      transition={ivory ? { delay: Math.min(index * 0.03, 0.24), duration: 0.24 } : { delay: index * 0.03, duration: 0.25 }}
      whileHover={ivory ? undefined : { scale: 1.01, x: 4 }}
      whileTap={ivory ? undefined : { scale: 0.99 }}
      onClick={() => onSelect(event)}
      className={cn(
        ivory
          ? "group flex min-h-hec-target w-full cursor-pointer items-start gap-4 rounded-hec-md border border-l-4 p-4 text-left transition-colors duration-hec-1 ease-hec"
          : "w-full text-left p-4 rounded-xl border-l-4 transition-all duration-300",
        ivory ? FOCUS : "backdrop-blur-sm cursor-pointer group flex items-start gap-4",
        ivory ? undefined : "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        config.bg,
        config.border
      )}
    >
      {/* Time column */}
      <div className={ivory ? "flex min-w-14 shrink-0 flex-col items-center" : "flex flex-col items-center min-w-[60px]"}>
        <span className={ivory ? "text-hec-small font-semibold tabular-nums text-hec-ink" : "text-sm font-bold text-foreground"}>
          {event.start_time.slice(0, 5)}
        </span>
        <span className={ivory ? "text-hec-caption text-hec-ink-faint" : "text-[10px] text-muted-foreground"}>to</span>
        <span className={ivory ? "text-hec-caption tabular-nums text-hec-ink-soft" : "text-xs text-muted-foreground"}>
          {event.end_time.slice(0, 5)}
        </span>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center self-stretch">
        <motion.div
          className={cn(ivory ? "mt-1 h-3 w-3 rounded-full" : "w-3 h-3 rounded-full", config.dotColor)}
          animate={ivory ? undefined : { scale: [1, 1.2, 1] }}
          transition={ivory ? undefined : { duration: 2, repeat: Infinity }}
        />
        <div className={ivory ? "mt-1 w-px flex-1 bg-hec-line" : "flex-1 w-px bg-border/50 mt-1"} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className={ivory ? "min-w-0 flex-1" : undefined}>
            <h4
              className={cn(
                ivory
                  ? "whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold"
                  : "font-semibold text-sm",
                config.text,
              )}
            >
              {event.class_name}
            </h4>
            {event.teacher_name && (
              <p className={ivory ? "mt-1 flex items-start gap-2 text-hec-small text-hec-ink-soft" : "text-xs text-muted-foreground mt-0.5 flex items-center gap-1"}>
                <MapPin className={ivory ? "mt-1 h-4 w-4 shrink-0" : "h-3 w-3"} />
                {ivory ? (
                  <span className="min-w-0 whitespace-normal break-words">{event.teacher_name}</span>
                ) : (
                  event.teacher_name
                )}
              </p>
            )}
          </div>
          <span className={ivory ? "shrink-0 text-hec-h3" : "text-lg opacity-60 group-hover:opacity-100 transition-opacity"}>
            {config.icon}
          </span>
        </div>

        <div className={ivory ? "mt-2 flex flex-wrap items-center gap-x-4 gap-y-1" : "flex items-center gap-3 mt-2"}>
          {event.enrolled_count !== undefined && event.enrolled_count > 0 && (
            <span className={ivory ? "flex items-center gap-1 text-hec-small tabular-nums text-hec-ink-soft" : "flex items-center gap-1 text-xs text-muted-foreground"}>
              <Users className={ivory ? "h-4 w-4" : "h-3 w-3"} />
              {event.enrolled_count} students
            </span>
          )}
          {event.notes && (
            <span className={ivory ? "max-w-[150px] truncate text-hec-small text-hec-ink-soft" : "text-xs text-muted-foreground truncate max-w-[150px]"}>
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

  const ivory = useIvory();

  if (groupedEvents.length === 0) {
    return (
      <div className={cn(ivory ? "rounded-hec-lg border border-dashed border-hec-line bg-hec-surface p-8" : "glass rounded-3xl p-8", className)}>
        <motion.div
          initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <CalendarIcon className={ivory ? "mb-4 h-12 w-12 text-hec-ink-faint" : "h-12 w-12 text-muted-foreground/40 mb-4"} />
          <h3 className={ivory ? "text-hec-h3 text-hec-ink" : "text-lg font-semibold text-muted-foreground"}>
            No sessions this month
          </h3>
          <p className={ivory ? "mt-1 text-hec-small text-hec-ink-soft" : "text-sm text-muted-foreground/60 mt-1"}>
            Sessions will appear here when scheduled
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn(ivory ? "space-y-8 p-2 sm:p-4" : "glass rounded-3xl p-4 md:p-6 space-y-6", className)}>
      <AnimatePresence mode="popLayout">
        {groupedEvents.map((group, groupIdx) => {
          const date = dayjs(group.date);
          const isToday = date.isSame(dayjs(), "day");

          return (
            <motion.div
              key={group.date}
              initial={ivory ? { opacity: 0, y: 8 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={ivory ? { opacity: 0 } : { opacity: 0, y: -20 }}
              transition={ivory ? { delay: Math.min(groupIdx * 0.05, 0.24), duration: 0.24 } : { delay: groupIdx * 0.05 }}
              className="space-y-3"
            >
              {/* Date header */}
              <div className={ivory ? "sticky top-0 z-10 flex items-center gap-3 bg-hec-surface py-2" : "flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm py-2 z-10"}>
                <div
                  className={cn(
                    ivory
                      ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-md text-hec-h3 tabular-nums"
                      : "flex items-center justify-center w-12 h-12 rounded-2xl font-bold text-lg",
                    isToday
                      ? ivory ? "bg-hec-action text-hec-on-action" : "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                      : ivory ? "bg-hec-sunken text-hec-ink-soft" : "bg-muted text-muted-foreground"
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
                  <p className={ivory ? "text-hec-small tabular-nums text-hec-ink-soft" : "text-xs text-muted-foreground"}>
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
