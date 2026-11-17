import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

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
