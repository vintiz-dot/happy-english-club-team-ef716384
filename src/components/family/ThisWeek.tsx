/**
 * "This week" on a child's card: up to three plain facts, each ONLY if the page can read it truthfully from data it
 * already holds (docs/EXPERIENCE_DESIGN_BRIEF.md H1). Never estimated; a fact that cannot be read is left out, and
 * with none to show nothing is drawn.
 *
 * What the parent's home can state today:
 *   - a lesson note added this week (the newest lesson_overview carries its date)
 * What it cannot, and so leaves out:
 *   - lessons attended out of held this week: its attendance read returns a status per class over 30 days and no date
 *   - homework handed in out of set: the page reads no homework
 *   - the teacher's latest approved note with the teacher's name: lesson_overviews carry no teacher and teacher_notes
 *     are not read here
 */
import { FamilyBi } from "@/components/family/FamilyBi";
import { dayjs } from "@/lib/date";

export function ThisWeek({ latestLessonDate, formatDay }: { latestLessonDate: string | null; formatDay: (d: string) => string }) {
  const facts: { id: string; node: React.ReactNode }[] = [];
  if (latestLessonDate && dayjs(latestLessonDate).isSame(dayjs(), "isoWeek")) {
    facts.push({ id: "note", node: <FamilyBi k="week.lessonNote" vars={{ date: formatDay(latestLessonDate) }} vi={false} /> });
  }
  if (facts.length === 0) return null;
  return (
    <div className="rounded-hec-md border border-hec-line bg-hec-surface p-4">
      <h3 className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
        <FamilyBi k="week.title" vi={false} />
      </h3>
      <ul className="mt-2 space-y-1 text-hec-small text-hec-ink">
        {facts.slice(0, 3).map((f) => (
          <li key={f.id}>{f.node}</li>
        ))}
      </ul>
    </div>
  );
}
