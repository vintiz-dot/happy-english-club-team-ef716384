/**
 * A link typed in by someone - a teacher's "work link", a resource's external
 * URL - is only ever opened if it is a plain web address.
 *
 * React does not refuse `javascript:` in an href, and `window.open` runs it.
 * The database refuses anything but http(s) in these columns too (migration
 * 20261113140000); this is the same rule where the link is rendered, so a row
 * written before that constraint, or by a path that bypasses it, still cannot
 * put a script behind a button in a child's or a parent's session.
 */
export function safeHttpUrl(url: string | null | undefined): string | undefined {
  if (typeof url !== "string") return undefined;
  const trimmed = url.trim();
  // No whitespace or control characters anywhere: browsers strip tabs and
  // newlines inside a scheme, which is how "java\nscript:" gets through
  // looser checks.
  // eslint-disable-next-line no-control-regex
  if (!/^https?:\/\/[^\s\u0000-\u001f\u007f]+$/i.test(trimmed)) return undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

/** window.open for a link that came from a row; does nothing unless it is http(s). */
export function openHttpUrl(url: string | null | undefined): boolean {
  const safe = safeHttpUrl(url);
  if (!safe) return false;
  window.open(safe, "_blank", "noopener");
  return true;
}
