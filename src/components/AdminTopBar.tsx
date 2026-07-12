import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Command, Plus, Search } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";

const KBD_CLASS =
  "ml-1 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DollarSign,
  Users,
  GraduationCap,
  CalendarDays,
  ListTodo,
  School,
  PiggyBank,
  Receipt,
  TrendingUp,
  HardDrive,
  NotebookPen,
  Megaphone,
  FileBarChart2,
  Settings2,
  Wallet,
  Lock,
  UserPlus,
} from "lucide-react";

type Crumb = { label: string; href?: string };

// Map URL segments / tabs to human-readable breadcrumb labels.
const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin",
  students: "Students",
  teachers: "Teachers",
  families: "Families",
  schedule: "Schedule",
  classes: "Classes",
  dashboard: "Dashboard",
  teacher: "Teacher",
  attendance: "Attendance",
  assignments: "Assignments",
  journal: "Journal",
  payroll: "Payroll",
  leaderboards: "Leaderboards",
  profile: "Profile",
  "exam-reports": "Exam Reports",
};

const TAB_LABELS: Record<string, string> = {
  classes: "Classes",
  assignments: "Assignments",
  journal: "Journal",
  "exam-reports": "Exam Reports",
  finance: "Finance",
  payroll: "Payroll",
  reports: "Reports",
  account: "Account",
  automation: "Automation",
  data: "Data",
  announcements: "Announcements",
  overview: "Overview",
};

function buildCrumbs(pathname: string, tab: string | null): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];

  // Build path-based crumbs.
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? prettifySegment(seg);
    crumbs.push({ label, href: acc });
  }

  // Append the tab as a leaf if present.
  if (tab && TAB_LABELS[tab]) {
    crumbs.push({ label: TAB_LABELS[tab] });
  }

  // Drop the last href so the leaf renders as Page (non-link).
  if (crumbs.length > 0) crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  return crumbs;
}

function prettifySegment(seg: string): string {
  // UUID-ish segments → "Detail". Otherwise capitalise.
  if (/^[0-9a-f-]{20,}$/i.test(seg)) return "Detail";
  return seg
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

interface AdminTopBarProps {
  title?: string;
  rightSlot?: React.ReactNode;
}

export function AdminTopBar({ title, rightSlot }: AdminTopBarProps) {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const tab = searchParams.get("tab");
  const crumbs = useMemo(() => buildCrumbs(location.pathname, tab), [location.pathname, tab]);

  // Cmd/Ctrl+K opens the palette.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setPaletteOpen(false);
    navigate(path);
  };

  return (
    <>
      <header className="hidden md:flex sticky top-0 z-40 bg-card/70 backdrop-blur-xl supports-[backdrop-filter]:bg-card/55 px-6 py-3 items-center justify-between gap-4 shadow-q1">
        <div className="flex items-center gap-4 min-w-0">
          <Breadcrumb>
            <BreadcrumbList>
              {crumbs.length === 0 ? (
                <BreadcrumbItem>
                  <BreadcrumbPage>{title || "Dashboard"}</BreadcrumbPage>
                </BreadcrumbItem>
              ) : (
                crumbs.map((c, idx) => {
                  const isLast = idx === crumbs.length - 1;
                  return (
                    <span key={`${c.label}-${idx}`} className="contents">
                      <BreadcrumbItem>
                        {c.href && !isLast ? (
                          <BreadcrumbLink
                            className="cursor-pointer hover:text-foreground transition-colors"
                            onClick={() => navigate(c.href!)}
                          >
                            {c.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className="font-semibold text-foreground">{c.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </BreadcrumbSeparator>
                      )}
                    </span>
                  );
                })
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-2 text-muted-foreground"
            onClick={() => setPaletteOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Quick jump…</span>
            <kbd className={KBD_CLASS}>⌘K</kbd>
          </Button>
          {rightSlot}
        </div>
        <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />
      </header>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to a page or run an action…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>

          <CommandGroup heading="Admin">
            <PaletteItem icon={DollarSign} label="Finance" onSelect={() => go("/admin?tab=finance")} />
            <PaletteItem icon={Wallet} label="Tuition" onSelect={() => go("/admin?tab=finance")} />
            <PaletteItem icon={Users} label="Students" onSelect={() => go("/students")} />
            <PaletteItem icon={GraduationCap} label="Teachers" onSelect={() => go("/teachers")} />
            <PaletteItem icon={School} label="Classes" onSelect={() => go("/admin?tab=classes")} />
            <PaletteItem icon={CalendarDays} label="Schedule" onSelect={() => go("/schedule")} />
            <PaletteItem icon={ListTodo} label="Assignments" onSelect={() => go("/admin?tab=assignments")} />
            <PaletteItem icon={NotebookPen} label="Journal" onSelect={() => go("/admin?tab=journal")} />
            <PaletteItem icon={FileBarChart2} label="Exam Reports" onSelect={() => go("/admin?tab=exam-reports")} />
            <PaletteItem icon={PiggyBank} label="Finance Summary" onSelect={() => go("/admin?tab=finance")} />
            <PaletteItem icon={Receipt} label="Payroll" onSelect={() => go("/admin?tab=payroll")} />
            <PaletteItem icon={TrendingUp} label="Reports" onSelect={() => go("/admin?tab=reports")} />
            <PaletteItem icon={Settings2} label="Automation" onSelect={() => go("/admin?tab=automation")} />
            <PaletteItem icon={HardDrive} label="Data" onSelect={() => go("/admin?tab=data")} />
            <PaletteItem icon={Megaphone} label="Announcements" onSelect={() => go("/admin?tab=announcements")} />
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Quick actions">
            <PaletteItem icon={Lock} label="Close current month (Finance → Close Month)" onSelect={() => go("/admin?tab=finance")} />
            <PaletteItem icon={Plus} label="New student" onSelect={() => go("/students?new=1")} />
            <PaletteItem icon={UserPlus} label="New family" onSelect={() => go("/families?new=1")} />
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: typeof Command;
  label: string;
  onSelect: () => void;
}) {
  return (
    <CommandItem onSelect={onSelect} className="gap-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span>{label}</span>
    </CommandItem>
  );
}
