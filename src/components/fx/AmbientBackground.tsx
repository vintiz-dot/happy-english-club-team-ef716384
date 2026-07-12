/**
 * AmbientBackground — the immersive depth layer behind every screen.
 *
 * Three slow-drifting aurora orbs (reusing the gemini blob keyframes) over
 * a faint masked blueprint grid. Fixed, non-interactive, and cheap: pure
 * CSS animation on three blurred divs. Mounted once per layout so admin,
 * teacher and student surfaces all share the same living backdrop.
 */
import { memo } from "react";
import { cn } from "@/lib/utils";

interface AmbientBackgroundProps {
  /** "subtle" for dense work screens, "bold" for dashboards/landing */
  intensity?: "subtle" | "bold";
  className?: string;
}

export const AmbientBackground = memo(function AmbientBackground({
  intensity = "subtle",
  className,
}: AmbientBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "fixed inset-0 -z-10 overflow-hidden pointer-events-none",
        intensity === "subtle" ? "opacity-70" : "opacity-100",
        className,
      )}
    >
      {/* Aurora orbs */}
      <div className="gemini-glow-1 absolute -top-36 -right-32 h-[30rem] w-[30rem] rounded-full blur-3xl bg-gradient-to-br from-blue-500/[0.15] via-cyan-400/[0.10] to-transparent" />
      <div className="gemini-glow-2 absolute -bottom-44 -left-36 h-[34rem] w-[34rem] rounded-full blur-3xl bg-gradient-to-tr from-indigo-500/[0.13] via-sky-400/[0.08] to-transparent" />
      <div className="gemini-glow-3 absolute top-1/3 left-1/2 -translate-x-1/2 h-[26rem] w-[44rem] rounded-full blur-3xl bg-gradient-to-r from-amber-400/[0.07] via-transparent to-teal-400/[0.09]" />

      {/* Blueprint grid, faded from the top */}
      <div className="nova-grid absolute inset-0" />
    </div>
  );
});
