import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_META, type StatusKey } from "./lib/calendarStatus";

export interface CalendarFilterValue {
  classes: string[];
  teachers: string[];
  statuses: StatusKey[];
  actionableOnly: boolean;
}

export const EMPTY_FILTERS: CalendarFilterValue = {
  classes: [],
  teachers: [],
  statuses: [],
  actionableOnly: false,
};

export const hasActiveFilters = (v: CalendarFilterValue) =>
  v.classes.length > 0 || v.teachers.length > 0 || v.statuses.length > 0 || v.actionableOnly;

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  if (options.length === 0) return null;

  const toggle = (option: string) =>
    onChange(
      selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option],
    );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-8 gap-1.5", selected.length > 0 && "border-primary/50 bg-primary/5")}
        >
          {label}
          {selected.length > 0 && (
            <span className="rounded bg-primary/15 px-1 text-[10px] font-semibold tabular-nums text-primary">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1.5">
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
              />
              <span className="truncate">{option}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-1 w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface CalendarFiltersProps {
  classes: string[];
  teachers: string[];
  statuses: StatusKey[];
  value: CalendarFilterValue;
  onChange: (next: CalendarFilterValue) => void;
  actionableCount: number;
}

export default function CalendarFilters({
  classes,
  teachers,
  statuses,
  value,
  onChange,
  actionableCount,
}: CalendarFiltersProps) {
  const toggleStatus = (key: StatusKey) =>
    onChange({
      ...value,
      statuses: value.statuses.includes(key)
        ? value.statuses.filter((s) => s !== key)
        : [...value.statuses, key],
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* The one state that needs acting on gets a dedicated control, not a
          legend entry. If nothing is outstanding it stays quiet. */}
      {/* The label stays on `text-foreground` and the colour is carried by the
          icon, border and a solid count pill.
          `text-warning-foreground` is the colour meant to sit ON solid amber —
          used over a 10% tint it rendered white-on-white and the button looked
          empty. Only the pill pairs warning with warning-foreground, which is
          the combination those two tokens are actually defined for. */}
      <Button
        variant={value.actionableOnly ? "default" : "outline"}
        size="sm"
        onClick={() => onChange({ ...value, actionableOnly: !value.actionableOnly })}
        disabled={actionableCount === 0 && !value.actionableOnly}
        className={cn(
          "h-8 gap-1.5",
          actionableCount > 0 && !value.actionableOnly && "border-warning/60 text-foreground",
        )}
      >
        <AlertTriangle
          className={cn(
            "h-3.5 w-3.5",
            actionableCount > 0 && !value.actionableOnly && "text-warning",
          )}
        />
        {actionableCount > 0 ? (
          <>
            <span
              className={cn(
                "rounded px-1 text-[10px] font-semibold tabular-nums",
                value.actionableOnly
                  ? "bg-primary-foreground/20"
                  : "bg-warning text-warning-foreground",
              )}
            >
              {actionableCount}
            </span>
            need attendance
          </>
        ) : (
          "Attendance up to date"
        )}
      </Button>

      <MultiSelect
        label="Class"
        options={classes}
        selected={value.classes}
        onChange={(classes) => onChange({ ...value, classes })}
      />
      <MultiSelect
        label="Teacher"
        options={teachers}
        selected={value.teachers}
        onChange={(teachers) => onChange({ ...value, teachers })}
      />

      {/* Only statuses actually present in the visible range, so this is a
          working filter rather than a six-item legend that never changes. */}
      {statuses.length > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          {statuses.map((key) => {
            const meta = STATUS_META[key];
            const active = value.statuses.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatus(key)}
                aria-pressed={active}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-md border px-2 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-primary/50 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:bg-muted",
                )}
              >
                <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                {meta.label}
                {active && <Check className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
      )}

      {hasActiveFilters(value) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange(EMPTY_FILTERS)}
          className="h-8 gap-1 text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
