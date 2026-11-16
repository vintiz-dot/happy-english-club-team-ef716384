# R21 blockers (R21b)

Where I am / next step: **DONE.** Fixes 1-3 committed and checked; nothing pushed, deployed or merged. Next: conductor review, then merge into the conductor (a trial merge with the conductor at 304bc0a8 is clean).

Base: the conductor at d35ba69a (R21 merged), then merged with the conductor at a7110af3 (HEC Docs from main) mid-task, as instructed. "Before" below is a7110af3's code. For every document file, a7110af3 is byte-identical to 22845482 and c132bf7b (`git diff` empty), so "before, staff routes unlisted" is the look that is live today.

## 1. Printed and exported documents (BLOCKER)

### What still renders inside the page, and what HEC Docs already isolates

Since main's HEC Docs, every PDF button first asks `src/lib/hecDocs` (`tryMakeDocument`). That path builds an HTML **string** from the shared template (`engine.prepare`; it creates no element in the page: no `appendChild`, no iframe, no `getComputedStyle`) and sends it to the printer Worker, which prints it in its own browser. The page's CSS, `data-hec-theme` and `.dark` never reach it.

Proof: in the harness the engine's HTML for all five kinds (progress report, statement, invoice, access card, homework) is **byte-identical** across live / listed, light / dark, before / after (table below). The Worker itself was not called (no network from the harness); a local print of that HTML in a blank page is saved as `hec-*.pdf` per kind.

The old generators stay as the fallback (offline, printer allowance used up, data error), and those still render inside the scoped page. These are the ones fixed:

| Fallback | Where it renders | Before this fix, on a listed route | Fix |
|---|---|---|---|
| `BulkReportExport` (class roster, admin Reports) -> `ReportDocument` in an off-screen stage, rasterised by `reportPdf` | a fresh React root inside `<html data-hec-theme="ivory">` | `text-muted-foreground`, borders, the Progress bars and the font took the Ivory values (the bars went ink; Dark gave the ivory ink-soft muted text) | `data-hec-document` on `ReportDocument`'s root |
| `StudentAccessManager` -> `AccessCardDocument` | same | nothing visible: all colours explicit, font inline (raster identical before and after) | `data-hec-document` on the root anyway (inert) |
| `AIReportDialog` print fallback -> portal `#hec-print-report` | under `<body>`, in the page's Ivory context | font and tokens changed; its learning-style badges took the Ivory recipe (context) | the id is in the CSS opt-out; `<IvoryContext.Provider value={false}>` around the portal only |
| Admin Reports statement fallback (`StudentStatementPrint`, same portal id) | under `<body>` | font, borders | covered by `#hec-print-report` (file unchanged) |
| `InvoiceDownloadButton` preview / `TuitionBulkDownload` -> `InvoicePrintView` | dialog / bulk stage | font, the `border-t` and QR `border` colours | `data-hec-document` on its root (**separate commit**: also opens for families on `/tuition`, ivory since R08) |
| `HomeworkPdfDownload` fallback stage | appended to `<body>` | all inline styles; only pasted rich text without its own border colour could pick up `--border` | `data-hec-document` on the container (**separate commit**: also used by students) |
| `ProfileShareCard` | student dashboard only | not a staff screen | not touched |

The opt-out (`src/index.css`, the only CSS change): `[data-hec-document]` and `#hec-print-report` are added to the three LIGHT `:root, [data-hec-board]` blocks (never to the `.dark` ones), so a document re-declares the old light token values in both themes; under the scope it also gets the light `--hec-*` values and the old font (`font-family: var(--font-sans)`), like the boards' opt-out. Outside the scope the re-declared values equal what the element inherits, so it is inert there. DESIGN_SYSTEM s.17 already lists printed reports (`#hec-print-report`) and PDF templates as outside the system.

### Proof (harness, made-up data, no sign-in)

`C:\Users\Dell\hec-tools\r21-harness\r21b-docs.mjs` + `r21b-docstage.tsx` (port 5437) mount each document exactly as its caller does (same component, same stage width, same React root or portal) on a real app page, then save: the document element on screen, the raster `reportPdf.nodeToCanvas` makes (what goes into the PDF), the jsPDF file, the print portal under print media (and Chrome's print-to-PDF), and the HEC Docs HTML. Four conditions, light and dark each: **base-live** (a7110af3 code, `/admin?tab=audit-clips`, which is unlisted = what staff get today), **base-flip** (same code on listed `/admin?tab=reports` = the bug), **after-flip** (this branch, listed), **after-live** (this branch, unlisted). Pixels with any channel delta > 16 vs base-live / light (`documents-compare.txt`):

| Document | after-flip light | after-flip dark | base-flip light | base-flip dark | after-live light / dark |
|---|---|---|---|---|---|
| Progress report, raster (the PDF) | SAME | SAME | 109,439 px | 109,439 px | SAME / SAME |
| Progress report, on screen | SAME | SAME | 27,620 px | 34,867 px | SAME / SAME |
| Invoice, raster | SAME | SAME | 2,920 px | 2,920 px | SAME / SAME |
| Access card, raster | SAME | SAME | SAME | SAME | SAME / SAME |
| AI report print copy (portal, print media) | SAME | SAME | height 961 vs 954 | height 961 vs 954 | SAME / SAME |
| Statement print copy | SAME | SAME | 1,264 px | 1,264 px | SAME / SAME |
| HEC Docs HTML, all 5 kinds | identical | identical | identical | identical | identical |

Notes on the rows not listed: the invoice and access card **on screen** differ by text-edge pixels only (14,724 / 29,600 px, identical in light and dark and equal for base-flip and after-flip on the access card, diff image = glyph outlines): sub-pixel anti-aliasing of the live page under the old body's animated `::before` layer. Their rasters (the PDFs) are SAME. Full-page print screenshots differ by the page background, which paper does not print; the portal element itself is SAME.

Computed on the document root (probe.json): base-live and after-flip both `muted 250 15% 45%`, `border 250 25% 88%`, `primary 224 64% 33%`, old font stack, `color-scheme: light`, in light and dark; base-flip had `223 19% 33%` / `45 11% 71%` muted in light / dark.

Files: `C:\Users\Dell\hec-tools\r21b-docs-out\{base-live,base-flip,after-flip,after-live}\` (PNG, PDF per kind: `report-*.pdf`, `access-*.pdf`, `invoice-*.pdf` from jsPDF; `ai-print-*.pdf`, `statement-print-*.pdf` from Chrome print; `hec-*.pdf` local prints of the HEC Docs HTML). JPEG copies here: `R21b/{base-live,base-flip,after-flip}-{report,invoice,access}-raster-*.jpg`, `-{ai,statement}-printdoc-*.jpg`.

## 2. Unnamed controls

| Control | Fix | axe critical, 375/1280 x light/dark (before -> after) |
|---|---|---|
| `/admin` overview: `PointsResetControl` (Reset Scope, Select Class, Select Student) | `aria-label` = its label | adm-overview 1 -> 0 |
| `StudentsPageFilters` (Sort by, Filter by class) | `aria-label` from the placeholder words | students 3 -> 1 (left: `StudentForm`'s family select, pc2/d4-3b) |
| `PointsBreakdownChart` month | `aria-label="Month"` | student 5 -> 1 (left: `CefrDefensePanel` "Level..." select, not on the list) |
| `SetMonitorControl` | `aria-label="Class Monitor"` (its heading) | t-class-roster 1 -> 0 |
| `ClassForm` Teacher / Session Fee | `id` matching the existing `Label htmlFor`; slot Day/Start/End `aria-label` | adm-classes 1 -> 0; /classes 21 -> 19 nodes (left: EnrollmentManager etc., below) |
| `RecurringSessionsManager` | add row: `htmlFor`/`id`; edit row: `aria-label` (Day of Week, Start Time, End Time) | adm-class-set 8 -> 6 nodes, label rule 1 -> 0 (left: `ClassSettings` Switches/selects, a36ad) |
| VietQR picture file input (`AccountInfoManager`) | `htmlFor`/`id` | adm-account 1 -> 0 |
| `TeachersList` Active/Archived tabs | `aria-controls` points at the list (`CardContent id="teachers-list"`); filter behaviour unchanged | teachers 1 -> 0 |

The RecurringSessionsManager "Switches" in R21's leftover are `ClassSettings`' Switches (same tab), deferred below.

## 3. Numbers

- `PointsBreakdownChart` stats: `font-sans tabular-nums` (in the controls commit e76ae6ad).
- Finance > Expenditures amounts (`ExpendituresManager` cells: 15.000.000 / 2.350.000 / 3.500.000 ₫) and the `/teachers/:id` header rate: `tabular-nums`. Also the `/teachers` list rates (3 amounts the money probe found, same file as fix 2).
- MONEY, R12 money harness (`r21m12a`, its fixtures; `C:\Users\Dell\hec-tools\r21b-m12`): `fin-recurring-list` and `tp-payrate`, 375/1280 x light/dark: numbers multiset equal 8/8, requests equal; non-tabular amounts before `15.000.000 ₫, 2.350.000 ₫, 3.500.000 ₫` / `250,000 ₫ / session`, after none.

## Acceptance (axe harness `r21b-a46.mjs`, port 5438, before a7110af3 / after this branch, 16 screens x 4 = 64 runs a side; `C:\Users\Dell\hec-tools\r21b-axe`)

- Requests multiset equal on every run. Numbers equal on every run except `/students/:id` and `/student/dashboard` at 1280: the Star Board's animated tallies inside the board (`.sb-rv`, captured mid-count, as R21 reported); no file of mine renders there.
- No overflow at 375. Serious: none added (student 2 -> 1-2: board).
- Outside the staff area: `<main>` byte-identical 19/20 (`/student/dashboard`, `/student/journal`, `/family/dashboard`, `/auth`, `/admin?tab=audit-clips` x 4); the one diff is the same board tally on `/student/dashboard` 1280 light.

## Checks

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.app.json` | exit 0 |
| `node scripts/design-tokens-check.mjs` | PASS (70 pairs x 2 themes) |
| `static-counts.mjs` | equal to a7110af3: select('*') 67, img without alt 3, icon-only buttons without label 11, useQuery 341, `: any` 859, `as any` 404 |
| `design-rollout-inventory.mjs` | totals equal to a7110af3 (palette 1447, hex 108, dark 283, cut 115); the document files keep their palette classes on purpose (DS s.17) |

## Deferred (the file is being changed on another branch)

| Item | File | Blocked by |
|---|---|---|
| Confirmations / Sort by selects on `/tuition`, `/students/:id/tuition` (one-line `aria-label`s, reverted here) | `admin/AdminTuitionList.tsx` | `worktree-agent-af9c2cb270119c97d` (T3 prior balance) |
| Class settings Switches and selects (6 nodes) | `admin/class/ClassSettings.tsx` | `worktree-agent-a36ad2752b190053b` (D4 class fee) |
| EnrollmentManager selects, family select on /students, FamilyForm, ClassEnrollments date input | `EnrollmentManager.tsx`, `StudentForm.tsx`, `FamilyForm.tsx`, `class/ClassEnrollments.tsx` | `origin/pc2/d4-3b` (not on my list either) |

Not on the list, seen: `cefr/CefrDefensePanel.tsx` "Level..." select unnamed on `/students/:id`; RecurringSessionsManager's Edit/Delete icon buttons have no words to name them from.

## Not verified

- The HEC Docs printer Worker (cloud, never called); only that the HTML it receives is theme-independent.
- A real printer / the browser print dialog: print media emulation and Chrome print-to-PDF only.
- Real phone fonts; the documents were rendered in desktop Chrome on Windows.
- InvoicePrintView and HomeworkPdfDownload also render for families/students (ivory since R08); their commits are separate (90207923, e138dc2c) and restore the pre-R08 document look there too. Drop them if that must wait.
