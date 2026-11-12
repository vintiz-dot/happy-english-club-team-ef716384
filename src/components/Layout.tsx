import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, UserCog, BookOpenCheck, CalendarDays, TrendingUp, PiggyBank, LayoutGrid, FileText, ListTodo, NotebookPen, Trophy, Menu, X, ChevronLeft, ChevronRight, Building2, Receipt, Settings2, HardDrive, UsersRound, School, Megaphone, FileBarChart2, FolderOpen, Sparkles, BookOpen, ScanText, AudioLines, History, Plug, Bot, Languages} from "lucide-react";
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
import { motion, MotionConfig } from "framer-motion";
import { useIvory } from "@/hooks/useIvory";
import { UserMenu } from "@/components/theme/UserMenu";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  hideNavigation?: boolean;
}

const SIDEBAR_KEY = "sidebar-collapsed";

const Layout = ({ children, title, hideNavigation = false }: LayoutProps) => {
  const { user, role, signOut } = useAuth();
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
  const ivory = useIvory();

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, (!sidebarOpen).toString());
  }, [sidebarOpen]);


  // Only an admin has a profile screen to go to, so only they get a
  // button; for everyone else the chip stays a label.
  const isAdmin = role === "admin";
  const Component = isAdmin ? "button" : "div";

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

  const getNavigationItems = () => {
    switch (role) {
      case "admin":
        return [
          { icon: LayoutGrid, label: "Dashboard", path: "/admin" },
          { icon: UsersRound, label: "Students", path: "/students" },
          { icon: UserCog, label: "Teachers", path: "/teachers" },
          { icon: School, label: "Classes", path: "/admin?tab=classes" },
          { icon: Building2, label: "Families", path: "/families" },
          { icon: CalendarDays, label: "Schedule", path: "/schedule" },
          { icon: ListTodo, label: "Assignments", path: "/admin?tab=assignments" },
          { icon: NotebookPen, label: "Journal", path: "/admin?tab=journal" },
          { icon: FileBarChart2, label: "Exam Reports", path: "/admin?tab=exam-reports" },
          { icon: PiggyBank, label: "Finance", path: "/admin?tab=finance" },
          { icon: Receipt, label: "Payroll", path: "/admin?tab=payroll" },
          { icon: TrendingUp, label: "Reports", path: "/admin?tab=reports" },
          { icon: Settings2, label: "Automation", path: "/admin?tab=automation" },
          { icon: History, label: "Activity", path: "/admin?tab=activity" },
          { icon: Bot, label: "AI actions", path: "/admin?tab=ai-actions" },
          { icon: HardDrive, label: "Data", path: "/admin?tab=data" },
          { icon: Plug, label: "Stars Sync", path: "/admin?tab=stars-sync" },
          { icon: AudioLines, label: "Audit clips", path: "/admin?tab=audit-clips" },
          { icon: Megaphone, label: "Announcements", path: "/admin?tab=announcements" },
          { icon: ScanText, label: "Smart Upload", path: "/teacher/smart-upload" },
          { icon: AudioLines, label: "Transcripts", path: "/teacher/transcripts" },
          { icon: BookOpen, label: "Flipbooks", path: "/teacher/books" },
          { icon: Languages, label: "Language Support", path: "/teacher/language-support" },
        ];
      case "teacher":
        return [
          { icon: TrendingUp, label: "Dashboard", path: "/dashboard" },
          { icon: CalendarDays, label: "Schedule", path: "/schedule" },
          { icon: Trophy, label: "Leaderboard", path: "/teacher/leaderboards" },
          { icon: PiggyBank, label: "Payroll", path: "/teacher/payroll" },
          { icon: BookOpenCheck, label: "Assignments", path: "/teacher/assignments" },
          { icon: ListTodo, label: "Attendance", path: "/teacher/attendance" },
          { icon: NotebookPen, label: "Journal", path: "/teacher/journal" },
          { icon: FileBarChart2, label: "Exam Reports", path: "/teacher/exam-reports" },
          { icon: Sparkles, label: "Vocabulary Audit", path: "/teacher/vocabulary-audit" },
          { icon: ScanText, label: "Smart Upload", path: "/teacher/smart-upload" },
          { icon: AudioLines, label: "Transcripts", path: "/teacher/transcripts" },
          { icon: FolderOpen, label: "Resources", path: "/teacher/resources" },
          { icon: BookOpen, label: "Flipbooks", path: "/teacher/books" },
          { icon: Languages, label: "Language Support", path: "/teacher/language-support" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavigationItems();
  const showSidebar = role === "admin" || role === "teacher";

  // Student/Family layout, "Ivory" design system (the route is listed in
  // src/lib/ivoryScope.ts). Solid paper, no glow; the controls are 44 px and
  // labelled; a child's name in the switcher wraps, never cut.
  if (!showSidebar && ivory) {
    return (
      <MotionConfig reducedMotion="user">
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
                  "container mx-auto overflow-x-clip px-4 py-4 md:py-6 lg:py-8 pb-[calc(9rem+env(safe-area-inset-bottom))] md:pb-24"
                : "container mx-auto overflow-x-clip px-4 py-4 md:py-6 lg:py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-24"
            }
          >{children}</main>
          <AssistantLauncher />
        </div>
      </MotionConfig>
    );
  }

  // Student/Family layout with sticky navbar
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-background">
        <AmbientBackground intensity="bold" />
        <header className="sticky top-0 z-50 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 shadow-sm">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              {/* Conic aurora ring around the brand mark */}
              <div className="h-9 w-9 md:h-11 md:w-11 rounded-full p-[2px] bg-[conic-gradient(from_140deg,#3b82f6,#22d3ee,#facc15,#3b82f6)] shadow-[0_0_16px_-4px_rgba(59,130,246,0.5)]">
                <div className="h-full w-full rounded-full overflow-hidden bg-card">
                  <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-cover" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base md:text-xl font-bold text-shimmer">{title || "Education Manager"}</h1>
                <p className="text-xs text-muted-foreground hidden md:block">Happy English Club</p>
              </div>
            </div>
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 md:gap-4">
              <PWAInstallButton variant="outline" />
              {/* A long child name shrinks and truncates so the controls to its right stay on screen. */}
              <div className="min-w-0 [&>button]:max-w-full [&>button>span]:min-w-0 [&>button>span]:truncate">
                <ProfileSwitcher />
              </div>
              <NotificationBell />
              {userName && (
                <Component
                  {...(isAdmin
                    ? {
                        type: "button" as const,
                        title: "View your profile",
                        onClick: () => navigate("/admin?tab=account"),
                      }
                    : {})}
                  className={cn(
                    "hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full glass-sm text-left",
                    isAdmin && "transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <div className="rounded-full p-[1.5px] bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300">
                    <Avatar className="h-7 w-7 ring-1 ring-background">
                      <AvatarImage src={avatarUrl || undefined} alt={userName} />
                      <AvatarFallback className="text-xs">{initialsOf(userName)}</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="flex flex-col leading-tight">
                    <span className="text-sm font-medium text-foreground">{userName}</span>
                    {role && (
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {role}
                      </span>
                    )}
                  </span>
                </Component>
              )}
              <ChangePassword />
              <Button onClick={signOut} variant="outline" size="sm" className="hidden sm:flex group">
                <LogOut className="h-4 w-4 mr-2 group-hover:text-red-500 transition-colors" />
                Sign Out
              </Button>
              <Button onClick={signOut} variant="outline" size="icon" className="sm:hidden group" aria-label="Sign out">
                <LogOut className="h-4 w-4 group-hover:text-red-500 transition-colors" />
              </Button>
            </div>
          </div>
          {/* Luxe gradient hairline */}
          <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
        </header>
        {role === "student" && <StudentNavBar />}
        <main
          className={
            role === "student"
              ? // The bottom tab bar is fixed: leave room for it (and the iPhone home bar) below the page, not above it.
                // overflow-x-clip: decorative glows must never make a phone page scroll sideways.
                "container mx-auto overflow-x-clip px-4 py-4 md:py-6 lg:py-8 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-8"
              : "container mx-auto px-4 py-4 md:py-6 lg:py-8 pb-20 md:pb-8"
          }
        >{children}</main>
        {/* Read-only, RLS-scoped assistant — available to every signed-in role */}
        <AssistantLauncher />
      </div>
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
          sidebarOpen ? (ivory ? "w-60" : "w-56") : ivory ? "w-[4.5rem]" : "w-16"
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
            {navItems.map((item) => {
              const isActive = item.path.includes('?') 
                ? location.pathname + location.search === item.path
                : location.pathname === item.path && !location.search;
              
              const buttonContent = ivory ? (
                // Ivory nav item (DESIGN_SYSTEM s.15): 44 px, sunken wash when current, a brass mark at the left edge.
                <button
                  type="button"
                  aria-current={isActive ? "page" : undefined}
                  aria-label={sidebarOpen ? undefined : item.label}
                  className={cn(
                    "relative flex min-h-hec-target w-full items-center gap-3 rounded-hec-md px-3 text-left text-hec-small transition-colors duration-hec-1 ease-hec",
                    IV_FOCUS,
                    !sidebarOpen && "justify-center px-0",
                    isActive ? "bg-hec-sunken font-medium text-hec-ink" : "text-hec-ink-soft hover:bg-hec-sunken hover:text-hec-ink",
                  )}
                  onClick={() => navigate(item.path)}
                >
                  {isActive && <span aria-hidden className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-hec-brass" />}
                  <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                  {sidebarOpen && <span className="min-w-0">{item.label}</span>}
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
                  onClick={() => navigate(item.path)}
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
                className="group"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? "Close the menu" : "Open the menu"}
                aria-expanded={mobileMenuOpen}
              >
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
          {mobileMenuOpen && (
            <nav className={ivory ? "max-h-[calc(100dvh-4rem)] space-y-1 overflow-y-auto border-t border-hec-line bg-hec-surface p-2" : "border-t bg-card p-2 space-y-1"}>
              {navItems.map((item) => {
                const isActive = item.path.includes('?') 
                  ? location.pathname + location.search === item.path
                  : location.pathname === item.path && !location.search;
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
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 transition-colors",
                      !isActive && "group-hover:text-royalGreen dark:group-hover:text-royalGreen-light"
                    )} />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
              <PWAInstallButton className="w-full" variant="ghost" />
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-muted-foreground group"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                <span>Sign Out</span>
              </Button>
            </nav>
          )}
        </header>

        {/* Desktop Header — breadcrumbs + ⌘K palette + user controls */}
        <AdminTopBar
          title={title}
          rightSlot={
            <>
              <ProfileSwitcher />
              <NotificationBell />
              <ChangePassword />
            </>
          }
        />

        {/* Main Content */}
        <main className={ivory ? "flex-1 overflow-auto px-4 py-4 pb-24 sm:px-6 md:py-6 lg:px-8 lg:py-8" : "flex-1 p-4 md:p-6 lg:p-8 overflow-auto"}>
          {/* What the assistant set up, until the admin says it looks right or undoes it */}
          <AiActionBanner />
          {children}
        </main>
      </div>

      {/* Floating Classroom Tools — teachers and admins only.
          Stays mounted across pages so it can be triggered mid-lesson. */}
      {(role === "teacher" || role === "admin") && <ClassroomToolsLauncher />}
    </div>
    </MotionConfig>
  );
};

export default Layout;