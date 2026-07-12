import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  variant?: "aurora" | "glacier" | "citrus" | "mint" | "night";
  className?: string;
  children?: ReactNode;
}

/**
 * Premium page header used at the top of a redesigned screen.
 * Next-gen treatment: drifting aurora orbs, a blueprint light grid and a
 * periodic light sweep over the gradient — all pure CSS, all pointer-safe.
 */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  variant = "aurora",
  className,
  children,
}: PageHeroProps) {
  const bg = `bg-${variant}`;
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl px-5 py-6 sm:px-8 sm:py-8 text-white shadow-q3",
        "hero-sheen gemini-scale-in",
        bg,
        className
      )}
    >
      {/* drifting aurora orbs */}
      <div className="gemini-glow-1 absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/15 blur-3xl pointer-events-none" />
      <div className="gemini-glow-2 absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-black/15 blur-3xl pointer-events-none" />
      <div className="gemini-glow-3 absolute top-1/2 right-1/4 h-40 w-40 rounded-full bg-cyan-300/10 blur-2xl pointer-events-none" />

      {/* blueprint light grid */}
      <div className="nova-grid-light absolute inset-0 pointer-events-none" />

      <div className="relative">
        {eyebrow && (
          <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/70 mb-2">
            {eyebrow}
          </p>
        )}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <h1 className="type-display text-white drop-shadow-sm">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 type-body text-white/80 max-w-2xl">{subtitle}</p>
            )}
          </div>
          {actions && <div className="shrink-0 flex gap-2">{actions}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </section>
  );
}
