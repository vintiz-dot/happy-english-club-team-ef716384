import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SessionGenerator } from "@/components/admin/SessionGenerator";
import { ScheduleStatusCard } from "@/components/admin/ScheduleStatusCard";
import { BulkSessionDelete } from "@/components/admin/BulkSessionDelete";
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
      <div className="surface-2 rounded-xl shadow-q1 ring-1 ring-border overflow-hidden">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-muted/40 transition-colors"
          >
            <div className="min-w-0">
              <p className="type-h2">{title}</p>
              {description && (
                <p className="type-micro text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
            <ChevronRight
              className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                open ? "rotate-90" : ""
              }`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t p-4">{children}</div>
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
        <TabsList>
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
            title="Bulk Session Delete"
            description="Remove sessions in bulk — destructive, double-check filters."
          >
            <BulkSessionDelete />
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
