import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, UserCog, BookOpenCheck, CalendarDays, TrendingUp, PiggyBank, LayoutGrid, FileText, ListTodo, NotebookPen, Trophy, Menu, X, ChevronLeft, ChevronRight, Building2, Receipt, Settings2, HardDrive, UsersRound, School, Megaphone, FileBarChart2, FolderOpen, Sparkles, BookOpen, ScanText, AudioLines } from "lucide-react";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { ChangePassword } from "@/components/auth/ChangePassword";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipProvider, TooltipTrigger, RichTooltipContent } from "@/components/ui/tooltip";
import { StudentNavBar } from "@/components/student/StudentNavBar";
import { AdminTopBar } from "@/components/AdminTopBar";
import { ClassroomToolsLauncher } from "@/components/classroom-tools/ClassroomToolsLauncher";
import { PWAInstallButton } from "./PWAInstallButton";
import { CommandPalette } from "@/components/CommandPalette";
import { AmbientBackground } from "@/components/fx/AmbientBackground";
import { motion } from "framer-motion";

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
  const [userName, setUserName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY);
    return saved !== "true"; // collapsed = true means sidebar is closed
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Persist sidebar state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, (!sidebarOpen).toString());
  }, [sidebarOpen]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("full_name, avatar_url")
        .eq("linked_user_id", user.id)
        .maybeSingle();
      if (studentData?.full_name) {
        setUserName(studentData.full_name);
        setAvatarUrl(studentData.avatar_url);
        return;
      }

      const { data: teacherData } = await supabase
        .from("teachers")
        .select("full_name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (teacherData?.full_name) {
        setUserName(teacherData.full_name);
        setAvatarUrl(teacherData.avatar_url);
        return;
      }

      const { data: familyData } = await supabase
        .from("families")
        .select("name")
        .eq("primary_user_id", user.id)
        .single();
      if (familyData?.name) {
        setUserName(familyData.name);
      }
    };
    fetchUserInfo();
  }, [user]);

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
          { icon: HardDrive, label: "Data", path: "/admin?tab=data" },
          { icon: Megaphone, label: "Announcements", path: "/admin?tab=announcements" },
          { icon: ScanText, label: "Smart Upload", path: "/teacher/smart-upload" },
          { icon: AudioLines, label: "Transcripts", path: "/teacher/transcripts" },
          { icon: BookOpen, label: "Flipbooks", path: "/teacher/books" },
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
        ];
      default:
        return [];
    }
  };

  const navItems = getNavigationItems();
  const showSidebar = role === "admin" || role === "teacher";

  // Student/Family layout with sticky navbar
  if (!showSidebar) {
    return (
      <div className="min-h-screen bg-background">
        <AmbientBackground intensity="bold" />
        <header className="sticky top-0 z-50 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 shadow-sm">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3">
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
            <div className="flex items-center gap-2 md:gap-4">
              <PWAInstallButton variant="outline" />
              <ProfileSwitcher />
              <NotificationBell />
              {userName && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full glass-sm">
                  <div className="rounded-full p-[1.5px] bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300">
                    <Avatar className="h-7 w-7 ring-1 ring-background">
                      <AvatarImage src={avatarUrl || undefined} alt={userName} />
                      <AvatarFallback className="text-xs">
                        {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-sm font-medium text-foreground">{userName}</span>
                </div>
              )}
              <ChangePassword />
              <Button onClick={signOut} variant="outline" size="sm" className="hidden sm:flex group">
                <LogOut className="h-4 w-4 mr-2 group-hover:text-red-500 transition-colors" />
                Sign Out
              </Button>
              <Button onClick={signOut} variant="outline" size="icon" className="sm:hidden group">
                <LogOut className="h-4 w-4 group-hover:text-red-500 transition-colors" />
              </Button>
            </div>
          </div>
          {/* Luxe gradient hairline */}
          <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
        </header>
        {role === "student" && <StudentNavBar />}
        <main className="container mx-auto px-4 py-4 md:py-6 lg:py-8 pb-20 md:pb-8">{children}</main>
      </div>
    );
  }

  // Admin/Teacher layout with sidebar
  return (
    <div className="min-h-screen bg-background flex w-full">
      <AmbientBackground intensity="subtle" />
      {/* Global Cmd+K / Ctrl+K command bar */}
      <CommandPalette />
      {/* Desktop Sidebar — liquid glass command rail */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border/60 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 transition-all duration-300 sticky top-0 h-screen",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-full p-[2px] bg-[conic-gradient(from_140deg,#3b82f6,#22d3ee,#facc15,#3b82f6)] shadow-[0_0_14px_-4px_rgba(59,130,246,0.5)]">
                <div className="h-full w-full rounded-full overflow-hidden bg-card">
                  <img src="/favicon.jpg" alt="HEC Logo" className="h-full w-full object-cover" />
                </div>
              </div>
              <span className="font-semibold text-sm text-shimmer">Happy English</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 group"
            onClick={() => setSidebarOpen(!sidebarOpen)}
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
              
              const buttonContent = (
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
        <div className="p-2 border-t border-border/60 space-y-2">
          {sidebarOpen && userName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl glass-sm">
              <div className="rounded-full p-[1.5px] bg-gradient-to-br from-blue-500 via-cyan-400 to-amber-300 shrink-0">
                <Avatar className="h-7 w-7 ring-1 ring-background">
                  <AvatarImage src={avatarUrl || undefined} alt={userName} />
                  <AvatarFallback className="text-xs">
                    {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                  </AvatarFallback>
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
      </aside>

      {/* Mobile Header + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-50 border-b bg-card/95 backdrop-blur shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="group" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? (
                  <X className="h-5 w-5 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                ) : (
                  <Menu className="h-5 w-5 group-hover:text-royalGreen dark:group-hover:text-royalGreen-light transition-colors" />
                )}
              </Button>
              <span className="font-semibold">{title || "Dashboard"}</span>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ChangePassword />
            </div>
          </div>
          
          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav className="border-t bg-card p-2 space-y-1">
              {navItems.map((item) => {
                const isActive = item.path.includes('?') 
                  ? location.pathname + location.search === item.path
                  : location.pathname === item.path && !location.search;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 group",
                      isActive && "bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400"
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
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">{children}</main>
      </div>

      {/* Floating Classroom Tools — teachers and admins only.
          Stays mounted across pages so it can be triggered mid-lesson. */}
      {(role === "teacher" || role === "admin") && <ClassroomToolsLauncher />}
    </div>
  );
};

export default Layout;