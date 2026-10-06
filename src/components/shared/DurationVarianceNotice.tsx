import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  /** Number of sessions whose length disagrees with their class setting. */
  count: number;
  /** Money impact in VND. Positive = paying more than the settings imply. */
  varianceAmount?: number;
  /** "inline" for a badge beside a figure, "block" for a standalone note. */
  variant?: "inline" | "block";
  className?: string;
}

/**
 * Marks a money figure that was computed from session lengths which do not
 * match their class settings.
 *
 * Pay is hourly, so every total downstream of a session's end time inherits
 * that session's error. Rather than let a confident-looking number stand on
 * its own, each place that displays one says so. Renders nothing when there
 * is nothing wrong, so it stays silent in the normal case.
 */
export function DurationVarianceNotice({ count, varianceAmount, variant = "inline", className }: Props) {
  if (!count) return null;

  const money =
    typeof varianceAmount === "number" && varianceAmount !== 0
      ? `${varianceAmount > 0 ? "+" : "−"}${Math.abs(varianceAmount).toLocaleString("vi-VN")} ₫`
      : null;

  const title = `${count} session${count === 1 ? "" : "s"} ${
    count === 1 ? "runs" : "run"
  } for a different length than its class is configured for${
    money ? `, worth ${money}` : ""
  }. This figure is affected.`;

  if (variant === "inline") {
    return (
      <span
        title={title}
        className={cn(
          "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
          "border border-warning/50 bg-warning/10 text-foreground",
          className,
        )}
      >
        <AlertTriangle className="h-3 w-3 text-warning" />
        {count} wrong length{money ? ` · ${money}` : ""}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-md border border-warning/50 bg-warning/5 p-2.5 text-xs",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <p className="text-muted-foreground">
        <span className="font-medium text-foreground">
          {count} session{count === 1 ? "" : "s"} do{count === 1 ? "es" : ""} not match the
          configured class length
        </span>
        {money ? (
          <>
            , changing this figure by <span className="font-medium text-foreground">{money}</span>
          </>
        ) : null}
        . Pay is hourly, so the session times or the class setting need correcting.
      </p>
    </div>
  );
}
