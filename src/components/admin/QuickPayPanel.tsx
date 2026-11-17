import { useState, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatars";
import { useLiveTuitionData } from "@/hooks/useLiveTuitionData";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Zap,
  CheckCircle2,
  CircleDollarSign,
  Loader2,
  Wallet,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTuitionMonthConfirmation } from "./TuitionMonthConfirmation";
import { labelForPayment, monthCharged } from "@/lib/invoiceStatus";
import { CHANGED_SINCE_LOADED } from "@/lib/recordedPaymentWrite";
import { newPaymentKey, receiptDateToday, recordPayment } from "@/lib/recordPayment";

interface QuickPayPanelProps {
  month: string;
}

/**
 * QuickPay — one screen, one click "Mark Paid" for monthly tuition.
 * Replaces the multi-step open-dialog → enter-amount → submit dance.
 *
 * Workflow:
 *   1. Select month (parent supplies it).
 *   2. See every student with outstanding > 0.
 *   3. Pre-checked by default. Amount auto-filled to outstanding.
 *   4. Edit per-row if needed; uncheck to skip.
 *   5. Hit "Record N payments" — one batched mutation runs the full set.
 */
export function QuickPayPanel({ month }: QuickPayPanelProps) {
  const tuitionMonth = useTuitionMonthConfirmation(month);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tuitionData, isLoading, refetch } = useLiveTuitionData(month);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState(() => receiptDateToday());
  const [method, setMethod] = useState("Cash");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  // One key per student per attempt (src/lib/recordPayment.ts): a second
  // click, or a retry after no reply, records nothing more.
  const paymentKeys = useRef(new Map<string, string>());
  const keyFor = (studentId: string) => {
    let k = paymentKeys.current.get(studentId);
    if (!k) { k = newPaymentKey(); paymentKeys.current.set(studentId, k); }
    return k;
  };

  // Only rows that owe money this month
  const unpaid = useMemo(() => {
    if (!tuitionData) return [];
    return tuitionData
      .filter((i) => {
        const outstanding = Math.max(0, (i.finalPayable ?? 0) - (i.recorded_payment ?? 0));
        return outstanding > 0;
      })
      .filter((i) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (i.students as any)?.full_name?.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const an = (a.students as any)?.full_name || "";
        const bn = (b.students as any)?.full_name || "";
        return an.localeCompare(bn);
      });
  }, [tuitionData, search]);

  const getOutstanding = (item: any) =>
    Math.max(0, (item.finalPayable ?? 0) - (item.recorded_payment ?? 0));

  const getEntryAmount = (item: any) => {
    const override = overrides[item.student_id];
    if (override !== undefined) return parseInt(override) || 0;
    return getOutstanding(item);
  };

  const selectedRows = unpaid.filter((i) => !skipped.has(i.student_id));
  const totalToCollect = selectedRows.reduce((sum, i) => sum + getEntryAmount(i), 0);

  const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

  const toggleRow = (id: string) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const skipAll = () => setSkipped(new Set(unpaid.map((i) => i.student_id)));
  const selectAll = () => setSkipped(new Set());

  const handleRecord = async () => {
    if (!tuitionMonth.confirmed) { toast.error("Confirm the tuition month before recording payments"); return; }
    if (selectedRows.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    setSaving(true);
    setCompletedIds(new Set());

    let successCount = 0;
    let failCount = 0;
    const savedIds = new Set<string>();
    const conflicts: string[] = [];
    const refusals: string[] = [];
    const recordedAfter = new Map<string, number>();

    try {
      for (const item of selectedRows) {
        const enteredAmount = getEntryAmount(item);
        if (enteredAmount <= 0) continue;

        const alreadyPaid = (item as any).recorded_payment ?? 0;
        const invoiceId = String((item as any).id ?? "");
        const isPersistedInvoice = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(invoiceId);
        const name = (item.students as any)?.full_name || "a student";

        try {
          // record-payment (D5 G-1): payment row, both ledger legs and the
          // bill together, against the figure this screen showed. It writes
          // the audit row and creates a missing bill through calculate-tuition.
          const saved = await recordPayment(supabase, {
            studentId: item.student_id,
            month,
            kind: "payment",
            amount: enteredAmount,
            method,
            occurredAt: date,
            memo: "Quick Pay",
            idempotencyKey: keyFor(item.student_id),
            ...(isPersistedInvoice ? { expectedRecorded: alreadyPaid } : {}),
          });
          if (saved.ok || saved.answered) paymentKeys.current.delete(item.student_id);
          if (!saved.ok) {
            if (saved.conflict) conflicts.push(name);
            else refusals.push(`${name}: ${saved.message}`);
            failCount++;
            continue;
          }
          recordedAfter.set(item.student_id, saved.data!.recordedAfter);

          successCount++;
          savedIds.add(item.student_id);
          setCompletedIds((prev) => new Set(prev).add(item.student_id));
        } catch (err) {
          console.error(`QuickPay failed for ${(item.students as any)?.full_name}:`, err);
          failCount++;
        }
      }

      // Optimistic patch + refresh
      queryClient.setQueryData(["admin-tuition-live", month], (old: any[] | undefined) => {
        if (!old) return old;
        return old.map((row) => {
          if (skipped.has(row.student_id) || !savedIds.has(row.student_id)) return row; // only what was really saved
          // What the function says the bill now records.
          const newRecorded = recordedAfter.get(row.student_id);
          if (newRecorded === undefined) return row;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - newRecorded);
          const credit = Math.max(0, newRecorded - fp);
          const status = labelForPayment(row.status, newRecorded, fp, monthCharged(row)) ?? row.status;
          return {
            ...row,
            recorded_payment: newRecorded,
            balance: debt > 0 ? debt : -credit,
            carry_out_debt: debt,
            carry_out_credit: credit,
            status,
          };
        });
      });
      queryClient.invalidateQueries({ queryKey: ["admin-tuition-live", month] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });

      if (failCount === 0) {
        toast.success(`Recorded ${successCount} payment${successCount === 1 ? "" : "s"} totalling ${fmt(totalToCollect)}`);
      } else {
        toast.warning(`${successCount} succeeded, ${failCount} failed`);
      }
      if (conflicts.length > 0) {
        // conflict: those bills changed since the list was loaded; nothing was written to them
        toast.error(`${conflicts.join(", ")}: ${CHANGED_SINCE_LOADED}`);
      }
      // Each refusal in the function's own words: nothing was recorded for them.
      for (const r of refusals) toast.error(r);

      setOverrides({});
      tuitionMonth.reset();
      // Soft reset: leave checkmarks visible briefly so admin sees what landed
      setTimeout(() => {
        setCompletedIds(new Set());
        refetch();
      }, 1200);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-hec-body text-hec-ink-soft">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Loading tuition…
        </CardContent>
      </Card>
    );
  }

  if (unpaid.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto text-hec-leaf mb-3" />
          <p className="text-hec-h3 font-semibold text-hec-ink">All caught up</p>
          <p className="text-hec-small text-hec-ink-soft mt-1">
            No outstanding tuition for this month.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-hec-line">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-hec-brass" />
              Quick Pay
            </CardTitle>
            <CardDescription>
              One screen. One click. Mark every paid student in seconds.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-hec-small">
            <Wallet className="h-4 w-4 text-hec-ink-soft" />
            <span className="text-hec-ink-soft">To collect:</span>
            <span className="whitespace-nowrap font-sans font-semibold text-hec-body text-hec-ink tabular-nums">
              {fmt(totalToCollect)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4 sm:pt-6">
        {tuitionMonth.field}
        {/* Top controls */}
        <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="min-w-0 space-y-2">
            <Label htmlFor="quickpay-date" className="text-hec-small font-medium text-hec-ink">Payment date</Label>
            <Input
              id="quickpay-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className=""
            />
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="text-hec-small font-medium text-hec-ink" htmlFor="quickpay-method">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger id="quickpay-method" className="">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 min-[400px]:col-span-2 space-y-2">
            <Label className="text-hec-small font-medium text-hec-ink">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hec-ink-faint" />
              <Input
                placeholder="Filter by student name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Selection toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-hec-small">
          <div className="flex items-center gap-3 text-hec-ink-soft">
            <span>
              <span className="font-semibold text-hec-ink tabular-nums">{selectedRows.length}</span> of{" "}
              {unpaid.length} selected
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Outstanding total:{" "}
              <span className="whitespace-nowrap font-semibold text-hec-ink tabular-nums">
                {fmt(unpaid.reduce((s, i) => s + getOutstanding(i), 0))}
              </span>
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              Select all
            </Button>
            <Button variant="ghost" size="sm" onClick={skipAll}>
              Clear
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="rounded-hec-lg border border-hec-line bg-hec-surface divide-y divide-hec-line max-h-[55vh] overflow-y-auto">
          {unpaid.map((item) => {
            const outstanding = getOutstanding(item);
            const entryAmount = getEntryAmount(item);
            const isSkipped = skipped.has(item.student_id);
            const isDone = completedIds.has(item.student_id);
            const isPartial = entryAmount > 0 && entryAmount < outstanding;
            const studentName = (item.students as any)?.full_name || "Unknown";
            return (
              <div
                key={item.student_id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3 transition-colors duration-hec-1 ease-hec",
                  isSkipped && "opacity-50",
                  isDone && "bg-hec-leaf-tint"
                )}
              >
                <label className="-m-3 flex min-h-hec-target min-w-hec-target shrink-0 cursor-pointer items-center justify-center">
                    <Checkbox
                      checked={!isSkipped}
                      onCheckedChange={() => toggleRow(item.student_id)}
                      className="shrink-0"
                      aria-label={`Include ${studentName}`}
                    />
                  </label>
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarImage src={getAvatarUrl((item.students as any)?.avatar_url) || undefined} />
                  <AvatarFallback className="bg-hec-sunken text-hec-caption text-hec-ink-soft">
                    {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 basis-40">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{studentName}</p>
                    {isDone && (
                      <Badge className="shrink-0 border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Recorded
                      </Badge>
                    )}
                    {isPartial && !isDone && (
                      <Badge variant="outline" className="shrink-0 border-hec-warn/30 bg-hec-warn-tint text-hec-warn">
                        Partial
                      </Badge>
                    )}
                  </div>
                  <p className="text-hec-small text-hec-ink-soft">
                    Outstanding:{" "}
                    <span className="whitespace-nowrap font-semibold text-hec-ink tabular-nums">
                      {fmt(outstanding)}
                    </span>
                  </p>
                </div>
                <div className="ml-auto shrink-0 flex items-center gap-2">
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={
                      overrides[item.student_id] !== undefined
                        ? overrides[item.student_id]
                        : String(outstanding)
                    }
                    onChange={(e) =>
                      setOverrides((prev) => ({ ...prev, [item.student_id]: e.target.value }))
                    }
                    className="w-32 text-right tabular-nums"
                    disabled={isSkipped || isDone}
                    aria-label={`Amount for ${studentName}`}
                  />
                  <span className="text-hec-caption text-hec-ink-soft hidden sm:inline">₫</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t-2 border-hec-ink">
          <div className="text-hec-small">
            <div className="text-hec-ink-soft">Will record</div>
            <div className="whitespace-nowrap font-sans text-hec-h1 font-semibold text-hec-ink tabular-nums">
              {fmt(totalToCollect)}
            </div>
          </div>
          <Button
            onClick={handleRecord}
            disabled={saving || selectedRows.length === 0 || totalToCollect === 0}
            className="w-full sm:w-auto px-6 gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording {selectedRows.length}…
              </>
            ) : (
              <>
                <CircleDollarSign className="h-4 w-4" />
                Record {selectedRows.length} payment{selectedRows.length === 1 ? "" : "s"}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
