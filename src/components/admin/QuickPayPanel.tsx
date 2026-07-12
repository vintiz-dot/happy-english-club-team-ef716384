import { useState, useMemo } from "react";
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: tuitionData, isLoading, refetch } = useLiveTuitionData(month);

  const [search, setSearch] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Cash");
  const [skipped, setSkipped] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

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
    if (selectedRows.length === 0) {
      toast.error("Select at least one student");
      return;
    }
    setSaving(true);
    setCompletedIds(new Set());

    let successCount = 0;
    let failCount = 0;

    try {
      for (const item of selectedRows) {
        const enteredAmount = getEntryAmount(item);
        if (enteredAmount <= 0) continue;

        const alreadyPaid = (item as any).recorded_payment ?? 0;
        const newTotalPaid = alreadyPaid + enteredAmount;
        const payable = (item as any).finalPayable ?? 0;
        const isPlaceholder = (item as any).id?.startsWith("placeholder-");

        let newStatus: string;
        if (newTotalPaid >= payable && payable > 0) newStatus = "paid";
        else if (newTotalPaid > 0) newStatus = "partial";
        else newStatus = "open";

        try {
          if (isPlaceholder) {
            const { error } = await supabase.from("invoices").insert([{
              student_id: item.student_id,
              month,
              base_amount: (item as any).base_amount || 0,
              discount_amount: (item as any).discount_amount || 0,
              total_amount: (item as any).total_amount || 0,
              recorded_payment: enteredAmount,
              paid_amount: 0,
              status: newStatus as any,
              carry_in_credit: (item as any).carry_in_credit || 0,
              carry_in_debt: (item as any).carry_in_debt || 0,
              created_by: user?.id,
            }]);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from("invoices")
              .update({
                recorded_payment: newTotalPaid,
                status: newStatus as any,
                updated_at: new Date().toISOString(),
                updated_by: user?.id,
              })
              .eq("id", (item as any).id);
            if (error) throw error;
          }

          await supabase.from("audit_log").insert({
            entity: "invoice",
            entity_id: isPlaceholder ? item.student_id : (item as any).id,
            action: "quickpay_record_payment",
            actor_user_id: user?.id,
            diff: {
              student_id: item.student_id,
              month,
              previous_recorded_payment: alreadyPaid,
              payment_amount: enteredAmount,
              new_recorded_payment: newTotalPaid,
              payment_date: date,
              payment_method: method,
              quickpay: true,
            },
          });

          successCount++;
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
          if (skipped.has(row.student_id)) return row;
          const amt = getEntryAmount(row);
          if (amt <= 0) return row;
          const newRecorded = (row.recorded_payment ?? 0) + amt;
          const fp = row.finalPayable ?? 0;
          const debt = Math.max(0, fp - newRecorded);
          const credit = Math.max(0, newRecorded - fp);
          let status = row.status;
          if (newRecorded >= fp && fp > 0) status = "paid";
          else if (newRecorded > 0) status = "partial";
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

      setOverrides({});
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
        <CardContent className="py-12 text-center text-muted-foreground">
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
          <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500 mb-3" />
          <p className="text-lg font-semibold">All caught up</p>
          <p className="text-sm text-muted-foreground mt-1">
            No outstanding tuition for this month.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-blue-500/10 via-sky-500/5 to-amber-500/10 border-b">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Pay
            </CardTitle>
            <CardDescription>
              One screen. One click. Mark every paid student in seconds.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">To collect:</span>
            <span className="font-bold text-base text-emerald-600 dark:text-emerald-400 tabular-nums">
              {fmt(totalToCollect)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* Top controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Payment date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="h-9">
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
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Filter by student name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-9"
              />
            </div>
          </div>
        </div>

        {/* Selection toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap text-sm">
          <div className="flex items-center gap-3 text-muted-foreground">
            <span>
              <span className="font-bold text-foreground">{selectedRows.length}</span> of{" "}
              {unpaid.length} selected
            </span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              Outstanding total:{" "}
              <span className="font-semibold text-foreground tabular-nums">
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
        <div className="rounded-2xl border divide-y max-h-[55vh] overflow-y-auto">
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
                  "flex items-center gap-3 p-3 sm:p-4 transition-colors",
                  isSkipped && "opacity-50",
                  isDone && "bg-emerald-50 dark:bg-emerald-950/20"
                )}
              >
                <Checkbox
                  checked={!isSkipped}
                  onCheckedChange={() => toggleRow(item.student_id)}
                  className="shrink-0"
                />
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarImage src={getAvatarUrl((item.students as any)?.avatar_url) || undefined} />
                  <AvatarFallback className="text-xs">
                    {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm sm:text-[15px] truncate">{studentName}</p>
                    {isDone && (
                      <Badge className="bg-emerald-500 text-white text-[10px] h-5">
                        <CheckCircle2 className="h-3 w-3 mr-0.5" />
                        Recorded
                      </Badge>
                    )}
                    {isPartial && !isDone && (
                      <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-700 dark:text-amber-300">
                        Partial
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Outstanding:{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {fmt(outstanding)}
                    </span>
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
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
                    className="w-28 sm:w-32 h-9 text-right tabular-nums"
                    disabled={isSkipped || isDone}
                  />
                  <span className="text-xs text-muted-foreground hidden sm:inline">₫</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t">
          <div className="text-sm">
            <div className="text-muted-foreground">Will record</div>
            <div className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400 tabular-nums">
              {fmt(totalToCollect)}
            </div>
          </div>
          <Button
            onClick={handleRecord}
            disabled={saving || selectedRows.length === 0 || totalToCollect === 0}
            className="h-11 px-6 gap-2 bg-aurora text-white font-bold shadow-q3 hover:opacity-95"
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
