/**
 * "Does anything need you?" - one card at the top of the parent's home (docs/EXPERIENCE_DESIGN_BRIEF.md H1, I6).
 *
 * It says only what the page ALREADY knows. Nothing here calls calculate-tuition (it saves the bill on every call),
 * so the card never states an amount or a status for tuition: it says "Everything is in order." unless the page
 * was given something else that needs the parent (`needs`; today no read on these pages produces one), and a plain
 * link "This month's tuition" sits below it. When something does need them it is one sentence and one button: no
 * red, no countdown, no exclamation mark. No persuasion of any kind near money (I4).
 *
 * "Everything is in order." gets a small ink tick that draws once, and Pip's badge at 40 px beside it: Pip appears
 * once at most, and only here. Motion is design system section 9 only: no pointer effects, no loops, no Tide.
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { InkCheck } from "@/components/fx/InkCheck";
import { FamilyBi } from "@/components/family/FamilyBi";
import { cn } from "@/lib/utils";

export interface Need {
  id: string;
  /** one sentence, in both languages */
  en: string;
  vi: string;
  /** the one button */
  action?: { label: string; to: string };
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export function NeedsYouCard({ needs = [], className }: { needs?: Need[]; className?: string }) {
  return (
    <Card className={cn(className)}>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <h2 className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          <FamilyBi k="needs.title" viClassName="normal-case tracking-normal" />
        </h2>

        {needs.length === 0 ? (
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hec-leaf-tint text-hec-leaf">
              <InkCheck size={22} />
            </span>
            <p className="min-w-0 flex-1 font-display text-hec-h2 font-medium text-hec-ink">
              <FamilyBi k="needs.ok" />
            </p>
            {/* Pip: once at most, the 40 px badge, beside the one sentence that is good news */}
            <img src="/mascot/pip-badge.svg" width={40} height={40} alt="" draggable={false} className="shrink-0" />
          </div>
        ) : (
          <ul className="space-y-3">
            {needs.map((n) => (
              <li key={n.id} className="space-y-2">
                <p className="text-hec-body text-hec-ink">
                  {n.en}
                  <span lang="vi" className="block text-hec-small text-hec-ink-soft">{n.vi}</span>
                </p>
                {n.action && (
                  <Link to={n.action.to} className={cn("inline-flex min-h-hec-target items-center rounded-hec-md bg-hec-action px-5 text-hec-body font-medium text-hec-on-action", FOCUS)}>
                    {n.action.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* No amount and no status: the figure is not read on this page, so it is not guessed. A plain link. */}
        <Link
          to="/tuition"
          className={cn("flex min-h-hec-target items-center justify-between gap-3 rounded-hec-md border-t border-hec-line pt-3 text-hec-body text-hec-ink hover:text-hec-ink", FOCUS)}
        >
          <FamilyBi k="needs.tuition" viClassName="text-hec-caption" />
          <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint" aria-hidden />
        </Link>
      </CardContent>
    </Card>
  );
}
