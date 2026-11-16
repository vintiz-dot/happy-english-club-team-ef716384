import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Users, MapPin, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { getSessionDisplayStatus, type SessionStatus } from "@/lib/sessionStatus";
import { nowBangkok } from "@/lib/date";

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

type StatusLook = {
  bg: string;
  border: string;
  text: string;
  dotColor: string;
  icon: string;
};

/**
 * How each status reads (DESIGN_SYSTEM s.14). One loud state: needsAttention
 * is amber, cancelled is red, today carries the brass edge (the current item);
 * the rest are quiet ink.
 */
const statusConfigIvory: Record<string, StatusLook> = {
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
  const statusKey = getEventStatusKey(event);
  const config = statusConfigIvory[statusKey];

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.24), duration: 0.24 }}
      whileHover={undefined}
      whileTap={undefined}
      onClick={() => onSelect(event)}
      className={cn(
        "group flex min-h-hec-target w-full cursor-pointer items-start gap-4 rounded-hec-md border border-l-4 p-4 text-left transition-colors duration-hec-1 ease-hec",
        FOCUS,
        undefined,
        config.bg,
        config.border
      )}
    >
      {/* Time column */}
      <div className="flex min-w-14 shrink-0 flex-col items-center">
        <span className="text-hec-small font-semibold tabular-nums text-hec-ink">
          {event.start_time.slice(0, 5)}
        </span>
        <span className="text-hec-caption text-hec-ink-faint">to</span>
        <span className="text-hec-caption tabular-nums text-hec-ink-soft">
          {event.end_time.slice(0, 5)}
        </span>
      </div>

      {/* Divider */}
      <div className="flex flex-col items-center self-stretch">
        <motion.div
          className={cn("mt-1 h-3 w-3 rounded-full", config.dotColor)}
          animate={undefined}
          transition={undefined}
        />
        <div className="mt-1 w-px flex-1 bg-hec-line" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4
              className={cn(
                "whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold",
                config.text,
              )}
            >
              {event.class_name}
            </h4>
            {event.teacher_name && (
              <p className="mt-1 flex items-start gap-2 text-hec-small text-hec-ink-soft">
                <MapPin className="mt-1 h-4 w-4 shrink-0" />
                <span className="min-w-0 whitespace-normal break-words">{event.teacher_name}</span>
              </p>
            )}
          </div>
          <span className="shrink-0 text-hec-h3">
            {config.icon}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {event.enrolled_count !== undefined && event.enrolled_count > 0 && (
            <span className="flex items-center gap-1 text-hec-small tabular-nums text-hec-ink-soft">
              <Users className="h-4 w-4" />
              {event.enrolled_count} students
            </span>
          )}
          {event.notes && (
            <span className="max-w-[150px] truncate text-hec-small text-hec-ink-soft">
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


  if (groupedEvents.length === 0) {
    return (
      <div className={cn("rounded-hec-lg border border-dashed border-hec-line bg-hec-surface p-8", className)}>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-12 text-center"
        >
          <CalendarIcon className="mb-4 h-12 w-12 text-hec-ink-faint" />
          <h3 className="text-hec-h3 text-hec-ink">
            No sessions this month
          </h3>
          <p className="mt-1 text-hec-small text-hec-ink-soft">
            Sessions will appear here when scheduled
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-8 p-2 sm:p-4", className)}>
      <AnimatePresence mode="popLayout">
        {groupedEvents.map((group, groupIdx) => {
          const date = dayjs(group.date);
          const isToday = date.isSame(dayjs(), "day");

          return (
            <motion.div
              key={group.date}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: Math.min(groupIdx * 0.05, 0.24), duration: 0.24 }}
              className="space-y-3"
            >
              {/* Date header */}
              <div className="sticky top-0 z-10 flex items-center gap-3 bg-hec-surface py-2">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-md text-hec-h3 tabular-nums",
                    isToday
                      ? "bg-hec-action text-hec-on-action"
                      : "bg-hec-sunken text-hec-ink-soft"
                  )}
                >
                  {date.format("D")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-hec-h3 text-hec-ink">
                    {date.format("dddd")}
                    {isToday && (
                      <span className="ml-2 text-hec-caption font-medium text-hec-brass">
                        Today
                      </span>
                    )}
                  </h3>
                  <p className="text-hec-small tabular-nums text-hec-ink-soft">
                    {date.format("MMMM YYYY")} • {group.events.length} session
                    {group.events.length > 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Events */}
              <div className="space-y-2 sm:pl-4">
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
