/**
 * Pay rate, as a history rather than a single number.
 *
 * Two things an admin needs to do, which used to be the same edit and are
 * now deliberately different:
 *
 *   A RAISE, or a move between hourly and per-session from a date. Dated
 *   today or later. Months already paid keep the figures they were paid on,
 *   because calculate-payroll prices every session at the rate in force on
 *   its own date.
 *
 *   A CORRECTION - "they have always been per-session, we recorded it
 *   wrong". Dated in the past, and it re-prices everything from that date.
 *   That is the point of it, and it is also why this screen will not let it
 *   happen quietly: below the date box it names the months that already
 *   have payroll on record and would change.
 *
 * WHY BACKDATING IS ALLOWED HERE WHEN RecurringSessionsManager FORBIDS IT.
 * A backdated timetable would re-describe lessons that have already been
 * taught - it would be a claim about the past that is simply false. A
 * backdated rate is a claim about the past that may well be true, and when
 * the rate was recorded wrongly it is the only way to make the books right.
 * The two cases differ, so the two screens differ, and the warning is what
 * carries the weight here instead of a disabled input.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { History, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { dayjs } from "@/lib/date";
import { DEFAULT_SESSION_MINUTES } from "@/lib/sessionDuration";
import { PayRateFields } from "@/components/admin/staff/PayRateFields";
import { describeRate, payRateError, payRateTypeOf, type PayRateType } from "@/lib/payRate";
import {
  byEffectiveFromDesc,
  monthsRepricedBy,
  pendingRecords,
  rateOnDate,
  recordEndsOn,
  type PayRateRecord,
} from "@/lib/payHistory";

export interface PayRateHistoryProps {
  staffId: string;
  staffType: "teacher" | "assistant";
  /** The staff row, used as the fallback rate and kept in step on save. */
  staff: { pay_rate_type?: string | null; hourly_rate_vnd?: number | null; per_session_rate_vnd?: number | null };
  previewMinutes?: number;
}

/** 1900-01-01 is the backfill baseline, not a date anyone chose. */
const BASELINE = "1900-01-01";
const fmt = (d: string) => (d <= BASELINE ? "From the start" : dayjs(d).format("D MMM YYYY"));

export function PayRateHistory({ staffId, staffType, staff, previewMinutes = DEFAULT_SESSION_MINUTES }: PayRateHistoryProps) {
  const queryClient = useQueryClient();
  // Captured once per render so a page left open overnight does not start
  // disagreeing with itself about what "today" means mid-edit.
  const [today] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [effectiveFrom, setEffectiveFrom] = useState(today);
  const [payRateType, setPayRateType] = useState<PayRateType>(() => payRateTypeOf(staff));
  const [rate, setRate] = useState("");
  const [note, setNote] = useState("");

  const subject = staffType === "teacher" ? "teacher_id" : "assistant_id";

  const { data: records = [] } = useQuery({
    queryKey: ["staff-pay-rates", staffType, staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_pay_rates")
        .select("id, teacher_id, assistant_id, effective_from, pay_rate_type, hourly_rate_vnd, per_session_rate_vnd, note, created_at")
        .eq(subject, staffId);
      if (error) throw error;
      return (data ?? []) as PayRateRecord[];
    },
    enabled: !!staffId,
  });

  // Which months would a backdated change actually move. Only teachers have
  // payroll_summaries rows, so for a TA the list is empty and the warning
  // below says "months from X" instead of naming them - better than naming
  // the wrong set.
  const { data: monthsOnRecord = [] } = useQuery({
    queryKey: ["payroll-months", staffId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_summaries")
        .select("month")
        .eq("teacher_id", staffId);
      if (error) throw error;
      return [...new Set((data ?? []).map((r) => String(r.month).slice(0, 7)))];
    },
    enabled: !!staffId && staffType === "teacher",
  });

  const sorted = useMemo(() => [...records].sort(byEffectiveFromDesc), [records]);
  const upcoming = pendingRecords(sorted, today);
  const inForce = rateOnDate(sorted, today, staff);
  const isBackdated = effectiveFrom < today;
  const reprices = isBackdated ? monthsRepricedBy(effectiveFrom, monthsOnRecord) : [];
  const error = payRateError(payRateType, rate);

  const save = useMutation({
    mutationFn: async () => {
      const amount = Number(rate) || 0;
      const row = {
        [subject]: staffId,
        effective_from: effectiveFrom,
        pay_rate_type: payRateType,
        hourly_rate_vnd: payRateType === "hourly" ? amount : 0,
        per_session_rate_vnd: payRateType === "per_session" ? amount : 0,
        note: note.trim() || null,
        created_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      };
      // Upsert on (subject, effective_from): correcting a change you just
      // entered for the same date is one rate, not two. The partial unique
      // indexes in 20261021090000 are what this conflict target names.
      const { error: insErr } = await supabase
        .from("staff_pay_rates")
        .upsert(row, { onConflict: `${subject},effective_from` });
      if (insErr) throw insErr;

      // The staff row mirrors the rate in force TODAY - the same split as
      // classes.schedule_template against class_schedule_versions. Computed
      // from the full list rather than from this edit, so a future-dated
      // raise leaves it alone while a backdated correction moves it.
      const next = rateOnDate([{ ...(row as PayRateRecord) }, ...sorted].sort(byEffectiveFromDesc), today, staff);
      const { error: upErr } = await supabase
        .from(staffType === "teacher" ? "teachers" : "teaching_assistants")
        .update({
          pay_rate_type: next.pay_rate_type,
          hourly_rate_vnd: next.hourly_rate_vnd,
          per_session_rate_vnd: next.per_session_rate_vnd,
        })
        .eq("id", staffId);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      toast.success(
        isBackdated
          ? `Recorded from ${fmt(effectiveFrom)} — re-run payroll for the affected months to apply it`
          : effectiveFrom === today
            ? "Pay rate updated"
            : `Saved — this takes effect on ${fmt(effectiveFrom)}`,
      );
      setRate("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["staff-pay-rates", staffType, staffId] });
      queryClient.invalidateQueries({ queryKey: ["teachers"] });
      queryClient.invalidateQueries({ queryKey: ["teaching-assistants"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Could not record the rate change"),
  });

  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-muted/40 p-3">
        <p className="text-xs text-muted-foreground">On right now</p>
        <p className="text-sm font-semibold">{describeRate(inForce)}</p>
      </div>

      <PayRateFields
        payRateType={payRateType}
        onPayRateTypeChange={setPayRateType}
        rate={rate}
        onRateChange={setRate}
        previewMinutes={previewMinutes}
        idPrefix={`payhist-${staffId}`}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor={`payhist-from-${staffId}`}>Takes effect from</Label>
          <Input
            id={`payhist-from-${staffId}`}
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value || today)}
          />
        </div>
        <div>
          <Label htmlFor={`payhist-note-${staffId}`}>
            Why <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id={`payhist-note-${staffId}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isBackdated ? "Correcting a mis-recorded rate" : "Annual review"}
          />
        </div>
      </div>

      {isBackdated ? (
        <div className="flex gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-xs">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">This is backdated — it changes what past months cost.</p>
            {reprices.length > 0 ? (
              <p>
                {reprices.length} month{reprices.length === 1 ? "" : "s"} already have payroll on record and
                would be re-priced: {reprices.map((m) => dayjs(`${m}-01`).format("MMM YYYY")).join(", ")}.
                Re-run payroll for each to apply it.
              </p>
            ) : (
              <p>
                Everything from {fmt(effectiveFrom)} onwards will be re-priced the next time payroll is run for
                those months.
              </p>
            )}
            <p className="text-muted-foreground">
              Use this to correct a rate that was recorded wrongly. For a raise, set the date to today or later
              and nothing already paid will move.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {effectiveFrom === today
            ? "Applies from today. Months already paid keep the rate they were paid at."
            : `Saved now, applies on ${fmt(effectiveFrom)}. Nothing changes until then.`}
        </p>
      )}

      <Button
        onClick={() => save.mutate()}
        disabled={!rate || !!error || save.isPending}
        className="w-full"
      >
        {save.isPending ? "Saving…" : "Record rate change"}
      </Button>

      {upcoming.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs font-semibold">Scheduled change{upcoming.length === 1 ? "" : "s"}</p>
          {upcoming.map((r) => (
            <p key={r.id ?? r.effective_from} className="mt-1 text-xs">
              <span className="font-medium">{fmt(r.effective_from)}</span> — {describeRate(r)}
              {r.note ? ` · ${r.note}` : ""}
            </p>
          ))}
          <p className="mt-1 text-xs text-muted-foreground">Not in force yet.</p>
        </div>
      )}

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <History className="h-3.5 w-3.5" /> Rate history
        </p>
        <div className="space-y-1">
          {sorted.length === 0 && <p className="text-xs text-muted-foreground">Nothing recorded yet.</p>}
          {sorted.map((r) => {
            const until = recordEndsOn(sorted, r);
            const current = !until && r.effective_from <= today;
            return (
              <div key={r.id ?? r.effective_from} className="flex items-start justify-between gap-2 rounded border px-2.5 py-1.5 text-xs">
                <div>
                  <p className="font-medium">
                    {fmt(r.effective_from)} {until ? `– ${fmt(until)}` : "– now"}
                  </p>
                  {r.note && <p className="text-muted-foreground">{r.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span>{describeRate(r)}</span>
                  {current && <Badge variant="secondary">Current</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
