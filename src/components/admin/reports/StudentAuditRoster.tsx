/**
 * Every student's account on one screen, one line each.
 *
 * The point of the condensed row is triage: you should be able to find
 * the family that owes money, or the one that has quietly built up
 * credit, without opening anything. Only when a row is worth a closer
 * look does it unfold into the full audit — and only then does it cost
 * a query, because the per-student history is expensive and almost all
 * of it is never asked for.
 *
 * The roster itself is built from `invoices` alone, read in bulk. That
 * is a deliberate choice over calling the tuition engine per student:
 * `calculate-tuition` WRITES the invoice row it returns, so fanning it
 * across a roster would have this screen silently rewriting the data it
 * claims to be reporting. A report must not move what it measures.
 *
 * The cost of that choice, stated plainly in the UI: a month that has
 * never been calculated has no invoice row and so is invisible here.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  Search,
  TriangleAlert,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loading, PlaceholderCard } from "@/components/ui/loading";
import { formatVND } from "@/lib/invoice/formatter";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import { StudentAuditPanel } from "./StudentAuditPanel";
import type { StudentAudit } from "@/hooks/useStudentAudit";

interface RosterRow {
  id: string;
  name: string;
  isActive: boolean;
  classes: string[];
  charged: number;
  paid: number;
  balance: number;
  months: number;
  lastMonth: string | null;
}

type SortKey = "name" | "balance" | "charged" | "paid";

function useRoster() {
  return useQuery<RosterRow[]>({
    queryKey: ["audit-roster"],
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const [studentsRes, invoicesRes, enrollmentsRes] = await Promise.all([
        supabase.from("students").select("id, full_name, is_active").order("full_name"),
        // Every invoice, every month. One query rather than one per
        // student: a waterfall over a few hundred students is what made
        // the old finance screens slow.
        supabase.from("invoices").select("student_id, month, total_amount, recorded_payment"),
        supabase.from("enrollments").select("student_id, classes(name)"),
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (invoicesRes.error) throw invoicesRes.error;

      const classesByStudent = new Map<string, string[]>();
      for (const e of enrollmentsRes.data ?? []) {
        const name = (e.classes as unknown as { name?: string } | null)?.name;
        if (!name) continue;
        const list = classesByStudent.get(e.student_id) ?? [];
        if (!list.includes(name)) list.push(name);
        classesByStudent.set(e.student_id, list);
      }

      interface Agg {
        charged: number;
        paid: number;
        months: number;
        lastMonth: string | null;
      }
      const agg = new Map<string, Agg>();
      for (const inv of invoicesRes.data ?? []) {
        const a = agg.get(inv.student_id) ?? { charged: 0, paid: 0, months: 0, lastMonth: null };
        a.charged += Number(inv.total_amount ?? 0);
        a.paid += Number(inv.recorded_payment ?? 0);
        a.months += 1;
        if (!a.lastMonth || inv.month > a.lastMonth) a.lastMonth = inv.month;
        agg.set(inv.student_id, a);
      }

      return (studentsRes.data ?? []).map((s) => {
        const a = agg.get(s.id);
        return {
          id: s.id,
          name: s.full_name,
          isActive: s.is_active,
          classes: classesByStudent.get(s.id) ?? [],
          charged: a?.charged ?? 0,
          paid: a?.paid ?? 0,
          balance: (a?.paid ?? 0) - (a?.charged ?? 0),
          months: a?.months ?? 0,
          lastMonth: a?.lastMonth ?? null,
        };
      });
    },
  });
}

export function StudentAuditRoster({ onPrint }: { onPrint?: (audit: StudentAudit) => void }) {
  const { data: rows, isLoading, error } = useRoster();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("balance");
  const [show, setShow] = useState<"owing" | "active" | "all">("active");
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = rows ?? [];

    if (show === "owing") list = list.filter((r) => r.balance < 0);
    else if (show === "active") list = list.filter((r) => r.isActive);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.classes.some((c) => c.toLowerCase().includes(q)),
      );
    }

    return [...list].sort((a, b) => {
      switch (sort) {
        // Most negative first: the people who owe are the reason to open
        // this screen, so they should not need to be hunted for.
        case "balance":
          return a.balance - b.balance;
        case "charged":
          return b.charged - a.charged;
        case "paid":
          return b.paid - a.paid;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [rows, query, sort, show]);

  const owing = (rows ?? []).filter((r) => r.balance < 0);
  const totalOwed = owing.reduce((s, r) => s + r.balance, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" aria-hidden />
              Student accounts
            </CardTitle>
            <CardDescription>
              One line each. Open a student for the full history — sessions billed, excused
              lessons, discounts, carry balances, and who recorded each payment.
            </CardDescription>
          </div>

          {owing.length > 0 && (
            <Badge variant="outline" className="shrink-0 gap-1.5 border-red-500/40 py-1 text-red-600">
              <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
              {owing.length} owing · {formatVND(Math.abs(totalOwed))} ₫
            </Badge>
          )}
        </div>

        {/* -------------------------------------------------- controls */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a student or class…"
              className="pl-8"
            />
          </div>

          <Select value={show} onValueChange={(v) => setShow(v as typeof show)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active students</SelectItem>
              <SelectItem value="owing">Owing money</SelectItem>
              <SelectItem value="all">Everyone</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[160px]">
              <ArrowDownUp className="mr-1.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">Most owed first</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="charged">Most charged</SelectItem>
              <SelectItem value="paid">Most paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <PlaceholderCard rows={5} />
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {(error as Error).message}
          </p>
        ) : visible.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {query ? "Nobody matches that search." : "No students to show."}
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {visible.map((r) => {
              const open = openId === r.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    aria-expanded={open}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50",
                      open && "bg-muted/40",
                    )}
                    onClick={() => setOpenId(open ? null : r.id)}
                  >
                    {open ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    )}

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium">{r.name}</span>
                        {!r.isActive && (
                          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                            inactive
                          </Badge>
                        )}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {r.classes.length > 0 ? r.classes.join(" · ") : "No class"}
                        {r.months > 0 && r.lastMonth && (
                          <> · {r.months} month{r.months === 1 ? "" : "s"} to {dayjs(`${r.lastMonth}-01`).format("MMM YYYY")}</>
                        )}
                      </span>
                    </span>

                    <span className="hidden shrink-0 text-right sm:block">
                      <span className="block text-xs text-muted-foreground">charged</span>
                      <span className="block text-sm tabular-nums">{formatVND(r.charged)} ₫</span>
                    </span>

                    <span className="hidden shrink-0 text-right md:block">
                      <span className="block text-xs text-muted-foreground">paid</span>
                      <span className="block text-sm tabular-nums">{formatVND(r.paid)} ₫</span>
                    </span>

                    <span className="w-28 shrink-0 text-right">
                      <span className="block text-xs text-muted-foreground">balance</span>
                      <span
                        className={cn(
                          "block text-sm font-semibold tabular-nums",
                          r.balance > 0 && "text-emerald-600",
                          r.balance < 0 && "text-red-600",
                          r.balance === 0 && "text-muted-foreground",
                        )}
                      >
                        {r.balance === 0
                          ? "0 ₫"
                          : `${r.balance > 0 ? "+" : "−"}${formatVND(Math.abs(r.balance))} ₫`}
                      </span>
                    </span>
                  </button>

                  {open && (
                    <div className="border-t bg-muted/20 px-3 py-4">
                      <StudentAuditPanel studentId={r.id} onPrint={onPrint} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!isLoading && !error && (
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {visible.length} of {rows?.length ?? 0}. Totals cover every month that has an
            invoice — a month tuition was never calculated for does not appear.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
