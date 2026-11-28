/**
 * The top bar's breadcrumb trail (AdminTopBar). Pure, so
 * scripts/pgtest/breadcrumbs.test.mjs can hold every crumb to the real routes.
 *
 * Until 23 Nov 2026 every prefix of the URL was a link: /teacher/classes/:id
 * offered "Teacher" (/teacher) and "Classes" (/teacher/classes), neither of
 * which is a page - a 404. Now a crumb links only to a route that exists in
 * src/App.tsx, or to the page that stands for that level (PARENT_PAGES);
 * anything else is plain text.
 */

/**
 * Every <Route path> in src/App.tsx except "*". The test reads App.tsx and
 * fails when this list and the routes differ, so a new page lands here too.
 */
export const APP_ROUTES: string[] = [
  "/", "/auth", "/.lovable/oauth/consent", "/auth/reset-password", "/claim", "/dashboard", "/watch/:token", "/feedback",
  "/teacher/videos", "/students", "/students/:id", "/teachers", "/teachers/:id", "/classes", "/families", "/families/:id",
  "/admin", "/admin/classes/:id", "/admin/tuition-review", "/students/:id/tuition", "/teacher/dashboard", "/board-window/:classId",
  "/teacher/classes/:id", "/teacher/payroll", "/teacher/attendance", "/teacher/assignments", "/teacher/journal",
  "/teacher/exam-reports", "/teacher/level-defense", "/teacher/leaderboards", "/teacher/resources", "/teacher/vocabulary-audit", "/teacher/books",
  "/teacher/language-support", "/teacher/lesson-reports", "/teacher/class-reports", "/teacher/lesson-report/:sessionId", "/class-report/:sessionId", "/transcript-matching",
  "/teacher/speakers", "/teacher/speakers/:sessionId", "/teacher/recorder", "/teacher/recorder/phone", "/admin/student-work",
  "/teacher/my-student-works", "/teacher/smart-upload", "/teacher/transcripts", "/student/dashboard", "/student/assignments",
  "/student/journal", "/student/resources", "/student/my-work", "/student/class-gallery", "/student/videos", "/student/record",
  "/student/language-support", "/student/lessons", "/student/lessons/:id", "/student/lesson-reports", "/student/defend-level",
  "/family/dashboard", "/schedule", "/tuition", "/vocabulary", "/student/vocabulary",
];

/** A level of the URL that is not a page itself, and the page that stands for it. */
export const PARENT_PAGES: Record<string, string> = {
  "/teacher": "/teacher/dashboard",
  "/teacher/classes": "/teacher/dashboard",
  "/teacher/lesson-report": "/teacher/lesson-reports",
  "/student": "/student/dashboard",
  "/family": "/family/dashboard",
  "/admin/classes": "/admin?tab=classes",
};

export type Crumb = { label: string; href?: string };

const ROUTE_LABELS: Record<string, string> = {
  admin: "Admin", students: "Students", teachers: "Teachers", families: "Families", schedule: "Schedule", classes: "Classes",
  dashboard: "Dashboard", teacher: "Teacher", student: "Student", family: "Family", attendance: "Attendance",
  assignments: "Assignments", journal: "Journal", payroll: "Payroll", leaderboards: "Leaderboards", profile: "Profile",
  "exam-reports": "Exam Reports", "lesson-report": "Lesson report", "lesson-reports": "Lesson reports", recorder: "Recorder",
  speakers: "Speakers", tuition: "Tuition",
};

const TAB_LABELS: Record<string, string> = {
  classes: "Classes", assignments: "Assignments", journal: "Journal", "exam-reports": "Exam Reports", finance: "Finance",
  payroll: "Payroll", reports: "Reports", account: "Account", automation: "Automation", data: "Data",
  announcements: "Announcements", overview: "Overview", "stars-sync": "Stars Sync",
};

/** Does this href (path, optionally with ?query / #hash) open a page of the app? */
export function isAppRoute(href: string, routes: string[] = APP_ROUTES): boolean {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const segs = path.split("/").filter(Boolean);
  return routes.some((r) => {
    const rs = r.split("/").filter(Boolean);
    return rs.length === segs.length && rs.every((x, i) => x.startsWith(":") ? segs[i].length > 0 : x === segs[i]);
  });
}

function prettifySegment(seg: string): string {
  // UUID-ish segments -> "Detail". Otherwise capitalised words.
  if (/^[0-9a-f-]{20,}$/i.test(seg)) return "Detail";
  return seg.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
}

/** The crumbs for a URL. Only the last has no href; a level with no page is plain text. */
export function buildCrumbs(pathname: string, tab: string | null): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs: Crumb[] = [];
  let acc = "";
  for (const seg of segments) {
    acc += `/${seg}`;
    const label = ROUTE_LABELS[seg] ?? prettifySegment(seg);
    const href = isAppRoute(acc) ? acc : PARENT_PAGES[acc];
    crumbs.push(href ? { label, href } : { label });
  }
  // The tab as the leaf. The page itself then links to its first tab view.
  if (tab && TAB_LABELS[tab]) crumbs.push({ label: TAB_LABELS[tab] });
  // The leaf is the page you are on: never a link.
  if (crumbs.length > 0) crumbs[crumbs.length - 1] = { label: crumbs[crumbs.length - 1].label };
  return crumbs;
}
