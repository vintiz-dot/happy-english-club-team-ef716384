# HEC Design System - "Ivory"

Where I am / next step: sections 1-3 written (principles, scope, palette + contrast); next = sections 4-12 (type ... names), then states, recipes, rollout map.

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
