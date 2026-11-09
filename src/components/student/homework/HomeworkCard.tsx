/**
 * One homework, as a card a young learner can read at a glance on a phone.
 *
 * Layout rule that keeps text from collapsing: the title, and the preview
 * under it, each get the WHOLE card width on their own row. Nothing sits
 * beside them, so nothing can squeeze them. The small things (class chip,
 * state pill, due date, grade) live on rows of their own that wrap.
 */
import { CalendarDays, ChevronRight, Paperclip, Star } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { getHomeworkStatus } from "@/lib/homeworkStatus";
import { richTextPreview } from "@/lib/richText";
import { cn } from "@/lib/utils";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { classTint, dueText, homeworkLook } from "./homeworkLook";

interface Props {
  homework: any;
  onOpen: () => void;
  /** Dashboard version: no preview text, no PDF button. */
  compact?: boolean;
  index?: number;
}

export function HomeworkCard({ homework, onOpen, compact = false, index = 0 }: Props) {
  const reduceMotion = useReducedMotion();
  const status = getHomeworkStatus(homework);
  const look = homeworkLook[status];
  const done = status === "submitted" || status === "graded";
  const due = dueText(homework.due_date, done, homework.submission);
  const preview = compact ? "" : richTextPreview(homework.body, 140);
  const grade = status === "graded" ? homework.submission?.grade : null;
  const files = homework.homework_files?.length || 0;
  const className = homework.classes?.name || "Class";

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 8) * 0.04, duration: 0.28, ease: "easeOut" }}
      className={cn(
        "relative rounded-3xl border-2 border-b-[5px] p-4 sm:p-5 min-w-0",
        look.cardClass,
      )}
    >
      {/* Row 1: class + state */}
      <div className="flex items-center justify-between gap-2 min-w-0">
        <span
          className={cn(
            "inline-block min-w-0 max-w-[65%] truncate rounded-full px-2.5 py-1 text-xs font-bold",
            classTint(className),
          )}
          title={className}
        >
          {className}
        </span>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap",
            look.pillClass,
          )}
        >
          <span aria-hidden>{look.emoji}</span>
          {look.pill}
        </span>
      </div>

      {/* Row 2: the title, full width */}
      <button
        type="button"
        onClick={onOpen}
        tabIndex={-1}
        className="mt-3 block w-full text-left outline-none after:absolute after:inset-0 after:rounded-3xl after:content-['']"
      >
        <h3
          className={cn(
            "font-extrabold leading-snug tracking-tight text-foreground break-words [hyphens:auto]",
            compact ? "text-base line-clamp-2" : "text-lg sm:text-xl line-clamp-3",
          )}
        >
          {homework.title}
        </h3>
      </button>

      {/* Row 3: what the task is about, as plain text */}
      {preview && (
        <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted-foreground line-clamp-2 break-words">
          {preview}
        </p>
      )}

      {/* Row 4: facts */}
      {(due || grade || files > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm font-semibold">
          {due && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                status === "overdue"
                  ? "text-rose-600 dark:text-rose-300"
                  : status === "due-today"
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-muted-foreground",
              )}
            >
              <CalendarDays className="h-4 w-4 shrink-0" />
              {due}
            </span>
          )}
          {files > 0 && !compact && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Paperclip className="h-4 w-4 shrink-0" />
              {files} {files === 1 ? "file" : "files"}
            </span>
          )}
          {grade && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />
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
            "flex h-12 flex-1 items-center justify-center gap-1.5 rounded-2xl text-base",
            look.buttonClass,
          )}
        >
          {look.cta}
          <ChevronRight className="h-5 w-5" strokeWidth={3} />
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
