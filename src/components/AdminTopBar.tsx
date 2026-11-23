import { Fragment, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, Command, Plus, Search, Plug} from "lucide-react";
import { allMembers, ADMIN_GROUPS } from "@/lib/navSections";
import { navIcon } from "@/components/navIcons";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { useIvory } from "@/hooks/useIvory";
import { useAuth } from "@/hooks/useAuth";
import { OPEN_GENERAL_PALETTE_EVENT, paletteFor } from "@/lib/paletteOwner";

const KBD_CLASS =
  "ml-1 hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground";
// The same key hint on a listed route (DESIGN_SYSTEM tokens; nothing under 13 px).
const KBD_CLASS_IVORY =
  "ml-1 hidden h-6 select-none items-center gap-1 rounded-hec-sm border border-hec-line bg-hec-sunken px-2 font-mono text-hec-caption text-hec-ink-soft lg:inline-flex";
const FOCUS =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring";
// ui/command has no ivory branch: on a listed route the palette's parts get the
// system's type and colours from here (the dialog frame is ui/dialog's).
const PALETTE_INPUT_IVORY = "text-hec-body text-hec-ink placeholder:text-hec-ink-faint";
const PALETTE_EMPTY_IVORY = "py-6 text-center text-hec-small text-hec-ink-soft";
const PALETTE_GROUP_IVORY =
  "text-hec-ink [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-hec-caption [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-hec-ink-soft";
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

// The paths the Admin group above already lists by hand.
const SHOWN_ABOVE = new Set([
  "/students", "/teachers", "/admin?tab=classes", "/schedule", "/admin?tab=assignments", "/admin?tab=journal",
  "/admin?tab=exam-reports", "/admin?tab=finance", "/admin?tab=payroll", "/admin?tab=reports", "/admin?tab=automation",
  "/admin?tab=data", "/admin?tab=stars-sync", "/admin?tab=announcements",
]);

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
  const ivory = useIvory();
  const { role } = useAuth();

  const tab = searchParams.get("tab");
  const crumbs = useMemo(() => buildCrumbs(location.pathname, tab), [location.pathname, tab]);

  // Cmd/Ctrl+K opens this (admin) palette only for an admin on an admin page;
  // everywhere else CommandPalette answers the key (lib/paletteOwner).
  const ownsPalette = paletteFor(role, location.pathname) === "admin";
  useEffect(() => {
    if (!ownsPalette) {
      setPaletteOpen(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ownsPalette]);

  // The Quick jump button opens whichever palette owns the page.
  const openPalette = () => {
    if (ownsPalette) setPaletteOpen(true);
    else window.dispatchEvent(new Event(OPEN_GENERAL_PALETTE_EVENT));
  };

  const go = (path: string) => {
    setPaletteOpen(false);
    navigate(path);
  };

  return (
    <>
      <header
        className={
          ivory
            ? // DESIGN_SYSTEM s.15 top bar: solid paper and one hairline.
              "sticky top-0 z-40 hidden min-h-14 items-center justify-between gap-4 border-b border-hec-line bg-hec-paper px-6 py-2 md:flex"
            : "hidden md:flex sticky top-0 z-40 bg-card px-6 py-3 items-center justify-between gap-4 shadow-q1"
        }
      >
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
                  const parts = (
                    <>
                      <BreadcrumbItem>
                        {c.href && !isLast ? (
                          <BreadcrumbLink
                            className={ivory ? `cursor-pointer rounded-hec-sm text-hec-small text-hec-ink-soft transition-colors duration-hec-1 ease-hec hover:text-hec-ink ${FOCUS}` : "cursor-pointer hover:text-foreground transition-colors"}
                            onClick={() => navigate(c.href!)}
                          >
                            {c.label}
                          </BreadcrumbLink>
                        ) : (
                          <BreadcrumbPage className={ivory ? "text-hec-small font-semibold text-hec-ink" : "font-semibold text-foreground"}>{c.label}</BreadcrumbPage>
                        )}
                      </BreadcrumbItem>
                      {!isLast && (
                        <BreadcrumbSeparator className={ivory ? "text-hec-ink-faint" : undefined}>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </BreadcrumbSeparator>
                      )}
                    </>
                  );
                  // Ivory: no wrapper, so each <li> is a direct child of the <ol> (a list a screen reader can count).
                  return ivory ? (
                    <Fragment key={`${c.label}-${idx}`}>{parts}</Fragment>
                  ) : (
                    <span key={`${c.label}-${idx}`} className="contents">
                      {parts}
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
            className={ivory ? "gap-2 px-3 text-hec-ink-soft" : "h-9 gap-2 text-muted-foreground"}
            onClick={openPalette}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Quick jump…</span>
            {/* Ivory: below lg the label is hidden, so the button keeps a name for screen readers. */}
            {ivory && <span className="sr-only lg:hidden">Quick jump</span>}
            <kbd className={ivory ? KBD_CLASS_IVORY : KBD_CLASS}>⌘K</kbd>
          </Button>
          {rightSlot}
        </div>
        {!ivory && <div className="hairline-gradient absolute inset-x-0 bottom-0 h-px" />}
      </header>

      <CommandDialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <CommandInput placeholder="Jump to a page or run an action…" className={ivory ? PALETTE_INPUT_IVORY : undefined} />
        <CommandList>
          {/* className only on a listed route: CommandEmpty lets a passed className replace its own. */}
          <CommandEmpty {...(ivory ? { className: PALETTE_EMPTY_IVORY } : {})}>No results.</CommandEmpty>

          <CommandGroup heading="Admin" className={ivory ? PALETTE_GROUP_IVORY : undefined}>
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
            <PaletteItem icon={Plug} label="Stars Sync" onSelect={() => go("/admin?tab=stars-sync")} />
            <PaletteItem icon={Megaphone} label="Announcements" onSelect={() => go("/admin?tab=announcements")} />
            {/* Every other page of the admin menu, from the sidebar's own definition (nothing is findable only by scrolling). */}
            {allMembers(ADMIN_GROUPS)
              .filter((m) => !SHOWN_ABOVE.has(m.path))
              .map((m) => <PaletteItem key={m.path} icon={navIcon(m.icon)} label={m.label} onSelect={() => go(m.path)} />)}
          </CommandGroup>

          <CommandSeparator className={ivory ? "bg-hec-line" : undefined} />

          <CommandGroup heading="Quick actions" className={ivory ? PALETTE_GROUP_IVORY : undefined}>
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
  const ivory = useIvory();
  return (
    <CommandItem
      onSelect={onSelect}
      // ui/command has no ivory branch yet: the menu-item recipe (44 px, body text) is passed here.
      className={ivory ? "min-h-hec-target gap-2 rounded-hec-sm px-3 text-hec-body text-hec-ink" : "gap-2"}
    >
      <Icon className={ivory ? "h-4 w-4 shrink-0 text-hec-ink-soft" : "h-4 w-4 text-muted-foreground"} />
      <span className={ivory ? "min-w-0 break-words" : undefined}>{label}</span>
    </CommandItem>
  );
}
