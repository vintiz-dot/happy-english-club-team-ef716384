/**
 * Which Ctrl/Cmd+K palette a staff page opens. Exactly one answers the key:
 * the admin quick-jump (AdminTopBar) for an admin on an admin-only page, the
 * general bar (CommandPalette) for any other admin or teacher page, none for
 * other roles. A teacher never gets the admin one.
 *
 * Imports nothing: it is a rule, read by both palettes.
 */

export type PaletteOwner = "admin" | "general" | null;

// The routes App.tsx guards with allowedRole="admin" (one segment each, so
// "/teachers" is admin and "/teacher/..." is not).
const ADMIN_ONLY_SEGMENTS = new Set(["admin", "students", "teachers", "classes", "families"]);

export function isAdminPage(pathname: string): boolean {
  const first = pathname.split("/").filter(Boolean)[0] ?? "";
  return ADMIN_ONLY_SEGMENTS.has(first);
}

export function paletteFor(role: string | null | undefined, pathname: string): PaletteOwner {
  if (role === "admin") return isAdminPage(pathname) ? "admin" : "general";
  if (role === "teacher") return "general";
  return null;
}

/** AdminTopBar's "Quick jump" button sends this when the page is not the admin palette's. */
export const OPEN_GENERAL_PALETTE_EVENT = "hec:open-command-palette";
