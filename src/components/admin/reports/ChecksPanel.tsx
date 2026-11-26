/**
 * Reports > Checks: the money checks that used to sit in Finance > Tuition, in one place.
 * On top, ProblemsList: every problem the menu's red badge counts, with why and the fix
 * (useCheckProblems; the badge is its length). Under it, each check's own card in full:
 *
 *   Bills            every child with lessons has a bill that matches the register
 *   Pending changes  discount / fee / enrolment / lesson changes whose bills were not worked out again
 *   Attendance       the register against the proof a child was in the room
 *   Closed months    bills held as charged because today's pricing gives another figure
 *   Sibling swaps    discounts moved to fit what a family paid
 */
import { useState } from "react";
import { MonthPicker } from "@/components/MonthPicker";
import { PendingChangeBills } from "@/components/admin/PendingChangeBills";
import { TuitionBillCheck } from "@/components/admin/TuitionBillCheck";
import { AttendanceEvidenceCheck } from "@/components/admin/AttendanceEvidenceCheck";
import { ClosedMonthChanges } from "@/components/admin/ClosedMonthChanges";
import { SiblingSwaps } from "@/components/admin/SiblingSwaps";
import { useEarliestFinanceMonth } from "@/hooks/useEarliestFinanceMonth";
import { dayjs } from "@/lib/date";
import { ProblemsList } from "@/components/admin/reports/ProblemsList";
import type { CheckProblems } from "@/hooks/useCheckProblems";

export function ChecksPanel({ checks }: { checks: CheckProblems }) {
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const { data: earliestMonth } = useEarliestFinanceMonth();

  return (
    <div className="space-y-4">
      <ProblemsList checks={checks} />
      <h3 className="pt-2 text-hec-small font-semibold uppercase tracking-wide text-hec-ink-soft">Each check in full</h3>
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker value={month} onChange={setMonth} minMonth={earliestMonth} maxMonth={dayjs().add(2, "month").format("YYYY-MM")} />
        <span className="text-hec-caption text-hec-ink-soft">Month for the bill check. The other checks have their own range.</span>
      </div>
      <PendingChangeBills />
      <TuitionBillCheck month={month} />
      <AttendanceEvidenceCheck />
      <ClosedMonthChanges />
      <SiblingSwaps />
    </div>
  );
}
