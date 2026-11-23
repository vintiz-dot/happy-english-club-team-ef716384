/**
 * Parent tuition wording: English with the Vietnamese beneath (same shape as FamilyBi, for the tuition page's own copy file).
 */
import { cn } from "@/lib/utils";
import { fill } from "@/lib/copy/student";
import { familyTuitionCopy, type FamilyTuitionCopyKey } from "@/lib/copy/familyTuition";
import { InkCheck } from "@/components/fx/InkCheck";

export function TuitionBi({
  k,
  vars,
  className,
}: {
  k: FamilyTuitionCopyKey;
  vars?: Record<string, string | number>;
  className?: string;
}) {
  const entry = familyTuitionCopy[k];
  return (
    <span className={cn("inline-block", className)}>
      <span>{fill(entry.en, vars)}</span>
      <span lang="vi" className="block text-hec-small font-normal text-hec-ink-soft">
        {fill(entry.vi, vars)}
      </span>
    </span>
  );
}

/** Shown only when the page already holds a payment recorded for the month. One line and a tick drawn once; nothing else. */
export function ReceivedWithThanks() {
  return (
    <div className="flex items-start gap-2 text-hec-body text-hec-ink">
      <InkCheck className="mt-0.5 text-hec-leaf" />
      <TuitionBi k="tuition.received" />
    </div>
  );
}
