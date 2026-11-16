import { RichTextView } from "@/components/rich-text";
import { cn } from "@/lib/utils";

/**
 * Teacher-written rich text (homework instructions, a student's own answer),
 * laid out for reading on a phone. The shared RichTextView sanitises it (see
 * `sanitizeRichHtml`, the same rule `cleanRichHtml` uses); the `.hw-rich`
 * stylesheet in index.css does the layout.
 */
export function RichText({
  html,
  size = "md",
  className,
}: {
  html: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  return <RichTextView html={html} className={cn("hw-rich rich-content", size === "sm" && "hw-rich-sm", className)} />;
}
