import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  Edit,
  Trash2,
  Repeat,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import { useIsMobile } from "@/hooks/use-mobile";

interface RecurringExpenditure {
  id: string;
  amount: number;
  category: string;
  memo: string | null;
  day_of_month: number;
  start_month: string;
  end_month: string | null;
  is_active: boolean;
  /** Whether this standing cost is spread across the classes that ran. */
  allocate_to_classes: boolean;
  created_at: string;
}

interface RecurringExpendituresManagerProps {
  /** Currently-selected month in YYYY-MM, used for "Apply for this month". */
  selectedMonth: string;
}

/**
 * recurring_applications and recurring_expenditures are reached untyped.
 *
 * src/integrations/supabase/types.ts is regenerated from the live
 * database by the other agent working on this repo, so a regeneration
 * that lands before these migrations do would delete the table types and
 * break the build. One declared hatch, rather than a cast at each call.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const untyped = supabase as any;

const fmtVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export function RecurringExpendituresManager({ selectedMonth }: RecurringExpendituresManagerProps) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [editing, setEditing] = useState<RecurringExpenditure | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    category: "",
    memo: "",
    day_of_month: 1,
    start_month: dayjs().format("YYYY-MM"),
    end_month: "",
    is_active: true,
    allocate_to_classes: true,
  });

  const { data: templates = [], isLoading, isSuccess: templatesLoaded } = useQuery<RecurringExpenditure[]>({
    queryKey: ["recurring-expenditures"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recurring_expenditures" as any)
        .select("*")
        .order("category");
      if (error) throw error;
      return (data as any) || [];
    },
  });

  // Which templates this month has already had.
  //
  // From recurring_applications, which records the act, rather than from
  // the presence of an expenditure row - because the row is not proof.
  // Deleting the booked cost (the landlord waived it) or correcting its
  // date (the invoice was really dated last month) both remove it from a
  // ledger-based check, and the automatic booking below would then put it
  // straight back and silently undo the admin.
  //
  // The second query covers rows booked by the older code path, which
  // left no marker. Without it the first automatic run after this ships
  // would book every one of them a second time.
  //
  // Errors are thrown, not swallowed. This set is the only thing standing
  // between a template and a double booking, and a query that fails
  // quietly returns an empty set - which reads as "nothing applied yet".
  const { data: appliedThisMonth = new Set<string>(), isSuccess: appliedLoaded } = useQuery({
    queryKey: ["recurring-applied-this-month", selectedMonth],
    queryFn: async () => {
      const start = `${selectedMonth}-01`;
      const next = dayjs(start).add(1, "month").format("YYYY-MM-DD");
      const [marks, legacy] = await Promise.all([
        untyped
          .from("recurring_applications")
          .select("template_id")
          .eq("month", selectedMonth),
        untyped
          .from("expenditures")
          .select("source_template_id")
          .gte("date", start)
          .lt("date", next)
          .not("source_template_id", "is", null),
      ]);
      if (marks.error) throw marks.error;
      if (legacy.error) throw legacy.error;
      const set = new Set<string>();
      for (const d of (marks.data ?? []) as Array<{ template_id: string | null }>) {
        if (d.template_id) set.add(d.template_id);
      }
      for (const d of (legacy.data ?? []) as Array<{ source_template_id: string | null }>) {
        if (d.source_template_id) set.add(d.source_template_id);
      }
      return set;
    },
  });

  // A closed payroll month has been paid and reported. Booking a new cost
  // into it would move a net profit that has already been signed off, so
  // the automatic path stops at the lock and says so.
  const { data: monthLocked = false, isSuccess: lockLoaded } = useQuery({
    queryKey: ["payroll-period-status", selectedMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payroll_periods")
        .select("status")
        .eq("month", selectedMonth)
        .maybeSingle();
      if (error) throw error;
      return data?.status === "locked";
    },
  });

  const resetForm = () => {
    setForm({
      amount: "",
      category: "",
      memo: "",
      day_of_month: 1,
      start_month: dayjs().format("YYYY-MM"),
      end_month: "",
      is_active: true,
      allocate_to_classes: true,
    });
    setEditing(null);
  };

  const openNew = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (t: RecurringExpenditure) => {
    setEditing(t);
    setForm({
      amount: String(t.amount),
      category: t.category,
      memo: t.memo || "",
      day_of_month: t.day_of_month,
      start_month: t.start_month.slice(0, 7),
      end_month: t.end_month ? t.end_month.slice(0, 7) : "",
      is_active: t.is_active,
      allocate_to_classes: t.allocate_to_classes !== false,
    });
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (!form.category.trim()) throw new Error("Enter a category");
      // "Teacher Payroll" and "TA Payroll" are how the finance summary
      // recognises wages it has already counted under Teacher Salary, so
      // a template with either name would be subtracted from net profit
      // nowhere at all. Staff pay belongs in the Payroll tab regardless.
      if (/^(teacher|ta) payroll$/i.test(form.category.trim())) {
        throw new Error(
          `"${form.category.trim()}" is reserved for staff wages, which the Payroll tab books. Use a different category.`,
        );
      }
      const payload: any = {
        amount,
        category: form.category.trim(),
        memo: form.memo.trim() || null,
        day_of_month: form.day_of_month,
        start_month: `${form.start_month}-01`,
        end_month: form.end_month ? `${form.end_month}-01` : null,
        is_active: form.is_active,
        allocate_to_classes: form.allocate_to_classes,
      };
      if (editing) {
        const { error } = await supabase
          .from("recurring_expenditures" as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("recurring_expenditures" as any)
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Template updated" : "Recurring template created");
      queryClient.invalidateQueries({ queryKey: ["recurring-expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["class-finance"] });
      setDrawerOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message || "Failed to save template"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("recurring_expenditures" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Template deleted");
      queryClient.invalidateQueries({ queryKey: ["recurring-expenditures"] });
    },
    onError: (e: any) =>
      toast.error(
        // The foreign key is ON DELETE RESTRICT on purpose: deleting a
        // template would otherwise detach every cost it ever booked and
        // erase it from the class split while leaving it in the ledger.
        /foreign key|violates/i.test(e?.message ?? "")
          ? "This template has costs booked against it. Switch it off, or give it an end month, instead of deleting it."
          : e.message || "Failed to delete",
      ),
  });

  // Templates that are active for the selected month and not yet applied
  const monthStartIso = `${selectedMonth}-01`;
  const dueThisMonth = useMemo(
    () =>
      templates.filter((t) => {
        if (!t.is_active) return false;
        if (t.start_month > monthStartIso) return false;
        if (t.end_month && t.end_month < monthStartIso) return false;
        return !appliedThisMonth.has(t.id);
      }),
    [templates, appliedThisMonth, monthStartIso]
  );

  const applyMutation = useMutation({
    mutationFn: async ({ automatic }: { automatic: boolean }) => {
      if (dueThisMonth.length === 0) throw new Error("No recurring expenses pending for this month");
      const monthStart = dayjs(monthStartIso);
      const lastDayOfMonth = monthStart.endOf("month").date();
      if (monthLocked) {
        throw new Error(
          `${dayjs(monthStartIso).format("MMMM YYYY")} is closed. Reopen it, or book the cost in an open month.`,
        );
      }
      const rows = dueThisMonth.map((t) => {
        const day = Math.min(t.day_of_month, lastDayOfMonth);
        return {
          amount: t.amount,
          category: t.category,
          memo: t.memo,
          date: monthStart.date(day).format("YYYY-MM-DD"),
          source_template_id: t.id,
          // What this row is, so the database itself refuses a second
          // booking. Before this the only guard was the client-side
          // applied set, and two tabs - or one stale cache - booked the
          // rent twice. source_kind + source_key carry a unique
          // constraint (20261021092000).
          source_kind: "recurring",
          source_key: `${selectedMonth}:${t.id}`,
          created_by: user?.id,
        };
      });
      const { error } = await (supabase as any)
        .from("expenditures")
        .upsert(rows, { onConflict: "source_kind,source_key", ignoreDuplicates: false });
      if (error) throw error;

      // The record that this month has been dealt with, so deleting or
      // re-dating the cost afterwards is respected rather than undone.
      const { error: markError } = await untyped
        .from("recurring_applications")
        .upsert(
          dueThisMonth.map((x) => ({
            template_id: x.id,
            month: selectedMonth,
            applied_by: user?.id ?? null,
            automatic,
          })),
          { onConflict: "template_id,month", ignoreDuplicates: true },
        );
      if (markError) throw markError;

      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(
        `Applied ${count} recurring expense${count === 1 ? "" : "s"} for ${dayjs(monthStartIso).format("MMMM YYYY")}`
      );
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-applied-this-month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
      queryClient.invalidateQueries({ queryKey: ["class-finance"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to apply recurring expenses"),
  });

  // "I want something that goes in immediately."
  //
  // Saving a template books the current month straight away, and every
  // month after does the same the first time the page is opened in it.
  // There is no scheduler in this project to do it at midnight on the
  // 1st, and the write is idempotent at the database level, so opening
  // the page is a safe thing to hang it on.
  //
  // ONLY THE CURRENT MONTH. A past month may be closed and reported, and
  // a future one has not been incurred yet; both stay on the button, so
  // browsing the history never books anything.
  const autoApplied = useRef<string | null>(null);
  const isCurrentMonth = selectedMonth === dayjs().format("YYYY-MM");
  const applyNow = applyMutation.mutate;
  const applyPending = applyMutation.isPending;
  // EVERY question has to be answered before anything is written. Both
  // the applied set and the lock fall back to a permissive default -
  // an empty Set, and false - which are exactly the values that say "go
  // ahead". While either query is in flight, or after it has failed,
  // those defaults would book a cost that is already booked, or book one
  // into a month that has been closed and paid.
  const ready = templatesLoaded && appliedLoaded && lockLoaded;
  useEffect(() => {
    if (!ready || !isCurrentMonth || monthLocked || applyPending) return;
    if (dueThisMonth.length === 0) return;
    // One attempt per set of pending templates. A failure must surface as
    // a toast, not become a loop that retries on every render.
    const attempt = `${selectedMonth}:${dueThisMonth.map((x) => x.id).sort().join(",")}`;
    if (autoApplied.current === attempt) return;
    autoApplied.current = attempt;
    applyNow({ automatic: true });
  }, [ready, isCurrentMonth, monthLocked, applyPending, dueThisMonth, selectedMonth, applyNow]);

  const FormBody = (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Rent, Electricity, Internet"
          className="h-11"
        />
        {/* Staff pay is already charged to each class from its sessions.
            A shared template for the same money would charge it twice. */}
        {form.allocate_to_classes && /salary|payroll|wage/i.test(form.category) && (
          <p className="mt-1 text-xs text-amber-600">
            This looks like staff pay, which the Payroll tab already charges to each class from its
            sessions. Sharing it again would charge it twice — turn off “Share across classes” unless
            this is someone the payroll does not cover.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Amount (VND)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="0"
            className="h-11 text-right tabular-nums"
          />
        </div>
        <div>
          <Label>Day of month</Label>
          <Input
            type="number"
            min={1}
            max={31}
            value={form.day_of_month}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                day_of_month: Math.max(1, Math.min(31, parseInt(e.target.value) || 1)),
              }))
            }
            className="h-11"
          />
        </div>
      </div>
      <div>
        <Label>Memo (optional)</Label>
        <Input
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          placeholder="Additional notes"
          className="h-11"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Start month</Label>
          <Input
            type="month"
            value={form.start_month}
            onChange={(e) => setForm((f) => ({ ...f, start_month: e.target.value }))}
            className="h-11"
          />
        </div>
        <div>
          <Label>End month (optional)</Label>
          <Input
            type="month"
            value={form.end_month}
            onChange={(e) => setForm((f) => ({ ...f, end_month: e.target.value }))}
            className="h-11"
            placeholder="Leave blank = forever"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-xl border p-3">
        <div>
          <Label className="text-sm">Active</Label>
          <p className="text-xs text-muted-foreground">Inactive templates are skipped during apply.</p>
        </div>
        <Switch
          checked={form.is_active}
          onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
        />
      </div>
      <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
        <div>
          <Label className="text-sm">Share across classes</Label>
          <p className="text-xs text-muted-foreground">
            Split over the classes that ran, by how many sessions each one held, and charged against their
            profit in the class report. Turn it off for a cost that belongs to one class, or to none.
          </p>
        </div>
        <Switch
          checked={form.allocate_to_classes}
          onCheckedChange={(v) => setForm((f) => ({ ...f, allocate_to_classes: v }))}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="flex-1 h-11"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : editing ? (
            "Save changes"
          ) : (
            "Create template"
          )}
        </Button>
        <Button variant="outline" onClick={() => setDrawerOpen(false)} className="h-11">
          Cancel
        </Button>
      </div>
    </div>
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-sky-500/10 via-cyan-500/5 to-indigo-500/10 border-b">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Repeat className="h-5 w-5 text-sky-500" />
              Recurring Expenditures
            </CardTitle>
            <CardDescription>
              Define a standing cost once. It is booked automatically each month, and shared across the
              classes that ran so the class report shows what a class really costs.
            </CardDescription>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        {/* "Apply for this month" CTA */}
        <div
          className={`rounded-2xl border-2 ${
            dueThisMonth.length > 0 ? "border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/20" : "border-emerald-400/40 bg-emerald-50/50 dark:bg-emerald-950/20"
          } p-4 flex items-start sm:items-center justify-between gap-3 flex-wrap`}
        >
          <div className="flex items-start gap-3">
            {dueThisMonth.length > 0 ? (
              <Sparkles className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            )}
            <div>
              <p className="font-bold text-sm">
                {dueThisMonth.length > 0
                  ? `${dueThisMonth.length} recurring expense${dueThisMonth.length === 1 ? "" : "s"} pending for ${dayjs(monthStartIso).format("MMMM YYYY")}`
                  : `All recurring expenses applied for ${dayjs(monthStartIso).format("MMMM YYYY")}`}
              </p>
              {dueThisMonth.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Total:{" "}
                  <span className="font-bold tabular-nums">
                    {fmtVND(dueThisMonth.reduce((s, t) => s + t.amount, 0))}
                  </span>{" "}
                  · {dueThisMonth.map((t) => t.category).join(", ")}
                </p>
              )}
            </div>
          </div>
          {dueThisMonth.length > 0 && (
            <Button
              onClick={() => applyMutation.mutate({ automatic: false })}
              disabled={applyMutation.isPending}
              className="gap-2 bg-amber-500 hover:bg-amber-400 text-white shrink-0"
            >
              {applyMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Repeat className="h-4 w-4" />
                  Apply All
                </>
              )}
            </Button>
          )}
        </div>

        {/* Template list */}
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Repeat className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No recurring templates yet.</p>
            <p className="text-xs mt-1">Create one for rent, electricity or internet and it books itself every month.</p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y">
            {templates.map((t) => {
              const applied = appliedThisMonth.has(t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      t.is_active
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Repeat className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm sm:text-[15px] truncate">{t.category}</span>
                      {!t.is_active && (
                        <Badge variant="outline" className="text-[10px] h-5">Inactive</Badge>
                      )}
                      {t.allocate_to_classes === false && (
                        <Badge variant="outline" className="text-[10px] h-5">Not shared with classes</Badge>
                      )}
                      {applied && (
                        <Badge className="bg-emerald-500 text-white text-[10px] h-5">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" />
                          Applied this month
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <span className="font-semibold tabular-nums text-foreground">{fmtVND(t.amount)}</span>
                      {" · "}Day {t.day_of_month}
                      {t.memo ? ` · ${t.memo}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(t)} className="h-9 w-9">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(`Delete "${t.category}" template?`)) deleteMutation.mutate(t.id);
                      }}
                      className="h-9 w-9 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Edit/create sheet */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className={
            isMobile
              ? "h-[88vh] rounded-t-2xl overflow-y-auto p-5 pb-safe"
              : "w-[440px] sm:max-w-[440px] overflow-y-auto p-6"
          }
        >
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Template" : "New Recurring Template"}</SheetTitle>
            <SheetDescription>
              Define an expense once. The system will offer to apply it to any month with one click.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5">{FormBody}</div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
