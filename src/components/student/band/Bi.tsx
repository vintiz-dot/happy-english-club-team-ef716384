/**
 * One line of student copy, English first and the Vietnamese beneath it in the small type when the child's band
 * (or the device switch) asks for it. docs/EXPERIENCE_DESIGN_BRIEF.md J2.
 */
import { cn } from "@/lib/utils";
import { fill, studentCopy, type StudentCopyKey } from "@/lib/copy/student";
import { useAgeBand } from "@/hooks/useAgeBand";

export function Bi({
  k,
  vars,
  className,
  viClassName,
}: {
  k: StudentCopyKey;
  vars?: Record<string, string | number>;
  className?: string;
  viClassName?: string;
}) {
  const { viBeneath } = useAgeBand();
  const entry = studentCopy[k];
  return (
    <span className={cn("inline-block", className)}>
      <span>{fill(entry.en, vars)}</span>
      {viBeneath && (
        <span lang="vi" className={cn("block text-hec-small font-normal text-hec-ink-soft", viClassName)}>
          {fill(entry.vi, vars)}
        </span>
      )}
    </span>
  );
}
