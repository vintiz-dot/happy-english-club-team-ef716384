import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** No effect since R24 (the colour heroes were deleted); kept so the callers need no edit. */
  variant?: "aurora" | "glacier" | "citrus" | "mint" | "night";
  className?: string;
  children?: ReactNode;
}

/** Page header at the top of a screen: eyebrow, display title, subtitle, actions. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  children,
}: PageHeroProps) {
  // One solid card: no orbs, grid or sheen (the old aurora hero was deleted with R24).
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface px-5 py-6 shadow-hec-1 sm:px-8 sm:py-8",
        className
      )}
    >
      {eyebrow && (
        <p className="mb-2 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          {eyebrow}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-hec-display font-medium text-hec-ink">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 max-w-2xl text-hec-body text-hec-ink-soft">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children && <div className="mt-5">{children}</div>}
    </section>
  );
}
