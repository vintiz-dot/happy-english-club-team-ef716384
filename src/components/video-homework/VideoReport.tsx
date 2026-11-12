/**
 * The approved report, for a child and their parent. Only the teacher's
 * final words reach here (get_video_homework_for_student never returns
 * the AI draft). Stars rather than numbers for each part; the parent's
 * note is in Vietnamese.
 */
import { useState } from "react";
import { Star, ChevronDown } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";

export interface ApprovedReport {
  score: number | null;
  grade: string | null;
  feedback: string | null;
  parent_note: string | null;
  strengths: string[];
  focus_points: string[];
  criteria: { label: string; score: number; max: number; comment?: string }[];
  approved_at: string | null;
}

function Stars({ score, max }: { score: number; max: number }) {
  const ivory = useIvory();
  return (
    <span className="flex gap-0.5" aria-label={`${score} out of ${max}`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            ivory
              ? i < score ? "fill-current text-hec-brass" : "text-hec-line-strong"
              : i < score ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
          }`}
        />
      ))}
    </span>
  );
}

export function VideoReport({ report }: { report: ApprovedReport }) {
  const [parentOpen, setParentOpen] = useState(false);
  const ivory = useIvory();
  return (
    <div className={ivory ? "overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface" : "rounded-2xl border border-emerald-500/30 overflow-hidden"}>
      <div className={ivory ? "flex items-center justify-between gap-3 border-b border-hec-line bg-hec-sunken px-4 py-3" : "bg-gradient-to-r from-emerald-500/20 to-sky-500/10 px-4 py-3 flex items-center justify-between"}>
        <span className={ivory ? "text-hec-body font-medium text-hec-ink" : "font-semibold text-sm"}>✅ Your teacher watched your video</span>
        {report.grade && <span className={ivory ? "shrink-0 text-hec-body font-medium text-hec-leaf" : "text-sm font-bold text-emerald-700 dark:text-emerald-400"}>{report.grade}</span>}
      </div>
      <div className="p-4 space-y-4">
        {report.feedback && (
          <div className="flex gap-2">
            <div className={ivory ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hec-sunken text-hec-small" : "w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-sm"}>👩‍🏫</div>
            <p className={ivory ? "min-w-0 whitespace-pre-wrap break-words rounded-hec-md border border-hec-line bg-hec-sunken p-3 text-hec-body text-hec-ink" : "text-sm whitespace-pre-wrap leading-relaxed bg-primary/5 border border-primary/15 rounded-xl p-3"}>
              {report.feedback}
            </p>
          </div>
        )}

        {report.strengths?.length > 0 && (
          <div>
            <p className={ivory ? "mb-1.5 text-hec-small font-medium text-hec-ink-soft" : "text-xs font-semibold text-muted-foreground mb-1.5"}>🌟 You did well</p>
            <ul className="space-y-1">
              {report.strengths.map((s) => <li key={s} className={ivory ? "text-hec-body text-hec-ink" : "text-sm"}>✓ {s}</li>)}
            </ul>
          </div>
        )}
        {report.focus_points?.length > 0 && (
          <div>
            <p className={ivory ? "mb-1.5 text-hec-small font-medium text-hec-ink-soft" : "text-xs font-semibold text-muted-foreground mb-1.5"}>🎯 Next time, try</p>
            <ul className="space-y-1">
              {report.focus_points.map((s) => <li key={s} className={ivory ? "text-hec-body text-hec-ink" : "text-sm"}>→ {s}</li>)}
            </ul>
          </div>
        )}

        {report.criteria?.length > 0 && (
          <div className={ivory ? "space-y-1.5 border-t border-hec-line pt-3" : "space-y-1.5 border-t pt-3"}>
            {report.criteria.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3">
                <span className={ivory ? "min-w-0 break-words text-hec-body text-hec-ink" : "text-sm"}>{c.label}</span>
                <Stars score={Number(c.score) || 0} max={Number(c.max) || 4} />
              </div>
            ))}
          </div>
        )}

        {report.parent_note && (
          <div className={ivory ? "border-t border-hec-line pt-3" : "border-t pt-3"}>
            <button
              type="button"
              className={ivory ? "flex min-h-hec-target w-full items-center justify-between text-hec-body font-medium text-hec-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring" : "flex w-full items-center justify-between text-sm font-semibold"}
              aria-expanded={parentOpen}
              onClick={() => setParentOpen((o) => !o)}
            >
              👪 Dành cho phụ huynh
              <ChevronDown className={`h-4 w-4 transition-transform ${parentOpen ? "rotate-180" : ""}`} />
            </button>
            {parentOpen && <p className={ivory ? "mt-2 whitespace-pre-wrap text-hec-body text-hec-ink-soft" : "mt-2 text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed"}>{report.parent_note}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
