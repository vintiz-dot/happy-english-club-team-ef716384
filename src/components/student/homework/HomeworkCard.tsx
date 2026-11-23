/**
 * One homework, as a card a young learner can read at a glance on a phone.
 *
 * Layout rule that keeps text from collapsing: the title, and the preview
 * under it, each get the WHOLE card width on their own row. Nothing sits
 * beside them, so nothing can squeeze them. The small things (class chip,
 * state pill, due date, grade) live on rows of their own that wrap.
 */
import { CalendarDays, ChevronRight, Paperclip, Star } from "lucide-react";
import { motion } from "framer-motion";
import { getHomeworkStatus } from "@/lib/homeworkStatus";
import { richTextPreview } from "@/lib/richText";
import { cn } from "@/lib/utils";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { pressable } from "@/components/fx/PaperPress";
import { dueText, homeworkLook } from "./homeworkLook";

interface Props {
  homework: any;
  onOpen: () => void;
  /** Dashboard version: no preview text, no PDF button. */
  compact?: boolean;
  index?: number;
  /** no emoji in the state pill (the teen band's pages carry none) */
  plain?: boolean;
}

/** Ivory badge per state: the word always shows, colour only adds to it. */
const IVORY_PILL: Record<string, string> = {
  overdue: "border-hec-danger/30 bg-hec-danger-tint text-hec-danger",
  "due-today": "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
  "due-soon": "border-hec-warn/30 bg-hec-warn-tint text-hec-warn",
  upcoming: "border-hec-line bg-hec-sunken text-hec-ink-soft",
  submitted: "border-hec-line bg-hec-sunken text-hec-ink-soft",
  graded: "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf",
};
const IVORY_FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export function HomeworkCard({ homework, onOpen, compact = false, index = 0, plain = false }: Props) {
  const status = getHomeworkStatus(homework);
  const look = homeworkLook[status];
  const done = status === "submitted" || status === "graded";
  const due = dueText(homework.due_date, done, homework.submission);
  const preview = compact ? "" : richTextPreview(homework.body, 140);
  const grade = status === "graded" ? homework.submission?.grade : null;
  const files = homework.homework_files?.length || 0;
  const className = homework.classes?.name || "Class";

  const hero = index === 0 && !done;
  return (
    <motion.article
      initial={false}
      className={cn("min-w-0 rounded-hec-md border border-hec-line bg-hec-paper p-4 shadow-hec-1", pressable)}
    >
      {/* Row 1: class + state */}
      <div className="flex items-start justify-between gap-2 min-w-0">
        <span className="min-w-0 whitespace-normal break-words rounded-full border border-hec-line bg-hec-surface px-3 py-1 text-hec-caption font-medium text-hec-ink-soft">
          {className}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-hec-caption font-medium",
            IVORY_PILL[status],
          )}
        >
          {!plain && <span aria-hidden>{look.emoji}</span>}
          {look.pill}
        </span>
      </div>

      {/* Row 2: the title, full width */}
      <button
        type="button"
        onClick={onOpen}
        tabIndex={-1}
        className="mt-3 block w-full text-left outline-none after:absolute after:inset-0 after:rounded-hec-md after:content-['']"
      >
        <h3 className="break-words text-hec-h3 font-semibold text-hec-ink">
          {homework.title}
        </h3>
      </button>

      {/* Row 3: what the task is about, as plain text */}
      {preview && (
        <p className="mt-1 break-words text-hec-small text-hec-ink-soft">
          {preview}
        </p>
      )}

      {/* Row 4: facts */}
      {(due || grade || files > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-hec-small font-medium">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-2",
                status === "overdue"
                  ? "text-hec-danger"
                  : status === "due-today"
                    ? "text-hec-warn"
                    : "text-hec-ink-soft",
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
              {due}
            </span>
          )}
          {files > 0 && !compact && (
            <span className="inline-flex items-center gap-1 text-hec-ink-soft">
              <Paperclip className="h-4 w-4 shrink-0" aria-hidden />
              {files} {files === 1 ? "file" : "files"}
            </span>
          )}
          {grade && (
            <span className="inline-flex items-center gap-1 rounded-full border border-hec-brass/40 px-3 py-0.5 text-hec-brass">
              <Star className="h-4 w-4 shrink-0" aria-hidden />
              {grade}
            </span>
          )}
        </div>
      )}

      {/* Row 5: one clear thing to do */}
      <div className="relative z-10 mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "inline-flex min-h-hec-target flex-1 items-center justify-center gap-2 rounded-hec-md px-6 text-hec-body font-medium transition-colors duration-hec-1 ease-hec",
            hero
              ? "bg-hec-brass-fill text-hec-on-brass hover:bg-hec-brass-fill/90"
              : "border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
            IVORY_FOCUS,
          )}
        >
          {look.cta}
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
        {!compact && homework.body && (
          <div className="shrink-0">
            <HomeworkPdfDownload homework={homework} className={className} variant="chunky" />
          </div>
        )}
      </div>
    </motion.article>
  );
}
