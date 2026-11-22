/**
 * "Me" for the three younger bands (docs/EXPERIENCE_DESIGN_BRIEF.md G6): the badges, the reports and the schedule
 * are pages under Me, one tap from each other. The URLs are the old tabs (?tab=achievements, ?tab=reports,
 * ?tab=schedule) and keep working; for the teen band they stay plain tabs and this row is not drawn.
 */
import { Link } from "react-router-dom";
import { Bi } from "@/components/student/band/Bi";
import { FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";
import type { StudentCopyKey } from "@/lib/copy/student";

const LINKS: { tab: string; copy: StudentCopyKey }[] = [
  { tab: "achievements", copy: "nav.achievements" },
  { tab: "reports", copy: "nav.reports" },
  { tab: "schedule", copy: "nav.schedule" },
];

export function MeLinks({ active }: { active: string }) {
  return (
    <nav aria-label="Me" className="mb-4 flex flex-wrap gap-2">
      {LINKS.map(({ tab, copy }) => (
        <Link
          key={tab}
          to={`/student/dashboard?tab=${tab}`}
          aria-current={active === tab ? "page" : undefined}
          className={cn(
            "inline-flex min-h-hec-target items-center rounded-full border px-4 text-hec-small font-medium transition-colors duration-hec-1 ease-hec",
            active === tab ? "border-hec-ink bg-hec-action text-hec-on-action" : "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
            FOCUS,
          )}
        >
          <Bi k={copy} viClassName="hidden" />
        </Link>
      ))}
    </nav>
  );
}
