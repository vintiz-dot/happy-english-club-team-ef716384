import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { ChangePassword } from "@/components/auth/ChangePassword";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIdentity, initialsOf } from "@/hooks/useIdentity";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, RichTooltipContent } from "@/components/ui/tooltip";
import { StudentNavBar } from "@/components/student/StudentNavBar";
import { AdminTopBar } from "@/components/AdminTopBar";
import { ClassroomToolsLauncher } from "@/components/classroom-tools/ClassroomToolsLauncher";
import { PWAInstallButton } from "./PWAInstallButton";
import { CommandPalette } from "@/components/CommandPalette";
import { AssistantLauncher } from "@/components/chat/AssistantLauncher";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { AiActionBanner } from "@/components/admin/AiActionBanner";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useIvory } from "@/hooks/useIvory";
import { UserMenu } from "@/components/theme/UserMenu";
import { guardedSignOut } from "@/components/recorder/signOutGuard";
import { useMyPilotClasses } from "@/hooks/useLessonMonitor";
import { navProgress } from "@/lib/navProgress";
import { dur, ease, snappy, useMotionLevel, useSyncMotionLevel } from "@/components/fx/motion";
import { carriedRecently } from "@/components/fx/Carry";
import { AgeBandProvider } from "@/hooks/useAgeBand";
import { navGroupsFor, sectionIsActive, groupOfPath, type NavSection } from "@/lib/navSections";
import { navIcon } from "@/components/navIcons";
import { SectionTabs } from "@/components/SectionTabs";
import { CheckBadge } from "@/components/admin/CheckBadge";
import { useCheckProblems } from "@/hooks/useCheckProblems";
import { checkLines } from "@/lib/checkProblems";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideNavigation?: boolean;
}

const SIDEBAR_KEY = "sidebar-collapsed";
const GROUPS_KEY = "sidebar-groups-closed";

// Which admin headings the person folded shut (headings are open unless listed here).
const readClosedGroups = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(GROUPS_KEY) || "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
};

// Every page renders its own <Layout>, so the sidebar is built again on each navigation.
// The shared active marker starts where it was on the previous page and glides to the
// current item, which is what makes it one element moving instead of two appearing.
let lastMarker: { pathname: string; search: string } | null = null;

const Layout = ({ children, title, hideNavigation = false }: LayoutProps) => {
  const { user, role, signOut: rawSignOut } = useAuth();
  // Motion level (Full / Calm / Off): load this person's own choice onto <html data-hec-motion>.
  useSyncMotionLevel(user?.id);
  // Lesson monitor pilot (D-28): the menu entry only for a teacher of a pilot class.
  const pilotClasses = useMyPilotClasses(role === "teacher");
  // Money checks that need a person: a red count on Reports in the menu (the cards are Reports > Checks).
  const checks = useCheckProblems(role === "admin");
  // The class recorder may refuse (a lesson is being recorded) or tidy its local audio first.
  const signOut = () => guardedSignOut(rawSignOut);
  const navigate = useNavigate();
  const location = useLocation();
  const { data: identity } = useIdentity();
  const userName = identity?.name ?? "";
  const avatarUrl = identity?.avatarUrl ?? null;
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved !== "true"; // collapsed = true means sidebar is closed
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<string[]>(readClosedGroups);
  const toggleGroup = (id: string) =>
    setClosedGroups((c) => {
      const next = c.includes(id) ? c.filter((x) => x !== id) : [...c, id];
      try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)); } catch { /* storage unavailable: the fold lasts this visit */ }
      return next;
    });
  const ivory = useIvory();
  const motionLevel = useMotionLevel();
  // Where the shared active marker sits: the previous page's item first, then this page's (see lastMarker).
  const [marker, setMarker] = useState(() => lastMarker ?? { pathname: location.pathname, search: location.search });
  useEffect(() => {
    const here = { pathname: location.pathname, search: location.search };
    lastMarker = here;
    setMarker((m) => (m.pathname === here.pathname && m.search === here.search ? m : here));
  }, [location.pathname, location.search]);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, (!sidebarOpen).toString());
  }, [sidebarOpen]);


  if (!user) {
    return <>{children}</>;
  }

  if (hideNavigation) {
    return (
      <div className="min-h-screen bg-background w-full flex flex-col">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    );
  }

  const navGroups = navGroupsFor(role, { pilot: (pilotClasses.data ?? []).length > 0 });
  // One sidebar entry per section; it opens the section's first page and is current on any member page.
  const entryOf = (section: NavSection) => ({
    key: section.id,
    label: section.label,
    path: section.members[0].path,
    icon: navIcon(section.icon),
    section,
    // Only the Reports entry carries the checks' count.
    badge: section.id === "/admin?tab=reports" ? checks.total : 0,
  });
  const badgeLines = checkLines(checks.counts);
  type NavEntry = ReturnType<typeof entryOf>;
  const activeGroupId = groupOfPath(navGroups, location.pathname, location.search)?.id;
  const showSidebar = role === "admin" || role === "teacher";

  // Student/Family layout (Ivory design system). Solid paper, no glow; the
  // controls are 44 px and labelled; a child's name in the switcher wraps,
  // never cut. The old student/family header was deleted with R24.
  if (!showSidebar) {
    return (
      <MotionConfig reducedMotion="user">
        {/* The age band of the selected child (brief F2): data-hec-band / data-hec-scale on a wrapper, on the child's own pages only. */}
        <AgeBandProvider>
        <div className="min-h-screen bg-hec-paper text-hec-ink">
          <header className="sticky top-0 z-50 border-b border-hec-line bg-hec-paper">
            <div className="container mx-auto flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 sm:py-3">
              <div className="flex min-w-0 shrink-0 items-center gap-3">
                <img src="/favicon.jpg" alt="Happy English Club" className="h-10 w-10 shrink-0 rounded-full border border-hec-line object-cover" />
                <div className="hidden min-w-0 sm:block">
                  <h1 className="font-display text-hec-h3 font-medium text-hec-ink">{title || "Education Manager"}</h1>
                  <p className="hidden text-hec-caption text-hec-ink-soft md:block">Happy English Club</p>
                </div>
              </div>
              {/* On a phone the switcher takes its own full-width row under the bar,
                  so the name has room to wrap; from sm it sits inline (DESIGN_SYSTEM s.13). */}
              <div className="order-last w-full empty:hidden sm:order-none sm:flex sm:w-auto sm:min-w-0 sm:flex-1 sm:justify-end [&>button]:h-auto sm:[&>button]:w-auto sm:[&>button]:max-w-xs [&>button]:w-full [&>button]:justify-start [&>button]:whitespace-normal [&>button]:py-2 [&>button]:text-left [&>button>span]:min-w-0 [&>button>span]:flex-1 [&>button>span]:break-words">
                <ProfileSwitcher />
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2">
                <PWAInstallButton variant="outline" />
                <NotificationBell />
                <ChangePassword />
                <UserMenu name={userName} role={role} avatarUrl={avatarUrl} onSignOut={signOut} />
              </div>
            </div>
          </header>
          {role === "student" && <StudentNavBar />}
          <main
            className={
              role === "student"
                ? // Room below for the fixed bottom bar, the assistant button above it and the home indicator.
                  // lg:pb-24 too: lg:py-8 otherwise wins at 1024+ and the assistant button sat on the last card (R08).
                  "container mx-auto overflow-x-clip px-4 py-4 md:py-6 lg:py-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-24 lg:pb-24"
                : "container mx-auto overflow-x-clip px-4 py-4 md:py-6 lg:py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-24 lg:pb-24"
            }
          >{children}</main>
          <AssistantLauncher />
        </div>
        </AgeBandProvider>
      </MotionConfig>
    );
  }

  // Admin/Teacher layout with sidebar. On a route in the Ivory system the same
  // markup takes the system's classes (IV.*); elsewhere it is unchanged.
  const IV_FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
  return (
    <MotionConfig reducedMotion="user">
    <div className={ivory ? "min-h-screen w-full flex bg-hec-paper text-hec-ink" : "min-h-screen bg-background flex w-full"}>
      {!ivory && <AmbientBackground intensity="subtle" />}
      {/* Global Cmd+K / Ctrl+K command bar */}
      <CommandPalette />
      {/*
        No AssistantLauncher here on purpose. For teachers and admins the
        assistant is the first tab inside ClassroomToolsLauncher (below):
        both floating buttons were pinned to the same bottom-right corner on
        desktop, and the assistant's z-50 bubble covered the classroom-tools
        button. Students and families, who have no tools launcher, still get
        the standalone bubble in the layout above.
      */}
      {/* Desktop Sidebar — liquid glass command rail */}
      <aside
        className={cn(
          ivory
            ? "hidden md:flex flex-col border-r border-hec-line bg-hec-surface sticky top-0 h-screen"
            : "hidden md:flex flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 transition-all duration-300 sticky top-0 h-screen",
          // Same widths in both looks: the page (and a display board scaled to it) keeps its size.
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className={ivory ? "flex items-center justify-between gap-2 border-b border-hec-line p-3" : "p-4 border-b border-border/60 flex items-center justify-between"}>
          {sidebarOpen && (
            ivory ? (
              <div className="flex min-w-0 items-center gap-3">
                <img src="/favicon.jpg" alt="Happy English Club" className="h-9 w-9 shrink-0 rounded-full border border-hec-line object-cover" />
                <span className="font-display text-hec-h3 font-medium text-hec-ink">Happy English</span>
              </div>
            ) : (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full p-[2px] bg-[conic-gradient(from_140deg,#3b82f6,#22d3ee,#facc15,#3b82f6)] shadow-[0_0_14px_-4px_rgba(59,130,246,0.5)]">
                <div className="h-full w-full rounded-full overflow-hidden bg-card">
                  <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-cover" />
                </div>
              </div>
              <span className="font-semibold text-sm text-shimmer">Happy English</span>
            </div>
            )
          )}
          <Button
            variant="ghost"
            size="icon"
            className={ivory ? "shrink-0" : "h-8 w-8 group"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? "Collapse the menu" : "Expand the menu"}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? (
              <ChevronLeft className="h-4 w-4 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
            ) : (
              <ChevronRight className="h-4 w-4 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
            )}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <TooltipProvider delayDuration={100}>
            {navGroups.map((group) => {
              const entries = group.sections.map(entryOf);
              // A heading folds its entries (admin); the one holding the current page is always open.
              // A collapsed (icon-only) sidebar shows no headings, only a hairline between groups.
              const foldable = !!group.label && sidebarOpen;
              const groupOpen = !foldable || group.id === activeGroupId || !closedGroups.includes(group.id);
              return (
              <div key={group.id} className={cn(!sidebarOpen && group.label && "border-t border-hec-line pt-1 first:border-t-0 first:pt-0")}>
                {foldable && (
                  <button
                    type="button"
                    aria-expanded={groupOpen}
                    aria-controls={`nav-group-${group.id}`}
                    onClick={() => { if (group.id !== activeGroupId) toggleGroup(group.id); }}
                    className={cn(
                      "mt-2 flex min-h-hec-target w-full items-center justify-between gap-2 rounded-hec-md px-3 text-left",
                      ivory
                        ? cn("text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft hover:text-hec-ink", IV_FOCUS)
                        : "text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground focus-premium",
                    )}
                  >
                    <span>{group.label}</span>
                    <ChevronDown aria-hidden className={cn("h-4 w-4 shrink-0 transition-transform duration-hec-1", !groupOpen && "-rotate-90")} />
                  </button>
                )}
                <div id={`nav-group-${group.id}`} className="space-y-1" hidden={!groupOpen}>
            {entries.map((item) => {
              const isActive = sectionIsActive(item.section, location.pathname, location.search);

              const buttonContent = ivory ? (
                // Ivory nav item (DESIGN_SYSTEM s.15): 44 px, sunken wash and a brass mark at the left edge
                // when current. The wash and the mark are ONE shared element (layoutId) that glides between
                // items (Signature tier, brief C1); hovered items take the sunken wash in 140 ms. No icon motion.
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  aria-label={sidebarOpen ? undefined : item.label}
                  className={cn(
                    "relative flex min-h-hec-target w-full items-center gap-3 rounded-hec-md px-3 text-left text-hec-small transition-colors duration-hec-1 ease-hec",
                    IV_FOCUS,
                    !sidebarOpen && "justify-center px-0",
                    isActive ? "font-medium text-hec-ink" : "text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink",
                  )}
                  onClick={() => { if (item.path !== location.pathname) navProgress.start(); navigate(item.path); }}
                >
                  {sectionIsActive(item.section, marker.pathname, marker.search) && (
                    <motion.span
                      layoutId="hec-nav-marker"
                      aria-hidden
                      transition={motionLevel === "off" ? { duration: 0 } : snappy}
                      className="absolute inset-0 rounded-hec-md bg-hec-sunken"
                    >
                      <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-hec-brass" />
                    </motion.span>
                  )}
                  <item.icon className="relative h-5 w-5 shrink-0" aria-hidden />
                  {sidebarOpen && <span className="relative min-w-0">{item.label}</span>}
                  <CheckBadge total={item.badge} lines={badgeLines} dot={!sidebarOpen} />
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "relative w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors group focus-premium",
                    !sidebarOpen && "justify-center px-2",
                    isActive
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                  onClick={() => { if (item.path !== location.pathname) navProgress.start(); navigate(item.path); }}
                >
                  {/* Spring-animated active pill glides between items */}
                  {isActive && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600/15 via-blue-500/10 to-cyan-500/10 ring-1 ring-blue-500/25 shadow-[0_0_18px_-4px_rgba(59,130,246,0.45)]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <item.icon
                    className={cn(
                      "relative z-10 h-4 w-4 shrink-0 transition-transform duration-200",
                      isActive ? "icon-glow" : "group-hover:scale-110"
                    )}
                  />
                  {sidebarOpen && <span className="relative z-10 truncate">{item.label}</span>}
                  <CheckBadge total={item.badge} lines={badgeLines} dot={!sidebarOpen} />
                </button>
              );

              // Only show tooltip when sidebar is collapsed
              if (sidebarOpen) {
                return <div key={item.path}>{buttonContent}</div>;
              }

              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <RichTooltipContent side="right" icon={item.icon} title={item.label} />
                </Tooltip>
              );
            })}
                </div>
              </div>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Sidebar Footer */}
        {ivory ? (
          <div className="space-y-1 border-t border-hec-line p-2">
            {sidebarOpen && userName && (
              <div className="flex items-start gap-3 px-3 py-2">
                <Avatar className="h-8 w-8 shrink-0 border border-hec-line">
                  <AvatarImage src={avatarUrl || undefined} alt="" />
                  <AvatarFallback className="bg-hec-sunken text-hec-caption text-hec-ink">{initialsOf(userName)}</AvatarFallback>
                </Avatar>
                {/* A name wraps, never cut (DESIGN_SYSTEM s.13). */}
                <span className="min-w-0 flex-1 whitespace-normal break-words text-hec-small font-medium text-hec-ink">{userName}</span>
              </div>
            )}
            <PWAInstallButton className="w-full" sidebarOpen={sidebarOpen} variant="ghost" />
            <Button
              variant="ghost"
              className={cn("w-full justify-start gap-3 text-hec-ink-soft", !sidebarOpen && "justify-center px-0")}
              onClick={signOut}
              aria-label={sidebarOpen ? undefined : "Sign out"}
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden />
              {sidebarOpen && <span>Sign out</span>}
            </Button>
          </div>
        ) : (
        <div className="p-2 border-t border-border/60 space-y-2">
          {sidebarOpen && userName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-sm">
              <div className="rounded-full p-[1.5px] bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300 shrink-0">
                <Avatar className="h-7 w-7 ring-1 ring-background">
                  <AvatarImage src={avatarUrl || undefined} alt={userName} />
                  <AvatarFallback className="text-xs">{initialsOf(userName)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="text-sm font-medium truncate">{userName}</span>
            </div>
          )}
          <PWAInstallButton className="w-full" sidebarOpen={sidebarOpen} variant="ghost" />
          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3 text-muted-foreground group", !sidebarOpen && "justify-center px-2")}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 shrink-0 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
            {sidebarOpen && <span>Sign Out</span>}
          </Button>
        </div>
        )}
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className={ivory ? "md:hidden sticky top-0 z-50 border-b border-hec-line bg-hec-paper" : "md:hidden sticky top-0 z-50 border-b bg-card/95 backdrop-blur shadow-sm"}>
          <div className={ivory ? "flex items-center justify-between gap-2 px-4 py-2" : "px-4 py-3 flex items-center justify-between"}>
            <div className={ivory ? "flex min-w-0 items-center gap-2" : "flex items-center gap-3"}>
              <Button
                variant="ghost"
                size="icon"
                className="group relative"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close the menu" : "Open the menu"}
                aria-expanded={mobileMenuOpen}
              >
                {!mobileMenuOpen && <CheckBadge total={checks.total} lines={badgeLines} dot />}
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                ) : (
                  <Menu className="h-5 w-5 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                )}
              </Button>
              <span className={ivory ? "min-w-0 font-display text-hec-h3 font-medium text-hec-ink" : "font-semibold"}>{title || "Dashboard"}</span>
            </div>
            <div className={ivory ? "flex shrink-0 items-center gap-2" : "flex items-center gap-2"}>
              <NotificationBell />
              <ChangePassword />
              {ivory && <UserMenu name={userName} role={role} avatarUrl={avatarUrl} onSignOut={signOut} />}
            </div>
          </div>

          {/* Mobile Menu */}
          {/* The menu opens as paper sliding down (240 ms) and closes in 140 ms; the old look keeps its plain toggle. */}
          <AnimatePresence initial={false}>
          {mobileMenuOpen && (
            <motion.nav
              initial={ivory && motionLevel !== "off" ? { opacity: 0, y: -8 } : false}
              animate={{ opacity: 1, y: 0 }}
              exit={ivory && motionLevel !== "off" ? { opacity: 0, y: -8, transition: { duration: dur.press, ease } } : { opacity: 1, transition: { duration: 0 } }}
              transition={{ duration: dur.reveal, ease }}
              className={ivory ? "max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto border-t border-hec-line bg-hec-surface p-2" : "border-t bg-card p-2 space-y-1"}>
              {navGroups.map((group) => (
                <div key={group.id} className="space-y-1">
                  {group.label && (
                    <p className={cn("px-3 pt-2", ivory ? "text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft" : "text-xs font-semibold uppercase tracking-wider text-muted-foreground")}>{group.label}</p>
                  )}
                  {group.sections.map(entryOf).map((item) => {
                const isActive = sectionIsActive(item.section, location.pathname, location.search);
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "w-full justify-start gap-3 group",
                      isActive && (ivory ? "font-medium" : "bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400")
                    )}
                    onClick={() => {
                      if (item.path !== location.pathname) navProgress.start();
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 transition-colors",
                      !isActive && "group-hover:text-royalGreen dark:group-hover:text-royalGreen-light"
                    )} />
                    <span>{item.label}</span>
                    <CheckBadge total={item.badge} lines={badgeLines} />
                  </Button>
                );
              })}
                </div>
              ))}
              <PWAInstallButton className="w-full" variant="ghost" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground group"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                <span>Sign Out</span>
              </Button>
            </motion.nav>
          )}
          </AnimatePresence>
        </header>

        {/* Desktop Header — breadcrumbs + ⌘K palette + user controls */}
        <AdminTopBar
          title={title}
          rightSlot={
            <>
              <ProfileSwitcher />
              <NotificationBell />
              <ChangePassword />
              {ivory && <UserMenu name={userName} role={role} avatarUrl={avatarUrl} onSignOut={signOut} />}
            </>
          }
        />

        {/* Main Content */}
        {/* A page change fades <main> in over 240 ms; the sidebar and the header never animate. When a
            Carry (view transition) is taking the person to this page, the browser already cross-fades. */}
        <motion.main
          initial={ivory && motionLevel !== "off" && !carriedRecently() ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: dur.reveal, ease }}
          className={ivory ? "flex-1 overflow-auto px-4 py-4 pb-24 sm:px-6 md:py-6 lg:px-8 lg:py-8" : "flex-1 p-4 md:p-6 lg:p-8 overflow-auto"}
        >
          {/* What the assistant set up, until the admin says it looks right or undoes it */}
          <AiActionBanner />
          {/* The tab strip of a multi-page section (teacher menu): the same pages, one entry in the sidebar. */}
          <SectionTabs groups={navGroups} />
          {children}
        </motion.main>
      </div>

      {/* Floating Classroom Tools — teachers and admins only.
          Stays mounted across pages so it can be triggered mid-lesson. */}
      {(role === "teacher" || role === "admin") && <ClassroomToolsLauncher />}
    </div>
    </MotionConfig>
  );
};

export default Layout;