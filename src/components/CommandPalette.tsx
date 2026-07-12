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
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from "@/components/ui/command";
import {
  LayoutGrid, UsersRound, UserCog, School, CalendarDays, Trophy,
  ScanText, AudioLines, BookOpen, GraduationCap, PiggyBank,
  NotebookPen, Sparkles, FileBarChart2, ListTodo,
} from "lucide-react";

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
      />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        {(found?.students?.length ?? 0) > 0 && (
          <CommandGroup heading="Students">
            {found!.students.map((s: any) => (
              <CommandItem
                key={s.id}
                value={`student ${s.full_name}`}
                onSelect={() => go(`/students/${s.id}`)}
              >
                <GraduationCap className="mr-2 h-4 w-4 text-blue-500" />
                {s.full_name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {(found?.classes?.length ?? 0) > 0 && (
          <CommandGroup heading="Classes">
            {found!.classes.map((c: any) => (
              <CommandItem
                key={c.id}
                value={`class ${c.name}`}
                onSelect={() =>
                  go(role === "admin" ? `/admin/classes/${c.id}` : `/teacher/classes/${c.id}`)
                }
              >
                <School className="mr-2 h-4 w-4 text-emerald-500" />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {((found?.students?.length ?? 0) > 0 || (found?.classes?.length ?? 0) > 0) && (
          <CommandSeparator />
        )}

        <CommandGroup heading="Go to">
          {pages.map((p) => (
            <CommandItem
              key={p.path + p.label}
              value={`${p.label} ${p.keywords ?? ""}`}
              onSelect={() => go(p.path)}
            >
              <p.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {p.label}
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Tips">
          <CommandItem value="shortcut help keyboard" onSelect={() => setOpen(false)}>
            <Sparkles className="mr-2 h-4 w-4 text-violet-500" />
            Press Ctrl+K anywhere to open this bar
            <CommandShortcut>Ctrl K</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
