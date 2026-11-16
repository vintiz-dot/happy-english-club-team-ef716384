/**
 * Homework instructions written in the teachers' rich-text editor, made safe
 * to READ on a phone.
 *
 * Why this exists: the old renderer let every element break "anywhere" and
 * kept whatever inline styles a teacher pasted in (from Word, Google Docs,
 * web pages). On a 360px screen that combination collapsed words into one
 * letter per line:
 *   - `overflow-wrap: anywhere` lets a box shrink to the width of ONE
 *     character, so anything squeezed (an indented list, a pasted fixed-width
 *     block) wraps letter by letter;
 *   - pasted `width`, `white-space: nowrap`, `margin-left`, letter-spacing...
 *     fight the phone's width;
 *   - Quill indents (`ql-indent-5` = 15em of padding) eat the whole column;
 *   - Word puts `&nbsp;` between words, so a sentence has no place to wrap.
 *
 * `cleanRichHtml` is the shared rich-text sanitiser in render mode
 * (`sanitizeRichHtml` in src/components/rich-text): the same allow-list the
 * editor saves with, keeping only the styling that carries meaning (colour,
 * highlight, bold, italic, underline, alignment) and drawing indents at most
 * three deep. Layout comes from the `.hw-rich` stylesheet.
 */
import DOMPurify from "dompurify";
import { sanitizeRichHtml } from "@/components/rich-text/sanitize";

export function cleanRichHtml(html: string | null | undefined): string {
  return sanitizeRichHtml(html, "render");
}

/** The instructions as one line of plain text, for a card preview. */
export function richTextPreview(html: string | null | undefined, max = 160): string {
  if (!html) return "";
  const box = document.createElement("div");
  // Block ends become spaces so "Read p.12</p><p>Answer" doesn't glue together.
  box.innerHTML = DOMPurify.sanitize(html.replace(/<\/(p|div|li|h\d)>|<br\s*\/?>/gi, " "), {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
  });
  const text = (box.textContent || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
