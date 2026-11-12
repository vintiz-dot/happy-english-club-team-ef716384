import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchStudentsInMonth } from "@/lib/finance/studentsInMonth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TuitionPageFilters } from "@/components/admin/TuitionPageFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, DollarSign, ArrowUpDown, AlertCircle, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { dayjs } from "@/lib/date";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";
import { RecordPaymentDialog } from "@/components/admin/RecordPaymentDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIvory } from "@/hooks/useIvory";
import { fetchBulkTuition, liveTuitionItem } from "@/hooks/useLiveTuitionData";
import { siblingRetryDelayMs } from "@/lib/siblingRetry";
import {
  carriedIn,
  carriedOut,
  figurePlaceholder,
  figureText,
  largestFirst,
  tuitionFigures,
  tuitionStatusInput,
} from "@/lib/tuitionRows";

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

// The status is judged on the calculator's carry-out; a row without figures
// has no status and matches no status filter.
const statusOf = (item: any) => {
  const input = tuitionStatusInput(item.figures);
  return input ? getPaymentStatus(input) : null;
};

interface AdminTuitionListProps {
  month: string;
}

export const AdminTuitionList = ({ month }: AdminTuitionListProps) => {
  const [sortBy, setSortBy] = useState<"name" | "balance" | "total" | "class">("name");
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirmationFilter, setConfirmationFilter] = useState<string>("all");
  const [paymentItem, setPaymentItem] = useState<any>(null);
  const navigate = useNavigate();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  // Every money figure on this page is calculate-tuition-bulk's, fetched the
  // way the Finance tab fetches it. This page reads no invoice row and works
  // nothing out: see src/lib/tuitionRows.ts for why. The key sits under
  // "admin-tuition-live" so a payment recorded from here refreshes the list.
  const { data: tuitionData, isLoading, isError } = useQuery({
    queryKey: ["admin-tuition-live", month, "everyone"],
    queryFn: async () => {
      const monthStart = `${month}-01`;
      const monthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);

      // Roster as it stood during `month`, so students deactivated since
      // keep their past tuition rows.
      const allStudents = await fetchStudentsInMonth(month);
      if (allStudents.length === 0) return [];

      const allStudentIds = allStudents.map((s) => s.id);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`student_id, class_id, classes(id, name)`)
        .in("student_id", allStudentIds)
        .lte("start_date", monthEnd)
        .or(`end_date.is.null,end_date.gte.${monthStart}`);

      const { data: discounts } = await supabase
        .from("discount_assignments")
        .select("student_id, discount_def_id")
        .lte("effective_from", monthEnd)
        .or(`effective_to.is.null,effective_to.gte.${monthStart}`);

      const studentDiscounts = new Set(discounts?.map((d) => d.student_id) || []);

      // Sibling badge reflects the same month-aware roster, so a family
      // reads as siblings in the months both children were enrolled.
      const familyCounts = new Map<string, number>();
      allStudents.forEach((s) => {
        if (s.family_id) {
          familyCounts.set(s.family_id, (familyCounts.get(s.family_id) || 0) + 1);
        }
      });

      const siblingStudents = new Set(
        allStudents.filter((s) => s.family_id && (familyCounts.get(s.family_id) || 0) >= 2).map((s) => s.id),
      );

      const studentClasses = new Map<string, any[]>();
      enrollments?.forEach((e: any) => {
        const existing = studentClasses.get(e.student_id) || [];
        if (e.classes) {
          existing.push(Array.isArray(e.classes) ? e.classes[0] : e.classes);
        }
        studentClasses.set(e.student_id, existing);
      });

      const answers = await fetchBulkTuition(allStudentIds, month);

      return allStudents.map((student) => {
        const answer = answers.get(student.id);
        const figures = tuitionFigures(answer);
        const badges = {
          classes: studentClasses.get(student.id) || [],
          hasDiscount: studentDiscounts.has(student.id),
          hasSiblings: siblingStudents.has(student.id),
        };
        // A row with figures is the Finance tab's row, so Record Pay gets
        // exactly what it gets there. A row without them carries no figure
        // at all - nothing for a dialog to read as 0 - and cannot be paid
        // from here until the calculator answers.
        const row =
          figures.state === "ready"
            ? liveTuitionItem(student, answer, month, badges)
            : { id: `placeholder-${student.id}`, student_id: student.id, month, students: student, ...badges };
        return { ...row, figures };
      });
    },
    // Family discount still being worked out elsewhere: ask again by itself,
    // with the same bounded backoff as the other calculate-tuition screens.
    refetchInterval: (query) =>
      siblingRetryDelayMs(
        query.state.data?.some((row: any) => row.figures.state === "pending") ? "unresolved" : null,
        Math.max(0, query.state.dataUpdateCount - 1),
      ),
  });

  const filterChips = useMemo(() => {
    if (!tuitionData) return [];
    const withDiscount = tuitionData.filter((i: any) => i.hasDiscount).length;
    const withSiblings = tuitionData.filter((i: any) => i.hasSiblings).length;
    const getStatus = statusOf;
    const overpaid = tuitionData.filter((i: any) => getStatus(i) === 'overpaid').length;
    const settled = tuitionData.filter((i: any) => getStatus(i) === 'settled').length;
    const underpaid = tuitionData.filter((i: any) => getStatus(i) === 'underpaid').length;
    const paid = settled + overpaid;

    return [
      { key: "all", label: "All", count: tuitionData.length },
      { key: "discount", label: "Discount", count: withDiscount },
      { key: "no-discount", label: "No Discount", count: tuitionData.length - withDiscount },
      { key: "siblings", label: "Siblings", count: withSiblings },
      { key: "paid", label: "Paid", count: paid },
      { key: "overpaid", label: "Overpaid", count: overpaid },
      { key: "underpaid", label: "Underpaid", count: underpaid },
      { key: "settled", label: "Settled", count: settled },
    ];
  }, [tuitionData]);

  const filteredAndSortedData = useMemo(() => {
    if (!tuitionData) return [];
    const getStatus = statusOf;

    let filtered = tuitionData;
    if (activeFilter !== "all") {
      filtered = tuitionData.filter((item: any) => {
        const status = getStatus(item);
        switch (activeFilter) {
          case "discount": return item.hasDiscount;
          case "no-discount": return !item.hasDiscount;
          case "siblings": return item.hasSiblings;
          case "paid": return status === 'settled' || status === 'overpaid';
          case "overpaid": return status === 'overpaid';
          case "underpaid": return status === 'underpaid';
          case "settled": return status === 'settled';
          default: return true;
        }
      });
    }

    if (confirmationFilter !== "all") {
      filtered = filtered.filter((item: any) => item.confirmation_status === confirmationFilter);
    }

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return ((a.students as any)?.full_name || "").localeCompare((b.students as any)?.full_name || "");
        case "balance":
          return largestFirst(carriedOut(a.figures).amount, carriedOut(b.figures).amount);
        case "total":
          return largestFirst(a.figures.charge, b.figures.charge);
        case "class":
          return ((a as any).classes?.[0]?.name || "").localeCompare((b as any).classes?.[0]?.name || "");
        default:
          return 0;
      }
    });
  }, [tuitionData, sortBy, activeFilter, confirmationFilter]);

  const getStatusBadge = (item: any) => {
    const input = tuitionStatusInput(item.figures);
    if (!input) return <Badge variant="secondary">{figurePlaceholder(item.figures.state)}</Badge>;
    return getTuitionStatusBadge(getPaymentStatus(input), input.settledInMonth);
  };

  if (isLoading) {
    return <p className={iv("text-hec-body text-hec-ink-soft", "text-muted-foreground")}>Loading tuition data...</p>;
  }

  // No answer from the calculator: say so. There is no other source to fall back on.
  if (isError) {
    return <p className={iv("text-hec-body text-hec-ink-soft", "text-muted-foreground")}>Tuition could not be calculated. Reload the page to try again.</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className={iv("h-5 w-5 shrink-0 text-hec-ink-soft", "h-5 w-5")} />
            Tuition Overview - {dayjs(month).format("MMMM YYYY")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={iv("mb-4 flex flex-wrap items-center gap-4", "flex items-center gap-4 mb-4")}>
            <Button
              variant="outline"
              onClick={() => navigate(`/admin/tuition-review?month=${month}`)}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4" />
              Review Queue
              {tuitionData?.filter((i: any) => i.confirmation_status === 'needs_review').length > 0 && (
                <Badge variant="destructive">
                  {tuitionData?.filter((i: any) => i.confirmation_status === 'needs_review').length}
                </Badge>
              )}
            </Button>

            <Select value={confirmationFilter} onValueChange={setConfirmationFilter}>
              <SelectTrigger className={iv("w-full sm:w-[200px]", "w-[200px]")}>
                <SelectValue placeholder="All Confirmations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Confirmations</SelectItem>
                <SelectItem value="needs_review">Needs Review</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="auto_approved">Auto Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TuitionPageFilters
            filters={filterChips}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />

          <div className="space-y-3">
            <div className={iv("flex flex-wrap items-center gap-2", "flex items-center gap-2")}>
              <ArrowUpDown className={iv("h-4 w-4 text-hec-ink-soft", "h-4 w-4 text-muted-foreground")} />
              <span className={iv("text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Sort by:</span>
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="class">Class</SelectItem>
                  <SelectItem value="balance">Balance</SelectItem>
                  <SelectItem value="total">Total Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {filteredAndSortedData.length === 0 ? (
            <p className={iv("py-8 text-center text-hec-body text-hec-ink-soft", "text-muted-foreground text-center py-8")}>No tuition records found</p>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedData.map((item) => {
                return (
                  <TuitionStudentRow
                    key={item.id}
                    item={item}
                    statusBadge={getStatusBadge(item)}
                    onRecordPay={() => setPaymentItem(item)}
                    onView={() => navigate(`/students/${item.student_id}`)}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <RecordPaymentDialog
        open={!!paymentItem}
        onClose={() => setPaymentItem(null)}
        item={paymentItem}
        month={month}
      />
    </>
  );
};

/* ── Individual student tuition card ── */
function TuitionStudentRow({
  item,
  statusBadge,
  onRecordPay,
  onView,
}: {
  item: any;
  statusBadge: React.ReactNode;
  onRecordPay: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const studentName = (item.students as any)?.full_name ?? "—";
  const classNames = (item as any).classes?.map((c: any) => c.name).join(", ") || "No class";
  // What the calculator carried in and out of the month, worded - never a
  // number made here. `figures.state` is "pending" or "unavailable" while
  // there is nothing to show, and the cells then say so.
  const figures = item.figures;
  const prior = carriedIn(figures);
  const balance = carriedOut(figures);
  const noFigure = figurePlaceholder(figures.state);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={iv("overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1", "border rounded-xl overflow-hidden bg-card transition-shadow hover:shadow-md")}>
        {/* ── Header row: always visible ── */}
        <CollapsibleTrigger asChild>
          <button className={iv("group flex min-h-hec-target w-full items-start gap-3 p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring", "w-full text-left p-3 sm:p-4 flex items-center gap-3 group")}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={iv("whitespace-normal break-words hyphens-none text-balance text-hec-body font-semibold text-hec-ink", "font-semibold text-sm sm:text-base truncate")}>{studentName}</span>
                {statusBadge}
                {item.hasDiscount && <Badge variant={ivory ? "secondary" : "outline"} className={iv("", "text-[10px] px-1.5 py-0")}>Discount</Badge>}
                {item.hasSiblings && <Badge variant={ivory ? "secondary" : "outline"} className={iv("", "text-[10px] px-1.5 py-0")}>Sibling</Badge>}
              </div>
              <p className={iv("mt-1 whitespace-normal break-words text-hec-small text-hec-ink-soft", "text-xs text-muted-foreground truncate mt-0.5")}>{classNames}</p>
            </div>
            {/* Right side: balance + chevron */}
            <div className="text-right shrink-0">
              <p className={ivory
                ? `whitespace-nowrap font-sans text-hec-body font-semibold tabular-nums ${balance.amount === null ? "text-hec-ink-soft" : "text-hec-ink"}`
                : `text-sm font-bold tabular-nums ${
                balance.kind === "owed" ? "text-destructive" : balance.kind === "credit" ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {balance.kind === "owed" ? fmt(balance.amount) : balance.kind === "credit" ? `+${fmt(balance.amount)}` : balance.kind === "none" ? "Settled" : noFigure}
              </p>
              <p className={iv("text-hec-caption text-hec-ink-soft", "text-[10px] text-muted-foreground")}>Balance</p>
            </div>
            <ChevronDown className={ivory ? `mt-1 h-5 w-5 shrink-0 text-hec-ink-soft transition-transform duration-hec-1 ease-hec ${open ? "rotate-180" : ""}` : `h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        {/* ── Expanded detail ── */}
        <CollapsibleContent>
          <div className={iv("space-y-4 border-t border-hec-line p-4", "border-t px-3 sm:px-4 py-3 space-y-3")}>
            {/* Finance breakdown grid */}
            <div className={iv("grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-6", "grid grid-cols-3 sm:grid-cols-6 gap-y-3 gap-x-2 text-center")}>
              <FinanceCell ivory={ivory} label="Base" value={figureText(figures, figures.base, fmt)} />
              <FinanceCell ivory={ivory} label="Discount" value={figures.discount === null ? noFigure : figures.discount > 0 ? `−${fmt(figures.discount)}` : "—"} accent={figures.discount !== null && figures.discount > 0 ? "green" : undefined} />
              <FinanceCell ivory={ivory} label="Prior Bal." value={prior.kind === "owed" ? fmt(prior.amount) : prior.kind === "credit" ? `+${fmt(prior.amount)}` : prior.kind === "none" ? "—" : noFigure} accent={prior.kind === "owed" ? "red" : prior.kind === "credit" ? "green" : undefined} />
              {/* The Finance tab's Payable for this row (useLiveTuitionData). */}
              <FinanceCell ivory={ivory} label="Payable" value={figureText(figures, item.finalPayable ?? null, fmt)} bold />
              <FinanceCell ivory={ivory} label="Paid" value={figureText(figures, figures.paid, fmt)} accent="blue" />
              <FinanceCell
                ivory={ivory}
                total
                label="Balance"
                value={balance.kind === "owed" ? fmt(balance.amount) : balance.kind === "credit" ? `+${fmt(balance.amount)}` : balance.kind === "none" ? "0 ₫" : noFigure}
                accent={balance.kind === "owed" ? "red" : balance.kind === "credit" ? "green" : undefined}
                bold
              />
            </div>

            {/* Actions */}
            <div className={iv("flex flex-wrap gap-2", "flex gap-2 pt-1")}>
              <Button size="sm" onClick={onRecordPay} disabled={figures.state !== "ready"} className="flex-1 sm:flex-none gap-1.5">
                <CreditCard className="h-3.5 w-3.5" />
                Record Pay
              </Button>
              <Button size="sm" variant="outline" onClick={onView} className="flex-1 sm:flex-none gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

/* ── Tiny finance cell component ── */
function FinanceCell({
  label,
  value,
  accent,
  bold,
  ivory,
  total,
}: {
  label: string;
  value: string;
  accent?: "green" | "red" | "blue";
  bold?: boolean;
  ivory?: boolean;
  total?: boolean;
}) {
  if (ivory) {
    // Ivory: every amount is ink, sans, tabular and never cut; the Balance is
    // the one total of the card, under the 2 px ink rule.
    return (
      <div className={`min-w-0 ${total ? "border-t-2 border-hec-ink pt-2" : "pt-2"}`}>
        <p className="text-hec-caption uppercase tracking-wider text-hec-ink-soft">{label}</p>
        <p className={`whitespace-nowrap font-sans tabular-nums text-hec-ink ${total ? "text-hec-h3 font-semibold" : bold ? "text-hec-small font-semibold" : "text-hec-small"}`}>
          {value}
        </p>
      </div>
    );
  }
  const colorClass =
    accent === "green" ? "text-emerald-600" :
    accent === "red" ? "text-destructive" :
    accent === "blue" ? "text-blue-600" :
    "text-foreground";

  return (
    <div className="min-w-0">
      <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={`text-xs sm:text-sm tabular-nums truncate ${colorClass} ${bold ? "font-bold" : "font-medium"}`}>
        {value}
      </p>
    </div>
  );
}
