/**
 * Paper for the walls: surface, hairline and the soft shadow of the tokens. The card itself does not press or rise:
 * only the link or button inside it that opens something does, so a card never looks tappable when it is not.
 * Put media inside <PaperMedia>, which does the clipping (the card itself must not clip: its shadow lies outside).
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";


export function PaperCard({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      {...rest}
      className={cn("rounded-hec-lg border border-hec-line bg-hec-surface text-hec-ink shadow-hec-1", className)}
    />
  );
}

export function PaperMedia({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cn("relative overflow-hidden rounded-t-hec-lg", className)} />;
}
