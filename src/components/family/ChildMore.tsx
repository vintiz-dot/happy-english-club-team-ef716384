/**
 * "More about {name}" - the expandable part of a child's card (docs/EXPERIENCE_DESIGN_BRIEF.md H3). There is no
 * parent-facing page for one child, so no route is added: what H3 lists goes here, as far as the data the page
 * already reads allows.
 *
 *   What we worked on   the lesson overviews already on the card (earlier lessons), in full: nothing is cut off
 *   Progress            the level a teacher approved (cefr_assessments holds only approved points)
 *
 * Not here, because the page reads no such data and no query is added: the teacher's approved notes with name and
 * date (teacher_notes), approved work and shared videos, and the class figures of get_class_skill_summary. Approved
 * content only; no other child is named.
 */
import { useId, useState } from "react";
import { ChevronDown, NotebookPen } from "lucide-react";
import { FamilyBi } from "@/components/family/FamilyBi";
import { familyCopy } from "@/lib/copy/family";
import { fill } from "@/lib/copy/student";
import { cn } from "@/lib/utils";

export interface EarlierLesson {
  key: string;
  title: string;
  day: string;
  summary: string | null;
  homework: string | null;
}

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

export function ChildMore({ name, level, earlier }: { name: string; level: string | null; earlier: EarlierLesson[] }) {
  const [open, setOpen] = useState(false);
  const panel = useId();
  if (!level && earlier.length === 0) return null;
  return (
    <div className="rounded-hec-md border border-hec-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((v) => !v)}
        className={cn("flex min-h-hec-target w-full items-center justify-between gap-3 rounded-hec-md px-4 py-3 text-left text-hec-small font-semibold text-hec-ink", FOCUS)}
      >
        <span className="min-w-0 whitespace-normal break-words">
          {open ? <FamilyBi k="child.less" /> : <FamilyBi k="child.more" vars={{ name }} />}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-hec-ink-faint transition-transform duration-hec-1 ease-hec", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={panel} className="space-y-4 border-t border-hec-line px-4 py-4">
          {level && (
            <section className="space-y-1">
              <h3 className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                <FamilyBi k="child.progress" viClassName="normal-case tracking-normal" />
              </h3>
              <p className="text-hec-small text-hec-ink">
                {fill(familyCopy["child.level"].en, { level })}
                <span lang="vi" className="block text-hec-caption text-hec-ink-soft">{fill(familyCopy["child.level"].vi, { level })}</span>
              </p>
            </section>
          )}
          {earlier.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
                <FamilyBi k="child.worked" viClassName="normal-case tracking-normal" />
              </h3>
              {earlier.map((l) => (
                <div key={l.key} className="rounded-hec-md border border-hec-line px-4 py-3">
                  <p className="text-hec-small font-semibold text-hec-ink">
                    {l.title} <span className="whitespace-nowrap font-normal tabular-nums text-hec-ink-soft">· {l.day}</span>
                  </p>
                  {l.summary && <p className="mt-1 whitespace-pre-line text-hec-small text-hec-ink-soft">{l.summary}</p>}
                  {l.homework && (
                    <p className="mt-2 flex items-start gap-2 text-hec-small text-hec-ink">
                      <NotebookPen className="mt-0.5 h-4 w-4 shrink-0 text-hec-ink-soft" aria-hidden />
                      <span className="min-w-0 whitespace-pre-line"><span className="font-semibold">Homework:</span> {l.homework}</span>
                    </p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
