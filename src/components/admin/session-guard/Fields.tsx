import { useId } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { checkReason, typedDateMatches, TYPED_DATE_HINT } from "@/lib/sessionGuard";
import { cn } from "@/lib/utils";

interface ReasonProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min: number;
  disabled?: boolean;
  help?: string;
}

/** A required reason, with live character guidance tied to the box by aria-describedby. */
export function ReasonField({ label, value, onChange, min, disabled, help }: ReasonProps) {
  const id = useId();
  const check = checkReason(value, min);
  const touched = value.length > 0;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        rows={3}
        autoComplete="off"
        aria-required="true"
        aria-invalid={touched && !check.ok}
        aria-describedby={`${id}-help ${id}-count`}
        className="min-h-[88px] text-base sm:text-sm"
      />
      <p id={`${id}-help`} className="text-xs text-muted-foreground">
        {help ?? `Say what actually happened. At least ${min} characters; stock phrases are not accepted.`}
      </p>
      <p id={`${id}-count`} role="status" aria-live="polite" className={cn("text-xs", touched && !check.ok ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {touched ? check.message : `0 of ${min} characters`}
      </p>
    </div>
  );
}

interface TypedDateProps {
  lessonDate: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

/** Strong evidence: the admin has to type the lesson's date before the destructive button wakes up. */
export function TypedDateField({ lessonDate, value, onChange, disabled }: TypedDateProps) {
  const id = useId();
  const ok = typedDateMatches(value, lessonDate);
  const touched = value.trim().length > 0;
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium">
        Type the lesson date to continue
      </Label>
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD/MM/YYYY"
        aria-required="true"
        aria-invalid={touched && !ok}
        aria-describedby={`${id}-hint ${id}-state`}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.preventDefault();
        }}
        className="h-11 text-base sm:text-sm"
      />
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {TYPED_DATE_HINT} Look at the lesson's date at the top of this window and type it yourself.
      </p>
      <p id={`${id}-state`} role="status" aria-live="polite" className={cn("text-xs", touched && !ok ? "font-semibold text-foreground" : "text-muted-foreground")}>
        {!touched ? "Not typed yet." : ok ? "Date matches." : "That is not this lesson's date."}
      </p>
    </div>
  );
}

interface TickProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
  disabled?: boolean;
}

/** A confirmation tick with a 44px target; never pre-ticked. */
export function ConfirmTick({ checked, onChange, children, disabled }: TickProps) {
  const id = useId();
  return (
    <div className="flex min-h-11 items-start gap-3 rounded-xl border border-border p-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled} className="mt-0.5 h-5 w-5" />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal leading-snug break-words">
        {children}
      </Label>
    </div>
  );
}
