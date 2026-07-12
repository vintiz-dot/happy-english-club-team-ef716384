/**
 * SpotlightCard — a surface whose glow follows the cursor.
 *
 * Writes the pointer position into --mx/--my CSS vars; the .nova-spotlight
 * utility renders a radial highlight there. Zero re-renders (direct style
 * mutation), no listeners when the pointer is elsewhere.
 */
import { useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SpotlightCardProps extends HTMLAttributes<HTMLDivElement> {
  /** also draw the rotating conic border */
  shine?: boolean;
}

export function SpotlightCard({ className, shine = false, children, ...rest }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      className={cn("nova-spotlight relative overflow-hidden", shine && "border-shine", className)}
      {...rest}
    >
      {children}
    </div>
  );
}
