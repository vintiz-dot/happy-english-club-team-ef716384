# FIX-screens: five screen problems

Branch `worktree-agent-abb38f42ad67d0fe0`, started from `claude/hec-conductor-setup-efbaa5` at 946eb6d1. Build and test only: nothing pushed, nothing deployed, no sign-in anywhere, made-up data only.

**Where I am / next step:** done - every fix committed and proven before/after in the harness; checks green. Nothing pushed or deployed. Next step is the conductor's: review and merge.

## Changed lines and why

### Fix 1 - Ctrl+K opens one palette (`776c2d7a`)
| File | Lines | Purpose |
|---|---|---|
| `src/lib/paletteOwner.ts` (new) | `paletteFor(role, pathname)` | The one rule both palettes read: an admin on an admin-only page (`/admin*`, `/students*`, `/teachers*`, `/classes`, `/families*` - the routes App.tsx guards with `allowedRole="admin"`) gets the admin quick-jump; any other admin or teacher page gets the general bar; a teacher never gets the admin one; other roles none. Imports nothing. |
| same | `OPEN_GENERAL_PALETTE_EVENT` | The window event AdminTopBar's "Quick jump" button sends when the page is the general bar's. |
| `src/components/AdminTopBar.tsx` | `useAuth` import, `const { role } = useAuth()` | The role the rule needs. |
| same | `ownsPalette = paletteFor(...) === "admin"`; the effect returns early (and closes its palette) when it does not own the page; deps `[ownsPalette]` | Its Ctrl/Cmd+K listener exists only where the admin palette is the page's palette. |
| same | `openPalette` + `onClick={openPalette}` | The Quick jump button opens the admin palette where it owns the page, otherwise asks the general bar to open (a teacher clicking it saw admin pages before). |
| `src/components/CommandPalette.tsx` | `useLocation`, `pathname`, `ownsKey = paletteFor(...) === "general"` | Its listener exists only where it is the page's palette. `enabled` (render or not) is unchanged. |
| same | the open-event listener | Opens when AdminTopBar's button asks. |
| `scripts/paletteOwner.test.ts` (new) | 5 bun tests | The rule, including `/teacher/...` vs `/teachers`. |

### Fix 2 - class screen over a fullscreen book (`8d5f3473`, corrected in `a0407f96`)
| File | Lines | Purpose |
|---|---|---|
| `src/components/classroom-tools/studio/ClassScreen.tsx` | `if (document.fullscreenElement?.contains(el)) return;` before `requestFullscreen` | When the class screen already sits inside the fullscreen element (the tools panel is portalled into the book TeacherBooks presents fullscreen), it asks for no second, nested fullscreen. Its overlay (`fixed inset-0 z-[120]`) already fills the display there. |
| same | cleanup: `document.fullscreenElement === el` | Leaves only its OWN fullscreen. Before, closing a class screen exited whatever was fullscreen (the book). |
| same | `close()`: `document.fullscreenElement === hostRef.current` | Same rule for the Exit button. |

`ui/sheet.tsx` is NOT changed. My first attempt (`8d5f3473`) followed R19's reading - keep the sheet's container while the class screen is fullscreen, by passing `container` from the launcher - and the lab still failed. A trace (`fs-debug.mjs`, below) showed why: the panel kept its container, but the nested `requestFullscreen` on the class screen was followed ~550 ms later by the whole panel being unmounted and fullscreen dropping to null, with no `exitFullscreen` call from the app. Not asking for the nested fullscreen removes the cause; `a0407f96` reverts the launcher to the base file and keeps only the ClassScreen guard. Opening a class screen from a page that is not fullscreen still asks for fullscreen exactly as before (the guard needs a fullscreen element that contains the screen).

What a teacher sees now: over a fullscreen book the class screen fills the display; Exit closes it and the book is still fullscreen with the panel open; Escape closes it the same way. In a real Chrome, the Escape key also makes the browser leave fullscreen (the browser owns that key in fullscreen); the class screen then closes through its `fullscreenchange` listener, as on any other page. The harness presses keys through CDP, which the browser does not treat as its own Escape, so the "book still fullscreen after Escape" result below is the page's behaviour, not the browser's.

### Fix 3 - calendar chip names (`e4b8c51f`, `cf0477f0`, `bea6fd16`)
| File | Lines | Purpose |
|---|---|---|
| `src/components/calendar/lib/eventLabel.ts` (new) | `eventAccessibleName(visible, notVisible)` | The name is the visible pieces in visible order, then what is not on screen; empty pieces dropped, a visible piece not repeated. Imports nothing. |
| `src/components/calendar/MonthView.tsx` | import + `showCount` + `label` | Month chip: `"17:30 Starters 1"` (+ the count when the chip shows it), then teacher, status, duration note. Was `"Starters 1, 17:30, Held"`. |
| `src/components/calendar/TimeGridView.tsx` | import + `metaText` + `teacherShown` + `label` | Week/day block: class name, the times line exactly as shown (when the block is tall enough to show it), the teacher (when shown), then the times in words / teacher if they did not fit, status, duration note. |
| same | (`e4b8c51f` rendered `{metaText}` in place of the three JSX expressions; the last commit puts the three expressions back, with a one-line comment) | One string instead of three adjacent text nodes moved the en dash by a sub-pixel in the grid pixel compare (64 px at 1280). The times line now renders exactly as before; `metaText` builds the same text for the name. |
| `scripts/eventLabel.test.ts` (new) | 5 bun tests | The wording and the "starts with the visible text" property. |

`cf0477f0` adds the second half. The first harness run on `e4b8c51f` still had axe flag every chip: axe reads a chip's visible text by joining its text nodes with nothing between them, so the month chip read "17:30Starters 1 ... 6" and the week block "...Nguyên17:30–18:30 · 6Trịnh Thu Hà" - words no name can contain. So:

| File | Lines | Purpose |
|---|---|---|
| `src/components/calendar/MonthView.tsx` | `{" "}` after the time span and after the class-name span (+ comment) | A real space between the pieces. The chip is a flex container, and white space between flex items is not rendered: nothing moves on screen (pixel compare below). |
| `src/components/calendar/TimeGridView.tsx` | `{" "}` after the first line and after the times line (+ comment) | Same for the block's lines; white space between block boxes is not rendered. |

The count after the class name is `enrolled_count`, which GlobalCalendar fills from the lesson's attendance rows; I left it a bare number in the name (as on screen) rather than call it "enrolled", which would not be true. `PremiumCalendar.tsx` is not touched.

### Fix 4 - three confirm dialogs (`0906c591`, `a9abc824`)
| File | Lines | Purpose |
|---|---|---|
| `src/components/ConfirmDestructiveDialog.tsx` (new) | whole file | DS s.14 dialog on the existing `AlertDialog` primitive and `Button`: question title, consequence line, "Keep ..." (`AlertDialogCancel`, focused first, what Escape does) and the destructive verb (ivory: `Button variant="destructive"`; legacy: the default variant with `bg-destructive text-destructive-foreground hover:bg-destructive/90`, added in `a9abc824` because the legacy destructive variant draws white on white - see below). The action shows "...ing" and is disabled while the caller's handler runs; the dialog closes when it finishes; Escape does nothing while it runs. |
| `src/components/admin/AnnouncementManager.tsx` | `confirmDelete` state; trash icon `onClick={() => setConfirmDelete(a)}`; the dialog | "Delete the announcement?" / `"<title>" stops showing to everyone it was meant for, and is deleted. This cannot be undone.` / "Keep the announcement" / "Delete the announcement". `handleDelete` unchanged, called only on confirm. (`remove` is a hard `.delete()`, so "cannot be undone" is true.) |
| `src/components/admin/stars/StarsTools.tsx` | `confirmUnlink` state (in memory); "Unlink" `onClick` sets it; the dialog | "Unlink <child> from <Pixel Pal name>?" / "Nothing more from Pixel Pal will reach <child>. Marks and points a run has already applied stay." (the screen's own Undo caption says the same) / "Keep the link" / "Unlink the child". The names are the ones already on screen (`a.studentName`, `a.pixelPalName ?? "Pixel Pal no. <ref>"`); nothing is stored. Runs `unlink.mutateAsync(ref)` - the same mutation, same onSuccess/onError. The "Undo" beside a link made a moment ago is left as it was (it is the undo, not an unlink of an old link). |
| `src/pages/FamilyDetail.tsx` | `confirmRemove` state; `removeFromFamily` (the inline handler moved verbatim); "Remove" `onClick` sets the state; the dialog | "Remove <child> from this family?" / consequence below / "Keep them in the family" / "Remove from the family". |

What "Remove" actually does, checked in the code: it sets `students.family_id = null` and recalculates nothing. `calculate-tuition` then finds no family for that child, so their bills get no sibling discount from the next time their tuition is worked out (a frozen bill keeps its saved figures). For the brothers and sisters, `resolveSiblingStates` never reassigns a month whose `sibling_discount_state` already exists, so months already worked out stay as they are and later months are worked out without the child. The dialog says exactly that, and nothing about a date.

## Proof

Harness: a copy of R19's (`C:\Users\Dell\hec-tools\fix-screens-harness`, outside the repo; the scripts are copied to `FIX-screens/harness/`). Vite with the Supabase client aliased to the made-up fake (no network, no sign-in), clock pinned to 2026-11-13 12:00, `Math.random` seeded. **Before** = `git archive 946eb6d1` (the conductor commit this branch starts from), **after** = this branch. Each side on its own port; a run refuses to start if its port already answers. Fixture additions (made up, harness only): two announcements, one Pixel Pal link (child 121 -> s-0013, the long-name child) with one waiting "not enrolled" record so it shows under "Links worth a second look", and a stand-in Pixel Pal roster ("Bé Bông (Pixel Pal)") served by the fake `stars-roster` function - held in the page's memory, as the real one is. The fake's embed parser now accepts a space before `(` (GlobalCalendar writes `classes!inner (...)`), so the calendar shows real class and teacher names instead of "Unknown".

`--ivory` runs alias `@/lib/ivoryScope` to a harness-only copy with the staff routes listed (`/admin`, `/schedule`, `/families/:id`, `/teacher/dashboard`, `/teacher/books`); `src/lib/ivoryScope.ts` itself is untouched. Without it the staff pages render their legacy branch, which is what staff see today.

### Fix 1 - Ctrl+K (`fix-pages.mjs`, palette section)
The recorded keypress: the page's own `keydown` log (`results.json` -> `palette.<case>-keys`: key `k`, `ctrlKey: true`, `defaultPrevented: true`) plus a frame before and after the key (`pages/*-palette-*-0-before-key.png` / `-1-after-key.png`). Then Ctrl+K again (must close), then the Quick jump button at 1280. A video was not possible: Playwright's video needs an ffmpeg download, which I did not make.

| Case (role, page) | Want | Before (946eb6d1) | After |
|---|---|---|---|
| admin `/admin` 1280 / 375 | admin | admin + general open together | admin only |
| admin `/students` 1280 / 375 | admin | both | admin only |
| admin `/schedule` 1280 / 375 | general | both; Quick jump -> admin | general only; Quick jump -> general |
| admin `/teacher/dashboard` 1280 / 375 | general | both; Quick jump -> admin | general only; Quick jump -> general |
| teacher `/teacher/dashboard` 1280 / 375 | general | both, admin on top; Quick jump -> admin | general only; Quick jump -> general |
| teacher `/schedule` 1280 / 375 | general | both; Quick jump -> admin | general only; Quick jump -> general |

Ctrl+K a second time closes the one palette in every case; no page errors. Compare `pages/before-palette-teacher-_teacher_dashboard-1280-1-after-key.png` (a teacher looking at the "Admin" list) with the after frame ("Go to": Dashboard, Schedule, Leaderboard...).

### Fix 2 - fullscreen lab (`fix-fs.mjs`, R19's `r19-fs.mjs` with the book case gated)
The book case, per viewport (1024x768, 768x1024, 375x812, touch media unless noted): present the book fullscreen, open the tools inside it, Spinner -> "Show on Class screen". Gate: the class screen is found, inside the fullscreen element, on screen, topmost at its centre, fills the viewport exactly, and fullscreen is still on; its Spin button is hit-testable; Exit leaves no class screen and the book still fullscreen with the panel open; opened again it shows, and Escape closes it. Every R19 step before and after it is unchanged.

| Variant | Before (946eb6d1) | After |
|---|---|---|
| A legacy light, touch | 69 PASS / 9 FAIL - every book-case step at all three sizes: no class screen, `fullscreenElement` null | 78 / 0 |
| B legacy light, mouse | 69 / 9 (same nine) | 78 / 0 |
| C ivory light, touch | 69 / 9 (same nine; first run lost 1024 to a cold Vite cache, `logs/fs-C-before.cold.log`, re-run warm) | 78 / 0 |
| D ivory dark, touch | 69 / 9 (same nine) | 78 / 0 |

Shots: `fs/fs-{A,C}-{before,after}-books-classscreen-{1024,375}.png` (before: the panel with no class screen, out of fullscreen; after: the Spinner class screen filling the display) and `-books-after-exit-*` (after: back on the book, still fullscreen, panel open).

The trace that changed the approach (`harness/fs-debug.mjs`, run on `8d5f3473`): after "Show on", `request class-screen` -> `fschange -> class-screen` -> ~550 ms later `class screen removed`, `SPINNER SECTION removed`, `PANEL removed` -> `fschange -> null`, with no `exitFullscreen` call from the app (it was wrapped and logged). Keeping the panel's container did not stop it; not requesting the nested fullscreen does.

### Fix 3 - calendar names (`fix-pages.mjs`, calendar section; axe-core 4.x as R19)
`/schedule` as admin, Month and Week, 375 and 1280. A sample chip:

| | Visible text | Accessible name |
|---|---|---|
| Month, before | `18:00 Movers 2 (Tue-Thu) 8` | `Movers 2 (Tue-Thu), 18:00, Held` |
| Month, after | same | `18:00 Movers 2 (Tue-Thu), 8, Cao Văn Lâm, Held` |
| Week, before | `Movers 2 (Tue-Thu) 18:00–19:00 · 8 Cao Văn Lâm` | `Movers 2 (Tue-Thu), 18:00 to 19:00, Held` |
| Week, after | same | `Movers 2 (Tue-Thu), 18:00–19:00 · 8, Cao Văn Lâm, Held` |

axe `label-content-name-mismatch` nodes (serious):

| View | Before legacy | Before ivory | After ivory (cf0477f0) | After legacy (bea6fd16) |
|---|---|---|---|---|
| Month 1280 | 19 | 19 | 0 | 0 |
| Week 1280 | 5 | 5 | 0 | 0 |
| Month 375 | 0 | 0 | 0 | 0 |
| Week 375 | 5 | 5 | 0 | 0 |

Inertness of the spacing: element screenshots of the calendar grid alone (the sidebar logo shimmers), Month and Week, 375 and 1280, before vs `bea6fd16`: **4 of 4 pixel-identical** (`logs/pix-calgrid3.log`, shots `pages/{before,after3}-calgrid-*.png`). The run before that, on `cf0477f0`, showed 64 px / 24 px differing on the week block's times line only - the one-string render - which `bea6fd16` puts back.

(The legacy "after" run on `e4b8c51f`, before the spacing commit, still showed 19 / 5 / 0 / 5: that is what found the joined-text problem.) Other serious findings on the page are unchanged and not this batch: `color-contrast` (same counts before and after), `button-name` x4 at 375 (PremiumCalendar's icon-only view buttons), `list`/`listitem` (legacy). Month at 375 shows no count on the chip (compact), so the name has none there either.

### Fix 4 - the three dialogs (`fix-pages.mjs`, dialogs section)
For each action, at 375 and 1280, twice: once pressing Keep, once pressing the destructive button. The harness counts every non-select request the fake client receives.

| Action | Before | After (legacy and ivory) |
|---|---|---|
| Announcement trash icon | `site_announcements.delete` sent on the click, no dialog | dialog "Delete the announcement?", focus on "Keep the announcement", nothing sent on open; Keep: closes, nothing sent; "Delete the announcement": exactly one `site_announcements.delete`, dialog closes |
| Stars "Unlink" | `stars_student_map.delete` on the click | "Unlink Nguyễn Hoàng Phương Thảo Nguyên from Bé Bông (Pixel Pal)?", focus on "Keep the link"; Keep: nothing; "Unlink the child": one `stars_student_map.delete` |
| Family "Remove" | `students.update` on the click | "Remove Nguyễn Minh Anh from this family?", focus on "Keep them in the family"; Keep: nothing; "Remove from the family": one `students.update` |

36 dialog checks pass in each after run - legacy (`after`, `after2` on `a9abc824`) and ivory (`after-ivory`); no page errors. Shots: `pages/{after2,after-ivory}-dialog-{announcement,family,stars}-{375,1280}.png` (open; the before shots show the page after the click, no dialog) and `-after-*` (after the destructive button).

Found on the way: in the legacy look, `Button variant="destructive"` draws white on white everywhere it is used (its `glass-sm` lives in the utilities layer and paints over `bg-destructive`), so my first legacy screenshots showed an invisible "Remove from the family". The dialog now gives the red fill on the default variant off the Ivory routes (`a9abc824`); the shared variant is left alone (out of scope, and every other legacy destructive button has the same problem - see "Not changed" below).

## Checks
- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0 on `bea6fd16`'s tree (`logs/tsc2.log`; it loads the source - the same command found nothing wrong earlier and is the one `app-typecheck.test.mjs` runs).
- `node scripts/design-tokens-check.mjs`: PASS (70 pairs x 2 themes).
- `npm run test:bun`: 15 files, 176 pass, 0 fail (two new suites: `scripts/paletteOwner.test.ts`, `scripts/eventLabel.test.ts`).
- `node scripts/pgtest/run.mjs` not run: nothing under payroll, expenditures, class overhead, supabase or the mirrored modules changed.

## Not changed, found on the way
- **Legacy `Button variant="destructive"` is white on white.** `buttonVariants`' destructive class string starts with `glass-sm`, which `src/index.css` defines in `@layer utilities` after Tailwind's own, so its `background` wins over `bg-destructive/90`. Seen in my first legacy dialog screenshots; by the same CSS it applies to every legacy destructive Button (e.g. ClassAdminActions' archive, LeaderboardResetControl, EditHomeworkDialog delete). Ivory is fine. A fix belongs in `ui/button.tsx` (shared primitive) - not done here.
- `ui/command`'s dialog still has no title (`aria-dialog-name`, R19's note) - not this batch.
- `PremiumCalendar`'s icon-only view buttons have no name at 375 (axe `button-name` x4) - PremiumCalendar is another batch's.
- Escape on a real keyboard in a fullscreen book: the browser leaves fullscreen itself (see fix 2). Not changeable from the page.

## Not verified
- A real browser's Escape key in fullscreen (CDP keys are not the browser's own); iOS Safari (no Fullscreen API there - the class screen's overlay path is unchanged).
- Ctrl+K with Cmd on a Mac keyboard (same handler, `metaKey`; only Ctrl was pressed in the harness).
- Screen-reader output itself (NVDA/VoiceOver) for the new chip names; axe and the name/visible-text comparison only.
- The "Remove" consequence text against a real family's bills: read from the code (`calculate-tuition`, `_lib/sibling-state.ts`), not exercised on data.

## Files
- Harness copy: `FIX-screens/harness/` (`fix-fs.mjs`, `fix-pages.mjs`, `run-all.sh`, `run-extra.sh`, `fs-debug.mjs`, the fake client and fixtures). All data made up; "Bé Bông (Pixel Pal)" is a stand-in name in the fake, not a Pixel Pal export.
- Results: `FIX-screens/pages/*-results.json`, `FIX-screens/fs/*-results.json`, logs in `FIX-screens/logs/`.
