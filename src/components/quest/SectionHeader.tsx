import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

interface SectionHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Consistent section header inside a redesigned page.
 * Title left, optional action right (e.g. "See all").
 */
export function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  const ivory = useIvory();
  if (ivory) {
    return (
      <div className={cn("mb-3 flex items-end justify-between gap-3 px-1", className)}>
        <div className="min-w-0">
          <h2 className="whitespace-normal break-words font-display text-hec-h2 font-medium text-hec-ink">{title}</h2>
          {subtitle && <p className="mt-0.5 text-hec-small text-hec-ink-soft">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }
  return (
    <div className={cn("flex items-end justify-between gap-3 mb-3 px-1", className)}>
      <div className="min-w-0">
        <h2 className="type-h2 truncate">{title}</h2>
        {subtitle && <p className="type-micro text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
