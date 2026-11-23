/**
 * One line of wall copy: English first, the Vietnamese beneath in the small type when the child's band (or the
 * device switch) asks for it. The twin of band/Bi.tsx for entries in src/lib/copy/studentWalls.ts.
 */
import { cn } from "@/lib/utils";
import { useAgeBand } from "@/hooks/useAgeBand";
import type { CopyEntry } from "@/lib/copy/student";

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
  const say = (s: string) => (vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m)) : s);
  return (
    <span className={cn("inline-block break-words", className)}>
      <span>{say(entry.en)}</span>
      {viBeneath && (
        <span lang="vi" className={cn("block text-hec-small font-normal text-hec-ink-soft", viClassName)}>
          {say(entry.vi)}
        </span>
      )}
    </span>
  );
}
