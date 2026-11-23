// The sidebar's one definition (pure, no React). A SECTION is one sidebar entry; its member
// pages show a shared tab strip (SectionTabs), so every page keeps its own URL. Icons are
// names here and become components in components/navIcons.ts. Used by Layout (sidebar and
// mobile menu), SectionTabs and CommandPalette.

export type NavRole = "admin" | "teacher";

export interface NavMember {
  label: string;
  path: string;
  icon: string;
  keywords?: string;
  /** Shown only to a teacher of a lesson-monitor pilot class. */
  pilotOnly?: boolean;
}
export interface NavSection {
  id: string;
  label: string;
  icon: string;
  members: NavMember[];
}
export interface NavGroup {
  id: string;
  /** No label: the entries are listed without a heading (the teacher's menu). */
  label?: string;
  sections: NavSection[];
}

const one = (label: string, path: string, icon: string, keywords?: string): NavSection => ({
  id: path, label, icon, members: [{ label, path, icon, keywords }],
});

const OCR = "ocr scan photo vision bulk upload";
const REC = "record recording microphone lapel s500 audio lesson transcript analysis engagement";
const LANG = "picture pictures sentence esl symbols arasaac widgit reader";

export const TEACHER_GROUPS: NavGroup[] = [{
  id: "teacher",
  sections: [
    one("Dashboard", "/dashboard", "TrendingUp"),
    {
      id: "schedule-attendance", label: "Schedule & attendance", icon: "CalendarDays",
      members: [
        { label: "Schedule", path: "/schedule", icon: "CalendarDays" },
        { label: "Attendance", path: "/teacher/attendance", icon: "ListTodo" },
      ],
    },
    one("Assignments", "/teacher/assignments", "BookOpenCheck"),
    {
      id: "class-notes", label: "Class notes & reports", icon: "NotebookPen",
      members: [
        { label: "Journal", path: "/teacher/journal", icon: "NotebookPen" },
        { label: "Class reports", path: "/teacher/class-reports", icon: "ClipboardList" },
        { label: "Lesson reports", path: "/teacher/lesson-reports", icon: "FileAudio", pilotOnly: true },
        { label: "Exam reports", path: "/teacher/exam-reports", icon: "FileBarChart2" },
      ],
    },
    {
      id: "student-work", label: "Student work", icon: "Images",
      members: [
        { label: "My student works", path: "/teacher/my-student-works", icon: "Images" },
        { label: "Smart Upload", path: "/teacher/smart-upload", icon: "ScanText", keywords: OCR },
        { label: "Vocabulary audit", path: "/teacher/vocabulary-audit", icon: "Sparkles" },
      ],
    },
    {
      id: "materials", label: "Teaching materials", icon: "FolderOpen",
      members: [
        { label: "Resources", path: "/teacher/resources", icon: "FolderOpen" },
        { label: "Flipbooks", path: "/teacher/books", icon: "BookOpen" },
        { label: "Language support", path: "/teacher/language-support", icon: "Languages", keywords: LANG },
      ],
    },
    one("Record & transcripts", "/teacher/recorder", "Mic", REC),
    one("Leaderboard", "/teacher/leaderboards", "Trophy", "points award"),
    one("Payroll", "/teacher/payroll", "PiggyBank"),
  ],
}];

export const ADMIN_GROUPS: NavGroup[] = [
  { id: "overview", label: "Overview", sections: [one("Dashboard", "/admin", "LayoutGrid")] },
  { id: "people", label: "People", sections: [
    one("Students", "/students", "UsersRound"),
    one("Teachers", "/teachers", "UserCog"),
    one("Families", "/families", "Building2"),
    one("Classes", "/admin?tab=classes", "School"),
  ] },
  { id: "teaching", label: "Teaching", sections: [
    one("Schedule", "/schedule", "CalendarDays"),
    one("Assignments", "/admin?tab=assignments", "ListTodo"),
    one("Journal", "/admin?tab=journal", "NotebookPen"),
    one("Exam Reports", "/admin?tab=exam-reports", "FileBarChart2"),
    one("Class reports", "/teacher/class-reports", "ClipboardList"),
    one("Student Work", "/admin/student-work", "Images"),
    one("Smart Upload", "/teacher/smart-upload", "ScanText", OCR),
    one("Record & transcripts", "/teacher/recorder", "Mic", REC),
    one("Flipbooks", "/teacher/books", "BookOpen"),
    one("Language Support", "/teacher/language-support", "Languages", LANG),
  ] },
  { id: "money", label: "Money", sections: [
    one("Finance", "/admin?tab=finance", "PiggyBank"),
    one("Payroll", "/admin?tab=payroll", "Receipt"),
    one("Reports", "/admin?tab=reports", "TrendingUp"),
  ] },
  { id: "front-desk", label: "Front desk", sections: [
    one("Announcements", "/admin?tab=announcements", "Megaphone"),
    one("Reception TV", "/admin?tab=reception", "Tv"),
  ] },
  { id: "system", label: "System", sections: [
    one("Automation", "/admin?tab=automation", "Settings2"),
    one("Activity", "/admin?tab=activity", "History"),
    one("AI actions", "/admin?tab=ai-actions", "Bot"),
    one("Data", "/admin?tab=data", "HardDrive"),
    one("Stars Sync", "/admin?tab=stars-sync", "Plug"),
    one("Audit clips", "/admin?tab=audit-clips", "AudioLines"),
  ] },
];

/** The groups a role sees; a pilot-only member is dropped unless `pilot`, and a section left empty is dropped. */
export function navGroupsFor(role: string | null | undefined, opts: { pilot?: boolean } = {}): NavGroup[] {
  const src = role === "admin" ? ADMIN_GROUPS : role === "teacher" ? TEACHER_GROUPS : [];
  return src
    .map((g) => ({
      ...g,
      sections: g.sections
        .map((s) => ({ ...s, members: s.members.filter((m) => !m.pilotOnly || opts.pilot) }))
        .filter((s) => s.members.length > 0),
    }))
    .filter((g) => g.sections.length > 0);
}

/** A member is current when its path is the page, or (with a ?tab=) the page and query. */
export const navPathActive = (itemPath: string, pathname: string, search: string) =>
  itemPath.includes("?") ? pathname + search === itemPath : pathname === itemPath && !search;

export const sectionIsActive = (s: NavSection, pathname: string, search: string) =>
  s.members.some((m) => navPathActive(m.path, pathname, search));

export const sectionOfPath = (groups: NavGroup[], pathname: string, search = ""): NavSection | undefined =>
  groups.flatMap((g) => g.sections).find((s) => sectionIsActive(s, pathname, search));

export const groupOfPath = (groups: NavGroup[], pathname: string, search = ""): NavGroup | undefined =>
  groups.find((g) => g.sections.some((s) => sectionIsActive(s, pathname, search)));

/** Every page a role can reach by name (the command palette's list). */
export const allMembers = (groups: NavGroup[]): NavMember[] => groups.flatMap((g) => g.sections.flatMap((s) => s.members));
