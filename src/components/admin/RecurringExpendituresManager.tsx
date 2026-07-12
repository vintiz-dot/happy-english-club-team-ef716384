import { useMemo, useState } from "react";
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
  created_at: string;
}

interface RecurringExpendituresManagerProps {
  /** Currently-selected month in YYYY-MM, used for "Apply for this month". */
  selectedMonth: string;
}

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
  });

  const { data: templates = [], isLoading } = useQuery<RecurringExpenditure[]>({
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

  // Already-applied template IDs for this month
  const { data: appliedThisMonth = new Set<string>() } = useQuery({
    queryKey: ["recurring-applied-this-month", selectedMonth],
    queryFn: async () => {
      const start = `${selectedMonth}-01`;
      const next = dayjs(start).add(1, "month").format("YYYY-MM-DD");
      const { data } = await (supabase as any)
        .from("expenditures")
        .select("source_template_id")
        .gte("date", start)
        .lt("date", next)
        .not("source_template_id", "is", null);
      const set = new Set<string>();
      (data || []).forEach((d: any) => d.source_template_id && set.add(d.source_template_id));
      return set;
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
    });
    setDrawerOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const amount = parseInt(form.amount);
      if (!amount || amount <= 0) throw new Error("Enter a valid amount");
      if (!form.category.trim()) throw new Error("Enter a category");
      const payload: any = {
        amount,
        category: form.category.trim(),
        memo: form.memo.trim() || null,
        day_of_month: form.day_of_month,
        start_month: `${form.start_month}-01`,
        end_month: form.end_month ? `${form.end_month}-01` : null,
        is_active: form.is_active,
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
    onError: (e: any) => toast.error(e.message || "Failed to delete"),
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
    mutationFn: async () => {
      if (dueThisMonth.length === 0) throw new Error("No recurring expenses pending for this month");
      const monthStart = dayjs(monthStartIso);
      const lastDayOfMonth = monthStart.endOf("month").date();
      const rows = dueThisMonth.map((t) => {
        const day = Math.min(t.day_of_month, lastDayOfMonth);
        return {
          amount: t.amount,
          category: t.category,
          memo: t.memo,
          date: monthStart.date(day).format("YYYY-MM-DD"),
          source_template_id: t.id,
          created_by: user?.id,
        };
      });
      const { error } = await (supabase as any).from("expenditures").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      toast.success(
        `Applied ${count} recurring expense${count === 1 ? "" : "s"} for ${dayjs(monthStartIso).format("MMMM YYYY")}`
      );
      queryClient.invalidateQueries({ queryKey: ["expenditures"] });
      queryClient.invalidateQueries({ queryKey: ["recurring-applied-this-month", selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to apply recurring expenses"),
  });

  const FormBody = (
    <div className="space-y-4">
      <div>
        <Label>Category</Label>
        <Input
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          placeholder="e.g. Rent, Internet, Salary"
          className="h-11"
        />
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
              Templates auto-apply to any month with one click. No more re-typing rent, internet, salaries.
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
              onClick={() => applyMutation.mutate()}
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
            <p className="text-xs mt-1">Create one to auto-apply rent, internet, salaries every month.</p>
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
