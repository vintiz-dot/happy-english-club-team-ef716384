/**
 * The name a child is called by.
 *
 * Vietnamese names are written family name first: "Nguyễn Minh Anh" is
 * Anh of the Nguyễn family, and "Hey Nguyễn!" greets the whole family.
 * The given name is therefore the LAST word of the full name.
 *
 * A preferred / short name, when the record has one, wins. There is no such
 * column today (students.full_name only), so callers pass nothing for it.
 *
 * Pure: no imports, no locale calls. Diacritics are kept as typed.
 */
export function givenName(fullName: string | null | undefined, preferred?: string | null): string {
  const p = (preferred ?? "").trim().replace(/\s+/g, " ");
  if (p) return p;
  const words = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  return words.length ? words[words.length - 1] : "";
}
