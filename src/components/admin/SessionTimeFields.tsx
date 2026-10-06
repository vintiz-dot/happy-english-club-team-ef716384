import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addMinutesToTime,
  describeVariance,
  formatMinutes,
  formatSignedMinutes,
  getDurationVariance,
} from "@/lib/sessionDuration";

interface SessionTimeFieldsProps {
  startTime: string;
  endTime: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  /**
   * What this class runs on the date being edited, resolved from its weekly
   * slot for that day (see lib/classSchedule). Null disables the check.
   */
  expectedMinutes?: number | null;
  /**
   * Every length this class schedules. One of these is never an error, even
   * when it is not this day's usual length — that is a reschedule, not a typo.
   */
  acceptedLengths?: number[];
  /** True when the expected length came from a weekly slot rather than the
   *  class-wide fallback, so the copy can say which. */
  fromWeeklySlot?: boolean;
  /**
   * The expected length for a start time that has not been committed yet.
   *
   * `expectedMinutes` describes the CURRENT start. On a day with a morning
   * and an evening group the start time is what picks the slot, so filling
   * the end from the prop would use the group the admin just moved away
   * from — and because that is still a length the class runs, nothing would
   * warn about it. Pay is hourly, so the gap is paid.
   */
  lengthForStart?: (start: string) => number | null;
  idPrefix?: string;
}

/**
 * Start and end time, with the end derived from the class's configured length.
 *
 * Classes run for a fixed length, so typing the end time by hand was busywork
 * that also happened to be the single most expensive thing to get wrong:
 * teacher pay is hourly, computed straight from end minus start. Picking a
 * start now fills the end in, and if anyone overrides it the mismatch is
 * stated in plain language rather than silently flowing into payroll.
 *
 * The end stays editable on purpose. A session genuinely can run long, and
 * refusing to allow it would just push people to leave the time wrong
 * somewhere less visible.
 */
export function SessionTimeFields({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  expectedMinutes,
  acceptedLengths,
  fromWeeklySlot,
  lengthForStart,
  idPrefix = "session",
}: SessionTimeFieldsProps) {
  const rawVariance = getDurationVariance(startTime, endTime, expectedMinutes);
  // A length this class genuinely runs on some other day is a reschedule, not
  // a mistake. Saying so is more useful than a warning nobody can act on.
  const otherPattern =
    rawVariance != null && (acceptedLengths?.includes(rawVariance.actualMinutes) ?? false);
  const variance = otherPattern ? null : rawVariance;
  const suggestedEnd =
    expectedMinutes && startTime ? addMinutesToTime(startTime, expectedMinutes, false) : null;

  const handleStart = (value: string) => {
    onStartChange(value);
    // Resolve the length against the NEW start, not the prop, which still
    // describes the slot this start is moving away from.
    const minutes = (lengthForStart ? lengthForStart(value) : null) ?? expectedMinutes;
    // Only when we know the expected length - otherwise leave whatever is
    // there alone.
    if (minutes && value) {
      const next = addMinutesToTime(value, minutes, false);
      if (next) onEndChange(next);
    }
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-start`}>Start Time</Label>
          <Input
            id={`${idPrefix}-start`}
            type="time"
            value={startTime}
            onChange={(e) => handleStart(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-end`} className="flex items-center gap-1.5">
            End Time
            {expectedMinutes ? (
              <span className="text-[10px] font-normal text-muted-foreground">
                auto · {formatMinutes(expectedMinutes)}
              </span>
            ) : null}
          </Label>
          <Input
            id={`${idPrefix}-end`}
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            className={cn(variance && "border-warning focus-visible:ring-warning")}
          />
        </div>
      </div>

      {expectedMinutes ? (
        variance ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/5 p-2.5 text-xs">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {formatSignedMinutes(variance.deltaMinutes)} against the class setting
              </p>
              <p className="mt-0.5 text-muted-foreground">
                {describeVariance(variance)}
                {acceptedLengths && acceptedLengths.length > 0
                  ? ` — and this class only ever runs ${acceptedLengths
                      .map(formatMinutes)
                      .join(" or ")}`
                  : ""}
                . Teacher pay is hourly, so this changes what the session costs.
              </p>
              {suggestedEnd && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 h-7 gap-1 text-xs"
                  onClick={() => onEndChange(suggestedEnd)}
                >
                  <Check className="h-3 w-3" />
                  Set end to {suggestedEnd}
                </Button>
              )}
            </div>
          </div>
        ) : otherPattern && rawVariance ? (
          <p className="text-xs text-muted-foreground">
            {formatMinutes(rawVariance.actualMinutes)} — not this day's usual{" "}
            {formatMinutes(expectedMinutes)}, but a length this class does run. Left alone.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Matches {fromWeeklySlot ? "this day's schedule" : "the class setting"} of{" "}
            {formatMinutes(expectedMinutes)}.
          </p>
        )
      ) : null}
    </div>
  );
}
