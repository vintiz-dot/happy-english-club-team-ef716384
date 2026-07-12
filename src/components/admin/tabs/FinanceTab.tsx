import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminTuitionListEnhanced } from "@/components/admin/AdminTuitionListEnhanced";
import { TuitionBulkDownload } from "@/components/admin/TuitionBulkDownload";
import { DiscountManager } from "@/components/admin/DiscountManager";
import { SiblingDiscountCompute } from "@/components/admin/SiblingDiscountCompute";
import { FinanceSummary } from "@/components/admin/FinanceSummary";
import { ExpendituresManager } from "@/components/admin/ExpendituresManager";
import { RecurringExpendituresManager } from "@/components/admin/RecurringExpendituresManager";
import { RecordedPaymentManager } from "@/components/admin/RecordedPaymentManager";
import { MonthPicker } from "@/components/MonthPicker";
import { dayjs } from "@/lib/date";
import { useEarliestFinanceMonth } from "@/hooks/useEarliestFinanceMonth";
import { Button } from "@/components/ui/button";
import { Wallet, Users, Lock } from "lucide-react";
import { SmartFamilyPaymentModal } from "@/components/admin/SmartFamilyPaymentModal";
import { BatchFamilyPaymentModal } from "@/components/admin/BatchFamilyPaymentModal";
import { QuickPayPanel } from "@/components/admin/QuickPayPanel";
import { CloseMonthDialog } from "@/components/admin/CloseMonthDialog";
import { PageHero } from "@/components/quest/PageHero";

const FinanceTab = () => {
  const [smartPaymentOpen, setSmartPaymentOpen] = useState(false);
  const [batchPaymentOpen, setBatchPaymentOpen] = useState(false);
  const [closeMonthOpen, setCloseMonthOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(dayjs().format("YYYY-MM"));
  const { data: earliestMonth } = useEarliestFinanceMonth();


  return (
    <>
      <SmartFamilyPaymentModal open={smartPaymentOpen} onClose={() => setSmartPaymentOpen(false)} />
      <BatchFamilyPaymentModal open={batchPaymentOpen} onClose={() => setBatchPaymentOpen(false)} />
      <CloseMonthDialog open={closeMonthOpen} month={currentMonth} onClose={() => setCloseMonthOpen(false)} />

      <PageHero
        eyebrow="Finance"
        title="Tuition & Money"
        subtitle="Live billing, payments, payroll, and audit-grade closes."
        variant="mint"
        className="mb-6"
      />

      <Tabs defaultValue="summary" className="space-y-4">
        <div className="space-y-3">
          {/* Tabs — horizontally scrollable on mobile, wrap on tablet+, no overflow */}
          <div className="-mx-4 sm:mx-0 overflow-x-auto scrollbar-hide">
            <TabsList className="inline-flex w-max min-w-full sm:w-auto px-4 sm:px-0 gap-1">
              <TabsTrigger value="summary" className="whitespace-nowrap">Summary</TabsTrigger>
              <TabsTrigger value="overview" className="whitespace-nowrap">Tuition</TabsTrigger>
              <TabsTrigger value="quickpay" className="whitespace-nowrap">Quick Pay</TabsTrigger>
              <TabsTrigger value="bulk" className="whitespace-nowrap">Bulk Download</TabsTrigger>
              <TabsTrigger value="recorded" className="whitespace-nowrap">Recorded</TabsTrigger>
              <TabsTrigger value="expenditures" className="whitespace-nowrap">Expenditures</TabsTrigger>
              <TabsTrigger value="discounts" className="whitespace-nowrap">Discounts</TabsTrigger>
              <TabsTrigger value="sibling" className="whitespace-nowrap">Siblings</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSmartPaymentOpen(true)} className="gap-2">
              <Wallet className="h-4 w-4" />
              <span className="hidden sm:inline">Single Family</span>
              <span className="sm:hidden">Single</span>
            </Button>
            <Button onClick={() => setBatchPaymentOpen(true)} variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Batch Payment</span>
              <span className="sm:hidden">Batch</span>
            </Button>
            <Button onClick={() => setCloseMonthOpen(true)} variant="outline" className="gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Close Month</span>
              <span className="sm:hidden">Close</span>
            </Button>
          </div>
        </div>

      <TabsContent value="summary" className="space-y-4">
        <FinanceSummary />
      </TabsContent>

      <TabsContent value="overview" className="space-y-4">
        <MonthPicker value={currentMonth} onChange={setCurrentMonth} minMonth={earliestMonth} maxMonth={dayjs().add(2, "month").format("YYYY-MM")} />
        <AdminTuitionListEnhanced month={currentMonth} />
      </TabsContent>

      <TabsContent value="quickpay" className="space-y-4">
        <MonthPicker value={currentMonth} onChange={setCurrentMonth} minMonth={earliestMonth} maxMonth={dayjs().add(2, "month").format("YYYY-MM")} />
        <QuickPayPanel month={currentMonth} />
      </TabsContent>

      <TabsContent value="bulk">
        <TuitionBulkDownload month={currentMonth} />
      </TabsContent>

      <TabsContent value="recorded">
        <RecordedPaymentManager />
      </TabsContent>

      <TabsContent value="discounts">
        <DiscountManager />
      </TabsContent>

      <TabsContent value="expenditures" className="space-y-4">
        <MonthPicker value={currentMonth} onChange={setCurrentMonth} minMonth={earliestMonth} maxMonth={dayjs().add(2, "month").format("YYYY-MM")} />
        <RecurringExpendituresManager selectedMonth={currentMonth} />
        <ExpendituresManager selectedMonth={currentMonth} />
      </TabsContent>

      <TabsContent value="sibling">
        <SiblingDiscountCompute />
      </TabsContent>
      </Tabs>
    </>
  );
};

export default FinanceTab;
