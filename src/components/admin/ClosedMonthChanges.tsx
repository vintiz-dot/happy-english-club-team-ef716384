import { Fragment, useState } from "react";
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

const MARK_WORD: Record<string, string> = { excused: "Excused", cancelled: "Cancelled", free: "No charge" };

/** One held bill, opened: the saved bill beside today's pricing. Every figure is the function's. */
function WhatChanged({ row }: { row: HeldBillRow }) {
  const c = row.changes;
  if (!c) {
    return (
      <p className="text-sm text-muted-foreground">
        The breakdown is not available for this bill yet. Check again in a minute.
      </p>
    );
  }
  const day = (d: string) => dayjs(d).format("D MMM");
  return (
    <div className="space-y-4 text-sm">
      <div>
        <div className="font-medium">Why the figure differs</div>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {c.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {c.classes.map((cl, i) => (
        <div key={`${cl.class_id ?? cl.class_name}-${i}`} className="rounded-md border p-3">
          <div className="font-medium">{cl.class_name}</div>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Charged</div>
              {cl.charged ? (
                <div className="tabular-nums">
                  {cl.charged.lessons} lesson{cl.charged.lessons === 1 ? "" : "s"} at {formatVND(cl.charged.rate_vnd)} ={" "}
                  {formatVND(cl.charged.amount_vnd)}
                  {cl.charged.net_amount_vnd !== cl.charged.amount_vnd && (
                    <div className="text-muted-foreground">
                      {formatVND(cl.charged.net_amount_vnd)} after the enrolment's own discount
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">
                  {c.has_saved_lines ? "Not on the saved bill." : "The saved bill lists no classes."}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Today's pricing</div>
              {cl.today ? (
                <div className="tabular-nums">
                  {cl.today.prices.length === 0 && <div>No lesson is billed.</div>}
                  {cl.today.prices.map((p, j) => (
                    <div key={j}>
                      {p.lessons} lesson{p.lessons === 1 ? "" : "s"} at {formatVND(p.price_vnd)}
                      {p.custom_rate && (
                        <span className="text-muted-foreground"> (custom rate; class fee {formatVND(p.class_fee_vnd)})</span>
                      )}
                    </div>
                  ))}
                  {cl.today.prices.length > 0 && <div>= {formatVND(cl.today.amount_vnd)}</div>}
                  {cl.today.net_amount_vnd !== cl.today.amount_vnd && (
                    <div className="text-muted-foreground">
                      {formatVND(cl.today.net_amount_vnd)} after the enrolment's own discount
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-muted-foreground">No lesson of this class is inside the enrolment for this month.</div>
              )}
            </div>
          </div>
          {cl.today && (cl.today.billed.length > 0 || cl.today.not_billed.length > 0) && (
            <div className="mt-3 space-y-2">
              {cl.today.billed.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Lessons billed today</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cl.today.billed.map((l, j) => (
                      <span
                        key={j}
                        className={`rounded border px-1.5 py-0.5 text-xs ${l.held && !l.mark ? "border-amber-500 bg-amber-50 text-amber-900" : ""}`}
                      >
                        {day(l.date)} {l.mark ?? (l.held ? "no mark" : "coming")}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {cl.today.not_billed.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground">Not billed today</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {cl.today.not_billed.map((l, j) => (
                      <span key={j} className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
                        {day(l.date)} {MARK_WORD[l.state] ?? l.state}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <div className="rounded-md border p-3">
        <div className="font-medium">Discounts</div>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Charged</div>
            <div className="tabular-nums">{formatVND(c.discounts.charged_total_vnd)} taken off</div>
            {c.discounts.charged_names.length > 0 ? (
              <div className="text-muted-foreground">
                {c.discounts.charged_names.join(", ")} (the bill saved the names and the total, not each amount)
              </div>
            ) : (
              c.discounts.charged_total_vnd > 0 && (
                <div className="text-muted-foreground">The saved bill does not name its discounts.</div>
              )
            )}
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Today's pricing</div>
            <div className="tabular-nums">{formatVND(c.discounts.today_total_vnd)} taken off</div>
            {c.discounts.today.map((d, j) => (
              <div key={j} className="tabular-nums text-muted-foreground">
                {d.name}
                {d.type === "percent" ? ` ${d.value}%` : ""}
                {d.class_name ? ` on ${d.class_name}` : ""}: {formatVND(d.amount_vnd)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="tabular-nums">
          <span className="text-muted-foreground">Charged: </span>
          {formatVND(c.charged.base_vnd)} of lessons, less {formatVND(c.charged.discount_vnd)} = {formatVND(c.charged.total_vnd)}
        </div>
        <div className="tabular-nums">
          <span className="text-muted-foreground">Today: </span>
          {formatVND(c.today.base_vnd)} of lessons, less {formatVND(c.today.discount_vnd)} = {formatVND(c.today.total_vnd)}
        </div>
      </div>
    </div>
  );
}

export function ClosedMonthChanges() {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<HeldBillRow[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState("");
  const [reason, setReason] = useState("");
  const [approving, setApproving] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

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
          balance owed. Leaving a line alone keeps the bill as it is. "What changed" on a line shows the lessons, the
          lesson price (custom rates included) and the discounts, as charged and as priced today.
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
                      <Fragment key={key}>
                      <TableRow>
                        <TableCell className="font-medium whitespace-normal break-words">{r.name}</TableCell>
                        <TableCell className="whitespace-nowrap">{dayjs(`${r.month}-01`).format("MMM YYYY")}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.savedTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.paid)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">{formatVND(r.newTotal)}</TableCell>
                        <TableCell className="text-right tabular-nums whitespace-nowrap">
                          {r.difference > 0 ? "+" : "-"}
                          {formatVND(Math.abs(r.difference))}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Button size="sm" variant="ghost" aria-expanded={open.has(key)} onClick={() => toggle(key)}>
                            {open.has(key) ? "Hide" : "What changed"}
                          </Button>
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
                      {open.has(key) && (
                        <TableRow>
                          <TableCell colSpan={7} className="whitespace-normal bg-muted/30">
                            <WhatChanged row={r} />
                          </TableCell>
                        </TableRow>
                      )}
                      </Fragment>
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
