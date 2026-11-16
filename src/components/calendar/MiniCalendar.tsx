import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dayjs } from "@/lib/date";

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

interface MiniCalendarProps {
  currentMonth: dayjs.Dayjs;
  selectedDate?: string;
  eventDates?: Set<string>;
  onSelectDate: (date: string) => void;
  onChangeMonth: (month: dayjs.Dayjs) => void;
  className?: string;
}

export default function MiniCalendar({
  currentMonth,
  selectedDate,
  eventDates = new Set(),
  onSelectDate,
  onChangeMonth,
  className,
}: MiniCalendarProps) {
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
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        // At 375 the anchor sits mid-row, so the panel is placed on the
        // viewport (16 px gutters) instead of hanging off the right edge,
        // just under the top bar: left at its static place it opened mid-screen
        // and, being fixed, its last rows ran off the bottom out of reach.
        "max-sm:fixed max-sm:inset-x-4 max-sm:top-16 w-auto rounded-hec-md border border-hec-line bg-hec-raised p-2 text-hec-ink shadow-hec-2 sm:w-[22rem]",
        undefined,
        className
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChangeMonth(currentMonth.subtract(1, "month"))}
          aria-label="Previous month"
          className={undefined}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <motion.span
          key={currentMonth.format("YYYY-MM")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-hec-h3 font-medium tabular-nums text-hec-ink"
        >
          {currentMonth.format("MMM YYYY")}
        </motion.span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChangeMonth(currentMonth.add(1, "month"))}
          aria-label="Next month"
          className={undefined}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="mb-1 grid grid-cols-7">
        {weekdays.map((day, idx) => (
          <div
            key={idx}
            className={cn(
              "py-1 text-center text-hec-caption font-medium text-hec-ink-soft",
              undefined
            )}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7">
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
                whileHover={undefined}
                whileTap={undefined}
                onClick={() => onSelectDate(dateStr)}
                className={
                  cn(
                        "relative flex min-h-hec-target w-full items-center justify-center rounded-hec-sm text-hec-small tabular-nums transition-colors duration-hec-1 ease-hec",
                        FOCUS,
                        isCurrentMonth ? "text-hec-ink hover:bg-hec-sunken" : "text-hec-ink-faint",
                        isToday && !isSelected && "font-semibold text-hec-brass",
                        isSelected && "bg-hec-action font-semibold text-hec-on-action hover:bg-hec-action/90",
                      )}
              >
                {date.format("D")}
                {hasEvent && !isSelected && (
                  <motion.span
                    initial={false}
                    animate={{ scale: 1 }}
                    className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-hec-brass"
                  />
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick actions */}
      <div className="mt-2 flex border-t border-hec-line pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const today = dayjs();
            onChangeMonth(today);
            onSelectDate(today.format("YYYY-MM-DD"));
          }}
          className="flex-1"
        >
          Today
        </Button>
      </div>
    </motion.div>
  );
}
