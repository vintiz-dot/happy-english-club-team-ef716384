/**
 * NovaStatCard — a single stat tile for the student dashboard.
 *
 * Presentational only. In the "Ivory" design system: a plain card, a small
 * uppercase label with one ink icon, the value in the sans at h1 size with
 * tabular figures (never the serif, never counted up), an optional caption
 * and an optional click target. `value` may be a number or pre-formatted
 * text (e.g. currency) and is shown exactly as given.
 */
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { CARD, FOCUS, LABEL } from "./ivory";

interface Props {
  icon: React.ElementType;
  label: string;
  value: number | string;
  caption?: string;
  /** Kept for callers; the Ivory tile has one ink icon colour, not a gradient. */
  gradient: string;
  /** value colour override (e.g. debt in the danger colour) */
  valueClassName?: string;
  onClick?: () => void;
  delay?: number;
}

export function NovaStatCard({
  icon: Icon, label, value, caption, valueClassName, onClick,
}: Props) {
  const interactive = !!onClick;
  return (
    <motion.div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={cn(
        CARD,
        "group relative",
        interactive && cn("cursor-pointer transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2", FOCUS),
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={cn(LABEL, "flex min-w-0 items-center gap-2")}>
          <Icon className="h-4 w-4 shrink-0 text-hec-ink-faint" aria-hidden />
          <span className="min-w-0">{label}</span>
        </p>
        {interactive && (
          <ChevronRight className="h-5 w-5 shrink-0 text-hec-ink-faint transition-colors duration-hec-1 group-hover:text-hec-ink" aria-hidden />
        )}
      </div>

      <p className={cn("mt-2 whitespace-nowrap font-sans text-hec-h1 font-semibold tabular-nums text-hec-ink", valueClassName)}>
        {value}
      </p>
      {caption && <p className="mt-1 text-hec-small text-hec-ink-soft">{caption}</p>}
    </motion.div>
  );
}
