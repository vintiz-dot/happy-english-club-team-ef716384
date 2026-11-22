/**
 * One line of parent copy: the English, with the Vietnamese beneath it in the small type (docs/EXPERIENCE_DESIGN_BRIEF.md
 * J2). Used on headings and on sentences about something that needs action; pass `vi={false}` for plain English.
 */
import { cn } from "@/lib/utils";
import { fill } from "@/lib/copy/student";
import { familyCopy, type FamilyCopyKey } from "@/lib/copy/family";

export function FamilyBi({
  k,
  vars,
  vi = true,
  className,
  viClassName,
}: {
  k: FamilyCopyKey;
  vars?: Record<string, string | number>;
  vi?: boolean;
  className?: string;
  viClassName?: string;
}) {
  const entry = familyCopy[k];
  return (
    <span className={cn("inline-block", className)}>
      <span>{fill(entry.en, vars)}</span>
      {vi && (
        <span lang="vi" className={cn("block text-hec-small font-normal text-hec-ink-soft", viClassName)}>
          {fill(entry.vi, vars)}
        </span>
      )}
    </span>
  );
}
