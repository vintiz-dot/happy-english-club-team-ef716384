import { cn } from "@/lib/utils";

/**
 * The red count (or, when the menu is collapsed, the red dot) that says a check needs a person.
 * It shows nothing at 0. The sentence is for a screen reader and the hover title: what is wrong,
 * not only how many.
 */
export function CheckBadge({ total, lines, dot, className }: { total: number; lines: string[]; dot?: boolean; className?: string }) {
  if (total <= 0) return null;
  const label = `${total === 1 ? "1 problem needs" : `${total} problems need`} a look: ${lines.join("; ")}`;
  if (dot) {
    return (
      <span
        role="img"
        aria-label={label}
        title={label}
        className={cn("pointer-events-none absolute right-1.5 top-1.5 z-10 h-2.5 w-2.5 rounded-full bg-hec-danger ring-2 ring-hec-surface", className)}
      />
    );
  }
  return (
    <span
      role="status"
      aria-label={label}
      title={label}
      className={cn(
        "relative z-10 ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-hec-danger px-1.5 text-hec-caption font-semibold tabular-nums text-white",
        className,
      )}
    >
      {total > 99 ? "99+" : total}
    </span>
  );
}
