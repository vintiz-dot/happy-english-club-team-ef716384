import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionGenerator } from "@/components/admin/SessionGenerator";
import { ScheduleStatusCard } from "@/components/admin/ScheduleStatusCard";
import { BulkSessionDelete } from "@/components/admin/BulkSessionDelete";
import CancelOverridesReview from "@/components/admin/session-guard/CancelOverridesReview";
import { BulkEnrollmentDateSetter } from "@/components/admin/BulkEnrollmentDateSetter";
import { BulkRebuildSessions } from "@/components/admin/BulkRebuildSessions";
import { TuitionBulkDownload } from "@/components/admin/TuitionBulkDownload";
import { AttendanceRepairTool } from "@/components/admin/AttendanceRepairTool";
import { ManualTuitionRecalc } from "@/components/admin/ManualTuitionRecalc";
import { LedgerBalanceInspector } from "@/components/admin/LedgerBalanceInspector";
import { InvoiceStatusManager } from "@/components/admin/InvoiceStatusManager";
import { PaymentIntegrityRepair } from "@/components/admin/PaymentIntegrityRepair";
import { VoluntaryContributionRepair } from "@/components/admin/VoluntaryContributionRepair";
import { GenerateTuition } from "@/components/admin/GenerateTuition";
import { XPSettingsManager } from "@/components/admin/XPSettingsManager";
import { dayjs } from "@/lib/date";
import { PageHero } from "@/components/quest/PageHero";
import { SectionHeader } from "@/components/quest/SectionHeader";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronRight } from "lucide-react";
import { useState, type ReactNode } from "react";

function AdvancedSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex min-h-hec-target w-full items-center justify-between gap-3 rounded-hec-lg p-4 text-left transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken/60 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-hec-ring"
          >
            <div className="min-w-0">
              <p className="text-hec-h3 font-semibold text-hec-ink">{title}</p>
              {description && (
                <p className="mt-1 text-hec-small text-hec-ink-soft">{description}</p>
              )}
            </div>
            <ChevronRight
              aria-hidden
              className={`h-5 w-5 shrink-0 text-hec-ink-soft transition-transform duration-hec-2 ease-hec ${
                open ? "rotate-90" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t border-hec-line p-4">{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

const AutomationTab = () => {
  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Operations"
        title="Automation"
        subtitle="Bulk operations, integrity repairs, and gamification settings."
        variant="night"
      />

      <Tabs defaultValue="bulk" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="repair">Repair & Debug</TabsTrigger>
          <TabsTrigger value="gamification">Gamification</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="space-y-3">
          <SectionHeader title="Bulk Operations" subtitle="Schedule, tuition, enrolment, downloads." />

          <AdvancedSection
            title="Schedule Generation"
            description="Idempotent schedule generation from class templates."
            defaultOpen
          >
            <div className="space-y-4">
              <SessionGenerator />
              <ScheduleStatusCard />
            </div>
          </AdvancedSection>

          <AdvancedSection
            title="Generate Tuition"
            description="Snapshot invoice rows for a month from the live edge function."
          >
            <GenerateTuition />
          </AdvancedSection>

          <AdvancedSection
            title="Bulk Enrolment Dates"
            description="Set start/end dates across many enrolments at once."
          >
            <BulkEnrollmentDateSetter />
          </AdvancedSection>

          <AdvancedSection
            title="Bulk Rebuild Sessions"
            description="Regenerate sessions for selected classes/months."
          >
            <BulkRebuildSessions />
          </AdvancedSection>

          <AdvancedSection
            title="Bulk Session Cancel"
            description="Check a date range, then cancel — lessons with evidence need your attention one by one."
          >
            <BulkSessionDelete />
          </AdvancedSection>

          <AdvancedSection
            title="Cancellation overrides"
            description="Who cancelled, deleted or moved a lesson that had evidence, why, and what still needs review."
          >
            <CancelOverridesReview />
          </AdvancedSection>

          <AdvancedSection
            title="Tuition Bulk Download"
            description="Download all tuition PDFs for the current month."
          >
            <TuitionBulkDownload month={dayjs().format("YYYY-MM")} />
          </AdvancedSection>
        </TabsContent>

        <TabsContent value="repair" className="space-y-3">
          <SectionHeader
            title="Repair & Debugging"
            subtitle="One-shot tools for fixing data drift. Open only the one you need."
          />

          <AdvancedSection
            title="Attendance Repair"
            description="Reconcile attendance rows against held sessions."
            defaultOpen
          >
            <AttendanceRepairTool />
          </AdvancedSection>

          <AdvancedSection
            title="Manual Tuition Recalc"
            description="Force-recompute a single student's tuition for a month."
          >
            <ManualTuitionRecalc />
          </AdvancedSection>

          <AdvancedSection
            title="Ledger Balance Inspector"
            description="Inspect carry-in / carry-out for any student."
          >
            <LedgerBalanceInspector />
          </AdvancedSection>

          <AdvancedSection
            title="Invoice Status Manager"
            description="Bulk update invoice statuses (open/closed/voided)."
          >
            <InvoiceStatusManager />
          </AdvancedSection>

          <AdvancedSection
            title="Payment Integrity Repair"
            description="Fix orphaned or mis-attributed payment rows."
          >
            <PaymentIntegrityRepair />
          </AdvancedSection>

          <AdvancedSection
            title="Voluntary Contribution Repair"
            description="Reattach detached voluntary contribution payments."
          >
            <VoluntaryContributionRepair />
          </AdvancedSection>
        </TabsContent>

        <TabsContent value="gamification" className="space-y-6">
          <SectionHeader title="Gamification" subtitle="XP rules and leaderboard tuning." />
          <XPSettingsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AutomationTab;
