/**
 * Paging the students below the podium.
 *
 * Every board is drawn at a fixed 1920x1080 and its "everyone else" strip is
 * one row tall, so a class bigger than that row cannot be shown at the drawn
 * card size. Until now the cards that did not fit were simply clipped by the
 * strip's `overflow: hidden` with nothing saying so — a nine-child class lost
 * four of its six non-podium children on the Star Board, and a seven-child
 * class lost two of four on the Night League table.
 *
 * So the strip shows one page of the row at a time and moves on, the way the
 * podium's count-up is the board's other timed moment. Every child is on the
 * board within a few seconds, and the label column always says which slice of
 * how many the room is looking at, so nothing is ever silently missing.
 *
 * The arithmetic lives here, away from the components, so the three boards
 * cannot disagree about what "fits" and so it can be tested without a browser.
 * Each board passes in the pixels it actually draws with; the page count can
 * then never drift away from the layout.
 */

/** How many cards of `cardW` fit in `trackW` with `gap` between neighbours. */
export function fitCount(trackW: number, cardW: number, gap: number): number {
  return Math.max(1, Math.floor((trackW + gap) / (cardW + gap)));
}

/**
 * How many table rows of `rowH` fit in `boxH`, with `gap` above every row
 * (the row spacing a collapsed table adds) under a header of `headH`.
 */
export function rowCount(boxH: number, rowH: number, gap: number, headH: number): number {
  return Math.max(1, Math.floor((boxH - headH + gap) / (rowH + gap)));
}

/** How many pages `total` items need at `perPage` to a page. */
export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / Math.max(1, perPage)));
}

/**
 * The slice one page shows, as indices into the list, plus the words for the
 * board's label column. `label` is null when the page already holds every
 * student, so a small class says nothing extra.
 */
export function pageSlice(total: number, perPage: number, page: number) {
  const from = Math.min(Math.max(0, page), pageCount(total, perPage) - 1) * Math.max(1, perPage);
  const to = Math.min(total, from + Math.max(1, perPage));
  return {
    from,
    to,
    label: total > perPage ? `${from + 1}\u2013${to} of ${total}` : null,
  };
}
