import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

interface AdminTuitionListProps {
  month: string;
}

export const AdminTuitionList = ({ month }: AdminTuitionListProps) => {
  const [sortBy, setSortBy] = useState<"name" | "balance" | "total" | "class">("name");
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirmationFilter, setConfirmationFilter] = useState<string>("all");
  const [paymentItem, setPaymentItem] = useState<any>(null);
  const navigate = useNavigate();

  const { data: tuitionData, isLoading } = useQuery({
    queryKey: ["admin-tuition-list", month],
    queryFn: async () => {
      const monthStart = `${month}-01`;
      const monthEnd = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
        .toISOString()
        .slice(0, 10);

      const { data: allStudents, error: studentsError } = await supabase
        .from("students")
        .select("id, full_name, family_id, is_active")
        .eq("is_active", true);

      if (studentsError) throw studentsError;
      if (!allStudents || allStudents.length === 0) return [];

      const allStudentIds = allStudents.map((s) => s.id);

      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`student_id, class_id, classes(id, name)`)
        .in("student_id", allStudentIds)
        .lte("start_date", monthEnd)
        .or(`end_date.is.null,end_date.gte.${monthStart}`);

      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("month", month)
        .in("student_id", allStudentIds);

      const { data: discounts } = await supabase
        .from("discount_assignments")
        .select("student_id, discount_def_id")
        .lte("effective_from", monthEnd)
        .or(`effective_to.is.null,effective_to.gte.${monthStart}`);

      const studentDiscounts = new Set(discounts?.map((d) => d.student_id) || []);

      const { data: students } = await supabase.from("students").select("id, family_id").eq("is_active", true);

      const familyCounts = new Map<string, number>();
      students?.forEach((s) => {
        if (s.family_id) {
          familyCounts.set(s.family_id, (familyCounts.get(s.family_id) || 0) + 1);
        }
      });

      const siblingStudents = new Set(
        students?.filter((s) => s.family_id && (familyCounts.get(s.family_id) || 0) >= 2).map((s) => s.id) || [],
      );

      const studentClasses = new Map<string, any[]>();
      enrollments?.forEach((e: any) => {
        const existing = studentClasses.get(e.student_id) || [];
        if (e.classes) {
          existing.push(Array.isArray(e.classes) ? e.classes[0] : e.classes);
        }
        studentClasses.set(e.student_id, existing);
      });

      const invoiceMap = new Map(invoices?.map((inv) => [inv.student_id, inv]) || []);

      const { data: priorInvoices } = await supabase
        .from("invoices")
        .select("student_id, total_amount, recorded_payment")
        .lt("month", month)
        .in("student_id", allStudentIds);

      const priorBalanceMap = new Map<string, number>();
      priorInvoices?.forEach((inv) => {
        const currentBalance = priorBalanceMap.get(inv.student_id) || 0;
        priorBalanceMap.set(inv.student_id, currentBalance + (inv.recorded_payment || 0) - (inv.total_amount || 0));
      });

      return allStudents.map((student) => {
        const invoice = invoiceMap.get(student.id);
        const currentCharges = invoice?.total_amount || 0;
        const carryInCredit = invoice?.carry_in_credit || 0;
        const carryInDebt = invoice?.carry_in_debt || 0;
        const priorBalance = priorBalanceMap.get(student.id) || 0;
        const finalPayable = currentCharges + carryInDebt - carryInCredit;
        const recordedPayment = invoice?.recorded_payment || 0;
        const carryOutCredit = Math.max(0, recordedPayment - finalPayable);
        const carryOutDebt = Math.max(0, finalPayable - recordedPayment);

        return {
          id: invoice?.id || `placeholder-${student.id}`,
          student_id: student.id,
          month,
          base_amount: invoice?.base_amount || 0,
          discount_amount: invoice?.discount_amount || 0,
          total_amount: currentCharges,
          paid_amount: invoice?.paid_amount || 0,
          recorded_payment: recordedPayment,
          status: invoice?.status || "open",
          students: student,
          hasDiscount: studentDiscounts.has(student.id),
          hasSiblings: siblingStudents.has(student.id),
          priorBalance,
          finalPayable,
          balance: finalPayable - recordedPayment,
          classes: studentClasses.get(student.id) || [],
          carry_out_credit: invoice?.carry_out_credit ?? carryOutCredit,
          carry_out_debt: invoice?.carry_out_debt ?? carryOutDebt,
          carry_in_credit: carryInCredit,
          carry_in_debt: carryInDebt,
        };
      });
    },
  });

  const filterChips = useMemo(() => {
    if (!tuitionData) return [];
    const withDiscount = tuitionData.filter((i: any) => i.hasDiscount).length;
    const withSiblings = tuitionData.filter((i: any) => i.hasSiblings).length;
    const getStatus = (item: any) => getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
    });
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
    const getStatus = (item: any) => getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
    });

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
          return Math.abs(b.balance) - Math.abs(a.balance);
        case "total":
          return b.total_amount - a.total_amount;
        case "class":
          return ((a as any).classes?.[0]?.name || "").localeCompare((b as any).classes?.[0]?.name || "");
        default:
          return 0;
      }
    });
  }, [tuitionData, sortBy, activeFilter, confirmationFilter]);

  const getStatusBadge = (item: any) => {
    const status = getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
      settledInMonth: item.settled_in_month,
    });
    return getTuitionStatusBadge(status, item.settled_in_month);
  };

  if (isLoading) {
    return <p className="text-muted-foreground">Loading tuition data...</p>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Tuition Overview - {dayjs(month).format("MMMM YYYY")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
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
              <SelectTrigger className="w-[200px]">
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
            <div className="flex items-center gap-2">
              <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Sort by:</span>
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
            <p className="text-muted-foreground text-center py-8">No tuition records found</p>
          ) : (
            <div className="space-y-3">
              {filteredAndSortedData.map((item) => {
                const statusResult = getPaymentStatus({
                  carryOutDebt: item.carry_out_debt ?? 0,
                  carryOutCredit: item.carry_out_credit ?? 0,
                  totalAmount: item.total_amount ?? 0,
                  monthPayments: item.recorded_payment ?? 0,
                });
                const priorNet = (item.carry_in_debt || 0) - (item.carry_in_credit || 0);

                return (
                  <TuitionStudentRow
                    key={item.id}
                    item={item}
                    statusBadge={getStatusBadge(item)}
                    priorNet={priorNet}
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
  priorNet,
  onRecordPay,
  onView,
}: {
  item: any;
  statusBadge: React.ReactNode;
  priorNet: number;
  onRecordPay: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const studentName = (item.students as any)?.full_name ?? "—";
  const classNames = (item as any).classes?.map((c: any) => c.name).join(", ") || "No class";
  const balance = item.balance ?? 0;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="border rounded-xl overflow-hidden bg-card transition-shadow hover:shadow-md">
        {/* ── Header row: always visible ── */}
        <CollapsibleTrigger asChild>
          <button className="w-full text-left p-3 sm:p-4 flex items-center gap-3 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm sm:text-base truncate">{studentName}</span>
                {statusBadge}
                {item.hasDiscount && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Discount</Badge>}
                {item.hasSiblings && <Badge variant="outline" className="text-[10px] px-1.5 py-0">Sibling</Badge>}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{classNames}</p>
            </div>
            {/* Right side: balance + chevron */}
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold tabular-nums ${
                balance > 0 ? "text-destructive" : balance < 0 ? "text-emerald-600" : "text-muted-foreground"
              }`}>
                {balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "Settled"}
              </p>
              <p className="text-[10px] text-muted-foreground">Balance</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
          </button>
        </CollapsibleTrigger>

        {/* ── Expanded detail ── */}
        <CollapsibleContent>
          <div className="border-t px-3 sm:px-4 py-3 space-y-3">
            {/* Finance breakdown grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-3 gap-x-2 text-center">
              <FinanceCell label="Base" value={fmt(item.base_amount)} />
              <FinanceCell label="Discount" value={item.discount_amount > 0 ? `−${fmt(item.discount_amount)}` : "—"} accent={item.discount_amount > 0 ? "green" : undefined} />
              <FinanceCell label="Prior Bal." value={priorNet === 0 ? "—" : priorNet > 0 ? fmt(priorNet) : `+${fmt(Math.abs(priorNet))}`} accent={priorNet > 0 ? "red" : priorNet < 0 ? "green" : undefined} />
              <FinanceCell label="Payable" value={fmt(item.finalPayable)} bold />
              <FinanceCell label="Paid" value={fmt(item.recorded_payment ?? item.paid_amount)} accent="blue" />
              <FinanceCell
                label="Balance"
                value={balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "0 ₫"}
                accent={balance > 0 ? "red" : balance < 0 ? "green" : undefined}
                bold
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={onRecordPay} className="flex-1 sm:flex-none gap-1.5">
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
}: {
  label: string;
  value: string;
  accent?: "green" | "red" | "blue";
  bold?: boolean;
}) {
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
