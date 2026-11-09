import { useMemo } from "react";
import { cleanRichHtml } from "@/lib/richText";
import { cn } from "@/lib/utils";

/**
 * Teacher-written rich text (homework instructions, a student's own answer),
 * laid out for reading on a phone. See `cleanRichHtml` for what is removed
 * and why; the `.hw-rich` stylesheet in index.css does the layout.
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
  const clean = useMemo(() => cleanRichHtml(html), [html]);
  if (!clean) return null;
  return (
    <div
      className={cn("hw-rich rich-content", size === "sm" && "hw-rich-sm", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
