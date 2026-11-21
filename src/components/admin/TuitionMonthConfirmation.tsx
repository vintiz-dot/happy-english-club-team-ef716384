import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPaymentMonthConfirmed } from "@/lib/paymentMonth";
import { earlierOwing, familyOldestOwingMonth, owingMonthLine, type OwingMonth } from "@/lib/owingMonth";
import { useOwingBills } from "@/hooks/useOwingMonths";

export interface OwingSuggestionOptions {
  /** The child, or every child of the family, the payment is from. */
  studentIds?: readonly string[];
  /**
   * Switches the screen to the suggested month. Picking it does NOT confirm
   * it: changing the month resets the confirmation, and the admin confirms
   * the new month by hand. Without it the line says how to switch.
   */
  onUseMonth?: (month: string) => void;
}

// The admin confirms the tuition month a payment is for, separately from the
// receipt date, every time (reset on reopen and on a month change). Since the
// Nov 2026 tuition audit (pattern D) the field also SUGGESTS the oldest month
// the child or family still owes when it is earlier than the screen's month
// (src/lib/owingMonth.ts). It suggests only: nothing here ever confirms.
export function useTuitionMonthConfirmation(month: string, open = true, owing: OwingSuggestionOptions = {}) {
  const [confirmedMonth, setConfirmedMonth] = useState("");
  useEffect(() => { setConfirmedMonth(""); }, [month, open]);
  const { data: bills } = useOwingBills(owing.studentIds ?? [], open);
  const suggestion = earlierOwing(bills ? familyOldestOwingMonth(bills) : null, month);
  return {
    confirmed: isPaymentMonthConfirmed(month, confirmedMonth),
    reset: () => setConfirmedMonth(""),
    suggestion,
    field: <>
      {suggestion && <OwingMonthSuggestion owing={suggestion} onUseMonth={owing.onUseMonth} />}
      <TuitionMonthConfirmation month={month} value={confirmedMonth} onChange={setConfirmedMonth} />
    </>,
  };
}

export function OwingMonthSuggestion({ owing, onUseMonth }: { owing: OwingMonth; onUseMonth?: (month: string) => void }) {
  return <div role="status" data-owing-month={owing.month}
    className="flex flex-wrap items-center gap-2 rounded-hec-md border border-hec-warn/30 bg-hec-warn-tint px-3 py-2 text-hec-small text-hec-ink">
    <span className="min-w-0 flex-1">{owingMonthLine(owing)}</span>
    {onUseMonth
      ? <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => onUseMonth(owing.month)}>
          Use {owing.month}
        </Button>
      : <span className="text-hec-caption text-hec-ink-soft">If so, switch the tuition month to {owing.month} and record it there.</span>}
  </div>;
}

function TuitionMonthConfirmation({ month, value, onChange }: {
  month: string; value: string; onChange: (value: string) => void;
}) {
  const id = useId();
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const label = valid ? new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-GB", {
    month: "long", year: "numeric", timeZone: "UTC",
  }) : "Choose a tuition month";
  return <div className="space-y-2">
    <Label htmlFor={id}>What month is this tuition payment for? *</Label>
    <Select value={value} onValueChange={onChange} disabled={!valid}>
      <SelectTrigger id={id}><SelectValue placeholder="Confirm tuition month" /></SelectTrigger>
      <SelectContent><SelectItem value={month || "unset"}>{label}</SelectItem></SelectContent>
    </Select>
  </div>;
}
