import type { ComponentType } from "react";
import {
  TrendingUp, CalendarDays, ListTodo, BookOpenCheck, NotebookPen, ClipboardList, FileAudio, FileBarChart2, Images, ScanText,
  Sparkles, FolderOpen, BookOpen, Languages, Mic, Trophy, PiggyBank, LayoutGrid, UsersRound, UserCog, Building2, School,
  Receipt, Megaphone, Tv, Settings2, History, Bot, HardDrive, Plug, AudioLines,
} from "lucide-react";

export type NavIcon = ComponentType<{ className?: string }>;

const ICONS: Record<string, NavIcon> = {
  TrendingUp, CalendarDays, ListTodo, BookOpenCheck, NotebookPen, ClipboardList, FileAudio, FileBarChart2, Images, ScanText,
  Sparkles, FolderOpen, BookOpen, Languages, Mic, Trophy, PiggyBank, LayoutGrid, UsersRound, UserCog, Building2, School,
  Receipt, Megaphone, Tv, Settings2, History, Bot, HardDrive, Plug, AudioLines,
};

export const navIcon = (name: string): NavIcon => ICONS[name] ?? LayoutGrid;
