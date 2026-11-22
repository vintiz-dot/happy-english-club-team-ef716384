import { Link } from "react-router-dom";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { useLessonReportCue } from "@/hooks/useLessonReportCue";

/**
 * The cue: lessons whose transcript the school laptop has handed over and whose class report is ready to
 * review (or being written). Shows nothing when there is none, and nothing for a person who cannot read a
 * monitor transcript (the query returns no rows for them).
 */
export function LessonReportCue() {
  const items = useLessonReportCue(true);
  if (!items.length) return null;
  return (
    <div className="rounded-lg border bg-card p-4 space-y-2" data-lesson-report-cue="">
      <div className="flex items-center gap-2 font-medium"><ClipboardCheck className="h-4 w-4" aria-hidden /> Class reports for you</div>
      <ul className="divide-y text-sm">
        {items.map((i) => (
          <li key={i.session_id} className="py-2 flex flex-wrap items-center justify-between gap-2">
            <span>Lesson of {i.date}</span>
            {i.state === "building" ? (
              <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Being written from the transcript</span>
            ) : (
              <Link className="underline font-medium" to={`/teacher/lesson-report/${i.session_id}`}>
                {i.state === "ready" ? "Draft ready to review" : "Draft failed - open to rebuild"}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
