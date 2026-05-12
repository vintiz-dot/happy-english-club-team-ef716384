import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BookOpen, CalendarDays, MoreHorizontal, NotebookPen, DollarSign, Trophy, Zap, FileText, Gamepad2 } from "lucide-react";

const allNavItems = [
  { id: "dashboard", label: "Dashboard", emoji: "🏠", path: "/student/dashboard", icon: Home, primary: true },
  { id: "homework", label: "Homework", emoji: "📝", path: "/student/assignments", icon: BookOpen, primary: true },
  { id: "schedule", label: "My Classes", emoji: "📅", path: "/student/dashboard?tab=schedule", icon: CalendarDays, primary: true },
  { id: "games", label: "Games", emoji: "🎮", path: "/student/games", icon: Gamepad2, primary: false },
  { id: "reports", label: "Reports", emoji: "📄", path: "/student/dashboard?tab=reports", icon: FileText, primary: false },
  { id: "journal", label: "Journal", emoji: "📖", path: "/student/journal", icon: NotebookPen, primary: false },
  { id: "tuition", label: "Tuition", emoji: "💰", path: "/tuition", icon: DollarSign, primary: false },
  { id: "achievements", label: "Achievements", emoji: "🏆", path: "/student/dashboard?tab=achievements", icon: Trophy, primary: false },
  
];

export function StudentNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);

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

  const primaryItems = allNavItems.filter(i => i.primary);
  const moreItems = allNavItems.filter(i => !i.primary);
  const isMoreActive = moreItems.some(i => isActive(i.path, i.id));

  // Mobile: bottom tab bar
  if (isMobile) {
    return (
      <>
        {/* Spacer to prevent content from hiding behind fixed bottom bar */}
        <div className="h-16 md:hidden pb-[env(safe-area-inset-bottom)]" />

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
        <nav className="fixed bottom-0 left-0 right-0 z-[100] bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around py-1.5 px-1">
            {primaryItems.map((item) => {
              const active = isActive(item.path, item.id);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]",
                    active
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "text-primary")} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {active && (
                    <motion.div
                      className="absolute -bottom-0.5 w-6 h-0.5 rounded-full bg-primary"
                      layoutId="bottomTabIndicator"
                    />
                  )}
                </button>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[60px]",
                isMoreActive || moreOpen
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </div>
        </nav>
      </>
    );
  }

  // Desktop: horizontal top nav
  return (
    <nav className="sticky top-[57px] md:top-[65px] z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-0.5 py-1.5 overflow-x-auto scrollbar-hide">
          {allNavItems.map((item) => {
            const active = isActive(item.path, item.id);
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={cn(
                  "px-2 md:px-3 py-1.5 rounded-lg text-xs md:text-sm font-medium whitespace-nowrap transition-all duration-200",
                  "hover:text-primary",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted/80"
                )}
              >
                {item.emoji} {item.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
