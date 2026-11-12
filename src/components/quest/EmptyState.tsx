import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIvory } from "@/hooks/useIvory";

interface EmptyStateProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/**
 * Friendly empty state — used when a list/section has no data.
 * Replaces the various "no data" paragraphs scattered through the app.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  const ivory = useIvory();
  if (ivory) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-hec-lg border border-hec-line bg-hec-surface px-6 py-12 text-center",
          className
        )}
      >
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-hec-lg bg-hec-sunken text-hec-ink-soft">
          <Icon className="h-6 w-6" />
        </div>
        <p className="mb-1 font-display text-hec-h2 font-medium text-hec-ink">{title}</p>
        {description && (
          <p className="max-w-sm text-hec-body text-hec-ink-soft">{description}</p>
        )}
        {action && <div className="mt-5">{action}</div>}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center px-6 py-12 rounded-3xl surface-2 ring-1 ring-border/40",
        className
      )}
    >
      <div className="h-14 w-14 rounded-2xl bg-aurora flex items-center justify-center text-white shadow-q3 mb-4">
        <Icon className="h-6 w-6" />
      </div>
      <p className="type-h2 mb-1">{title}</p>
      {description && (
        <p className="type-body text-muted-foreground max-w-sm">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
