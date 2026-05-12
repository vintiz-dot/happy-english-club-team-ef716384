import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, LogOut, UserCog, BookOpenCheck, CalendarDays, TrendingUp, PiggyBank, LayoutGrid, FileText, ListTodo, NotebookPen, Trophy, Menu, X, ChevronLeft, ChevronRight, Building2, Receipt, Settings2, HardDrive, UsersRound, School, Megaphone, FileBarChart2, FolderOpen, Sparkles, Rocket, ArrowRight, Eye } from "lucide-react";
import ProfileSwitcher from "@/components/ProfileSwitcher";
import { ChangePassword } from "@/components/auth/ChangePassword";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StudentNavBar } from "@/components/student/StudentNavBar";
import { AdminTopBar } from "@/components/AdminTopBar";
import { ClassroomToolsLauncher } from "@/components/classroom-tools/ClassroomToolsLauncher";

interface LayoutProps {
  children: ReactNode;
  title?: string;
}

const SIDEBAR_KEY = "sidebar-collapsed";

const Layout = ({ children, title }: LayoutProps) => {
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
  const [upgradeBannerDismissed, setUpgradeBannerDismissed] = useState(() => {
    try { return localStorage.getItem("hec-upgrade-banner") === "dismissed"; } catch { return false; }
  });

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
          { icon: FolderOpen, label: "Resources", path: "/teacher/resources" },
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
        <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
          <div className="container mx-auto px-4 py-3 md:py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base md:text-xl font-bold text-foreground">{title || "Education Manager"}</h1>
                <p className="text-xs text-muted-foreground hidden md:block">Happy English Club</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <ProfileSwitcher />
              <NotificationBell />
              {userName && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={avatarUrl || undefined} alt={userName} />
                    <AvatarFallback className="text-xs">
                      {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
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
        </header>
        {role === "student" && <StudentNavBar />}
        <main className="container mx-auto px-4 py-4 md:py-6 lg:py-8 pb-20 md:pb-8">{children}</main>
      </div>
    );
  }

  // Admin/Teacher layout with sidebar
  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-300 sticky top-0 h-screen",
          sidebarOpen ? "w-56" : "w-16"
        )}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <span className="font-semibold text-sm">Happy English</span>
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
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 group",
                    !sidebarOpen && "justify-center px-2",
                    isActive && "bg-blue-600/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-600/20"
                  )}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    !isActive && "group-hover:text-royalGreen dark:group-hover:text-royalGreen-light"
                  )} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Button>
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
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 border-t space-y-2">
          {sidebarOpen && userName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
              <Avatar className="h-7 w-7">
                <AvatarImage src={avatarUrl || undefined} alt={userName} />
                <AvatarFallback className="text-xs">
                  {userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{userName}</span>
            </div>
          )}
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