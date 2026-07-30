/**
 * NovaStatCard — a single premium stat tile for the student dashboard.
 *
 * Presentational only. Handles the big-number treatment, gradient icon well,
 * optional trailing caption and an optional click target. `value` may be a
 * number (count-up animated) or pre-formatted text (e.g. currency).
 */
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/fx/AnimatedNumber";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface Props {
  icon: React.ElementType;
  label: string;
  value: number | string;
  caption?: string;
  /** tailwind gradient stops for the icon well, e.g. "from-violet-500 to-indigo-600" */
  gradient: string;
  /** value colour override (e.g. debt in red) */
  valueClassName?: string;
  onClick?: () => void;
  delay?: number;
}

export function NovaStatCard({
  icon: Icon, label, value, caption, gradient, valueClassName, onClick, delay = 0,
}: Props) {
  const interactive = !!onClick;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={cn(
        "holo-card group p-5 relative",
        interactive && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn("icon-well p-2.5 bg-gradient-to-br", gradient)}>
          <Icon className="h-5 w-5 text-white drop-shadow" />
        </div>
        {interactive && (
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
        )}
      </div>

      <p className="mt-3.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={cn("text-3xl md:text-[2.1rem] font-black tabular-nums leading-tight mt-0.5", valueClassName)}>
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </p>
      {caption && <p className="text-xs text-muted-foreground mt-1">{caption}</p>}
    </motion.div>
  );
}
