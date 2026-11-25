/**
 * Reports, at three depths.
 *
 *   Executive  the month on one screen: red flags from the discrepancy
 *              checks, cash in against billed, profit and margin, the trend.
 *   Top level  the school-wide operational reports: classes, cancellations,
 *              excused absences, family payment activity, payment details.
 *   Forensic   one child's account in full (the student audit and printable
 *              statement), and every payment of a month traced to its bills
 *              and its ledger legs.
 *   Checks     the money checks (bills against the register, changes waiting to be
 *              repriced, attendance, closed months, sibling swaps). Its tab, and the
 *              Reports entry in the menu, carry a red count when one needs a person.
 *
 * Only the open tab is mounted, so no tab pays for another's queries.
 */
import { useState } from "react";
import { BarChart3, Gauge, Microscope, ShieldAlert } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/quest/PageHero";
import { StudentAuditRoster } from "@/components/admin/reports/StudentAuditRoster";
import { StudentStatementPrint } from "@/components/admin/reports/StudentStatementPrint";
import OperationalReports from "@/components/admin/reports/OperationalReports";
import ExecutiveReport from "@/components/admin/reports/ExecutiveReport";
import { ForensicPaymentTrail } from "@/components/admin/reports/ForensicPaymentTrail";
import { ChecksPanel } from "@/components/admin/reports/ChecksPanel";
import { CheckBadge } from "@/components/admin/CheckBadge";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { checkLines } from "@/lib/checkProblems";
import { tryMakeDocument, downloadBlob } from "@/lib/hecDocs";
import type { StudentAudit } from "@/hooks/useStudentAudit";

type Depth = "executive" | "top" | "forensic" | "checks";
type ForensicView = "trail" | "students";

const ReportsTab = () => {
  const [depth, setDepth] = useState<Depth>("executive");
  const [forensicView, setForensicView] = useState<ForensicView>("trail");
  const checks = useCheckProblems(true);
  // The statement that is currently staged for printing. Held here, at
  // the top, because the print portal hides every sibling under <body>
  // and there must only ever be one of it on the page.
  const [statement, setStatement] = useState<StudentAudit | null>(null);

  const print = async (audit: StudentAudit) => {
    // The premium statement PDF from HEC Docs; the print view below stays as
    // the fallback.
    const doc = await tryMakeDocument("statement", { audit: audit as unknown as Record<string, unknown> });
    if (doc) {
      downloadBlob(doc.blob, doc.filename);
      return;
    }
    setStatement(audit);
    // Let React commit the portal before the browser snapshots the page;
    // printing in the same tick prints the previous student, or nothing.
    requestAnimationFrame(() => requestAnimationFrame(() => window.print()));
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Reports"
        title="Reports"
        subtitle="Executive summary, school-wide detail, or a forensic trace of every payment and account."
        variant="glacier"
      />

      <Tabs value={depth} onValueChange={(v) => setDepth(v as Depth)} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/60 p-1 sm:inline-grid sm:w-auto sm:grid-cols-4">
          <TabsTrigger value="executive" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <Gauge className="h-4 w-4" aria-hidden />
            Executive
          </TabsTrigger>
          <TabsTrigger value="top" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" aria-hidden />
            Top level
          </TabsTrigger>
          <TabsTrigger value="forensic" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <Microscope className="h-4 w-4" aria-hidden />
            Forensic
          </TabsTrigger>
          <TabsTrigger value="checks" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" aria-hidden />
            Checks
            <CheckBadge total={checks.total} lines={checkLines(checks.counts)} className="ml-1" />
          </TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4">
          <ExecutiveReport onOpenForensic={() => { setForensicView("trail"); setDepth("forensic"); }} />
        </TabsContent>

        <TabsContent value="top" className="mt-4">
          <OperationalReports />
        </TabsContent>

        <TabsContent value="forensic" className="mt-4">
          <Tabs value={forensicView} onValueChange={(v) => setForensicView(v as ForensicView)}>
            <TabsList className="h-auto rounded-lg bg-muted/40 p-1">
              <TabsTrigger value="trail" className="rounded-md text-sm">Payment trail</TabsTrigger>
              <TabsTrigger value="students" className="rounded-md text-sm">Student accounts</TabsTrigger>
            </TabsList>
            <TabsContent value="trail" className="mt-4">
              <ForensicPaymentTrail />
            </TabsContent>
            <TabsContent value="students" className="mt-4">
              <StudentAuditRoster onPrint={print} />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="checks" className="mt-4">
          <ChecksPanel />
        </TabsContent>
      </Tabs>

      {statement && <StudentStatementPrint audit={statement} />}
    </div>
  );
};

export default ReportsTab;
