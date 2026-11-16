# EDITOR review (independent)

## Verdict: SHIP WITH CHANGES

Security holds, nothing children or families see changes for the worse, and the build, types, tokens and unit suites pass on the merged tree. Two blockers must be fixed first (one keyboard defect, one backup step), plus one fix that costs a single line (maxLength).

Where I am / next step: review finished. Nothing pushed or deployed. Next: the builder fixes B1 and B3, the owner takes the B2 backup, and then a re-check of B1 in the harness.

Reviewed: `editor-rebuild` @ 1c220c3b, merged with `claude/hec-conductor-setup-efbaa5` @ 268a0500 on `review-editor`. Probes: `scripts/richTextReview.test.ts` (13 tests, in `npm run test:bun`). Harness evidence: `docs/evidence/EDITOR-review/`.

### Blockers

- **B1. Toolbar keyboard navigation dead-ends at a disabled button (WCAG 2.1.1).** `onToolbarKey` (EditorImpl.tsx ~376) moves focus to the next `[data-rte-item]`, including `disabled` ones. A disabled button cannot take focus, so the next ArrowRight starts from the same button again. Real Chrome, AssignmentUpload, full preset: ArrowRight from Heading 1 stops for good at "Numbered list", because Outdent is disabled at indent 0. Indent, Sub/Sup, the four alignments, Link, Quote and Clear cannot be reached with ArrowRight. The second half of the defect: when the button holding the roving tab stop becomes disabled (press Outdent back to 0), focus drops to the page and the ONLY `tabIndex=0` button is the disabled Outdent, so Tab no longer reaches the toolbar at all (`results-375-tail.txt`, `afterOutdent`). Fix: keep unavailable items focusable with `aria-disabled="true"` and make `run()` do nothing for them (the APG toolbar pattern), or skip `:disabled` in the arrow walk and move the tab stop off a button that becomes disabled. Add a harness step that walks the whole toolbar.
- **B2. Pictures in old homework are dropped when a teacher edits the text, with no warning. A backup of those rows is required before deploy.** Coordinator's question (a): no current renderer shows them to children or families. I checked every path on the merged tree: `sanitizeHtml` (lib/sanitize.ts), the old and new `cleanRichHtml`, the hec-docs PDF `sanitizeRich` (hec-docs/src/format.ts) and `richTextPreview` all leave out `img`. The only person who ever saw these pictures was the teacher, inside Quill's edit box. (b): in the harness, a made-up homework with a base64 PNG opens in EditHomeworkDialog with an empty line where the picture was. Typing one word and clicking Save Changes writes `<p>Look at the picture:</p><p><br></p><p>Write three sentences. Thanks.</p>`, so the picture is gone for good (`results-picture-row.json`, `edit-picture-row-1280-light.png`). A save that leaves the editor untouched keeps the original body, because there is no onChange. Ruling under the coordinator's rule: the pictures are not visible today, so this does not block on visibility. It still destroys stored content that a teacher wrote. So before deploy the owner copies the 10 `homeworks` rows whose `body` contains `<img` (id, body, updated_at) into a backup table (read-only, done by the owner). After that, one of two code paths: (i) recommended, a notice when the editor loads a value whose `<img>` it will drop ("This homework has N picture(s) that students never saw; editing the text removes them"), or (ii) the coordinator's option of keeping `img` with http(s) or `data:image/(png|jpeg|gif|webp)` src, size-capped, through store and render. Option (ii) would show children pictures they have never seen, so it needs the owner's decision.
- **B3 (one line, latent). `maxLength` destroys existing longer content.** `editorExtensions` turns on CharacterCount `limit` without `autoTrim: false`. The installed source (`@tiptap/extensions/dist/character-count/index.js` 44-63) deletes `[0, over)` on the FIRST transaction, which can be a click or a selection. A longer old row loses its START and the save writes that. A row loaded after mount through `setContent` (how EditHomeworkDialog loads) is refused by `filterTransaction`, so the editor stays empty. Both are shown in `richTextReview.test.ts` (asserted as found; flip those tests when this is fixed). No caller passes `maxLength` today, but the README advertises `maxLength={2000}`. Fix: `autoTrim: false`, and let `setContent` through (e.g. meta `preventUpdate` / a skip flag), or enforce the limit only on typing and paste.

### Nice to have

- N1. `aria-*` attributes survive store, paste and render (DOMPurify `ALLOW_ARIA_ATTR` is on by default): pasted `aria-hidden="true"` hides text from a screen reader. Not script. The old sanitisers did the same. Add `ALLOW_ARIA_ATTR: false`.
- N2. `dompurify` 3.4.16 (unchanged by this branch) is inside three advisories (GHSA-mrv2-3pqr-j5jr IN_PLACE+hook, GHSA-cg2g-xh64-v4q7 SAFE_FOR_TEMPLATES, GHSA-c6gr-qvv4-5v3f xhtml). None applies here: the sanitiser uses its own instance with no hooks, and neither of those options. But the new code chose `IN_PLACE`, so bump to a fixed 3.4.x once it is two weeks old.
- N3. Scheme-less links Quill stored (`href="youtube.com/..."`, which were relative and already broken) now render as plain text. Optionally upgrade a bare domain to `https://` in store mode.
- N4. `<Label htmlFor>` points at a contenteditable div, which is not labelable: clicking the label does not focus the box. The name comes through `aria-labelledby`, which works. Focus the editor on label click.
- N5. Ctrl+K typed inside the link panel's URL input (outside ProseMirror) still opens the page palette. Minor.
- N6. `.rte-content img` has no `max-width: 100%`. This is latent until a caller passes `onUploadImage`.
- N7. README "Tests" says happy-dom; the suite uses jsdom.

### Findings, one line each

1. XSS: 50 payloads (script, handlers, `javascript:`/`vbscript:`/`data:` in mixed case, entity-encoded, tab- and newline-split, leading-space, protocol-relative, SVG/MathML incl. the mglyph/style mXSS, iframe/srcdoc/object/embed, style `url()`/`expression()`/escapes/`var()`/`!important`/positioning, form/base/meta/link, noscript/template/textarea/title/xmp, comments, clobbering ids, foreign classes and `data-*`, `target` without rel) all come out inert in store, paste and render. Each is a fixed point when sanitised again, stays inert after a full editor open and save, and ProseMirror alone (no sanitiser) emits no script. Only aria-* gets through (N1).
2. Links: sanitiser, `SafeLink` parse/set and the link panel all go through `safeHttpUrl`. Every kept `<a>` gets `target=_blank rel="noopener noreferrer"`. Unsafe hrefs are unlinked and their text kept.
3. Renderers: every renderer of homework, journal, exam-report and submission HTML on the merged tree goes through `RichTextView` or `cleanRichHtml` (= `sanitizeRichHtml` render). That covers ClassHomework, AssignmentUpload, HomeworkGrading x2, HomeworkGradingList x2, JournalViewer, StudentExamReportsTab, ExamReportsManager, homework/RichText (HomeworkDetailDialog, AssignmentsList, HomeworkSubmission), HomeworkPdfDownload and hecDocs. The remaining `dangerouslySetInnerHTML` are announcements (own `sanitizeHtml`, not editor content) and ui/chart.tsx (CSS). `teacher_feedback` renders as text. JournalList previews strip tags into text. None missing.
4. Paste: `transformPastedHTML` = `preparePaste` on a DOMParser document, which is inert, then `sanitizeRichHtml(paste)`. ProseMirror applies the same transform to drops.
5. Old Quill rows: the builder's 18 fixtures plus mine open, save and render with the same meaning. A row opened and saved untouched is not rewritten, because opening emits no update.
6. Empty editor saves `""`. No NOT NULL or CHECK breaks on it: `homeworks.body`, `journals.content_rich`, `exam_reports.content_html` and `homework_submissions.submission_text` are nullable text. Callers turn `""` into `null` (homework, submission, exam report) or store `""` (journal). No query, filter or function matches `<p><br></p>`. The student's Send button now stays off for an empty answer (it was on before), and ExamReportEditor's "content or PDF" check is unchanged.
7. Callers save the same tables, keys and moments (builder's harness payload comparison, and my picture-row run: one `homeworks` update with `body`).
8. Ctrl/Cmd+K: the editor's `handleKeyDown` only acts while the caret is in a homework/full editor, and stops propagation there. The palettes (AdminTopBar on window, CommandPalette on document, both bubble phase) work everywhere else and in the student's minimal editor.
9. Dependencies: every runtime package added is MIT (20 `@tiptap/*` at exactly 3.32.2, ProseMirror, orderedmap, rope-sequence, w3c-keyname). No Tiptap Pro, no cloud. `jsdom` 30.1.3 is dev-only, as are its non-MIT transitive dependencies (BSD, ISC, Apache, BlueOak, CC0, MIT-0). `npm ci` succeeded, so package-lock and package.json agree. bun.lock's workspace dependencies equal package.json, and every tiptap/prosemirror/jsdom/dompurify version is the same in both lockfiles. No Quill in either. `npm audit` lists no advisory for any added package (it does list N2, and pre-existing dev-tooling advisories).
10. Bundle: `EditorImpl` (387 kB raw) is its own chunk. The only thing that references it is a `React.lazy` dynamic import inside the shared `RichTextView` chunk (3.8 kB). The entry only lists RichTextView in a route-preload map. ProseMirror code appears in the editor chunk alone, and the editor CSS loads only with it. Reading pages ship no editor code.
11. Phones (harness, 375 px, light and dark, made-up data): AssignmentUpload (full) and the student's answer box (minimal) render, no horizontal overflow, 0 targets under 44 px, 16 px writing text (iOS does not zoom), the dark toolbar is readable. iOS caret: the `visualViewport` scroll margin is in place but, as the builder says, not proven on a device.
12. Accessibility in code: role=toolbar with a label, one tab stop, `aria-pressed`, `aria-keyshortcuts`, named buttons, textbox role, multiline, labelled-by; panels close on Escape. Defect: B1.

### Merge conflicts resolved

None. `git merge claude/hec-conductor-setup-efbaa5` was clean. The only file both sides changed is `src/index.css`: the editor removed the `.ql-*` / `.hw-answer-editor .ql-*` blocks, and the conductor added `[data-hec-document]`/`#hec-print-report` to the token selectors (R21b). The hunks are separate and both kept. No conductor change added a Quill caller; `src/` has no `react-quill`/`IVORY_QUILL` left.

### Checks on the merged tree

- `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.app.json`: exit 0.
- `npm run test:bun`: 244 pass, 0 fail, 18 files (including the 13 review probes).
- `node scripts/design-tokens-check.mjs`: PASS.
- `node node_modules/vite/bin/vite.js build`: exit 0.
- `npm ci` (own worktree, no junction): exit 0.
- Not run: `node scripts/pgtest/run.mjs`. This branch changes no SQL or function, and the builder reports it green.

### Not checked

- A real iPhone or Android device, and screen readers.
- Production rows: only the coordinator's counts (10 `<img>` rows in `homeworks.body`, 9 base64). No content was read.
- mXSS in Safari/Firefox parsers: probes run in jsdom; the payloads are the browser-known ones, and DOMPurify's allow-list here has no SVG, MathML or raw-text elements.
- Lexical/Tiptap alternatives and the builder's before/after harness numbers (taken as reported).
