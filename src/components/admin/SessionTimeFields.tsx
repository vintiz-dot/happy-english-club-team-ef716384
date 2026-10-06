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
  /** classes.default_session_length_minutes. Null disables the whole check. */
  expectedMinutes?: number | null;
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
  idPrefix = "session",
}: SessionTimeFieldsProps) {
  const variance = getDurationVariance(startTime, endTime, expectedMinutes);
  const suggestedEnd =
    expectedMinutes && startTime ? addMinutesToTime(startTime, expectedMinutes, false) : null;

  const handleStart = (value: string) => {
    onStartChange(value);
    // Keep the end in step with the class length. Only when we know the
    // expected length - otherwise leave whatever is there alone.
    if (expectedMinutes && value) {
      const next = addMinutesToTime(value, expectedMinutes, false);
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
                {describeVariance(variance)}. Teacher pay is hourly, so this changes what the
                session costs.
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
        ) : (
          <p className="text-xs text-muted-foreground">
            Matches the class setting of {formatMinutes(expectedMinutes)}.
          </p>
        )
      ) : null}
    </div>
  );
}
