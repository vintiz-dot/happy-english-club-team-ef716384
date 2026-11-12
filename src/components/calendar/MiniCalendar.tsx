import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";
import { useIvory } from "@/hooks/useIvory";

interface MiniCalendarProps {
  currentMonth: dayjs.Dayjs;
  selectedDate?: string;
  eventDates?: Set<string>;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: dayjs.Dayjs) => void;
  className?: string;
}

const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export default function MiniCalendar({
  currentMonth,
  selectedDate,
  eventDates = new Set(),
  onSelectDate,
  onChangeMonth,
  className,
}: MiniCalendarProps) {
  const ivory = useIvory();
  const { cells, weekdays } = useMemo(() => {
    const start = currentMonth.startOf("month").startOf("isoWeek");
    const end = currentMonth.endOf("month").endOf("isoWeek");
    const cells: dayjs.Dayjs[] = [];
    let current = start;

    while (current.isBefore(end) || current.isSame(end, "day")) {
      cells.push(current);
      current = current.add(1, "day");
    }

    const weekdays = ["M", "T", "W", "T", "F", "S", "S"];
    return { cells, weekdays };
  }, [currentMonth]);

  return (
    <motion.div
      initial={ivory ? { opacity: 0, y: -8 } : { opacity: 0, scale: 0.95, y: -10 }}
      animate={ivory ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
      exit={ivory ? { opacity: 0, y: -8 } : { opacity: 0, scale: 0.95, y: -10 }}
      className={cn(
        ivory
          ? // Seven 44 px days need 308 px; on a phone the panel takes the
            // width between the 16 px gutters, just under the top bar, instead
            // of hanging off the right edge.
            "rounded-hec-lg border border-hec-line bg-hec-raised p-3 text-hec-ink shadow-hec-2 max-sm:fixed max-sm:inset-x-4 max-sm:top-16 sm:w-[332px]"
          : cn("glass-sm rounded-2xl p-3 w-[240px]", "shadow-xl border border-border/50"),
        className
      )}
    >
      {/* Header */}
      <div className={ivory ? "mb-2 flex items-center justify-between gap-2" : "flex items-center justify-between mb-3"}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChangeMonth(currentMonth.subtract(1, "month"))}
          aria-label={ivory ? "Previous month" : undefined}
          className={ivory ? undefined : "h-7 w-7 rounded-lg"}
        >
          <ChevronLeft className={ivory ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
        <motion.span
          key={currentMonth.format("YYYY-MM")}
          initial={{ opacity: 0, y: ivory ? 0 : -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={ivory ? "text-hec-h3 tabular-nums text-hec-ink" : "text-sm font-semibold"}
        >
          {currentMonth.format("MMM YYYY")}
        </motion.span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChangeMonth(currentMonth.add(1, "month"))}
          aria-label={ivory ? "Next month" : undefined}
          className={ivory ? undefined : "h-7 w-7 rounded-lg"}
        >
          <ChevronRight className={ivory ? "h-5 w-5" : "h-4 w-4"} />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className={ivory ? "mb-1 grid grid-cols-7" : "grid grid-cols-7 gap-1 mb-1"}>
        {weekdays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              ivory ? "py-1 text-center text-hec-caption text-hec-ink-soft" : "text-center text-[10px] font-medium py-1",
              !ivory && (idx >= 5 ? "text-muted-foreground/50" : "text-muted-foreground")
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className={ivory ? "grid grid-cols-7" : "grid grid-cols-7 gap-1"}>
        <AnimatePresence mode="wait">
          {cells.map((date) => {
            const dateStr = date.format("YYYY-MM-DD");
            const isCurrentMonth = date.isSame(currentMonth, "month");
            const isToday = date.isSame(dayjs(), "day");
            const isSelected = selectedDate === dateStr;
            const hasEvent = eventDates.has(dateStr);

            return (
              <motion.button
                key={dateStr}
                whileHover={ivory ? undefined : { scale: 1.1 }}
                whileTap={ivory ? undefined : { scale: 0.95 }}
                onClick={() => onSelectDate(dateStr)}
                className={
                  ivory
                    ? cn(
                        "relative flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md text-hec-small font-medium tabular-nums transition-colors duration-hec-1 ease-hec",
                        FOCUS,
                        isCurrentMonth ? "text-hec-ink hover:bg-hec-sunken" : "text-hec-ink-faint hover:bg-hec-sunken",
                        isToday && !isSelected && "border border-hec-brass text-hec-brass",
                        isSelected && "bg-hec-action text-hec-on-action hover:bg-hec-action/90"
                      )
                    : cn(
                        "relative h-7 w-7 rounded-lg text-xs font-medium transition-all",
                        "flex items-center justify-center",
                        isCurrentMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground/40",
                        isToday && "ring-1 ring-primary ring-offset-1 ring-offset-background",
                        isSelected && "bg-primary text-primary-foreground shadow-md"
                      )
                }
              >
                {date.format("D")}
                {hasEvent && !isSelected && (
                  <motion.span
                    initial={{ scale: ivory ? 1 : 0 }}
                    animate={{ scale: 1 }}
                    className={
                      ivory
                        ? "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-hec-brass"
                        : "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    }
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick actions */}
      <div className={ivory ? "mt-2 flex gap-2 border-t border-hec-line pt-2" : "mt-3 pt-2 border-t border-border/50 flex gap-1"}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const today = dayjs();
            onChangeMonth(today);
            onSelectDate(today.format("YYYY-MM-DD"));
          }}
          className={ivory ? "flex-1" : "flex-1 h-7 text-xs rounded-lg"}
        >
          Today
        </Button>
      </div>
    </motion.div>
  );
}
