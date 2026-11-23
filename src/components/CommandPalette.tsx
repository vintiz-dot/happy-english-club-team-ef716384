/**
 * CommandPalette — global Cmd+K / Ctrl+K command bar for admins & teachers.
 *
 * Jump between pages, search students and classes, and fire quick actions
 * (smart upload, transcript analysis, leaderboards) in under two seconds
 * without touching the mouse. Mounted once in Layout.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIvory } from "@/hooks/useIvory";
import { OPEN_GENERAL_PALETTE_EVENT, paletteFor } from "@/lib/paletteOwner";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import { GraduationCap, School, Sparkles } from "lucide-react";
import { allMembers, navGroupsFor } from "@/lib/navSections";
import { navIcon } from "@/components/navIcons";
import { useMyPilotClasses } from "@/hooks/useLessonMonitor";

// ui/command has no ivory branch: on a listed route the palette's parts take the
// system's menu recipe from here (DESIGN_SYSTEM s.15); elsewhere nothing is passed.
const INPUT_IVORY = "text-hec-body text-hec-ink placeholder:text-hec-ink-faint";
const EMPTY_IVORY = "py-6 text-center text-hec-small text-hec-ink-soft";
const GROUP_IVORY =
  "text-hec-ink [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-hec-caption [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-hec-ink-soft";
// A student or class name wraps here, never cut.
const ITEM_IVORY = "min-h-hec-target rounded-hec-sm px-3 text-hec-body text-hec-ink [overflow-wrap:anywhere]";
const ICON_IVORY = "mr-2 h-4 w-4 shrink-0 text-hec-ink-soft";

interface JumpTarget {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords?: string;
}

export function CommandPalette() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ivory = useIvory();
  const pilotClasses = useMyPilotClasses(role === "teacher");

  const enabled = role === "admin" || role === "teacher";
  // On an admin page an admin's Ctrl+K is AdminTopBar's; this bar answers it
  // everywhere else (lib/paletteOwner), so only one palette ever opens.
  const ownsKey = paletteFor(role, pathname) === "general";

  useEffect(() => {
    if (!ownsKey) {
      setOpen(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_GENERAL_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_GENERAL_PALETTE_EVENT, onOpen);
    };
  }, [ownsKey]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate],
  );

  // Every page by name, from the same definition as the sidebar: a page inside a section is still found here.
  const pilot = (pilotClasses.data ?? []).length > 0;
  const pages: JumpTarget[] = useMemo(
    () => allMembers(navGroupsFor(role, { pilot })).map((m) => ({ ...m, icon: navIcon(m.icon) })),
    [role, pilot],
  );

  // Live entity search once the user has typed 2+ characters.
  const { data: found } = useQuery({
    queryKey: ["palette-search", query, role],
    enabled: open && enabled && query.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const q = `%${query.trim()}%`;
      const [studentsRes, classesRes] = await Promise.all([
        role === "admin"
          ? supabase.from("students").select("id, full_name").ilike("full_name", q).eq("is_active", true).limit(6)
          : Promise.resolve({ data: [] } as any),
        supabase.from("classes").select("id, name").ilike("name", q).eq("is_active", true).limit(6),
      ]);
      return {
        students: studentsRes.data || [],
        classes: classesRes.data || [],
      };
    },
  });

  if (!enabled) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Jump to a page, search students or classes…"
        value={query}
        onValueChange={setQuery}
        className={ivory ? INPUT_IVORY : undefined}
      />
      <CommandList>
        {/* CommandEmpty lets a passed className replace its own, so it gets one only on a listed route. */}
        <CommandEmpty {...(ivory ? { className: EMPTY_IVORY } : {})}>No results.</CommandEmpty>

        {(found?.students?.length ?? 0) > 0 && (
          <CommandGroup heading="Students" className={ivory ? GROUP_IVORY : undefined}>
            {found!.students.map((s: any) => (
              <CommandItem
                key={s.id}
                value={`student ${s.full_name}`}
                onSelect={() => go(`/students/${s.id}`)}
                className={ivory ? ITEM_IVORY : undefined}
              >
                <GraduationCap className={ivory ? ICON_IVORY : "mr-2 h-4 w-4 text-blue-500"} />
                {s.full_name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(found?.classes?.length ?? 0) > 0 && (
          <CommandGroup heading="Classes" className={ivory ? GROUP_IVORY : undefined}>
            {found!.classes.map((c: any) => (
              <CommandItem
                key={c.id}
                value={`class ${c.name}`}
                onSelect={() =>
                  go(role === "admin" ? `/admin/classes/${c.id}` : `/teacher/classes/${c.id}`)
                }
                className={ivory ? ITEM_IVORY : undefined}
              >
                <School className={ivory ? ICON_IVORY : "mr-2 h-4 w-4 text-emerald-500"} />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {((found?.students?.length ?? 0) > 0 || (found?.classes?.length ?? 0) > 0) && (
          <CommandSeparator className={ivory ? "bg-hec-line" : undefined} />
        )}

        <CommandGroup heading="Go to" className={ivory ? GROUP_IVORY : undefined}>
          {pages.map((p) => (
            <CommandItem
              key={p.path + p.label}
              value={`${p.label} ${p.keywords ?? ""}`}
              onSelect={() => go(p.path)}
              className={ivory ? ITEM_IVORY : undefined}
            >
              <p.icon className={ivory ? ICON_IVORY : "mr-2 h-4 w-4 text-muted-foreground"} />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator className={ivory ? "bg-hec-line" : undefined} />
        <CommandGroup heading="Tips" className={ivory ? GROUP_IVORY : undefined}>
          <CommandItem value="shortcut help keyboard" onSelect={() => setOpen(false)} className={ivory ? ITEM_IVORY : undefined}>
            <Sparkles className={ivory ? ICON_IVORY : "mr-2 h-4 w-4 text-violet-500"} />
            Press Ctrl+K anywhere to open this bar
            <CommandShortcut className={ivory ? "pl-2 text-hec-caption tracking-wider text-hec-ink-soft" : undefined}>Ctrl K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
