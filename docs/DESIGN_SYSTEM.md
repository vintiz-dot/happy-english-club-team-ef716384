# HEC Design System - "Ivory"

Where I am / next step: all sections written; next = verify every class in the doc compiles, final build + evidence file, then remove this line.

Status: tokens exist and are inert. Nothing uses them until an element carries `data-hec-theme="ivory"`. The first screen to do so is the student dashboard (task A4.2); the rest of the app waits for the owner's approval at the design checkpoint.

Sources of truth: the values are in `src/index.css` (the block headed `"Ivory" design system`), the class names in `tailwind.config.ts` (`hec` colours, `font-display`, `text-hec-*`, `shadow-hec-*`, `rounded-hec-*`, `duration-hec-*`, `ease-hec`, `min-h-hec-target`). `node scripts/design-tokens-check.mjs` checks both and prints the tables in section 3. If this document and the CSS disagree, the CSS and the script are right and this document is out of date.

## 1. Principles

1. Calm before clever. One thing per screen asks for attention; everything else is quiet ink on ivory.
2. Ink and ivory carry the interface. Brass is the one accent and marks only what can be acted on or what is selected.
3. Colour means something or it is not there. Leaf is growth, amber is caution, red is loss or a thing that cannot be undone. No decoration in those three.
4. The child's name, the amount of money and the destructive button are never cut off, never ambiguous, never styled for effect.
5. Phone first, 375 px wide, one thumb. Motion is slow, small, and switches off when the device asks.

## 2. How the scope works

All tokens live under an attribute selector, so they exist only where the attribute is.

| Selector | Theme | When it matches |
|---|---|---|
| `[data-hec-theme="ivory"]` | light | the attribute anywhere: on an inner root now, on `<html>` after rollout |
| `.dark[data-hec-theme="ivory"]` | dark | the attribute on the same element as the `dark` class (`<html>`, after rollout) |
| `.dark [data-hec-theme="ivory"]` | dark | the attribute on an inner root below `<html class="dark">` (the checkpoint) |

- The two dark spellings are always written together. The check script fails if one carries a declaration the other lacks.
- Tokens that are the same in both themes (fonts, sizes, radius, motion, and the bridge below) are declared once under all three selectors. They are therefore defined in both themes without being written twice.
- Why it wins the cascade: the block is the last thing in `index.css` and is not in a Tailwind layer, so at equal specificity it comes after `:root` and `.dark`; on an inner root it also wins by being closer than `<html>`.
- **The bridge.** Inside the scope the existing names (`--background`, `--foreground`, `--card`, `--primary`, `--muted`, `--border`, `--input`, `--ring`, `--radius`, `--destructive`, `--success`, `--warning`, the `--sidebar-*`, `--surface-*`, `--shadow-*` and `-glass` names, `--font-sans`, `--font-display`) are pointed at the new tokens. So `bg-background`, `text-muted-foreground`, `<Button>`, `<Card>` take the new look inside the scope without an edit, and keep their old look outside it. `--primary` becomes ink (not brass), `--accent` becomes the hover wash (shadcn uses it as one), `--input` becomes the 3:1 control border.
- **Portals.** Radix dialogs, popovers, tooltips, selects and toasts render under `<body>`, outside an inner scoped root. While the attribute is on an inner root, a portalled surface opened from that screen must carry `data-hec-theme="ivory"` on its own content element (`<DialogContent data-hec-theme="ivory">`), or it keeps the old look. Once the attribute is on `<html>` this goes away.
- **Moving to `<html>`** (first step of the rollout): set the attribute on `<html>`, delete it from inner roots and portals. No CSS change is needed.
- The scoped root also sets `color` and `font-family`. It does not set a background: put `bg-hec-paper` on the root yourself (on `<html>`, `body`'s existing `bg-background` picks it up through the bridge).
- Young scale: add `data-hec-scale="young"` to the scoped root or anything inside it (section 4).

## 3. Palette

Names are Tailwind names: `bg-hec-paper`, `text-hec-ink-soft`, `border-hec-line`, and so on; opacity works (`bg-hec-scrim/60`).

| Role | Token | Use |
|---|---|---|
| Page | `hec-paper` | the background of a screen |
| Card | `hec-surface` | cards, bars, list containers |
| Raised | `hec-raised` | dialogs, popovers, input fields |
| Sunken | `hec-sunken` | wells, progress tracks, hover wash, neutral badges |
| Honey | `hec-honey` | the warm card of the young scale; nowhere else |
| Ink | `hec-ink` / `hec-ink-soft` / `hec-ink-faint` | text: primary / secondary / captions and placeholders |
| Hairline | `hec-line` | 1 px separators and card edges. Decoration: never the only thing that shows where a control is |
| Control edge | `hec-line-strong` | borders of inputs, outline buttons, checkboxes (3:1) |
| Brass | `hec-brass` | links, the active-tab mark, progress fill, accent icons, focus ring |
| Brass fill | `hec-brass-fill` + `hec-on-brass` | the single hero action of a screen, at most one |
| Action | `hec-action` + `hec-on-action` | the primary button (ink in light, ivory in dark), tooltips |
| Leaf | `hec-leaf` / `hec-leaf-tint` | success, growth, "done" |
| Warn | `hec-warn` / `hec-warn-tint` | caution, due soon, needs attention |
| Danger | `hec-danger` / `hec-danger-fill` + `hec-on-danger` / `hec-danger-tint` | errors, overdue, cancellation, anything that cannot be undone |
| Ring | `hec-ring` | focus outline (= brass) |
| Logo | `hec-logo` | the mark's own green, for the mark and non-text flourishes only |
| Scrim | `hec-scrim` | behind a dialog at `/60` |

**The logo's green.** The logo is leaf green (about `#8CC63F`), not navy or brass. It stays exactly as it is on the mark. As a colour in the interface it appears only darkened, as `hec-leaf`, and only for success and growth. Raw logo green reaches about 1.8:1 on ivory, so it never carries text, an icon that means something, or a control edge on a light surface; the script fails if that ever stops being true.

### Values

Printed by `node scripts/design-tokens-check.mjs` from `src/index.css`; paste again whenever a value changes.

| Token | Light HSL | Light hex | Dark HSL | Dark hex |
|---|---|---|---|---|
| `--hec-paper` | 42 45% 94% | #F7F2E9 | 220 49% 8% | #0A111E |
| `--hec-surface` | 43 64% 98% | #FDFBF7 | 220 44% 12% | #111A2C |
| `--hec-raised` | 45 100% 99% | #FFFEFA | 221 41% 16% | #18233A |
| `--hec-sunken` | 41 37% 90% | #EFE9DC | 221 53% 6% | #070C17 |
| `--hec-honey` | 42 78% 91% | #FAEFD6 | 39 38% 10% | #231C10 |
| `--hec-ink` | 222 48% 14% | #131D35 | 42 42% 89% | #EFE8D7 |
| `--hec-ink-soft` | 223 19% 33% | #444D64 | 45 11% 71% | #BDB9AD |
| `--hec-ink-faint` | 223 12% 40% | #5A6172 | 44 6% 61% | #A29E96 |
| `--hec-line` | 41 28% 84% | #E2DACB | 221 30% 20% | #242D42 |
| `--hec-line-strong` | 43 9% 46% | #807A6B | 224 13% 50% | #6F7890 |
| `--hec-brass` | 40 63% 28% | #74561A | 41 58% 65% | #DAB972 |
| `--hec-brass-fill` | 41 58% 40% | #A17C2B | 40 50% 57% | #C8A45B |
| `--hec-on-brass` | 222 55% 9% | #0A1224 | 220 49% 8% | #0A111E |
| `--hec-action` | 222 48% 14% | #131D35 | 42 42% 89% | #EFE8D7 |
| `--hec-on-action` | 42 45% 94% | #F7F2E9 | 220 49% 8% | #0A111E |
| `--hec-leaf` | 101 60% 26% | #346A1B | 87 55% 59% | #9CD05D |
| `--hec-leaf-tint` | 85 41% 89% | #E5EED7 | 102 46% 11% | #17290F |
| `--hec-warn` | 29 100% 28% | #8F4500 | 31 90% 61% | #F59F42 |
| `--hec-warn-tint` | 35 88% 90% | #FCE9CF | 33 70% 11% | #301E08 |
| `--hec-danger` | 358 76% 36% | #A2161B | 5 100% 75% | #FF8A80 |
| `--hec-danger-fill` | 3 71% 41% | #B3261E | 3 66% 50% | #D4342B |
| `--hec-on-danger` | 0 0% 100% | #FFFFFF | 0 0% 100% | #FFFFFF |
| `--hec-danger-tint` | 7 76% 93% | #FBE3E0 | 3 55% 13% | #33110F |
| `--hec-ring` | 40 63% 28% | #74561A | 41 58% 65% | #DAB972 |
| `--hec-logo` | 86 54% 51% | #8BC63F | 86 54% 51% | #8BC63F |
| `--hec-scrim` | 222 48% 10% | #0D1526 | 220 60% 3% | #03060C |
| `--hec-shadow-tint` | 222 48% 14% | #131D35 | 220 60% 2% | #020408 |

### Contrast

WCAG 2.x relative luminance, computed from the token values after rounding to 8-bit sRGB, ratios floored to two decimals. Text needs 4.5:1; control borders, the focus ring and button edges need 3:1. Every row passes in both themes; the script exits 1 otherwise.

| Foreground | Background | Use | Min | Light | Dark |
|---|---|---|---|---|---|
| `ink` | `paper` | text | 4.5 | 15.00 | 15.46 |
| `ink` | `surface` | text | 4.5 | 16.19 | 14.23 |
| `ink` | `raised` | text | 4.5 | 16.58 | 12.82 |
| `ink` | `sunken` | text | 4.5 | 13.83 | 16.00 |
| `ink` | `honey` | text | 4.5 | 14.64 | 13.80 |
| `ink-soft` | `paper` | text | 4.5 | 7.55 | 9.62 |
| `ink-soft` | `surface` | text | 4.5 | 8.15 | 8.86 |
| `ink-soft` | `raised` | text | 4.5 | 8.35 | 7.98 |
| `ink-soft` | `sunken` | text | 4.5 | 6.96 | 9.96 |
| `ink-soft` | `honey` | text | 4.5 | 7.37 | 8.59 |
| `ink-faint` | `paper` | text | 4.5 | 5.55 | 7.07 |
| `ink-faint` | `surface` | text | 4.5 | 5.99 | 6.51 |
| `ink-faint` | `raised` | text | 4.5 | 6.14 | 5.86 |
| `ink-faint` | `sunken` | text | 4.5 | 5.12 | 7.32 |
| `ink-faint` | `honey` | text | 4.5 | 5.42 | 6.31 |
| `brass` | `paper` | text | 4.5 | 6.09 | 10.04 |
| `brass` | `surface` | text | 4.5 | 6.57 | 9.24 |
| `brass` | `raised` | text | 4.5 | 6.73 | 8.32 |
| `brass` | `sunken` | text | 4.5 | 5.62 | 10.39 |
| `brass` | `honey` | text | 4.5 | 5.95 | 8.96 |
| `leaf` | `paper` | text | 4.5 | 5.84 | 10.42 |
| `leaf` | `surface` | text | 4.5 | 6.30 | 9.59 |
| `leaf` | `raised` | text | 4.5 | 6.45 | 8.64 |
| `leaf` | `sunken` | text | 4.5 | 5.38 | 10.79 |
| `leaf` | `honey` | text | 4.5 | 5.70 | 9.31 |
| `warn` | `paper` | text | 4.5 | 6.23 | 8.92 |
| `warn` | `surface` | text | 4.5 | 6.72 | 8.21 |
| `warn` | `raised` | text | 4.5 | 6.89 | 7.40 |
| `warn` | `sunken` | text | 4.5 | 5.74 | 9.23 |
| `warn` | `honey` | text | 4.5 | 6.08 | 7.96 |
| `danger` | `paper` | text | 4.5 | 7.06 | 8.27 |
| `danger` | `surface` | text | 4.5 | 7.61 | 7.61 |
| `danger` | `raised` | text | 4.5 | 7.80 | 6.86 |
| `danger` | `sunken` | text | 4.5 | 6.50 | 8.56 |
| `danger` | `honey` | text | 4.5 | 6.89 | 7.38 |
| `on-action` | `action` | label on the primary button | 4.5 | 15.00 | 15.46 |
| `on-brass` | `brass-fill` | label on the brass button | 4.5 | 4.83 | 8.02 |
| `on-danger` | `danger-fill` | label on the destructive button | 4.5 | 6.53 | 4.85 |
| `leaf` | `leaf-tint` | text on a success panel | 4.5 | 5.44 | 8.52 |
| `warn` | `warn-tint` | text on a warning panel | 4.5 | 5.86 | 7.54 |
| `danger` | `danger-tint` | text on a danger panel | 4.5 | 6.43 | 7.49 |
| `ink` | `leaf-tint` | body text on a success panel | 4.5 | 13.97 | 12.63 |
| `ink` | `warn-tint` | body text on a warning panel | 4.5 | 14.10 | 13.07 |
| `ink` | `danger-tint` | body text on a danger panel | 4.5 | 13.67 | 14.00 |
| `ink-soft` | `leaf-tint` | secondary text on a success panel | 4.5 | 7.04 | 7.86 |
| `ink-soft` | `warn-tint` | secondary text on a warning panel | 4.5 | 7.10 | 8.14 |
| `ink-soft` | `danger-tint` | secondary text on a danger panel | 4.5 | 6.89 | 8.72 |
| `line-strong` | `paper` | control border | 3 | 3.83 | 4.28 |
| `line-strong` | `surface` | control border | 3 | 4.13 | 3.94 |
| `line-strong` | `raised` | control border | 3 | 4.23 | 3.55 |
| `line-strong` | `sunken` | control border | 3 | 3.53 | 4.43 |
| `line-strong` | `honey` | control border | 3 | 3.74 | 3.82 |
| `ring` | `paper` | focus ring | 3 | 6.09 | 10.04 |
| `ring` | `surface` | focus ring | 3 | 6.57 | 9.24 |
| `ring` | `raised` | focus ring | 3 | 6.73 | 8.32 |
| `ring` | `sunken` | focus ring | 3 | 5.62 | 10.39 |
| `ring` | `honey` | focus ring | 3 | 5.95 | 8.96 |
| `action` | `paper` | primary button edge | 3 | 15.00 | 15.46 |
| `brass-fill` | `paper` | brass button edge | 3 | 3.46 | 8.02 |
| `danger-fill` | `paper` | destructive button edge | 3 | 5.86 | 3.89 |
| `action` | `surface` | primary button edge | 3 | 16.19 | 14.23 |
| `brass-fill` | `surface` | brass button edge | 3 | 3.73 | 7.38 |
| `danger-fill` | `surface` | destructive button edge | 3 | 6.32 | 3.58 |
| `action` | `raised` | primary button edge | 3 | 16.58 | 12.82 |
| `brass-fill` | `raised` | brass button edge | 3 | 3.82 | 6.65 |
| `danger-fill` | `raised` | destructive button edge | 3 | 6.47 | 3.22 |
| `action` | `honey` | primary button edge | 3 | 14.64 | 13.80 |
| `brass-fill` | `honey` | brass button edge | 3 | 3.38 | 7.16 |
| `danger-fill` | `honey` | destructive button edge | 3 | 5.72 | 3.47 |
| `brass` | `sunken` | progress fill on its track | 3 | 5.62 | 10.39 |

Raw logo green on light surfaces (must stay under 3, it is not a text colour): `paper` 1.83, `surface` 1.98, `raised` 2.03, `sunken` 1.69, `honey` 1.79.
Lowest text pair: `on-brass` on `brass-fill` (light) 4.83:1.

70 pairs x 2 themes checked.

### Parity

| Context | light | dark | missing in dark | missing in light | dark spellings differ |
|---|---|---|---|---|---|
| (top level) | 110 | 110 | 0 | 0 | 0 |
| @media (prefers-reduced-motion: reduce) | 3 | 3 | 0 | 0 | 0 |

55 `--hec-*` tokens (27 colours) and 55 remapped legacy tokens per theme; young scale overrides 12.
`var(--hec-*)` references checked: 24 in index.css, 53 in tailwind.config.ts.

All text tokens pass 4.5:1 on every surface, so large text needs no exception list: any text token may be used at any size. The 3:1 rows are the non-text ones (control borders, focus ring, button edges). `hec-line` is deliberately absent: it is decoration and must never be the only cue.

Hover states written as `/90` or `/80` of a fill keep the label above 4.5:1 in both themes (the fill moves toward the page colour by a tenth; the smallest label ratio, 4.83, is brass in light, where the fill gets lighter under a dark label and the ratio rises).

## 4. Type

Two families, both system fonts. No web font, no network request, no bytes.

| Role | Class | Stack |
|---|---|---|
| Display serif | `font-display` (same as `font-serif`) | `ui-serif, "Palatino Linotype", "Noto Serif", "Times New Roman", serif` |
| Body sans | inherited inside the scope | `ui-sans-serif, system-ui, -apple-system, "Segoe UI Variable", "Segoe UI", Roboto, "Noto Sans", "Helvetica Neue", Arial, sans-serif` + emoji |

What a child's phone actually draws, and whether it has Vietnamese (U+1EA0-U+1EF9, plus ơ ư đ ₫):

| Platform | Display serif resolves to | Vietnamese | Body sans | Checked how |
|---|---|---|---|---|
| Windows (Chrome, Edge, Firefox) | Palatino Linotype | yes | Segoe UI | measured on this machine: all of ễ ả ư ờ ỹ Ạ đ Ễ ₫ present in Palatino Linotype, Times New Roman, Segoe UI |
| Android (Chrome, Zalo and Facebook in-app browsers) | Noto Serif (the system serif) | yes | Roboto | from the platform's font set; not run on a device in this task |
| iPhone, iPad, Mac Safari (every iOS browser is WebKit) | New York, through `ui-serif` | expected (Apple lists Vietnamese for its system fonts) | San Francisco | not run on a device in this task - **look at one iPhone before approving** |
| Mac Chrome / Firefox | Times New Roman (`ui-serif` is not understood there) | yes | San Francisco | from the platform's font set |
| ChromeOS, Linux | Noto Serif or DejaVu Serif | yes | Roboto / Noto Sans | from the platform's font set |

Why not the older `--font-studio` stack: it starts with Iowan Old Style (Apple) and falls through Book Antiqua and Georgia. On this machine Georgia and Book Antiqua have **none** of the nine Vietnamese test characters, and Iowan Old Style's coverage could not be checked here. A font without the glyph makes the browser draw that one letter from another typeface, so "Nguyễn" would be set in two fonts. The display stack therefore lists only families known to carry Vietnamese.

The faces differ by platform (Palatino on Windows, Noto Serif on Android, New York on Apple). That is the cost of zero bytes; a self-hosted serif is the owner's open question Q-A3.

### Scale

Classes are the same on every screen; the young scale changes the numbers behind them.

| Class | Family / weight | Standard size / line height | Young (Grades 1-3) | Use |
|---|---|---|---|---|
| `text-hec-display` | `font-display font-medium` | 28-40 px fluid (`clamp(1.75rem, 1.3rem + 2vw, 2.5rem)`) / 1.25 | 32-44 px fluid / 1.25 | one per screen: the greeting, a page title |
| `text-hec-h1` | `font-display font-medium` | 24 px / 1.3 | 28 px / 1.3 | section title, a money total |
| `text-hec-h2` | `font-display font-medium` | 20 px / 1.35 | 22 px / 1.35 | card title, dialog title |
| `text-hec-h3` | sans `font-semibold` | 17 px / 1.4 | 19 px / 1.4 | sub-heading, list group label |
| `text-hec-body` | sans `font-normal` | 16 px / 1.6 | 18 px / 1.65 | everything read as a sentence; all inputs (16 px stops iOS zooming on focus) |
| `text-hec-small` | sans `font-normal` | 14 px / 1.55 | 16 px / 1.55 | secondary lines, table cells on desktop |
| `text-hec-caption` | sans `font-medium` | 13 px / 1.5 | 15 px / 1.5 | labels, badges, nav labels. Nothing smaller exists |

- Weights: serif headings are `font-medium` (500). Palatino and Noto Serif have no 500 and draw their regular; New York draws its medium. That is intended: a refined serif at regular weight, not a bold one. In the young scale use `font-bold` on serif headings; a six-year-old reads a sturdier letter more easily.
- Line heights are generous on purpose: Vietnamese stacks two marks on one vowel (ễ, ậ), and capitals carry them above the cap height (Ễ). Never set `leading-none` or `leading-tight` on text that can contain a name.
- Uppercase is allowed only on short English labels (`text-hec-caption uppercase tracking-wider`), never on a name or on Vietnamese text.
- Numbers that are compared or added (money, XP, scores) take `tabular-nums` and the sans family, never the serif.
- **Young scale** = `data-hec-scale="young"`: every size up one step, radius rounder, tap targets 56 px, and cards may use `bg-hec-honey`, the warm surface. The palette does not change, so the contrast table holds. Avatars, XP and streak elements stay; they are recoloured (brass for reward, leaf for progress), not removed.

## 5. Spacing

Tailwind's 4 px scale, restricted to eight steps: `1` 4, `2` 8, `3` 12, `4` 16, `6` 24, `8` 32, `12` 48, `16` 64 (plus `24`, 96 px, only as the clearance under a fixed bar). No `5`, `7`, `10`, no arbitrary values for gaps or padding.

| Where | Class |
|---|---|
| Page gutter | `px-4` at 375, `sm:px-6`, `lg:px-8` |
| Between sections | `space-y-8` (`space-y-12` from `lg`) |
| Between cards in a section | `gap-4` |
| Inside a card | `p-4 sm:p-6` |
| Between a label and its field, a title and its line | `gap-2` |
| Icon to text | `gap-2` |

Whitespace is the luxury: when a screen feels crowded, remove a thing; do not shrink the gaps.

## 6. Radius

| Class | Standard | Young | Use |
|---|---|---|---|
| `rounded-hec-sm` | 6 px | 10 px | tooltip, checkbox, small chip |
| `rounded-hec-md` | 10 px | 14 px | button, input, popover |
| `rounded-hec-lg` | 14 px | 20 px | card, dialog, sheet |
| `rounded-full` | - | - | avatar, badge, the active-tab mark |

Nested corners: the inner radius is one step smaller than the outer.

## 7. Borders

- A hairline is `border border-hec-line`: 1 px, never 2, never coloured. It separates; it does not signal.
- Anything a person can type in, tick or press and that has no fill takes `border-hec-line-strong` (3:1 on every surface).
- A card has a hairline OR a tint that separates it from the page, plus `shadow-hec-1`. Never a thick border, never a gradient border, never a glow.
- State is carried by a 1 px border in the state colour at `/30` together with the tint and an icon and words, never by the border alone.
- The one 2 px line in the system is the rule above a money total (section 13).

## 8. Shadows

Three layered shadows, tinted with ink (never grey, never coloured), each made of a tight contact shadow plus one or two soft wide ones.

| Class | Use |
|---|---|
| `shadow-hec-1` | a card at rest |
| `shadow-hec-2` | a card on hover, popover, tooltip, the bottom nav |
| `shadow-hec-3` | dialog, sheet |

In dark the surface gets lighter as it rises (`paper` < `surface` < `raised`); the shadow only seats it. No inner glows, no neon, no `backdrop-blur` glass: a surface is solid.

## 9. Motion

| Token | Value | Class | Use |
|---|---|---|---|
| `--hec-dur-1` | 140 ms | `duration-hec-1` | press, hover, colour change |
| `--hec-dur-2` | 240 ms | `duration-hec-2` | popover, tooltip, a row revealing |
| `--hec-dur-3` | 420 ms | `duration-hec-3` | dialog, sheet, page |
| `--hec-ease` | `cubic-bezier(0.22, 1, 0.36, 1)` | `ease-hec` | everything entering or responding |
| `--hec-ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | `ease-hec-in-out` | something moving from one place to another |

- May move: opacity; a translate of at most 8 px; a scale between 0.98 and 1; colour; shadow.
- May not: bounce or overshoot, spin, shake, parallax, anything looping (the loading indicator is the only loop), anything that changes layout (width, height, margin), more than one thing at a time on a screen. A reward moment (level up) may play once, under 1.2 s, and must be skippable by doing nothing.
- **Reduced motion: nothing runs longer than 0.01 s.** Inside the scope, under `prefers-reduced-motion: reduce`, the CSS sets every animation and transition to 0.01 ms, one iteration, no delay, and the three duration tokens to 0.01 ms. That covers CSS. It does **not** cover framer-motion, which animates from JavaScript: a screen in the system either uses CSS transitions only, or sits under `<MotionConfig reducedMotion="user">` (A4.3 adds it at the root) and checks `useReducedMotion()` for anything `MotionConfig` does not stop (layout animations, `animate` loops).

## 10. Focus

One ring, everywhere, on every focusable thing:

`focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring`

A 2 px brass outline with a 2 px gap, so it is drawn on the surface around the control, where it has at least 5.6:1 in light and 8.3:1 in dark. Never `outline-none` without this next to it. Never a glow instead of an outline. The ring is not animated.

## 11. Touch targets

Every interactive element is at least 44 x 44 CSS px: `min-h-hec-target min-w-hec-target` (56 px in the young scale). An icon button is a 44 px box with a 20 px icon and an `aria-label`. Two targets are at least 8 px apart (`gap-2`). A text link inside a sentence is exempt; a link that stands alone is not.

## 12. Phone first: 375 px

- Design at 375, then widen. A layout that needs `sm:` to stop overflowing is wrong at its base.
- No horizontal scroll, ever. Every flex child that holds text gets `min-w-0`; nothing has a fixed width above 343 px (375 minus the gutters); decorative layers that bleed are clipped by their wrapper (`overflow-clip`). A wide table becomes a list of rows at 375 (section 15), not a scrolling table.
- The primary action of a screen is reachable by a thumb: in the lower half, full width (`w-full sm:w-auto`), and if the content is longer than the screen, in a bar that stays above the bottom nav. One primary action per screen.
- Fixed bars respect the notch and the home indicator: `pb-[env(safe-area-inset-bottom)]`. Content under a fixed bottom nav ends with `pb-24`.
- Dialogs at 375 are inset 16 px, at most `85dvh` tall and scroll inside; their buttons stack, full width.
- Check at 320 too: nothing may be cut, though it may wrap more.

## 13. Names are never truncated

A child's name, a parent's name, a teacher's name and a class name are never cut: no `truncate`, no `line-clamp-*`, no `text-ellipsis`, no fixed width with `overflow-hidden`, no initials standing in for a name that is the point of the row.

The pattern (test string: `Nguyễn Hoàng Phương Thảo Nguyên`):

```html
<div class="flex items-start gap-3">
  <img class="h-11 w-11 shrink-0 rounded-full" alt="" />
  <div class="min-w-0 flex-1">
    <p class="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">
      Nguyễn Hoàng Phương Thảo Nguyên
    </p>
    <p class="text-hec-small text-hec-ink-soft">Grade 2 - Sunflower</p>
  </div>
  <span class="shrink-0 whitespace-nowrap tabular-nums">1.250.000 ₫</span>
</div>
```

- `min-w-0 flex-1` on the text column lets it shrink; without it a flex row overflows instead of wrapping.
- The name wraps at its spaces onto as many lines as it needs. Vietnamese names are short syllables, so they wrap cleanly. `break-words` is only the safety net for one very long unbroken string; `hyphens-none` because a name is never hyphenated; `text-balance` avoids one syllable alone on the last line.
- The row grows taller: `items-start`, never a fixed height; use `min-h-hec-target`, not `h-11`.
- What sits beside a name (amount, badge, button) is `shrink-0`; an amount is also `whitespace-nowrap`. The name gives way by wrapping; the number never does.
- Line height at least 1.5 for a name in body text, 1.25 in display size.
- Where a single line is forced by the design (a bottom-nav label, a chip), put a short label there, not a name.

## 14. State colours, money and destructive actions

| State | Text / icon | Panel | Solid | Means |
|---|---|---|---|---|
| Success | `text-hec-leaf` | `bg-hec-leaf-tint border-hec-leaf/30` | - | done, paid, present, grew |
| Warning | `text-hec-warn` | `bg-hec-warn-tint border-hec-warn/30` | - | due soon, check this, unresolved |
| Danger | `text-hec-danger` | `bg-hec-danger-tint border-hec-danger/30` | `bg-hec-danger-fill text-hec-on-danger` | overdue, failed, cancelled, cannot be undone |

Rules that hold on every screen:

- Colour is never the only signal: a state always has an icon and a word ("Overdue", "Paid", "Cancelled").
- Brass is never a state. Amber (`warn`) and brass are different hues and different jobs; do not use `warn` to decorate a star or a trophy (that is brass), and do not use brass to warn.
- Red appears only for danger. No red hearts, no red "new" dots, no red brand flourishes.
- Leaf is the only green. No second green, no teal.

### Money

A person must be able to find the amount they owe in one second and trust it.

- Amounts are ink, sans, `tabular-nums`, `whitespace-nowrap`, right-aligned in a column. Never brass, never serif, never animated, never count-up.
- The total is the largest number on the screen and is the only thing under a 2 px ink rule.
- Red on an amount means exactly one thing: overdue or owed after a failure, and the word says so. Green on an amount means exactly one thing: fully paid, and the word says so. A discount is ink with a minus sign and its label, not green.
- An unresolved figure (sibling discount still being worked out) is shown as a warning panel with words, never as a number that may change silently.
- The figures themselves come from `calculate-tuition` / `calculate-payroll` and are displayed as given. A restyle changes classes, never a figure, a rounding or a currency format.

Money total row:

```html
<dl class="space-y-2 text-hec-body text-hec-ink">
  <div class="flex items-baseline justify-between gap-4">
    <dt class="min-w-0 text-hec-ink-soft">Tuition, November</dt>
    <dd class="shrink-0 whitespace-nowrap tabular-nums">1.400.000 ₫</dd>
  </div>
  <div class="flex items-baseline justify-between gap-4">
    <dt class="min-w-0 text-hec-ink-soft">Sibling discount</dt>
    <dd class="shrink-0 whitespace-nowrap tabular-nums">-150.000 ₫</dd>
  </div>
  <div class="flex items-baseline justify-between gap-4 border-t-2 border-hec-ink pt-3">
    <dt class="min-w-0 font-semibold">Total due</dt>
    <dd class="shrink-0 whitespace-nowrap text-hec-h1 font-semibold tabular-nums">1.250.000 ₫</dd>
  </div>
</dl>
<!-- overdue: add under the total -->
<p class="mt-2 flex items-center gap-2 text-hec-small font-medium text-hec-danger"><!-- alert icon --> Overdue since 5 November</p>
```

### Destructive confirm dialog

For cancelling a lesson, deleting a record, reversing a payment, removing a child from a class.

```html
<div class="fixed inset-0 z-50 bg-hec-scrim/60"></div>
<div role="alertdialog" aria-labelledby="t" aria-describedby="d" data-hec-theme="ivory"
     class="fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised p-6 text-hec-ink shadow-hec-3">
  <h2 id="t" class="font-display text-hec-h2 font-medium">Cancel Tuesday's lesson?</h2>
  <p id="d" class="mt-2 text-hec-body text-hec-ink-soft">Flyers A, Tuesday 12 November, 17:30. This cannot be undone.</p>
  <div class="mt-4 rounded-hec-md border border-hec-danger/30 bg-hec-danger-tint p-4 text-hec-small text-hec-ink">
    <p class="font-medium text-hec-danger">What will change</p>
    <ul class="mt-2 space-y-1">
      <li>12 families will not be charged for this lesson.</li>
      <li>The teacher will not be paid for it.</li>
    </ul>
  </div>
  <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
    <button class="... secondary button ...">Keep the lesson</button>
    <button class="... destructive button ...">Cancel the lesson</button>
  </div>
</div>
```

- The title is a question that names the thing. The body says what it is and that it cannot be undone. The panel lists the consequences, money first, in sentences with numbers.
- Two buttons, each labelled with what it does: verb + object. Never "OK", "Yes", "Confirm", "Continue". **Never "Cancel" as the way out of a dialog about cancelling** - "Keep the lesson" / "Cancel the lesson", "Keep the payment" / "Delete the payment".
- The destructive button is the only red fill on the screen; the safe one is the secondary (outline) button. No brass, no primary ink button in this dialog.
- Focus starts on the safe button. Escape and the scrim do the safe thing. Enter does not trigger the destructive button unless it has focus.
- At 375 the buttons stack full width with the safe one at the bottom, under the thumb (`flex-col-reverse` with the safe button first in the markup); from `sm` they sit in a row, destructive on the right.
- While it runs the destructive button says what is happening ("Cancelling...") and is disabled; the dialog does not close until the server answers; a failure is shown inside the dialog in `text-hec-danger`, in words.
- The control that opens the dialog is the destructive-quiet button (below), never a red fill sitting in a list.
- The session dialogs (`CancelSessionDialog`, `SessionActionsModal`, `EditSessionModal`, `DeleteSessionDialog`, `BulkSessionDelete`) are owned by workstream D and are not restyled until D3 is merged; this recipe is what they take then.

## 15. Component recipes

Class strings use only the tokens of this system plus layout utilities. Inside the scope the shared primitives already follow through the bridge; these are the strings for anything written or re-classed by hand.

**Focus** (referred to as `FOCUS` below): `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring`

**Card**
- Standard: `rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6`
- If the whole card is a link: add `transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2` + `FOCUS`
- Young: replace `bg-hec-surface` with `bg-hec-honey`
- Card title: `font-display text-hec-h2 font-medium text-hec-ink`; card caption: `text-hec-small text-hec-ink-soft`

**Button** - base, on every variant: `inline-flex min-h-hec-target min-w-hec-target items-center justify-center gap-2 rounded-hec-md px-6 text-hec-body font-medium transition-colors duration-hec-1 ease-hec disabled:cursor-not-allowed disabled:opacity-50` + `FOCUS`

| Variant | Add | When |
|---|---|---|
| Primary | `bg-hec-action text-hec-on-action hover:bg-hec-action/90 active:bg-hec-action/80` | the main action of a screen or dialog |
| Brass (hero) | `bg-hec-brass-fill text-hec-on-brass hover:bg-hec-brass-fill/90` | at most one per screen, and only where the screen exists for that one act ("Start today's homework"). Not in dialogs, not in lists |
| Secondary | `border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken` | the other choice; the safe choice in a destructive dialog |
| Quiet | `text-hec-ink hover:bg-hec-sunken` | low-weight actions, icon buttons, toolbar items |
| Link | `min-w-0 px-0 text-hec-brass underline-offset-4 hover:underline` | navigation that reads as text |
| Destructive | `bg-hec-danger-fill text-hec-on-danger hover:bg-hec-danger-fill/90` | only inside a confirm dialog, only one |
| Destructive quiet | `border border-hec-danger bg-transparent text-hec-danger hover:bg-hec-danger-tint` | the control that opens a destructive confirm |

Icon-only button: base without `px-6`, with `aria-label`; icon `h-5 w-5`. Loading: keep the width, swap the label for a verb in progress, set `disabled`.

**Input**
- Field: `min-h-hec-target w-full rounded-hec-md border border-hec-line-strong bg-hec-raised px-3 text-hec-body text-hec-ink placeholder:text-hec-ink-faint aria-[invalid=true]:border-hec-danger disabled:bg-hec-sunken disabled:opacity-50` + `FOCUS`
- Label (always visible, above the field): `text-hec-small font-medium text-hec-ink`
- Help: `text-hec-caption text-hec-ink-soft`; error (with an icon, linked by `aria-describedby`): `text-hec-caption text-hec-danger`
- A placeholder is an example, never the label.

**Nav bar**
- Bottom nav (phone): `fixed inset-x-0 bottom-0 z-40 flex border-t border-hec-line bg-hec-surface pb-[env(safe-area-inset-bottom)] shadow-hec-2`
- Item: `flex min-h-hec-target min-w-hec-target flex-1 flex-col items-center justify-center gap-1 text-hec-caption text-hec-ink-soft aria-[current=page]:font-medium aria-[current=page]:text-hec-ink` + `FOCUS`
- Active mark, inside the active item above the icon: `h-0.5 w-6 rounded-full bg-hec-brass` (the brass line is the only fill; no pill, no gradient tile behind the icon)
- Top bar: `sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b border-hec-line bg-hec-paper px-4`
- At most five items; labels are one short word and are always shown.

**Dialog**
- Scrim: `fixed inset-0 z-50 bg-hec-scrim/60`
- Panel: `fixed inset-x-4 top-1/2 z-50 mx-auto max-h-[85dvh] max-w-md -translate-y-1/2 overflow-y-auto rounded-hec-lg border border-hec-line bg-hec-raised p-6 text-hec-ink shadow-hec-3`
- Title: `font-display text-hec-h2 font-medium text-hec-ink`; body: `mt-2 text-hec-body text-hec-ink-soft`
- Footer: `mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end`
- Enter: opacity 0 to 1 and 8 px up, `duration-hec-3 ease-hec`. Close button: quiet icon button, 44 px, top right, `aria-label="Close"`.

**Tooltip / popover**
- Tooltip: `rounded-hec-sm bg-hec-action px-3 py-2 text-hec-caption text-hec-on-action shadow-hec-2` - one short line, never the only place a piece of information lives (a phone has no hover).
- Popover / menu: `rounded-hec-md border border-hec-line bg-hec-raised p-4 text-hec-ink shadow-hec-2`
- Menu item: `flex min-h-hec-target items-center gap-2 rounded-hec-sm px-3 text-hec-body text-hec-ink hover:bg-hec-sunken` + `FOCUS`

**Table / list row**
- List container: `rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1`
- Row: `flex min-h-hec-target items-start gap-3 border-b border-hec-line px-4 py-3 last:border-b-0`; if the row is a link add `hover:bg-hec-sunken/60` + `FOCUS`
- Row title: the name pattern of section 13; row meta: `text-hec-small text-hec-ink-soft`
- Table header cell: `px-4 py-3 text-left text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft`
- Table cell: `px-4 py-3 text-hec-small text-hec-ink`; numeric cell: add `text-right tabular-nums whitespace-nowrap`
- No zebra stripes; hairlines only. Below `sm` a table is rendered as list rows (label above value), not scrolled sideways.

**Badge** - base: `inline-flex items-center gap-1 rounded-full border px-3 py-1 text-hec-caption font-medium`

| Variant | Add |
|---|---|
| Neutral | `border-hec-line bg-hec-sunken text-hec-ink-soft` |
| Success | `border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf` |
| Warning | `border-hec-warn/30 bg-hec-warn-tint text-hec-warn` |
| Danger | `border-hec-danger/30 bg-hec-danger-tint text-hec-danger` |
| Brass (level, rank, reward) | `border-hec-brass/40 bg-transparent text-hec-brass` |

A badge is a label, not a button; it has no hover. A state badge carries a word, and an icon where there is room.

**Progress** - track: `h-2 rounded-full bg-hec-sunken`; fill: `h-2 rounded-full bg-hec-brass` (XP, level) or `bg-hec-leaf` (completion). Always with the number in text next to it.

## 16. Do / don't

| Do | Don't |
|---|---|
| One brass thing in view: a link, the active tab, a progress fill | Brass headings, brass borders on cards, brass and a brass-fill button together in one card |
| Solid ivory surfaces with a hairline and `shadow-hec-1` | Gradients, glass, `backdrop-blur`, glows, coloured shadows |
| Serif for the few headings, sans for everything read or counted | Serif body text, serif numbers, serif in buttons or inputs |
| Let a name wrap to two or three lines | `truncate`, `line-clamp`, initials instead of the name |
| Say it in words and add the colour | Rely on red or green alone |
| "Keep the lesson" / "Cancel the lesson" | "Cancel" / "OK" |
| `hec-*` classes only, no `dark:` prefix (the tokens carry both themes) | `bg-white`, `text-slate-600`, `dark:bg-slate-900`, a hex value in a class or a style |
| `min-h-hec-target` on everything pressable | A 32 px icon button; two targets touching |
| One slow fade or 8 px rise | Bounce, wiggle, float, confetti on load, anything looping |
| Leaf only for success and growth | Raw logo green as text; green as a second accent |
| Emoji only inside the child's own content or a reward moment in the young scale | Emoji as icons in navigation, buttons or headings |

## 17. Excluded: the three display boards

Star Board, High Scores and Night League (`src/components/leaderboard/`, read `src/components/leaderboard/AGENTS.md` first) are themed canvases made to be projected on a classroom wall. Each has its own palette, type and motion, written as hex values and `--studio-*` / board-local variables, and that is deliberate.

- They are not tokenised and not restyled. The 277 hex literals and the hard-coded palette classes in those files are not rollout work.
- They never carry `data-hec-theme`. When the attribute moves to `<html>`, each board's root must opt out, because the bridge would otherwise change the `--background` / `--primary` / `--border` names under it. The opt-out is part of the rollout step that moves the attribute, not of this task; the simplest form is to keep the attribute on the app shell (`Layout`) instead of `<html>` for routes that render a board. Decide it then, with the pixel diff of the three boards as the gate (0 changed pixels).
- `restPaging` / `useRestPaging` and everything else about how the boards load stay as they are.
- The frame around a board (the app's nav, a dialog opened from it) does follow the system.

Also outside the system, for the same reason (their own medium): PDF templates, printed reports (`#hec-print-report`), charts' series colours (a chart palette is a separate piece of work), and the recorder and audit-clips screens until their owners release them.

## 18. Rollout mapping: hard-coded class to token

For the class-for-class batches (A4.6). Applies to `bg-`, `text-`, `border-`, `ring-`, `divide-`, `fill-`, `stroke-` alike. Shades are grouped: map by the row, not by the exact number. **Delete the paired `dark:` class** every time: the token carries both themes.

Mechanical (haiku may do these; verified by screenshot):

| Hard-coded | Token | Note |
|---|---|---|
| `bg-white` | `bg-hec-surface` | `bg-hec-raised` if it is a dialog, popover or input |
| `bg-slate-50`, `bg-gray-50`, `bg-zinc-50` | `bg-hec-paper` | |
| `bg-slate-100`, `bg-gray-100`, `bg-slate-200` | `bg-hec-sunken` | |
| `bg-slate-800/900/950`, `bg-gray-900`, `bg-black` (as a surface) | `bg-hec-action` with `text-hec-on-action` | if it was a dark-mode surface (`dark:bg-slate-900`), delete it instead |
| `text-slate-900/800`, `text-gray-900/800`, `text-black` | `text-hec-ink` | |
| `text-slate-700/600`, `text-gray-700/600` | `text-hec-ink-soft` | |
| `text-slate-500/400`, `text-gray-500/400` | `text-hec-ink-faint` | |
| `border-slate-200/100`, `border-gray-200` | `border-hec-line` | |
| `border-slate-300/400`, `border-gray-300` | `border-hec-line-strong` if it edges a control, else `border-hec-line` | |
| `text-red-*`, `text-rose-*` | `text-hec-danger` | |
| `bg-red-50/100`, `bg-rose-50/100`, `bg-red-500/10` | `bg-hec-danger-tint` | |
| `bg-red-500/600/700`, `bg-rose-600` | `bg-hec-danger-fill` with `text-hec-on-danger` | |
| `border-red-*`, `border-rose-*` | `border-hec-danger/30` | |
| `text-green-*`, `text-emerald-*`, `text-lime-*`, `text-teal-*` | `text-hec-leaf` | |
| `bg-green-50/100`, `bg-emerald-50/100`, `bg-emerald-500/10`, `bg-emerald-500/15` | `bg-hec-leaf-tint` | |
| `bg-green-500/600`, `bg-emerald-500/600` | `bg-hec-leaf` with `text-hec-paper` | |
| `border-emerald-*`, `border-green-*` (any opacity) | `border-hec-leaf/30` | |
| `text-white` on an ink or blue fill | `text-hec-on-action` | on a red fill `text-hec-on-danger`; on brass `text-hec-on-brass` |
| `text-white/80`, `text-white/70` | `text-hec-on-action/80` | only on `bg-hec-action` |
| `shadow-sm`, `shadow`, `shadow-md` | `shadow-hec-1` | |
| `shadow-lg`, `shadow-xl` | `shadow-hec-2` | |
| `shadow-2xl`, `shadow-premium*`, `shadow-q*` | `shadow-hec-3` on dialogs, else `shadow-hec-2` | |
| `rounded-md`, `rounded-lg` | `rounded-hec-md` | |
| `rounded-xl`, `rounded-2xl`, `rounded-3xl` | `rounded-hec-lg` | `rounded-full` stays |
| `backdrop-blur-*`, `bg-white/10`, `bg-*-glass`, `glass-panel` | remove; use the solid surface of the row above | |
| `focus:ring-*`, `focus-visible:ring-*`, `focus:outline-none` | the `FOCUS` string | |
| `duration-200/300`, `ease-out`, `ease-in-out` | `duration-hec-1` / `duration-hec-2`, `ease-hec` | |
| `truncate`, `line-clamp-*` on a name | the name pattern, section 13 | on other text: leave, and list the site for review |

Needs a decision per use (sonnet, not haiku): what the colour meant.

| Hard-coded | If it meant... | Token |
|---|---|---|
| `text-amber-*`, `text-yellow-*`, `text-orange-*` | a warning, due soon, pending | `text-hec-warn` |
| | a star, trophy, XP, level, reward | `text-hec-brass` |
| `bg-amber-50/100`, `bg-amber-500/10`, `bg-amber-950/30`, `bg-yellow-50` | a warning panel | `bg-hec-warn-tint` (+ `border-hec-warn/30`) |
| | warmth on a child's card | `bg-hec-honey` (young scale only), else `bg-hec-surface` |
| `border-amber-*` | warning | `border-hec-warn/30` |
| | reward | `border-hec-brass/40` |
| `bg-amber-500`, `bg-yellow-400` (solid) | a reward chip | brass badge (section 15) |
| `text-blue-*`, `text-indigo-*`, `text-violet-*`, `text-purple-*`, `text-sky-*`, `text-cyan-*` | a link or something pressable | `text-hec-brass` |
| | information, an icon, a category colour | `text-hec-ink-soft` |
| `bg-blue-50/100`, `bg-violet-50`, `bg-indigo-50`, `bg-sky-50` | an info panel, a selected row | `bg-hec-sunken` |
| `bg-blue-500/600`, `bg-violet-600`, `bg-indigo-600` | a button | primary: `bg-hec-action text-hec-on-action` |
| `border-blue-*`, `border-violet-*` | selected | `border-hec-brass` |
| | plain edge | `border-hec-line` |
| `from-*` / `via-*` / `to-*` with `bg-gradient-to-*` | a button or hero | remove the gradient: `bg-hec-action` (button) or `bg-hec-surface` (card). There are no gradients in the system |
| `text-pink-*`, `text-fuchsia-*`, `bg-pink-*` | decoration | remove the colour: `text-hec-ink-soft` / `bg-hec-sunken` |
| `text-aurora`, `bg-aurora`, `bg-citrus`, `bg-glacier`, `bg-mint`, `bg-night` | emphasis | `text-hec-ink` / `bg-hec-surface`; a hero uses type size, not colour |

Category colours (subjects, teams, calendar classes) where several things must be told apart are not covered by one accent. Until a category palette is designed, leave those sites as they are and list them; do not map five categories onto brass.
