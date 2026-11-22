// Which flipbook page a slide's book reference opens. Imports nothing
// (scripts/pgtest/lesson-decks-lib.test.mjs loads it on its own).
//
// Decks cite the 2nd-edition Student Book. A class's flipbook may be the 2nd
// edition (same printed pages) or the 1st edition (different pages, sometimes
// no equivalent), so a 1e flipbook goes through the unit's explicit map. The
// flipbook's own page index (#p=) is the printed page plus the flipbook's
// offset (covers and front matter), set per flipbook in Flipbooks > Settings.

export type BookRefLite = { book: "SB" | "WB"; pages: string; activities?: string[] };
export type FirstEditionLite = { unit: number | null; pages: Record<string, { page: number | null; activity?: string; note?: string }> };
export type FlipbookLite = { url: string; edition?: string | null; page_offset?: number | null };

export type FlipTarget =
  | { ok: true; index: number; printed: number; label: string; note?: string }
  | { ok: false; label: string; reason: string };

/** The school's own course-book flipbooks, offered as one-click choices in Flipbooks > Settings.
 *  Checked page by page: in each, #p=N shows printed page N (offset 0). Levels 1 and 2 are the
 *  2nd edition the decks cite; Level 3 is a 1st-edition copy, opened through each unit's page map. */
export const SCHOOL_FLIPBOOKS: { level: number; title: string; url: string; edition: "1e" | "2e"; page_offset: number }[] = [
  { level: 1, title: "Oxford Discover 1 Student Book (2nd ed.)", url: "https://online.flipbuilder.com/sdtta/aaio/", edition: "2e", page_offset: 0 },
  { level: 2, title: "Oxford Discover 2 Student Book (2nd ed.)", url: "https://online.flipbuilder.com/sdtta/essu/", edition: "2e", page_offset: 0 },
  { level: 3, title: "Oxford Discover 3 Student Book (1st ed.)", url: "https://online.flipbuilder.com/sdtta/hhct/", edition: "1e", page_offset: 0 },
];

/** The first printed page of "116-117" (NaN when there is none). */
export const firstPage = (pages: string) => Number(String(pages).split(/[-–,\s]/)[0]);

export function flipTarget(ref: BookRefLite, flipbook: FlipbookLite | null, map?: FirstEditionLite | null): FlipTarget {
  const p = firstPage(ref.pages);
  const label2e = `SB ${ref.pages}${ref.activities?.length ? ` ${ref.activities.join(", ")}` : ""}`;
  if (!flipbook) return { ok: false, label: label2e, reason: "This class has no flipbook yet (Flipbooks > Settings)." };
  if (ref.book !== "SB") return { ok: false, label: `WB ${ref.pages}`, reason: "The flipbook is the Student Book; use the printed Workbook." };
  if (!Number.isFinite(p)) return { ok: false, label: label2e, reason: "No page number." };
  const offset = Number.isFinite(Number(flipbook.page_offset)) ? Number(flipbook.page_offset) : 0;
  if (flipbook.edition !== "1e") return { ok: true, index: p + offset, printed: p, label: `p. ${p}` };
  if (!map) return { ok: false, label: label2e, reason: "No 1st-edition page map for this unit yet." };
  const act = ref.activities?.[0];
  const hit = (act && map.pages[`SB ${p} ${act}`]) || map.pages[`SB ${p}`];
  if (!hit) return { ok: false, label: label2e, reason: "Not mapped to the 1st edition yet." };
  if (hit.page === null) return { ok: false, label: label2e, reason: hit.note ?? "The 1st edition has no equivalent." };
  return {
    ok: true,
    index: hit.page + offset,
    printed: hit.page,
    label: `1st ed. p. ${hit.page}${hit.activity ? ` ${hit.activity}` : ""}`,
    note: hit.note,
  };
}

/** The flipbook url opened at a page index (flipbuilder reads #p=N). */
export function flipbookUrl(url: string, index: number | null | undefined): string {
  const base = url.replace(/#p=\d+$/, "").replace(/#$/, "");
  if (!index || index < 1) return base;
  return `${base.includes("#") ? base.replace(/#.*$/, "") : base}#p=${Math.round(index)}`;
}

/** The page index a flipbook url points at (#p=N), or null. */
export function pageInUrl(url: string): number | null {
  const m = /#p=(\d+)/.exec(url);
  return m ? Number(m[1]) : null;
}
