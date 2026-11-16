# rich-text

One rich-text editor and one reader for the whole app. Tiptap 3 (ProseMirror, MIT packages only; no Pro extensions, no cloud). The folder imports nothing from the app except the pure URL check `@/lib/safeUrl`, so it can be lifted into another product as it is.

## API

```tsx
import { RichTextEditor, RichTextView, sanitizeRichHtml } from "@/components/rich-text";

<Label id="notes-label">Notes</Label>
<RichTextEditor
  value={html}                 // stored HTML; old Quill rows open as they were
  onChange={setHtml}           // sanitised HTML, "" when empty
  toolbar="homework"           // "minimal" | "homework" | "full" (buttons only; every preset reads every format)
  placeholder="Write here…"
  ariaLabelledBy="notes-label" // or ariaLabel="Notes"
  maxLength={2000}             // optional: counter + hard limit, in characters of text
  disabled={saving}
  onUploadImage={async (file) => url} // optional: without it there is no picture button
  locale="vi"                  // "en" (default) | "vi"
  strings={{ bold: "Đậm" }}    // optional override of any string
  minHeight="12rem" maxHeight="24rem"
  fallback={<p>Loading…</p>}  // optional: shown while the editor chunk loads
/>

<RichTextView html={row.body} className="prose" />   // read-only, no editor code shipped
sanitizeRichHtml(html, "store" | "render" | "paste")  // the one allow-list
preloadRichTextEditor()                               // start the chunk download early
```

| Prop | Notes |
| --- | --- |
| `value` / `onChange` | Controlled. A new `value` from outside (a loaded row, a reset) replaces the content; the editor's own echo does not. Nothing is emitted until the person edits, so an untouched form saves the original string. |
| `toolbar` | `minimal`: B I U, bullets, numbers, clear. `homework`: + H1-H3, strike, indent, link, quote, undo/redo. `full`: + colour, highlight, sub/sup, alignment, picture (with adapter). |
| `maxLength` | Characters of text. Visible counter, announced once when full. |
| `ariaLabel` / `ariaLabelledBy` / `ariaDescribedBy` / `id` | Put on the writing area (`role="textbox"`, `aria-multiline`). |
| `onUploadImage(file) => Promise<url>` | The editor holds no upload code. The URL must be http(s). Without it there is no picture button, but pictures a stored row already holds (http(s), or base64 png/jpeg/gif/webp up to 2 MB, as the old editor embedded them) are kept byte for byte. A row with a picture it cannot keep opens read-only with a notice, so a save never loses it. |
| `maxLength` and old rows | Only growth past the limit is stopped (a paste is cut to fit); a longer existing text loads whole and is never trimmed. |

## Stored format

Semantic HTML plus Quill's class vocabulary, so rows from the old editor and from this one are the same format:
`p, br, strong, em, u, s, sub, sup, code, a[href http(s)], h1-h6, ul, ol, li, blockquote, pre, span[style=color|background-color]`,
`class="ql-indent-N ql-align-center|right|justify"`, Quill 2's `li[data-list]` on read. Lists are saved nested; a one-paragraph list item is saved as `<li>text</li>`; an empty line as `<p><br></p>`.

`sanitizeRichHtml` runs on save (store mode keeps the pictures a row holds; render mode for readers still drops every picture unless `allowImages`), on paste (Word lists become real lists, Office/Docs default black text and white highlights are dropped) and on render (indents drawn at most 3 deep, pasted `&nbsp;` softened). Links are kept only when `safeHttpUrl` accepts them.

## Accessibility and phones

- Toolbar: `role="toolbar"`, labelled, one tab stop, arrow keys / Home / End move between buttons; every button is named, toggles carry `aria-pressed`, shortcuts in `title` and `aria-keyshortcuts`.
- Keys: Ctrl/Cmd+B, I, U, Shift+S (strike), Shift+7 / Shift+8 (lists), ] / [ (indent), K (link), Z / Shift+Z / Y (undo, redo). Tab nests a list item; elsewhere Tab leaves the editor.
- 44 px targets (`--hec-target`), 16 px+ text (iOS does not zoom), toolbar wraps and stays in view, panels open inside the editor's box (works in dialogs).
- iPhone Safari: the keyboard is read from `visualViewport` and given to ProseMirror as a scroll margin, so the caret is scrolled above it.

## Styling

`rich-text.css` uses `hec-*` tokens only; the editor root carries `data-hec-theme="ivory"`, so the tokens (light and dark) exist wherever the editor is placed. `view.css` uses zero-specificity `:where()` rules for the stored format only (list markers, indents, alignment); the host's classes decide typography.

## Tests

`scripts/richTextEditor.test.ts` (bun, jsdom): every fixture in `scripts/fixtures/rich-text/quillFixtures.ts` is loaded into the real schema, saved and rendered, and must mean the same as today's renderer; plus sanitiser attacks, Word / Google Docs paste, strings and the folder's imports.
