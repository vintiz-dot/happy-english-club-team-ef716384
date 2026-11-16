import { useMemo, type HTMLAttributes } from "react";
import { sanitizeRichHtml } from "./sanitize";
import "./view.css";

export interface RichTextViewProps extends Omit<HTMLAttributes<HTMLDivElement>, "dangerouslySetInnerHTML" | "children"> {
  /** Stored HTML: rows from the old Quill editor and from RichTextEditor alike. */
  html: string | null | undefined;
  /** Draw <img> with an http(s) src. Off by default: pasted pictures are never shown. */
  allowImages?: boolean;
}

/**
 * Read-only rich text. Sanitises with the same allow-list the editor saves
 * with, and draws Quill's list markers, indents and alignment. Typography and
 * colour come from the host (className); `.rte-view` only adds what the
 * stored format needs to keep its meaning. Ships no editor code.
 */
export function RichTextView({ html, allowImages, className, ...rest }: RichTextViewProps) {
  const clean = useMemo(() => sanitizeRichHtml(html, "render", { allowImages }), [html, allowImages]);
  if (!clean) return null;
  return (
    <div
      {...rest}
      className={className ? `rte-view ${className}` : "rte-view"}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}

export default RichTextView;
