# EDITOR - rebuild of the homework rich-text editor

Owner's order: "rebuild the homework text editior, use cutting edge tools to build it. make it saas ready. ... remember speed, elegance, accuracy and cost optimization are key."

Branch: `editor-rebuild` (from `claude/hec-conductor-setup-efbaa5` at d35ba69a; the worktree's own branch was 5 main-only commits behind and conflicted in AGENTS.md / AIReportDialog, so a fresh branch was cut from the conductor instead of merging). Build and test only; nothing pushed or deployed.

## Where I am / next step

Steps 0-4 done (editor built, every caller and renderer switched, Quill removed, lockfiles agree, unit tests green). Next: harness proof (before/after), final bundle sizes, the full check run.

## Technology: Tiptap 3.32.2 (ProseMirror), MIT packages only

- 3.32.2 is the newest 3.x published at least two weeks before today (30 Oct 2026; 3.32.3+ are from 5 Nov on). Exact versions, no Pro extensions, no Tiptap Cloud, no collaboration.
- Why not Lexical: the stored format. Every row in the database is Quill HTML (classes `ql-indent-N`, `ql-align-*`, Quill 2's `<ol><li data-list="bullet">`), and five renderers plus the homework PDF read it. Tiptap's schema reads arbitrary HTML through per-extension `parseHTML` rules and writes plain semantic HTML through `renderHTML`, so the new editor stores the same vocabulary Quill did (classes, `<p><br></p>` empty lines, `<li>text</li>`) and no renderer had to learn a new format. Lexical's HTML export writes its own markup (`<span style="white-space: pre-wrap;">` around every run, `class`/`dir` on blocks) unless every node's `exportDOM` is overridden, which would change what every existing renderer reads. Lexical is smaller (not measured here); the size cost of Tiptap is reported below and is paid only on screens that edit.
- Trimmed to what the screens use: subpath imports (no task lists, drop/gap cursors), a 40-line safe link mark instead of `@tiptap/extension-link` (which ships linkifyjs, ~30 kB, for auto-linking Quill never did), and a 40-line React binding instead of `@tiptap/react` (node-view portals, menus and a deep-equal library unused here). Editor chunk 440 kB -> 376 kB minified before those two cuts were taken out.

(sections below are filled in as the proof runs)
