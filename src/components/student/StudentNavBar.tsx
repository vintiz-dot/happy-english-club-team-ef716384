import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BookOpen, CalendarDays, MoreHorizontal, NotebookPen, DollarSign, Trophy, Zap, FileText, FolderOpen, Sparkles, FileImage, BookOpenCheck, Scale, Video, Languages, ChevronLeft, ChevronRight } from "lucide-react";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useSetsForStudent } from "@/hooks/useLanguageSupport";

const allNavItems = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠", path: "/student/dashboard", icon: Home, primary: true },
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

  // "Ivory" design system (A4.2): only the student dashboard carries it at the
  // checkpoint, so the bar takes the new look on that route and keeps its old
  // look on every other student screen.
  const ivory =
    location.pathname === "/student/dashboard" || location.pathname === "/student" || location.pathname === "/student/";
  const IVORY_FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";

  // Mobile: bottom tab bar
  if (isMobile && ivory) {
    return (
      <>
        {/* More menu: scrim + a solid raised sheet above the bar */}
        {moreOpen && (
          <div
            data-hec-theme="ivory"
            className="fixed inset-0 z-[99] bg-hec-scrim/60 md:hidden"
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
          className="fixed inset-x-0 bottom-0 z-[100] border-t border-hec-line bg-hec-surface pb-[env(safe-area-inset-bottom)] shadow-hec-2 md:hidden"
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
                  <span className="whitespace-nowrap">{item.id === "dashboard" ? "Home" : item.label}</span>
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

  if (isMobile) {
    return (
      <>

        {/* More menu overlay */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              className="fixed inset-0 z-[99] bg-background/60 backdrop-blur-sm md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            >
              <motion.div
                className="absolute bottom-16 left-2 right-2 glass-lg rounded-2xl p-2 shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {moreItems.map((item) => {
                  const active = isActive(item.path, item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.path);
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-lg">{item.emoji}</span>
                      {item.label}
                    </button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-background/85 backdrop-blur-xl border-t border-border/50 shadow-[0_-8px_32px_-8px_rgba(120,80,200,0.18)] md:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="relative flex items-center justify-around py-1.5 px-1">
            {primaryItems.map((item) => {
              const active = isActive(item.path, item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "relative flex flex-col items-center gap-0.5 px-3 pt-2 pb-1.5 rounded-2xl transition-all min-w-[64px] tap-44"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="bottomTabIndicator"
                      className="absolute inset-x-3 inset-y-0.5 rounded-2xl bg-aurora opacity-15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative h-5 w-5 transition-colors",
                      active ? "text-blue-600 dark:text-blue-300" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "relative text-[10px] font-semibold transition-colors",
                      active ? "text-blue-700 dark:text-blue-200" : "text-muted-foreground"
                    )}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "relative flex flex-col items-center gap-0.5 px-3 pt-2 pb-1.5 rounded-2xl transition-all min-w-[64px] tap-44",
                (isMoreActive || moreOpen)
                  ? "text-blue-600 dark:text-blue-300"
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-semibold">More</span>
            </button>
          </div>
        </nav>
      </>
    );
  }

  // Desktop: horizontal rail — aurora pill glides between sections.
  //
  // The rail scrolls (12 destinations won't fit narrow viewports), which used
  // to CROP the last item silently: the scrollbar is hidden, there was no end
  // padding, and nothing hinted that more existed off-screen. Now: end
  // padding so the final pill can always fully clear the edge, gradient fade
  // masks + arrow buttons that appear only when there is actually more to
  // see, and the active pill scrolls itself into view on navigation.
  if (ivory) {
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

  return (
    <nav className="sticky top-[57px] md:top-[65px] z-40 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 shadow-sm relative">
      <div className="container mx-auto px-4 relative">
        {/* Left fade + arrow */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute left-4 top-0 bottom-0 z-20 flex items-center pointer-events-none"
            >
              <div className="absolute inset-y-0 -left-1 w-16 bg-gradient-to-r from-card via-card/85 to-transparent" />
              <button
                onClick={() => scrollByAmount(-220)}
                className="relative pointer-events-auto h-7 w-7 rounded-full glass-sm flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                aria-label="Scroll navigation left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          ref={railRef}
          onScroll={updateScrollState}
          className="flex items-center gap-0.5 py-1.5 overflow-x-auto scrollbar-hide scroll-smooth pr-10"
        >
          {navItems.map((item) => {
            const active = isActive(item.path, item.id);
            return (
              <button
                key={item.id}
                ref={active ? activeRef : undefined}
                onClick={() => navigate(item.path)}
                className={cn(
                  "relative shrink-0 px-2.5 md:px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-colors duration-200",
                  active ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="student-nav-pill"
                    className="absolute inset-0 rounded-full bg-aurora shadow-[0_4px_16px_-4px_rgba(59,130,246,0.55)]"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative z-10">{item.emoji} {item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right fade + arrow */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute right-4 top-0 bottom-0 z-20 flex items-center justify-end pointer-events-none"
            >
              <div className="absolute inset-y-0 -right-1 w-16 bg-gradient-to-l from-card via-card/85 to-transparent" />
              <button
                onClick={() => scrollByAmount(220)}
                className="relative pointer-events-auto h-7 w-7 rounded-full glass-sm flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
                aria-label="Scroll navigation right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
    </nav>
  );
}
