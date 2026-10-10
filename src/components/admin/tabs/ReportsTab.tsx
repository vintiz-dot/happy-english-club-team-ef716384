/**
 * Reports.
 *
 * Two genuinely different questions, so two tabs rather than one long
 * scroll. "How is the school doing this month" and "what exactly has
 * this child been charged, and who took the money" need different
 * shapes, and the old page only answered the first — which is why
 * auditing anybody meant leaving Reports and going to their profile.
 *
 * Student accounts leads, because that is the question that actually
 * brings people here. The operational reports are unchanged and one
 * click away.
 *
 * Only the open tab is mounted, so the student roster does not pay for
 * the month-wide operational queries and vice versa.
 */
import { useState } from "react";
import { BarChart3, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHero } from "@/components/quest/PageHero";
import { StudentAuditRoster } from "@/components/admin/reports/StudentAuditRoster";
import { StudentStatementPrint } from "@/components/admin/reports/StudentStatementPrint";
import OperationalReports from "@/components/admin/reports/OperationalReports";
import type { StudentAudit } from "@/hooks/useStudentAudit";

const ReportsTab = () => {
  // The statement that is currently staged for printing. Held here, at
  // the top, because the print portal hides every sibling under <body>
  // and there must only ever be one of it on the page.
  const [statement, setStatement] = useState<StudentAudit | null>(null);

  const print = (audit: StudentAudit) => {
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
        subtitle="Audit a student's account in full, or review how the school is doing this month."
        variant="glacier"
      />

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-muted/60 p-1 sm:w-auto sm:inline-grid">
          <TabsTrigger value="students" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <Users className="h-4 w-4" aria-hidden />
            Student accounts
          </TabsTrigger>
          <TabsTrigger value="operational" className="gap-1.5 rounded-lg py-2 text-sm font-semibold">
            <BarChart3 className="h-4 w-4" aria-hidden />
            Operational
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="mt-4">
          <StudentAuditRoster onPrint={print} />
        </TabsContent>

        <TabsContent value="operational" className="mt-4">
          <OperationalReports />
        </TabsContent>
      </Tabs>

      {statement && <StudentStatementPrint audit={statement} />}
    </div>
  );
};

export default ReportsTab;
