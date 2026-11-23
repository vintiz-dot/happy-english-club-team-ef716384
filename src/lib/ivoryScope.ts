/**
 * Where the "Ivory" design system is switched on (docs/DESIGN_SYSTEM.md,
 * rollout plan docs/evidence/A4.6-rollout-plan.md).
 *
 * The system's tokens and the bridge to the old token names live under
 * [data-hec-theme="ivory"]. During the rollout that attribute is put on
 * <html> by <IvoryScope> ONLY while the current route is listed here, so:
 *   - a listed (migrated) screen is ivory from the header to its dialogs,
 *     portals included, in light and dark;
 *   - an unlisted screen is exactly what it was before the rollout - the
 *     shared primitives and the shell keep their old classes there.
 * A screen is never half old, half new. A batch adds its routes here in
 * the same commit that restyles them; an AREA (student, parent, teacher,
 * admin) ships to main when all its routes are listed.
 *
 * Every area is listed, so ROLLOUT_COMPLETE is true (R24): the attribute is
 * on <html> everywhere except OUTSIDE_ROUTES, and the theme default is
 * System. The list stays as the record of what was migrated when.
 *
 * Pure: no imports.
 */

export const ROLLOUT_COMPLETE = true;

export interface IvoryRoute {
  /** Path, with ":param" for a dynamic segment ("/student/lessons/:id"). */
  path: string;
  /**
   * For screens chosen by ?tab= (the admin dashboard): the tab value that is
   * migrated; "" means "no tab" (the default view). Omitted: any tab.
   */
  tab?: string;
  /**
   * For a route that several roles share but that belongs to a different area
   * per role (`/tuition`: the student/parent view, and the admin's tuition
   * list): the roles that get the system there. Omitted: every role. While
   * the role is not known yet (null) such an entry does not match, so a staff
   * member never sees the new look on a staff screen, even for a moment.
   */
  roles?: string[];
}

export const IVORY_ROUTES: IvoryRoute[] = [
  // A4.2 pilot, approved by the owner (D-12). Every tab of the dashboard.
  { path: "/student/dashboard" },
  { path: "/student" },
  // R08, the student flip: every other route a student (or a parent viewing a
  // child) reaches. These pages have no staff branch, so they are listed for
  // every role.
  { path: "/student/assignments" },
  { path: "/student/journal" },
  { path: "/student/resources" },
  { path: "/student/my-work" },
  { path: "/student/videos" },
  { path: "/student/record" },
  { path: "/student/language-support" },
  { path: "/student/lessons" },
  { path: "/student/lessons/:id" },
  { path: "/student/defend-level" },
  { path: "/student/vocabulary" },
  { path: "/vocabulary" },
  // Shared with the admin's tuition list and a teacher's "access denied": the
  // student / parent view flipped with R08, the staff view with R21 (below).
  { path: "/tuition", roles: ["student", "family"] },

  // R21, the staff flip: every admin and teacher route. The admin dashboard is
  // listed per ?tab=; "" and "overview" are the default view.
  { path: "/admin", tab: "" },
  { path: "/admin", tab: "overview" },
  { path: "/admin", tab: "classes" },
  { path: "/admin", tab: "assignments" },
  { path: "/admin", tab: "journal" },
  { path: "/admin", tab: "exam-reports" },
  { path: "/admin", tab: "finance" },
  { path: "/admin", tab: "payroll" },
  { path: "/admin", tab: "reports" },
  { path: "/admin", tab: "account" },
  { path: "/admin", tab: "automation" },
  { path: "/admin", tab: "data" },
  { path: "/admin", tab: "activity" },
  { path: "/admin", tab: "announcements" },
  { path: "/admin", tab: "stars-sync" },
  { path: "/admin", tab: "ai-actions" },
  { path: "/admin/classes/:id" },
  { path: "/admin/tuition-review" },
  { path: "/students" },
  { path: "/students/:id" },
  { path: "/students/:id/tuition" },
  { path: "/teachers" },
  { path: "/teachers/:id" },
  { path: "/classes" },
  { path: "/families" },
  { path: "/families/:id" },
  { path: "/teacher/dashboard" },
  { path: "/teacher/classes/:id" },
  { path: "/teacher/payroll" },
  { path: "/teacher/attendance" },
  { path: "/teacher/assignments" },
  { path: "/teacher/journal" },
  { path: "/teacher/exam-reports" },
  { path: "/teacher/leaderboards" },
  { path: "/teacher/resources" },
  { path: "/teacher/vocabulary-audit" },
  { path: "/teacher/books" },
  { path: "/teacher/language-support" },
  { path: "/teacher/lesson-reports" },
  { path: "/teacher/smart-upload" },
  { path: "/teacher/transcripts" },
  { path: "/teacher/videos" },
  { path: "/board-window/:classId" },
  // Shared with the student and the parent: the staff roles flipped with R21,
  // the family's and the student's view with R24.
  { path: "/schedule", roles: ["admin", "teacher", "family", "student"] },
  { path: "/tuition", roles: ["admin", "teacher"] },
  { path: "/dashboard", roles: ["admin", "teacher"] },
  // Released by the owner on 23 Nov 2026: the recorder, audit clips, /feedback.\n  { path: "/teacher/recorder" },\n  { path: "/admin", tab: "audit-clips" },\n  { path: "/feedback" },\n
  // parent + public (R23)
  { path: "/family/dashboard" },
  { path: "/watch/:token" },
  { path: "/claim" },
  { path: "/auth" },
  { path: "/auth/reset-password" },
  // "/" is the family hub (R23) and the teacher hub (R24). Students and admins
  // are redirected from it; signed out it sends to /auth.
  { path: "/", roles: ["family", "teacher"] },
];

/**
 * Screens kept outside the system even with ROLLOUT_COMPLETE (DESIGN_SYSTEM
 * s.17). Empty: the owner released the recorder, the audit-clips tab and the
 * public /feedback page on 23 Nov 2026. A screen put here keeps today's look
 * from the header down; releasing it = deleting its line.
 */
export const OUTSIDE_ROUTES: IvoryRoute[] = [];

const trimSlash = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

function pathMatches(pattern: string, pathname: string): boolean {
  const a = trimSlash(pattern).split("/");
  const b = trimSlash(pathname).split("/");
  if (a.length !== b.length) return false;
  return a.every((seg, i) => (seg.startsWith(":") ? b[i].length > 0 : seg === b[i]));
}

export function isIvoryRoute(
  pathname: string,
  search = "",
  routes: IvoryRoute[] = IVORY_ROUTES,
  complete: boolean = ROLLOUT_COMPLETE,
  role: string | null = null,
  outside: IvoryRoute[] = OUTSIDE_ROUTES,
): boolean {
  const tab = new URLSearchParams(search).get("tab") ?? "";
  const listed = (list: IvoryRoute[]) =>
    list.some(
      (r) =>
        pathMatches(r.path, pathname) &&
        (r.tab === undefined || r.tab === tab) &&
        (r.roles === undefined || (role !== null && r.roles.includes(role))),
    );
  if (listed(outside)) return false;
  if (complete) return true;
  return listed(routes);
}

/** Theme choice: Light until the rollout is complete (owner's default), then System. */
export type ThemeChoice = "system" | "light" | "dark";
export const DEFAULT_THEME: ThemeChoice = ROLLOUT_COMPLETE ? "system" : "light";

/** Remembered per device AND per signed-in user (a family tablet is shared). */
export const themeKey = (userId: string | null | undefined) => `hec-theme:${userId || "signed-out"}`;
/** What the inline script in index.html reads before the first paint. */
export const BOOT_KEY = "hec-theme-boot";

export function readThemeChoice(value: string | null | undefined): ThemeChoice {
  return value === "system" || value === "light" || value === "dark" ? value : DEFAULT_THEME;
}
