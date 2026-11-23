import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { dayjs } from "@/lib/date";
import { formatVND } from "@/lib/money";
import { functionErrorMessage } from "@/lib/functionError";
import { toast } from "sonner";
import { History, Loader2 } from "lucide-react";
import { heldRows, heldTotals, monthsBefore, sortHeldRows, type HeldBillRow } from "@/lib/closedMonthChanges";
import type { Json } from "@/integrations/supabase/types";

/**
 * Closed months whose bill no longer matches today's pricing (Finance > Tuition).
 *
 * A closed month's saved bill never changes on its own: calculate-tuition keeps
 * it and answers `held` (supabase/functions/_lib/past-month-hold.ts). This card
 * asks calculate-tuition-bulk, which saves nothing, about every closed month
 * that has bills, lists the held ones with both sets of figures, and lets an
 * admin approve one at a time with a reason. Approving calls calculate-tuition
 * with force + reason, which records who and why on the bill. Not approving is
 * the default and needs no click: the bill stays as charged.
 */
const BULK_CHUNK = 200;

export function ClosedMonthChanges() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<HeldBillRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState("");
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  const check = async () => {
    setChecking(true);
    setProgress("Reading the bills...");
    try {
      const current = dayjs().tz().format("YYYY-MM");
      // Every unfrozen bill of an earlier month, a page at a time.
      const bills: Array<{ student_id: string; month: string }> = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await supabase
          .from("invoices")
          .select("id, student_id, month")
          .lt("month", current)
          .eq("tuition_frozen", false)
          .order("id", { ascending: true })
          .range(from, from + 999);
        if (error) throw error;
        bills.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      if (bills.length === 0) {
        setRows([]);
        setCheckedAt(dayjs().tz().format("D MMM HH:mm"));
        return;
      }
      const byMonth = new Map<string, string[]>();
      for (const b of bills) byMonth.set(b.month, [...(byMonth.get(b.month) ?? []), b.student_id]);
      const first = [...byMonth.keys()].sort()[0];
      const months = monthsBefore(first, current).filter((m) => byMonth.has(m));

      const ids = [...new Set(bills.map((b) => b.student_id))];
      const names = new Map<string, string>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data, error } = await supabase.from("students").select("id, full_name").in("id", ids.slice(i, i + 200));
        if (error) throw error;
        for (const s of data ?? []) names.set(s.id, s.full_name);
      }

      const found: HeldBillRow[] = [];
      const failed: string[] = [];
      for (const [i, month] of months.entries()) {
        setProgress(`Checking ${dayjs(`${month}-01`).format("MMMM YYYY")} (${i + 1} of ${months.length})...`);
        const students = [...new Set(byMonth.get(month) ?? [])];
        for (let j = 0; j < students.length; j += BULK_CHUNK) {
          const { data, error } = await supabase.functions.invoke("calculate-tuition-bulk", {
            body: { studentIds: students.slice(j, j + BULK_CHUNK), month },
          });
          if (error || !Array.isArray(data?.results)) {
            failed.push(month);
            continue;
          }
          found.push(...heldRows(data.results, month, names));
        }
      }
      setRows(sortHeldRows(found));
      setCheckedAt(dayjs().tz().format("D MMM HH:mm"));
      if (failed.length > 0) toast.warning(`Could not check ${[...new Set(failed)].join(", ")}. Check again.`);
    } catch (e: any) {
      toast.error(e?.message || "Could not check the closed months");
    } finally {
      setChecking(false);
      setProgress("");
    }
  };

  const approve = async (row: HeldBillRow) => {
    const why = reason.trim();
    if (why.length < 3) {
      toast.error("Write why the bill should change");
      return;
    }
    const key = `${row.studentId}|${row.month}`;
    setApproving(key);
    try {
      const { data, error } = await supabase.functions.invoke("calculate-tuition", {
        body: { studentId: row.studentId, month: row.month, force: true, reason: why },
      });
      if (error) throw new Error(await functionErrorMessage(error, "The bill was not changed"));
      if (data?.error) throw new Error(data.error);
      if (!data?.approvedChange) {
        // Nothing was held any more (somebody approved it, or the register moved back).
        toast.info(data?.held ? "Still held: the bill was not changed." : "This bill no longer differs. Nothing was changed.");
      } else {
        const { data: userData } = await supabase.auth.getUser();
        const actor = userData?.user?.id ?? null;
        const figures = (base: number, discount: number, total: number): { [key: string]: Json } => ({
          base_amount: base, total_discount: discount, total_amount: total,
        });
        await supabase.from("audit_log").insert({
          action: "manual_tuition_recalc_approved_change",
          entity: "invoice",
          entity_id: `${row.studentId}-${row.month}`,
          actor_user_id: actor,
          diff: {
            student_id: row.studentId,
            month: row.month,
            actor_user_id: actor,
            reason: why,
            old: figures(row.savedBase, row.savedDiscount, row.savedTotal),
            new: figures(Number(data.baseAmount ?? 0), Number(data.totalDiscount ?? 0), Number(data.totalAmount ?? 0)),
          },
        });
        toast.success(`${row.name}, ${dayjs(`${row.month}-01`).format("MMMM YYYY")}: now ${formatVND(Number(data.totalAmount ?? 0))}`);
      }
      setRows((prev) => (prev ?? []).filter((r) => `${r.studentId}|${r.month}` !== key));
      await queryClient.invalidateQueries({ queryKey: ["admin-tuition-list"] });
    } catch (e: any) {
      toast.error(e?.message || "The bill was not changed");
    } finally {
      setApproving(null);
    }
  };

  const totals = heldTotals(rows ?? []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History aria-hidden className="h-5 w-5" />
          Closed months that price differently now
        </CardTitle>
        <CardDescription>
          A closed month keeps the bill it was charged. When the register, a discount or the pricing rules would give
          another figure today, the bill is held as charged and listed here. Approve a line only if the new figure is what
          the family should be charged; the payment already recorded stays, and the difference becomes credit or a
          balance owed. Leaving a line alone keeps the bill as it is.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={check} disabled={checking} variant="outline" className="gap-2">
            {checking && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
            {checking ? progress || "Checking..." : rows === null ? "Check the closed months" : "Check again"}
          </Button>
          {rows !== null && !checking && (
            <span className="text-sm text-muted-foreground">
              {rows.length === 0
                ? `Checked ${checkedAt}: every closed month matches its bill.`
                : `Checked ${checkedAt}: ${totals.bills} bill(s). Approving all would charge ${formatVND(totals.up)} more and ${formatVND(totals.down)} less.`}
            </span>
          )}
        </div>

        {rows !== null && rows.length > 0 && (
          <>
            <div className="space-y-1">
              <label htmlFor="closed-month-reason" className="text-sm font-medium">
                Why should the bill change? (recorded on each bill you approve)
              </label>
              <Textarea
                id="closed-month-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write the reason"
              />
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Charged</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Today's pricing</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const key = `${r.studentId}|${r.month}`;
                    return (
                      <TableRow key={key}>
                        <TableCell className="font-medium whitespace-normal break-words">{r.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{dayjs(`${r.month}-01`).format("MMM YYYY")}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.savedTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.newTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {r.difference > 0 ? "+" : "-"}
                          {formatVND(Math.abs(r.difference))}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={approving !== null || reason.trim().length < 3}
                            onClick={() => approve(r)}
                          >
                            {approving === key ? "Saving..." : "Approve"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
