/**
 * <Bi> for a copy entry that lives outside src/lib/copy/student.ts: a page area's own dictionary
 * (src/lib/copy/student<Area>.ts) passes the entry itself. English first, the Vietnamese beneath it in the small
 * type when the child's band (or the device switch) asks for it. docs/EXPERIENCE_DESIGN_BRIEF.md J2.
 */
import { cn } from "@/lib/utils";
import { fill, type CopyEntry } from "@/lib/copy/student";
import { useAgeBand } from "@/hooks/useAgeBand";

export function BiText({
  entry,
  vars,
  className,
  viClassName,
}: {
  entry: CopyEntry;
  vars?: Record<string, string | number>;
  className?: string;
  viClassName?: string;
}) {
  const { viBeneath } = useAgeBand();
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
