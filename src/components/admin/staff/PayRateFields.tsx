/**
 * How this person is paid — the control, shared by the teacher and TA
 * drawers.
 *
 * Two bases, one amount box. The alternative shape, two always-visible rate
 * inputs with a radio deciding which one counts, puts a number on screen
 * that is not being used and invites someone to edit it and wonder why
 * payroll did not move. Here the box is the rate, and its label says what
 * the rate is per.
 *
 * The line underneath is the reason this is a component rather than four
 * copies of an Input: switching basis changes what a number MEANS, and
 * 250,000 reads as reasonable under either label. Pricing the class's own
 * session length makes the consequence visible before the save — an admin
 * moving a teacher from 200,000/hour to 200,000/session on 90-minute
 * lessons is taking 100,000 a lesson off them, and should see that.
 */
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatMinutes, DEFAULT_SESSION_MINUTES } from "@/lib/sessionDuration";
import {
  PAY_RATE_TYPES,
  payRateError,
  payRateTypeLabel,
  sessionPayVnd,
  type PayRateType,
} from "@/lib/payRate";

export interface PayRateFieldsProps {
  payRateType: PayRateType;
  onPayRateTypeChange: (next: PayRateType) => void;
  /** The amount as typed, kept as a string so the box can be empty. */
  rate: string;
  onRateChange: (next: string) => void;
  /** Typical lesson length for the preview line. */
  previewMinutes?: number;
  idPrefix?: string;
}

export function PayRateFields({
  payRateType,
  onPayRateTypeChange,
  rate,
  onRateChange,
  previewMinutes = DEFAULT_SESSION_MINUTES,
  idPrefix = "pay",
}: PayRateFieldsProps) {
  const amount = Number(rate) || 0;
  const staff = {
    pay_rate_type: payRateType,
    hourly_rate_vnd: payRateType === "hourly" ? amount : 0,
    per_session_rate_vnd: payRateType === "per_session" ? amount : 0,
  };
  const perLesson = sessionPayVnd(staff, previewMinutes);
  const error = payRateError(payRateType, rate);

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div>
        <Label className="text-sm font-medium">How they are paid</Label>
        <RadioGroup
          value={payRateType}
          onValueChange={(v) => onPayRateTypeChange(v as PayRateType)}
          className="mt-2 flex gap-4"
        >
          {PAY_RATE_TYPES.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <RadioGroupItem value={t} id={`${idPrefix}-${t}`} />
              <Label htmlFor={`${idPrefix}-${t}`} className="font-normal cursor-pointer">
                {payRateTypeLabel(t)}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label htmlFor={`${idPrefix}-rate`}>
          {payRateType === "per_session" ? "Rate per session (VND)" : "Rate per hour (VND)"}
        </Label>
        <Input
          id={`${idPrefix}-rate`}
          type="number"
          min={0}
          inputMode="numeric"
          value={rate}
          onChange={(e) => onRateChange(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={`${idPrefix}-rate-note`}
        />
        <p
          id={`${idPrefix}-rate-note`}
          className={`mt-1.5 text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error ?? (
            payRateType === "per_session"
              ? `${perLesson.toLocaleString()} ₫ a lesson, however long it runs.`
              : `${perLesson.toLocaleString()} ₫ for a ${formatMinutes(previewMinutes)} lesson — longer lessons cost more.`
          )}
        </p>
      </div>
    </div>
  );
}
