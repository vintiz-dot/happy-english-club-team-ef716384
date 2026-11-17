import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, AlertTriangle, Timer, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type ClassColor } from "@/lib/classColors";
import { STATUS_META_IVORY, type StatusKey } from "./lib/calendarStatus";

/** The `FOCUS` ring of docs/DESIGN_SYSTEM.md s.15. */
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export interface CalendarFilterValue {
  classes: string[];
  teachers: string[];
  statuses: StatusKey[];
  actionableOnly: boolean;
  /** Only sessions whose length disagrees with their class setting. */
  varianceOnly: boolean;
}

export const EMPTY_FILTERS: CalendarFilterValue = {
  classes: [],
  teachers: [],
  statuses: [],
  actionableOnly: false,
  varianceOnly: false,
};

export const hasActiveFilters = (v: CalendarFilterValue) =>
  v.classes.length > 0 ||
  v.teachers.length > 0 ||
  v.statuses.length > 0 ||
  v.actionableOnly ||
  v.varianceOnly;

export interface ClassOption {
  name: string;
  /** Stable key the colour is derived from (the class id). */
  colorKey: string;
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  swatches,
  colorFor,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  /** Optional colour key per option, shown as a dot. */
  swatches?: Record<string, string>;
  colorFor?: (key: string) => ClassColor;
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
          className={
            cn("gap-2", selected.length > 0 && "border-hec-brass bg-hec-sunken")
          }
        >
          {label}
          {selected.length > 0 && (
            <span className="rounded-full border border-hec-brass/40 px-2 text-hec-caption font-medium tabular-nums text-hec-brass">
              {selected.length}
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-hec-ink-soft" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-72 max-w-[calc(100vw-2rem)] p-2">
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {options.map((option) => (
            <label
              key={option}
              className="flex min-h-hec-target cursor-pointer items-start gap-3 rounded-hec-sm px-2 py-3 text-hec-small text-hec-ink hover:bg-hec-sunken"
            >
              <Checkbox
                checked={selected.includes(option)}
                onCheckedChange={() => toggle(option)}
                className="mt-0.5"
              />
              {swatches?.[option] && colorFor && (
                <span
                  aria-hidden
                  className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", colorFor(swatches[option]).rail)}
                />
              )}
              <span className="min-w-0 flex-1 whitespace-normal break-words hyphens-none">{option}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className={cn("mt-1 flex min-h-hec-target w-full items-center rounded-hec-sm px-2 text-left text-hec-small text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink", FOCUS)}
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface CalendarFiltersProps {
  classes: ClassOption[];
  teachers: string[];
  statuses: StatusKey[];
  value: CalendarFilterValue;
  onChange: (next: CalendarFilterValue) => void;
  actionableCount: number;
  /** Sessions whose length disagrees with their class setting. */
  varianceCount: number;
  colorFor: (key: string) => ClassColor;
}

export default function CalendarFilters({
  classes,
  teachers,
  statuses,
  value,
  onChange,
  actionableCount,
  varianceCount,
  colorFor,
}: CalendarFiltersProps) {
  const classNames = classes.map((c) => c.name);
  const classSwatches = Object.fromEntries(classes.map((c) => [c.name, c.colorKey]));
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
        className={
          cn("gap-2", actionableCount > 0 && !value.actionableOnly && "border-hec-warn/30 bg-hec-warn-tint text-hec-ink hover:bg-hec-warn-tint/80")}
      >
        <AlertTriangle
          className={
            cn("h-4 w-4", actionableCount > 0 && !value.actionableOnly && "text-hec-warn")}
        />
        {actionableCount > 0 ? (
          <>
            <span
              className={
                cn("rounded-full px-2 text-hec-caption font-semibold tabular-nums", value.actionableOnly ? "bg-hec-on-action/20" : "bg-hec-warn text-hec-warn-tint")}
            >
              {actionableCount}
            </span>
            need attendance
          </>
        ) : (
          "Attendance up to date"
        )}
      </Button>

      {/* Duration mismatches are a money problem, not a cosmetic one: pay is
          hourly, so a session running longer than its class is configured for
          is an overpayment. Surfaced next to attendance for the same reason. */}
      {varianceCount > 0 && (
        <Button
          variant={value.varianceOnly ? "default" : "outline"}
          size="sm"
          onClick={() => onChange({ ...value, varianceOnly: !value.varianceOnly })}
          className={
            cn("gap-2", !value.varianceOnly && "border-hec-warn/30 bg-hec-warn-tint text-hec-ink hover:bg-hec-warn-tint/80")
          }
        >
          <Timer className={cn("h-4 w-4", !value.varianceOnly && "text-hec-warn")} />
          <span
            className={
              cn("rounded-full px-2 text-hec-caption font-semibold tabular-nums", value.varianceOnly ? "bg-hec-on-action/20" : "bg-hec-warn text-hec-warn-tint")}
          >
            {varianceCount}
          </span>
          wrong length
        </Button>
      )}

      <MultiSelect
        label="Class"
        options={classNames}
        selected={value.classes}
        onChange={(classes) => onChange({ ...value, classes })}
        swatches={classSwatches}
        colorFor={colorFor}
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
        <div className="flex flex-wrap items-center gap-2">
          {statuses.map((key) => {
            const meta = STATUS_META_IVORY[key];
            const active = value.statuses.includes(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleStatus(key)}
                aria-pressed={active}
                className={cn(
                  "flex min-h-hec-target items-center gap-2 rounded-hec-md border px-3 text-hec-caption font-medium transition-colors duration-hec-1 ease-hec",
                  FOCUS,
                  active
                    ? "border-hec-brass bg-hec-sunken text-hec-ink"
                    : "border-hec-line-strong text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink",
                )}
              >
                <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
                {meta.label}
                {active && <Check className="h-4 w-4" />}
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
          className="gap-2 text-hec-ink-soft"
        >
          <X className="h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
