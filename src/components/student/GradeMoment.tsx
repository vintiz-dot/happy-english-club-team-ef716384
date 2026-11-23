/**
 * The moment a teacher's grade reaches a child (docs/EXPERIENCE_DESIGN_BRIEF.md G2 to G5, Phase 7 round 1).
 * ONE moment per visit: the newest grade the teacher marked (the caller asks momentGate first). It shows only the
 * teacher's own grade and, when the data the page already holds has it, the teacher's words, unedited. Nothing
 * here is computed or invented. The form by band is RewardMoment's.
 */
import { RewardMoment } from "@/components/student/RewardMoment";
import { Bi } from "@/components/student/band/Bi";
import { useCopy } from "@/lib/copy/useCopy";

export interface GradeMomentProps {
  grade: string;
  title: string;
  className: string;
  /** the teacher's own words from the submission the page already holds, shown unedited */
  feedback?: string | null;
  /** how many other grades were marked and wait behind this one */
  more: number;
  onClose: () => void;
}

export function GradeMoment({ grade, title, className, feedback, more, onClose }: GradeMomentProps) {
  const { en } = useCopy();
  const line = en("grade.line", { grade });
  return (
    <RewardMoment label={`${en("grade.marked")} ${line}`} onClose={onClose}>
      <p className="text-hec-small text-hec-ink-soft"><Bi k="grade.marked" /></p>
      <p className="mt-2 break-words font-display text-hec-h1 font-medium text-hec-ink">{line}</p>
      <p className="mt-1 whitespace-normal break-words text-hec-small text-hec-ink-soft">
        “{title}” · {className}
      </p>

      {feedback ? (
        <div className="mt-4 rounded-hec-md border border-hec-line bg-hec-paper p-3 text-left">
          <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft"><Bi k="grade.wrote" /></p>
          <p className="mt-1 whitespace-pre-wrap break-words text-hec-body text-hec-ink">{feedback}</p>
        </div>
      ) : null}

      {more > 0 && (
        <p className="mt-4 text-hec-small text-hec-ink-soft">
          {more === 1 ? <Bi k="grade.moreOne" /> : <Bi k="grade.moreMany" vars={{ n: more }} />}
        </p>
      )}
    </RewardMoment>
  );
}
