/**
 * CommandPalette — global Cmd+K / Ctrl+K command bar for admins & teachers.
 *
 * Jump between pages, search students and classes, and fire quick actions
 * (smart upload, transcript analysis, leaderboards) in under two seconds
 * without touching the mouse. Mounted once in Layout.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIvory } from "@/hooks/useIvory";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutGrid, UsersRound, UserCog, School, CalendarDays, Trophy,
  ScanText, AudioLines, BookOpen, GraduationCap, PiggyBank,
  NotebookPen, Sparkles, FileBarChart2, ListTodo,
  Languages,
} from "lucide-react";

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
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ivory = useIvory();

  const enabled = role === "admin" || role === "teacher";

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);

  const go = useCallback(
    (path: string) => {
      setOpen(false);
      setQuery("");
      navigate(path);
    },
    [navigate],
  );

  const pages: JumpTarget[] = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "Dashboard", path: "/admin", icon: LayoutGrid },
        { label: "Students", path: "/students", icon: UsersRound },
        { label: "Teachers", path: "/teachers", icon: UserCog },
        { label: "Classes", path: "/admin?tab=classes", icon: School },
        { label: "Schedule", path: "/schedule", icon: CalendarDays },
        { label: "Finance", path: "/admin?tab=finance", icon: PiggyBank },
        { label: "Exam Reports", path: "/admin?tab=exam-reports", icon: FileBarChart2 },
        { label: "Journal", path: "/admin?tab=journal", icon: NotebookPen },
        { label: "Smart Upload (OCR)", path: "/teacher/smart-upload", icon: ScanText, keywords: "ocr scan photo vision bulk upload" },
        { label: "Transcript Insights", path: "/teacher/transcripts", icon: AudioLines, keywords: "transcript lesson analysis engagement" },
        { label: "Flipbooks", path: "/teacher/books", icon: BookOpen },
      { label: "Language Support", path: "/teacher/language-support", icon: Languages, keywords: "picture pictures sentence esl symbols arasaac widgit reader" },
      ];
    }
    return [
      { label: "Dashboard", path: "/dashboard", icon: LayoutGrid },
      { label: "Schedule", path: "/schedule", icon: CalendarDays },
      { label: "Leaderboard", path: "/teacher/leaderboards", icon: Trophy, keywords: "points award" },
      { label: "Attendance", path: "/teacher/attendance", icon: ListTodo },
      { label: "Assignments", path: "/teacher/assignments", icon: ListTodo },
      { label: "Journal", path: "/teacher/journal", icon: NotebookPen },
      { label: "Exam Reports", path: "/teacher/exam-reports", icon: FileBarChart2 },
      { label: "Vocabulary Audit", path: "/teacher/vocabulary-audit", icon: Sparkles },
      { label: "Smart Upload (OCR)", path: "/teacher/smart-upload", icon: ScanText, keywords: "ocr scan photo vision bulk upload" },
      { label: "Transcript Insights", path: "/teacher/transcripts", icon: AudioLines, keywords: "transcript lesson analysis engagement" },
      { label: "Flipbooks", path: "/teacher/books", icon: BookOpen },
      { label: "Language Support", path: "/teacher/language-support", icon: Languages, keywords: "picture pictures sentence esl symbols arasaac widgit reader" },
      { label: "Class recorder", path: "/teacher/recorder", icon: AudioLines, keywords: "record recording microphone lapel s500 audio lesson" },
    ];
  }, [role]);

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
