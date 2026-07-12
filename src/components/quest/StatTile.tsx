import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/fx/AnimatedNumber";

interface StatTileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  trend?: { delta: number; suffix?: string };
  tone?: "violet" | "amber" | "emerald" | "rose" | "sky";
  className?: string;
  onClick?: () => void;
}

const TONES: Record<NonNullable<StatTileProps["tone"]>, { bg: string; ring: string; text: string }> = {
  violet:  { bg: "from-blue-500/15 to-sky-500/5",   ring: "ring-blue-500/20",  text: "text-blue-600 dark:text-blue-300" },
  amber:   { bg: "from-amber-500/15 to-orange-500/5",     ring: "ring-amber-500/20",   text: "text-amber-600 dark:text-amber-300" },
  emerald: { bg: "from-emerald-500/15 to-teal-500/5",     ring: "ring-emerald-500/20", text: "text-emerald-600 dark:text-emerald-300" },
  rose:    { bg: "from-rose-500/15 to-sky-500/5",        ring: "ring-rose-500/20",    text: "text-rose-600 dark:text-rose-300" },
  sky:     { bg: "from-sky-500/15 to-cyan-500/5",         ring: "ring-sky-500/20",     text: "text-sky-600 dark:text-sky-300" },
};

/**
 * Small KPI tile — consistent way to present a number/streak/count
 * across dashboards. Mobile-first padding, optional click-through.
 */
export function StatTile({ icon: Icon, label, value, trend, tone = "violet", className, onClick }: StatTileProps) {
  const t = TONES[tone];
  const isUp = trend && trend.delta > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "group relative w-full rounded-2xl bg-gradient-to-br p-4 sm:p-5 ring-1 text-left",
        "surface-2 lift focus-premium",
        t.bg,
        t.ring,
        !onClick && "cursor-default lift:hover-none",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("h-9 w-9 rounded-xl bg-white/70 dark:bg-white/10 flex items-center justify-center shadow-q1", t.text)}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span
            className={cn(
              "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
              isUp
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
                : "bg-rose-500/15 text-rose-600 dark:text-rose-300"
            )}
          >
            {isUp ? "▲" : "▼"} {Math.abs(trend.delta)}
            {trend.suffix || ""}
          </span>
        )}
      </div>
      <div className="type-h1 tabular-nums">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      <div className="type-micro text-muted-foreground mt-0.5">{label}</div>
    </button>
  );
}
