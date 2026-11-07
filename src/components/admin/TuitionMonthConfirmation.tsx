import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isPaymentMonthConfirmed } from "@/lib/paymentMonth";

export function useTuitionMonthConfirmation(month: string, open = true) {
  const [confirmedMonth, setConfirmedMonth] = useState("");
  useEffect(() => { setConfirmedMonth(""); }, [month, open]);
  return {
    confirmed: isPaymentMonthConfirmed(month, confirmedMonth),
    reset: () => setConfirmedMonth(""),
    field: <TuitionMonthConfirmation month={month} value={confirmedMonth} onChange={setConfirmedMonth} />,
  };
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