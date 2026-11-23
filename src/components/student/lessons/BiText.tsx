/**
 * One line from studentLessons.ts: English, with the Vietnamese beneath in the small type when the child's band
 * (or the device switch) asks for it. Same rule as band/Bi, for this page's own dictionary.
 */
import { cn } from "@/lib/utils";
import { useAgeBand } from "@/hooks/useAgeBand";
import { studentLessonsCopy, type StudentLessonsKey } from "@/lib/copy/studentLessons";

export function BiText({ k, className, viClassName, always }: {
  k: StudentLessonsKey; className?: string; viClassName?: string;
  /** show the Vietnamese whatever the band (the reports page is bilingual for everyone today) */
  always?: boolean;
}) {
  const { viBeneath } = useAgeBand();
  const entry = studentLessonsCopy[k];
  return (
    <span className={cn("inline-block min-w-0 break-words", className)}>
      <span>{entry.en}</span>
      {(viBeneath || always) && (
        <span lang="vi" className={cn("block text-hec-small font-normal text-hec-ink-soft", viClassName)}>{entry.vi}</span>
      )}
    </span>
  );
}
