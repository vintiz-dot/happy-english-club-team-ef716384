/**
 * The student's navigation, per age band (docs/EXPERIENCE_DESIGN_BRIEF.md G1-G5). The routes are the same for
 * every band; what changes is the form:
 *
 *   early   bottom bar: three picture buttons (Home, Homework, Video) and a smaller "Grown-ups"; primary 72 px
 *   young   bottom bar: Home, Homework, Record, Me, and More; 56 px
 *   junior  bottom bar: Home, Homework, Lessons, Record, Me, and More; 44 px
 *   teen    the bar / rail as it always was, text labels
 *
 * Money is behind "Grown-ups" for the three younger bands: the Grown-ups page (?tab=grownups on the student
 * dashboard) holds Tuition, the wallet and every other destination, so nothing that was reachable is lost. Me
 * (?tab=achievements) holds badges, reports and the schedule; those URLs keep working.
 * No emoji in navigation (DESIGN_SYSTEM s.16): the pictures are drawn icons.
 */
import { useNavigate, useLocation } from "react-router-dom";
import { navProgress } from "@/lib/navProgress";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import { Home, BookOpen, CalendarDays, MoreHorizontal, NotebookPen, DollarSign, Trophy, FileText, FolderOpen, Sparkles, FileImage, BookOpenCheck, Scale, Video, Languages, Images, ChevronLeft, ChevronRight, ClipboardList, UserRound, Users } from "lucide-react";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useSetsForStudent } from "@/hooks/useLanguageSupport";
import { useAgeBand } from "@/hooks/useAgeBand";
import { Bi } from "@/components/student/band/Bi";
import type { AgeBand } from "@/lib/ageBand";
import type { StudentCopyKey } from "@/lib/copy/student";

export interface NavItem {
  id: string;
  copy: StudentCopyKey;
  path: string;
  icon: React.ElementType;
}

/** Every destination, in the order the rail lists them. The Grown-ups page lists them too. */
export const studentNavItems: NavItem[] = [
  { id: "dashboard", copy: "nav.home", path: "/student/dashboard", icon: Home },
  { id: "homework", copy: "nav.homework", path: "/student/assignments", icon: BookOpen },
  { id: "lessons", copy: "nav.lessons", path: "/student/lessons", icon: BookOpenCheck },
  { id: "class-reports", copy: "nav.classReports", path: "/student/lesson-reports", icon: ClipboardList },
  { id: "record", copy: "nav.record", path: "/student/record", icon: Video },
  { id: "schedule", copy: "nav.schedule", path: "/student/dashboard?tab=schedule", icon: CalendarDays },
  { id: "reports", copy: "nav.reports", path: "/student/dashboard?tab=reports", icon: FileText },
  { id: "journal", copy: "nav.journal", path: "/student/journal", icon: NotebookPen },
  { id: "tuition", copy: "nav.tuition", path: "/tuition", icon: DollarSign },
  { id: "achievements", copy: "nav.achievements", path: "/student/dashboard?tab=achievements", icon: Trophy },
  { id: "resources", copy: "nav.resources", path: "/student/resources", icon: FolderOpen },
  { id: "vocabulary", copy: "nav.vocabulary", path: "/student/vocabulary", icon: Sparkles },
  { id: "mywork", copy: "nav.myWork", path: "/student/my-work", icon: FileImage },
  { id: "class-gallery", copy: "nav.classGallery", path: "/student/class-gallery", icon: Images },
  { id: "videos", copy: "nav.videos", path: "/student/videos", icon: Video },
  { id: "picture-reader", copy: "nav.pictureReader", path: "/student/language-support", icon: Languages },
  { id: "defend", copy: "nav.defend", path: "/student/defend-level", icon: Scale },
];

// Two entries that exist only for the younger bands.
const ME: NavItem = { id: "me", copy: "nav.me", path: "/student/dashboard?tab=achievements", icon: UserRound };
const GROWNUPS: NavItem = { id: "grownups", copy: "nav.grownups", path: "/student/dashboard?tab=grownups", icon: Users };

// The destinations that live under "Me" for the younger bands (their URLs keep working).
const UNDER_ME = new Set(["achievements", "reports", "schedule"]);

/** The bottom bar of each band, in order. "more" is the More button. */
const BAR: Record<AgeBand, string[]> = {
  early: ["dashboard", "homework", "record", "grownups"],
  young: ["dashboard", "homework", "record", "me", "more"],
  junior: ["dashboard", "homework", "lessons", "record", "me", "more"],
  teen: ["dashboard", "homework", "lessons", "record", "more"],
};

/** Smallest tap target of the bar's main buttons (brief G1): 72 px early, then the band's own. */
const BUTTON_HEIGHT: Record<AgeBand, string> = {
  early: "min-h-[4.5rem]",
  young: "min-h-hec-target",
  junior: "min-h-hec-target",
  teen: "min-h-hec-target",
};

export function StudentNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { band } = useAgeBand();
  const [moreOpen, setMoreOpen] = useState(false);

  // Desktop rail scroll affordances (see the desktop return for why).
  const railRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = railRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollByAmount = (delta: number) =>
    railRef.current?.scrollBy({ left: delta, behavior: "smooth" });

  useEffect(() => {
    updateScrollState();
    const el = railRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile]);

  // Keep the current section visible — otherwise navigating to a late entry
  // (e.g. "Defend My Level") leaves it clipped off the right edge.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    const t = setTimeout(updateScrollState, 350);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  const isActive = (path: string, id: string) => {
    const searchParams = new URLSearchParams(location.search);
    const currentTab = searchParams.get("tab");
    const isOnDashboard = location.pathname === "/student/dashboard" || location.pathname === "/student" || location.pathname === "/student/";

    if (id === "achievements") return isOnDashboard && currentTab === "achievements";
    if (id === "schedule") return isOnDashboard && currentTab === "schedule";
    if (id === "reports") return isOnDashboard && currentTab === "reports";
    if (id === "grownups") return isOnDashboard && currentTab === "grownups";
    if (id === "me") return isOnDashboard && !!currentTab && UNDER_ME.has(currentTab);
    if (id === "dashboard") return isOnDashboard && !currentTab;
    return location.pathname.startsWith(path);
  };

  // Picture Reader appears only once a teacher has switched a set on for one of the child's classes.
  const { studentId } = useStudentProfile();
  const { data: pictureSets = [] } = useSetsForStudent(studentId);
  const visible = studentNavItems.filter((i) => i.id !== "picture-reader" || pictureSets.length > 0);

  const youngerBand = band !== "teen";
  const all: NavItem[] = youngerBand ? [...visible.filter((i) => i.id !== "tuition"), ME, GROWNUPS] : visible;
  const byId = new Map(all.map((i) => [i.id, i]));
  const barIds = BAR[band];
  const bar = barIds.filter((id) => id !== "more").map((id) => byId.get(id)).filter(Boolean) as NavItem[];
  const hasMore = barIds.includes("more");
  // What More holds: everything not on the bar. For the younger bands, what lives under Me and the money stay out of it
  // (money is behind Grown-ups); Grown-ups itself is in More, and on the Grown-ups page every destination is listed.
  const moreItems = all.filter((i) => {
    if (barIds.includes(i.id)) return false;
    if (youngerBand && (UNDER_ME.has(i.id) || i.id === "me")) return false;
    return true;
  });
  const isMoreActive = moreItems.some((i) => isActive(i.path, i.id));

  const go = (item: NavItem) => {
    if (item.path !== location.pathname + location.search) navProgress.start();
    navigate(item.path);
  };

  // "Ivory" design system (DESIGN_SYSTEM s.15). The bar renders only for a
  // student, and every student route is in the system since the student flip
  // (R08), so the old look is gone.
  const IVORY_FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

  // Mobile: bottom tab bar
  if (isMobile) {
    const early = band === "early";
    return (
      <>
        {/* More menu: scrim + a solid raised sheet above the bar */}
        {moreOpen && (
          <div
            data-hec-theme="ivory"
            className="fixed inset-0 z-[44] bg-hec-scrim/60 md:hidden"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className={cn(
                "absolute left-4 right-4 max-h-[70dvh] overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised p-2 shadow-hec-3",
                early ? "bottom-28" : "bottom-20",
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {moreItems.map((item) => {
                const active = isActive(item.path, item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      go(item);
                      setMoreOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-hec-target w-full items-center gap-3 rounded-hec-sm px-3 py-1 text-left text-hec-body transition-colors duration-hec-1 ease-hec",
                      active ? "bg-hec-sunken font-medium text-hec-ink" : "text-hec-ink hover:bg-hec-sunken",
                      IVORY_FOCUS,
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                    <Bi k={item.copy} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom tab bar: solid surface, hairline top, the active item marked by a brass line */}
        <nav
          data-hec-theme="ivory"
          aria-label="Student"
          className="fixed inset-x-0 bottom-0 z-[45] border-t border-hec-line bg-hec-surface pb-[env(safe-area-inset-bottom)] shadow-hec-2 md:hidden"
        >
          <div className="flex items-stretch">
            {bar.map((item) => {
              const active = isActive(item.path, item.id);
              const Icon = item.icon;
              // "Grown-ups" is the early band's fourth, smaller button.
              const small = early && item.id === "grownups";
              return (
                <button
                  key={item.id}
                  onClick={() => go(item)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 pb-2 pt-3 text-hec-caption text-hec-ink-soft transition-colors duration-hec-1 ease-hec",
                    small ? "min-h-hec-target flex-[0.8]" : cn(BUTTON_HEIGHT[band], "flex-1"),
                    "aria-[current=page]:font-medium aria-[current=page]:text-hec-ink",
                    IVORY_FOCUS,
                  )}
                >
                  {active && <span aria-hidden className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-hec-brass" />}
                  <Icon className={early && !small ? "h-8 w-8" : "h-5 w-5"} aria-hidden />
                  <span className="text-center leading-tight"><Bi k={item.copy} viClassName="text-hec-caption" /></span>
                </button>
              );
            })}
            {hasMore && (
              <button
                onClick={() => setMoreOpen(!moreOpen)}
                aria-expanded={moreOpen}
                aria-current={isMoreActive ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-2 pt-3 text-hec-caption transition-colors duration-hec-1 ease-hec",
                  BUTTON_HEIGHT[band],
                  isMoreActive || moreOpen ? "font-medium text-hec-ink" : "text-hec-ink-soft",
                  IVORY_FOCUS,
                )}
              >
                {isMoreActive && <span aria-hidden className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-hec-brass" />}
                <MoreHorizontal className="h-5 w-5" aria-hidden />
                <span className="text-center leading-tight"><Bi k="nav.more" viClassName="text-hec-caption" /></span>
              </button>
            )}
          </div>
        </nav>
      </>
    );
  }

  // Desktop: horizontal rail.
  //
  // The rail scrolls (12 destinations won't fit narrow viewports), which used
  // to CROP the last item silently: the scrollbar is hidden, there was no end
  // padding, and nothing hinted that more existed off-screen. Now: end
  // padding so the final pill can always fully clear the edge, gradient fade
  // masks + arrow buttons that appear only when there is actually more to
  // see, and the active pill scrolls itself into view on navigation.
  // Ivory: a quiet rail on the paper, labels only (no emoji in navigation),
  // the current section marked by a 2 px brass line, 44 px targets.
  // The rail lists every destination (money behind Grown-ups for the younger bands, as on the phone).
  const rail = youngerBand ? all.filter((i) => i.id !== "me") : all;
  return (
    <nav
      data-hec-theme="ivory"
      aria-label="Student"
      className="sticky top-[57px] z-40 border-b border-hec-line bg-hec-paper md:top-[65px]"
    >
      <div className="container relative mx-auto px-4">
        {canScrollLeft && (
          <div className="pointer-events-none absolute bottom-0 left-4 top-0 z-20 flex items-center">
            <div className="absolute inset-y-0 -left-1 w-16 bg-gradient-to-r from-hec-paper via-hec-paper/90 to-transparent" />
            <button
              onClick={() => scrollByAmount(-220)}
              className={cn(
                "pointer-events-auto relative flex min-h-hec-target min-w-hec-target items-center justify-center rounded-full border border-hec-line bg-hec-surface text-hec-ink-soft shadow-hec-1 hover:text-hec-ink",
                IVORY_FOCUS,
              )}
              aria-label="Scroll navigation left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
        )}

        <div
          ref={railRef}
          onScroll={updateScrollState}
          className="flex items-stretch gap-1 overflow-x-auto scroll-smooth pr-12 scrollbar-hide"
        >
          {rail.map((item) => {
            const active = isActive(item.path, item.id);
            return (
              <button
                key={item.id}
                ref={active ? activeRef : undefined}
                onClick={() => go(item)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-hec-target shrink-0 items-center whitespace-nowrap px-3 text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink",
                  "aria-[current=page]:font-medium aria-[current=page]:text-hec-ink",
                  IVORY_FOCUS,
                )}
              >
                <Bi k={item.copy} viClassName="hidden" />
                {active && <span aria-hidden className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-hec-brass" />}
              </button>
            );
          })}
        </div>

        {canScrollRight && (
          <div className="pointer-events-none absolute bottom-0 right-4 top-0 z-20 flex items-center justify-end">
            <div className="absolute inset-y-0 -right-1 w-16 bg-gradient-to-l from-hec-paper via-hec-paper/90 to-transparent" />
            <button
              onClick={() => scrollByAmount(220)}
              className={cn(
                "pointer-events-auto relative flex min-h-hec-target min-w-hec-target items-center justify-center rounded-full border border-hec-line bg-hec-surface text-hec-ink-soft shadow-hec-1 hover:text-hec-ink",
                IVORY_FOCUS,
              )}
              aria-label="Scroll navigation right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
