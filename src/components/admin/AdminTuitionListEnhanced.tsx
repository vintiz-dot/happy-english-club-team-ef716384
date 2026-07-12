import { useState, useMemo, useCallback, useEffect } from "react";
import { TuitionSummaryCards } from "@/components/admin/tuition/TuitionSummaryCards";
import { TuitionToolbar } from "@/components/admin/tuition/TuitionToolbar";
import { TuitionStudentCard } from "@/components/admin/tuition/TuitionStudentCard";
import { TuitionStudentTable } from "@/components/admin/tuition/TuitionStudentTable";
import { dayjs } from "@/lib/date";
import { getPaymentStatus } from "@/lib/tuitionStatus";
import { motion, AnimatePresence } from "framer-motion";
import { FileSearch, CheckSquare, X, CreditCard, LayoutGrid, Rows } from "lucide-react";
import { useLiveTuitionData } from "@/hooks/useLiveTuitionData";
import { RecordPaymentDialog } from "@/components/admin/RecordPaymentDialog";
import { BatchPaymentDialog } from "@/components/admin/BatchPaymentDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Density = "card" | "table";
const DENSITY_KEY = "admin-tuition-density";

interface AdminTuitionListEnhancedProps {
  month: string;
}

export const AdminTuitionListEnhanced = ({ month }: AdminTuitionListEnhancedProps) => {
  const [sortBy, setSortBy] = useState<"name" | "balance" | "total" | "class">("name");
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirmationFilter, setConfirmationFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentItem, setPaymentItem] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === "undefined") return "card";
    const saved = localStorage.getItem(DENSITY_KEY) as Density | null;
    return saved === "table" ? "table" : "card";
  });

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  // Use live tuition data from calculate-tuition edge function
  const { data: tuitionData, isLoading, isError, error, refetch, isRefetching } = useLiveTuitionData(month);

  // Calculate summary statistics
  const stats = useMemo(() => {
    if (!tuitionData) return null;
    
    const getStatus = (item: any) => getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
      settledInMonth: item.settled_in_month,
    });

    const settledCount = tuitionData.filter((i) => getStatus(i) === 'settled').length;
    const overpaidCount = tuitionData.filter((i) => getStatus(i) === 'overpaid').length;
    const underpaidCount = tuitionData.filter((i) => getStatus(i) === 'underpaid').length;
    const unpaidCount = tuitionData.filter((i) => getStatus(i) === 'unpaid').length;
    
    const totalBilled = tuitionData.reduce((sum, i) => sum + i.finalPayable, 0);
    const totalCollected = tuitionData.reduce((sum, i) => sum + (i.recorded_payment ?? 0), 0);
    const totalOutstanding = tuitionData.reduce((sum, i) => sum + Math.max(0, i.balance), 0);
    const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

    return {
      totalStudents: tuitionData.length,
      settledCount,
      overpaidCount,
      underpaidCount,
      unpaidCount,
      totalBilled,
      totalCollected,
      totalOutstanding,
      collectionRate,
      discountStudents: tuitionData.filter((i) => i.hasDiscount).length,
      siblingStudents: tuitionData.filter((i) => i.hasSiblings).length,
    };
  }, [tuitionData]);

  // Generate filter chips with counts
  const filterChips = useMemo(() => {
    if (!tuitionData) return [];
    
    const getStatus = (item: any) => getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
      settledInMonth: item.settled_in_month,
    });
    
    const overpaid = tuitionData.filter((i) => getStatus(i) === 'overpaid').length;
    const settled = tuitionData.filter((i) => getStatus(i) === 'settled').length;
    const underpaid = tuitionData.filter((i) => getStatus(i) === 'underpaid').length;
    const unpaid = tuitionData.filter((i) => getStatus(i) === 'unpaid').length;
    const paid = settled + overpaid;

    return [
      { key: "all", label: "All", count: tuitionData.length },
      { key: "paid", label: "Paid", count: paid },
      { key: "overpaid", label: "Overpaid", count: overpaid },
      { key: "underpaid", label: "Underpaid", count: underpaid },
      { key: "settled", label: "Settled", count: settled },
      { key: "discount", label: "Discount", count: tuitionData.filter((i) => i.hasDiscount).length },
      { key: "siblings", label: "Siblings", count: tuitionData.filter((i) => i.hasSiblings).length },
    ];
  }, [tuitionData]);

  // Filter and sort data
  const filteredAndSortedData = useMemo(() => {
    if (!tuitionData) return [];

    const getStatus = (item: any) => getPaymentStatus({
      carryOutDebt: item.carry_out_debt ?? 0,
      carryOutCredit: item.carry_out_credit ?? 0,
      totalAmount: item.total_amount ?? 0,
      monthPayments: item.recorded_payment ?? 0,
      settledInMonth: item.settled_in_month,
    });

    let filtered = tuitionData;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const name = (item.students as any)?.full_name?.toLowerCase() || "";
        const classes = (item as any).classes?.map((c: any) => c.name.toLowerCase()).join(" ") || "";
        return name.includes(query) || classes.includes(query);
      });
    }

    if (activeFilter !== "all") {
      filtered = filtered.filter((item) => {
        const status = getStatus(item);
        switch (activeFilter) {
          case "discount": return item.hasDiscount;
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
      filtered = filtered.filter((item) => 
        item.confirmation_status === confirmationFilter
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return ((a.students as any)?.full_name || "").localeCompare((b.students as any)?.full_name || "");
        case "balance":
          return Math.abs(b.balance) - Math.abs(a.balance);
        case "total":
          return b.total_amount - a.total_amount;
        case "class":
          const aClass = (a as any).classes?.[0]?.name || "";
          const bClass = (b as any).classes?.[0]?.name || "";
          return aClass.localeCompare(bClass);
        default:
          return 0;
      }
    });

    return sorted;
  }, [tuitionData, sortBy, activeFilter, confirmationFilter, searchQuery]);

  const reviewQueueCount = useMemo(() => {
    return tuitionData?.filter((i) => i.confirmation_status === 'needs_review').length || 0;
  }, [tuitionData]);

  const toggleSelect = useCallback((studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredAndSortedData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredAndSortedData.map((i) => i.student_id)));
    }
  }, [filteredAndSortedData, selectedIds.size]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const selectedItems = useMemo(() => {
    if (!tuitionData) return [];
    return tuitionData.filter((i) => selectedIds.has(i.student_id));
  }, [tuitionData, selectedIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tuition Overview</h2>
          <p className="text-muted-foreground">{dayjs(month).format("MMMM YYYY")}</p>
        </div>
        <div className="flex items-center gap-2">
          <ToggleGroup
            type="single"
            size="sm"
            value={density}
            onValueChange={(v) => v && setDensity(v as Density)}
            aria-label="List density"
            className="hidden md:inline-flex"
          >
            <ToggleGroupItem value="card" aria-label="Card view" className="h-9 w-9">
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="table" aria-label="Table view" className="h-9 w-9">
              <Rows className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
          <Button
            variant={selectionMode ? "secondary" : "outline"}
            size="sm"
            onClick={() => selectionMode ? exitSelectionMode() : setSelectionMode(true)}
            className="gap-2"
          >
            {selectionMode ? <X className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
            {selectionMode ? "Cancel" : "Select"}
          </Button>
        </div>
      </div>

      {/* Error state — surfaces edge-function failures instead of crashing */}
      {isError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-destructive">Couldn't load tuition</p>
            <p className="text-sm text-muted-foreground">
              {(error as any)?.message || "The tuition calculation service returned an error."}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
            {isRefetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      )}

      {/* Summary Cards — sticky compact strip when scrolled */}
      <div className="sticky top-[72px] md:top-[64px] z-30 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="surface-2 backdrop-blur-md supports-[backdrop-filter]:bg-card/80 rounded-xl">
          <TuitionSummaryCards stats={stats!} isLoading={isLoading} />
        </div>
      </div>

      {/* Toolbar */}
      <TuitionToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={(s) => setSortBy(s as any)}
        filters={filterChips}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        confirmationFilter={confirmationFilter}
        onConfirmationFilterChange={setConfirmationFilter}
        reviewQueueCount={reviewQueueCount}
        month={month}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching}
      />

      {/* Student List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      ) : filteredAndSortedData.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <FileSearch className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold">No students found</h3>
          <p className="text-muted-foreground text-sm max-w-md mt-1">
            {searchQuery
              ? `No results for "${searchQuery}". Try a different search term.`
              : "No tuition records match your current filters."}
          </p>
        </motion.div>
      ) : density === "table" ? (
        <TuitionStudentTable
          items={filteredAndSortedData}
          month={month}
          onRecordPay={(item) => setPaymentItem(item)}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleAll={toggleSelectAll}
        />
      ) : (
        <div className="space-y-3">
          {filteredAndSortedData.map((item) => (
            <TuitionStudentCard
              key={item.id}
              item={item}
              month={month}
              onRecordPay={() => setPaymentItem(item)}
              selectionMode={selectionMode}
              isSelected={selectedIds.has(item.student_id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </div>
      )}

      {/* Floating bulk-action bar — visible whenever items are selected,
          regardless of where the user has scrolled. Replaces the legacy
          inline selection bar. */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-2xl"
          >
            <div className="surface-2 shadow-q3 ring-1 ring-border rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-md supports-[backdrop-filter]:bg-card/80">
              <Checkbox
                checked={selectedIds.size === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                onCheckedChange={toggleSelectAll}
                aria-label="Select all"
              />
              <div className="min-w-0 flex-1">
                <p className="type-body font-semibold leading-tight">
                  {selectedIds.size > 0 ? `${selectedIds.size} selected` : "Select students"}
                </p>
                <p className="type-micro text-muted-foreground">
                  {filteredAndSortedData.length} visible
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={exitSelectionMode}
                className="gap-1.5"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => setBatchDialogOpen(true)}
                disabled={selectedIds.size === 0}
                className="gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Batch Pay
                <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground">
                  {selectedIds.size}
                </Badge>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results Count */}
      {!isLoading && filteredAndSortedData.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredAndSortedData.length} of {tuitionData?.length || 0} students
        </p>
      )}

      <RecordPaymentDialog
        open={!!paymentItem}
        onClose={() => setPaymentItem(null)}
        item={paymentItem}
        month={month}
      />

      <BatchPaymentDialog
        open={batchDialogOpen}
        onClose={() => {
          setBatchDialogOpen(false);
          exitSelectionMode();
        }}
        items={selectedItems}
        month={month}
      />
    </div>
  );
};
