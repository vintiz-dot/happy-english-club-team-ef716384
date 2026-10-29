/**
 * The students a fixed-size board cannot show at once, one page at a time.
 *
 * The hook is deliberately thin: all of the arithmetic is in restPaging.ts so
 * it can be tested without a browser. This file only owns the clock.
 *
 * `rotate` is the board's own `motion` flag. With reduced motion the strip
 * stays on its first page and the label column says how many children are not
 * in view — honest, which is what the boards were missing, just not complete.
 */
import { useEffect, useState } from "react";
import { pageSlice, pageCount } from "./restPaging";

/** How long one page of the strip stays up before the next one arrives. */
export const REST_PAGE_MS = 6000;

export function useRestPaging(total: number, perPage: number, rotate: boolean) {
  const pages = pageCount(total, perPage);
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (pages <= 1 || !rotate) return;
    const id = setInterval(() => setPage((p) => (p + 1) % pages), REST_PAGE_MS);
    return () => clearInterval(id);
  }, [pages, rotate]);

  // The list can shrink under us (a category tab, a child leaving the roll),
  // so the page is clamped rather than trusted; pageSlice does that for us.
  return pageSlice(total, perPage, page);
}
