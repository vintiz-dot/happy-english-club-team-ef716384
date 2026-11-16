# EDITOR - rebuild of the homework rich-text editor

Owner's order: "rebuild the homework text editior, use cutting edge tools to build it. make it saas ready. ... remember speed, elegance, accuracy and cost optimization are key."

Branch: `editor-rebuild` (from `claude/hec-conductor-setup-efbaa5` at d35ba69a; the worktree's own branch was 5 main-only commits behind and conflicted in AGENTS.md / AIReportDialog, so a fresh branch was cut from the conductor instead of merging). Build and test only; nothing pushed or deployed.

## Where I am / next step

Done: editor built, every caller and renderer switched, Quill removed, lockfiles agree, unit tests, harness before/after, bundle sizes, checks (see below). Next: the conductor reviews and merges; nothing pushed.

## Technology: Tiptap 3.32.2 (ProseMirror), MIT packages only

- 3.32.2 is the newest 3.x published at least two weeks before today (30 Oct 2026; 3.32.3+ are from 5 Nov on). Exact versions, no Pro extensions, no Tiptap Cloud, no collaboration.
- Why not Lexical: the stored format. Every row in the database is Quill HTML (classes `ql-indent-N`, `ql-align-*`, Quill 2's `<ol><li data-list="bullet">`), and five renderers plus the homework PDF read it. Tiptap's schema reads arbitrary HTML through per-extension `parseHTML` rules and writes plain semantic HTML through `renderHTML`, so the new editor stores the same vocabulary Quill did (classes, `<p><br></p>` empty lines, `<li>text</li>`) and no renderer had to learn a new format. Lexical's HTML export writes its own markup (`<span style="white-space: pre-wrap;">` around every run, `class`/`dir` on blocks) unless every node's `exportDOM` is overridden, which would change what every existing renderer reads. Lexical is smaller (not measured here); the size cost of Tiptap is reported below and is paid only on screens that edit.
- Trimmed to what the screens use: subpath imports (no task lists, drop/gap cursors), a 40-line safe link mark instead of `@tiptap/extension-link` (which ships linkifyjs, ~30 kB, for auto-linking Quill never did), and a 40-line React binding instead of `@tiptap/react` (node-view portals, menus and a deep-equal library unused here). Those cuts took the editor chunk from 440 kB to 378 kB minified (136 -> 114 kB gzip). Dependencies (exact): `@tiptap/core`, `@tiptap/pm`, `@tiptap/extension-{document,paragraph,text,bold,italic,underline,strike,code,code-block,heading,blockquote,hard-break,list,subscript,superscript,text-style,image}`, `@tiptap/extensions`, all 3.32.2; dev: `jsdom` 30.1.3. Removed: `react-quill-new`. `npm install` and `bun install --lockfile-only` both run; `package-lock.json` and `bun.lock` committed and contain no Quill.

## Bundle sizes (`node node_modules/vite/bin/vite.js build`, kB raw / gzip)

| | Before (Quill) | After |
| --- | --- | --- |
| Editor code (lazy chunk) | `react-quill-new`+Quill 204.6 / 61.3 | `EditorImpl` 377.8 / 114.1 |
| Editor CSS | `quill.snow.css` 23.8 / 3.6, linked by every chunk that imported it (HomeworkSubmission, AssignmentUpload, EditHomeworkDialog, ExamReportEditor, ClassHomework, JournalEditor) - so it loaded on reading pages too | `EditorImpl.css` 8.5 / 2.0, only with the editor |
| Reader | `sanitizeHtml`/`cleanRichHtml` inside each page chunk | `RichTextView` 7.7 / 3.6 + 1.8 / 0.6 css (shared; DOMPurify included) |
| Entry `index.js` / `index.css` | 544.9 / 166.7, 256.6 / 41.3 | 544.9 / 166.7, 254.1 / 40.9 (Quill rules gone) |
| All assets | 5862 / 1703 | 6024 / 1757 |

Plainly: the editor itself is about 53 kB gzip heavier than Quill. It is downloaded once (hashed, immutable asset) and only when a screen with an editor opens; reading pages ship no editor code and no Quill CSS any more. ClassHomework and JournalEditor imported Quill statically, so their routes used to pull the whole Quill chunk on load; now they load the editor lazily. `preloadRichTextEditor()` exists if a screen wants the chunk fetched before the editor appears (no caller uses it yet).

## Harness proof (`C:\Users\Dell\hec-tools\r21-harness`, made-up data, fake Supabase client, no network)

Added to the harness (nothing existing changed): `editor-patch.mjs` (builds `preview-editor/` from `preview/`: old-Quill HTML rows for two homeworks, a journal entry, an exam report and a graded answer; every write's payload recorded), `editor.mjs` (the run), `editor-compare.mjs`. Before = an export of the conductor branch (`C:\Users\Dell\hec-tools\editor-before`, node_modules junction to the main checkout's); After = this branch. Output and screenshots: `C:\Users\Dell\hec-tools\editor-out` (`before-*`, `after-*`, `compare.jsonl`).

8 screens x 375/1280 x light/dark = 32 runs each side: ClassHomework new, ClassHomework editing an old Quill row, AssignmentUpload, EditHomeworkDialog (old row), ExamReportEditor new and editing an old row, the student's journal (JournalEditor), the student's homework submission. Each run: page-load requests, open the editor, screenshot, type a sentence with the long name, Ctrl+B, "- " bullet list, Tab / Shift+Tab nesting, Ctrl+K link, toolbar Indent/Outdent, paste of Word clipboard HTML, screenshot, axe on the editor, save.

- Old Quill rows load with their bullets, numbers, nested depth, indents, alignment, colours, highlight, links, headings, quote (screenshots `after-class-hw-old-*`, `after-assign-edit-*`, `after-exam-edit-*`).
- Requests: page-load multiset identical in all 32 pairs; whole-run multiset identical in 29. The 3 others: `assign-edit-1280-light` one extra `video_submissions` select (a background refetch; the other three sizes/themes are identical), and `journal-375-*` where BEFORE could not save at all (Quill's fixed-height box overflowed onto the Save button at 375 px; the click timed out) and AFTER saved with the same journals insert as both 1280 runs.
- Save payloads: same tables, methods, keys and value types in every pair that saved on both sides (homeworks insert/update, homework_submissions upsert + point_transactions + early_submission_rewards, journals insert). `submission_text` / `body` are HTML strings as before.
- axe, critical + serious, inside the editor: before 1-2 on every teacher screen in both themes (`aria-command-name`: Quill's unnamed toolbar buttons; `color-contrast` in dark). After: 0 in all 16 light runs; 1 in each dark run, and in every case it is the AUTHOR'S colour in the content (the pasted Word "Bring the book!" in #C00000, or the old row's red "Due Friday!") on the dark surface - the editor's own controls have none. The student's box had the same 1 in dark before.
- Editor checks in every after run: textbox role, multiline, named by its label ("Your answer", "Notes", "Description", "Report content (optional)", "Content"); toolbar labelled, exactly one tab stop, arrow keys move; Bold reports `aria-pressed="true"`; 0 unnamed buttons; 0 targets under 44 px; caret on screen after typing; no horizontal overflow; Word paste becomes a real nested list with no black text (before: "·  Read page 4" typed-bullet paragraphs and `color: black`).
- Seen in screenshots: dark mode toolbar readable (before: Quill's icons on a near-black bar, highlight text white on yellow); 375 px toolbars wrap (full preset 4 rows, student's 1 row).

## Checks

- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npm run test:bun`: 207 pass, 0 fail, 14 files (41 of them the new editor suite).
- `node scripts/design-tokens-check.mjs`: PASS.
- `node scripts/pgtest/run.mjs`: exit 0, 6113 assertions across 62 suites, 0 failed (includes the app typecheck suite).

## Not verified

- A real iPhone (Safari keyboard + caret) and a real Android phone: the harness is desktop Chrome at 375 px with touch emulation. The visualViewport scroll-margin logic is in place but unproven on a device.
- Screen readers (VoiceOver/TalkBack/NVDA) - axe and the ARIA attributes only.
- Paste from the real Word / Google Docs apps: tested with representative clipboard HTML, not the live clipboard.
- The colour palette's dark-mode contrast for coloured TEXT chosen by a teacher (content, not controls); see axe above.
- Old rows in production: the fixtures are invented; no production row was read.
- Today's renderers number a Quill 2 numbered list that has bullet items between its numbers by counting the bullets too ("4." after 1 + 2 bullets); unchanged, as asked ("renders the same as today").

## Overlap check

Start and finish: no file on this branch is changed by `worktree-agent-a2e9e781ed074eebd`, `worktree-agent-a691e69d8dce8ffe6`, `worktree-agent-abb38f42ad67d0fe0`, `worktree-agent-ae3a47575e6e4c362`, `origin/pc2/d4-3b`, `origin/pc2/r22-r23` or `d4-3a-lessons`.

## What was built

`src/components/rich-text/` (README.md there has the API):

| File | What |
| --- | --- |
| `RichTextEditor.tsx` | Public editor: a lazy wrapper (`React.lazy` of `EditorImpl`), so the editor is its own chunk; `fallback` prop keeps each caller's loading text. `preloadRichTextEditor()`. |
| `EditorImpl.tsx` | Tiptap editor, toolbar presets `minimal` / `homework` / `full`, link and colour panels inside the editor box, counter, picture adapter, iPhone keyboard margin. |
| `extensions.ts` | One schema for every preset (a coloured row edited on a no-colour screen keeps its colours, as with Quill). Quill indent/alignment as classes; safe link mark. |
| `legacy.ts` | Reads Quill HTML: flat `data-list` / `ql-indent` lists rebuilt as nested lists, `ql-ui` markers dropped, `<p><br></p>` read as an empty line, colour on `<strong>` moved to a span; Word's `mso-list` paragraphs become real lists on paste. |
| `sanitize.ts` | `sanitizeRichHtml(html, "store" | "render" | "paste")`, DOMPurify (already a dependency) + allow-list; links through `safeHttpUrl`. Used on save (every `onChange`), on paste, on render (`RichTextView`, and `cleanRichHtml` now delegates to it). |
| `RichTextView.tsx` | Read-only render, no editor code. |
| `strings.ts` | Every editor string, English + Vietnamese, overridable per prop. |
| `rich-text.css`, `view.css` | `hec-*` tokens only; the editor root brings `data-hec-theme="ivory"` when the page has none, so light and dark both resolve. |

Callers switched (behaviour kept; what is saved, when, and validation unchanged): `student/HomeworkSubmission` (minimal), `admin/class/ClassHomework` (homework), `teacher/AssignmentUpload` (full), `teacher/EditHomeworkDialog` (full), `journal/JournalEditor` (full; also the student's journal), `exam-reports/ExamReportEditor` (homework). Renderers switched to `RichTextView` with their existing classes: `ClassHomework`, `AssignmentUpload`, `HomeworkGrading` (x2), `HomeworkGradingList` (x2), `JournalViewer`, `StudentExamReportsTab`, `ExamReportsManager`; `homework/RichText` is now a thin wrapper over it (`.hw-rich` kept). Untouched on purpose: announcements (their bodies are not written by this editor), `HomeworkPdfDownload` (on another agent's branch; it reads `cleanRichHtml`, which now is the shared sanitiser, so it follows without an edit).

Removed: `react-quill-new` (and with it `quill`, `parchment`, ...), every `quill.snow.css` import, the `.ql-*` / `.hw-answer-editor .ql-*` rules in `index.css`, the five `IVORY_QUILL` override strings.

## Deliberate differences (each is a fix; no text a person reads changed except the editor's own controls)

1. An empty editor reports `""`. Quill reported `<p><br></p>` once something had been typed and deleted, so the student's "Send to my teacher" lit up for an empty answer and `ClassHomework` saved `<p><br></p>` as the notes; now the button stays off and the column gets `null`, exactly as when nothing was typed.
2. The Quill "image" button is gone from ClassHomework / AssignmentUpload / EditHomeworkDialog. Quill embedded the picture as a base64 `data:` URL inside the HTML (rows of hundreds of kB), and no renderer ever showed it (`img` was never in any allow-list). The editor has an `onUploadImage(file) => url` adapter; no caller passes one because a new upload path needs a storage policy case (supabase/, not in scope).
3. Renderers that used `sanitizeHtml` (teacher grading, exam reports, journal viewer, homework lists) drew Quill 2 bullet lists as 1. 2. 3. (`data-list` was stripped) and ignored `ql-indent`; through `RichTextView` they draw bullets and indents as the student homework reader already did. Pasted layout styles (font, size, margins) no longer reach those screens either.
4. Stored links are http(s) only (`safeHttpUrl`); a `mailto:` or `javascript:` link keeps its text and loses the link. Same rule at render.
5. Quill check lists (`data-list="checked"`, never offered by any toolbar here) open as bullet lists; the tick is not kept. The reader still draws old rows with ticks.
6. Typed URLs are not auto-linked (Quill did not either).
7. Ctrl/Cmd+K inside a homework/full editor opens the link field and does not also open the page's command palette (found by the harness: the palette listens on window/document). In the student's minimal editor Ctrl+K is left to the page.

## Compatibility (unit tests, `scripts/richTextEditor.test.ts`, 41 tests)

18 invented Quill fixtures (`scripts/fixtures/rich-text/quillFixtures.ts`): Quill 2 bullet / numbered / mixed / three-deep flat lists, Quill 1 `<ul>`/`<ol>` with indent classes, headings with alignment, indented paragraphs (one at 5, deeper than the reader draws), links, bold links, colour and highlight (also on `<strong>`), strike/sub/sup, empty lines, quote + code block, a student's answer, a long Vietnamese name, pasted styles Quill kept, a centred list item, a pasted line break. Each is opened in the real schema (Tiptap headless in jsdom), saved, rendered, and its MEANING (text, marks, link targets, colours, list kind and depth, indent, alignment, heading level, quote) compared with today's renderer - the untouched copy of the old `cleanRichHtml` in `scripts/fixtures/rich-text/legacyRichText.ts`. All 18 equal. Also: saving is idempotent (open a saved row, save again: byte-identical); today's renderer reads the NEW rows with the same meaning (so the homework PDF and any old screen are fine); render output equals the old `cleanRichHtml` byte for byte apart from link attributes; the old `sanitizeHtml` renderers are shown to have dropped Quill 2 bullets; sanitiser attacks (script, handlers, `javascript:` in four spellings, `url()`/`expression()` in styles, iframe/svg/form, foreign classes/ids/data) in all three modes; Word and Google Docs clipboard HTML; English/Vietnamese key parity; the folder imports nothing from the app but `safeUrl`; the CSS has no raw colours.

Test DOM: jsdom 30.1.3 (dev dependency). happy-dom was tried first and dropped: its NodeIterator does not keep a detached root, so DOMPurify (correct in browsers and jsdom) dropped the first element of every input there.
