import { dayjs } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface MonthPickerProps {
  value: string;
  onChange: (value: string) => void;
  maxMonth?: string;
  minMonth?: string;
}

export function MonthPicker({ value, onChange, maxMonth, minMonth }: MonthPickerProps) {
  const endMonth = maxMonth || dayjs().format("YYYY-MM");
  const startMonth = minMonth || dayjs(endMonth).subtract(11, "month").format("YYYY-MM");

  // Build full inclusive range from endMonth back to startMonth (newest first)
  const months: string[] = [];
  let cursor = dayjs(endMonth);
  const start = dayjs(startMonth);
  // Safety cap to avoid runaway loops
  let guard = 0;
  while ((cursor.isAfter(start) || cursor.isSame(start, "month")) && guard < 600) {
    months.push(cursor.format("YYYY-MM"));
    cursor = cursor.subtract(1, "month");
    guard++;
  }

  // Group by year for a calendar-like grouped dropdown
  const grouped = months.reduce<Record<string, string[]>>((acc, m) => {
    const y = m.slice(0, 4);
    (acc[y] ||= []).push(m);
    return acc;
  }, {});
  const years = Object.keys(grouped).sort((a, b) => Number(b) - Number(a));

  return (
    <Select value={value} onValueChange={onChange}>
      {/* Named for a screen reader (axe button-name); the name starts with what is shown. */}
      <SelectTrigger className="w-[220px]" aria-label={`${dayjs(value).format("MMMM YYYY")}, choose a month`}>
        <Calendar className="h-4 w-4 mr-2" />
        <SelectValue>{dayjs(value).format("MMMM YYYY")}</SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[360px]">
        {years.map((y) => (
          <div key={y}>
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">
              {y}
            </div>
            {grouped[y].map((month) => (
              <SelectItem key={month} value={month}>
                {dayjs(month).format("MMMM YYYY")}
              </SelectItem>
            ))}
          </div>
        ))}
      </SelectContent>
    </Select>
  );
}
