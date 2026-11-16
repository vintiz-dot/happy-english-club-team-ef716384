# HEC Docs style guide

**Premium means restraint.** Generous whitespace, one alignment grid, the same components everywhere. Decoration has to earn its place.

## Paper and colour

Light paper only, never a dark page or card. All values are tokens in `tokens/base.tokens.json`.

| Token | Hex | Use | Contrast on paper |
|---|---|---|---|
| `color-paper` | #FBF8F1 | Warm ivory page | – |
| `color-surface` / `-strong` | #F4EEE0 / #ECE3CE | Callouts, total rows, meter tracks | – |
| `color-ink` | #14213D | Deep navy: headings, body, figures | 15.1:1 |
| `color-ink-soft` | #34405E | Secondary text, closings | 9.7:1 |
| `color-muted` | #59617A | Labels, captions, page furniture | 5.8:1 (AA) |
| `color-gold-ink` | #7A5C1E | Eyebrows (small gold text) | 5.9:1 (AA) |
| `color-gold` | #B8975A | Fine hairlines only, never text | decorative |
| `color-accent` | #FFF200 | HEC yellow (logo master), for fills behind navy only | never text |
| `color-accent-deep` | #E9B300 | Print-safe yellow: the short bar under the header, callout edge, logo swoosh | decorative |

- **Grayscale:** every structural colour keeps a luminance step from paper; unit tests enforce this.
- **Colour never carries meaning alone.** Signs, labels and position do.

## Type

- **Display:** Cormorant Garamond 500/600/700. Used for titles, the student's name, section heads, the tagline and the sign-off.
- **Body:** Be Vietnam Pro 400–700, a humanist sans drawn for Vietnamese. Used for everything else.
- **Fallbacks:** Noto Sans Math, Noto Sans Symbols 2 and Noto Emoji (monochrome) are bundled for pasted arrows, symbols and emoji, so no glyph ever falls back to a system font.
- **Scale (ratio ≈1.25, base 9.5 pt):** 7.5 · 8.5 · **9.5** · 11.5 · 14.5 · 18 · 22.5 · 28 pt. Body leading is 1.5; teacher text uses 1.7.
- **Figures:** money and counts use tabular lining figures, right-aligned.
- **Case:** content keeps its own case. `text-transform` is reserved for brand eyebrows, so copied or extracted text is exactly the original.

## Space and page

- **Grid:** 8 pt: 4 · 8 · 16 · 24 · 32 · 40 · 48 · 64.
- **Page:** A4 portrait. Margins are 20 mm top, 22 mm bottom and 18 mm sides, inside every printer's safe area.
- **Breaks:** orphans and widows are 3. Headings never end a page (`break-after: avoid`). Table rows, callouts, sign-offs and total blocks are never split. Table headers repeat on every page.

## The fixed brand frame (every document)

1. **Page 1 header lockup:** the navy logo with its yellow swoosh at 21 mm, "Happy English Club" in display type, and "Câu lạc bộ Tiếng Anh" beneath. The document eyebrow and title sit on the right. Under it runs a gold hairline with a short yellow bar at the left.
2. **Pages 2+:** a small logo top-left and the document's running title top-right.
3. **Footer, every page:** the tagline *Learning, an endless journey to perfection* in italic display at the left, and the page number `x / y` at the right.
4. **Closing (where it fits the document):** an encouragement line, the sign-off from Teacher Victor, and the QR to hanoienglish.com.

## Components (`components/ui.njk`)

`header` · `identity` (the student's name as hero) · `kv` · `section` · `callout` (note / warn / praise) · `.t` table (`num`, `t__total`, `tfoot`) · `answer_lines` · `checklist` · `meter` · `signature` · `encourage` · `qr_footer` · `rich` (sanitised teacher text) · `colophon`.

Add a component only when two documents would use it. Put it in `components/ui/` and `components/css/`, built from tokens only.

## Voice of the brand layer

- **Warmth, belonging, pride.** The child's name is the largest thing on the page. Milestones and achievements are stated plainly.
- **Encouragement rotates** through the tenant's list, chosen by a stable hash of the document, so a reprint does not change it.
- **Parent-facing reassurance** is factual: who to ask and how.
- **Never:** urgency, guilt, countdowns, or claims we cannot back.

## Document rules

- **Tuition:** clarity first. Amount due, period, dates and payment details come first and are easy to find. Formatting of numbers, dates and currency is byte-identical to the app.
- **Homework:** a clear task hierarchy and generous writing space (the `writing-space` variant). Teacher content is printed exactly as the app shows it.
- **Letters / bilingual:** English first, Vietnamese beneath or beside it, marked `lang="vi"`.
