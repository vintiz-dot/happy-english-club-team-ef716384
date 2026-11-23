/**
 * Paper for the walls: surface, hairline, the soft shadow of the tokens, and the press state of paper
 * (fx/PaperPress). On a device with a pointer it also rises 2 px; "calm" and "off" do not rise.
 * Put media inside <PaperMedia>, which does the clipping (the card itself must not clip: its shadow lies outside).
 */
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { pressable } from "@/components/fx/PaperPress";

const rise =
  "motion-safe:[@media(hover:hover)]:hover:-translate-y-0.5 [[data-hec-motion=calm]_&]:hover:translate-y-0 [[data-hec-motion=off]_&]:hover:translate-y-0";

export function PaperCard({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div
      {...rest}
      className={cn("rounded-hec-lg border border-hec-line bg-hec-surface text-hec-ink shadow-hec-1", pressable, rise, className)}
    />
  );
}

export function PaperMedia({ className, ...rest }: ComponentProps<"div">) {
  return <div {...rest} className={cn("relative overflow-hidden rounded-t-hec-lg", className)} />;
}
