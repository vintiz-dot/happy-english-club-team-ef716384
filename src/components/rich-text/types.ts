import type { ReactNode } from "react";
import type { RichTextLocale, RichTextStrings } from "./strings";

export type ToolbarPreset = "minimal" | "homework" | "full";

export interface RichTextEditorProps {
  /** Stored HTML (old Quill rows included). Empty string for nothing. */
  value: string;
  /** Sanitised HTML; "" when the editor is empty. */
  onChange: (html: string) => void;
  placeholder?: string;
  /** Which buttons show. The schema is the same for every preset. */
  toolbar?: ToolbarPreset;
  /** Characters of text (not HTML). Shows a counter and stops typing at the limit. */
  maxLength?: number;
  disabled?: boolean;
  /** Name of the text box, when no visible label points at it. */
  ariaLabel?: string;
  /** Id of a visible label (preferred over ariaLabel). */
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  /** Id put on the text box itself. */
  id?: string;
  /** Upload a picture and resolve to its http(s) URL. Without it there is no picture button. */
  onUploadImage?: (file: File) => Promise<string>;
  locale?: RichTextLocale;
  strings?: Partial<RichTextStrings>;
  className?: string;
  /** Minimum height of the writing area, any CSS length. */
  minHeight?: string;
  /** Maximum height before the writing area scrolls, any CSS length. */
  maxHeight?: string;
  /** Shown while the editor's code loads (it is a separate chunk). */
  fallback?: ReactNode;
  autoFocus?: boolean;
  onBlur?: () => void;
}
