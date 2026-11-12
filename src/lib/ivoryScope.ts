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
 * When every area is listed, ROLLOUT_COMPLETE becomes true: the attribute
 * is on <html> everywhere, the theme default moves from Light to System,
 * and the old class strings in src/components/ui can be deleted.
 *
 * Pure: no imports.
 */

export const ROLLOUT_COMPLETE = false;

export interface IvoryRoute {
  /** Path, with ":param" for a dynamic segment ("/student/lessons/:id"). */
  path: string;
  /**
   * For screens chosen by ?tab= (the admin dashboard): the tab value that is
   * migrated; "" means "no tab" (the default view). Omitted: any tab.
   */
  tab?: string;
}

export const IVORY_ROUTES: IvoryRoute[] = [
  // A4.2 pilot, approved by the owner (D-12). Every tab of the dashboard.
  { path: "/student/dashboard" },
  { path: "/student" },
];

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
): boolean {
  if (complete) return true;
  const tab = new URLSearchParams(search).get("tab") ?? "";
  return routes.some((r) => pathMatches(r.path, pathname) && (r.tab === undefined || r.tab === tab));
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
