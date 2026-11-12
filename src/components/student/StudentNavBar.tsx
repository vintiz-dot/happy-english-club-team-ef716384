import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import { Home, BookOpen, CalendarDays, MoreHorizontal, NotebookPen, DollarSign, Trophy, Zap, FileText, FolderOpen, Sparkles, FileImage, BookOpenCheck, Scale, Video, Languages, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useSetsForStudent } from "@/hooks/useLanguageSupport";

const allNavItems = [
  // "Home" everywhere: one short word fits five tabs across at 375 (DESIGN_SYSTEM s.15).
  { id: "dashboard", label: "Home", emoji: "🏠", path: "/student/dashboard", icon: Home, primary: true },
  { id: "homework", label: "Homework", emoji: "📝", path: "/student/assignments", icon: BookOpen, primary: true },
  { id: "lessons", label: "Lessons", emoji: "📚", path: "/student/lessons", icon: BookOpenCheck, primary: true },
  { id: "record", label: "Record", emoji: "🎬", path: "/student/record", icon: Video, primary: true },
  { id: "schedule", label: "My Classes", emoji: "📅", path: "/student/dashboard?tab=schedule", icon: CalendarDays, primary: false },
  { id: "reports", label: "Reports", emoji: "📄", path: "/student/dashboard?tab=reports", icon: FileText, primary: false },
  { id: "journal", label: "Journal", emoji: "📖", path: "/student/journal", icon: NotebookPen, primary: false },
  { id: "tuition", label: "Tuition", emoji: "💰", path: "/tuition", icon: DollarSign, primary: false },
  { id: "achievements", label: "Achievements", emoji: "🏆", path: "/student/dashboard?tab=achievements", icon: Trophy, primary: false },
  { id: "resources", label: "Resources", emoji: "📚", path: "/student/resources", icon: FolderOpen, primary: false },
  { id: "vocabulary", label: "Vocabulary", emoji: "✨", path: "/student/vocabulary", icon: Sparkles, primary: false },
  { id: "mywork", label: "My Work", emoji: "🖼️", path: "/student/my-work", icon: FileImage, primary: false },
  { id: "videos", label: "My Videos", emoji: "🎥", path: "/student/videos", icon: Video, primary: false },
  { id: "picture-reader", label: "Picture Reader", emoji: "🖼️", path: "/student/language-support", icon: Languages, primary: false },
  { id: "defend", label: "Defend My Level", emoji: "🛡️", path: "/student/defend-level", icon: Scale, primary: false },
];

export function StudentNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
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
    if (id === "dashboard") return isOnDashboard && !currentTab;
    return location.pathname.startsWith(path);
  };

  // Picture Reader appears only once a teacher has switched a set on for one of the child's classes.
  const { studentId } = useStudentProfile();
  const { data: pictureSets = [] } = useSetsForStudent(studentId);
  const navItems = allNavItems.filter((i) => i.id !== "picture-reader" || pictureSets.length > 0);
  const primaryItems = navItems.filter(i => i.primary);
  const moreItems = navItems.filter(i => !i.primary);
  const isMoreActive = moreItems.some(i => isActive(i.path, i.id));

  // "Ivory" design system (DESIGN_SYSTEM s.15). The bar renders only for a
  // student, and every student route is in the system since the student flip
  // (R08), so the old look is gone.
  const IVORY_FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

  // Mobile: bottom tab bar
  if (isMobile) {
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
              className="absolute bottom-20 left-4 right-4 max-h-[70dvh] overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised p-2 shadow-hec-3"
              onClick={(e) => e.stopPropagation()}
            >
              {moreItems.map((item) => {
                const active = isActive(item.path, item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      navigate(item.path);
                      setMoreOpen(false);
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-hec-target w-full items-center gap-3 rounded-hec-sm px-3 text-left text-hec-body transition-colors duration-hec-1 ease-hec",
                      active ? "bg-hec-sunken font-medium text-hec-ink" : "text-hec-ink hover:bg-hec-sunken",
                      IVORY_FOCUS,
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0 text-hec-ink-soft" aria-hidden />
                    {item.label}
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
            {primaryItems.map((item) => {
              const active = isActive(item.path, item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-hec-target min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-2 pt-3 text-hec-caption text-hec-ink-soft transition-colors duration-hec-1 ease-hec",
                    "aria-[current=page]:font-medium aria-[current=page]:text-hec-ink",
                    IVORY_FOCUS,
                  )}
                >
                  {active && <span aria-hidden className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-hec-brass" />}
                  <Icon className="h-5 w-5" aria-hidden />
                  {/* One short word per tab (DESIGN_SYSTEM section 15): "Dashboard" does not fit five across at 375. */}
                  <span className="whitespace-nowrap">{item.label}</span>
                </button>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              aria-expanded={moreOpen}
              aria-current={isMoreActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-hec-target min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 pb-2 pt-3 text-hec-caption transition-colors duration-hec-1 ease-hec",
                isMoreActive || moreOpen ? "font-medium text-hec-ink" : "text-hec-ink-soft",
                IVORY_FOCUS,
              )}
            >
              {isMoreActive && <span aria-hidden className="absolute left-1/2 top-0 h-0.5 w-6 -translate-x-1/2 rounded-full bg-hec-brass" />}
              <MoreHorizontal className="h-5 w-5" aria-hidden />
              <span>More</span>
            </button>
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
          {navItems.map((item) => {
            const active = isActive(item.path, item.id);
            return (
              <button
                key={item.id}
                ref={active ? activeRef : undefined}
                onClick={() => navigate(item.path)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-hec-target shrink-0 items-center whitespace-nowrap px-3 text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink",
                  "aria-[current=page]:font-medium aria-[current=page]:text-hec-ink",
                  IVORY_FOCUS,
                )}
              >
                {item.label}
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
