/**
 * "For grown-ups" (?tab=grownups): where the money and the rest of the app live for the three younger bands
 * (docs/EXPERIENCE_DESIGN_BRIEF.md E9, G1; owner default L6 = yes). Nothing here is new: it LINKS to Tuition and
 * every other destination. (The class wallet is part of the child's own game and lives on the home.)
 * It is an adult page: no Pip, no banding of its content.
 */
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Bi } from "@/components/student/band/Bi";
import { studentNavItems } from "@/components/student/StudentNavBar";
import { useSetsForStudent } from "@/hooks/useLanguageSupport";
import { CARD, CARD_TITLE, FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";

export function GrownUps({ studentId }: { studentId: string }) {
  const { data: pictureSets = [] } = useSetsForStudent(studentId);
  const links = studentNavItems.filter((i) => i.id !== "dashboard" && (i.id !== "picture-reader" || pictureSets.length > 0));
  const tuition = links.find((i) => i.id === "tuition");
  const rest = links.filter((i) => i.id !== "tuition");
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className={CARD_TITLE}>
          <Bi k="grownups.title" />
        </h2>
        <p className="text-hec-small text-hec-ink-soft">
          <Bi k="grownups.help" />
        </p>
      </header>

      {tuition && (
        <Link to={tuition.path} className={cn(CARD, "flex min-h-hec-target items-center justify-between gap-3 text-hec-h3 font-semibold text-hec-ink", FOCUS)}>
          <span className="flex items-center gap-3">
            <tuition.icon className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
            <Bi k={tuition.copy} />
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint" aria-hidden />
        </Link>
      )}

      <section aria-labelledby="grownups-rest" className="space-y-3">
        <h3 id="grownups-rest" className="font-display text-hec-h3 font-medium text-hec-ink">
          <Bi k="grownups.everything" />
        </h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rest.map((item) => (
            <li key={item.id}>
              <Link to={item.path} className={cn("flex min-h-hec-target items-center justify-between gap-3 rounded-hec-md border border-hec-line bg-hec-surface px-4 text-hec-body text-hec-ink hover:bg-hec-sunken", FOCUS)}>
                <span className="flex items-center gap-3">
                  <item.icon className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                  <Bi k={item.copy} />
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
