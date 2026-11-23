import { Link, useLocation } from "react-router-dom";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";
import { navProgress } from "@/lib/navProgress";
import { navPathActive, sectionOfPath, type NavGroup } from "@/lib/navSections";

/**
 * The shared tab strip of a sidebar section: route links to its member pages, so every page keeps
 * its URL. Rendered by Layout above the page, and only when the page belongs to a section with
 * more than one member the role can see.
 */
export function SectionTabs({ groups }: { groups: NavGroup[] }) {
  const { pathname, search } = useLocation();
  const ivory = useIvory();
  const section = sectionOfPath(groups, pathname, search);
  if (!section || section.members.length < 2) return null;

  return (
    <nav aria-label={section.label} className={cn("-mx-1 mb-4 overflow-x-auto px-1", ivory ? "border-b border-hec-line" : "border-b border-border/60")}>
      <ul className="flex min-w-max gap-1">
        {section.members.map((m) => {
          const active = navPathActive(m.path, pathname, search);
          return (
            <li key={m.path}>
              <Link
                to={m.path}
                aria-current={active ? "page" : undefined}
                onClick={() => { if (!active) navProgress.start(); }}
                className={cn(
                  "inline-flex min-h-[44px] items-center whitespace-nowrap border-b-2 px-4 text-sm transition-colors",
                  ivory
                    ? "text-hec-small focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hec-ring"
                    : "focus-premium",
                  active
                    ? cn("font-medium", ivory ? "border-hec-brass text-hec-ink" : "border-blue-600 text-blue-700 dark:text-blue-300")
                    : cn("border-transparent", ivory ? "text-hec-ink-soft hover:text-hec-ink" : "text-muted-foreground hover:text-foreground"),
                )}
              >
                {m.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
