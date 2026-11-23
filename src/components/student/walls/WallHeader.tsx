import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useWallBand } from "./useWallBand";

/** The heading block shared by the wall pages: a paper tile with an icon, the title and one short line. */
export function WallHeader({ icon: Icon, title, sub }: { icon: ElementType; title: ReactNode; sub: ReactNode }) {
  const { kid } = useWallBand();
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken",
          kid ? "h-14 w-14" : "h-11 w-11",
        )}
      >
        <Icon className={cn("text-hec-ink-soft", kid ? "h-7 w-7" : "h-6 w-6")} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h1 className="break-words font-display text-hec-h1 font-medium text-hec-ink">{title}</h1>
        <p className="break-words text-hec-small text-hec-ink-soft">{sub}</p>
      </div>
    </div>
  );
}

/** One calm sentence, on paper, for an empty or failed wall. */
export function WallNote({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface p-8 text-center">
      <p className="mx-auto max-w-sm break-words text-hec-body text-hec-ink-soft">{children}</p>
    </div>
  );
}
