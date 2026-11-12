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

// A tile is a neutral card; only the icon says what kind of number it is (brass reward, leaf growth, danger, neutral).
const TONES: Record<NonNullable<StatTileProps["tone"]>, { text: string }> = {
  violet:  { text: "text-hec-ink-soft" },
  amber:   { text: "text-hec-brass" },
  emerald: { text: "text-hec-leaf" },
  rose:    { text: "text-hec-danger" },
  sky:     { text: "text-hec-ink-soft" },
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
        "group relative w-full rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 sm:p-5",
        "transition-shadow duration-hec-1 ease-hec focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
        onClick ? "min-h-hec-target hover:shadow-hec-2" : "cursor-default",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-hec-md bg-hec-sunken", t.text)}>
          <Icon className="h-4 w-4" />
        </div>
        {trend && (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-hec-caption font-medium tabular-nums",
              isUp
                ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf"
                : "border-hec-danger/30 bg-hec-danger-tint text-hec-danger"
            )}
          >
            {isUp ? "▲" : "▼"} {Math.abs(trend.delta)}
            {trend.suffix || ""}
          </span>
        )}
      </div>
      <div className="text-hec-h1 font-semibold tabular-nums text-hec-ink">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </div>
      <div className="mt-0.5 text-hec-caption text-hec-ink-soft">{label}</div>
    </button>
  );
}
